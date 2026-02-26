// ── AI-powered ledger reclassification ────────────────────────────────────────
// Sends expenses to Gemini in 10-day batches to stay within timeout limits.
// Never includes original_prompt in the payload sent to AI.

import { CATEGORIES, DEFAULT_SUBCATEGORIES } from './constants';

const CONFIDENCE_THRESHOLD = 0.75;
const BATCH_DAYS = 10;
const TIMEOUT_MS = 15000;
const BATCH_DELAY_MS = 1500; // pause between batches to avoid rate limits

// If the selected model fails, try the other one once before giving up
const MODEL_FALLBACK = {
  'gemini-2.5-flash-lite': 'gemini-2.5-flash',
  'gemini-2.5-flash':      'gemini-2.5-flash-lite',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Date-scope helpers ────────────────────────────────────────────────────────

export function getScopedExpenses(expenses, scope) {
  if (scope === 'all') return expenses;
  const days = typeof scope === 'number' ? scope : (scope === '90d' ? 90 : 30);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  return expenses.filter((e) => (e.date ?? '') >= cutoffStr);
}

// ── Batch expenses into 10-day windows ───────────────────────────────────────

function chunkByDays(expenses, daySize = BATCH_DAYS) {
  if (expenses.length === 0) return [];
  const sorted = [...expenses].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));

  const batches = [];
  let batchStartDate = null;
  let currentBatch = [];

  for (const expense of sorted) {
    const dateStr = expense.date ?? '';
    if (!batchStartDate) {
      batchStartDate = dateStr;
      currentBatch = [expense];
    } else {
      const diffMs = new Date(dateStr) - new Date(batchStartDate);
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays <= daySize) {
        currentBatch.push(expense);
      } else {
        batches.push(currentBatch);
        batchStartDate = dateStr;
        currentBatch = [expense];
      }
    }
  }
  if (currentBatch.length > 0) batches.push(currentBatch);
  return batches;
}

// ── Merchant frequency summary ────────────────────────────────────────────────

function buildMerchantFrequency(expenses) {
  const freq = {};
  for (const e of expenses) {
    const key = (e.details ?? '').trim().toLowerCase();
    if (!key) continue;
    freq[key] = (freq[key] ?? 0) + 1;
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([merchant, count]) => ({ merchant, count }));
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildReclassifyPrompt({ payload, categories, subcategories, merchantFreq, mode }) {
  const modeNote =
    mode === 'deep'
      ? 'DEEP — you may suggest new subcategory names beyond the provided list when clearly appropriate.'
      : 'CONSERVATIVE — only use the provided categories and subcategory lists. Do not invent new ones.';

  const subcategoryLines = categories
    .filter((c) => subcategories[c]?.length > 0)
    .map((c) => `  ${c}: ${subcategories[c].join(', ')}`)
    .join('\n');

  return `You are an expense categorization assistant. Analyze the expenses below and suggest improved categorizations AND subcategorizations.

Mode: ${modeNote}

Allowed categories: ${categories.join(', ')}

Allowed subcategories per category:
${subcategoryLines}

Common merchants (by frequency):
${merchantFreq.map((m) => `  - "${m.merchant}" (${m.count}x)`).join('\n')}

Expenses to review:
${JSON.stringify(payload, null, 2)}

Return ONLY valid JSON with this exact schema — no markdown, no explanation:
{
  "changes": [
    {
      "transaction_id": "string",
      "new_category": "string",
      "new_subcategory": "string or null",
      "new_description": "string or null",
      "confidence": 0.0
    }
  ],
  "new_subcategories": []
}

Rules:
- Only include a change if confidence >= ${CONFIDENCE_THRESHOLD}
- new_category must be one of the allowed categories above
- new_subcategory: STRONGLY ENCOURAGED — use the subcategory lists above to classify each expense more precisely. Set to null only if no subcategory clearly fits.
- In CONSERVATIVE mode, new_subcategory must be from the provided lists or null. new_subcategories array must be empty.
- new_description: only suggest if meaningfully cleaner; otherwise null
- confidence: 0.0 to 1.0
- If a transaction is already correctly categorized AND has a good subcategory, omit it from changes`;
}

// ── Schema validator ──────────────────────────────────────────────────────────

function validateResponse(parsed) {
  if (!parsed || typeof parsed !== 'object') throw new Error('AI returned non-object response');
  if (!Array.isArray(parsed.changes)) throw new Error('AI response missing "changes" array');
  if (!Array.isArray(parsed.new_subcategories)) throw new Error('AI response missing "new_subcategories" array');

  for (const c of parsed.changes) {
    if (typeof c.transaction_id !== 'string') throw new Error('Change missing transaction_id');
    if (typeof c.new_category !== 'string') throw new Error('Change missing new_category');
    if (typeof c.confidence !== 'number') throw new Error('Change missing confidence');
  }
  return parsed;
}

// ── Single-batch Gemini call ──────────────────────────────────────────────────

async function callGeminiBatch({ payload, categories, merchantFreq, mode, model, apiKey }) {
  const prompt = buildReclassifyPrompt({
    payload,
    categories,
    subcategories: DEFAULT_SUBCATEGORIES,
    merchantFreq,
    mode,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        }),
        signal: controller.signal,
      }
    );
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Batch timed out after 15s. Try a smaller scope.');
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? 'Gemini API error');

  const raw = (json.candidates?.[0]?.content?.parts?.[0]?.text ?? '')
    .trim()
    .replace(/```json\n?|\n?```/g, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('AI returned malformed JSON. Please try again.');
  }

  return validateResponse(parsed);
}

