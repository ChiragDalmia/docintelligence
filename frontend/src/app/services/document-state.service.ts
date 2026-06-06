import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, switchMap, tap, catchError, EMPTY } from 'rxjs';
import { Document } from '../models/document.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class DocumentStateService {
  _documents$ = new BehaviorSubject<Document[]>([]);
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
        if (sel) { const u = docs.find(d => d.id === sel.id); if (u) this._selected$.next(u); }
      }),
      catchError(() => { this._loading$.next(false); return EMPTY; })
    ).subscribe();
  }

  startPolling(ms = 2500) {
    return interval(ms).pipe(
      switchMap(() => this.api.listDocuments()),
      tap(docs => {
        this._documents$.next(docs);
        const sel = this._selected$.value;
        if (sel) { const u = docs.find(d => d.id === sel.id); if (u) this._selected$.next(u); }
      }),
      catchError(() => EMPTY)
    );
  }

  select(doc: Document | null): void { this._selected$.next(doc); }

  upsert(doc: Document): void {
    const cur = this._documents$.value;
    const i = cur.findIndex(d => d.id === doc.id);
    this._documents$.next(i >= 0 ? cur.map((d, idx) => idx === i ? doc : d) : [doc, ...cur]);
  }

  remove(id: string): void {
    this._documents$.next(this._documents$.value.filter(d => d.id !== id));
    if (this._selected$.value?.id === id) this._selected$.next(null);
  }
}
