class DocumentStore {
  constructor() { this._d = new Map(); }
  add(doc) { this._d.set(doc.id, doc); return doc; }
  get(id) { return this._d.get(id) ?? null; }
  getAll() { return [...this._d.values()].sort((a, b) => b.createdAt - a.createdAt); }
  update(id, patch) {
    const doc = this._d.get(id);
    if (!doc) return null;
    const u = { ...doc, ...patch };
    this._d.set(id, u);
    return u;
  }
  remove(id) { return this._d.delete(id); }
  size() { return this._d.size; }
  serialize() { return [...this._d.values()]; }
  deserialize(docs) { this._d.clear(); docs.forEach(d => this._d.set(d.id, d)); }
}

const documentStore = new DocumentStore();
module.exports = { documentStore, DocumentStore };
