const { AnalyticsStore } = require('../services/analyticsStore');

describe('AnalyticsStore', () => {
  let store;
  beforeEach(() => { store = new AnalyticsStore(); });

  it('starts with zero counts', () => {
    expect(store.getSearchCount()).toBe(0);
    expect(store.getChatCount()).toBe(0);
    expect(store.getTopKeywords()).toEqual([]);
  });

  it('trackKeyword increments searchCount', () => {
    store.trackKeyword('invoice payment');
    expect(store.getSearchCount()).toBe(1);
  });

  it('trackKeyword extracts individual words', () => {
    store.trackKeyword('invoice payment total');
    const kw = store.getTopKeywords(10);
    const words = kw.map(k => k.word);
    expect(words).toContain('invoice');
    expect(words).toContain('payment');
    expect(words).toContain('total');
  });

  it('getTopKeywords returns sorted by count descending', () => {
    store.trackKeyword('invoice invoice invoice');
    store.trackKeyword('payment payment');
    store.trackKeyword('date');
    const kw = store.getTopKeywords(3);
    expect(kw[0].word).toBe('invoice');
    expect(kw[0].count).toBe(3);
  });

  it('getTopKeywords respects limit', () => {
    for (let i = 0; i < 20; i++) store.trackKeyword(`word${i} another${i}`);
    expect(store.getTopKeywords(5)).toHaveLength(5);
  });

  it('trackChat increments chatCount', () => {
    store.trackChat();
    store.trackChat();
    expect(store.getChatCount()).toBe(2);
  });

  it('filters short words (length <= 2)', () => {
    store.trackKeyword('an of is it');
    const kw = store.getTopKeywords(10);
    for (const k of kw) {
      expect(k.word.length).toBeGreaterThan(2);
    }
  });
});
