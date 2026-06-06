class AnalyticsStore {
  constructor() { this._kw = new Map(); this._s = 0; this._c = 0; }

  trackKeyword(q) {
    this._s++;
    q.toLowerCase().split(/\s+/).filter(w => w.length > 2)
      .forEach(w => this._kw.set(w, (this._kw.get(w) || 0) + 1));
  }

  trackChat() { this._c++; }

  getTopKeywords(n = 10) {
    return [...this._kw.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
      .map(([word, count]) => ({ word, count }));
  }

  getSearchCount() { return this._s; }
  getChatCount() { return this._c; }
}

const analyticsStore = new AnalyticsStore();
module.exports = { analyticsStore, AnalyticsStore };
