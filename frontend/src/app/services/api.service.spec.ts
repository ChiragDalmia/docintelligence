import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ApiService } from './api.service';
import { Document, SearchQuery, ChatMessage, Analytics } from '../models/document.model';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  const mockDoc: Document = {
    id: 'abc123',
    name: 'test.pdf',
    type: 'pdf',
    content: 'hello world',
    extractedFields: { entities: [], customFields: {} },
    embeddings: [],
    createdAt: 1000000,
    processingStatus: 'ready',
    extractionConfidence: 1.0
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('listDocuments() calls GET /api/documents', () => {
    service.listDocuments().subscribe(docs => {
      expect(docs).toEqual([mockDoc]);
    });
    const req = httpMock.expectOne('/api/documents');
    expect(req.request.method).toBe('GET');
    req.flush([mockDoc]);
  });

  it('getDocument(id) calls GET /api/documents/:id', () => {
    service.getDocument('abc123').subscribe(doc => {
      expect(doc.id).toBe('abc123');
    });
    const req = httpMock.expectOne('/api/documents/abc123');
    expect(req.request.method).toBe('GET');
    req.flush(mockDoc);
  });

  it('deleteDocument(id) calls DELETE /api/documents/:id', () => {
    service.deleteDocument('abc123').subscribe(r => {
      expect(r.deleted).toBeTrue();
    });
    const req = httpMock.expectOne('/api/documents/abc123');
    expect(req.request.method).toBe('DELETE');
    req.flush({ deleted: true });
  });

  it('search() calls POST /api/search with query body', () => {
    const mockResult: SearchQuery = { query: 'invoice', results: [] };
    service.search('invoice', 5).subscribe(r => {
      expect(r.query).toBe('invoice');
    });
    const req = httpMock.expectOne('/api/search');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.query).toBe('invoice');
    req.flush(mockResult);
  });

  it('chat() calls POST /api/chat', () => {
    const msgs: ChatMessage[] = [{ role: 'user', content: 'what is this?', timestamp: 1000 }];
    const reply: ChatMessage = { role: 'assistant', content: 'A document.', timestamp: 2000 };
    service.chat('abc123', msgs).subscribe(r => {
      expect(r.role).toBe('assistant');
    });
    const req = httpMock.expectOne('/api/chat');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.documentId).toBe('abc123');
    req.flush(reply);
  });

  it('getAnalytics() calls GET /api/analytics', () => {
    const mockAnalytics: Analytics = {
      totalDocuments: 5,
      averageExtractionAccuracy: 87.5,
      typeDistribution: { pdf: 3, txt: 2 },
      statusDistribution: { ready: 5 },
      topKeywords: [],
      totalSearches: 10,
      totalChats: 3
    };
    service.getAnalytics().subscribe(a => {
      expect(a.totalDocuments).toBe(5);
    });
    const req = httpMock.expectOne('/api/analytics');
    expect(req.request.method).toBe('GET');
    req.flush(mockAnalytics);
  });

  it('extractDocument() calls POST /api/documents/:id/extract', () => {
    service.extractDocument('abc123').subscribe(doc => {
      expect(doc.id).toBe('abc123');
    });
    const req = httpMock.expectOne('/api/documents/abc123/extract');
    expect(req.request.method).toBe('POST');
    req.flush(mockDoc);
  });
});
