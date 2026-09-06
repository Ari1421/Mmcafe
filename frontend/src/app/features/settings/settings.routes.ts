import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';
import { adminOnlyGuard } from '../../core/guards/permission.guard';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard('canAccessAdminSettings')],
    loadComponent: () =>
      import('./settings-form.component').then((m) => m.SettingsFormComponent)
  },
  {
    // audit_logs RLS restricts SELECT to Admin only (see 002_rls_policies.sql),
    // so this route is intentionally stricter than the Settings page itself.
    path: 'audit-log',
    canActivate: [adminOnlyGuard],
    loadComponent: () =>
      import('./audit-log/audit-log.component').then((m) => m.AuditLogComponent)
  }
];
