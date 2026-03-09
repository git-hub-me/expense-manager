import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { CATEGORIES, CATEGORY_COLORS, formatCurrency } from '../../lib/constants';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  const isPartial = payload[0]?.payload?.isPartial;
  return (
    <div className="bg-white border border-[#1A1A1A]/8 rounded-2xl px-4 py-3 shadow-lg text-sm min-w-[160px]">
      <p className="text-[#8A8A70] text-xs mb-2 font-medium">
        {label}{isPartial ? ' · MTD' : ''}
      </p>
      {payload
        .slice()
        .reverse()
        .filter((p) => p.value > 0)
        .map((p) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.fill }} />
              <span className="text-[#8A8A70] text-xs">{p.dataKey}</span>
            </div>
            <span className="text-[#1A1A1A] text-xs font-medium tabular-nums">
              {formatCurrency(p.value)}
            </span>
          </div>
        ))}
      <div className="mt-2 pt-2 border-t border-[#1A1A1A]/6 flex justify-between">
        <span className="text-xs text-[#8A8A70]">Total</span>
        <span className="text-xs font-semibold text-[#1A1A1A] tabular-nums">{formatCurrency(total)}</span>
      </div>
    </div>
  );
};

export default function MonthlyBar({ expenses }) {
  const data = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleString('default', { month: 'short' }),
        isPartial: i === 0,
      });
    }

    const data = months.map(({ year, month, label, isPartial }) => {
      const row = { month: label, isPartial };
      CATEGORIES.forEach((cat) => { row[cat] = 0; });
      expenses.forEach((e) => {
        const d = new Date(e.date);
        if (d.getFullYear() === year && d.getMonth() === month) {
          row[e.category] = (row[e.category] || 0) + (e.amount ?? 0);
        }
      });
      // Round all values
      CATEGORIES.forEach((cat) => { row[cat] = Math.round(row[cat]); });
      return row;
    });

    return data;
  }, [expenses]);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E0" vertical={false} />
        <XAxis
          dataKey="month"
          tick={({ x, y, payload, index }) => {
            const isPartial = data[index]?.isPartial;
            return (
              <g transform={`translate(${x},${y})`}>
                <text
                  x={0} y={0} dy={12}
                  textAnchor="middle"
                  fill={isPartial ? '#5A5A40' : '#8A8A70'}
                  fontSize={10}
                  fontWeight={isPartial ? 600 : 400}
                >
                  {payload.value}
                </text>
                {isPartial && (
                  <text x={0} y={0} dy={23} textAnchor="middle" fill="#8A8A70" fontSize={8}>
                    mtd
                  </text>
                )}
              </g>
            );
          }}
          axisLine={false}
          tickLine={false}
          height={36}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#8A8A70' }}
          tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(90,90,64,0.06)' }} />
        {CATEGORIES.map((cat, i) => (
          <Bar
            key={cat}
            dataKey={cat}
            stackId="a"
            fill={CATEGORY_COLORS[cat]}
            radius={i === CATEGORIES.length - 1 ? [5, 5, 0, 0] : [0, 0, 0, 0]}
            maxBarSize={40}
            opacity={0.9}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
