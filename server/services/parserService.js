const fs = require('fs'), path = require('path');

async function parseFile(fp) {
  const ext = path.extname(fp).toLowerCase();
  if (ext === '.txt') return fs.readFileSync(fp, 'utf-8').trim();
  if (ext === '.pdf') return (await require('pdf-parse')(fs.readFileSync(fp))).text.trim();
  throw Object.assign(new Error(`Unsupported file extension: ${ext}`), { status: 400 });
}

module.exports = { parseFile };
