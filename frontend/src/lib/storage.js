// ── Persistent storage via @capacitor/preferences (native UserDefaults on iOS)
// Falls back gracefully in the browser during development.

import { Preferences } from '@capacitor/preferences';

const KEY = 'expense_tracker_v1';
const SETTINGS_KEY = 'expense_tracker_settings_v1';
const SUBCATEGORIES_KEY = 'expense_tracker_subcategories_v1';
const AUDIT_KEY = 'expense_tracker_audit_v1';

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
  // original_prompt is immutable — strip it from any update payload
  const { original_prompt: _immutable, ...safeUpdates } = updates;
  expenses[idx] = { ...expenses[idx], ...safeUpdates, id };
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

// ── Subcategory storage ───────────────────────────────────────────────────────

async function loadSubcategories() {
  try {
    const { value } = await Preferences.get({ key: SUBCATEGORIES_KEY });
    return JSON.parse(value ?? 'null') ?? {};
  } catch {
    return {};
  }
}

async function persistSubcategories(map) {
  await Preferences.set({ key: SUBCATEGORIES_KEY, value: JSON.stringify(map) });
}

export async function getSubcategories() {
  return loadSubcategories();
}

export async function saveSubcategories(map) {
  await persistSubcategories(map);
}

export async function addApprovedSubcategory(parentCategory, name) {
  const map = await loadSubcategories();
  const existing = map[parentCategory] ?? [];
  if (!existing.includes(name)) {
    map[parentCategory] = [...existing, name].slice(0, 8); // hard cap: 8 per parent
  }
  await persistSubcategories(map);
  return map;
}

// ── Audit log ─────────────────────────────────────────────────────────────────

async function loadAuditLog() {
  try {
    const { value } = await Preferences.get({ key: AUDIT_KEY });
    return JSON.parse(value ?? '[]');
  } catch {
    return [];
  }
}

async function persistAuditLog(log) {
  await Preferences.set({ key: AUDIT_KEY, value: JSON.stringify(log) });
}

export async function addAuditEvent(event) {
  const log = await loadAuditLog();
  log.unshift({ ...event, timestamp: new Date().toISOString() });
  // Keep last 100 entries
  await persistAuditLog(log.slice(0, 100));
}

export async function getAuditLog() {
  return loadAuditLog();
}

// ── Reclassification (apply + undo) ──────────────────────────────────────────

export async function applyReclassification(approvedChanges, metadata) {
  const expenses = await load();

  // Build a snapshot of the affected expenses (for undo)
  const affectedIds = new Set(approvedChanges.map((c) => c.transaction_id));
  const snapshot = expenses
    .filter((e) => affectedIds.has(e.id))
    .map((e) => ({ ...e })); // shallow clone each

  // Apply changes
  const changeMap = new Map(approvedChanges.map((c) => [c.transaction_id, c]));
  const updated = expenses.map((e) => {
    const change = changeMap.get(e.id);
    if (!change) return e;
    return {
      ...e,
      category: change.new_category ?? e.category,
      subcategory: change.new_subcategory ?? e.subcategory ?? null,
      details: change.new_description ?? e.details,
      normalized_merchant: change.normalized_merchant ?? e.normalized_merchant ?? null,
    };
  });

  await persist(updated);

  await addAuditEvent({
    type: 'AI_RECLASSIFICATION',
    mode: metadata?.mode ?? 'conservative',
    scope: metadata?.scope ?? 'unknown',
    changedCount: approvedChanges.length,
    subcategoriesCreated: metadata?.subcategoriesCreated ?? 0,
  });

  return { snapshot, updatedCount: approvedChanges.length };
}

export async function undoReclassification(snapshot) {
  const expenses = await load();
  const snapshotMap = new Map(snapshot.map((e) => [e.id, e]));
  const restored = expenses.map((e) => snapshotMap.get(e.id) ?? e);
  await persist(restored);

  await addAuditEvent({
    type: 'AI_RECLASSIFICATION_UNDO',
    restoredCount: snapshot.length,
  });
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
  const headers = ['Date', 'Amount', 'Category', 'Subcategory', 'Details', 'Original Prompt', 'PaidBy'];
  const rows = expenses.map((e) => [
    e.date ?? '',
    e.amount ?? 0,
    e.category ?? '',
    e.subcategory ?? '',
    (e.details ?? '').replace(/"/g, '""'),
    (e.original_prompt ?? '').replace(/"/g, '""'),
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
