import { Routes } from '@angular/router';

export const ATTENDANCE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./attendance-mark/attendance-mark.component').then((m) => m.AttendanceMarkComponent)
  }
];
