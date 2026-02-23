import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { today } from '../lib/constants';
import { getSettings } from '../lib/storage';

const EXAMPLES = [
  'Spent ₹450 on groceries today',
  'Uber ride to office ₹120, yesterday',
  'Electricity bill ₹2800 this month',
  'Doctor appointment ₹500 this morning',
];

const VALID_CATEGORIES = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Health', 'Other'];
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

async function extractExpense(text) {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY is not set in frontend/.env.local');
  }
  const { model } = getSettings();

  const todayStr = today();
  const prompt = `Extract expense information from the text below. Return ONLY valid JSON — no markdown, no explanation.

Text: "${text}"
Today's date: ${todayStr}

Return exactly this JSON shape:
{
  "date": "YYYY-MM-DD",
  "amount": 0,
  "category": "Food",
  "details": "brief description",
  "paidBy": "Me"
}

Rules:
- date: use today (${todayStr}) when not mentioned
- amount: numeric value only, no currency symbols
- category: one of Food | Transport | Utilities | Entertainment | Shopping | Health | Other
- details: clean, concise description
- paidBy: "Me" unless explicitly stated`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
    }
  );

  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? 'Gemini API error');

  const raw = (json.candidates?.[0]?.content?.parts?.[0]?.text ?? '')
    .trim()
    .replace(/```json\n?|\n?```/g, '')
    .trim();

  let extracted;
  try {
    extracted = JSON.parse(raw);
  } catch {
    throw new Error('Couldn\'t parse response. Try again.');
  }

  if (!VALID_CATEGORIES.includes(extracted.category)) extracted.category = 'Other';
  extracted.amount = parseFloat(extracted.amount) || 0;
  if (extracted.amount <= 0) {
    throw new Error('No amount found. Try: "spent ₹500".');
  }

  return extracted;
}

export default function AIEntry({ onExtract, onClose }) {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef(null);

  const handleExtract = async (input) => {
    const trimmed = (input || text).trim();
    if (!trimmed) return;
    setIsProcessing(true);
    setError('');
    try {
      const data = await extractExpense(trimmed);
      onExtract(data);
    } catch (e) {
      setError(e.message || 'Could not parse the expense. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleExtract();
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm z-40"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="fixed inset-0 flex items-center justify-center z-50 px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-4xl border border-[#1A1A1A]/5 shadow-2xl w-full max-w-lg p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#5A5A40]/10 flex items-center justify-center">
                <Sparkles size={18} className="text-[#5A5A40]" strokeWidth={1.8} />
              </div>
              <div>
                <h2 className="font-serif text-2xl font-semibold text-[#1A1A1A]">AI Expense Entry</h2>
                <p className="text-xs text-[#8A8A70]">Describe any expense in plain English</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl border border-[#1A1A1A]/8 text-[#8A8A70] flex items-center justify-center hover:bg-[#F5F5F0] transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Textarea */}
          <div className="relative mb-4">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => { setText(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Spent $45 on lunch at the Italian place near the office today"
              rows={4}
              disabled={isProcessing}
              className="w-full border border-[#1A1A1A]/10 rounded-2xl px-4 py-3.5 text-sm text-[#1A1A1A] placeholder-[#B0B098] resize-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40]/30 transition-all disabled:opacity-50 bg-[#FAFAF7]"
            />
            <p className="absolute bottom-3 right-3 text-[10px] text-[#B0B098] hidden sm:block">⌘↵ to submit</p>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5 mb-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600"
            >
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Examples */}
          <div className="mb-6">
            <p className="text-xs text-[#8A8A70] mb-2.5">Try an example:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => { setText(ex); textareaRef.current?.focus(); }}
                  disabled={isProcessing}
                  className="text-xs px-3 py-1.5 rounded-full border border-[#1A1A1A]/8 text-[#6B6B50] hover:border-[#5A5A40]/30 hover:text-[#5A5A40] hover:bg-[#5A5A40]/5 transition-all disabled:opacity-40"
                >
                  {ex.length > 40 ? ex.slice(0, 40) + '…' : ex}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-[#1A1A1A]/10 rounded-2xl text-sm font-medium text-[#6B6B50] hover:bg-[#F5F5F0] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleExtract()}
              disabled={!text.trim() || isProcessing}
              className="flex-1 py-3 bg-[#5A5A40] text-white rounded-2xl text-sm font-medium hover:bg-[#4A4A30] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <><Loader2 size={15} className="animate-spin" />Extracting…</>
              ) : (
                <><Sparkles size={15} />Record</>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
