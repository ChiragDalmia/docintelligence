import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { Subject, takeUntil, catchError, EMPTY } from 'rxjs';
import { Document, ChatMessage } from '../../models/document.model';
import { DocumentStateService } from '../../services/document-state.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, DatePipe, ReactiveFormsModule],
  template: `
    <div class="chat-layout">
      <aside class="chat-sidebar" aria-label="Select document to chat with">
        <div class="sidebar-head"><h3 class="sidebar-label">Documents</h3></div>
        <div class="doc-picker" role="list">
          @for (doc of (docState.documents$ | async) ?? []; track doc.id) {
            @if (doc.processingStatus === 'ready') {
              <button class="picker-item" [class.active]="activeDoc()?.id === doc.id" (click)="selectDoc(doc)"
                role="listitem" [attr.aria-label]="'Chat with ' + doc.name" [attr.aria-pressed]="activeDoc()?.id === doc.id">
                <div class="pi-type" [class]="'t-' + doc.type">{{ doc.type.toUpperCase() }}</div>
                <span class="pi-name">{{ doc.name }}</span>
                @if (activeDoc()?.id === doc.id) {
                  <svg class="pi-check" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2 6l2.5 2.5 5.5-5" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                }
              </button>
            }
          }
          @if (((docState.documents$ | async) ?? []).filter(d => d.processingStatus === 'ready').length === 0) {
            <p class="no-docs">No ready documents yet. Upload one first.</p>
          }
        </div>
      </aside>

      <div class="chat-main">
        @if (!activeDoc()) {
          <div class="chat-empty">
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
              <circle cx="28" cy="28" r="27" stroke="var(--border)" stroke-width="1.5"/>
              <path d="M38 14H18a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h5l5 6 5-6h5a2 2 0 0 0 2-2V16a2 2 0 0 0-2-2z" stroke="var(--text-dim)" stroke-width="1.5" fill="none"/>
            </svg>
            <p class="empty-title">Select a document to start chatting</p>
            <p class="empty-sub">Ask questions about your document and get AI-powered answers</p>
          </div>
        } @else {
          <div class="chat-header">
            <div class="ch-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 2h8l2 2v9H4V2z" stroke="var(--accent)" stroke-width="1.3" fill="none"/>
                <path d="M6 7h4M6 9.5h3" stroke="var(--accent)" stroke-width="1.1" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="ch-meta">
              <span class="ch-name">{{ activeDoc()!.name }}</span>
              <span class="ch-sub">{{ messages().length }} messages</span>
            </div>
            <button class="btn-clear" (click)="clearChat()" aria-label="Clear chat history">Clear</button>
          </div>

          <div class="messages-area" #messagesEnd role="log" aria-live="polite" aria-label="Chat messages">
            @if (messages().length === 0) {
              <div class="chat-hints">
                <p class="hints-title">Suggested questions</p>
                <div class="hint-chips">
                  @for (hint of getSuggestedQuestions(); track hint) {
                    <button class="hint-chip" (click)="useHint(hint)" [attr.aria-label]="'Ask: ' + hint">{{ hint }}</button>
                  }
                </div>
              </div>
            }
            @for (msg of messages(); track msg.timestamp + msg.role) {
              <div class="message" [class]="'msg-' + msg.role" [attr.aria-label]="msg.role + ' says: ' + msg.content">
                <div class="msg-avatar" aria-hidden="true">
                  @if (msg.role === 'user') {
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="4.5" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M2 12c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                  } @else {
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="3" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M4 7h6M7 4v6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                  }
                </div>
                <div class="msg-body">
                  <p class="msg-content">{{ msg.content }}</p>
                  <time class="msg-time" [dateTime]="msg.timestamp | date:'yyyy-MM-ddTHH:mm'">{{ msg.timestamp | date:'h:mm a' }}</time>
                </div>
              </div>
            }
            @if (isLoading()) {
              <div class="message msg-assistant" role="status" aria-label="AI is thinking">
                <div class="msg-avatar" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="3" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M4 7h6M7 4v6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                </div>
                <div class="msg-body"><div class="typing-indicator" aria-hidden="true"><span></span><span></span><span></span></div></div>
              </div>
            }
          </div>

          <div class="chat-input-area">
            @if (error()) { <div class="chat-error" role="alert">{{ error() }}</div> }
            <form class="input-form" (ngSubmit)="sendMessage()" aria-label="Chat input form">
              <div class="input-wrap">
                <textarea [formControl]="inputControl" class="chat-input" placeholder="Ask a question about this document…"
                  rows="1" aria-label="Type your question" aria-multiline="true"
                  (keydown.enter)="onEnterKey($event)" (input)="autoResize($event)"></textarea>
                <button type="submit" class="send-btn" [disabled]="!inputControl.valid || isLoading()" aria-label="Send message">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M13.5 8L2.5 2l2 6-2 6 11-6z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/>
                  </svg>
                </button>
              </div>
              <p class="input-hint">Press Enter to send · Shift+Enter for new line</p>
            </form>
          </div>
        }
      </div>
    </div>
  `,
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesEnd') messagesEnd!: ElementRef<HTMLDivElement>;

  activeDoc = signal<Document | null>(null);
  messages = signal<ChatMessage[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  inputControl = new FormControl('', [Validators.required, Validators.minLength(1)]);

  private destroy$ = new Subject<void>();
  private shouldScroll = false;

  constructor(public docState: DocumentStateService, private api: ApiService) {}

  ngOnInit(): void {
    this.docState.selected$.pipe(takeUntil(this.destroy$)).subscribe(doc => {
      if (doc?.processingStatus === 'ready') {
        if (this.activeDoc()?.id !== doc.id) { this.messages.set([]); this.error.set(null); }
        this.activeDoc.set(doc);
      }
    });
  }

  ngAfterViewChecked(): void { if (this.shouldScroll) { this.scrollToBottom(); this.shouldScroll = false; } }

  selectDoc(doc: Document): void {
    if (this.activeDoc()?.id !== doc.id) { this.messages.set([]); this.error.set(null); }
    this.activeDoc.set(doc); this.docState.select(doc);
  }

  sendMessage(): void {
    const text = this.inputControl.value?.trim();
    if (!text || !this.activeDoc() || this.isLoading()) return;
    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() };
    this.messages.update(msgs => [...msgs, userMsg]);
    this.inputControl.reset(''); this.isLoading.set(true); this.error.set(null); this.shouldScroll = true;
    this.api.chat(this.activeDoc()!.id, this.messages()).pipe(
      takeUntil(this.destroy$),
      catchError(err => { this.error.set(err?.error?.error ?? 'Failed to get a response. Please try again.'); this.isLoading.set(false); return EMPTY; })
    ).subscribe(reply => { this.messages.update(msgs => [...msgs, reply]); this.isLoading.set(false); this.shouldScroll = true; });
  }

  onEnterKey(e: Event): void { if (!(e as KeyboardEvent).shiftKey) { e.preventDefault(); this.sendMessage(); } }

  autoResize(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  clearChat(): void { this.messages.set([]); this.error.set(null); }
  useHint(hint: string): void { this.inputControl.setValue(hint); this.sendMessage(); }

  getSuggestedQuestions(): string[] {
    const doc = this.activeDoc();
    if (!doc) return [];
    const q = ['What is the main purpose of this document?', 'Who is mentioned in this document?', 'What is the date in this document?', 'Summarize the key points.'];
    if (doc.extractedFields?.amount) q.push(`What does the amount ${doc.extractedFields.amount} refer to?`);
    return q.slice(0, 4);
  }

  private scrollToBottom(): void {
    const el = this.messagesEnd?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
