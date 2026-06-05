const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { documentStore } = require('../services/documentStore');
const { parseFile } = require('../services/parserService');
const { extractFields } = require('../services/extractorService');
const { vectorStore } = require('../embeddings/vectorStore');

async function uploadDocument(req, res, next) {
  if (!req.file) {
    const err = new Error('No file uploaded');
    err.status = 400;
    return next(err);
  }

  const id = uuidv4();
  const ext = path.extname(req.file.originalname).toLowerCase().slice(1);
  const docType = ext === 'pdf' ? 'pdf' : 'txt';

  const doc = documentStore.add({
    id,
    name: req.file.originalname,
    type: docType,
    content: '',
    extractedFields: {},
    embeddings: [],
    createdAt: Date.now(),
    processingStatus: 'uploading',
    extractionConfidence: 0,
    filePath: req.file.path
  });

  res.status(202).json({ id, status: 'uploading' });

  setImmediate(() => processDocument(id, req.file.path, docType).catch(err => {
    console.error(`Processing failed for ${id}:`, err.message);
    documentStore.update(id, { processingStatus: 'error' });
  }));
}

async function processDocument(id, filePath, docType) {
  documentStore.update(id, { processingStatus: 'parsing' });

  const content = await parseFile(filePath, docType);
  documentStore.update(id, { content, processingStatus: 'extracting' });

  const { fields, extractionConfidence } = await extractFields(content);
  documentStore.update(id, {
    extractedFields: fields,
    extractionConfidence,
    processingStatus: 'embedding'
  });

  const embeddings = vectorStore.add(id, content, { name: documentStore.get(id).name });
  documentStore.update(id, {
    embeddings,
    processingStatus: 'ready'
  });
}

function listDocuments(_req, res) {
  const docs = documentStore.getAll().map(d => ({
    id: d.id,
    name: d.name,
    type: d.type,
    processingStatus: d.processingStatus,
    extractionConfidence: d.extractionConfidence,
    createdAt: d.createdAt,
    extractedFields: d.extractedFields
  }));
  res.json(docs);
}

function getDocument(req, res, next) {
  const doc = documentStore.get(req.params.id);
  if (!doc) {
    const err = new Error('Document not found');
    err.status = 404;
    return next(err);
  }
  const { filePath, embeddings, ...safe } = doc;
  res.json(safe);
}

function deleteDocument(req, res, next) {
  const doc = documentStore.get(req.params.id);
  if (!doc) {
    const err = new Error('Document not found');
    err.status = 404;
    return next(err);
  }

  if (doc.filePath && fs.existsSync(doc.filePath)) {
    try { fs.unlinkSync(doc.filePath); } catch (_) {}
  }
  vectorStore.remove(req.params.id);
  documentStore.remove(req.params.id);
  res.json({ deleted: true });
}

async function extractDocument(req, res, next) {
  const doc = documentStore.get(req.params.id);
  if (!doc) {
    const err = new Error('Document not found');
    err.status = 404;
    return next(err);
  }
  if (!doc.content) {
    const err = new Error('Document has no content to extract from');
    err.status = 422;
    return next(err);
  }

  const { fields, extractionConfidence } = await extractFields(doc.content);
  const updated = documentStore.update(req.params.id, { extractedFields: fields, extractionConfidence });
  const { filePath, embeddings, ...safe } = updated;
  res.json(safe);
}

module.exports = { uploadDocument, listDocuments, getDocument, deleteDocument, extractDocument };
