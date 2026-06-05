import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpRequest } from '@angular/common/http';
import { Observable, map, filter } from 'rxjs';
import { Document, SearchQuery, ChatMessage, Analytics } from '../models/document.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = '/api';

  constructor(private http: HttpClient) {}

  uploadDocument(file: File): Observable<{ progress: number; id?: string; status?: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const req = new HttpRequest('POST', `${this.base}/documents/upload`, formData, {
      reportProgress: true
    });

    return this.http.request(req).pipe(
      filter(e =>
        e.type === HttpEventType.UploadProgress ||
        e.type === HttpEventType.Response
      ),
      map(e => {
        if (e.type === HttpEventType.UploadProgress) {
          const total = e.total ?? 1;
          return { progress: Math.round((e.loaded / total) * 100) };
        }
        if (e.type === HttpEventType.Response) {
          const body = e.body as { id: string; status: string };
          return { progress: 100, id: body.id, status: body.status };
        }
        return { progress: 0 };
      })
    );
  }

  listDocuments(): Observable<Document[]> {
    return this.http.get<Document[]>(`${this.base}/documents`);
  }

  getDocument(id: string): Observable<Document> {
    return this.http.get<Document>(`${this.base}/documents/${id}`);
  }

  deleteDocument(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.base}/documents/${id}`);
  }

  extractDocument(id: string): Observable<Document> {
    return this.http.post<Document>(`${this.base}/documents/${id}/extract`, {});
  }

  search(query: string, topK = 5): Observable<SearchQuery> {
    return this.http.post<SearchQuery>(`${this.base}/search`, { query, topK });
  }

  chat(documentId: string, messages: ChatMessage[]): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.base}/chat`, { documentId, messages });
  }

  getAnalytics(): Observable<Analytics> {
    return this.http.get<Analytics>(`${this.base}/analytics`);
  }

  getHealth(): Observable<{ status: string; groqEnabled: boolean; documentsLoaded: number }> {
    return this.http.get<{ status: string; groqEnabled: boolean; documentsLoaded: number }>(`${this.base}/health`);
  }
}
