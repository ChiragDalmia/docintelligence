const { VectorStore, generateEmbedding, cosineSimilarity } = require('../embeddings/vectorStore');

describe('generateEmbedding', () => {
  it('returns a 128-element array', () => {
    const emb = generateEmbedding('hello world');
    expect(emb).toHaveLength(128);
  });

  it('returns deterministic results for the same input', () => {
    const a = generateEmbedding('document about invoices');
    const b = generateEmbedding('document about invoices');
    expect(a).toEqual(b);
  });

  it('returns different embeddings for different inputs', () => {
    const a = generateEmbedding('cat');
    const b = generateEmbedding('invoice total amount');
    const diff = a.some((v, i) => v !== b[i]);
    expect(diff).toBe(true);
  });

  it('returns unit-length (normalized) vectors', () => {
    const emb = generateEmbedding('normalize this text');
    const magnitude = Math.sqrt(emb.reduce((s, v) => s + v * v, 0));
    expect(magnitude).toBeCloseTo(1.0, 5);
  });

  it('handles empty string without throwing', () => {
    expect(() => generateEmbedding('')).not.toThrow();
  });
});

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const v = [1, 0, 0, 1];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0);
  });

  it('returns 0 for orthogonal vectors', () => {
    const a = [1, 0, 0, 0];
    const b = [0, 1, 0, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0);
  });

  it('returns 0 for zero-magnitude vectors', () => {
    const a = [0, 0, 0, 0];
    const b = [1, 2, 3, 4];
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  it('returns 0 for mismatched lengths', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it('similarity of similar texts is higher than dissimilar', () => {
    const e1 = generateEmbedding('invoice payment total amount due');
    const e2 = generateEmbedding('total amount due invoice');
    const e3 = generateEmbedding('astronomy telescope stars galaxy');
    const sim12 = cosineSimilarity(e1, e2);
    const sim13 = cosineSimilarity(e1, e3);
    expect(sim12).toBeGreaterThan(sim13);
  });
});

describe('VectorStore', () => {
  let store;

  beforeEach(() => { store = new VectorStore(); });

  it('starts empty', () => { expect(store.size()).toBe(0); });

  it('adds documents and tracks size', () => {
    store.add('doc1', 'hello world');
    store.add('doc2', 'foo bar baz');
    expect(store.size()).toBe(2);
  });

  it('has() returns true after add', () => {
    store.add('x', 'some text');
    expect(store.has('x')).toBe(true);
    expect(store.has('y')).toBe(false);
  });

  it('remove() deletes and returns true', () => {
    store.add('doc1', 'text');
    expect(store.remove('doc1')).toBe(true);
    expect(store.has('doc1')).toBe(false);
    expect(store.size()).toBe(0);
  });

  it('remove() returns false for missing id', () => {
    expect(store.remove('nonexistent')).toBe(false);
  });

  it('query() returns results sorted by score descending', () => {
    store.add('invoice', 'invoice number total amount due payment');
    store.add('astronomy', 'stars telescope galaxy milky way universe');
    store.add('recipe', 'flour sugar butter bake oven temperature');
    const results = store.query('invoice payment amount', 3);
    expect(results[0].id).toBe('invoice');
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('query() respects topK limit', () => {
    for (let i = 0; i < 10; i++) store.add(`doc${i}`, `document ${i} content text`);
    const results = store.query('document content', 3);
    expect(results).toHaveLength(3);
  });

  it('query() returns empty array when store is empty', () => {
    const results = store.query('anything');
    expect(results).toEqual([]);
  });

  it('getEmbedding() returns stored embedding', () => {
    store.add('d1', 'sample text');
    const emb = store.getEmbedding('d1');
    expect(emb).toHaveLength(128);
  });

  it('getEmbedding() returns null for unknown id', () => {
    expect(store.getEmbedding('missing')).toBeNull();
  });

  it('clear() empties the store', () => {
    store.add('a', 'text');
    store.add('b', 'text');
    store.clear();
    expect(store.size()).toBe(0);
  });
});
