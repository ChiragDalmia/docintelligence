class AnalyticsStore {
  constructor() {
    this._keywords = new Map();
    this._searchCount = 0;
    this._chatCount = 0;
  }

  trackKeyword(query) {
    this._searchCount++;
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    for (const word of words) {
      this._keywords.set(word, (this._keywords.get(word) || 0) + 1);
    }
  }

  trackChat() {
    this._chatCount++;
  }

  getTopKeywords(n = 10) {
    return Array.from(this._keywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([word, count]) => ({ word, count }));
  }

  getSearchCount() { return this._searchCount; }
  getChatCount() { return this._chatCount; }
}

const analyticsStore = new AnalyticsStore();

module.exports = { analyticsStore, AnalyticsStore };
