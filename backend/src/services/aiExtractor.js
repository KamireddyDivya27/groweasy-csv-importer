const pLimit = require("p-limit");
const {
  CRM_FIELDS,
  ALLOWED_CRM_STATUS,
  ALLOWED_DATA_SOURCE,
} = require("../config/constants");
const { buildSystemPrompt, buildBatchUserMessage } = require("./promptBuilder");

const PROVIDERS = {
  anthropic: () => require("./providers/anthropic"),
  openai: () => require("./providers/openai"),
  gemini: () => require("./providers/gemini"),
};

function getProvider() {
  const name = (process.env.AI_PROVIDER || "anthropic").toLowerCase();
  const loader = PROVIDERS[name];
  if (!loader) throw new Error(`Unknown AI_PROVIDER "${name}"`);
  return loader();
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Strips markdown code fences if the model added them despite instructions. */
function stripFences(text) {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

/** Extracts the first top-level JSON array from a string, tolerating extra prose. */
function extractJsonArray(text) {
  const cleaned = stripFences(text);
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON array found in model output");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

/** Coerces and validates a single AI-returned record against the schema. */
function sanitizeRecord(raw, fallbackRow) {
  const record = {};
  for (const field of CRM_FIELDS) {
    const val = raw && raw[field] != null ? String(raw[field]) : "";
    record[field] = val.replace(/\r?\n/g, "\\n").trim();
  }

  if (record.crm_status && !ALLOWED_CRM_STATUS.includes(record.crm_status)) {
    record.crm_status = "";
  }
  if (record.data_source && !ALLOWED_DATA_SOURCE.includes(record.data_source)) {
    record.data_source = "";
  }
  // Per the assignment spec, created_at must be usable via `new Date(created_at)`.
  // If the AI returned something JS can't parse, blank it rather than pass
  // through a value that would break the CRM's date handling.
  if (record.created_at && Number.isNaN(Date.parse(record.created_at))) {
    record.created_at = "";
  }

  const hasEmail = !!record.email;
  const hasMobile = !!record.mobile_without_country_code;
  const aiSkip = raw && raw._skip === true;
  const skip = aiSkip || (!hasEmail && !hasMobile);

  return {
    row: raw && Number.isInteger(raw._row) ? raw._row : fallbackRow,
    skipped: skip,
    skipReason: skip
      ? raw?._skip_reason || "no email or mobile"
      : "",
    record,
  };
}

async function callWithRetry(systemPrompt, userMessage, batchRows, startIndex, maxRetries = 2) {
  const provider = getProvider();
  let lastErr;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const raw = await provider.callModel(systemPrompt, userMessage);
      const parsed = extractJsonArray(raw);
      if (!Array.isArray(parsed)) throw new Error("Model output was not an array");
      return parsed.map((r, i) => sanitizeRecord(r, startIndex + i));
    } catch (err) {
      lastErr = err;
      // Exponential backoff before retrying
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
      }
    }
  }

  // All retries failed: mark every row in this batch as skipped rather than
  // dropping the whole import.
  return batchRows.map((_, i) => ({
    row: startIndex + i,
    skipped: true,
    skipReason: `AI extraction failed after retries: ${lastErr?.message || "unknown error"}`,
    record: Object.fromEntries(CRM_FIELDS.map((f) => [f, ""])),
  }));
}

/**
 * Extracts CRM records from parsed CSV rows using the configured AI provider.
 * Processes rows in batches with bounded concurrency and per-batch retries.
 *
 * @param {string[]} headers
 * @param {object[]} rows
 * @param {object} [opts]
 * @param {(progress: {completedBatches:number, totalBatches:number}) => void} [opts.onProgress]
 */
async function extractCrmRecords(headers, rows, opts = {}) {
  const batchSize = parseInt(process.env.AI_BATCH_SIZE || "25", 10);
  const concurrency = parseInt(process.env.AI_MAX_CONCURRENCY || "3", 10);
  const systemPrompt = buildSystemPrompt();

  const batches = chunk(rows, batchSize);
  const limit = pLimit(concurrency);
  let completedBatches = 0;

  const batchPromises = batches.map((batchRows, batchIdx) => {
    const startIndex = batchIdx * batchSize;
    const userMessage = buildBatchUserMessage(headers, batchRows, startIndex);

    return limit(async () => {
      const result = await callWithRetry(
        systemPrompt,
        userMessage,
        batchRows,
        startIndex
      );
      completedBatches += 1;
      if (opts.onProgress) {
        opts.onProgress({ completedBatches, totalBatches: batches.length });
      }
      return result;
    });
  });

  const batchResults = await Promise.all(batchPromises);
  const flat = batchResults.flat().sort((a, b) => a.row - b.row);

  const imported = flat.filter((r) => !r.skipped).map((r) => r.record);
  const skipped = flat
    .filter((r) => r.skipped)
    .map((r) => ({ row: r.row, reason: r.skipReason, sourceData: rows[r.row] }));

  return {
    imported,
    skipped,
    totalImported: imported.length,
    totalSkipped: skipped.length,
  };
}

module.exports = { extractCrmRecords };
