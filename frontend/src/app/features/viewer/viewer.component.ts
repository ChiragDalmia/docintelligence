import { Component, ChangeDetectionStrategy, OnInit, Input, signal, computed, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, catchError, EMPTY } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Document } from '../../models/document.model';
import { DocumentStateService } from '../../services/document-state.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule],
  template: `
    <div class="viewer-layout">
      <aside class="viewer-sidebar" aria-label="Document list">
        <div class="sidebar-header">
          <h3 class="sidebar-title">Documents</h3>
          <input [formControl]="searchControl" class="search-input" type="search" placeholder="Search documents…" aria-label="Search documents"/>
        </div>
        <div class="doc-list" role="list">
          @for (doc of filteredDocs(); track doc.id) {
            <button class="doc-list-item" [class.active]="activeDoc()?.id === doc.id" (click)="selectDoc(doc)"
              [attr.aria-label]="'Select document: ' + doc.name" [attr.aria-pressed]="activeDoc()?.id === doc.id" role="listitem">
              <div class="dli-type" [class]="'type-' + doc.type">{{ doc.type.toUpperCase() }}</div>
              <div class="dli-meta">
                <span class="dli-name">{{ doc.name }}</span>
                <span class="dli-date">{{ doc.createdAt | date:'MMM d' }}</span>
              </div>
              <div class="dli-status" [class]="'s-' + doc.processingStatus"></div>
            </button>
          }
          @if (filteredDocs().length === 0) { <p class="no-results">No documents found</p> }
        </div>
      </aside>

      <main class="viewer-main" role="main">
        @if (!activeDoc()) {
          <div class="empty-viewer">
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
              <circle cx="28" cy="28" r="27" stroke="var(--border)" stroke-width="1.5"/>
              <path d="M17 16h16l6 6v18H17V16z" stroke="var(--text-dim)" stroke-width="1.5" fill="none"/>
              <path d="M33 16v6h6" stroke="var(--text-dim)" stroke-width="1.5"/>
            </svg>
            <p>Select a document to view</p>
          </div>
        } @else {
          <div class="viewer-content">
            <div class="viewer-header">
              <div class="vh-left">
                <h2 class="doc-title">{{ activeDoc()!.name }}</h2>
                <span class="doc-status" [class]="'status-' + activeDoc()!.processingStatus">{{ activeDoc()!.processingStatus }}</span>
              </div>
              <div class="vh-actions">
                <button class="btn-ghost" (click)="openChat()" aria-label="Chat with this document">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M12 1H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2l3 3 3-3h2a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z" stroke="currentColor" stroke-width="1.3"/>
                  </svg>
                  Chat
                </button>
              </div>
            </div>

            <div class="viewer-body">
              <div class="fields-panel glass-card">
                <h4 class="fields-title">Extracted Fields</h4>

                @if (activeDoc()!.extractedFields.name) {
                  <div class="field-row"><span class="field-key">Name</span>
                    <button class="field-val clickable" (click)="scrollToField(activeDoc()!.extractedFields.name!)">{{ activeDoc()!.extractedFields.name }}</button></div>
                }
                @if (activeDoc()!.extractedFields.date) {
                  <div class="field-row"><span class="field-key">Date</span>
                    <button class="field-val clickable" (click)="scrollToField(activeDoc()!.extractedFields.date!)">{{ activeDoc()!.extractedFields.date }}</button></div>
                }
                @if (activeDoc()!.extractedFields.amount) {
                  <div class="field-row"><span class="field-key">Amount</span>
                    <button class="field-val clickable" (click)="scrollToField(activeDoc()!.extractedFields.amount!)">{{ activeDoc()!.extractedFields.amount }}</button></div>
                }
                @if (activeDoc()!.extractedFields.entities?.length) {
                  <div class="field-row entities-row"><span class="field-key">Entities</span>
                    <div class="entity-chips">
                      @for (e of activeDoc()!.extractedFields.entities!; track e) {
                        <button class="entity-chip" (click)="scrollToField(e)" [attr.aria-label]="'Jump to ' + e + ' in document'">{{ e }}</button>
                      }
                    </div>
                  </div>
                }
                @if (activeDoc()!.extractedFields.customFields) {
                  @for (entry of customFieldEntries(); track entry[0]) {
                    <div class="field-row"><span class="field-key">{{ entry[0] }}</span><span class="field-val mono">{{ entry[1] }}</span></div>
                  }
                }

                <div class="confidence-row">
                  <span class="field-key">Confidence</span>
                  <div class="conf-bar-wrap">
                    <div class="conf-bar-track">
                      <div class="conf-bar-fill" [style.width.%]="activeDoc()!.extractionConfidence * 100"
                        [class.high]="activeDoc()!.extractionConfidence >= 0.9"></div>
                    </div>
                    <span class="conf-pct">{{ (activeDoc()!.extractionConfidence * 100).toFixed(0) }}%</span>
                  </div>
                </div>
              </div>

              <div class="text-panel" #textPanel>
                <div class="text-toolbar">
                  <span class="text-label">Document Content</span>
                  <span class="char-count">{{ activeDoc()!.content.length | number }} chars</span>
                </div>
                <div class="doc-text" [innerHTML]="highlightedContent()" aria-label="Document content" aria-live="polite"></div>
              </div>
            </div>
          </div>
        }
      </main>
    </div>
  `,
  styleUrls: ['./viewer.component.scss']
})
export class ViewerComponent implements OnInit, OnDestroy {
  @Input() id?: string;
  @ViewChild('textPanel') textPanel!: ElementRef<HTMLDivElement>;

