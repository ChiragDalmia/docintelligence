import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { UploadComponent } from './upload.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { DocumentStateService } from '../../services/document-state.service';
import { of, throwError } from 'rxjs';

const mockApiService = {
  uploadDocument: jasmine.createSpy('uploadDocument').and.returnValue(of({ progress: 100, id: 'doc1', status: 'uploading' })),
  getDocument: jasmine.createSpy('getDocument').and.returnValue(of({
    id: 'doc1', name: 'test.txt', type: 'txt', content: 'hi', extractedFields: {}, embeddings: [],
    createdAt: Date.now(), processingStatus: 'ready', extractionConfidence: 0.7
  }))
};

const mockDocState = {
  upsert: jasmine.createSpy('upsert'),
  select: jasmine.createSpy('select'),
  _documents$: { value: [] }
};

describe('UploadComponent', () => {
  let fixture: ComponentFixture<UploadComponent>;
  let component: UploadComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ApiService, useValue: mockApiService },
        { provide: DocumentStateService, useValue: mockDocState }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with no file selected', () => {
    expect(component.selectedFile()).toBeNull();
    expect(component.isUploading()).toBeFalse();
    expect(component.error()).toBeNull();
  });

  it('should reject unsupported file types', () => {
    const file = new File(['content'], 'test.docx', { type: 'application/msword' });
    component['setFile'](file);
    expect(component.error()).toContain('Only PDF and TXT');
    expect(component.selectedFile()).toBeNull();
  });

  it('should reject files over 10MB', () => {
    const bigContent = new Uint8Array(11 * 1024 * 1024);
    const file = new File([bigContent], 'big.pdf', { type: 'application/pdf' });
    component['setFile'](file);
    expect(component.error()).toContain('10 MB');
  });

  it('should accept valid PDF file', () => {
    const file = new File(['%PDF-1.4'], 'invoice.pdf', { type: 'application/pdf' });
    component['setFile'](file);
    expect(component.selectedFile()).toBe(file);
    expect(component.error()).toBeNull();
  });

  it('should accept valid TXT file', () => {
    const file = new File(['hello world'], 'readme.txt', { type: 'text/plain' });
    component['setFile'](file);
    expect(component.selectedFile()).toBe(file);
    expect(component.error()).toBeNull();
  });

  it('should not start upload without a file', () => {
    component.startUpload();
    expect(mockApiService.uploadDocument).not.toHaveBeenCalled();
  });

  it('formatSize should format bytes correctly', () => {
    expect(component.formatSize(512)).toBe('512 B');
    expect(component.formatSize(1500)).toBe('1.5 KB');
    expect(component.formatSize(2 * 1024 * 1024)).toBe('2.00 MB');
  });

  it('resetUpload clears state', () => {
    const file = new File(['content'], 'test.txt');
    component['setFile'](file);
    component.resetUpload();
    expect(component.selectedFile()).toBeNull();
    expect(component.uploadProgress()).toBe(0);
  });

  it('getStepClass returns pending for null status', () => {
    expect(component.getStepClass('ready')).toBe('pending');
  });

  it('getStepClass returns done when status is ready', () => {
    component.currentStatus.set('ready');
    expect(component.getStepClass('uploading')).toBe('done');
    expect(component.getStepClass('ready')).toBe('done');
  });

  it('clears file on clearFile()', () => {
    const file = new File([''], 'a.txt');
    component.selectedFile.set(file);
    const mockEvent = { stopPropagation: () => {} } as Event;
    component.clearFile(mockEvent);
    expect(component.selectedFile()).toBeNull();
  });
});
