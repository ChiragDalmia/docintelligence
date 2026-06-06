require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { documentStore } = require('./services/documentStore');
const { parseFile } = require('./services/parserService');
const { extractFields } = require('./services/extractorService');
const { vectorStore } = require('./embeddings/vectorStore');
const { analyticsStore } = require('./services/analyticsStore');

const Groq = process.env.GROQ_API_KEY ? require('groq-sdk') : null;
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_URL || '*', methods: ['GET','POST','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_r, _f, cb) => cb(null, UPLOAD_DIR),
    filename: (_r, f, cb) => cb(null, `${Date.now()}-${f.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`)
  }),
  fileFilter: (_r, f, cb) => {
    const ext = path.extname(f.originalname).toLowerCase();
    ['.pdf', '.txt'].includes(ext)
      ? cb(null, true)
      : cb(Object.assign(new Error(`Unsupported file type: ${ext}. Only PDF and TXT are allowed.`), { status: 400 }), false);
  },
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10) * 1024 * 1024 }
});

const aw = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const e404 = msg => Object.assign(new Error(msg), { status: 404 });
const safeDoc = ({ filePath, embeddings, ...d }) => d;

function multerMw(req, res, next) {
  upload.single('file')(req, res, err => { if (err) { if (!err.status) err.status = 400; return next(err); } next(); });
}

async function processDocument(id, filePath) {
  documentStore.update(id, { processingStatus: 'parsing' });
  const content = await parseFile(filePath);
  documentStore.update(id, { content, processingStatus: 'extracting' });
  const { fields, extractionConfidence } = await extractFields(content);
  documentStore.update(id, { extractedFields: fields, extractionConfidence, processingStatus: 'embedding' });
  const embeddings = vectorStore.add(id, content, { name: documentStore.get(id).name });
  documentStore.update(id, { embeddings, processingStatus: 'ready' });
}

// Documents
app.post('/api/documents/upload', multerMw, aw(async (req, res, next) => {
  if (!req.file) return next(Object.assign(new Error('No file uploaded'), { status: 400 }));
  const id = uuidv4();
  const ext = path.extname(req.file.originalname).toLowerCase().slice(1);
  documentStore.add({ id, name: req.file.originalname, type: ext === 'pdf' ? 'pdf' : 'txt', content: '',
    extractedFields: {}, embeddings: [], createdAt: Date.now(), processingStatus: 'uploading',
    extractionConfidence: 0, filePath: req.file.path });
  res.status(202).json({ id, status: 'uploading' });
  setImmediate(() => processDocument(id, req.file.path).catch(e => {
    console.error(`Processing failed for ${id}:`, e.message);
    documentStore.update(id, { processingStatus: 'error' });
  }));
}));

app.get('/api/documents', (_req, res) => res.json(
  documentStore.getAll().map(d => ({ id: d.id, name: d.name, type: d.type,
    processingStatus: d.processingStatus, extractionConfidence: d.extractionConfidence,
    createdAt: d.createdAt, extractedFields: d.extractedFields }))
));

app.get('/api/documents/:id', aw((req, res, next) => {
  const doc = documentStore.get(req.params.id);
  if (!doc) return next(e404('Document not found'));
  res.json(safeDoc(doc));
}));

app.delete('/api/documents/:id', aw((req, res, next) => {
  const doc = documentStore.get(req.params.id);
  if (!doc) return next(e404('Document not found'));
  if (doc.filePath && fs.existsSync(doc.filePath)) try { fs.unlinkSync(doc.filePath); } catch (_) {}
  vectorStore.remove(req.params.id);
  documentStore.remove(req.params.id);
  res.json({ deleted: true });
}));

app.post('/api/documents/:id/extract', aw(async (req, res, next) => {
  const doc = documentStore.get(req.params.id);
  if (!doc) return next(e404('Document not found'));
  if (!doc.content) return next(Object.assign(new Error('Document has no content to extract from'), { status: 422 }));
  const { fields, extractionConfidence } = await extractFields(doc.content);
  res.json(safeDoc(documentStore.update(req.params.id, { extractedFields: fields, extractionConfidence })));
}));

// Search
app.post('/api/search', aw((req, res, next) => {
  const { query, topK = 5 } = req.body;
  if (typeof query !== 'string' || !query.trim()) return next(Object.assign(new Error('Query string is required'), { status: 400 }));
  analyticsStore.trackKeyword(query.trim());
  const results = vectorStore.query(query.trim(), Math.min(topK, 20))
    .filter(h => h.score > 0.05)
    .map(h => { const doc = documentStore.get(h.id); return doc ? { document: safeDoc(doc), score: parseFloat(h.score.toFixed(4)) } : null; })
    .filter(Boolean);
  res.json({ query: query.trim(), results });
}));

// Chat
const CHAT_PROMPT = `You are DocIntelligence, a precise AI assistant for analyzing documents.
Answer questions based ONLY on the provided document context.
Be concise and factual. If the answer is not in the document, say so clearly.`;

