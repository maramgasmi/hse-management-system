import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { SEVERITY_COLORS, STATUS_COLORS } from '../utils/constants';
import CreateIncidentModal from '../components/CreateIncidentModal';
import EditIncidentModal from '../components/EditIncidentModal';  
import toast from 'react-hot-toast';  
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  MagnifyingGlassIcon, 
  XMarkIcon 
} from '@heroicons/react/24/outline';

const Incidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  // Refresh function
  const refreshIncidents = async () => {
    setLoading(true);
    try {
      const response = await api.get('/incidents/?page_size=100');
      const data = response.data.results || [];
      setIncidents(data);
    } catch (error) {
      console.error('❌ Error fetching incidents:', error);
      toast.error("Failed to load incidents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshIncidents();
  }, []);

  // Delete Handler
  const handleDelete = async (incident) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete incident "${incident.title}"?\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      await api.delete(`/incidents/${incident.id}/`);
      toast.success('Incident deleted successfully! 🗑️');
      refreshIncidents();
    } catch (error) {
      console.error('Error deleting incident:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to delete incident';
      toast.error(errorMsg);
    }
  };

  // Filtering Logic
  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = searchTerm === '' || 
      incident.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.reference?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSeverity = severityFilter === '' || incident.severity === severityFilter;
    const matchesStatus = statusFilter === '' || incident.status === statusFilter;
    const matchesDepartment = departmentFilter === '' || 
      incident.department?.toLowerCase().includes(departmentFilter.toLowerCase());

    return matchesSearch && matchesSeverity && matchesStatus && matchesDepartment;
  });

  const activeFiltersCount = [
    searchTerm !== '',
    severityFilter !== '',
    statusFilter !== '',
    departmentFilter !== ''
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearchTerm('');
    setSeverityFilter('');
    setStatusFilter('');
    setDepartmentFilter('');
  };

  // Sort incidents
  const sortedAndFilteredIncidents = [...filteredIncidents].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    // Handle dates
    if (sortField === 'incident_date' || sortField === 'created_at') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }

    // Handle strings
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Toggle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort icon component
  const SortIcon = ({ field }) => {
    if (sortField !== field) {
      return <span className="text-gray-400">↕</span>;
    }
    return <span className="text-primary-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Reference',
      'Title',
      'Description',
      'Type',
      'Severity',
      'Status',
      'Date',
      'Location',
      'Department',
      'Injuries',
      'Work Hours Lost',
      'Days Lost'
    ];

    const rows = sortedAndFilteredIncidents.map(incident => [
      incident.reference || '',
      incident.title || '',
      incident.description?.replace(/,/g, ';') || '',
      incident.incident_type || '',
      incident.severity || '',
      incident.status || '',
      incident.incident_date || '',
      incident.location || '',
      incident.department || '',
      incident.injuries || '',
      incident.work_hours_lost || 0,
      incident.days_lost || 0
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `incidents_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${sortedAndFilteredIncidents.length} incidents to CSV! 📊`);
  };

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
          
          {/* Header */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold text-gray-900">Incidents</h1>
              
              {/* Buttons Group */}
              <div className="flex gap-2">
                <button
                  onClick={exportToCSV}
                  disabled={sortedAndFilteredIncidents.length === 0}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>
                
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create Incident
                </button>
              </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-sm text-blue-600 font-medium">Total</div>
                <div className="text-2xl font-bold text-blue-900">{incidents.length}</div>
              </div>
              
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-sm text-red-600 font-medium">Critical</div>
                <div className="text-2xl font-bold text-red-900">
                  {incidents.filter(i => i.severity === 'CRITICAL').length}
                </div>
              </div>
              
              <div className="bg-orange-50 rounded-lg p-3">
                <div className="text-sm text-orange-600 font-medium">High</div>
                <div className="text-2xl font-bold text-orange-900">
                  {incidents.filter(i => i.severity === 'HIGH').length}
                </div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="text-sm text-purple-600 font-medium">Investigating</div>
                <div className="text-2xl font-bold text-purple-900">
                  {incidents.filter(i => i.status === 'UNDER_INVESTIGATION').length}
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-sm text-green-600 font-medium">Closed</div>
                <div className="text-2xl font-bold text-green-900">
                  {incidents.filter(i => i.status === 'CLOSED').length}
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-lg shadow space-y-4 border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by title, description, or reference..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white sm:text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <XMarkIcon className="h-4 w-4 mr-1" />
                    Clear {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 border border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                  >
                    <option value="">All Severities</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 border border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                  >
                    <option value="">All Statuses</option>
                    <option value="DRAFT">Draft</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="UNDER_INVESTIGATION">Under Investigation</option>
                    <option value="VALIDATED">Validated</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    placeholder="Filter by department..."
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md sm:text-sm"
                  />
                </div>
              </div>

              <div className="text-sm text-gray-500 pt-2 border-t border-gray-50">
                Showing {sortedAndFilteredIncidents.length} of {incidents.length} incidents
                {activeFiltersCount > 0 && ` (${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} active)`}
                {sortField && ` • Sorted by ${sortField} ${sortDirection === 'asc' ? '↑' : '↓'}`}
              </div>
            </div>
          </div>
          
          {/* Table with Sortable Headers */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    onClick={() => handleSort('reference')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-1">
                      Reference
                      <SortIcon field="reference" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('title')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-1">
                      Title
                      <SortIcon field="title" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('severity')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-1">
                      Severity
                      <SortIcon field="severity" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('status')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-1">
                      Status
                      <SortIcon field="status" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('incident_date')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-1">
                      Date
                      <SortIcon field="incident_date" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedAndFilteredIncidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{incident.reference}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{incident.title}</td>
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
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedIncident(incident);
                          setIsEditModalOpen(true);
                        }}
                        className="text-primary-600 hover:text-primary-900 mr-4"
                        title="Edit incident"
                      >
                        <PencilIcon className="h-5 w-5 inline" />
                      </button>
                      <button
                        onClick={() => handleDelete(incident)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete incident"
                      >
                        <TrashIcon className="h-5 w-5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {sortedAndFilteredIncidents.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {incidents.length === 0 
                    ? 'No incidents found' 
                    : 'No incidents match your filters'}
                </p>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="mt-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateIncidentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          refreshIncidents();
        }}
      />

      <EditIncidentModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedIncident(null);
        }}
        onSuccess={() => {
          setIsEditModalOpen(false);
          refreshIncidents();
        }}
        incident={selectedIncident}
      />
    </>
  );
};

export default Incidents;