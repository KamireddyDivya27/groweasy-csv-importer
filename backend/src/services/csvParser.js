const { parse } = require("csv-parse/sync");

/**
 * Parses raw CSV text into an array of row objects.
 * - Does NOT assume any fixed column names.
 * - Trims header whitespace, keeps original header casing for AI context.
 * - Skips fully empty rows.
 */
function parseCsv(csvText) {
  if (!csvText || !csvText.trim()) {
    const err = new Error("CSV file is empty.");
    err.status = 400;
    throw err;
  }

  let records;
  try {
    records = parse(csvText, {
      columns: (header) => header.map((h) => (h || "").trim()),
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
      bom: true,
    });
  } catch (e) {
    const err = new Error(`Failed to parse CSV: ${e.message}`);
    err.status = 400;
    throw err;
  }

  const rows = records.filter((row) =>
    Object.values(row).some((v) => v !== undefined && String(v).trim() !== "")
  );

  if (rows.length === 0) {
    const err = new Error("CSV contains no data rows.");
    err.status = 400;
    throw err;
  }

  const headers = Object.keys(rows[0]);

  return { headers, rows };
}

module.exports = { parseCsv };
