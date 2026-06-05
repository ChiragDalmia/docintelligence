import { Component, ChangeDetectionStrategy } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { Observable, filter, map, startWith } from 'rxjs';
import { DocumentStateService } from '../../services/document-state.service';

const ROUTE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  upload: 'Upload Document',
  documents: 'Documents',
  viewer: 'Document Viewer',
  chat: 'Chat'
};

@Component({
  selector: 'app-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, RouterLink],
  template: `
    <header class="topbar" role="banner">
      <div class="topbar-left">
        <h1 class="page-title">{{ pageTitle$ | async }}</h1>
      </div>
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
  `,
  styles: [`
    .topbar {
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      border-bottom: 1px solid var(--border);
      background: var(--glass-bg);
      backdrop-filter: blur(12px);
      flex-shrink: 0;
    }
    .page-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .doc-count {
      display: flex;
      align-items: baseline;
      gap: 4px;
      color: var(--text-muted);
      font-size: 13px;
    }
    .count-val {
      font-size: 18px;
      font-weight: 700;
      color: var(--accent);
      font-variant-numeric: tabular-nums;
    }
    .btn-upload {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--accent);
      color: white;
      border: none;
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: opacity 0.15s, transform 0.1s;
    }
    .btn-upload:hover { opacity: 0.88; transform: translateY(-1px); }
    .btn-upload:active { transform: translateY(0); }
  `]
})
export class TopbarComponent {
  readonly pageTitle$: Observable<string>;
  readonly docCount$: Observable<number>;

  constructor(router: Router, private docState: DocumentStateService) {
    this.pageTitle$ = router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        const seg = router.url.split('/')[1]?.split('?')[0] || 'dashboard';
        return ROUTE_TITLES[seg] ?? 'DocIntelligence';
      })
    );

    this.docCount$ = this.docState.documents$.pipe(
      map(docs => docs.length)
    );
  }
}
