import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-haiku-4-5";

const SYSTEM_PROMPT = `You write concise, positive-leaning marketing summaries of a business's Google Reviews. The summary appears on the business's own website, so it should sound confident and inviting.

Rules:
- 2 to 3 sentences, 45 to 70 words total.
- Lead with the business name. Call out the 2-3 strongest POSITIVE themes reviewers praise (e.g. specific service types, professionalism, staff care, atmosphere, output quality).
- Focus EXCLUSIVELY on what reviewers commend. Do NOT mention complaints, criticism, pricing concerns, or any negative feedback — even if reviews include them. If a review is mixed, extract only the positive aspect.
- Confident marketing prose — no bullet points, no headings.
- Do not use hype words like "amazing", "awesome", "incredible", or "world-class".
- Do not invent details not present in the reviews.
- Also produce a short title (3-6 words) that captures the dominant positive theme.

Output strict JSON: {"title": "...", "summary": "..."}`;

export async function generateSummary({ displayName, reviews, apiKey }) {
  const client = new Anthropic({ apiKey });

  const reviewBlock = reviews
    .map((r, i) => `[${i + 1}] ${r.rating}/5 — ${r.author}\n${r.text}`)
    .join("\n\n");

  const userMessage = `Business: ${displayName}\nReview count analyzed: ${reviews.length}\n\nReviews:\n\n${reviewBlock}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("")
    .trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Claude did not return JSON. Got: ${text.slice(0, 200)}`);
  }

  const parsed = JSON.parse(jsonMatch[0]);
  if (!parsed.title || !parsed.summary) {
    throw new Error(`Claude JSON missing title/summary: ${jsonMatch[0]}`);
  }

  return { title: parsed.title, summary: parsed.summary };
}
