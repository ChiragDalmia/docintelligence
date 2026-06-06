import { bootstrapApplication } from '@angular/platform-browser';
import { provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, Routes } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppComponent } from './app/app.component';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', loadComponent: () => import('./app/features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'upload', loadComponent: () => import('./app/features/upload/upload.component').then(m => m.UploadComponent) },
  { path: 'documents', loadComponent: () => import('./app/features/documents/documents.component').then(m => m.DocumentsComponent) },
  { path: 'viewer', loadComponent: () => import('./app/features/viewer/viewer.component').then(m => m.ViewerComponent) },
  { path: 'viewer/:id', loadComponent: () => import('./app/features/viewer/viewer.component').then(m => m.ViewerComponent) },
  { path: 'chat', loadComponent: () => import('./app/features/chat/chat.component').then(m => m.ChatComponent) },
  { path: '**', redirectTo: 'dashboard' }
];

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations()
  ]
}).catch(err => console.error(err));
