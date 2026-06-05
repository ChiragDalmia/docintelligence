import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  ariaLabel: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
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
            <defs>
              <linearGradient id="brandGrad" x1="0" y1="0" x2="28" y2="28">
                <stop stop-color="#4f46e5"/>
                <stop offset="1" stop-color="#7c3aed"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span class="brand-name">DocIntel</span>
      </div>

      <ul class="nav-list" role="list">
        @for (item of navItems; track item.path) {
          <li>
            <a
              [routerLink]="item.path"
              routerLinkActive="active"
              class="nav-item"
              [attr.aria-label]="item.ariaLabel"
            >
              <span class="nav-icon" aria-hidden="true" [innerHTML]="item.icon"></span>
              <span class="nav-label">{{ item.label }}</span>
            </a>
          </li>
        }
      </ul>

      <div class="sidebar-footer">
        <div class="status-pill">
          <span class="status-dot"></span>
          <span class="status-text">AI Ready</span>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .sidebar {
      width: 220px;
      min-height: 100vh;
      background: var(--glass-bg);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      padding: 16px 0;
      backdrop-filter: blur(12px);
      flex-shrink: 0;
    }
    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 20px 24px;
    }
    .brand-name {
      font-size: 17px;
      font-weight: 700;
      background: var(--gradient-text);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.3px;
    }
    .nav-list {
      list-style: none;
      padding: 0;
      margin: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 0 10px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 12px;
      border-radius: 8px;
      color: var(--text-muted);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.15s, color 0.15s;
      cursor: pointer;
    }
    .nav-item:hover {
      background: var(--hover-bg);
      color: var(--text-primary);
    }
    .nav-item.active {
      background: var(--accent-subtle);
      color: var(--accent);
    }
    .nav-icon {
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .nav-icon :global(svg) { width: 18px; height: 18px; }
    .sidebar-footer {
      padding: 16px 20px 8px;
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(16,185,129,0.1);
      border: 1px solid rgba(16,185,129,0.25);
      border-radius: 20px;
      padding: 4px 10px;
      font-size: 12px;
      color: #10b981;
    }
    .status-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 6px #10b981;
      animation: pulse-dot 2s ease-in-out infinite;
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  `]
})
export class SidebarComponent {
  readonly navItems: NavItem[] = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      ariaLabel: 'Go to dashboard',
      icon: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="1" y="1" width="7" height="7" rx="1.5"/>
        <rect x="10" y="1" width="7" height="7" rx="1.5"/>
        <rect x="1" y="10" width="7" height="7" rx="1.5"/>
        <rect x="10" y="10" width="7" height="7" rx="1.5"/>
      </svg>`
    },
    {
      path: '/upload',
      label: 'Upload',
      ariaLabel: 'Upload a new document',
      icon: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M9 12V4M6 7l3-3 3 3" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M3 13v1.5A1.5 1.5 0 0 0 4.5 16h9a1.5 1.5 0 0 0 1.5-1.5V13" stroke-linecap="round"/>
      </svg>`
    },
    {
      path: '/documents',
      label: 'Documents',
      ariaLabel: 'View all documents',
      icon: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M4 2h7l3 3v11H4V2z" stroke-linejoin="round"/>
        <path d="M11 2v3h3" stroke-linejoin="round"/>
        <path d="M6 9h6M6 12h4" stroke-linecap="round"/>
      </svg>`
    },
    {
      path: '/viewer',
      label: 'Viewer',
      ariaLabel: 'Open document viewer',
      icon: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M1 9s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z"/>
        <circle cx="9" cy="9" r="2.5"/>
      </svg>`
    },
    {
      path: '/chat',
      label: 'Chat',
      ariaLabel: 'Chat with documents',
      icon: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M15 2H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3l3 3 3-3h3a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"/>
        <path d="M6 7h6M6 10h4" stroke-linecap="round"/>
      </svg>`
    }
  ];
}
