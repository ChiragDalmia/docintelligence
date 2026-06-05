const fs = require('fs');
const path = require('path');

async function parseFile(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.txt') {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.trim();
  }

  if (ext === '.pdf') {
    const pdfParse = require('pdf-parse');
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text.trim();
  }

  throw Object.assign(new Error(`Unsupported file extension: ${ext}`), { status: 400 });
}

module.exports = { parseFile };
