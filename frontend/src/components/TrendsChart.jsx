import { memo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';
import api from '../services/api';
import { format, subDays } from 'date-fns';

const TrendsChart = memo(() => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const response = await api.get('/incidents/');
        const incidents = response.data.results || [];
        
        const last30Days = Array.from({ length: 30 }, (_, i) => {
          const date = subDays(new Date(), 29 - i);
          return {
            date: format(date, 'MMM dd'),
            fullDate: format(date, 'yyyy-MM-dd'),
            count: 0
          };
        });

        incidents.forEach(incident => {
          const incidentDate = format(new Date(incident.incident_date), 'yyyy-MM-dd');
          const dayData = last30Days.find(d => d.fullDate === incidentDate);
          if (dayData) {
            dayData.count++;
          }
        });

        setData(last30Days);
      } catch (error) {
        console.error('Error fetching trends:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12 }}
          interval={4}
        />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="count" 
          stroke="#3b82f6" 
          strokeWidth={2}
          name="Incidents"
          dot={{ fill: '#3b82f6' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});

TrendsChart.displayName = 'TrendsChart';

export default TrendsChart;