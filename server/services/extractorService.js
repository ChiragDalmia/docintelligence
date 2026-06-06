const Groq = process.env.GROQ_API_KEY ? require('groq-sdk') : null;

const EXTRACTION_PROMPT = `You are a precise document analysis AI. Extract the following fields from the document text and return ONLY valid JSON. Do not include markdown code blocks or explanations.

Fields to extract:
- name: The primary entity name (person, company, or document title)
- date: Any relevant date found (ISO 8601 format preferred)
- amount: Any monetary amount with currency symbol
- entities: Array of up to 10 named entities (people, companies, places, organizations)
- customFields: Object of any other important key-value pairs found

Return format (strict JSON):
{
  "name": "...",
  "date": "...",
  "amount": "...",
  "entities": [],
  "customFields": {}
}

Document text:
`;

function extractWithMock(content) {
  const text = content.slice(0, 6000);
  let name = null;
  for (const p of [
    /(?:name|from|to|client|company|issued to)[:\s]+([A-Z][a-zA-Z\s&.,]+?)(?:\n|,|$)/i,
    /^([A-Z][a-zA-Z\s]+(?:Inc|LLC|Ltd|Corp|Co)\.?)$/m
  ]) { const m = text.match(p); if (m) { name = m[1].trim(); break; } }

  let date = null;
  for (const p of [
    /(\d{4}-\d{2}-\d{2})/,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i
  ]) { const m = text.match(p); if (m) { date = m[0].trim(); break; } }

  const amountMatch = text.match(/[\$€£¥][\s]?\d{1,3}(?:[,.\d]*\d)?(?:\.\d{2})?/);
  const stopWords = new Set(['The', 'This', 'That', 'With', 'From', 'Into', 'Upon', 'Also']);
  const entitySet = new Set();
  let em;
  const ep = /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\b/g;
  while ((em = ep.exec(text)) !== null && entitySet.size < 10) {
    if (em[1].length > 2 && !stopWords.has(em[1])) entitySet.add(em[1].trim());
  }

  const customFields = {};
  const invM = text.match(/invoice\s*(?:no|number|#)[:\s]*([A-Z0-9-]+)/i);
  if (invM) customFields.invoiceNumber = invM[1];
  const emailM = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailM) customFields.email = emailM[0];
  const phoneM = text.match(/(?:\+?\d[\d\s\-().]{7,}\d)/);
  if (phoneM) customFields.phone = phoneM[0].trim();

  return { name, date, amount: amountMatch ? amountMatch[0].trim() : null, entities: [...entitySet], customFields };
}

async function extractWithGroq(content) {
  const raw = (await new Groq({ apiKey: process.env.GROQ_API_KEY }).chat.completions.create({
    model: 'llama3-8b-8192',
    messages: [{ role: 'user', content: EXTRACTION_PROMPT + content.slice(0, 4000) }],
    temperature: 0, max_tokens: 512
  })).choices[0]?.message?.content || '{}';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in Groq response');
  const p = JSON.parse(jsonMatch[0]);
  return {
    name: p.name || null, date: p.date || null, amount: p.amount || null,
    entities: Array.isArray(p.entities) ? p.entities : [],
    customFields: p.customFields && typeof p.customFields === 'object' ? p.customFields : {}
  };
}

async function extractFields(content) {
  if (process.env.GROQ_API_KEY) {
    try { return { fields: await extractWithGroq(content), extractionConfidence: 1.0 }; }
    catch (e) { console.warn('Groq extraction failed, falling back to mock:', e.message); }
  }
  return { fields: extractWithMock(content), extractionConfidence: 0.7 };
}

module.exports = { extractFields, extractWithMock };
