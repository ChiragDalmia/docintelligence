import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { Observable, filter, map, startWith } from 'rxjs';
import { DocumentStateService } from './services/document-state.service';

const NAV = [
  { path: '/dashboard', label: 'Dashboard', aria: 'Go to dashboard', icon: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="1" width="7" height="7" rx="1.5"/><rect x="10" y="1" width="7" height="7" rx="1.5"/><rect x="1" y="10" width="7" height="7" rx="1.5"/><rect x="10" y="10" width="7" height="7" rx="1.5"/></svg>` },
  { path: '/upload', label: 'Upload', aria: 'Upload a new document', icon: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12V4M6 7l3-3 3 3" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 13v1.5A1.5 1.5 0 0 0 4.5 16h9a1.5 1.5 0 0 0 1.5-1.5V13" stroke-linecap="round"/></svg>` },
  { path: '/documents', label: 'Documents', aria: 'View all documents', icon: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 2h7l3 3v11H4V2z" stroke-linejoin="round"/><path d="M11 2v3h3" stroke-linejoin="round"/><path d="M6 9h6M6 12h4" stroke-linecap="round"/></svg>` },
  { path: '/viewer', label: 'Viewer', aria: 'Open document viewer', icon: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 9s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z"/><circle cx="9" cy="9" r="2.5"/></svg>` },
  { path: '/chat', label: 'Chat', aria: 'Chat with documents', icon: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 2H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3l3 3 3-3h3a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"/><path d="M6 7h6M6 10h4" stroke-linecap="round"/></svg>` }
];

const TITLES: Record<string, string> = {
  dashboard: 'Dashboard', upload: 'Upload Document',
  documents: 'Documents', viewer: 'Document Viewer', chat: 'Chat'
};

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe],
  template: `
    <div class="app-shell">
      <nav class="sidebar" aria-label="Main navigation">
        <div class="sidebar-brand">
          <div class="brand-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="url(#brandGrad)"/>
              <path d="M8 8h8l4 4v8H8V8z" stroke="white" stroke-width="1.5" fill="none"/>
              <path d="M16 8v4h4" stroke="white" stroke-width="1.5"/>
              <path d="M11 15h6M11 18h4" stroke="white" stroke-width="1.2" stroke-linecap="round"/>
              <circle cx="20" cy="20" r="4" fill="#7c3aed"/>
              <path d="M18.5 20h3M20 18.5v3" stroke="white" stroke-width="1.2" stroke-linecap="round"/>
              <defs><linearGradient id="brandGrad" x1="0" y1="0" x2="28" y2="28">
                <stop stop-color="#4f46e5"/><stop offset="1" stop-color="#7c3aed"/>
              </linearGradient></defs>
            </svg>
          </div>
          <span class="brand-name">DocIntel</span>
        </div>
        <ul class="nav-list" role="list">
          @for (item of navItems; track item.path) {
            <li><a [routerLink]="item.path" routerLinkActive="active" class="nav-item" [attr.aria-label]="item.aria">
              <span class="nav-icon" aria-hidden="true" [innerHTML]="item.icon"></span>
              <span class="nav-label">{{ item.label }}</span>
            </a></li>
          }
        </ul>
        <div class="sidebar-footer">
          <div class="status-pill">
            <span class="status-dot"></span>
            <span class="status-text">AI Ready</span>
          </div>
        </div>
      </nav>
      <div class="app-content">
        <header class="topbar" role="banner">
          <h1 class="page-title">{{ pageTitle$ | async }}</h1>
          <div class="topbar-right">
            <div class="doc-count" aria-label="Total documents">
              <span class="count-val">{{ (docCount$ | async) ?? 0 }}</span>
              <span class="count-label">docs</span>
            </div>
            <a routerLink="/upload" class="btn-upload" aria-label="Upload new document">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M7 9V3M4.5 5.5L7 3l2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 10v1.5A.5.5 0 0 0 2.5 12h9a.5.5 0 0 0 .5-.5V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              Upload
            </a>
          </div>
        </header>
        <main class="main-area" role="main"><router-outlet></router-outlet></main>
      </div>
    </div>
  `,
  styles: [`
    .app-shell { display: flex; height: 100vh; overflow: hidden; background: var(--bg-base); }
    .app-content { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
    .main-area { flex: 1; overflow-y: auto; padding: 24px; }
    .sidebar { width: 220px; min-height: 100vh; background: var(--glass-bg); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 16px 0; backdrop-filter: blur(12px); flex-shrink: 0; }
    .sidebar-brand { display: flex; align-items: center; gap: 10px; padding: 8px 20px 24px; }
    .brand-name { font-size: 17px; font-weight: 700; background: var(--gradient-text); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: -0.3px; }
    .nav-list { list-style: none; padding: 0 10px; margin: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; color: var(--text-muted); text-decoration: none; font-size: 14px; font-weight: 500; transition: background 0.15s, color 0.15s; cursor: pointer; }
    .nav-item:hover { background: var(--hover-bg); color: var(--text-primary); }
    .nav-item.active { background: var(--accent-subtle); color: var(--accent); }
    .nav-icon { width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .sidebar-footer { padding: 16px 20px 8px; }
    .status-pill { display: inline-flex; align-items: center; gap: 6px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); border-radius: 20px; padding: 4px 10px; font-size: 12px; color: #10b981; }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; box-shadow: 0 0 6px #10b981; animation: pulse-dot 2s ease-in-out infinite; }
    @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .topbar { height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; border-bottom: 1px solid var(--border); background: var(--glass-bg); backdrop-filter: blur(12px); flex-shrink: 0; }
    .page-title { font-size: 16px; font-weight: 600; color: var(--text-primary); margin: 0; }
    .topbar-right { display: flex; align-items: center; gap: 16px; }
    .doc-count { display: flex; align-items: baseline; gap: 4px; color: var(--text-muted); font-size: 13px; }
    .count-val { font-size: 18px; font-weight: 700; color: var(--accent); font-variant-numeric: tabular-nums; }
    .btn-upload { display: inline-flex; align-items: center; gap: 6px; background: var(--accent); color: white; border: none; padding: 7px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; transition: opacity 0.15s, transform 0.1s; }
    .btn-upload:hover { opacity: 0.88; transform: translateY(-1px); }
    .btn-upload:active { transform: translateY(0); }
  `]
})
export class AppComponent implements OnInit {
  readonly navItems = NAV;
  readonly pageTitle$: Observable<string>;
  readonly docCount$: Observable<number>;

  constructor(private docState: DocumentStateService, router: Router) {
    this.pageTitle$ = router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
      map(() => TITLES[router.url.split('/')[1]?.split('?')[0] || 'dashboard'] ?? 'DocIntelligence')
    );
    this.docCount$ = this.docState.documents$.pipe(map(docs => docs.length));
  }

  ngOnInit(): void { this.docState.load(); }
}
