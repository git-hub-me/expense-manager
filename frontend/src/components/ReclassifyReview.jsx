import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { X, ArrowRight, Check } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_BG, CATEGORY_ICONS } from '../lib/constants';

function ConfidenceBadge({ value }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.9 ? '#4AB870' : '#E8824A';
  const bg = value >= 0.9 ? '#EAF7EF' : '#FDF1EA';
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ color, backgroundColor: bg }}
    >
      {pct}%
    </span>
  );
}

function CategoryChip({ category }) {
  const color = CATEGORY_COLORS[category] || '#8A8A70';
  const bg = CATEGORY_BG[category] || '#F2F2EE';
  const Icon = CATEGORY_ICONS[category] || CATEGORY_ICONS.Other;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ backgroundColor: bg, color }}
    >
      <Icon size={10} strokeWidth={2} />
      {category}
    </span>
  );
}

export default function ReclassifyReview({ proposals, expenseMap, onApply, onClose }) {
  const [selected, setSelected] = useState(() => new Set(proposals.map((p) => p.transaction_id)));

  const allChecked = selected.size === proposals.length;

  const toggleAll = () => {
    if (allChecked) {
      setSelected(new Set());
    } else {
      setSelected(new Set(proposals.map((p) => p.transaction_id)));
    }
  };

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const approvedChanges = useMemo(
    () => proposals.filter((p) => selected.has(p.transaction_id)),
    [proposals, selected]
  );

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm z-50"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="fixed inset-0 flex items-center justify-center z-50 px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-4xl border border-[#1A1A1A]/5 shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-start justify-between p-8 pb-4 shrink-0">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-[#1A1A1A]">Review AI Suggestions</h2>
              <p className="text-xs text-[#8A8A70] mt-0.5">
                {proposals.length} change{proposals.length !== 1 ? 's' : ''} suggested · select which to apply
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl border border-[#1A1A1A]/8 text-[#8A8A70] flex items-center justify-center hover:bg-[#F5F5F0] transition-colors shrink-0"
            >
              <X size={15} />
            </button>
          </div>

          {/* Select all row */}
          <div className="px-8 py-2 border-b border-[#1A1A1A]/6 shrink-0">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={toggleAll}
                className="w-4 h-4 rounded accent-[#5A5A40]"
              />
              <span className="text-xs font-medium text-[#6B6B50]">
                {allChecked ? 'Deselect all' : 'Select all'}
              </span>
              <span className="ml-auto text-xs text-[#8A8A70]">{selected.size} selected</span>
            </label>
          </div>

          {/* Proposals list */}
          <div className="overflow-y-auto flex-1 px-8 py-3 space-y-2">
            {proposals.map((p) => {
              const expense = expenseMap.get(p.transaction_id);
              const beforeCat = expense?.category ?? '—';
              const afterCat = p.new_category;
              const description = expense?.details ?? p.transaction_id;
              const isChecked = selected.has(p.transaction_id);

              return (
                <label
                  key={p.transaction_id}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    isChecked
                      ? 'border-[#5A5A40]/30 bg-[#5A5A40]/4'
                      : 'border-[#1A1A1A]/6 hover:border-[#1A1A1A]/12 hover:bg-[#F5F5F0]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(p.transaction_id)}
                    className="w-4 h-4 rounded accent-[#5A5A40] shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#1A1A1A] truncate font-medium">{description}</p>
                    {p.new_description && p.new_description !== description && (
                      <p className="text-xs text-[#8A8A70] truncate mt-0.5">
                        → "{p.new_description}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {beforeCat !== afterCat ? (
                      <>
                        <CategoryChip category={beforeCat} />
                        <ArrowRight size={12} className="text-[#B0B098]" />
                        <CategoryChip category={afterCat} />
                      </>
                    ) : (
                      <CategoryChip category={afterCat} />
                    )}
                    {p.new_subcategory && (
                      <span className="text-[10px] bg-[#5A5A40]/8 text-[#5A5A40] font-medium px-2 py-0.5 rounded-full">
                        + {p.new_subcategory}
                      </span>
                    )}
                    <ConfidenceBadge value={p.confidence} />
                  </div>
                </label>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="p-8 pt-4 border-t border-[#1A1A1A]/6 flex gap-3 shrink-0">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-[#1A1A1A]/10 rounded-2xl text-sm font-medium text-[#6B6B50] hover:bg-[#F5F5F0] transition-colors"
            >
              Reject All
            </button>
            <button
              onClick={() => onApply(approvedChanges)}
              disabled={selected.size === 0}
              className="flex-1 py-3 bg-[#5A5A40] text-white rounded-2xl text-sm font-medium hover:bg-[#4A4A30] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Check size={14} />
              Apply {selected.size > 0 ? selected.size : ''} Selected
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
