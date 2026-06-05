class DocumentStore {
  constructor() {
    this._docs = new Map();
  }

  add(doc) {
    this._docs.set(doc.id, doc);
    return doc;
  }

  get(id) {
    return this._docs.get(id) || null;
  }

  getAll() {
    return Array.from(this._docs.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  update(id, patch) {
    const doc = this._docs.get(id);
    if (!doc) return null;
    const updated = { ...doc, ...patch };
    this._docs.set(id, updated);
    return updated;
  }

  remove(id) {
    return this._docs.delete(id);
  }

  size() {
    return this._docs.size;
  }

  serialize() {
    return Array.from(this._docs.values());
  }

  deserialize(docs) {
    this._docs.clear();
    for (const doc of docs) {
      this._docs.set(doc.id, doc);
    }
  }
}

const documentStore = new DocumentStore();

module.exports = { documentStore, DocumentStore };
