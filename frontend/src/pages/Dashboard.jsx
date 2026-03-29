import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { 
  DocumentTextIcon, 
  ExclamationTriangleIcon, 
  FireIcon,
  CheckCircleIcon,
  ChartBarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { authService } from '../services/auth';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = authService.getCurrentUser();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/incidents/statistics/');
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      name: 'Total Incidents',
      value: stats?.total || 0,
      icon: DocumentTextIcon,
      color: 'blue',
      bgColor: 'bg-blue-500',
      lightBg: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      name: 'High Priority',
      value: stats?.by_severity?.HIGH || 0,
      icon: ExclamationTriangleIcon,
      color: 'orange',
      bgColor: 'bg-orange-500',
      lightBg: 'bg-orange-50',
      textColor: 'text-orange-600'
    },
    {
      name: 'Critical',
      value: stats?.by_severity?.CRITICAL || 0,
      icon: FireIcon,
      color: 'red',
      bgColor: 'bg-red-500',
      lightBg: 'bg-red-50',
      textColor: 'text-red-600'
    },
    {
      name: 'Validated',
      value: stats?.by_status?.VALIDATED || 0,
      icon: CheckCircleIcon,
      color: 'green',
      bgColor: 'bg-green-500',
      lightBg: 'bg-green-50',
      textColor: 'text-green-600'
    },
  ];

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="animate-pulse">
              <div className="h-10 bg-gray-200 rounded w-64 mb-8"></div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white overflow-hidden shadow rounded-lg p-5">
                    <div className="h-12 bg-gray-200 rounded mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.username}! 👋
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Here's what's happening with your incidents today.
            </p>
          </div>

          {/* Stats Grid - Responsive */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.name}
                  className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow"
                >
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 ${stat.bgColor} rounded-md p-3`}>
                        <Icon className="h-6 w-6 text-white" aria-hidden="true" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            {stat.name}
                          </dt>
                          <dd className="flex items-baseline">
                            <div className="text-3xl font-semibold text-gray-900">
                              {stat.value}
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className={`${stat.lightBg} px-5 py-3`}>
                    <div className={`text-sm ${stat.textColor} font-medium`}>
                      View details →
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions - Responsive */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <button className="inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 w-full">
                  <DocumentTextIcon className="h-5 w-5 mr-2" />
                  Create Incident
                </button>
                <button className="inline-flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 w-full">
                  <ChartBarIcon className="h-5 w-5 mr-2" />
                  View Analytics
                </button>
                <button className="inline-flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 w-full">
                  <ClockIcon className="h-5 w-5 mr-2" />
                  Recent Activity
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;