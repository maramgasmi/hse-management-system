import { useEffect, useState, useMemo, useCallback } from 'react';
import Navbar from '../components/Navbar';
import PerformanceMonitor from '../components/PerformanceMonitor'; // Added Import
import { useDebounce } from '../hooks/useDebounce';
import api from '../services/api';
import { SEVERITY_COLORS, STATUS_COLORS } from '../utils/constants';
import CreateIncidentModal from '../components/CreateIncidentModal';
import EditIncidentModal from '../components/EditIncidentModal';  
import toast from 'react-hot-toast'; 
import EmptyState from '../components/EmptyState';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  MagnifyingGlassIcon, 
  XMarkIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

// --- Skeleton Loaders ---
const StatCardSkeleton = () => (
  <div className="bg-gray-100 rounded-lg p-3 animate-pulse">
    <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
    <div className="h-6 bg-gray-300 rounded w-1/4"></div>
  </div>
);

const CardSkeleton = () => (
  <div className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
    <div className="flex justify-between items-start mb-4">
      <div className="space-y-2 flex-1">
        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
      </div>
      <div className="flex gap-2">
        <div className="h-6 w-6 bg-gray-200 rounded"></div>
        <div className="h-6 w-6 bg-gray-200 rounded"></div>
      </div>
    </div>
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="h-5 bg-gray-200 rounded-full w-16"></div>
        <div className="h-5 bg-gray-200 rounded-full w-24"></div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="h-3 bg-gray-200 rounded w-full"></div>
        <div className="h-3 bg-gray-200 rounded w-full"></div>
        <div className="h-3 bg-gray-200 rounded w-full col-span-2"></div>
      </div>
    </div>
  </div>
);

const TableSkeleton = () => (
  <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200 animate-pulse">
    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex gap-4">
      {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-4 bg-gray-300 rounded flex-1"></div>)}
    </div>
    <div className="divide-y divide-gray-200">
      {[1, 2, 3, 4, 5].map((row) => (
        <div key={row} className="px-6 py-5 flex gap-4 items-center bg-white">
          <div className="h-4 bg-gray-200 rounded flex-1"></div>
          <div className="h-4 bg-gray-200 rounded flex-[2]"></div>
          <div className="h-5 bg-gray-200 rounded-full w-16"></div>
          <div className="h-5 bg-gray-200 rounded-full w-20"></div>
          <div className="h-4 bg-gray-200 rounded flex-1"></div>
          <div className="h-4 bg-gray-200 rounded w-12 ml-auto"></div>
        </div>
      ))}
    </div>
  </div>
);

// --- Mobile Card Helper Component ---
const IncidentCard = ({ incident, onEdit, onDelete }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-xs text-gray-500 font-medium">{incident.reference}</p>
          <h3 className="text-sm font-semibold text-gray-900 mt-1">{incident.title}</h3>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onEdit(incident)} className="text-primary-600 hover:text-primary-900 p-1">
            <PencilIcon className="h-5 w-5" />
          </button>
          <button onClick={() => onDelete(incident)} className="text-red-600 hover:text-red-900 p-1">
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${SEVERITY_COLORS[incident.severity]}`}>
            {incident.severity}
          </span>
          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[incident.status]}`}>
            {incident.status}
          </span>
        </div>

        <div className="text-xs text-gray-600 grid grid-cols-2 gap-2">
          <p><span className="font-medium block text-gray-400 uppercase text-[10px]">Date</span> {new Date(incident.incident_date).toLocaleDateString()}</p>
          <p><span className="font-medium block text-gray-400 uppercase text-[10px]">Department</span> {incident.department || 'N/A'}</p>
          <p className="col-span-2"><span className="font-medium block text-gray-400 uppercase text-[10px]">Location</span> {incident.location}</p>
        </div>
      </div>
    </div>
  );
};

