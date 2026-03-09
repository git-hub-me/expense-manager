import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatCurrency } from '../../lib/constants';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const total = payload[0]?.value || 0;
  const isPartial = payload[0]?.payload?.isPartial;
  return (
    <div className="bg-white border border-[#1A1A1A]/8 rounded-2xl px-4 py-3 shadow-lg text-sm min-w-[130px]">
      <p className="text-[#8A8A70] text-xs mb-1 font-medium">
        {label}{isPartial ? ' · MTD' : ''}
      </p>
      <p className="text-[#1A1A1A] text-sm font-semibold tabular-nums">{formatCurrency(total)}</p>
    </div>
  );
};

export default function YearlyBar({ expenses }) {
  const data = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    return MONTH_LABELS.map((label, monthIndex) => {
      const total = expenses.reduce((sum, e) => {
        const parts = (e.date ?? '').split('-');
        if (parseInt(parts[0]) === currentYear && parseInt(parts[1]) - 1 === monthIndex) {
          return sum + (e.amount ?? 0);
        }
        return sum;
      }, 0);
      return {
        month: label,
        total: Math.round(total),
        isPartial: monthIndex === currentMonth,
        isFuture: monthIndex > currentMonth,
      };
    });
  }, [expenses]);

  return (
    <ResponsiveContainer width="100%" height={220}>
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
        <Bar dataKey="total" radius={[5, 5, 0, 0]} maxBarSize={36}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.isFuture ? '#E8E8E0' : entry.isPartial ? '#5A5A40' : '#8A8A70'}
              opacity={entry.isFuture ? 0.4 : 0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
