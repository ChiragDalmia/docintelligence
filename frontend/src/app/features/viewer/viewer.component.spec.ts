import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViewerComponent } from './viewer.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { DocumentStateService } from '../../services/document-state.service';
import { Document } from '../../models/document.model';

const readyDoc: Document = {
  id: 'doc1',
  name: 'contract.pdf',
  type: 'pdf',
  content: 'This agreement is between Acme Corp and John Doe dated 2024-03-15 for amount $5,000.00',
  extractedFields: {
    name: 'Acme Corp',
    date: '2024-03-15',
    amount: '$5,000.00',
    entities: ['Acme Corp', 'John Doe'],
    customFields: { invoiceNumber: 'INV-001' }
  },
  embeddings: [],
  createdAt: Date.now(),
  processingStatus: 'ready',
  extractionConfidence: 1.0
};

const selected$ = new BehaviorSubject<Document | null>(readyDoc);
const documents$ = new BehaviorSubject<Document[]>([readyDoc]);
const loading$ = new BehaviorSubject<boolean>(false);

const mockApiService = {
  getDocument: jasmine.createSpy('getDocument').and.returnValue(of(readyDoc)),
  listDocuments: jasmine.createSpy('listDocuments').and.returnValue(of([readyDoc]))
};

const mockDocState = {
  selected$: selected$.asObservable(),
  documents$: documents$.asObservable(),
  loading$: loading$.asObservable(),
  load: jasmine.createSpy('load'),
  select: jasmine.createSpy('select')
};

describe('ViewerComponent', () => {
  let fixture: ComponentFixture<ViewerComponent>;
  let component: ViewerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewerComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ApiService, useValue: mockApiService },
        { provide: DocumentStateService, useValue: mockDocState }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set activeDoc from selected$ observable', () => {
    expect(component.activeDoc()).toBeTruthy();
    expect(component.activeDoc()!.id).toBe('doc1');
  });

  it('should populate allDocs from documents$', () => {
    expect(component.allDocs()).toHaveSize(1);
  });

  it('filteredDocs() returns all docs when search is empty', () => {
    expect(component.filteredDocs()).toHaveSize(1);
  });

  it('filteredDocs() filters by name', () => {
    component.searchControl.setValue('contract');
    expect(component.filteredDocs()).toHaveSize(1);
    component.searchControl.setValue('zzznomatch');
    expect(component.filteredDocs()).toHaveSize(0);
  });

  it('highlightedContent() wraps field values in mark tags', () => {
    const html = component.highlightedContent() as string;
    expect(html.toString()).toContain('field-highlight');
  });

  it('highlightedContent() escapes HTML entities', () => {
    const doc = { ...readyDoc, content: 'text with <b>html</b> & entities' };
    component.activeDoc.set(doc);
    const html = component.highlightedContent().toString();
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;b&gt;');
  });

  it('customFieldEntries() returns entries for customFields', () => {
    const entries = component.customFieldEntries();
    expect(entries.some(([k]) => k === 'invoiceNumber')).toBeTrue();
  });

  it('selectDoc sets activeDoc and calls docState.select', () => {
    const anotherDoc = { ...readyDoc, id: 'doc2' };
    component.selectDoc(anotherDoc);
    expect(component.activeDoc()!.id).toBe('doc2');
    expect(mockDocState.select).toHaveBeenCalledWith(anotherDoc);
  });

  it('should fetch doc by id input', () => {
    component.id = 'doc1';
    component.ngOnInit();
    expect(mockApiService.getDocument).toHaveBeenCalledWith('doc1');
  });

  it('highlightedContent() returns empty string when activeDoc has no content', () => {
    component.activeDoc.set({ ...readyDoc, content: '' });
    const result = component.highlightedContent().toString();
    expect(result).toBe('');
  });
});
