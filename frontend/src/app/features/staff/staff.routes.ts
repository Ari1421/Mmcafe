import { Routes } from '@angular/router';

export const STAFF_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./staff-list/staff-list.component').then((m) => m.StaffListComponent)
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./staff-details/staff-details.component').then((m) => m.StaffDetailsComponent)
  }
];
