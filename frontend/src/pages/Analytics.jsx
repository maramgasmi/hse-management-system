import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import PerformanceMonitor from '../components/PerformanceMonitor'; // Added Import
import api from '../services/api';
import IncidentsByDepartmentChart from '../components/IncidentsByDepartmentChart';
import IncidentsBySeverityChart from '../components/IncidentsBySeverityChart';
import TrendsChart from '../components/TrendsChart';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

const Analytics = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Use the statistics endpoint that we KNOW works
        const [statsResponse, incidentsResponse] = await Promise.all([
          api.get('/incidents/statistics/'),
          api.get('/incidents/')
        ]);
        
        const stats = statsResponse.data;
        const incidents = incidentsResponse.data.results || [];
        
        // Calculate current month incidents
        const now = new Date();
        const currentMonthIncidents = incidents.filter(inc => {
          const incDate = new Date(inc.created_at || inc.incident_date);
          return incDate.getMonth() === now.getMonth() && 
                 incDate.getFullYear() === now.getFullYear();
        }).length;
        
        // Count open incidents
        const openIncidents = incidents.filter(inc => 
          inc.status === 'SUBMITTED' || inc.status === 'UNDER_INVESTIGATION'
        ).length;
        
        // Transform to expected format
        const dashboardData = {
          total_incidents: stats.total || 0,
          current_month_incidents: currentMonthIncidents,
          open_incidents: openIncidents,
          by_severity: stats.by_severity || {},
          by_status: stats.by_status || {},
          by_department: Object.entries(stats.by_department || {})
            .map(([department, count]) => ({ department, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
        };
        
        console.log('✅ Analytics data loaded:', dashboardData);
        setDashboard(dashboardData);
      } catch (error) {
        console.error('❌ Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <>
        <PerformanceMonitor pageName="Analytics" /> {/* Added to loading path */}
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <PerformanceMonitor pageName="Analytics" /> {/* Added to main path */}
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics Dashboard</h1>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                    <ChartBarIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Incidents
                      </dt>
                      <dd className="text-3xl font-semibold text-gray-900">
                        {dashboard?.total_incidents || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                    <ArrowTrendingUpIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        This Month
                      </dt>
                      <dd className="text-3xl font-semibold text-gray-900">
                        {dashboard?.current_month_incidents || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-orange-500 rounded-md p-3">
                    <ClockIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Open Incidents
                      </dt>
                      <dd className="text-3xl font-semibold text-gray-900">
                        {dashboard?.open_incidents || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Incidents by Severity
            </h2>
            <IncidentsBySeverityChart data={dashboard?.by_severity} />
          </div>

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              30-Day Trend
            </h2>
            <TrendsChart />
          </div>

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Incidents by Status
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {dashboard?.by_status &&
                Object.entries(dashboard.by_status).map(([status, count]) => (
                  <div
                    key={status}
                    className="bg-gray-50 px-4 py-3 rounded-lg"
                  >
                    <div className="text-sm text-gray-500">{status}</div>
                    <div className="text-2xl font-semibold text-gray-900">
                      {count}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Incidents by Department
            </h2>
            <IncidentsByDepartmentChart data={dashboard?.by_department} />
          </div>
        </div>
      </div>
    </>
  );
};

export default Analytics;