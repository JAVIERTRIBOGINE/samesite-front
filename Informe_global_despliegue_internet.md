# Informe global de despliegue en Internet con Render

## Resumen ejecutivo

Los proyectos `samesite-front` y `samesite-back` están preparados para conectarse a Render y desplegarse desde GitHub. La arquitectura es válida para demostrar el comportamiento de una cookie `SameSite=Strict`, aunque existen aspectos de seguridad y persistencia que deben aceptarse conscientemente antes de publicar la POC.

Repositorios revisados:

- Front: `JAVIERTRIBOGINE/samesite-front`.
- Back: `JAVIERTRIBOGINE/samasite-back`.

Los dos repositorios están sincronizados con `origin/main` y no mantienen dependencias privadas de Galatea, Proteo o JFrog.

## Funcionamiento de Render

Render no ejecuta automáticamente un pipeline de GitHub Actions. Dispone de su propio proceso de construcción y despliegue:

1. Se conecta al repositorio de GitHub.
2. Clona la rama seleccionada.
3. Instala las dependencias y ejecuta el comando de build configurado.
4. Publica el resultado estático o arranca el servidor Node.
5. Repite el proceso con cada `push` si está activado el auto-deploy.

Documentación: [Conexión de GitHub con Render](https://render.com/docs/github).

Los certificados no se generan durante el build. Después de asociar y verificar cada dominio, Render emite y renueva automáticamente sus certificados TLS y redirige HTTP a HTTPS.

- [Dominios personalizados](https://render.com/docs/custom-domains)
- [TLS administrado](https://render.com/docs/tls)

## Arquitectura propuesta

| Proyecto | Tipo en Render | Dominio |
|---|---|---|
| `samesite-front` | Static Site | `front.poc-samesite.es.bs` |
| El mismo `samesite-front` | Dominio nativo de Render (caso KO) | `samesite-front.onrender.com` |
| `samesite-back` | Web Service | `api.poc-samesite.es.bs` |

El dominio bueno será un CNAME del dominio nativo del Static Site. Ambos accesos servirán exactamente el mismo artefacto, pero el navegador conservará el hostname que haya introducido el usuario. Ese hostname visible es el que determina el comportamiento same-site o cross-site.

Esta arquitectura necesita dos dominios personalizados: uno para el front y otro para la API. El acceso cross-site utiliza el subdominio `onrender.com` que Render proporciona al Static Site.

## Estado de `samesite-front`

El front:

- Está desarrollado con Angular 17.
- No depende de Galatea, Proteo, JFrog ni de un `.npmrc` privado.
- Utiliza componentes HTML estándar.
- Tiene `package-lock.json`, por lo que puede instalarse desde npm público mediante `npm ci`.
- Dispone de configuraciones Angular `local`, `dev` y `production`.
- Envía las peticiones con `withCredentials: true`.
- Recoge el token devuelto por `/authenticate`.
- Envía `Authorization: Bearer <token>` en `/check-session`.

La configuración `dev` utiliza:

```text
API: https://api.poc-samesite.es.bs
Dominio OK: https://front.poc-samesite.es.bs
Dominio KO: https://samesite-front.onrender.com
```

### Configuración recomendada del Static Site

```text
Repository: JAVIERTRIBOGINE/samesite-front
Branch: main
Build command: npm ci && npm run build:dev
Publish directory: dist/samesite-front/browser
```

Variables de build recomendadas:

```text
NODE_VERSION=20.18.1
SKIP_INSTALL_DEPS=true
```

`SKIP_INSTALL_DEPS=true` evita que Render instale automáticamente las dependencias antes de que el comando ejecute su propio `npm ci`.

Documentación: [Static Sites en Render](https://render.com/docs/static-sites).

### Aspectos mejorables del front

La configuración `dev` compila actualmente con:

```text
optimization: false
sourceMap: true
```

La aplicación funcionará, pero:

- El bundle será mayor.
- Se publicarán source maps.
- El código será más fácil de inspeccionar.

Para una POC puede aceptarse. Para una publicación más seria convendría crear una configuración `hosted` o convertir `dev` en una compilación optimizada.

Las propiedades de los archivos environment de Angular quedan incrustadas durante el build. Cambiar `apiBaseUrl` desde el dashboard de Render no modificará automáticamente el JavaScript ya generado: habría que modificar el environment o implementar configuración en runtime y volver a compilar.

## Estado de `samesite-back`

El backend:

- Está desarrollado con Express.
- Escucha en los valores configurados mediante `HOST` y `PORT`.
- Tiene `HOST=0.0.0.0`.
- Respeta las variables externas antes que los archivos `.env`.
- Expone el endpoint `/health`.
- Tiene habilitado `trust proxy`.
- Genera un artefacto autocontenido en `dist/`.
- Incluye los endpoints del flujo de cookie, token, centros y recursos.

Render requiere que el proceso escuche en `0.0.0.0` y recomienda utilizar el `PORT` proporcionado por la plataforma. La aplicación está preparada para ello.

Documentación: [Web Services de Render](https://render.com/docs/web-services).

### Configuración recomendada del Web Service

```text
Repository: JAVIERTRIBOGINE/samasite-back
Branch: main
Runtime: Node
Build command: npm ci && npm run build:dev && cd dist && npm ci --omit=dev
Start command: cd dist && npm start
Health check path: /health
```

Variables recomendadas:

```text
NODE_VERSION=20.18.1
APP_ENV=dev
HOST=0.0.0.0
BACK_PUBLIC_ORIGIN=https://api.poc-samesite.es.bs
SAME_SITE=es.bs
CORS_ALLOWED_ORIGINS=https://front.poc-samesite.es.bs,https://samesite-front.onrender.com
SESSION_COOKIE_NAME=POC_SESSION
SESSION_COOKIE_VALUE=<valor-aleatorio>
SESSION_COOKIE_DOMAIN=poc-samesite.es.bs
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAME_SITE=strict
REQUEST_LOG_LIMIT=30
```

No se recomienda definir manualmente `PORT=3000`; es preferible utilizar el valor que proporcione Render.

Aunque los `.env` están incluidos en el repositorio y en `dist`, las variables configuradas externamente en Render tienen prioridad. Los secretos deben almacenarse en la configuración de entorno de Render, no en Git.

Documentación: [Variables y secretos en Render](https://render.com/docs/configure-environment-variables).

## Configuración CORS

La configuración es correcta para los dominios definitivos:

```text
https://front.poc-samesite.es.bs
https://samesite-front.onrender.com
```

El backend:

- No utiliza `Access-Control-Allow-Origin: *`.
- Devuelve el origen autorizado concreto.
- Permite credenciales.
- Permite las cabeceras `Content-Type` y `Authorization`.
- Acepta los métodos `GET`, `POST` y `OPTIONS`.

Esto permite que ambos fronts llamen al backend, pero no implica que la cookie pueda viajar desde ambos. CORS autoriza la comunicación HTTP; `SameSite` decide si la cookie se acepta o se envía.

El hostname concreto `https://samesite-front.onrender.com` está autorizado expresamente porque representa el acceso cross-site de la POC. Otros dominios o previews de Render continuarán bloqueados por CORS.

## Comportamiento esperado de la cookie

La cookie se genera con los siguientes atributos:

```text
Domain=poc-samesite.es.bs
Path=/
HttpOnly
Secure
SameSite=Strict
```

### Caso OK: same-site

```text
Front: https://front.poc-samesite.es.bs
API:   https://api.poc-samesite.es.bs
```

Son orígenes distintos, por lo que necesitan CORS, pero pertenecen al mismo site. La cookie `Strict` debería almacenarse y viajar en `/check-session`.

### Caso KO: cross-site

```text
Front: https://samesite-front.onrender.com
API:   https://api.poc-samesite.es.bs
```

Es una petición cross-site. La llamada CORS puede completarse y el front puede recibir el JSON y el token, pero el navegador debería impedir que la cookie `Strict` se establezca o que viaje posteriormente. Como consecuencia, `/check-session` fallará por ausencia de cookie.

Este es el comportamiento buscado por la POC.

### Implicación del dominio nativo de Render

El dominio `samesite-front.onrender.com` se mantiene habilitado deliberadamente para representar el front cross-site. Sin embargo, la API no debe probarse mediante su correspondiente dominio `onrender.com`.

Un backend servido desde una dirección como:

```text
https://samesite-back.onrender.com
```

no puede establecer válidamente una cookie para `poc-samesite.es.bs`. Antes de ejecutar la prueba debe estar operativo:

```text
https://api.poc-samesite.es.bs
```

Por tanto, debe mantenerse habilitado el subdominio `onrender.com` del front y puede desactivarse el del backend después de validar su dominio personalizado.

## Riesgos y consideraciones del backend

### Exposición del panel de intercambios

El backend registra y muestra:

- Request headers.
- Cookies.
- Cabecera `Authorization`.
- Response headers.
- Cabecera `Set-Cookie`.
- Cuerpos de petición y respuesta.

Además, `/`, `/request-log` y `/clear-request-log` no están protegidos.

En una URL pública, cualquier visitante podría consultar tokens y cookies registrados o limpiar el historial. CORS no protege contra accesos directos mediante navegador, `curl` o Postman.

Para una demostración controlada puede aceptarse, pero es el principal riesgo del despliegue. Conviene aplicar al menos una de estas medidas:

- Proteger el visor con contraseña.
- Restringirlo por red o IP.
- Ocultar parcialmente cookies y tokens.
- Deshabilitarlo cuando no se esté realizando la revisión.

### Tokens almacenados en memoria

Los tokens se almacenan en un `Map` del proceso Node:

- Se pierden al reiniciar o redesplegar.
- No tienen expiración.
- No se eliminan.
- No se comparten entre varias instancias.

En una instancia gratuita, Render suspende el Web Service después de un periodo sin tráfico. Al reactivarlo, la cookie puede continuar en el navegador, pero el token habrá desaparecido del backend y será necesario autenticarse de nuevo.

Documentación: [Comportamiento y limitaciones de Render](https://render.com/docs/faq).

Para esta POC es aceptable. Para producción sería necesario utilizar Redis, una base de datos o tokens verificables sin estado.

### Credenciales visibles en GitHub

Actualmente son conocidos:

- Los usuarios y contraseñas de la POC.
- El valor por defecto de la cookie.
- La lógica de generación y validación.
- Los dominios y las rutas.

No son credenciales reales, pero el servicio debe considerarse una demostración pública, no un sistema autenticado de producción.

### Tests del backend desactualizados

Los tests todavía esperan que `/check-session` valide solamente la cookie, pero el endpoint actual exige también el Bearer token. También conservan supuestos del flujo anterior con iframe.

Por tanto, no conviene utilizar todavía `npm test` como condición del pipeline de Render. El build sí puede utilizarse como primera barrera.

### Endpoint antiguo de iframe

El backend conserva `/check-iframe-session`, aunque `samesite-front` ya no contiene un iframe. No bloquea el hosting, pero aumenta ligeramente la superficie pública y puede causar confusión durante la revisión.

## Configuración DNS y certificados

Para cada subdominio deberá añadirse normalmente un registro `CNAME` apuntando al hostname `onrender.com` correspondiente:

```text
front.poc-samesite.es.bs       CNAME -> samesite-front.onrender.com
api.poc-samesite.es.bs         CNAME -> servicio backend de Render
```

Secuencia recomendada:

1. Añadir el dominio al servicio de Render.
2. Crear el registro DNS indicado.
3. Esperar su propagación.
4. Verificar el dominio en Render.
5. Esperar la emisión del certificado.
6. Probar siempre mediante HTTPS.

Render advierte de que los registros `AAAA` incompatibles pueden interferir con la validación.

Documentación: [Configuración DNS en Render](https://render.com/docs/configure-other-dns).

## Valoración final

| Área | Estado |
|---|---|
| Build y dependencias | Preparado |
| Conexión con GitHub | Preparada |
| CORS | Correcto para los dominios previstos |
| Cookie `SameSite=Strict` | Correcta para demostrar los casos OK y KO |
| HTTPS | Compatible con Render |
| Hosting estático del front | Preparado |
| Web Service Express | Preparado |
| Producción real | No recomendado todavía |
| POC pública y controlada | Viable |

Antes de presentar la POC públicamente, las prioridades son:

1. Proteger o limitar la página pública que muestra cookies, tokens y cabeceras.
2. Asumir o corregir la pérdida de tokens cuando Render reinicie el backend.
3. Publicar el front con optimización y sin source maps si se quiere una entrega más limpia.
