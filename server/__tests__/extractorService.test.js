const { extractWithMock, extractFields } = require('../services/extractorService');

describe('extractWithMock', () => {
  const invoiceText = `
    Invoice
    Invoice No: INV-2024-001
    Date: 2024-01-15
    Bill To: Acme Corporation
    Amount Due: $4,500.00
    Email: billing@acme.com
    Phone: +1-555-123-4567
    Services rendered for Q4 2023 consulting.
  `;

  it('extracts date from document', () => {
    const result = extractWithMock(invoiceText);
    expect(result.date).toBeTruthy();
    expect(result.date).toContain('2024');
  });

  it('extracts amount from document', () => {
    const result = extractWithMock(invoiceText);
    expect(result.amount).toBeTruthy();
    expect(result.amount).toContain('4,500');
  });

  it('returns entities array', () => {
    const result = extractWithMock(invoiceText);
    expect(Array.isArray(result.entities)).toBe(true);
  });

  it('extracts invoice number into customFields', () => {
    const result = extractWithMock(invoiceText);
    expect(result.customFields.invoiceNumber).toBe('INV-2024-001');
  });

  it('extracts email into customFields', () => {
    const result = extractWithMock(invoiceText);
    expect(result.customFields.email).toBe('billing@acme.com');
  });

  it('extracts phone into customFields', () => {
    const result = extractWithMock(invoiceText);
    expect(result.customFields.phone).toBeTruthy();
  });

  it('handles empty string gracefully', () => {
    const result = extractWithMock('');
    expect(result.name).toBeNull();
    expect(result.date).toBeNull();
    expect(result.amount).toBeNull();
    expect(result.entities).toEqual([]);
    expect(result.customFields).toBeDefined();
  });

  it('does not throw on random text', () => {
    expect(() => extractWithMock('random unstructured text without any patterns')).not.toThrow();
  });
});

describe('extractFields', () => {
  it('returns confidence 0.7 when no GROQ_API_KEY', async () => {
    const original = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;
    const { extractionConfidence } = await extractFields('some document content here with date 2024-01-01');
    expect(extractionConfidence).toBe(0.7);
    if (original) process.env.GROQ_API_KEY = original;
  });

  it('returns fields object with correct shape', async () => {
    const original = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;
    const { fields } = await extractFields('Invoice from Acme Corp dated 2024-03-10 for $1200.00');
    expect(fields).toHaveProperty('entities');
    expect(fields).toHaveProperty('customFields');
    expect(Array.isArray(fields.entities)).toBe(true);
    if (original) process.env.GROQ_API_KEY = original;
  });
});