  searchControl = new FormControl('');
  activeDoc = signal<Document | null>(null);
  allDocs = signal<Document[]>([]);
  private searchQuery = signal('');
  private destroy$ = new Subject<void>();

  filteredDocs = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return q ? this.allDocs().filter(d => d.name.toLowerCase().includes(q)) : this.allDocs();
  });

  highlightedContent = computed((): SafeHtml => {
    const doc = this.activeDoc();
    if (!doc?.content) return '';
    const f = doc.extractedFields;
    const terms = [f?.name, f?.date, f?.amount, ...(f?.entities ?? []), ...Object.values(f?.customFields ?? {})].filter(Boolean) as string[];
    let text = doc.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    for (const term of terms) {
      if (term.length < 2) continue;
      text = text.replace(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark class="field-highlight">$1</mark>');
    }
    return this.sanitizer.bypassSecurityTrustHtml(text);
  });

  customFieldEntries = computed((): [string, string][] => Object.entries(this.activeDoc()?.extractedFields?.customFields ?? {}));

  constructor(private docState: DocumentStateService, private api: ApiService, private router: Router, private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.searchControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(v => this.searchQuery.set(v ?? ''));
    this.docState.documents$.pipe(takeUntil(this.destroy$)).subscribe(docs => this.allDocs.set(docs));
    if (this.id) {
      this.api.getDocument(this.id).pipe(takeUntil(this.destroy$), catchError(() => EMPTY))
        .subscribe(doc => { this.activeDoc.set(doc); this.docState.select(doc); });
    } else {
      this.docState.selected$.pipe(takeUntil(this.destroy$)).subscribe(doc => this.activeDoc.set(doc));
    }
    this.docState.load();
  }

  selectDoc(doc: Document): void { this.activeDoc.set(doc); this.docState.select(doc); }

  scrollToField(term: string): void {
    const marks = this.textPanel?.nativeElement?.querySelectorAll('mark.field-highlight');
    if (!marks) return;
    for (const mark of Array.from(marks)) {
      if (mark.textContent?.toLowerCase().includes(term.toLowerCase())) {
        mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
        mark.classList.add('flash');
        setTimeout(() => mark.classList.remove('flash'), 1200);
        break;
      }
    }
  }

  openChat(): void { if (this.activeDoc()) this.docState.select(this.activeDoc()); this.router.navigate(['/chat']); }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
