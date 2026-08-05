export const environment = {
  production: false,
  apiBaseUrl: 'http://neoapp.api.local.es.bs:3000',
  sameSiteLabel: 'local.es.bs',
  crossSiteLabel: 'local.bancsabadell.com',
  crossSiteHostnames: ['neoapp.cdn.local.bancsabadell.com']
} as const;