function buildCtx(doc) {
  const f = doc.extractedFields || {};
  let ctx = `Document: ${doc.name}\n`;
  if (f.name) ctx += `Entity: ${f.name}\n`;
  if (f.date) ctx += `Date: ${f.date}\n`;
  if (f.amount) ctx += `Amount: ${f.amount}\n`;
  if (f.entities?.length) ctx += `Key entities: ${f.entities.join(', ')}\n`;
  return ctx + `\n--- Document Content ---\n${doc.content.slice(0, 6000)}`;
}

function mockAnswer(q, doc) {
  const ql = q.toLowerCase(), f = doc.extractedFields || {};
  if (ql.includes('name') && f.name) return `The name extracted from the document is: ${f.name}`;
  if ((ql.includes('date') || ql.includes('when')) && f.date) return `The date found in the document is: ${f.date}`;
  if ((ql.includes('amount') || ql.includes('cost') || ql.includes('price') || ql.includes('total')) && f.amount)
    return `The amount found in the document is: ${f.amount}`;
  if (ql.includes('entit') && f.entities?.length) return `Key entities found: ${f.entities.join(', ')}`;
  const idx = doc.content.toLowerCase().indexOf(ql.split(' ').find(w => w.length > 4) || ql);
  if (idx > -1) return `Based on the document content: "...${doc.content.slice(Math.max(0, idx - 100), idx + 300).trim()}..."`;
  return `I found the document "${doc.name}" but could not locate a specific answer to your question in the content. Please try rephrasing or ask about specific fields like name, date, or amount.`;
}

app.post('/api/chat', aw(async (req, res, next) => {
  const { documentId, messages } = req.body;
  if (!documentId || !Array.isArray(messages) || !messages.length)
    return next(Object.assign(new Error('documentId and messages array are required'), { status: 400 }));
  const doc = documentStore.get(documentId);
  if (!doc) return next(e404('Document not found'));
  if (doc.processingStatus !== 'ready')
    return next(Object.assign(new Error(`Document is not ready for chat (status: ${doc.processingStatus})`), { status: 422 }));
  if (process.env.GROQ_API_KEY && Groq) {
    try {
      const completion = await new Groq({ apiKey: process.env.GROQ_API_KEY }).chat.completions.create({
        model: 'llama3-8b-8192',
        messages: [{ role: 'system', content: CHAT_PROMPT + '\n\n' + buildCtx(doc) },
          ...messages.slice(-10).map(m => ({ role: m.role, content: m.content }))],
        temperature: 0.3, max_tokens: 512
      });
      return res.json({ role: 'assistant', content: completion.choices[0]?.message?.content || 'I could not generate a response.', timestamp: Date.now() });
    } catch (e) { console.warn('Groq chat failed, using mock:', e.message); }
  }
  res.json({ role: 'assistant', content: mockAnswer(messages.filter(m => m.role === 'user').pop()?.content || '', doc), timestamp: Date.now() });
}));

// Analytics
app.get('/api/analytics', (_req, res) => {
  const docs = documentStore.getAll();
  const ready = docs.filter(d => d.processingStatus === 'ready');
  const avgConf = ready.length ? ready.reduce((s, d) => s + (d.extractionConfidence || 0), 0) / ready.length : 0;
  res.json({
    totalDocuments: docs.length,
    averageExtractionAccuracy: parseFloat((avgConf * 100).toFixed(1)),
    typeDistribution: docs.reduce((a, d) => { a[d.type] = (a[d.type] || 0) + 1; return a; }, {}),
    statusDistribution: docs.reduce((a, d) => { a[d.processingStatus] = (a[d.processingStatus] || 0) + 1; return a; }, {}),
    topKeywords: analyticsStore.getTopKeywords(10),
    totalSearches: analyticsStore.getSearchCount(),
    totalChats: analyticsStore.getChatCount()
  });
});

// Health
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', groqEnabled: !!process.env.GROQ_API_KEY, documentsLoaded: documentStore.size(), timestamp: Date.now() })
);

// Error handler
app.use((err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[${new Date().toISOString()}] ${status} ${req.method} ${req.path} — ${err.message}`);
    if (status === 500) console.error(err.stack);
  }
  res.status(status).json({ error: err.message || 'Internal Server Error', ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) });
});

// Persistence
const PERSIST_PATH = path.join(__dirname, 'uploads', 'store.json');
function persistStore() {
  try {
    fs.mkdirSync(path.dirname(PERSIST_PATH), { recursive: true });
    fs.writeFileSync(PERSIST_PATH, JSON.stringify(documentStore.serialize(), null, 2));
  } catch (e) { console.error('Failed to persist store:', e.message); }
}
try {
  if (fs.existsSync(PERSIST_PATH)) {
    documentStore.deserialize(JSON.parse(fs.readFileSync(PERSIST_PATH, 'utf-8')));
    console.log(`Loaded ${documentStore.size()} documents from disk`);
  }
} catch (e) { console.error('Failed to load persisted store:', e.message); }

process.on('SIGINT', () => { persistStore(); process.exit(0); });
process.on('SIGTERM', () => { persistStore(); process.exit(0); });
process.on('exit', persistStore);

const server = app.listen(PORT, () => {
  console.log(`DocIntelligence server running on port ${PORT}`);
  console.log(`Groq API: ${process.env.GROQ_API_KEY ? 'enabled' : 'mock fallback active'}`);
});

module.exports = { app, server };
