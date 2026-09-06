import { Routes } from '@angular/router';

export const DEALER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./dealer-list/dealer-list.component').then((m) => m.DealerListComponent)
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./dealer-details/dealer-details.component').then((m) => m.DealerDetailsComponent)
  }
];
