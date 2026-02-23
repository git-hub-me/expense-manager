import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, X } from 'lucide-react';
import StatsGrid from './StatsGrid';
import CategoryPie from './charts/CategoryPie';
import DailyBar from './charts/DailyBar';
import { formatCurrency, formatDate } from '../lib/constants';

function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-white rounded-3xl border border-[#1A1A1A]/5 p-6 animate-pulse ${className}`}>
      <div className="w-10 h-10 bg-[#F0F0E8] rounded-2xl mb-4" />
      <div className="w-24 h-3 bg-[#F0F0E8] rounded-full mb-2" />
      <div className="w-32 h-7 bg-[#E8E8E0] rounded-full" />
    </div>
  );
}

export default function Dashboard({ expenses, loading, onNavigateToHistory }) {
  const [dayPopup, setDayPopup] = useState(null); // { full, date, total }

  const currentMonthExpenses = useMemo(() => {
    const now = new Date();
    return expenses.filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [expenses]);

  const handleBarClick = (entry) => {
    setDayPopup(entry); // entry = { full: 'YYYY-MM-DD', date: 'D/M', total }
  };

  const handleViewHistory = () => {
    onNavigateToHistory?.(dayPopup.full);
    setDayPopup(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard className="h-80" />
          <SkeletonCard className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Day popup */}
      <AnimatePresence>
        {dayPopup && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDayPopup(null)}
              className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed inset-0 flex items-center justify-center z-50 px-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-4xl border border-[#1A1A1A]/5 shadow-2xl w-full max-w-sm p-8 text-center">
                <p className="text-xs text-[#8A8A70] uppercase tracking-widest mb-1">
                  {formatDate(dayPopup.full)}
                </p>
                <p className="font-serif text-4xl font-semibold text-[#1A1A1A] mb-1 tabular-nums">
                  {formatCurrency(dayPopup.total)}
                </p>
                <p className="text-sm text-[#8A8A70] mb-7">spent that day</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDayPopup(null)}
                    className="flex-1 py-3 border border-[#1A1A1A]/10 rounded-2xl text-sm font-medium text-[#6B6B50] hover:bg-[#F5F5F0] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <X size={14} /> Close
                  </button>
                  <button
                    onClick={handleViewHistory}
                    className="flex-1 py-3 bg-[#5A5A40] text-white rounded-2xl text-sm font-medium hover:bg-[#4A4A30] transition-colors flex items-center justify-center gap-1.5"
                  >
                    See History <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Page title */}
      <div>
        <h2 className="font-serif text-4xl font-semibold text-[#1A1A1A]">My Finances</h2>
        <p className="text-sm text-[#8A8A70] mt-1">
          {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <StatsGrid expenses={expenses} />

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pie */}
        <div className="bg-white rounded-3xl border border-[#1A1A1A]/5 p-6">
          <div className="mb-4">
            <h3 className="font-serif text-xl font-semibold text-[#1A1A1A]">By Category</h3>
            <p className="text-xs text-[#8A8A70]">This month</p>
          </div>
          <CategoryPie expenses={currentMonthExpenses} />
        </div>

        {/* Bar */}
        <div className="bg-white rounded-3xl border border-[#1A1A1A]/5 p-6">
          <div className="mb-4">
            <h3 className="font-serif text-xl font-semibold text-[#1A1A1A]">Daily Spending</h3>
            <p className="text-xs text-[#8A8A70]">Last 30 days</p>
          </div>
          <DailyBar expenses={expenses} onBarClick={handleBarClick} />
        </div>
      </div>
    </div>
  );
}
