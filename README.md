# GrowEasy AI CSV Importer

An AI-powered CSV importer that ingests **any** CSV layout (Facebook Lead Ads,
Google Ads exports, real-estate CRM exports, sales reports, or manually built
spreadsheets) and intelligently maps it into the fixed GrowEasy CRM schema —
without hardcoding column names.

Built for the GrowEasy Software Developer assignment.

## How it works

1. **Upload** — user drags/drops or picks a `.csv` file.
2. **Preview** — the file is parsed client-side-triggered/server-parsed and shown
   in a scrollable, sticky-header table. No AI runs yet.
3. **Confirm** — user clicks "Confirm & Import", which sends the file to the backend.
4. **AI Extraction** — the backend chunks rows into batches and sends each batch to
   an LLM (Claude by default) with a schema-aware prompt that maps arbitrary
   column names/layouts onto GrowEasy's CRM fields, applies the allowed
   `crm_status` / `data_source` enums, and skips rows with neither an email nor
   a mobile number.
5. **Result** — the frontend shows imported vs. skipped records, with counts.

## Tech stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express
- **AI:** Anthropic Claude by default (swappable to OpenAI or Gemini via env var)

## Project structure

```
groweasy-csv-importer/
├── backend/
│   ├── src/
│   │   ├── index.js               # Express app entry point
│   │   ├── routes/upload.js       # /api/csv/preview and /api/csv/import
│   │   ├── services/
│   │   │   ├── csvParser.js       # Header-agnostic CSV parsing
│   │   │   ├── promptBuilder.js   # System + per-batch prompts
│   │   │   ├── aiExtractor.js     # Batching, concurrency, retries, validation
│   │   │   └── providers/         # anthropic.js / openai.js / gemini.js adapters
│   │   ├── middleware/errorHandler.js
│   │   └── config/constants.js    # CRM fields + allowed enum values
│   ├── tests/
│   └── Dockerfile
├── frontend/
│   ├── app/page.tsx                # Upload -> Preview -> Import -> Result flow
│   ├── components/                 # UploadZone, DataTable, SummaryCards, etc.
│   ├── lib/api.ts                  # Backend API client
│   ├── types/index.ts
│   └── Dockerfile
└── docker-compose.yml
```

## Local setup

### Prerequisites
- Node.js 18+
- An API key for at least one AI provider (Anthropic, OpenAI, or Gemini)

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY (or switch AI_PROVIDER and set the
# matching key for OpenAI / Gemini)
npm install
npm run dev      # starts on http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
# NEXT_PUBLIC_API_URL should point at the backend, e.g. http://localhost:4000
npm install
npm run dev       # starts on http://localhost:3000
```

Open `http://localhost:3000`, upload a CSV, preview it, confirm, and view results.

### Running with Docker

```bash
cp backend/.env.example .env   # then edit .env at the repo root with your API key
docker compose up --build
```

### Running backend tests

```bash
cd backend
npm test
```

## API

### `POST /api/csv/preview`
`multipart/form-data`, field `file`. Returns `{ headers, rows, totalRows }`.
Pure CSV parsing — no AI call.

### `POST /api/csv/import`
`multipart/form-data`, field `file` (or JSON `{ headers, rows }`).
Runs AI extraction in batches and returns:

```json
{
  "imported": [ { "created_at": "...", "name": "...", "...": "..." } ],
  "skipped": [ { "row": 4, "reason": "no email or mobile", "sourceData": { "...": "..." } } ],
  "totalImported": 12,
  "totalSkipped": 1
}
```

## Design decisions

- **Column-name agnostic mapping:** the AI is given the raw headers as context
  but instructed to map by *meaning*, not by literal name — this is what lets
  the same code path handle Facebook exports, Google Ads exports, and manually
  typed spreadsheets.
- **Enum enforcement happens twice:** once via the prompt instructions, and
  again in `sanitizeRecord()` on the backend, which blanks out any
  `crm_status`/`data_source` value the model returns that isn't in the allowed
  list — protecting against hallucinated values reaching the CRM.
- **Skip logic is enforced twice** for the same reason: the model is asked to
  flag rows with no email/mobile, and the backend independently re-checks the
  final `email` / `mobile_without_country_code` fields before deciding to skip,
  so a bad model response can't silently import an unusable lead.
- **Batching + bounded concurrency** (`AI_BATCH_SIZE`, `AI_MAX_CONCURRENCY`)
  keeps prompts small (better accuracy, avoids token limits) while still
  processing large files quickly.
- **Retry with backoff per batch:** if a batch's AI call fails or returns
  unparsable output, it's retried up to twice with exponential backoff before
  falling back to marking that batch's rows as skipped — so one bad batch
  doesn't fail the entire import.
- **Provider-agnostic AI layer:** `AI_PROVIDER` env var switches between
  Anthropic / OpenAI / Gemini without touching the extraction logic, satisfying
  the "any equivalent LLM" requirement.

## Bonus features implemented

- Drag & drop upload
- Loading states during preview parsing and AI processing
- Retry mechanism for failed AI batches (per-batch, exponential backoff)
- Dark mode
- Unit tests (CSV parsing + JSON-array extraction contract)
- Docker setup (backend, frontend, docker-compose)
- Sticky table headers + first-column, horizontal & vertical scrolling
- Truncated cells with hover tooltips for long values

## Deployment

- **Frontend:** deploy `frontend/` to Vercel. Set `NEXT_PUBLIC_API_URL` to the
  deployed backend URL.
- **Backend:** deploy `backend/` to Railway/Render. Set `ANTHROPIC_API_KEY`
  (or your chosen provider's key), `AI_PROVIDER`, and `FRONTEND_ORIGIN` (the
  deployed frontend URL, for CORS).

## Sample CRM fields reference

| Field | Description |
|---|---|
| created_at | Lead creation date |
| name | Lead name |
| email | Primary email |
| country_code | Country code |
| mobile_without_country_code | Mobile number |
| company | Company name |
| city / state / country | Location |
| lead_owner | Lead owner |
| crm_status | One of `GOOD_LEAD_FOLLOW_UP`, `DID_NOT_CONNECT`, `BAD_LEAD`, `SALE_DONE` |
| crm_note | Notes/remarks |
| data_source | One of `leads_on_demand`, `meridian_tower`, `eden_park`, `varah_swamy`, `sarjapur_plots` |
| possession_time | Property possession time |
| description | Additional description |
