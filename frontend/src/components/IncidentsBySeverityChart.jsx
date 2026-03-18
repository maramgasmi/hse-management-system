import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = {
  LOW: '#22c55e',      // green
  MEDIUM: '#eab308',   // yellow
  HIGH: '#f97316',     // orange
  CRITICAL: '#ef4444'  // red
};

const IncidentsBySeverityChart = ({ data }) => {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No data available
      </div>
    );
  }

  // Transform data for pie chart
  const chartData = Object.entries(data).map(([severity, count]) => ({
    name: severity,
    value: count,
    color: COLORS[severity] || '#6b7280'
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default IncidentsBySeverityChart;