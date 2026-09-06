import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';

export const SALARY_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard('canModifySalarySettings')],
    loadComponent: () =>
      import('./salary-list/salary-list.component').then((m) => m.SalaryListComponent)
  },
  {
    path: ':staffId',
    canActivate: [permissionGuard('canModifySalarySettings')],
    loadComponent: () =>
      import('./salary-form/salary-form.component').then((m) => m.SalaryFormComponent)
  }
];
