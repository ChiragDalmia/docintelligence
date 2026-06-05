import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, switchMap, tap, catchError, EMPTY } from 'rxjs';
import { Document } from '../models/document.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class DocumentStateService {
  private _documents$ = new BehaviorSubject<Document[]>([]);
  private _selected$ = new BehaviorSubject<Document | null>(null);
  private _loading$ = new BehaviorSubject<boolean>(false);

  readonly documents$ = this._documents$.asObservable();
  readonly selected$ = this._selected$.asObservable();
  readonly loading$ = this._loading$.asObservable();

  constructor(private api: ApiService) {}

  load(): void {
    this._loading$.next(true);
    this.api.listDocuments().pipe(
      tap(docs => {
        this._documents$.next(docs);
        this._loading$.next(false);
        const sel = this._selected$.value;
        if (sel) {
          const updated = docs.find(d => d.id === sel.id);
          if (updated) this._selected$.next(updated);
        }
      }),
      catchError(() => { this._loading$.next(false); return EMPTY; })
    ).subscribe();
  }

  startPolling(intervalMs = 2500) {
    return interval(intervalMs).pipe(
      switchMap(() => this.api.listDocuments()),
      tap(docs => {
        this._documents$.next(docs);
        const sel = this._selected$.value;
        if (sel) {
          const updated = docs.find(d => d.id === sel.id);
          if (updated) this._selected$.next(updated);
        }
      }),
      catchError(() => EMPTY)
    );
  }

  select(doc: Document | null): void {
    this._selected$.next(doc);
  }

  upsert(doc: Document): void {
    const current = this._documents$.value;
    const idx = current.findIndex(d => d.id === doc.id);
    if (idx >= 0) {
      const updated = [...current];
      updated[idx] = doc;
      this._documents$.next(updated);
    } else {
      this._documents$.next([doc, ...current]);
    }
  }

  remove(id: string): void {
    this._documents$.next(this._documents$.value.filter(d => d.id !== id));
    if (this._selected$.value?.id === id) this._selected$.next(null);
  }
}
