import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'upload',
    loadComponent: () =>
      import('./features/upload/upload.component').then(m => m.UploadComponent)
  },
  {
    path: 'documents',
    loadComponent: () =>
      import('./features/documents/documents.component').then(m => m.DocumentsComponent)
  },
  {
    path: 'viewer',
    loadComponent: () =>
      import('./features/viewer/viewer.component').then(m => m.ViewerComponent)
  },
  {
    path: 'viewer/:id',
    loadComponent: () =>
      import('./features/viewer/viewer.component').then(m => m.ViewerComponent)
  },
  {
    path: 'chat',
    loadComponent: () =>
      import('./features/chat/chat.component').then(m => m.ChatComponent)
  },
  { path: '**', redirectTo: 'dashboard' }
];
