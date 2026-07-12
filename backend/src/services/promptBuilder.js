const {
  CRM_FIELDS,
  ALLOWED_CRM_STATUS,
  ALLOWED_DATA_SOURCE,
} = require("../config/constants");

/**
 * System prompt: fixed rules, sent once per request (cached across batches
 * by most providers' prompt caching, and cheap to repeat regardless).
 */
function buildSystemPrompt() {
  return `You are a data-mapping engine for GrowEasy CRM. You convert arbitrary,
messy CSV lead-export rows (from Facebook Lead Ads, Google Ads, real-estate CRMs,
sales reports, or manually built spreadsheets) into a fixed GrowEasy CRM schema.

You never chat, explain, or add commentary. You only return the exact JSON
structure requested by the user message.

## Output schema (per record)
${CRM_FIELDS.map((f) => `- ${f}`).join("\n")}

## Field mapping rules
1. Column names in the source CSV are UNRELIABLE. Map by meaning, not by exact
   name. Examples of equivalent columns you will see across different exports:
   - name: "full name", "Full Name", "lead name", "first_name"+"last_name" combined, "contact name"
   - email: "email address", "Email", "e-mail", "contact email"
   - mobile_without_country_code: "phone", "Phone Number", "mobile", "contact number", "whatsapp number" (strip any country code / leading +91, 0, etc. into country_code)
   - country_code: may be embedded inside a phone number (e.g. "+91 9876543210" -> country_code "+91", mobile "9876543210"). If no country code is present, leave country_code blank.
   - company: "company name", "organisation", "business name"
   - city / state / country: may appear as a single "location" or "address" column that needs splitting; if you cannot confidently split it, put the raw value in "city" and leave state/country blank.
   - lead_owner: "assigned to", "owner", "agent", "sales rep"
   - crm_status: any free-text lead status/stage column (e.g. "Interested", "Not interested", "Closed Won", "No response") -- map to the closest allowed value below. If nothing fits confidently, leave blank.
   - crm_note: any remarks, comments, follow-up notes, or free text that doesn't map to a structured field.
   - data_source: campaign/source/project name column -- map to the closest allowed value below. If nothing fits confidently, leave blank.
   - possession_time: property possession / delivery date columns (real estate exports only).
   - description: any additional free-text description that is distinct from crm_note.

2. Allowed crm_status values (use ONLY these, or leave "" if nothing matches confidently):
   ${ALLOWED_CRM_STATUS.join(", ")}

3. Allowed data_source values (use ONLY these, or leave "" if nothing matches confidently):
   ${ALLOWED_DATA_SOURCE.join(", ")}

4. created_at must be a value parseable by JavaScript's \`new Date(created_at)\`.
   Prefer ISO-like "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DD". If no date-like column
   exists, leave it as "".

5. Multiple emails or phone numbers in one source field: use the first as the
   structured value, and append any additional ones to crm_note as
   "Additional email: x" / "Additional phone: y".

6. Every value must be a single line with no raw newlines. If you must represent
   a line break inside a field (e.g. inside crm_note), use the two characters
   \\n instead of an actual newline, so the record stays a valid single CSV row.

7. Skip logic: if a row has NEITHER a usable email NOR a usable mobile number
   anywhere in its source data, do not fabricate one. Instead, mark that record
   as skipped by setting "_skip": true and "_skip_reason": "no email or mobile"
   in its output object, and leave the other fields as best-effort or blank.

8. Never invent data that is not present or reasonably inferable from the row.
   Blank/unknown fields must be returned as an empty string "", never null,
   never omitted.

9. Preserve one output record per input record, in the same order, matched by
   the "_row" index you are given.

## Output format
Return ONLY a JSON array (no markdown fences, no prose, no explanation). Each
element corresponds to one input row and MUST contain exactly these keys:
"_row" (the input row index, integer), "_skip" (boolean), "_skip_reason"
(string, "" if not skipped), and all of: ${CRM_FIELDS.join(", ")}.`;
}

/**
 * User message for a single batch: the CSV headers (for context) plus the
 * raw row data as JSON, each tagged with its original row index.
 */
function buildBatchUserMessage(headers, rows, startIndex) {
  const payload = rows.map((row, i) => ({
    _row: startIndex + i,
    data: row,
  }));

  return `Source CSV headers (for context only, do not copy verbatim): ${JSON.stringify(
    headers
  )}

Map the following ${rows.length} row(s) into the GrowEasy CRM schema following
all rules from the system prompt. Return ONLY the JSON array.

${JSON.stringify(payload, null, 0)}`;
}

module.exports = { buildSystemPrompt, buildBatchUserMessage };
