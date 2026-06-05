import {
  Component, ChangeDetectionStrategy, signal, computed,
  ElementRef, ViewChild, HostListener, OnDestroy
} from '@angular/core';
import { AsyncPipe, NgClass, PercentPipe } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil, interval, switchMap, take, tap, catchError, EMPTY } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { DocumentStateService } from '../../services/document-state.service';
import { ProcessingStatus, PIPELINE_STEPS, STATUS_LABELS, Document } from '../../models/document.model';

@Component({
  selector: 'app-upload',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, AsyncPipe, PercentPipe],
  template: `
    <div class="upload-page">
      <div class="upload-card glass-card">
        <h2 class="card-title">Upload Document</h2>
        <p class="card-subtitle">Supports PDF and TXT files up to 10 MB</p>

        <div
          #dropZone
          class="drop-zone"
          [class.drag-over]="isDragOver()"
          [class.has-file]="selectedFile()"
          role="button"
          tabindex="0"
          aria-label="Drop zone: drag and drop a PDF or TXT file here, or click to browse"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave()"
          (drop)="onDrop($event)"
          (click)="fileInput.click()"
          (keydown.enter)="fileInput.click()"
          (keydown.space)="fileInput.click()"
        >
          <input
            #fileInput
            type="file"
            accept=".pdf,.txt"
            class="sr-only"
            aria-hidden="true"
            (change)="onFileSelected($event)"
          />

          @if (!selectedFile()) {
            <div class="dz-idle" aria-live="polite">
              <div class="dz-icon" aria-hidden="true">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="23" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.4"/>
                  <path d="M24 30V18M18 24l6-6 6 6" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M14 34v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <p class="dz-primary">Drop your file here</p>
              <p class="dz-secondary">or <span class="dz-link">click to browse</span></p>
              <p class="dz-hint">PDF · TXT · Max 10 MB</p>
            </div>
          } @else {
            <div class="dz-file-preview" aria-live="polite">
              <div class="file-icon" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M6 4h14l6 6v18H6V4z" fill="var(--accent-subtle)" stroke="var(--accent)" stroke-width="1.5"/>
                  <path d="M20 4v6h6" stroke="var(--accent)" stroke-width="1.5"/>
                  <path d="M10 16h12M10 20h8" stroke="var(--accent)" stroke-width="1.2" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="file-meta">
                <p class="file-name">{{ selectedFile()!.name }}</p>
                <p class="file-size">{{ formatSize(selectedFile()!.size) }}</p>
              </div>
              <button class="file-remove" (click)="clearFile($event)" aria-label="Remove selected file">✕</button>
            </div>
          }
        </div>

        @if (error()) {
          <div class="error-banner" role="alert" aria-live="assertive">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="7" stroke="#ef4444" stroke-width="1.5"/>
              <path d="M8 5v4M8 11v.5" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            {{ error() }}
          </div>
        }

        @if (!isUploading()) {
          <button
            class="btn-primary"
            [disabled]="!selectedFile()"
            (click)="startUpload()"
            aria-label="Process document with AI"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z" stroke="currentColor" stroke-width="1.5"/>
              <path d="M5.5 8l2 2 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Process Document
          </button>
        }
      </div>

      @if (isUploading() || uploadedDocId()) {
        <div class="pipeline-card glass-card" aria-label="Processing pipeline status">
          <h3 class="pipeline-title">Processing Pipeline</h3>

          @if (uploadProgress() < 100 && isUploading()) {
            <div class="progress-wrap">
              <div class="progress-bar-track" role="progressbar" [attr.aria-valuenow]="uploadProgress()" aria-valuemin="0" aria-valuemax="100">
                <div class="progress-bar-fill" [style.width.%]="uploadProgress()"></div>
              </div>
              <span class="progress-label">{{ uploadProgress() }}%</span>
            </div>
          }

          <ol class="steps" role="list">
            @for (step of pipelineSteps; track step) {
              <li class="step" [class]="getStepClass(step)">
                <div class="step-indicator" aria-hidden="true">
                  @if (getStepClass(step) === 'done') {
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 7l3 3 6-6" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  } @else if (getStepClass(step) === 'active') {
                    <div class="spinner" role="status" aria-label="Processing"></div>
                  } @else if (getStepClass(step) === 'error') {
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 2.5l9 9M11.5 2.5l-9 9" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                  } @else {
                    <div class="step-dot"></div>
                  }
                </div>
                <span class="step-label">{{ stepLabels[step] }}</span>
              </li>
            }
          </ol>

          @if (currentStatus() === 'ready') {
            <div class="success-actions">
              <p class="success-msg" role="status">Document processed successfully!</p>
              <div class="action-btns">
                <button class="btn-secondary" (click)="viewDocument()">View Document</button>
                <button class="btn-secondary" (click)="chatWithDocument()">Chat with it</button>
                <button class="btn-ghost" (click)="resetUpload()">Upload Another</button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrls: ['./upload.component.scss']
})
export class UploadComponent implements OnDestroy {
  @ViewChild('dropZone') dropZone!: ElementRef<HTMLDivElement>;

  readonly pipelineSteps = PIPELINE_STEPS;
  readonly stepLabels = STATUS_LABELS;

  isDragOver = signal(false);
  selectedFile = signal<File | null>(null);
  isUploading = signal(false);
  uploadProgress = signal(0);
  error = signal<string | null>(null);
  currentStatus = signal<ProcessingStatus | null>(null);
  uploadedDocId = signal<string | null>(null);

  private destroy$ = new Subject<void>();

  constructor(
    private api: ApiService,
    private docState: DocumentStateService,
    private router: Router
  ) {}

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(): void {
    this.isDragOver.set(false);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver.set(false);
    const file = e.dataTransfer?.files[0];
    if (file) this.setFile(file);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.setFile(file);
    input.value = '';
  }

  clearFile(e: Event): void {
    e.stopPropagation();
    this.selectedFile.set(null);
    this.error.set(null);
  }

  private setFile(file: File): void {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'txt'].includes(ext ?? '')) {
      this.error.set('Only PDF and TXT files are supported.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.error.set('File exceeds 10 MB limit.');
      return;
    }
    this.error.set(null);
    this.selectedFile.set(file);
  }

  startUpload(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.isUploading.set(true);
    this.error.set(null);
    this.currentStatus.set('uploading');
    this.uploadedDocId.set(null);

    this.api.uploadDocument(file).pipe(
      takeUntil(this.destroy$),
      tap(event => {
        this.uploadProgress.set(event.progress);
        if (event.id) {
          this.uploadedDocId.set(event.id);
          this.pollStatus(event.id);
        }
      }),
      catchError(err => {
        this.error.set(err?.error?.error ?? 'Upload failed. Please try again.');
        this.isUploading.set(false);
        this.currentStatus.set('error');
        return EMPTY;
      })
    ).subscribe();
  }

  private pollStatus(id: string): void {
    interval(1500).pipe(
      takeUntil(this.destroy$),
      switchMap(() => this.api.getDocument(id)),
      tap(doc => {
        this.currentStatus.set(doc.processingStatus);
        this.docState.upsert(doc);
        if (doc.processingStatus === 'ready' || doc.processingStatus === 'error') {
          this.isUploading.set(false);
          this.destroy$.next();
        }
      }),
      catchError(() => EMPTY)
    ).subscribe();
  }

  getStepClass(step: ProcessingStatus): 'done' | 'active' | 'pending' | 'error' {
    const status = this.currentStatus();
    if (!status) return 'pending';
    if (status === 'error') {
      const stepIdx = PIPELINE_STEPS.indexOf(step);
      const statusIdx = PIPELINE_STEPS.indexOf('ready');
      return stepIdx < statusIdx ? 'done' : 'error';
    }
    const stepIdx = PIPELINE_STEPS.indexOf(step);
    const statusIdx = PIPELINE_STEPS.indexOf(status as ProcessingStatus);
    if (status === 'ready') return 'done';
    if (stepIdx < statusIdx) return 'done';
    if (stepIdx === statusIdx) return 'active';
    return 'pending';
  }

  viewDocument(): void {
    const id = this.uploadedDocId();
    if (id) this.router.navigate(['/viewer', id]);
  }

  chatWithDocument(): void {
    const id = this.uploadedDocId();
    if (id) {
      const doc = this.docState['_documents$'].value.find((d: Document) => d.id === id);
      if (doc) this.docState.select(doc);
      this.router.navigate(['/chat']);
    }
  }

  resetUpload(): void {
    this.selectedFile.set(null);
    this.isUploading.set(false);
    this.uploadProgress.set(0);
    this.error.set(null);
    this.currentStatus.set(null);
    this.uploadedDocId.set(null);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
