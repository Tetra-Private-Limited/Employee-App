'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface AttendanceChartProps {
  data: Array<{
    date: string;
    present: number;
    late: number;
    absent: number;
  }>;
}

export function AttendanceChart({ data }: AttendanceChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="present" fill="#22c55e" name="Present" radius={[2, 2, 0, 0]} />
        <Bar dataKey="late" fill="#eab308" name="Late" radius={[2, 2, 0, 0]} />
        <Bar dataKey="absent" fill="#ef4444" name="Absent" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
