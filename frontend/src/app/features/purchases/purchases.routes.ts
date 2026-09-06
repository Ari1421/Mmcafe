import { Routes } from '@angular/router';
import { adminOnlyGuard } from '../../core/guards/permission.guard';

export const PURCHASE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./purchase-list/purchase-list.component').then((m) => m.PurchaseListComponent)
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./purchase-form/purchase-form.component').then((m) => m.PurchaseFormComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./purchase-form/purchase-form.component').then((m) => m.PurchaseFormComponent)
  },
  {
    // Product master (Milk/Curd pricing) is reached from within Purchases,
    // since the sidebar has no separate "Products" menu item per the spec.
    path: 'products',
    canActivate: [adminOnlyGuard],
    loadComponent: () =>
      import('../products/product-list/product-list.component').then((m) => m.ProductListComponent)
  }
];
