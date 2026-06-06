const DIMS = 128;

function deterministicHash(str, seed) {
  let h = seed ^ 0xdeadbeef;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 0x9e3779b9);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function generateEmbedding(text) {
  const words = text.toLowerCase().replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const vec = new Float32Array(DIMS);
  for (let d = 0; d < DIMS; d++) {
    let v = 0;
    for (let w = 0; w < words.length; w++) {
      const hash = deterministicHash(words[w], d * 31 + 7);
      const sign = (hash & 1) ? 1 : -1;
      v += sign * (1.0 / Math.sqrt(words.length + 1));
      v += ((deterministicHash(words[w], (w % 16) * 17 + d) % 100) / 1000.0) * sign;
    }
    for (let b = 0; b < Math.max(0, words.length - 1) && b < 32; b++) {
      const bHash = deterministicHash(words[b] + '_' + words[b + 1], d * 53 + 13);
      v += ((bHash & 1) ? 1 : -1) * (0.5 / Math.sqrt(words.length + 1));
    }
    vec[d] = v;
  }
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  for (let d = 0; d < DIMS; d++) vec[d] /= mag;
  return Array.from(vec);
}

function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  let dot = 0, mA = 0, mB = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; mA += a[i] * a[i]; mB += b[i] * b[i]; }
  const denom = Math.sqrt(mA) * Math.sqrt(mB);
  return denom === 0 ? 0 : dot / denom;
}

class VectorStore {
  constructor() { this._i = new Map(); }

  add(id, text, meta = {}) {
    const embedding = generateEmbedding(text);
    this._i.set(id, { id, embedding, metadata: meta });
    return embedding;
  }

  remove(id) { return this._i.delete(id); }

  _rank(emb, topK) {
    return [...this._i.values()]
      .map(e => ({ id: e.id, score: cosineSimilarity(emb, e.embedding), metadata: e.metadata }))
      .sort((a, b) => b.score - a.score).slice(0, topK);
  }

  query(queryText, topK = 5) { return this._rank(generateEmbedding(queryText), topK); }
  queryByEmbedding(embedding, topK = 5) { return this._rank(embedding, topK); }
  size() { return this._i.size; }
  has(id) { return this._i.has(id); }
  getEmbedding(id) { return this._i.get(id)?.embedding || null; }
  clear() { this._i.clear(); }
}

const vectorStore = new VectorStore();
module.exports = { VectorStore, vectorStore, generateEmbedding, cosineSimilarity };
