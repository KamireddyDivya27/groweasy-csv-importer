const Anthropic = require("@anthropic-ai/sdk");

let client;
function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

/**
 * Calls Claude with a system prompt + user message and expects a raw JSON
 * array string back. Throws on API failure so the caller can retry.
 */
async function callModel(systemPrompt, userMessage) {
  const anthropic = getClient();
  const model = process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-20241022";

  const response = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock) {
    throw new Error("Model returned no text content");
  }
  return textBlock.text;
}

module.exports = { callModel };
