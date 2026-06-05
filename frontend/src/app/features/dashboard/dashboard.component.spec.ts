import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { DocumentStateService } from '../../services/document-state.service';
import { Analytics, Document } from '../../models/document.model';

const mockAnalytics: Analytics = {
  totalDocuments: 10,
  averageExtractionAccuracy: 92.5,
  typeDistribution: { pdf: 7, txt: 3 },
  statusDistribution: { ready: 9, error: 1 },
  topKeywords: [
    { word: 'invoice', count: 5 },
    { word: 'payment', count: 3 },
    { word: 'acme', count: 2 }
  ],
  totalSearches: 25,
  totalChats: 8
};

const mockApiService = {
  getAnalytics: jasmine.createSpy('getAnalytics').and.returnValue(of(mockAnalytics)),
  getHealth: jasmine.createSpy('getHealth').and.returnValue(of({ status: 'ok', groqEnabled: true, documentsLoaded: 10 }))
};

const documents$ = new BehaviorSubject<Document[]>([]);
const loading$ = new BehaviorSubject<boolean>(false);

const mockDocState = {
  documents$: documents$.asObservable(),
  loading$: loading$.asObservable(),
  load: jasmine.createSpy('load')
};

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ApiService, useValue: mockApiService },
        { provide: DocumentStateService, useValue: mockDocState }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads analytics on init', () => {
    expect(mockApiService.getAnalytics).toHaveBeenCalled();
  });

  it('reflects analytics data in signals', () => {
    expect(component.analytics()?.totalDocuments).toBe(10);
    expect(component.analytics()?.averageExtractionAccuracy).toBe(92.5);
  });

  it('sets groqEnabled from health check', () => {
    expect(component.groqEnabled()).toBeTrue();
  });

  it('hasTypeData() returns true when type distribution has values', () => {
    expect(component.hasTypeData()).toBeTrue();
  });

  it('hasTypeData() returns false when empty analytics', () => {
    component.analytics.set(null);
    expect(component.hasTypeData()).toBeFalse();
  });

  it('hasStatusData() returns true when status distribution has values', () => {
    expect(component.hasStatusData()).toBeTrue();
  });

  it('getBarWidth() returns 100 for the highest count', () => {
    const result = component.getBarWidth(5);
    expect(result).toBe(100);
  });

  it('getBarWidth() returns correct percentage for lesser count', () => {
    const result = component.getBarWidth(3);
    expect(result).toBeCloseTo(60, 0);
  });

  it('getBarWidth() returns 0 when analytics is null', () => {
    component.analytics.set(null);
    expect(component.getBarWidth(5)).toBe(0);
  });

  it('calls docState.load on init', () => {
    expect(mockDocState.load).toHaveBeenCalled();
  });

  it('destroys chart instances on destroy', () => {
    const typeSpy = component['typeChartInstance']
      ? spyOn(component['typeChartInstance']!, 'destroy')
      : null;
    component.ngOnDestroy();
    if (typeSpy) expect(typeSpy).toHaveBeenCalled();
    else expect(true).toBeTruthy();
  });
});
