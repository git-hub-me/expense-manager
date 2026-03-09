import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileText, X, CheckCircle, Download, ArrowRight, Shuffle } from 'lucide-react';
import { importExpenses, exportToCSV } from '../lib/storage';
import { today, CATEGORIES } from '../lib/constants';

const FIELD_KEYWORDS = {
  date:     ['date', 'time', 'when', 'day', 'posted', 'transaction'],
  amount:   ['amount', 'cost', 'total', 'price', 'debit', 'credit', 'value', 'sum', 'charge'],
  details:  ['expense', 'description', 'details', 'note', 'narration', 'name', 'item', 'merchant', 'payee'],
  category: ['category', 'type', 'kind', 'tag'],
  paidBy:   ['paid', 'payer', 'person', 'who', 'by', 'account'],
};

const FIELD_LABELS = {
  date:     { label: 'Date', required: true },
  amount:   { label: 'Amount', required: true },
  details:  { label: 'Description', required: false },
  category: { label: 'Category', required: false },
  paidBy:   { label: 'Paid By', required: false },
};

function detectColumnMapping(headers) {
  const mapping = { date: '', amount: '', details: '', category: '', paidBy: '' };
  const used = new Set();
  for (const [field, keywords] of Object.entries(FIELD_KEYWORDS)) {
    const match =
      headers.find(h => h.toLowerCase() === keywords[0]) ||
      headers.find(h => !used.has(h) && keywords.some(k => h.toLowerCase().includes(k)));
    if (match) { mapping[field] = match; used.add(match); }
  }
  return mapping;
}

function parseDate(raw) {
  if (!raw) return today();
  const s = raw.trim();
  // Strip trailing time component (e.g. "2024-01-15 10:30:00" or "01/15/2024 10:30 AM")
  const noTime = s.replace(/\s+\d{1,2}:\d{2}(:\d{2})?(\s*(AM|PM))?$/i, '').trim();
  // Compact YYYYMMDD
  if (/^\d{8}$/.test(noTime)) {
    const dt = new Date(`${noTime.slice(0, 4)}-${noTime.slice(4, 6)}-${noTime.slice(6, 8)}`);
    if (!isNaN(dt)) return dt.toISOString().split('T')[0];
  }
  // DD/MM/YYYY or DD-MM-YYYY — day > 12 is a reliable DD/MM signal
  const dmy = noTime.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const [, a, b, y] = dmy;
    const year = y.length === 2 ? `20${y}` : y;
    if (parseInt(a) > 12) {
      const dt = new Date(`${year}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`);
      if (!isNaN(dt)) return dt.toISOString().split('T')[0];
    }
    // Ambiguous (both ≤ 12) — fall through to native Date (assumes MM/DD/YYYY)
  }
  // Native Date: handles ISO, ISO datetime, written months, US MM/DD/YYYY
  const dt = new Date(noTime);
  if (!isNaN(dt)) return dt.toISOString().split('T')[0];
  return today();
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };

  const splitLine = (line) => {
    const fields = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { fields.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    fields.push(cur.trim());
    return fields;
  };

  const headers = splitLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const vals = splitLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    return row;
  });
  return { headers, rows };
}

function rowToExpense(r, mapping) {
  const amountRaw = (mapping.amount   ? r[mapping.amount]   : null) ?? '0';
  const rawDate   = (mapping.date     ? r[mapping.date]     : null) ?? '';
  const details   = (mapping.details  ? r[mapping.details]  : null) ?? '';
  const category  = (mapping.category ? r[mapping.category] : null) ?? 'Other';
  const paidBy    = (mapping.paidBy   ? r[mapping.paidBy]   : null) ?? 'Me';

  return {
    date: parseDate(rawDate),
    amount: parseFloat(amountRaw) || 0,
    details,
    category,
    paidBy,
  };
}

