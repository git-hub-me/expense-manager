import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { CATEGORIES, CATEGORY_COLORS, CATEGORY_BG, CATEGORY_ICONS, formatCurrency, today } from '../lib/constants';

const FIELD_CLS =
  'w-full h-11 border border-[#1A1A1A]/10 rounded-xl px-3 text-sm bg-[#FAFAF7] focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40]/30 transition-all';

export default function PendingExpense({ expense, onSave, onCancel }) {
  const initialCategory = expense?.category || 'Other';
  const isInitialCustom = initialCategory !== '' && !CATEGORIES.includes(initialCategory);

  const [form, setForm] = useState({
    date: expense?.date || today(),
    amount: expense?.amount ?? '',
    category: isInitialCustom ? 'Other' : initialCategory,
    details: expense?.details || '',
    paidBy: expense?.paidBy || 'Me',
  });
  const [customCategory, setCustomCategory] = useState(isInitialCustom ? initialCategory : '');
  const [saving, setSaving] = useState(false);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    const resolvedCategory =
      form.category === 'Other' && customCategory.trim()
        ? customCategory.trim()
        : form.category;
    try {
      await onSave({ ...form, amount: parseFloat(form.amount) || 0, category: resolvedCategory });
    } finally {
      setSaving(false);
    }
  };

  const color = CATEGORY_COLORS[form.category] || '#8A8A70';
  const bg = CATEGORY_BG[form.category] || '#F2F2EE';
  const CatIcon = CATEGORY_ICONS[form.category] || CATEGORY_ICONS.Other;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="fixed inset-0 bg-[#1A1A1A]/50 backdrop-blur-sm z-50"
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="fixed inset-0 flex items-center justify-center z-50 px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-4xl border border-[#1A1A1A]/5 shadow-2xl w-full max-w-md p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: bg }}>
              <CatIcon size={18} style={{ color }} strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-semibold text-[#1A1A1A]">Review Expense</h2>
              <p className="text-xs text-[#8A8A70]">AI extracted · edit if needed</p>
            </div>
          </div>

          {/* Amount spotlight */}
          <div className="text-center mb-5 py-5 rounded-3xl" style={{ backgroundColor: bg }}>
            <p className="text-[10px] text-[#8A8A70] uppercase tracking-widest mb-1.5">Amount</p>
            <p className="font-serif text-5xl font-semibold tabular-nums" style={{ color }}>
              {formatCurrency(parseFloat(form.amount) || 0)}
            </p>
          </div>

          {/* Fields */}
          <div className="space-y-3">
            {/* Amount full width */}
            <div>
              <label className="block text-xs text-[#8A8A70] uppercase tracking-wider mb-1.5 font-medium">
                Amount
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                className={FIELD_CLS}
                placeholder="0"
              />
            </div>

            {/* Date + Category side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#8A8A70] uppercase tracking-wider mb-1.5 font-medium">
                  Date
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => set('date', e.target.value)}
                  className={FIELD_CLS}
                />
              </div>
              <div>
                <label className="block text-xs text-[#8A8A70] uppercase tracking-wider mb-1.5 font-medium">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => { set('category', e.target.value); setCustomCategory(''); }}
                  className={FIELD_CLS}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {form.category === 'Other' && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="e.g. Rent, Insurance…"
                className={FIELD_CLS}
              />
            )}

            {/* Details */}
            <div>
              <label className="block text-xs text-[#8A8A70] uppercase tracking-wider mb-1.5 font-medium">
                Details
              </label>
              <input
                type="text"
                value={form.details}
                onChange={(e) => set('details', e.target.value)}
                placeholder="Description"
                className={FIELD_CLS}
              />
            </div>

            {/* Paid By */}
            <div>
              <label className="block text-xs text-[#8A8A70] uppercase tracking-wider mb-1.5 font-medium">
                Paid By
              </label>
              <input
                type="text"
                value={form.paidBy}
                onChange={(e) => set('paidBy', e.target.value)}
                placeholder="Me"
                className={FIELD_CLS}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onCancel}
              className="flex-1 py-3 border border-[#1A1A1A]/10 rounded-2xl text-sm font-medium text-[#6B6B50] hover:bg-[#F5F5F0] transition-colors flex items-center justify-center gap-2"
            >
              <X size={14} /> Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.amount}
              className="flex-1 py-3 bg-[#5A5A40] text-white rounded-2xl text-sm font-medium hover:bg-[#4A4A30] transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Check size={14} />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
