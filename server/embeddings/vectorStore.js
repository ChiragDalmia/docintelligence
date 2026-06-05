const DIMS = 128;

function charCode(ch) {
  return ch.charCodeAt(0);
}

function deterministicHash(str, seed) {
  let h = seed ^ 0xdeadbeef;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ charCode(str[i]), 0x9e3779b9);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function generateEmbedding(text) {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  const words = normalized.split(' ').filter(Boolean);
  const vec = new Float32Array(DIMS);

  for (let d = 0; d < DIMS; d++) {
    let value = 0;
    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      const hash = deterministicHash(word, d * 31 + 7);
      const posHash = deterministicHash(word, (w % 16) * 17 + d);
      const sign = (hash & 1) ? 1 : -1;
      value += sign * (1.0 / Math.sqrt(words.length + 1));
      value += ((posHash % 100) / 1000.0) * sign;
    }
    const bigramStart = Math.max(0, words.length - 1);
    for (let b = 0; b < bigramStart && b < 32; b++) {
      const bigram = words[b] + '_' + words[b + 1];
      const bHash = deterministicHash(bigram, d * 53 + 13);
      const bSign = (bHash & 1) ? 1 : -1;
      value += bSign * (0.5 / Math.sqrt(words.length + 1));
    }
    vec[d] = value;
  }

  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
  for (let d = 0; d < DIMS; d++) {
    vec[d] /= magnitude;
  }

  return Array.from(vec);
}

function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

class VectorStore {
  constructor() {
    this._index = new Map();
  }

  add(id, text, metadata = {}) {
    const embedding = generateEmbedding(text);
    this._index.set(id, { id, embedding, metadata });
    return embedding;
  }

  remove(id) {
    return this._index.delete(id);
  }

  query(queryText, topK = 5) {
    const queryEmbedding = generateEmbedding(queryText);
    const results = [];

    for (const [id, entry] of this._index) {
      const score = cosineSimilarity(queryEmbedding, entry.embedding);
      results.push({ id, score, metadata: entry.metadata });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  queryByEmbedding(embedding, topK = 5) {
    const results = [];
    for (const [id, entry] of this._index) {
      const score = cosineSimilarity(embedding, entry.embedding);
      results.push({ id, score, metadata: entry.metadata });
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  size() {
    return this._index.size;
  }

  has(id) {
    return this._index.has(id);
  }

  getEmbedding(id) {
    return this._index.get(id)?.embedding || null;
  }

  clear() {
    this._index.clear();
  }
}

const vectorStore = new VectorStore();

module.exports = { VectorStore, vectorStore, generateEmbedding, cosineSimilarity };
