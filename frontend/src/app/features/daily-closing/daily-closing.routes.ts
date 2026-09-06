import { Routes } from '@angular/router';

export const DAILY_CLOSING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./daily-closing.component').then((m) => m.DailyClosingComponent)
  }
];
