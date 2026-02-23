import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Zap, Loader2, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { getSettings, saveSettings, clearAllExpenses } from '../lib/storage';

const MODELS = [
  {
    id: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash Lite',
    desc: 'Fast · economical',
  },
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    desc: 'More accurate · slightly slower',
  },
];

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export default function Settings({ onClose, onDataCleared }) {
  const [settings, setSettings] = useState(getSettings);
  const [testState, setTestState] = useState(null); // null | 'loading' | 'ok' | 'error'
  const [testMsg, setTestMsg] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const selectModel = (id) => {
    const next = { ...settings, model: id };
    setSettings(next);
    saveSettings(next);
    setTestState(null);
  };

  const testModel = async () => {
    if (!GEMINI_API_KEY) {
      setTestState('error');
      setTestMsg('VITE_GEMINI_API_KEY is not set');
      return;
    }
    setTestState('loading');
    setTestMsg('');
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Reply with exactly one word: Hello' }] }],
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'API error');
      const reply = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '(no response)';
      setTestState('ok');
      setTestMsg(`Model replied: "${reply}"`);
    } catch (e) {
      setTestState('error');
      setTestMsg(e.message || 'Request failed');
    }
  };

  const handleClearAll = async () => {
    await clearAllExpenses();
    setConfirmClear(false);
    onDataCleared();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-[#1A1A1A]/50 backdrop-blur-sm z-50"
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="fixed inset-0 flex items-center justify-center z-50 px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-4xl border border-[#1A1A1A]/5 shadow-2xl w-full max-w-md p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-semibold text-[#1A1A1A]">Settings</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl border border-[#1A1A1A]/8 text-[#8A8A70] flex items-center justify-center hover:bg-[#F5F5F0] transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Model selection */}
          <div>
            <p className="text-xs text-[#8A8A70] uppercase tracking-widest font-medium mb-3">AI Model</p>
            <div className="space-y-2">
              {MODELS.map((m) => {
                const active = settings.model === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => selectModel(m.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      active
                        ? 'border-[#5A5A40]/40 bg-[#5A5A40]/5'
                        : 'border-[#1A1A1A]/8 hover:border-[#5A5A40]/20 hover:bg-[#5A5A40]/2'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-medium ${active ? 'text-[#5A5A40]' : 'text-[#1A1A1A]'}`}>
                          {m.label}
                        </p>
                        <p className="text-xs text-[#8A8A70] mt-0.5">{m.desc}</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                        active ? 'border-[#5A5A40] bg-[#5A5A40]' : 'border-[#C5C5B0]'
                      }`}>
                        {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Test button */}
            <div className="mt-3 space-y-2">
              <button
                onClick={testModel}
                disabled={testState === 'loading'}
                className="flex items-center gap-2 px-4 py-2.5 border border-[#1A1A1A]/10 rounded-xl text-sm font-medium text-[#5A5A40] hover:bg-[#5A5A40]/5 transition-colors disabled:opacity-50"
              >
                {testState === 'loading' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Zap size={14} />
                )}
                Test model
              </button>

              {testState === 'ok' && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700"
                >
                  <CheckCircle size={13} className="shrink-0" />
                  {testMsg}
                </motion.div>
              )}
              {testState === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600"
                >
                  <AlertCircle size={13} className="shrink-0" />
                  {testMsg}
                </motion.div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#1A1A1A]/6" />

          {/* Danger zone */}
          <div>
            <p className="text-xs text-[#8A8A70] uppercase tracking-widest font-medium mb-3">Danger Zone</p>
            {!confirmClear ? (
              <button
                onClick={() => setConfirmClear(true)}
                className="flex items-center gap-2 px-4 py-2.5 border border-red-200 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors w-full"
              >
                <Trash2 size={14} />
                Clear all expense data
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border border-red-200 rounded-2xl"
              >
                <p className="text-sm font-medium text-red-700 mb-3">This cannot be undone.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="flex-1 py-2 border border-red-200 rounded-xl text-sm text-red-500 hover:bg-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
                  >
                    Delete All
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
