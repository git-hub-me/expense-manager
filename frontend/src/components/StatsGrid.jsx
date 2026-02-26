import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, CalendarDays } from 'lucide-react';
import { formatCurrency, CATEGORY_COLORS, CATEGORY_ICONS } from '../lib/constants';

function StatCard({ icon: Icon, label, value, sub, color, valueClassName = '' }) {
  return (
    <div className="bg-white rounded-3xl border border-[#1A1A1A]/5 p-6 flex flex-col gap-4">
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: (color || '#5A5A40') + '15' }}
      >
        <Icon size={18} style={{ color: color || '#5A5A40' }} strokeWidth={1.8} />
      </div>
      <div>
        <p className="text-xs text-[#8A8A70] uppercase tracking-widest font-medium mb-1">{label}</p>
        <p className={`font-serif text-3xl font-semibold leading-none tabular-nums ${valueClassName || 'text-[#1A1A1A]'}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-[#8A8A70] mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

// Returns the most recent Monday (or the date itself if it's Monday)
function getWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function StatsGrid({ expenses }) {
  const stats = useMemo(() => {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();

    // ── Monthly ───────────────────────────────────────────────────────────
    const monthly = expenses.filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === m && d.getFullYear() === y;
    });
    const total = monthly.reduce((s, e) => s + (e.amount ?? 0), 0);

    // Last month
    const lm = new Date(y, m - 1, 1);
    const lastMonthly = expenses.filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    });
    const lastTotal = lastMonthly.reduce((s, e) => s + (e.amount ?? 0), 0);

    let momPct = null;
    let momDir = 'same';
    if (lastTotal > 0) {
      momPct = ((total - lastTotal) / lastTotal) * 100;
      momDir = momPct > 1 ? 'up' : momPct < -1 ? 'down' : 'same';
    }

    // Top category
    const catTotals = {};
    monthly.forEach((e) => {
      catTotals[e.category] = (catTotals[e.category] || 0) + (e.amount ?? 0);
    });
    const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];

    // ── Week-to-date ──────────────────────────────────────────────────────
    const todayStr = now.toISOString().split('T')[0];
    const thisMonday = getWeekMonday(now);
    const thisMondayStr = thisMonday.toISOString().split('T')[0];

    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(lastMonday.getDate() - 7);
    const lastMondayStr = lastMonday.toISOString().split('T')[0];

    const lastWeekSameDay = new Date(now);
    lastWeekSameDay.setDate(lastWeekSameDay.getDate() - 7);
    const lastWeekSameDayStr = lastWeekSameDay.toISOString().split('T')[0];

    const thisWeekTotal = expenses
      .filter((e) => (e.date ?? '') >= thisMondayStr && (e.date ?? '') <= todayStr)
      .reduce((s, e) => s + (e.amount ?? 0), 0);

    const lastWeekTDTotal = expenses
      .filter((e) => (e.date ?? '') >= lastMondayStr && (e.date ?? '') <= lastWeekSameDayStr)
      .reduce((s, e) => s + (e.amount ?? 0), 0);

    let wowPct = null;
    let wowDir = 'same';
    if (lastWeekTDTotal > 0) {
      wowPct = ((thisWeekTotal - lastWeekTDTotal) / lastWeekTDTotal) * 100;
      wowDir = wowPct > 1 ? 'up' : wowPct < -1 ? 'down' : 'same';
    }

    return {
      total, momPct, momDir, lastTotal, topCat, count: monthly.length,
      thisWeekTotal, lastWeekTDTotal, wowPct, wowDir,
    };
  }, [expenses]);

  const monthName = new Date().toLocaleString('default', { month: 'long' });
  const lastMonthName = new Date(
    new Date().getFullYear(),
    new Date().getMonth() - 1,
    1
  ).toLocaleString('default', { month: 'long' });

  const MomIcon = stats.momDir === 'up' ? TrendingUp : stats.momDir === 'down' ? TrendingDown : Minus;
  const WowIcon = stats.wowDir === 'up' ? TrendingUp : stats.wowDir === 'down' ? TrendingDown : CalendarDays;
  const TopCatIcon = stats.topCat
    ? (CATEGORY_ICONS[stats.topCat[0]] || CATEGORY_ICONS.Other)
    : CATEGORY_ICONS.Other;

  const momColor = stats.momDir === 'up' ? '#E84A4A' : stats.momDir === 'down' ? '#4AB870' : '#8A8A70';
  const wowColor = stats.wowDir === 'up' ? '#E84A4A' : stats.wowDir === 'down' ? '#4AB870' : '#8A8A70';

  const momValue = stats.momPct === null
    ? '—'
    : `${stats.momDir === 'up' ? '+' : ''}${stats.momPct.toFixed(1)}%`;
  const momValueClass = stats.momDir === 'up' ? 'text-red-500' : stats.momDir === 'down' ? 'text-green-600' : 'text-[#8A8A70]';
  const momSub = stats.momPct === null
    ? `No ${lastMonthName} data`
    : `vs ${formatCurrency(stats.lastTotal)} in ${lastMonthName}`;

  const wowValue = stats.wowPct === null
    ? formatCurrency(stats.thisWeekTotal)
    : `${stats.wowDir === 'up' ? '+' : ''}${stats.wowPct.toFixed(1)}%`;
  const wowValueClass = stats.wowDir === 'up' ? 'text-red-500' : stats.wowDir === 'down' ? 'text-green-600' : 'text-[#1A1A1A]';
  const wowSub = stats.wowPct === null
    ? `${formatCurrency(stats.thisWeekTotal)} · no last-week data`
    : `${formatCurrency(stats.thisWeekTotal)} · vs ${formatCurrency(stats.lastWeekTDTotal)} last week`;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        icon={TrendingUp}
        label="This Month"
        value={formatCurrency(stats.total)}
        sub={`${stats.count} transaction${stats.count !== 1 ? 's' : ''} in ${monthName}`}
        color="#5A5A40"
      />
      <StatCard
        icon={MomIcon}
        label="vs Last Month"
        value={momValue}
        valueClassName={momValueClass}
        sub={momSub}
        color={momColor}
      />
      <StatCard
        icon={TopCatIcon}
        label="Top Category"
        value={stats.topCat ? stats.topCat[0] : '—'}
        sub={stats.topCat ? `${formatCurrency(stats.topCat[1])} this month` : 'No data yet'}
        color={stats.topCat ? CATEGORY_COLORS[stats.topCat[0]] || '#8A8A70' : '#8A8A70'}
      />
      <StatCard
        icon={WowIcon}
        label="This Week"
        value={wowValue}
        valueClassName={wowValueClass}
        sub={wowSub}
        color={wowColor}
      />
    </div>
  );
}
