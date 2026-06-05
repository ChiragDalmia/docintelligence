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

async function extractWithGroq(content) {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const truncated = content.slice(0, 4000);

  const completion = await client.chat.completions.create({
    model: 'llama3-8b-8192',
    messages: [
      { role: 'user', content: EXTRACTION_PROMPT + truncated }
    ],
    temperature: 0,
    max_tokens: 512
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in Groq response');

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    name: parsed.name || null,
    date: parsed.date || null,
    amount: parsed.amount || null,
    entities: Array.isArray(parsed.entities) ? parsed.entities : [],
    customFields: typeof parsed.customFields === 'object' && parsed.customFields !== null
      ? parsed.customFields
      : {}
  };
}

function extractWithMock(content) {
  const text = content.slice(0, 6000);

  const namePatterns = [
    /(?:name|from|to|client|company|issued to)[:\s]+([A-Z][a-zA-Z\s&.,]+?)(?:\n|,|$)/i,
    /^([A-Z][a-zA-Z\s]+(?:Inc|LLC|Ltd|Corp|Co)\.?)$/m
  ];
  let name = null;
  for (const pattern of namePatterns) {
    const m = text.match(pattern);
    if (m) { name = m[1].trim(); break; }
  }

  const datePatterns = [
    /(\d{4}-\d{2}-\d{2})/,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i
  ];
  let date = null;
  for (const pattern of datePatterns) {
    const m = text.match(pattern);
    if (m) { date = m[0].trim(); break; }
  }

  const amountMatch = text.match(/[\$€£¥][\s]?\d{1,3}(?:[,.\d]*\d)?(?:\.\d{2})?/);
  const amount = amountMatch ? amountMatch[0].trim() : null;

  const entityPattern = /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\b/g;
  const stopWords = new Set(['The', 'This', 'That', 'With', 'From', 'Into', 'Upon', 'Also']);
  const entitySet = new Set();
  let em;
  while ((em = entityPattern.exec(text)) !== null && entitySet.size < 10) {
    const candidate = em[1].trim();
    if (candidate.length > 2 && !stopWords.has(candidate)) {
      entitySet.add(candidate);
    }
  }

  const customFields = {};
  const invoiceMatch = text.match(/invoice\s*(?:no|number|#)[:\s]*([A-Z0-9-]+)/i);
  if (invoiceMatch) customFields.invoiceNumber = invoiceMatch[1];

  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) customFields.email = emailMatch[0];

  const phoneMatch = text.match(/(?:\+?\d[\d\s\-().]{7,}\d)/);
  if (phoneMatch) customFields.phone = phoneMatch[0].trim();

  return {
    name: name || null,
    date: date || null,
    amount: amount || null,
    entities: Array.from(entitySet),
    customFields
  };
}

async function extractFields(content) {
  if (process.env.GROQ_API_KEY) {
    try {
      const fields = await extractWithGroq(content);
      return { fields, extractionConfidence: 1.0 };
    } catch (err) {
      console.warn('Groq extraction failed, falling back to mock:', err.message);
    }
  }
  const fields = extractWithMock(content);
  return { fields, extractionConfidence: 0.7 };
}

module.exports = { extractFields, extractWithMock, extractWithGroq };