// ── Main reclassification function (batched) ──────────────────────────────────
// onProgress: ({ current: number, total: number, retrying: boolean }) => void

export async function runReclassification({ expenses, mode, model, apiKey, onProgress }) {
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY is not set');
  if (expenses.length === 0) throw new Error('No expenses in scope');

  const categories = CATEGORIES;
  const merchantFreq = buildMerchantFrequency(expenses); // computed across full scope

  const batches = chunkByDays(expenses, BATCH_DAYS);
  const total = batches.length;

  const allChanges = [];
  const allNewSubcategories = [];

  for (let i = 0; i < batches.length; i++) {
    // Pause between batches (skip before the first one)
    if (i > 0) await sleep(BATCH_DELAY_MS);

    onProgress?.({ current: i + 1, total, retrying: false });

    const batchPayload = batches[i].map(({ id, date, amount, category, subcategory, details }) => ({
      id,
      date,
      amount,
      category,
      subcategory: subcategory ?? null,
      details,
    }));

    let validated;
    try {
      validated = await callGeminiBatch({
        payload: batchPayload,
        categories,
        merchantFreq,
        mode,
        model,
        apiKey,
      });
    } catch (primaryErr) {
      // Primary model failed — try fallback model once
      const fallbackModel = MODEL_FALLBACK[model];
      if (!fallbackModel) throw primaryErr;

      onProgress?.({ current: i + 1, total, retrying: true });
      await sleep(1000); // brief pause before retry

      try {
        validated = await callGeminiBatch({
          payload: batchPayload,
          categories,
          merchantFreq,
          mode,
          model: fallbackModel,
          apiKey,
        });
      } catch {
        // Both models failed for this batch — skip it rather than abort everything
        console.warn(`Batch ${i + 1} failed on both models, skipping.`);
        continue;
      }
    }

    allChanges.push(...validated.changes);
    allNewSubcategories.push(...validated.new_subcategories);
  }

  // Filter to valid categories and confidence >= threshold
  const knownCategories = new Set(CATEGORIES);
  const changes = allChanges.filter(
    (c) => c.confidence >= CONFIDENCE_THRESHOLD && knownCategories.has(c.new_category)
  );

  return { changes, newSubcategories: allNewSubcategories };
}
