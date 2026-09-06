import { Routes } from '@angular/router';

export const SALES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./sales-list/sales-list.component').then((m) => m.SalesListComponent)
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./sales-form/sales-form.component').then((m) => m.SalesFormComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./sales-form/sales-form.component').then((m) => m.SalesFormComponent)
  }
];
