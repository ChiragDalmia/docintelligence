const { documentStore } = require('../services/documentStore');
const { analyticsStore } = require('../services/analyticsStore');

function getAnalytics(_req, res) {
  const docs = documentStore.getAll();
  const total = docs.length;

  const readyDocs = docs.filter(d => d.processingStatus === 'ready');
  const avgConfidence = readyDocs.length > 0
    ? readyDocs.reduce((sum, d) => sum + (d.extractionConfidence || 0), 0) / readyDocs.length
    : 0;

  const typeDistribution = docs.reduce((acc, d) => {
    acc[d.type] = (acc[d.type] || 0) + 1;
    return acc;
  }, {});

  const statusDistribution = docs.reduce((acc, d) => {
    acc[d.processingStatus] = (acc[d.processingStatus] || 0) + 1;
    return acc;
  }, {});

  res.json({
    totalDocuments: total,
    averageExtractionAccuracy: parseFloat((avgConfidence * 100).toFixed(1)),
    typeDistribution,
    statusDistribution,
    topKeywords: analyticsStore.getTopKeywords(10),
    totalSearches: analyticsStore.getSearchCount(),
    totalChats: analyticsStore.getChatCount()
  });
}

module.exports = { getAnalytics };
