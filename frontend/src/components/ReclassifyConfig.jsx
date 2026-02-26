import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Wand2 } from 'lucide-react';

const MODES = [
  {
    id: 'conservative',
    label: 'Conservative',
    description: 'Uses existing categories only. Safe and focused.',
  },
  {
    id: 'deep',
    label: 'Deep Cleanup',
    description: 'May suggest subcategories and consolidations.',
    disabled: true,
    tag: 'Phase 2',
  },
];

export default function ReclassifyConfig({ onConfirm, onClose, expenseCount }) {
  const [mode, setMode] = useState('conservative');
  const [days, setDays] = useState('30');
  const [allHistory, setAllHistory] = useState(false);

  const daysNum = parseInt(days, 10);
  const daysValid = !isNaN(daysNum) && daysNum >= 1;
  const canSubmit = allHistory || daysValid;

  const handleConfirm = () => {
    onConfirm({ mode, scope: allHistory ? 'all' : daysNum });
  };

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
        <div className="bg-white rounded-4xl border border-[#1A1A1A]/5 shadow-2xl w-full max-w-md p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#5A5A40]/10 flex items-center justify-center">
                <Wand2 size={18} className="text-[#5A5A40]" strokeWidth={1.8} />
              </div>
              <div>
                <h2 className="font-serif text-2xl font-semibold text-[#1A1A1A]">Reclassify with AI</h2>
                <p className="text-xs text-[#8A8A70]">Review & improve expense categories</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl border border-[#1A1A1A]/8 text-[#8A8A70] flex items-center justify-center hover:bg-[#F5F5F0] transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Mode */}
          <div className="mb-5">
            <p className="text-xs font-medium text-[#8A8A70] uppercase tracking-wider mb-3">Mode</p>
            <div className="space-y-2">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => !m.disabled && setMode(m.id)}
                  disabled={m.disabled}
                  className={`w-full text-left flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${
                    m.disabled
                      ? 'opacity-40 cursor-not-allowed border-[#1A1A1A]/6 bg-[#F5F5F0]'
                      : mode === m.id
                      ? 'border-[#5A5A40]/40 bg-[#5A5A40]/5'
                      : 'border-[#1A1A1A]/8 hover:border-[#1A1A1A]/15 hover:bg-[#F5F5F0]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                      mode === m.id && !m.disabled ? 'border-[#5A5A40]' : 'border-[#B0B098]'
                    }`}
                  >
                    {mode === m.id && !m.disabled && (
                      <div className="w-2 h-2 rounded-full bg-[#5A5A40]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#1A1A1A]">{m.label}</span>
                      {m.tag && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#5A5A40]/10 text-[#5A5A40] font-medium">
                          {m.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#8A8A70] mt-0.5">{m.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Scope */}
          <div className="mb-6">
            <p className="text-xs font-medium text-[#8A8A70] uppercase tracking-wider mb-3">Scope</p>

            {/* Days input */}
            <div
              className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                allHistory
                  ? 'opacity-40 pointer-events-none border-[#1A1A1A]/6 bg-[#F5F5F0]'
                  : 'border-[#1A1A1A]/10 bg-white'
              }`}
            >
              <span className="text-sm text-[#6B6B50]">Last</span>
              <input
                type="number"
                min="1"
                max="3650"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                disabled={allHistory}
                className="w-20 text-center border border-[#1A1A1A]/10 rounded-xl px-2 py-1.5 text-sm font-semibold text-[#1A1A1A] bg-[#FAFAF7] focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40]/30 transition-all outline-none tabular-nums"
              />
              <span className="text-sm text-[#6B6B50]">days</span>
              {daysValid && !allHistory && (
                <span className="ml-auto text-xs text-[#8A8A70]">
                  {expenseCount > 0 ? `up to ${expenseCount} expenses` : ''}
                </span>
              )}
            </div>

            {/* All history toggle */}
            <label className="flex items-center gap-2.5 mt-3 ml-1 cursor-pointer">
              <input
                type="checkbox"
                checked={allHistory}
                onChange={(e) => setAllHistory(e.target.checked)}
                className="w-4 h-4 rounded accent-[#5A5A40]"
              />
              <span className="text-sm text-[#6B6B50]">
                Analyze all history
                {expenseCount > 0 && (
                  <span className="text-[#8A8A70] ml-1">({expenseCount} expenses)</span>
                )}
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-[#1A1A1A]/10 rounded-2xl text-sm font-medium text-[#6B6B50] hover:bg-[#F5F5F0] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canSubmit}
              className="flex-1 py-3 bg-[#5A5A40] text-white rounded-2xl text-sm font-medium hover:bg-[#4A4A30] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Wand2 size={14} />
              Analyze
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
