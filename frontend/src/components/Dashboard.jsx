import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import StatsGrid from './StatsGrid';
import CategoryPie from './charts/CategoryPie';
import DailyBar from './charts/DailyBar';
import MonthlyBar from './charts/MonthlyBar';
import { formatCurrency, formatDate, CATEGORIES, CATEGORY_COLORS, CATEGORY_BG, CATEGORY_ICONS } from '../lib/constants';

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

  const now = new Date();

  const currentMonthExpenses = useMemo(() => {
    const m = now.getMonth();
    const y = now.getFullYear();
    return expenses.filter((e) => {
      const parts = (e.date ?? '').split('-');
      return parseInt(parts[0]) === y && parseInt(parts[1]) - 1 === m;
    });
  }, [expenses]);

  const lastMonthExpenses = useMemo(() => {
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const m = lm.getMonth();
    const y = lm.getFullYear();
    return expenses.filter((e) => {
      const parts = (e.date ?? '').split('-');
      return parseInt(parts[0]) === y && parseInt(parts[1]) - 1 === m;
    });
  }, [expenses]);

  // Category comparison: this month (MTD) vs last month (full)
  const categoryComparison = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const mtd = currentMonthExpenses.filter((e) => e.category === cat).reduce((s, e) => s + (e.amount ?? 0), 0);
      const last = lastMonthExpenses.filter((e) => e.category === cat).reduce((s, e) => s + (e.amount ?? 0), 0);
      return { cat, mtd: Math.round(mtd), last: Math.round(last) };
    }).filter((r) => r.mtd > 0 || r.last > 0);
  }, [currentMonthExpenses, lastMonthExpenses]);

  // Subcategory breakdown for current month
  const subcategoryData = useMemo(() => {
    const subTotals = {};
    const subParent = {};
    currentMonthExpenses.forEach((e) => {
      if (!e.subcategory) return;
      subTotals[e.subcategory] = (subTotals[e.subcategory] || 0) + (e.amount ?? 0);
      subParent[e.subcategory] = e.category;
    });
    return Object.entries(subTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([name, total]) => ({ name, total, category: subParent[name] }));
  }, [currentMonthExpenses]);

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SkeletonCard />
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

      {/* Subcategory tiles */}
      {subcategoryData.length > 0 && (
        <div>
          <div className="mb-3">
            <h3 className="font-serif text-xl font-semibold text-[#1A1A1A]">By Subcategory</h3>
            <p className="text-xs text-[#8A8A70]">This month</p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
            {subcategoryData.map(({ name, total, category }) => {
              const color = CATEGORY_COLORS[category] || '#8A8A70';
              const bg = CATEGORY_BG[category] || '#F2F2EE';
              const Icon = CATEGORY_ICONS[category] || CATEGORY_ICONS.Other;
              return (
                <div
                  key={name}
                  className="shrink-0 bg-white rounded-2xl border border-[#1A1A1A]/5 px-4 py-3.5 flex flex-col gap-2 min-w-[120px]"
                >
                  <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: bg }}
                  >
                    <Icon size={13} strokeWidth={2} style={{ color }} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#1A1A1A] leading-tight">{name}</p>
                    <p className="text-xs text-[#8A8A70] mt-0.5">{category}</p>
                  </div>
                  <p className="font-serif text-lg font-semibold text-[#1A1A1A] tabular-nums leading-none">
                    {formatCurrency(total)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly trend — full-width stacked bar */}
      <div className="bg-white rounded-3xl border border-[#1A1A1A]/5 p-6">
        <div className="mb-4">
          <h3 className="font-serif text-xl font-semibold text-[#1A1A1A]">Monthly Trend</h3>
          <p className="text-xs text-[#8A8A70]">Last 6 months by category · current month is MTD</p>
        </div>
        <MonthlyBar expenses={expenses} />
      </div>

      {/* Category comparison: MTD vs last month */}
      {categoryComparison.length > 0 && (
        <div className="bg-white rounded-3xl border border-[#1A1A1A]/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1A1A1A]/5 flex items-end justify-between">
            <div>
              <h3 className="font-serif text-xl font-semibold text-[#1A1A1A]">Category Comparison</h3>
              <p className="text-xs text-[#8A8A70] mt-0.5">This month (MTD) vs last month</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-[#8A8A70] mb-0.5">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#5A5A40]" />MTD
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#D0D0C0]" />Last month
              </span>
            </div>
          </div>
          <div className="divide-y divide-[#1A1A1A]/4">
            {categoryComparison.map(({ cat, mtd, last }) => {
              const maxVal = Math.max(mtd, last, 1);
              const diff = last > 0 ? Math.round(((mtd - last) / last) * 100) : null;
              const Icon = CATEGORY_ICONS[cat];
              const color = CATEGORY_COLORS[cat];
              const bg = CATEGORY_BG[cat];
              return (
                <div key={cat} className="px-6 py-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
                      <Icon size={13} strokeWidth={2} style={{ color }} />
                    </div>
                    <span className="text-sm font-medium text-[#1A1A1A] flex-1">{cat}</span>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#1A1A1A] tabular-nums">{formatCurrency(mtd)}</p>
                      {diff !== null && (
                        <p className={`text-[10px] flex items-center justify-end gap-0.5 ${diff > 0 ? 'text-rose-500' : diff < 0 ? 'text-emerald-600' : 'text-[#8A8A70]'}`}>
                          {diff > 0 ? <TrendingUp size={10} /> : diff < 0 ? <TrendingDown size={10} /> : <Minus size={10} />}
                          {diff > 0 ? '+' : ''}{diff}%
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Dual progress bars */}
                  <div className="space-y-1">
                    <div className="h-1.5 rounded-full bg-[#F0F0E8] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(mtd / maxVal) * 100}%`, backgroundColor: color }}
                      />
                    </div>
                    <div className="h-1.5 rounded-full bg-[#F0F0E8] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all bg-[#D0D0C0]"
                        style={{ width: `${(last / maxVal) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily spending + category pie */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl border border-[#1A1A1A]/5 p-6">
          <div className="mb-4">
            <h3 className="font-serif text-xl font-semibold text-[#1A1A1A]">By Category</h3>
            <p className="text-xs text-[#8A8A70]">This month</p>
          </div>
          <CategoryPie expenses={currentMonthExpenses} />
        </div>

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
