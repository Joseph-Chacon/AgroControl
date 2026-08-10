import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpInterceptorFn } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

const actorInterceptor: HttpInterceptorFn = (request, next) => {
  const actorId = sessionStorage.getItem('agrocontrol_user_id');
  const authenticatedRequest = actorId ? request.clone({ setHeaders: { 'x-agrocontrol-actor': actorId } }) : request;
  return next(authenticatedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      const message = Array.isArray(error.error?.message) ? error.error.message.join('\n') : error.error?.message;
      window.alert(message || 'No fue posible completar la operación. Revise los datos e intente nuevamente.');
      return throwError(() => error);
    }),
  );
};

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(withInterceptors([actorInterceptor]))],
};
