require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { errorHandler } = require('./middleware/errorHandler');
const documentRoutes = require('./routes/documents');
const searchRoutes = require('./routes/search');
const chatRoutes = require('./routes/chat');
const analyticsRoutes = require('./routes/analytics');
const { documentStore } = require('./services/documentStore');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/documents', documentRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    groqEnabled: !!process.env.GROQ_API_KEY,
    documentsLoaded: documentStore.size(),
    timestamp: Date.now()
  });
});

app.use(errorHandler);

const PERSIST_PATH = path.join(__dirname, 'uploads', 'store.json');

function persistStore() {
  try {
    const data = documentStore.serialize();
    fs.mkdirSync(path.dirname(PERSIST_PATH), { recursive: true });
    fs.writeFileSync(PERSIST_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to persist store:', err.message);
  }
}

function loadStore() {
  try {
    if (fs.existsSync(PERSIST_PATH)) {
      const raw = fs.readFileSync(PERSIST_PATH, 'utf-8');
      documentStore.deserialize(JSON.parse(raw));
      console.log(`Loaded ${documentStore.size()} documents from disk`);
    }
  } catch (err) {
    console.error('Failed to load persisted store:', err.message);
  }
}

loadStore();

process.on('SIGINT', () => { persistStore(); process.exit(0); });
process.on('SIGTERM', () => { persistStore(); process.exit(0); });
process.on('exit', persistStore);

const server = app.listen(PORT, () => {
  console.log(`DocIntelligence server running on port ${PORT}`);
  console.log(`Groq API: ${process.env.GROQ_API_KEY ? 'enabled' : 'mock fallback active'}`);
});

module.exports = { app, server };
