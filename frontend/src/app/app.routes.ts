import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent
      )
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/app-layout/app-layout.component').then((m) => m.AppLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent)
      },
      {
        path: 'change-password',
        loadComponent: () =>
          import('./features/auth/change-password/change-password.component').then(
            (m) => m.ChangePasswordComponent
          )
      },
      {
        path: 'dealers',
        loadChildren: () => import('./features/dealers/dealers.routes').then((m) => m.DEALER_ROUTES)
      },
      {
        path: 'sales',
        loadChildren: () => import('./features/sales/sales.routes').then((m) => m.SALES_ROUTES)
      },
      {
        path: 'expenses',
        loadChildren: () =>
          import('./features/expenses/expenses.routes').then((m) => m.EXPENSE_ROUTES)
      },
      {
        path: 'purchases',
        loadChildren: () =>
          import('./features/purchases/purchases.routes').then((m) => m.PURCHASE_ROUTES)
      },
      {
        path: 'staff',
        loadChildren: () => import('./features/staff/staff.routes').then((m) => m.STAFF_ROUTES)
      },
      {
        path: 'attendance',
        loadChildren: () =>
          import('./features/attendance/attendance.routes').then((m) => m.ATTENDANCE_ROUTES)
      },
      {
        path: 'salary',
        loadChildren: () => import('./features/salary/salary.routes').then((m) => m.SALARY_ROUTES)
      },
      {
        path: 'daily-closing',
        loadChildren: () =>
          import('./features/daily-closing/daily-closing.routes').then((m) => m.DAILY_CLOSING_ROUTES)
      },
      {
        path: 'reports',
        loadChildren: () => import('./features/reports/reports.routes').then((m) => m.REPORTS_ROUTES)
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('./features/settings/settings.routes').then((m) => m.SETTINGS_ROUTES)
      },
      { path: '**', redirectTo: 'dashboard' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
