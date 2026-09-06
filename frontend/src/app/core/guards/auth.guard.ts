import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Blocks navigation until Supabase has finished restoring the session
 * (so a hard refresh doesn't briefly bounce the user to /login), then
 * checks authentication.
 */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await waitUntilInitialized(auth);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

/** Guard for the /login route itself: skip it if already authenticated. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await waitUntilInitialized(auth);

  if (auth.isAuthenticated()) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};

function waitUntilInitialized(auth: AuthService): Promise<void> {
  if (!auth.initializing()) return Promise.resolve();
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (!auth.initializing()) {
        clearInterval(interval);
        resolve();
      }
    }, 25);
  });
}
