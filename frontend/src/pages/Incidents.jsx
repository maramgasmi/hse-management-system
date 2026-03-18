import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { SEVERITY_COLORS, STATUS_COLORS } from '../utils/constants';
import { PlusIcon } from '@heroicons/react/24/outline';  
import CreateIncidentModal from '../components/CreateIncidentModal'; 
import { useNavigate } from 'react-router-dom';   

const Incidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  // Refresh function - can be called from modal
  const refreshIncidents = async () => {
  console.log('🔄 refreshIncidents called!');
  setLoading(true);
  try {
    console.log('📡 Fetching incidents from API...');
    // Add page_size parameter to get all incidents
    const response = await api.get('/incidents/?page_size=100');  // ← CHANGE THIS LINE
    console.log('✅ Got response:', response.data);
    
    const incidents = response.data.results || [];
    console.log('📊 Setting incidents, count:', incidents.length);
    
    setIncidents(incidents);
  } catch (error) {
    console.error('❌ Error fetching incidents:', error);
  } finally {
    setLoading(false);
  }
};

  // Initial load
  useEffect(() => {
    refreshIncidents();
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

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header with Create Button */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Incidents</h1>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Incident
            </button>
          </div>
          
          {/* Incidents Table */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {incidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {incident.reference}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {incident.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${SEVERITY_COLORS[incident.severity]}`}>
                        {incident.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[incident.status]}`}>
                        {incident.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(incident.incident_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {incidents.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No incidents found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateIncidentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          // Force page refresh by navigating away and back
          navigate('/dashboard');
          setTimeout(() => {
            navigate('/incidents');
          }, 100);
        }}
      />
    </>
  );
};

export default Incidents;