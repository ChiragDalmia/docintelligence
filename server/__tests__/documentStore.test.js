const { DocumentStore } = require('../services/documentStore');

describe('DocumentStore', () => {
  let store;

  const makeDoc = (id = 'doc1') => ({
    id,
    name: `${id}.pdf`,
    type: 'pdf',
    content: 'hello',
    extractedFields: {},
    embeddings: [],
    createdAt: Date.now(),
    processingStatus: 'ready',
    extractionConfidence: 1.0
  });

  beforeEach(() => { store = new DocumentStore(); });

  it('starts empty', () => {
    expect(store.size()).toBe(0);
    expect(store.getAll()).toEqual([]);
  });

  it('add() inserts and returns the document', () => {
    const doc = makeDoc();
    const result = store.add(doc);
    expect(result).toEqual(doc);
    expect(store.size()).toBe(1);
  });

  it('get() retrieves by id', () => {
    store.add(makeDoc('x'));
    const found = store.get('x');
    expect(found).toBeTruthy();
    expect(found.id).toBe('x');
  });

  it('get() returns null for missing id', () => {
    expect(store.get('nope')).toBeNull();
  });

  it('getAll() returns all documents', () => {
    store.add(makeDoc('a'));
    store.add(makeDoc('b'));
    expect(store.getAll()).toHaveLength(2);
  });

  it('update() merges patch into document', () => {
    store.add(makeDoc('u'));
    const updated = store.update('u', { processingStatus: 'error', content: 'updated' });
    expect(updated.processingStatus).toBe('error');
    expect(updated.content).toBe('updated');
    expect(updated.id).toBe('u');
  });

  it('update() returns null for missing id', () => {
    expect(store.update('missing', { content: 'x' })).toBeNull();
  });

  it('remove() deletes and returns true', () => {
    store.add(makeDoc('r'));
    expect(store.remove('r')).toBe(true);
    expect(store.get('r')).toBeNull();
  });

  it('remove() returns false for unknown id', () => {
    expect(store.remove('ghost')).toBe(false);
  });

  it('serialize() returns array of all documents', () => {
    store.add(makeDoc('s1'));
    store.add(makeDoc('s2'));
    const data = store.serialize();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
  });

  it('deserialize() restores documents from array', () => {
    const docs = [makeDoc('d1'), makeDoc('d2')];
    store.deserialize(docs);
    expect(store.size()).toBe(2);
    expect(store.get('d1')).toBeTruthy();
    expect(store.get('d2')).toBeTruthy();
  });

  it('deserialize() clears existing documents first', () => {
    store.add(makeDoc('old'));
    store.deserialize([makeDoc('new1')]);
    expect(store.get('old')).toBeNull();
    expect(store.get('new1')).toBeTruthy();
  });
});
