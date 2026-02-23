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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#1A1A1A]/8 rounded-2xl px-4 py-3 shadow-lg text-sm">
      <p className="text-[#8A8A70] text-xs mb-1">{label}</p>
      <p className="font-semibold text-[#1A1A1A]">{formatCurrency(payload[0].value)}</p>
      {payload[0].value > 0 && (
        <p className="text-[10px] text-[#5A5A40] mt-1">Tap to view details</p>
      )}
    </div>
  );
};

export default function DailyBar({ expenses, onBarClick }) {
  const data = useMemo(() => {
    const result = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const total = expenses
        .filter((e) => e.date === dateStr)
        .reduce((s, e) => s + (e.amount ?? 0), 0);
      result.push({
        date: `${d.getDate()}/${d.getMonth() + 1}`,
        full: dateStr,
        total: +total.toFixed(2),
      });
    }
    return result;
  }, [expenses]);

  const maxVal = Math.max(...data.map((d) => d.total), 1);

  const handleClick = (barData) => {
    if (barData?.activePayload?.[0]?.payload?.total > 0) {
      onBarClick?.(barData.activePayload[0].payload);
    }
  };

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={data}
        margin={{ top: 5, right: 5, bottom: 5, left: 0 }}
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E0" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#8A8A70' }}
          interval={4}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#8A8A70' }}
          tickFormatter={(v) => `₹${v}`}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(90,90,64,0.06)' }} />
        <Bar dataKey="total" radius={[5, 5, 0, 0]} maxBarSize={32}>
          {data.map((entry) => (
            <Cell
              key={entry.full}
              fill={entry.total / maxVal > 0.7 ? '#5A5A40' : entry.total > 0 ? '#8A8A60' : '#E8E8E0'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