const SAMPLE_POOL = {
  Food:          [['Zomato order', 320], ['Swiggy dinner', 450], ['Cafe Coffee Day', 180], ["McDonald's", 260],
                  ['Darshini lunch', 80], ['Morning coffee', 60], ['Chai & snacks', 40], ['Breakfast', 90],
                  ['Biryani takeout', 380], ['Grocery run', 520], ['Bakery', 130], ['Juice bar', 75]],
  Transport:     [['Ola cab', 180], ['Uber ride', 240], ['Metro card recharge', 200], ['Auto rickshaw', 65],
                  ['Petrol', 800], ['Rapido bike', 55], ['Bus pass', 150], ['Ola intercity', 950]],
  Utilities:     [['Electricity bill', 1400], ['Jio recharge', 299], ['Airtel broadband', 799],
                  ['Water bill', 350], ['Gas cylinder', 950], ['DTH recharge', 399]],
  Entertainment: [['Netflix', 649], ['Amazon Prime', 299], ['Movie tickets', 480], ['Spotify', 119],
                  ['BookMyShow', 560], ['YouTube Premium', 189], ['Gaming top-up', 350]],
  Shopping:      [['Amazon order', 1200], ['Flipkart', 850], ['D-Mart groceries', 680], ['Myntra', 1500],
                  ['Stationery', 220], ['Home essentials', 460], ['Blinkit order', 340]],
  Health:        [['Pharmacy', 380], ['Doctor consultation', 500], ['Gym membership', 1200],
                  ['Health checkup', 800], ['Supplements', 650], ['Eye drops', 120]],
  Other:         [['ATM withdrawal', 2000], ['Parking', 40], ['Donation', 100],
                  ['Laundry', 150], ['Newspaper', 30], ['Miscellaneous', 200]],
};

// Category weights (Food most frequent, Utilities least)
const CATEGORY_WEIGHTS = [30, 20, 5, 10, 15, 10, 10]; // Food, Transport, Utilities, Entertainment, Shopping, Health, Other

function weightedRandomCategory() {
  const total = CATEGORY_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < CATEGORIES.length; i++) {
    r -= CATEGORY_WEIGHTS[i];
    if (r <= 0) return CATEGORIES[i];
  }
  return CATEGORIES[CATEGORIES.length - 1];
}

function generateSampleData(paidBy = 'Me') {
  const expenses = [];
  const now = new Date();
  for (let d = 0; d < 30; d++) {
    const date = new Date(now);
    date.setDate(now.getDate() - d);
    const dateStr = date.toISOString().split('T')[0];
    const count = 1 + Math.floor(Math.random() * 4); // 1–4 per day
    for (let i = 0; i < count; i++) {
      const category = weightedRandomCategory();
      const pool = SAMPLE_POOL[category];
      const [details, baseAmount] = pool[Math.floor(Math.random() * pool.length)];
      // ±20% variance on base amount
      const amount = Math.round(baseAmount * (0.8 + Math.random() * 0.4));
      expenses.push({
        id: crypto.randomUUID(),
        createdAt: date.toISOString(),
        date: dateStr,
        amount,
        category,
        subcategory: null,
        details,
        paidBy,
        original_prompt: null,
        normalized_merchant: null,
      });
    }
  }
  return expenses;
}

