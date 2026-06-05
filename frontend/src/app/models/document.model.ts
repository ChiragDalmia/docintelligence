export type DocumentType = 'pdf' | 'txt';
export type ProcessingStatus = 'uploading' | 'parsing' | 'extracting' | 'embedding' | 'ready' | 'error';

export interface ExtractedFields {
  name?: string;
  date?: string;
  amount?: string;
  entities?: string[];
  customFields?: Record<string, string>;
}

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  content: string;
  extractedFields: ExtractedFields;
  embeddings: number[];
  createdAt: number;
  processingStatus: ProcessingStatus;
  extractionConfidence: number;
}

export interface SearchResult {
  document: Document;
  score: number;
}

export interface SearchQuery {
  query: string;
  results: SearchResult[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Analytics {
  totalDocuments: number;
  averageExtractionAccuracy: number;
  typeDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  topKeywords: Array<{ word: string; count: number }>;
  totalSearches: number;
  totalChats: number;
}

export const PIPELINE_STEPS: ProcessingStatus[] = [
  'uploading', 'parsing', 'extracting', 'embedding', 'ready'
];

export const STATUS_LABELS: Record<ProcessingStatus, string> = {
  uploading: 'Upload',
  parsing: 'Parse',
  extracting: 'Extract',
  embedding: 'Embed',
  ready: 'Ready',
  error: 'Error'
};
