'use client';

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  PRESENT: '#22c55e',
  LATE: '#eab308',
  ABSENT: '#ef4444',
  HALF_DAY: '#f97316',
};

interface StatusBreakdownProps {
  data: Array<{ status: string; count: number }>;
}

export function StatusPieChart({ data }: StatusBreakdownProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={90}
          paddingAngle={2}
          dataKey="count"
          nameKey="status"
          label={({ status, count }) => `${String(status).replace(/_/g, ' ')}: ${count}`}
        >
          {data.map((entry) => (
            <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#6b7280'} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface DepartmentChartProps {
  data: Array<{
    department: string;
    present: number;
    late: number;
    absent: number;
    halfDay: number;
  }>;
}

export function DepartmentBarChart({ data }: DepartmentChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="department" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="present" fill="#22c55e" name="Present" radius={[2, 2, 0, 0]} />
        <Bar dataKey="late" fill="#eab308" name="Late" radius={[2, 2, 0, 0]} />
        <Bar dataKey="absent" fill="#ef4444" name="Absent" radius={[2, 2, 0, 0]} />
        <Bar dataKey="halfDay" fill="#f97316" name="Half Day" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
