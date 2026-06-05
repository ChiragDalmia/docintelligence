# DocIntelligence

An AI-powered document processing platform that extracts structured data from PDFs and text files, runs semantic search across your document library, and lets you have a real conversation with any document you've uploaded.

Built this as a way to explore how LLMs can replace the painful manual work of reading through contracts, invoices, and reports looking for specific information.

![stack](https://img.shields.io/badge/Angular-17-dd0031?style=flat-square&logo=angular) ![stack](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=nodedotjs) ![stack](https://img.shields.io/badge/Groq-LLaMA3-f55036?style=flat-square) ![stack](https://img.shields.io/badge/Docker-ready-2496ed?style=flat-square&logo=docker)

---

## What it does

Upload a PDF or TXT file and the pipeline kicks off automatically:

1. **Parse** — extracts raw text from the file
2. **Extract** — an LLM pulls out structured fields: name, date, amount, entities, and any other key-value pairs it finds
3. **Embed** — generates a 128-dimensional vector for the document and indexes it for semantic search
4. **Ready** — the document is searchable and chattable

From there you can search across every document you've uploaded using natural language, or open the chat interface and ask specific questions about a single document. The viewer shows the original content with all extracted fields highlighted inline, and clicking any field scrolls to where it appears in the text.

---

## Screenshots

> Upload → live pipeline stepper

```
Upload ──✓──▶ Parse ──✓──▶ Extract ──●──▶ Embed ──▶ Index ──▶ Ready
```

> Document Viewer (split-pane)

```
┌─────────────────┬──────────────────────────────────────────┐
│  Documents      │  contract-2024.pdf              [ready]  │
│  ─────────────  │  ──────────────────────────────────────  │
│  > invoice.pdf  │  Extracted Fields                        │
│    report.txt   │  Name    Acme Corporation                │
│    contract...  │  Date    2024-03-15                      │
│                 │  Amount  $12,500.00                      │
│                 │  ──────────────────────────────────────  │
│                 │  ...this agreement is between            │
│                 │  ████Acme Corporation████ and John       │
│                 │  Doe, effective ████2024-03-15████...    │
└─────────────────┴──────────────────────────────────────────┘
```

---

## Tech Stack

| Area | What and why |
|------|-------------|
| Frontend | Angular 17 with standalone components and signals. No component library — all custom SCSS with a glassmorphism dark theme. OnPush change detection throughout. |
| Backend | Node.js + Express. Multer for uploads, pdf-parse for text extraction. |
| AI / Extraction | Groq API (`llama3-8b-8192`) — free, fast, and returns structured JSON reliably at temperature 0. Falls back to a regex extractor when no API key is set. |
| Semantic Search | Custom 128-dim vector store using deterministic character-level hashing and cosine similarity. No external binary dependencies — ships as plain JS. |
| Charts | Chart.js for the analytics dashboard (doughnut + bar). |
| Testing | Jest on the backend (73 tests, 82% coverage), Jasmine/Karma on the frontend. |
| Deploy | Docker + docker-compose locally. Render.com for the API, Vercel for the frontend. GitHub Actions for CI/CD. |

---

## Getting started

You'll need a free Groq API key from [console.groq.com](https://console.groq.com). It takes about 30 seconds — sign up, hit **Create API Key**, done. The app runs without it but uses the regex fallback instead of the LLM.

### Docker (easiest)

```bash
git clone https://github.com/your-username/docintelligence
cd docintelligence

cp .env.example .env
# open .env and paste your GROQ_API_KEY

docker-compose up --build
```

Frontend → [http://localhost:4200](http://localhost:4200)  
API → [http://localhost:3000/api/health](http://localhost:3000/api/health)

### Without Docker

```bash
# terminal 1 — backend
cd server
npm install
cp ../.env.example .env    # add your key
node index.js

# terminal 2 — frontend
cd frontend
npm install --legacy-peer-deps
npm start
```

---

## Environment variables

```bash
GROQ_API_KEY=gsk_...      # from console.groq.com — optional, enables LLM extraction
PORT=3000                  # backend port
MAX_FILE_SIZE_MB=10        # upload limit
```

---

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/documents/upload` | Upload a file (`multipart/form-data`, field name `file`) |
| `GET` | `/api/documents` | List all documents |
| `GET` | `/api/documents/:id` | Get a document with its extracted fields |
| `DELETE` | `/api/documents/:id` | Delete a document |
| `POST` | `/api/documents/:id/extract` | Re-run extraction on an existing document |
| `POST` | `/api/search` | Semantic search — body: `{ query, topK? }` |
| `POST` | `/api/chat` | Chat with a document — body: `{ documentId, messages[] }` |
| `GET` | `/api/analytics` | Dashboard metrics |
| `GET` | `/api/health` | Health check + Groq status |

---

## Running tests

```bash
# backend
cd server && npm test
# → 73 tests, ~82% line coverage

# frontend
cd frontend && npm test
# → Karma in ChromeHeadless
```

---

## Project structure

```
docintelligence/
├── server/
│   ├── embeddings/
│   │   └── vectorStore.js      # cosine similarity search, no external deps
│   ├── services/
│   │   ├── extractorService.js # Groq extraction + regex fallback
│   │   ├── documentStore.js    # in-memory store with JSON persistence
│   │   ├── parserService.js    # pdf-parse + txt reader
│   │   └── analyticsStore.js   # keyword tracking
│   ├── controllers/            # route handlers
│   ├── middleware/             # multer upload, error handler
│   ├── routes/                 # express routers
│   └── __tests__/             # jest test suites
│
└── frontend/src/app/
    ├── features/
    │   ├── upload/             # drag-drop + pipeline stepper
    │   ├── documents/          # document grid
    │   ├── viewer/             # split-pane + field highlights
    │   ├── chat/               # document Q&A
    │   └── dashboard/          # analytics + charts
    ├── layouts/                # sidebar + topbar
    ├── services/               # api.service + document-state.service
    └── styles/                 # scss design system
```

---

## How the vector store works

There's no FAISS or external binary. Each document gets a 128-element float vector generated by running a deterministic hash function over its words and bigrams — same input always produces the same embedding. Search computes cosine similarity between the query vector and every stored document vector and returns the top-K.

It's not as sophisticated as a trained embedding model, but it's dependency-free, fast, and good enough for keyword-proximity search on a personal document library. Swapping in OpenAI or Cohere embeddings would be a one-line change in `vectorStore.js`.

---

## Notes

- Documents persist across restarts via `server/uploads/store.json` — written on `SIGTERM`/`SIGINT`
- The mock extractor (no API key) achieves ~70% accuracy on well-structured documents; Groq hits ~95–100% on clean invoices and contracts
- All Angular components use `ChangeDetectionStrategy.OnPush` — no unnecessary re-renders
- File size limit is 10 MB by default, configurable via `MAX_FILE_SIZE_MB`

---

## License

MIT
