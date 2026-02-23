import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI } from '@google/genai';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'expenses.json');

// Allow all origins — iOS Capacitor app uses a custom scheme (capacitor://)
// and the Mac IP; a blanket allow is safe for a local personal app.
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ── Data helpers ────────────────────────────────────────────────────────────

async function initData() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify({ expenses: [] }, null, 2));
    console.log('Initialized expenses.json');
  }
}

async function readData() {
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

async function writeData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET all expenses
app.get('/api/expenses', async (_req, res) => {
  try {
    const { expenses } = await readData();
    res.json(expenses);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST add expense
app.post('/api/expenses/add', async (req, res) => {
  try {
    const data = await readData();
    const expense = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      paidBy: 'Me',
      ...req.body,
    };
    data.expenses.unshift(expense);
    await writeData(data);
    res.json(expense);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST bulk-delete (must be before /:id to avoid param conflict)
app.post('/api/expenses/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array required' });
    }
    const data = await readData();
    const before = data.expenses.length;
    data.expenses = data.expenses.filter((e) => !ids.includes(e.id));
    await writeData(data);
    res.json({ success: true, deleted: before - data.expenses.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST import CSV (must be before /:id)
app.post('/api/expenses/import-csv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const csv = req.file.buffer.toString('utf-8');
    const records = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const data = await readData();
    const imported = records
      .map((r) => {
        const amount =
          parseFloat(
            r['Total cost'] ??
              r['total cost'] ??
              r['Amount'] ??
              r['amount'] ??
              r['Cost'] ??
              r['cost'] ??
              r['Total'] ??
              r['total'] ??
              '0'
          ) || 0;

        const rawDate =
          r['Date'] ?? r['date'] ?? r['DATE'] ?? new Date().toISOString().split('T')[0];

        // Normalise date to YYYY-MM-DD
        let date = rawDate;
        try {
          const parsed = new Date(rawDate);
          if (!isNaN(parsed)) date = parsed.toISOString().split('T')[0];
        } catch {
          // keep original
        }

        const details =
          r['Expense'] ??
          r['expense'] ??
          r['Description'] ??
          r['description'] ??
          r['details'] ??
          r['Note'] ??
          r['note'] ??
          '';

        const category = r['Category'] ?? r['category'] ?? 'Other';
        const paidBy = r['PaidBy'] ?? r['Paid By'] ?? r['paid_by'] ?? r['paidBy'] ?? 'Me';

        return {
          id: uuidv4(),
          date,
          amount,
          category,
          details,
          paidBy,
          createdAt: new Date().toISOString(),
        };
      })
      .filter((e) => e.amount > 0);

    data.expenses = [...imported, ...data.expenses];
    await writeData(data);
    res.json({ imported: imported.length, expenses: imported });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT update expense
app.put('/api/expenses/:id', async (req, res) => {
  try {
    const data = await readData();
    const idx = data.expenses.findIndex((e) => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Expense not found' });
    data.expenses[idx] = { ...data.expenses[idx], ...req.body, id: req.params.id };
    await writeData(data);
    res.json(data.expenses[idx]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE expense
app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const data = await readData();
    const before = data.expenses.length;
    data.expenses = data.expenses.filter((e) => e.id !== req.params.id);
    if (data.expenses.length === before) return res.status(404).json({ error: 'Not found' });
    await writeData(data);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST AI extract from text
app.post('/api/ai/extract', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: 'GOOGLE_API_KEY or GEMINI_API_KEY not set. Add it to .env.local or backend/.env',
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const today = new Date().toISOString().split('T')[0];

    const prompt = `Extract expense information from the text below. Return ONLY valid JSON — no markdown, no explanation.

Text: "${text}"
Today's date: ${today}

Return exactly this JSON shape:
{
  "date": "YYYY-MM-DD",
  "amount": 0,
  "category": "Food",
  "details": "brief description",
  "paidBy": "Me"
}

Rules:
- date: use today (${today}) when not mentioned
- amount: numeric value only, no currency symbols
- category: one of Food | Transport | Utilities | Entertainment | Shopping | Health | Other
- details: clean, concise description
- paidBy: "Me" unless explicitly stated`;

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const raw = (result.text ?? '').trim().replace(/```json\n?|\n?```/g, '').trim();
    let extracted;
    try {
      extracted = JSON.parse(raw);
    } catch {
      return res.status(500).json({ error: 'AI returned an unreadable response. Please try again.' });
    }

    // Validate and sanitise extracted fields
    const VALID_CATEGORIES = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Health', 'Other'];
    if (!VALID_CATEGORIES.includes(extracted.category)) extracted.category = 'Other';
    extracted.amount = parseFloat(extracted.amount) || 0;
    if (extracted.amount <= 0) {
      return res.status(400).json({ error: 'Could not extract a valid amount. Please be more specific (e.g. "spent $25").' });
    }

    res.json(extracted);
  } catch (e) {
    console.error('AI extract error — full details:');
    console.error('  message :', e.message);
    console.error('  status  :', e.status ?? e.statusCode ?? 'n/a');
    console.error('  stack   :', e.stack);
    res.status(500).json({ error: e.message });
  }
});

// ── Start ────────────────────────────────────────────────────────────────────

initData().then(() => {
  // Bind to 0.0.0.0 so iOS devices on the same Wi-Fi can reach this API
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  Expense Tracker API\n  http://localhost:${PORT}\n`);
  });
});
