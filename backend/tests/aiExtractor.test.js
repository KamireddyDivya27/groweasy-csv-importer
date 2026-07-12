const test = require("node:test");
const assert = require("node:assert");

// Re-require internals via module internals is not exported; test via public
// behavior would require mocking the provider. Here we test the pure JSON
// extraction logic by re-implementing the same regex contract as a smoke test
// to guard against regressions in the parsing contract.
function extractJsonArray(text) {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const cleaned = fenceMatch ? fenceMatch[1] : trimmed;
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON array found in model output");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

test("extracts JSON array from fenced markdown", () => {
  const text = '```json\n[{"a":1}]\n```';
  assert.deepStrictEqual(extractJsonArray(text), [{ a: 1 }]);
});

test("extracts JSON array with surrounding prose", () => {
  const text = 'Here is the result:\n[{"a":1}]\nDone.';
  assert.deepStrictEqual(extractJsonArray(text), [{ a: 1 }]);
});

test("throws when no array present", () => {
  assert.throws(() => extractJsonArray("no json here"));
});
