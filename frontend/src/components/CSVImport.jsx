import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileText, X, CheckCircle, Download } from 'lucide-react';
import { importExpenses, exportToCSV } from '../lib/storage';
import { today } from '../lib/constants';

const ACCEPTED_COLS = [
  { key: 'Date / date', desc: 'Transaction date' },
  { key: 'Expense / Description', desc: 'What was purchased' },
  { key: 'Total cost / Amount', desc: 'Numeric value' },
  { key: 'Category', desc: 'One of our categories (optional)' },
  { key: 'PaidBy / Paid By', desc: 'Who paid (optional)' },
];

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

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
  return lines.slice(1).map((line) => {
    const vals = splitLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    return row;
  });
}

function rowToExpense(r) {
  const amountRaw =
    r['Total cost'] ?? r['total cost'] ?? r['Amount'] ?? r['amount'] ??
    r['Cost'] ?? r['cost'] ?? r['Total'] ?? r['total'] ?? '0';
  const amount = parseFloat(amountRaw) || 0;

  const rawDate = r['Date'] ?? r['date'] ?? r['DATE'] ?? today();
  let date = rawDate;
  try {
    const parsed = new Date(rawDate);
    if (!isNaN(parsed)) date = parsed.toISOString().split('T')[0];
  } catch { /* keep original */ }

  const details =
    r['Expense'] ?? r['expense'] ?? r['Description'] ?? r['description'] ??
    r['details'] ?? r['Note'] ?? r['note'] ?? '';

  const category = r['Category'] ?? r['category'] ?? 'Other';
  const paidBy = r['PaidBy'] ?? r['Paid By'] ?? r['paid_by'] ?? r['paidBy'] ?? 'Me';

  return { date, amount, category, details, paidBy };
}

export default function CSVImport({ expenses = [], onImport, showToast }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

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
    const reader = new FileReader();
    reader.onload = (e) => {
      const rows = parseCSV(e.target.result);
      setPreview(rows.slice(0, 5));
    };
    reader.readAsText(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleImport = () => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const rows = parseCSV(e.target.result);
        const imported = rows
          .map(rowToExpense)
          .filter((ex) => ex.amount > 0)
          .map((ex) => ({
            ...ex,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
          }));
        await importExpenses(imported);
        setResult({ imported: imported.length });
        onImport();
      } catch (err) {
        showToast(err.message || 'Import failed', 'error');
      }
    };
    reader.readAsText(file);
  };

  const reset = () => {
    setFile(null);
    setPreview([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
                        {(file.size / 1024).toFixed(1)} KB
                        {preview.length > 0 && ` · ${preview.length} preview rows`}
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
                  <p className="text-xs text-[#8A8A70]">CSV · max 10 MB</p>
                </div>
              )}
            </div>

            {/* Expected format */}
            <div className="bg-white rounded-3xl border border-[#1A1A1A]/5 p-6">
              <h4 className="font-serif text-lg font-semibold text-[#1A1A1A] mb-4">Expected Columns</h4>
              <div className="space-y-2">
                {ACCEPTED_COLS.map(({ key, desc }) => (
                  <div key={key} className="flex items-center gap-3">
                    <code className="text-xs bg-[#F5F5F0] border border-[#1A1A1A]/5 px-2 py-1 rounded-lg font-mono text-[#5A5A40]">
                      {key}
                    </code>
                    <span className="text-xs text-[#8A8A70]">{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview table */}
            <AnimatePresence>
              {preview.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-white rounded-3xl border border-[#1A1A1A]/5 overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-[#1A1A1A]/5">
                    <h4 className="font-serif text-lg font-semibold text-[#1A1A1A]">Preview</h4>
                    <p className="text-xs text-[#8A8A70]">First {preview.length} rows</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#FAFAF7] border-b border-[#1A1A1A]/5">
                          {Object.keys(preview[0]).map((col) => (
                            <th key={col} className="px-4 py-3 text-left text-xs text-[#8A8A70] uppercase tracking-wider font-medium whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i} className="border-b border-[#1A1A1A]/4 last:border-0">
                            {Object.values(row).map((val, j) => (
                              <td key={j} className="px-4 py-3 text-[#1A1A1A] whitespace-nowrap">
                                {val || <span className="text-[#C0C0B0]">—</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Import button */}
            {file && (
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
