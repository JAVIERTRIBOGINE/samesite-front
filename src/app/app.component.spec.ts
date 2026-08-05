import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
  });

  it('muestra el formulario HTML y las dos acciones de la POC', () => {
    const title = fixture.debugElement.query(By.css('h1'))
      .nativeElement as HTMLElement;
    const form = fixture.debugElement.query(By.css('form'));
    const inputs = fixture.debugElement.queryAll(By.css('input'));
    const buttons = fixture.debugElement.queryAll(By.css('button'));

    expect(title.textContent).toContain('POC SameSite Strict');
    expect(form).toBeTruthy();
    expect(inputs).toHaveSize(2);
    expect(buttons).toHaveSize(2);
  });

  it('precarga las credenciales indicadas en el flujo funcional', () => {
    const component = fixture.componentInstance;

    expect(component.username).toBe('samesite');
    expect(component.password).toBe('strict');
  });

  it('actualiza las credenciales desde inputs HTML estándar', () => {
    const component = fixture.componentInstance;
    const username = document.createElement('input');
    const password = document.createElement('input');
    username.value = 'otro-usuario';
    password.value = 'otra-clave';

    component.onUsernameChange({ target: username } as unknown as Event);
    component.onPasswordChange({ target: password } as unknown as Event);

    expect(component.username).toBe('otro-usuario');
    expect(component.password).toBe('otra-clave');
  });
});
