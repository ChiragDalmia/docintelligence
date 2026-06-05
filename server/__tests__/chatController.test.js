const request = require('supertest');
const path = require('path');
const fs = require('fs');
const os = require('os');

process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
delete process.env.GROQ_API_KEY;

const { app, server } = require('../index');
const { documentStore } = require('../services/documentStore');
const { vectorStore } = require('../embeddings/vectorStore');

afterAll(done => { server.close(done); });

function seedReadyDoc(id = 'chat-doc-1') {
  const content = 'Invoice from Acme Corp dated 2024-01-15 for $750.00. Contact: billing@acme.com';
  documentStore.add({
    id,
    name: 'acme-invoice.pdf',
    type: 'pdf',
    content,
    extractedFields: {
      name: 'Acme Corp',
      date: '2024-01-15',
      amount: '$750.00',
      entities: ['Acme Corp'],
      customFields: {}
    },
    embeddings: vectorStore.add(id, content),
    createdAt: Date.now(),
    processingStatus: 'ready',
    extractionConfidence: 0.7
  });
  return id;
}

describe('POST /api/chat', () => {
  const id = seedReadyDoc();

  it('returns 400 when documentId is missing', async () => {
    const res = await request(app).post('/api/chat').send({
      messages: [{ role: 'user', content: 'hello' }]
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when messages is empty', async () => {
    const res = await request(app).post('/api/chat').send({ documentId: id, messages: [] });
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown documentId', async () => {
    const res = await request(app).post('/api/chat').send({
      documentId: 'ghost',
      messages: [{ role: 'user', content: 'what?' }]
    });
    expect(res.status).toBe(404);
  });

  it('returns 422 for a non-ready document', async () => {
    documentStore.add({
      id: 'pending-doc',
      name: 'pending.txt',
      type: 'txt',
      content: '',
      extractedFields: {},
      embeddings: [],
      createdAt: Date.now(),
      processingStatus: 'parsing',
      extractionConfidence: 0
    });
    const res = await request(app).post('/api/chat').send({
      documentId: 'pending-doc',
      messages: [{ role: 'user', content: 'hello' }]
    });
    expect(res.status).toBe(422);
  });

  it('returns assistant reply for valid chat request (mock fallback)', async () => {
    const res = await request(app).post('/api/chat').send({
      documentId: id,
      messages: [{ role: 'user', content: 'What is the amount?', timestamp: Date.now() }]
    });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('assistant');
    expect(typeof res.body.content).toBe('string');
    expect(res.body.content.length).toBeGreaterThan(0);
    expect(typeof res.body.timestamp).toBe('number');
  });

  it('mock answer mentions the amount when asked about it', async () => {
    const res = await request(app).post('/api/chat').send({
      documentId: id,
      messages: [{ role: 'user', content: 'What is the total amount?', timestamp: Date.now() }]
    });
    expect(res.status).toBe(200);
    expect(res.body.content).toContain('$750.00');
  });

  it('mock answer mentions the date when asked about date', async () => {
    const res = await request(app).post('/api/chat').send({
      documentId: id,
      messages: [{ role: 'user', content: 'What is the date?', timestamp: Date.now() }]
    });
    expect(res.status).toBe(200);
    expect(res.body.content).toContain('2024-01-15');
  });

  it('mock answer mentions entity when asked about name', async () => {
    const res = await request(app).post('/api/chat').send({
      documentId: id,
      messages: [{ role: 'user', content: 'What is the company name?', timestamp: Date.now() }]
    });
    expect(res.status).toBe(200);
    expect(res.body.content).toContain('Acme Corp');
  });
});
