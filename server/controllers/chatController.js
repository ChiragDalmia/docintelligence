const { documentStore } = require('../services/documentStore');

const Groq = process.env.GROQ_API_KEY ? require('groq-sdk') : null;

const SYSTEM_PROMPT = `You are DocIntelligence, a precise AI assistant for analyzing documents.
Answer questions based ONLY on the provided document context.
Be concise and factual. If the answer is not in the document, say so clearly.`;

function buildContext(doc) {
  const fields = doc.extractedFields || {};
  let ctx = `Document: ${doc.name}\n`;
  if (fields.name) ctx += `Entity: ${fields.name}\n`;
  if (fields.date) ctx += `Date: ${fields.date}\n`;
  if (fields.amount) ctx += `Amount: ${fields.amount}\n`;
  if (fields.entities?.length) ctx += `Key entities: ${fields.entities.join(', ')}\n`;
  ctx += `\n--- Document Content ---\n${doc.content.slice(0, 6000)}`;
  return ctx;
}

function mockAnswer(question, doc) {
  const q = question.toLowerCase();
  const fields = doc.extractedFields || {};
  if (q.includes('name') && fields.name) return `The name extracted from the document is: ${fields.name}`;
  if ((q.includes('date') || q.includes('when')) && fields.date) return `The date found in the document is: ${fields.date}`;
  if ((q.includes('amount') || q.includes('cost') || q.includes('price') || q.includes('total')) && fields.amount) {
    return `The amount found in the document is: ${fields.amount}`;
  }
  if (q.includes('entit') && fields.entities?.length) {
    return `Key entities found: ${fields.entities.join(', ')}`;
  }
  const lower = doc.content.toLowerCase();
  const idx = lower.indexOf(q.split(' ').find(w => w.length > 4) || q);
  if (idx > -1) {
    const excerpt = doc.content.slice(Math.max(0, idx - 100), idx + 300).trim();
    return `Based on the document content: "...${excerpt}..."`;
  }
  return `I found the document "${doc.name}" but could not locate a specific answer to your question in the content. Please try rephrasing or ask about specific fields like name, date, or amount.`;
}

async function chat(req, res, next) {
  const { documentId, messages } = req.body;

  if (!documentId || !Array.isArray(messages) || messages.length === 0) {
    const err = new Error('documentId and messages array are required');
    err.status = 400;
    return next(err);
  }

  const doc = documentStore.get(documentId);
  if (!doc) {
    const err = new Error('Document not found');
    err.status = 404;
    return next(err);
  }

  if (doc.processingStatus !== 'ready') {
    const err = new Error(`Document is not ready for chat (status: ${doc.processingStatus})`);
    err.status = 422;
    return next(err);
  }

  const context = buildContext(doc);
  const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';

  if (process.env.GROQ_API_KEY && Groq) {
    try {
      const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

      const groqMessages = [
        { role: 'system', content: SYSTEM_PROMPT + '\n\n' + context },
        ...messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
      ];

      const completion = await client.chat.completions.create({
        model: 'llama3-8b-8192',
        messages: groqMessages,
        temperature: 0.3,
        max_tokens: 512
      });

      const reply = completion.choices[0]?.message?.content || 'I could not generate a response.';
      return res.json({
        role: 'assistant',
        content: reply,
        timestamp: Date.now()
      });
    } catch (err) {
      console.warn('Groq chat failed, using mock:', err.message);
    }
  }

  const reply = mockAnswer(lastUserMessage, doc);
  res.json({ role: 'assistant', content: reply, timestamp: Date.now() });
}

module.exports = { chat };