// --- Main Incidents Component ---
const Incidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

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

  // Memoize callbacks
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSeverityFilter('');
    setStatusFilter('');
    setDepartmentFilter('');
  }, []);

  const handleDelete = useCallback(async (incident) => {
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
  }, []);

  const handleSort = useCallback((field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  // Memoize active filters count
  const activeFiltersCount = useMemo(() => {
    return [
      debouncedSearchTerm !== '',
      severityFilter !== '',
      statusFilter !== '',
      departmentFilter !== ''
    ].filter(Boolean).length;
  }, [debouncedSearchTerm, severityFilter, statusFilter, departmentFilter]);

  // --- Keyboard Shortcuts Effect ---
  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector('input[placeholder*="Search"]')?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setIsModalOpen(true);
      }
      if (e.key === 'Escape' && activeFiltersCount > 0) {
        clearFilters();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [activeFiltersCount, clearFilters]);

  // Memoize filtered incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter(incident => {
      const matchesSearch = debouncedSearchTerm === '' ||   
        incident.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.reference?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSeverity = severityFilter === '' || incident.severity === severityFilter;
      const matchesStatus = statusFilter === '' || incident.status === statusFilter;
      const matchesDepartment = departmentFilter === '' || 
        incident.department?.toLowerCase().includes(departmentFilter.toLowerCase());

      return matchesSearch && matchesSeverity && matchesStatus && matchesDepartment;
    });
  }, [incidents, searchTerm, debouncedSearchTerm, severityFilter, statusFilter, departmentFilter]); 

  // Memoize sorted and filtered incidents
  const sortedAndFilteredIncidents = useMemo(() => {
    return [...filteredIncidents].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'incident_date' || sortField === 'created_at') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredIncidents, sortField, sortDirection]);

  // Memoize export
  const exportToCSV = useCallback(() => {
    const headers = [
      'Reference', 'Title', 'Description', 'Type', 'Severity', 'Status',
      'Date', 'Location', 'Department', 'Injuries', 'Work Hours Lost', 'Days Lost'
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
  }, [sortedAndFilteredIncidents]);

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="text-gray-400">↕</span>;
    return <span className="text-primary-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  if (loading) {
    return (
      <>
        <PerformanceMonitor pageName="Incidents" /> {/* Added to loading path */}
        <Navbar />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-center mb-6">
              <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded w-40 animate-pulse"></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              {[1, 2, 3, 4, 5].map((i) => <StatCardSkeleton key={i} />)}
            </div>
            <div className="hidden md:block">
              <TableSkeleton />
            </div>
            <div className="md:hidden space-y-4 mt-6">
              {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PerformanceMonitor pageName="Incidents" /> {/* Added to main path */}
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Header */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold text-gray-900">Incidents</h1>
              <div className="flex gap-2">
                <button onClick={exportToCSV} className="hidden sm:inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  Export CSV
                </button>
                <button 
                  onClick={() => setIsModalOpen(true)} 
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  title="Keyboard shortcut: Cmd/Ctrl + N"
                >
                  <PlusIcon className="h-5 w-5 mr-2" /> 
                  Create Incident
                  <kbd className="hidden lg:inline-flex ml-2 items-center px-2 py-0.5 text-xs font-sans text-primary-100 bg-primary-700 border border-primary-600 rounded">
                    ⌘N
                  </kbd>
                </button>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="text-xs text-blue-600 font-medium">Total</div>
                <div className="text-xl font-bold text-blue-900">{incidents.length}</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <div className="text-xs text-red-600 font-medium">Critical</div>
                <div className="text-xl font-bold text-red-900">{incidents.filter(i => i.severity === 'CRITICAL').length}</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg text-center">
                <div className="text-xs text-orange-600 font-medium">High</div>
                <div className="text-xl font-bold text-orange-900">{incidents.filter(i => i.severity === 'HIGH').length}</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg text-center">
                <div className="text-xs text-purple-600 font-medium">Investigating</div>
                <div className="text-xl font-bold text-purple-900">{incidents.filter(i => i.status === 'UNDER_INVESTIGATION').length}</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <div className="text-xs text-green-600 font-medium">Closed</div>
                <div className="text-xl font-bold text-green-900">{incidents.filter(i => i.status === 'CLOSED').length}</div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-16 py-2 border border-gray-300 rounded-md focus:ring-primary-500 text-sm"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs font-sans text-gray-400 bg-gray-100 border border-gray-200 rounded">
                      ⌘K
                    </kbd>
                  </div>
                </div>
                {activeFiltersCount > 0 && (
                  <button onClick={clearFilters} className="inline-flex items-center px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
                    <XMarkIcon className="h-4 w-4 mr-1" /> Clear Filters (Esc)
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="border border-gray-300 rounded-md p-2 text-sm focus:ring-primary-500">
                  <option value="">All Severities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-md p-2 text-sm focus:ring-primary-500">
                  <option value="">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="UNDER_INVESTIGATION">Under Investigation</option>
                  <option value="VALIDATED">Validated</option>
                  <option value="CLOSED">Closed</option>
                </select>
                <input
                  type="text"
                  placeholder="Filter by department..."
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="border border-gray-300 rounded-md p-2 text-sm focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['reference', 'title', 'severity', 'status', 'incident_date'].map((field) => (
                    <th key={field} onClick={() => handleSort(field)} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center gap-1">
                        {field.replace('_', ' ')} <SortIcon field={field} />
                      </div>
                    </th>
                  ))}
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedAndFilteredIncidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{incident.reference}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{incident.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold">
                      <span className={`px-2 py-1 rounded-full ${SEVERITY_COLORS[incident.severity]}`}>{incident.severity}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold">
                      <span className={`px-2 py-1 rounded-full ${STATUS_COLORS[incident.status]}`}>{incident.status}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(incident.incident_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => { setSelectedIncident(incident); setIsEditModalOpen(true); }} className="text-primary-600 hover:text-primary-900 mr-4">
                        <PencilIcon className="h-5 w-5 inline" />
                      </button>
                      <button onClick={() => handleDelete(incident)} className="text-red-600 hover:text-red-900">
                        <TrashIcon className="h-5 w-5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {sortedAndFilteredIncidents.length === 0 && (
              <EmptyState
                icon={DocumentTextIcon}
                title={incidents.length === 0 ? "No incidents yet" : "No matching incidents"}
                description={
                  incidents.length === 0 
                    ? "Get started by creating your first incident report."
                    : "Try adjusting your filters or search terms to find what you're looking for."
                }
                action={incidents.length === 0 ? () => setIsModalOpen(true) : activeFiltersCount > 0 ? clearFilters : undefined}
                actionLabel={incidents.length === 0 ? "Create First Incident" : activeFiltersCount > 0 ? "Clear Filters" : undefined}
              />
            )}
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {sortedAndFilteredIncidents.length > 0 ? (
              sortedAndFilteredIncidents.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  onEdit={(inc) => {
                    setSelectedIncident(inc);
                    setIsEditModalOpen(true);
                  }}
                  onDelete={handleDelete}
                />
              ))
            ) : (
              <div className="bg-white rounded-lg border border-gray-200">
                <EmptyState
                  icon={DocumentTextIcon}
                  title={incidents.length === 0 ? "No incidents yet" : "No matching incidents"}
                  description={
                    incidents.length === 0 
                      ? "Get started by creating your first incident report."
                      : "Try adjusting your filters to find what you're looking for."
                  }
                  action={incidents.length === 0 ? () => setIsModalOpen(true) : activeFiltersCount > 0 ? clearFilters : undefined}
                  actionLabel={incidents.length === 0 ? "Create First Incident" : activeFiltersCount > 0 ? "Clear Filters" : undefined}
                />
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Modals */}
      <CreateIncidentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => { setIsModalOpen(false); refreshIncidents(); }} 
      />
      {selectedIncident && (
        <EditIncidentModal 
          isOpen={isEditModalOpen} 
          onClose={() => { setIsEditModalOpen(false); setSelectedIncident(null); }} 
          onSuccess={() => { setIsEditModalOpen(false); refreshIncidents(); }} 
          incident={selectedIncident} 
        />
      )}
    </>
  );
};

export default Incidents;