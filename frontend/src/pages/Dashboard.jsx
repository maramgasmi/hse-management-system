import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { 
  DocumentTextIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </>
    );
  }

  const statCards = [
    {
      name: 'Total Incidents',
      value: stats?.total || 0,
      icon: DocumentTextIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'High Priority',
      value: stats?.by_severity?.HIGH || 0,
      icon: ExclamationTriangleIcon,
      color: 'bg-orange-500',
    },
    {
      name: 'Critical',
      value: stats?.by_severity?.CRITICAL || 0,
      icon: ExclamationTriangleIcon,
      color: 'bg-red-500',
    },
    {
      name: 'Validated',
      value: stats?.by_status?.VALIDATED || 0,
      icon: CheckCircleIcon,
      color: 'bg-green-500',
    },
  ];

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <div
                key={stat.name}
                className="bg-white overflow-hidden shadow rounded-lg"
              >
                <div className="p-5">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 ${stat.color} rounded-md p-3`}>
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          {stat.name}
                        </dt>
                        <dd className="text-3xl font-semibold text-gray-900">
                          {stat.value}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Welcome Message */}
          <div className="mt-8 bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Welcome to SafetyFirst HSE Management System
            </h2>
            <p className="text-gray-600">
              Monitor and manage workplace incidents, track safety metrics, and ensure compliance
              with health and safety regulations.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;