export default function CSVImport({ expenses = [], onImport, showToast, defaultPaidBy }) {
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [preview, setPreview] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState(null);
  const [columnMapping, setColumnMapping] = useState(null);
  const [mappingConfirmed, setMappingConfirmed] = useState(false);
  const fileInputRef = useRef(null);

  const handleSampleData = async () => {
    try {
      const generated = generateSampleData(defaultPaidBy || 'Me');
      await importExpenses(generated);
      await onImport();
      showToast(`Loaded ${generated.length} sample expenses`);
    } catch (err) {
      showToast(err.message || 'Failed to load sample data', 'error');
    }
  };

  const handleExport = () => {
    if (expenses.length === 0) {
      showToast('No expenses to export', 'error');
      return;
    }
    exportToCSV(expenses);
    showToast(`Exported ${expenses.length} expense${expenses.length !== 1 ? 's' : ''}`);
  };

  const handleFile = (f) => {
    if (!f || !f.name.endsWith('.csv')) {
      showToast('Please upload a .csv file', 'error');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      showToast('File must be under 10 MB', 'error');
      return;
    }
    setFile(f);
    setResult(null);
    setMappingConfirmed(false);
    const reader = new FileReader();
    reader.onload = (e) => {
      const { headers: h, rows } = parseCSV(e.target.result);
      setHeaders(h);
      setAllRows(rows);
      setPreview(rows.slice(0, 5));
      setColumnMapping(detectColumnMapping(h));
    };
    reader.readAsText(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleImport = async () => {
    if (!file || !columnMapping) return;
    try {
      const imported = allRows
        .map((r) => rowToExpense(r, columnMapping))
        .filter((ex) => ex.amount > 0)
        .map((ex) => ({
          ...ex,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        }));
      await importExpenses(imported);
      await onImport();
      setResult({ imported: imported.length });
    } catch (err) {
      showToast(err.message || 'Import failed', 'error');
    }
  };

  const reset = () => {
    setFile(null);
    setHeaders([]);
    setAllRows([]);
    setPreview([]);
    setResult(null);
    setColumnMapping(null);
    setMappingConfirmed(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const canConfirmMapping = columnMapping?.date && columnMapping?.amount;

  const processedPreview = mappingConfirmed
    ? preview.map((r) => rowToExpense(r, columnMapping)).filter((ex) => ex.amount > 0)
    : [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-4xl font-semibold text-[#1A1A1A]">Data</h2>
        <p className="text-sm text-[#8A8A70] mt-1">Export or bulk-import from CSV</p>
      </div>

      {/* ── Export ── */}
      <div className="bg-white rounded-3xl border border-[#1A1A1A]/5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-xl font-semibold text-[#1A1A1A]">Export</h3>
            <p className="text-xs text-[#8A8A70] mt-1">
              {expenses.length} expense{expenses.length !== 1 ? 's' : ''} · downloads as CSV
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={expenses.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-[#5A5A40] text-white rounded-full text-sm font-medium hover:bg-[#4A4A30] transition-colors shadow-lg shadow-[#5A5A40]/20 disabled:opacity-40"
          >
            <Download size={15} />
            Download CSV
          </button>
        </div>
      </div>

      {/* ── Sample Data ── */}
      <div className="bg-white rounded-3xl border border-[#1A1A1A]/5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-xl font-semibold text-[#1A1A1A]">Sample Data</h3>
            <p className="text-xs text-[#8A8A70] mt-1">Load randomised expenses for the last 30 days</p>
          </div>
          <button
            onClick={handleSampleData}
            className="flex items-center gap-2 px-6 py-3 border border-[#5A5A40] text-[#5A5A40] rounded-full text-sm font-medium hover:bg-[#5A5A40]/5 transition-colors"
          >
            <Shuffle size={15} />
            Load Sample Data
          </button>
        </div>
      </div>

      {/* ── Import ── */}
      <div>
        <h3 className="font-serif text-xl font-semibold text-[#1A1A1A] mb-3">Import</h3>

        {result ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-[#1A1A1A]/5 p-12 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-500" />
            </div>
            <h3 className="font-serif text-2xl font-semibold text-[#1A1A1A] mb-2">Import Complete</h3>
            <p className="text-[#8A8A70] text-sm mb-8">
              {result.imported} expense{result.imported !== 1 ? 's' : ''} imported successfully.
            </p>
            <button
              onClick={reset}
              className="px-8 py-3 bg-[#5A5A40] text-white rounded-full text-sm font-medium hover:bg-[#4A4A30] transition-colors"
            >
              Import Another File
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {/* Upload zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !file && fileInputRef.current?.click()}
              className={`bg-white rounded-3xl border-2 border-dashed transition-all cursor-pointer ${
                isDragging
                  ? 'border-[#5A5A40] bg-[#5A5A40]/3'
                  : file
                  ? 'border-[#5A5A40]/40 cursor-default'
                  : 'border-[#1A1A1A]/10 hover:border-[#5A5A40]/40 hover:bg-[#5A5A40]/2'
              } p-10`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => handleFile(e.target.files[0])}
              />

              {file ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#5A5A40]/10 flex items-center justify-center">
                      <FileText size={22} className="text-[#5A5A40]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1A1A1A]">{file.name}</p>
                      <p className="text-xs text-[#8A8A70]">
                        {(file.size / 1024).toFixed(1)} KB · {headers.length} columns · {allRows.length} rows
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); reset(); }}
                    className="w-8 h-8 rounded-xl border border-[#1A1A1A]/8 text-[#8A8A70] flex items-center justify-center hover:bg-[#F5F5F0] transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#5A5A40]/8 flex items-center justify-center mx-auto mb-4">
                    <Upload size={24} className="text-[#5A5A40]" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-medium text-[#1A1A1A] mb-1">
                    Drop CSV or tap to browse
                  </p>
                  <p className="text-xs text-[#8A8A70]">Any column names · max 10 MB</p>
                </div>
              )}
            </div>

            {/* ── Column Mapping Step ── */}
            <AnimatePresence>
              {file && columnMapping && !mappingConfirmed && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-white rounded-3xl border border-[#1A1A1A]/5 overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-[#1A1A1A]/5">
                    <h4 className="font-serif text-lg font-semibold text-[#1A1A1A]">Map Columns</h4>
                    <p className="text-xs text-[#8A8A70] mt-0.5">We auto-detected these — adjust if needed</p>
                  </div>
                  <div className="p-6 space-y-3">
                    {Object.entries(FIELD_LABELS).map(([field, { label, required }]) => (
                      <div key={field} className="flex items-center gap-4">
                        <span className="w-28 text-sm text-[#1A1A1A] shrink-0">
                          {label}{required && <span className="text-[#5A5A40] ml-0.5">*</span>}
                        </span>
                        <select
                          value={columnMapping[field]}
                          onChange={(e) => setColumnMapping(m => ({ ...m, [field]: e.target.value }))}
                          className="flex-1 text-sm border border-[#1A1A1A]/10 rounded-xl px-3 py-2 bg-[#F5F5F0] text-[#1A1A1A] focus:outline-none focus:border-[#5A5A40] transition-colors"
                        >
                          <option value="">(none / skip)</option>
                          {headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="px-6 pb-5 flex justify-end">
                    <button
                      onClick={() => setMappingConfirmed(true)}
                      disabled={!canConfirmMapping}
                      className="flex items-center gap-2 px-6 py-2.5 bg-[#5A5A40] text-white rounded-full text-sm font-medium hover:bg-[#4A4A30] transition-colors disabled:opacity-40"
                    >
                      Continue
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Processed Preview ── */}
            <AnimatePresence>
              {mappingConfirmed && processedPreview.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-white rounded-3xl border border-[#1A1A1A]/5 overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-[#1A1A1A]/5 flex items-center justify-between">
                    <div>
                      <h4 className="font-serif text-lg font-semibold text-[#1A1A1A]">Preview</h4>
                      <p className="text-xs text-[#8A8A70]">
                        First {processedPreview.length} rows · how they'll be imported
                      </p>
                    </div>
                    <button
                      onClick={() => setMappingConfirmed(false)}
                      className="text-xs text-[#8A8A70] hover:text-[#5A5A40] transition-colors underline underline-offset-2"
                    >
                      Edit mapping
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#FAFAF7] border-b border-[#1A1A1A]/5">
                          {['Date', 'Amount', 'Category', 'Description', 'Paid By'].map((col) => (
                            <th key={col} className="px-4 py-3 text-left text-xs text-[#8A8A70] uppercase tracking-wider font-medium whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {processedPreview.map((row, i) => (
                          <tr key={i} className="border-b border-[#1A1A1A]/4 last:border-0">
                            <td className="px-4 py-3 text-[#1A1A1A] whitespace-nowrap">{row.date}</td>
                            <td className="px-4 py-3 text-[#1A1A1A] whitespace-nowrap">{row.amount}</td>
                            <td className="px-4 py-3 text-[#1A1A1A] whitespace-nowrap">
                              {row.category || <span className="text-[#C0C0B0]">—</span>}
                            </td>
                            <td className="px-4 py-3 text-[#1A1A1A] max-w-[200px] truncate">
                              {row.details || <span className="text-[#C0C0B0]">—</span>}
                            </td>
                            <td className="px-4 py-3 text-[#1A1A1A] whitespace-nowrap">{row.paidBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Import button */}
            {mappingConfirmed && (
              <div className="flex justify-end">
                <motion.button
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={handleImport}
                  className="flex items-center gap-2.5 px-8 py-3.5 bg-[#5A5A40] text-white rounded-full text-sm font-medium hover:bg-[#4A4A30] transition-colors shadow-lg shadow-[#5A5A40]/20"
                >
                  <Upload size={16} />
                  Import Expenses
                </motion.button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
