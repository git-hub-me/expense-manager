// ── Persistent storage via @capacitor/preferences (native UserDefaults on iOS)
// Falls back gracefully in the browser during development.

import { Preferences } from '@capacitor/preferences';

const KEY = 'expense_tracker_v1';
const SETTINGS_KEY = 'expense_tracker_settings_v1';

async function load() {
  try {
    const { value } = await Preferences.get({ key: KEY });
    return JSON.parse(value ?? '[]');
  } catch {
    return [];
  }
}

async function persist(expenses) {
  await Preferences.set({ key: KEY, value: JSON.stringify(expenses) });
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function getExpenses() {
  return load();
}

export async function addExpense(data) {
  const expenses = await load();
  const expense = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    paidBy: 'Me',
    ...data,
  };
  expenses.unshift(expense);
  await persist(expenses);
  return expense;
}

export async function updateExpense(id, updates) {
  const expenses = await load();
  const idx = expenses.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error('Expense not found');
  expenses[idx] = { ...expenses[idx], ...updates, id };
  await persist(expenses);
  return expenses[idx];
}

export async function deleteExpense(id) {
  await persist((await load()).filter((e) => e.id !== id));
}

export async function bulkDeleteExpenses(ids) {
  const set = new Set(ids);
  await persist((await load()).filter((e) => !set.has(e.id)));
}

export async function importExpenses(incoming) {
  const existing = await load();
  await persist([...incoming, ...existing]);
  return incoming.length;
}

export async function clearAllExpenses() {
  await persist([]);
}

// ── Settings (localStorage — tiny preference, fine to lose on eviction) ──────

export function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null') ?? {
      model: 'gemini-2.5-flash-lite',
    };
  } catch {
    return { model: 'gemini-2.5-flash-lite' };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ── CSV Export ────────────────────────────────────────────────────────────────

export function exportToCSV(expenses) {
  const headers = ['Date', 'Amount', 'Category', 'Details', 'PaidBy'];
  const rows = expenses.map((e) => [
    e.date ?? '',
    e.amount ?? 0,
    e.category ?? '',
    (e.details ?? '').replace(/"/g, '""'),
    e.paidBy ?? 'Me',
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${v}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Seed sample data (only runs if storage is empty) ─────────────────────────

export async function seedSampleData() {
  if ((await load()).length > 0) return;

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const todayDay = now.getDate();

  const pad = (n) => String(n).padStart(2, '0');
  const rDate = () => {
    const d = Math.max(1, Math.ceil(Math.random() * todayDay));
    return `${y}-${pad(m + 1)}-${pad(d)}`;
  };

  const thisMonthSamples = [
    { amount: 1250, category: 'Food',          details: 'Monthly grocery run' },
    { amount: 180,  category: 'Transport',     details: 'Uber to office' },
    { amount: 4500, category: 'Utilities',     details: 'Electricity bill' },
    { amount: 350,  category: 'Food',          details: 'Lunch with colleagues' },
    { amount: 799,  category: 'Entertainment', details: 'OTT subscriptions' },
    { amount: 2200, category: 'Health',        details: 'Gym membership' },
    { amount: 120,  category: 'Transport',     details: 'Auto rickshaw' },
    { amount: 5500, category: 'Shopping',      details: 'New shoes' },
    { amount: 220,  category: 'Food',          details: 'Coffee & snacks' },
    { amount: 1499, category: 'Utilities',     details: 'Internet bill' },
    { amount: 450,  category: 'Food',          details: 'Dinner at restaurant' },
    { amount: 650,  category: 'Health',        details: 'Pharmacy' },
    { amount: 300,  category: 'Transport',     details: 'Petrol fill-up' },
    { amount: 3200, category: 'Shopping',      details: 'Home essentials' },
    { amount: 199,  category: 'Entertainment', details: 'Movie tickets' },
    { amount: 550,  category: 'Food',          details: 'Weekend brunch' },
    { amount: 2800, category: 'Utilities',     details: 'Phone bill' },
    { amount: 1800, category: 'Health',        details: 'Doctor consultation' },
    { amount: 380,  category: 'Food',          details: 'Swiggy order' },
    { amount: 900,  category: 'Entertainment', details: 'Weekend outing' },
  ];

  const lm = new Date(y, m - 1, 1);
  const lmStr = `${lm.getFullYear()}-${pad(lm.getMonth() + 1)}`;
  const lastMonthSamples = [
    { amount: 2100, category: 'Food',          details: 'Last month groceries',  date: `${lmStr}-05` },
    { amount: 800,  category: 'Transport',     details: 'Transport last month',  date: `${lmStr}-12` },
    { amount: 4500, category: 'Utilities',     details: 'Bills last month',      date: `${lmStr}-20` },
    { amount: 6500, category: 'Shopping',      details: 'Shopping last month',   date: `${lmStr}-15` },
    { amount: 1200, category: 'Food',          details: 'Dining out last month', date: `${lmStr}-22` },
    { amount: 1800, category: 'Health',        details: 'Medical last month',    date: `${lmStr}-08` },
  ];

  const all = [
    ...thisMonthSamples.map((e) => ({
      ...e,
      date: rDate(),
      paidBy: 'Me',
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    })),
    ...lastMonthSamples.map((e) => ({
      ...e,
      paidBy: 'Me',
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    })),
  ];

  await persist(all);
}
