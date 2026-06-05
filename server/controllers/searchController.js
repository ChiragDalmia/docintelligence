const { vectorStore } = require('../embeddings/vectorStore');
const { documentStore } = require('../services/documentStore');
const { analyticsStore } = require('../services/analyticsStore');

async function search(req, res, next) {
  const { query, topK = 5 } = req.body;

  if (!query || typeof query !== 'string' || !query.trim()) {
    const err = new Error('Query string is required');
    err.status = 400;
    return next(err);
  }

  analyticsStore.trackKeyword(query.trim());

  const hits = vectorStore.query(query.trim(), Math.min(topK, 20));
  const results = hits
    .filter(h => h.score > 0.05)
    .map(h => {
      const doc = documentStore.get(h.id);
      if (!doc) return null;
      const { filePath, embeddings, ...safe } = doc;
      return { document: safe, score: parseFloat(h.score.toFixed(4)) };
    })
    .filter(Boolean);

  res.json({ query: query.trim(), results });
}

module.exports = { search };
