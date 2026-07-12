const test = require("node:test");
const assert = require("node:assert");
const { parseCsv } = require("../src/services/csvParser");

test("parses a simple CSV with headers", () => {
  const csv = "name,email\nJohn Doe,john@example.com\nJane Doe,jane@example.com";
  const { headers, rows } = parseCsv(csv);
  assert.deepStrictEqual(headers, ["name", "email"]);
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[0].name, "John Doe");
});

test("throws on empty CSV", () => {
  assert.throws(() => parseCsv(""), /empty/i);
});

test("skips fully blank rows", () => {
  const csv = "name,email\nJohn,john@example.com\n,\nJane,jane@example.com";
  const { rows } = parseCsv(csv);
  assert.strictEqual(rows.length, 2);
});

test("tolerates ragged rows (relax_column_count)", () => {
  const csv = "name,email,phone\nJohn,john@example.com\nJane,jane@example.com,999,extra";
  const { rows } = parseCsv(csv);
  assert.strictEqual(rows.length, 2);
});
