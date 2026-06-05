const fs = require('fs');
const path = require('path');
const os = require('os');
const { parseFile } = require('../services/parserService');

describe('parserService', () => {
  it('parses TXT file content', async () => {
    const tmpPath = path.join(os.tmpdir(), `test-${Date.now()}.txt`);
    fs.writeFileSync(tmpPath, 'Hello from a text file.\nSecond line.');
    const content = await parseFile(tmpPath, 'text/plain');
    expect(content).toContain('Hello from a text file');
    expect(content).toContain('Second line');
    fs.unlinkSync(tmpPath);
  });

  it('trims whitespace from TXT content', async () => {
    const tmpPath = path.join(os.tmpdir(), `test-${Date.now()}.txt`);
    fs.writeFileSync(tmpPath, '   trimmed   ');
    const content = await parseFile(tmpPath, 'text/plain');
    expect(content).toBe('trimmed');
    fs.unlinkSync(tmpPath);
  });

  it('throws on unsupported extension', async () => {
    const tmpPath = path.join(os.tmpdir(), `test-${Date.now()}.xyz`);
    fs.writeFileSync(tmpPath, 'data');
    await expect(parseFile(tmpPath, 'application/octet-stream')).rejects.toThrow(/Unsupported/);
    fs.unlinkSync(tmpPath);
  });
});
