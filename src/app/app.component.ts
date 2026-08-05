import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';

interface ApiResponse {
  success: boolean;
  message: string;
  receivedCookie?: string;
  token?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  username = 'samesite';
  password = 'strict';
  result: ApiResponse | null = null;
  loading = false;
  sessionVerified = false;
  sessionToken = '';
  readonly currentFrontOrigin = window.location.origin;
  readonly isCrossSiteTest =
    window.location.hostname === 'neoapp.cdn.local.bancsabadell.com';

  private readonly apiBaseUrl = 'http://neoapp.api.local.es.bs:3000';

  constructor(private readonly http: HttpClient) {}

  get credentialsValid(): boolean {
    return this.username.trim().length > 0 && this.password.length > 0;
  }

  onUsernameChange(event: Event): void {
    this.username = (event.target as HTMLInputElement).value;
  }

  onPasswordChange(event: Event): void {
    this.password = (event.target as HTMLInputElement).value;
  }

  login(): void {
    this.loading = true;
    this.result = null;
    this.sessionVerified = false;
    this.sessionToken = '';

    this.http.post<ApiResponse>(
      `${this.apiBaseUrl}/authenticate`,
      {
        username: this.username,
        password: this.password
      },
      {
        withCredentials: true
      }
    ).subscribe({
      next: (response) => {
        if (!response.token) {
          this.result = {
            success: false,
            message: 'La autenticación no ha devuelto el token de centro.'
          };
          this.loading = false;
          return;
        }

        this.sessionToken = response.token;
        this.result = response;
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => this.handleError(error)
    });
  }

  checkSession(): void {
    this.loading = true;
    this.result = null;

    this.http.get<ApiResponse>(
      `${this.apiBaseUrl}/check-session`,
      {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${this.sessionToken}`
        }
      }
    ).subscribe({
      next: (response) => {
        this.result = response;
        this.sessionVerified = true;
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.sessionVerified = false;
        this.handleError(error);
      }
    });
  }

  private handleError(error: HttpErrorResponse): void {
    this.result = error.error && typeof error.error === 'object'
      ? error.error as ApiResponse
      : {
          success: false,
          message: `No se ha podido contactar con la API (${error.status || 'error de red'}).`
        };
    this.loading = false;
  }
}
