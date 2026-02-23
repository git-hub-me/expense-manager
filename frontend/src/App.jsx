import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus } from 'lucide-react';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import History from './components/History';
import CSVImport from './components/CSVImport';
import AIEntry from './components/AIEntry';
import PendingExpense from './components/PendingExpense';
import Settings from './components/Settings';
import {
  getExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  bulkDeleteExpenses,
  seedSampleData,
} from './lib/storage';

export default function App() {
  const [view, setView] = useState('dashboard');
  const [expenses, setExpenses] = useState([]);
  const [showAIEntry, setShowAIEntry] = useState(false);
  const [pendingExpense, setPendingExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [historyDateFilter, setHistoryDateFilter] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Load from native storage (seed sample data on first run) ────────────

  const loadExpenses = useCallback(async () => {
    try {
      setExpenses(await getExpenses());
    } catch {
      showToast('Could not load expenses.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await seedSampleData();
      await loadExpenses();
    })();
  }, [loadExpenses]);

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const handleAdd = async (data) => {
    const exp = await addExpense(data);
    setExpenses((prev) => [exp, ...prev]);
    return exp;
  };

  const handleUpdate = async (id, updates) => {
    const updated = await updateExpense(id, updates);
    setExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));
    return updated;
  };

  const handleDelete = async (id) => {
    await deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const handleBulkDelete = async (ids) => {
    await bulkDeleteExpenses(ids);
    setExpenses((prev) => prev.filter((e) => !ids.includes(e.id)));
  };

  // ── AI flow ───────────────────────────────────────────────────────────────

  const handleAIExtract = (extracted) => {
    setPendingExpense(extracted);
    setShowAIEntry(false);
  };

  const handleConfirm = async (expenseData) => {
    try {
      await handleAdd(expenseData);
      setPendingExpense(null);
      showToast('Expense saved!');
    } catch {
      showToast('Failed to save expense.', 'error');
    }
  };

  // ── Dashboard bar-click → navigate to History with date filter ──────────

  const handleNavigateToHistory = (dateStr) => {
    setHistoryDateFilter(dateStr);
    setView('history');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#F5F5F0]">
      <Navigation
        view={view}
        setView={setView}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* pb-44: clears bottom nav + FAB + safe area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-44">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <Dashboard
                expenses={expenses}
                loading={loading}
                onNavigateToHistory={handleNavigateToHistory}
              />
            </motion.div>
          )}

          {view === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <History
                expenses={expenses}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onBulkDelete={handleBulkDelete}
                showToast={showToast}
                filterDateProp={historyDateFilter}
                onClearDateFilter={() => setHistoryDateFilter('')}
              />
            </motion.div>
          )}

          {view === 'data' && (
            <motion.div
              key="data"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <CSVImport
                expenses={expenses}
                onImport={() => {
                  loadExpenses();
                  showToast('CSV imported successfully!');
                }}
                showToast={showToast}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Action Button */}
      <motion.button
        onClick={() => setShowAIEntry(true)}
        className="fixed right-6 w-16 h-16 bg-[#5A5A40] text-white rounded-full shadow-xl flex items-center justify-center z-40 bottom-safe-8"
        whileHover={{ scale: 1.06, backgroundColor: '#4A4A30' }}
        whileTap={{ scale: 0.94 }}
        title="Add expense with AI"
      >
        <Plus size={28} strokeWidth={2} />
      </motion.button>

      {/* AI Entry Modal */}
      <AnimatePresence>
        {showAIEntry && (
          <AIEntry onExtract={handleAIExtract} onClose={() => setShowAIEntry(false)} />
        )}
      </AnimatePresence>

      {/* Pending Expense Confirmation */}
      <AnimatePresence>
        {pendingExpense && (
          <PendingExpense
            expense={pendingExpense}
            onSave={handleConfirm}
            onCancel={() => setPendingExpense(null)}
          />
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <Settings
            onClose={() => setShowSettings(false)}
            onDataCleared={() => {
              loadExpenses();
              showToast('All data cleared.');
            }}
          />
        )}
      </AnimatePresence>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed right-6 z-50 px-5 py-3 rounded-2xl text-sm font-medium shadow-lg bottom-safe-toast ${
              toast.type === 'error'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-[#5A5A40] text-white'
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
