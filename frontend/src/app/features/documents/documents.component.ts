import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, signal } from '@angular/core';
import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil, catchError, EMPTY } from 'rxjs';
import { Document } from '../../models/document.model';
import { DocumentStateService } from '../../services/document-state.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-documents',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, DatePipe, DecimalPipe, RouterLink],
  template: `
    <div class="documents-page">
      <div class="page-header">
        <div>
          <h2 class="section-title">All Documents</h2>
          <p class="section-sub">{{ (docState.documents$ | async)?.length ?? 0 }} documents processed</p>
        </div>
        <a routerLink="/upload" class="btn-primary" aria-label="Upload a new document">+ Upload New</a>
      </div>

      @if (docState.loading$ | async) {
        <div class="loading-state" role="status" aria-live="polite">
          <div class="skeleton-list">
            @for (i of [1,2,3]; track i) { <div class="skeleton-row"></div> }
          </div>
        </div>
      } @else if ((docState.documents$ | async)?.length === 0) {
        <div class="empty-state" role="status">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <circle cx="32" cy="32" r="31" stroke="var(--border)" stroke-width="1.5"/>
            <path d="M20 18h18l6 6v22H20V18z" stroke="var(--text-dim)" stroke-width="1.5" fill="none"/>
            <path d="M38 18v6h6" stroke="var(--text-dim)" stroke-width="1.5"/>
            <path d="M26 32h12M26 37h8" stroke="var(--text-dim)" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
          <p class="empty-title">No documents yet</p>
          <p class="empty-sub">Upload a PDF or TXT to get started</p>
          <a routerLink="/upload" class="btn-primary" style="display:inline-block;text-decoration:none;padding:10px 20px">Upload Document</a>
        </div>
      } @else {
        <div class="doc-grid">
          @for (doc of docState.documents$ | async; track doc.id) {
            <article class="doc-card glass-card" (click)="selectAndView(doc)" role="button" tabindex="0"
              [attr.aria-label]="'Document: ' + doc.name + ', status: ' + doc.processingStatus"
              (keydown.enter)="selectAndView(doc)" (keydown.space)="selectAndView(doc)">
              <div class="doc-card-header">
                <div class="doc-type-badge" [class]="'type-' + doc.type" [attr.aria-label]="'File type: ' + doc.type">{{ doc.type.toUpperCase() }}</div>
                <span class="doc-status-badge" [class]="'status-' + doc.processingStatus" [attr.aria-label]="'Status: ' + doc.processingStatus">
                  @if (doc.processingStatus !== 'ready' && doc.processingStatus !== 'error') {
                    <span class="status-spinner" aria-hidden="true"></span>
                  }
                  {{ doc.processingStatus }}
                </span>
              </div>

              <p class="doc-name" [title]="doc.name">{{ doc.name }}</p>

              @if (doc.processingStatus === 'ready') {
                <div class="doc-fields">
                  @if (doc.extractedFields.name) { <span class="field-chip">{{ doc.extractedFields.name }}</span> }
                  @if (doc.extractedFields.date) { <span class="field-chip">{{ doc.extractedFields.date }}</span> }
                  @if (doc.extractedFields.amount) { <span class="field-chip">{{ doc.extractedFields.amount }}</span> }
                </div>
                <div class="doc-confidence">
                  <div class="confidence-track" role="progressbar"
                    [attr.aria-valuenow]="doc.extractionConfidence * 100" aria-valuemin="0" aria-valuemax="100"
                    [attr.aria-label]="'Extraction confidence: ' + (doc.extractionConfidence * 100 | number:'1.0-0') + '%'">
                    <div class="confidence-fill" [style.width.%]="doc.extractionConfidence * 100"
                      [class.high]="doc.extractionConfidence >= 0.9"
                      [class.med]="doc.extractionConfidence >= 0.6 && doc.extractionConfidence < 0.9"></div>
                  </div>
                  <span class="confidence-label">{{ doc.extractionConfidence * 100 | number:'1.0-0' }}% accuracy</span>
                </div>
              }

              <div class="doc-footer">
                <time class="doc-date" [dateTime]="doc.createdAt | date:'yyyy-MM-dd'">{{ doc.createdAt | date:'MMM d, y' }}</time>
                <div class="doc-actions" (click)="$event.stopPropagation()">
                  <button class="icon-btn" (click)="selectAndView(doc)" aria-label="View document">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z" stroke="currentColor" stroke-width="1.3"/><circle cx="7" cy="7" r="2" stroke="currentColor" stroke-width="1.3"/></svg>
                  </button>
                  <button class="icon-btn" (click)="chatDoc(doc)" aria-label="Chat with document">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12 1H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2l3 3 3-3h2a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z" stroke="currentColor" stroke-width="1.3"/></svg>
                  </button>
                  <button class="icon-btn danger" (click)="deleteDoc(doc)" [disabled]="deletingId() === doc.id" aria-label="Delete document">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M5 4V2h4v2M6 6.5v4M8 6.5v4M3 4l.5 8h7l.5-8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                  </button>
                </div>
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
  styleUrls: ['./documents.component.scss']
})
export class DocumentsComponent implements OnInit, OnDestroy {
  deletingId = signal<string | null>(null);
  private destroy$ = new Subject<void>();

  constructor(public docState: DocumentStateService, private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.docState.load();
    this.docState.startPolling(3000).pipe(takeUntil(this.destroy$)).subscribe();
  }

  selectAndView(doc: Document): void {
    this.docState.select(doc);
    this.router.navigate(['/viewer', doc.id]);
  }

  chatDoc(doc: Document): void {
    this.docState.select(doc);
    this.router.navigate(['/chat']);
  }

  deleteDoc(doc: Document): void {
    if (this.deletingId()) return;
    this.deletingId.set(doc.id);
    this.api.deleteDocument(doc.id).pipe(
      takeUntil(this.destroy$),
      catchError(() => { this.deletingId.set(null); return EMPTY; })
    ).subscribe(() => { this.docState.remove(doc.id); this.deletingId.set(null); });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
