import { Routes } from '@angular/router';
import { authGuard } from './api/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./components/login/login').then((module) => module.Login),
  },
  {
    path: 'agenda',
    canActivate: [authGuard],
    loadComponent: () => import('./components/dashboard/dashboard').then((module) => module.Dashboard),
  },
  { path: '', pathMatch: 'full', redirectTo: 'agenda' },
  { path: '**', redirectTo: 'agenda' },
];
