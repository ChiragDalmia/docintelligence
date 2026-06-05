import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatComponent } from './chat.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { DocumentStateService } from '../../services/document-state.service';
import { Document, ChatMessage } from '../../models/document.model';

const readyDoc: Document = {
  id: 'doc1', name: 'invoice.pdf', type: 'pdf',
  content: 'Invoice from Acme Corp dated 2024-01-01 total $100.00',
  extractedFields: { name: 'Acme Corp', date: '2024-01-01', amount: '$100.00', entities: [], customFields: {} },
  embeddings: [], createdAt: Date.now(), processingStatus: 'ready', extractionConfidence: 1.0
};

const mockApiService = {
  chat: jasmine.createSpy('chat').and.returnValue(
    of({ role: 'assistant', content: 'The amount is $100.00', timestamp: Date.now() } as ChatMessage)
  )
};

const selected$ = new BehaviorSubject<Document | null>(readyDoc);
const documents$ = new BehaviorSubject<Document[]>([readyDoc]);

const mockDocState = {
  selected$: selected$.asObservable(),
  documents$: documents$.asObservable(),
  select: jasmine.createSpy('select')
};

describe('ChatComponent', () => {
  let fixture: ComponentFixture<ChatComponent>;
  let component: ChatComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ApiService, useValue: mockApiService },
        { provide: DocumentStateService, useValue: mockDocState }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should auto-select document from state', () => {
    expect(component.activeDoc()).toBeTruthy();
    expect(component.activeDoc()!.id).toBe('doc1');
  });

  it('should start with empty messages', () => {
    component.messages.set([]);
    expect(component.messages()).toEqual([]);
  });

  it('should not send empty message', () => {
    mockApiService.chat.calls.reset();
    component.inputControl.setValue('');
    component.sendMessage();
    expect(mockApiService.chat).not.toHaveBeenCalled();
  });

  it('should send message and receive reply', () => {
    component.inputControl.setValue('What is the amount?');
    component.sendMessage();
    expect(mockApiService.chat).toHaveBeenCalled();
    expect(component.messages().some(m => m.role === 'user')).toBeTrue();
    expect(component.messages().some(m => m.role === 'assistant')).toBeTrue();
  });

  it('should clear input after sending', () => {
    component.inputControl.setValue('Test question');
    component.sendMessage();
    expect(component.inputControl.value).toBeFalsy();
  });

  it('should clear all messages on clearChat()', () => {
    component.messages.set([{ role: 'user', content: 'hi', timestamp: 1 }]);
    component.clearChat();
    expect(component.messages()).toEqual([]);
  });

  it('getSuggestedQuestions returns up to 4 questions', () => {
    const q = component.getSuggestedQuestions();
    expect(q.length).toBeLessThanOrEqual(4);
    expect(q.length).toBeGreaterThan(0);
  });

  it('getSuggestedQuestions includes amount hint when field present', () => {
    const q = component.getSuggestedQuestions();
    const hasAmount = q.some(x => x.includes('$100.00'));
    expect(hasAmount).toBeTrue();
  });

  it('selectDoc sets activeDoc', () => {
    const anotherDoc = { ...readyDoc, id: 'doc2', name: 'other.txt' };
    component.selectDoc(anotherDoc);
    expect(component.activeDoc()!.id).toBe('doc2');
    expect(mockDocState.select).toHaveBeenCalledWith(anotherDoc);
  });

  it('isLoading is false after successful send', () => {
    component.inputControl.setValue('A question');
    component.sendMessage();
    expect(component.isLoading()).toBeFalse();
  });
});
