import { Routes } from '@angular/router';
import { adminOnlyGuard } from '../../core/guards/permission.guard';

export const EXPENSE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./expense-list/expense-list.component').then((m) => m.ExpenseListComponent)
  },
  {
    path: 'categories',
    canActivate: [adminOnlyGuard],
    loadComponent: () =>
      import('./expense-categories/expense-categories.component').then((m) => m.ExpenseCategoriesComponent)
  }
];
