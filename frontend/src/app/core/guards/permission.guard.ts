import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Profile } from '../models/profile.model';

/**
 * Route-level permission guard. Usage in routes:
 *
 *   { path: 'settings', canActivate: [permissionGuard('canAccessAdminSettings')], ... }
 *
 * Admin always passes (see AuthService.hasPermission). Staff pass only if
 * their profile flag is true.
 */
export function permissionGuard(permission: keyof Profile): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.hasPermission(permission)) {
      return true;
    }
    return router.createUrlTree(['/dashboard']);
  };
}

export const adminOnlyGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAdmin() ? true : router.createUrlTree(['/dashboard']);
};
