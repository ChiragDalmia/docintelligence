import {
  Component, ChangeDetectionStrategy, OnInit, OnDestroy,
  ViewChild, ElementRef, signal, AfterViewInit
} from '@angular/core';
import { AsyncPipe, DecimalPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil, catchError, EMPTY, interval, switchMap } from 'rxjs';
import { Chart, registerables } from 'chart.js';
import { Analytics } from '../../models/document.model';
import { ApiService } from '../../services/api.service';
import { DocumentStateService } from '../../services/document-state.service';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, DecimalPipe, DatePipe, RouterLink],
  template: `
    <div class="dashboard">
      <div class="dash-header">
        <div>
          <h2 class="dash-title">Overview</h2>
          <p class="dash-sub">Real-time document intelligence metrics</p>
        </div>
        <div class="header-actions">
          <span class="groq-badge" [class.enabled]="groqEnabled()">
            <span class="gb-dot"></span>
            {{ groqEnabled() ? 'Groq AI Active' : 'Mock Mode' }}
          </span>
          <a routerLink="/upload" class="btn-upload" aria-label="Upload a document">+ Upload Document</a>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card glass-card">
          <div class="stat-icon icon-docs" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 2h10l3 3v13H5V2z" stroke="var(--accent)" stroke-width="1.5" fill="none"/>
              <path d="M15 2v3h3" stroke="var(--accent)" stroke-width="1.5"/>
              <path d="M7 9h6M7 12h4" stroke="var(--accent)" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="stat-body">
            <span class="stat-val">{{ analytics()?.totalDocuments ?? 0 }}</span>
            <span class="stat-label">Total Documents</span>
          </div>
        </div>
        <div class="stat-card glass-card">
          <div class="stat-icon icon-accuracy" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8.5" stroke="#10b981" stroke-width="1.5"/>
              <path d="M6 10l2.5 2.5 5-5" stroke="#10b981" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="stat-body">
            <span class="stat-val green">{{ analytics()?.averageExtractionAccuracy ?? 0 | number:'1.0-1' }}%</span>
            <span class="stat-label">Extraction Accuracy</span>
          </div>
        </div>
        <div class="stat-card glass-card">
          <div class="stat-icon icon-search" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="8.5" cy="8.5" r="6" stroke="#f59e0b" stroke-width="1.5"/>
              <path d="M13 13l4.5 4.5" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="stat-body">
            <span class="stat-val amber">{{ analytics()?.totalSearches ?? 0 }}</span>
            <span class="stat-label">Total Searches</span>
          </div>
        </div>
        <div class="stat-card glass-card">
          <div class="stat-icon icon-chat" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M17 2H3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h4l3 3 3-3h4a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" stroke="#a78bfa" stroke-width="1.5" fill="none"/>
              <path d="M7 9h6M7 12h4" stroke="#a78bfa" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="stat-body">
            <span class="stat-val purple">{{ analytics()?.totalChats ?? 0 }}</span>
            <span class="stat-label">AI Chat Sessions</span>
          </div>
        </div>
      </div>

      <div class="charts-row">
        <div class="chart-card glass-card">
          <h3 class="chart-title">Document Types</h3>
          <div class="chart-wrap">
            <canvas #typeChart aria-label="Document type distribution chart" role="img"></canvas>
          </div>
          @if (!hasTypeData()) { <div class="chart-empty">No data yet</div> }
        </div>
        <div class="chart-card glass-card">
          <h3 class="chart-title">Processing Status</h3>
          <div class="chart-wrap">
            <canvas #statusChart aria-label="Document status distribution chart" role="img"></canvas>
          </div>
          @if (!hasStatusData()) { <div class="chart-empty">No data yet</div> }
        </div>
        <div class="keywords-card glass-card">
          <h3 class="chart-title">Top Keywords</h3>
          @if (analytics()?.topKeywords?.length) {
            <div class="keyword-list" role="list">
              @for (kw of analytics()!.topKeywords; track kw.word; let i = $index) {
                <div class="keyword-row" role="listitem" [attr.aria-label]="kw.word + ': ' + kw.count + ' searches'">
                  <span class="kw-rank">{{ i + 1 }}</span>
                  <span class="kw-word">{{ kw.word }}</span>
                  <div class="kw-bar-wrap"><div class="kw-bar" [style.width.%]="getBarWidth(kw.count)"></div></div>
                  <span class="kw-count">{{ kw.count }}</span>
                </div>
              }
            </div>
          } @else {
            <div class="chart-empty">
              <p>Search documents to track keywords</p>
              <a routerLink="/documents" class="link-btn">Go to Documents</a>
            </div>
          }
        </div>
      </div>

      <div class="recent-card glass-card">
        <div class="recent-header">
          <h3 class="chart-title">Recent Documents</h3>
          <a routerLink="/documents" class="view-all-btn">View All →</a>
        </div>
        @if ((docState.documents$ | async)?.length) {
          <div class="recent-table" role="table" aria-label="Recent documents">
            <div class="table-head" role="row">
              <span role="columnheader">Name</span>
              <span role="columnheader">Type</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Accuracy</span>
              <span role="columnheader">Date</span>
            </div>
            @for (doc of (docState.documents$ | async)!.slice(0, 8); track doc.id) {
              <a class="table-row" [routerLink]="['/viewer', doc.id]" role="row" [attr.aria-label]="'View document: ' + doc.name">
                <span class="tr-name" role="cell" [title]="doc.name">{{ doc.name }}</span>
                <span role="cell"><span class="type-badge" [class]="'t-' + doc.type">{{ doc.type.toUpperCase() }}</span></span>
                <span role="cell"><span class="status-pill" [class]="'s-' + doc.processingStatus">{{ doc.processingStatus }}</span></span>
                <span class="tr-conf" role="cell" [class.high]="doc.extractionConfidence >= 0.9">
                  {{ doc.processingStatus === 'ready' ? (doc.extractionConfidence * 100 | number:'1.0-0') + '%' : '—' }}
                </span>
                <time role="cell" class="tr-date">{{ doc.createdAt | date:'MMM d, y' }}</time>
              </a>
            }
          </div>
        } @else {
          <div class="chart-empty">
            <p>No documents yet</p>
            <a routerLink="/upload" class="link-btn">Upload your first document</a>
          </div>
        }
      </div>
    </div>
  `,
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('typeChart') typeChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('statusChart') statusChartRef!: ElementRef<HTMLCanvasElement>;

  analytics = signal<Analytics | null>(null);
  groqEnabled = signal(false);
  private typeChartInstance: Chart | null = null;
  private statusChartInstance: Chart | null = null;
  private destroy$ = new Subject<void>();

  constructor(public docState: DocumentStateService, private api: ApiService) {}

  ngOnInit(): void {
    this.docState.load();
    this.api.getAnalytics().pipe(takeUntil(this.destroy$), catchError(() => EMPTY))
      .subscribe(a => { this.analytics.set(a); this.updateCharts(a); });
    this.api.getHealth().pipe(takeUntil(this.destroy$), catchError(() => EMPTY))
      .subscribe(h => this.groqEnabled.set(h.groqEnabled));
    interval(10000).pipe(
      takeUntil(this.destroy$),
      switchMap(() => this.api.getAnalytics().pipe(catchError(() => EMPTY)))
    ).subscribe(a => { this.analytics.set(a); this.updateCharts(a); });
  }

  ngAfterViewInit(): void {
    const baseOpts = {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 } } } }
    };
    this.typeChartInstance = new Chart(this.typeChartRef.nativeElement, {
      type: 'doughnut',
      data: { labels: ['PDF', 'TXT'], datasets: [{ data: [0, 0], backgroundColor: ['#ef4444', '#6366f1'], borderColor: 'transparent', borderWidth: 0, hoverOffset: 4 }] },
      options: { ...baseOpts, cutout: '68%' }
    });
    this.statusChartInstance = new Chart(this.statusChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: ['Ready', 'Processing', 'Error'],
        datasets: [{ data: [0, 0, 0], backgroundColor: ['rgba(16,185,129,0.7)', 'rgba(245,158,11,0.7)', 'rgba(239,68,68,0.7)'], borderColor: ['#10b981', '#f59e0b', '#ef4444'], borderWidth: 1, borderRadius: 4 }]
      },
      options: { ...baseOpts, scales: { x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } } }, plugins: { ...baseOpts.plugins, legend: { display: false } } }
    });
  }

  private updateCharts(a: Analytics): void {
    if (!this.typeChartInstance || !this.statusChartInstance) return;
    this.typeChartInstance.data.datasets[0].data = [a.typeDistribution['pdf'] ?? 0, a.typeDistribution['txt'] ?? 0];
    this.typeChartInstance.update('none');
    const processing = Object.entries(a.statusDistribution).filter(([k]) => !['ready', 'error'].includes(k)).reduce((s, [, v]) => s + v, 0);
    this.statusChartInstance.data.datasets[0].data = [a.statusDistribution['ready'] ?? 0, processing, a.statusDistribution['error'] ?? 0];
    this.statusChartInstance.update('none');
  }

  hasTypeData = (): boolean => { const d = this.analytics()?.typeDistribution; return !!d && Object.values(d).some(v => v > 0); };
  hasStatusData = (): boolean => { const d = this.analytics()?.statusDistribution; return !!d && Object.values(d).some(v => v > 0); };
  getBarWidth(count: number): number { const max = Math.max(...(this.analytics()?.topKeywords?.map(k => k.count) ?? [1])); return max === 0 ? 0 : (count / max) * 100; }

  ngOnDestroy(): void { this.typeChartInstance?.destroy(); this.statusChartInstance?.destroy(); this.destroy$.next(); this.destroy$.complete(); }
}
