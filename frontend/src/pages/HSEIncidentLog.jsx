import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PlusCircleIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  ShieldExclamationIcon,
  XMarkIcon,
  ArrowsUpDownIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api, { exportIncidentsPdf } from '../services/api';
import HSESidebar from '../components/HSESidebar';
import CreateIncidentModal from '../components/CreateIncidentModal';
import EditIncidentModal from '../components/EditIncidentModal';
import IncidentDetailModal from '../components/IncidentDetailModal';

// Theme tokens
const BG        = '#0B0E14';
const CARD_BG   = '#151921';
const BORDER    = '#232933';
const BLUE      = '#3498DB';
const GREEN     = '#10B981';
const ORANGE    = '#E67E22';
const RED       = '#EF4444';
const YELLOW    = '#EAB308';

const SeverityPill = ({ severity }) => {
  const { t } = useTranslation();
  const config = {
    CRITICAL: RED,
    HIGH:     ORANGE,
    MEDIUM:   YELLOW,
    LOW:      GREEN,
  };
  return (
    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase text-white shadow-lg"
      style={{ background: config[severity] || GREEN }}>
      {t(`severity_levels.${severity}`, severity)}
    </span>
  );
};

const StatusIndicator = ({ status }) => {
  const { t } = useTranslation();
  const config = {
    DRAFT:               '#6B7280',
    SUBMITTED:           '#3498DB',
    UNDER_INVESTIGATION: '#A855F7',
    VALIDATED:           '#10B981',
    CLOSED:              '#4B5563',
    OPEN:                '#3498DB',
  };
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-1.5 rounded-full" style={{ background: config[status] || '#FFF' }} />
      <span className="text-[10px] font-bold text-gray-400 uppercase">
        {t(`status.${status}`, status)}
      </span>
    </div>
  );
};

const HSEIncidentLog = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Sorting State
  const [sortField, setSortField] = useState('incident_date'); // default
  const [sortOrder, setSortOrder] = useState('desc'); // default

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedInc, setSelectedInc] = useState(null);

  const fetchIncidents = async () => {
    try {
      const res = await api.get('/incidents/?page_size=200');
      setIncidents(res.data.results || []);
    } catch (err) {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const openDetail = (inc) => {
    setSelectedInc(inc);
    setDetailOpen(true);
  };

  const handlePdfExport = async () => {
    const loadId = toast.loading('Generating Register...');
    try {
      await exportIncidentsPdf();
      toast.success('Generated Successfully', { id: loadId });
    } catch (err) {
      toast.error('Export Failed', { id: loadId });
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSeverityFilter('');
    setTypeFilter('');
    setStatusFilter('');
    setDeptFilter('');
    toast.success('Filters Cleared');
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    // 1. Filter
    let result = incidents.filter(inc => {
      const matchesSearch = !search ||
        inc.reference?.toLowerCase().includes(search.toLowerCase()) ||
        inc.title?.toLowerCase().includes(search.toLowerCase());
      const matchesSev = !severityFilter || inc.severity === severityFilter;
      const matchesType = !typeFilter || inc.incident_type === typeFilter;
      const matchesStatus = !statusFilter || inc.status === statusFilter;
      const matchesDept = !deptFilter || inc.department === deptFilter;
      return matchesSearch && matchesSev && matchesType && matchesStatus && matchesDept;
    });

    // 2. Sort
    result.sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [incidents, search, severityFilter, typeFilter, statusFilter, deptFilter, sortField, sortOrder]);

  const COLS = [
    { key: 'reference',     label: t('incident_log.columns.REF'),   width: '12%' },
    { key: 'incident_date', label: t('incident_log.columns.DATE'),  width: '12%' },
    { key: 'title',         label: t('incident_log.columns.TITLE'), width: 'auto' },
    { key: 'severity',      label: t('incident_log.columns.SEV'),   width: '12%' },
    { key: 'status',        label: t('incident_log.columns.STATUS'), width: '12%' },
    { key: 'department',    label: t('incident_log.columns.DEPT'),   width: '15%' },
  ];

  return (
    <div style={{ background: BG, minHeight: '100vh', display: 'flex' }}>
      <HSESidebar activePage="incidents" onNavigate={navigate} onReport={() => setCreateOpen(true)} />

      <main className="lg:ml-[260px] flex-1 px-4 sm:px-6 lg:px-10 py-8 min-w-0 animate-in fade-in duration-500">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-[10px] font-bold text-gray-500 tracking-[3px] uppercase mb-1 flex items-center gap-2">
              <ShieldExclamationIcon className="h-3 w-3" /> {t('incident_log.security_governance')}
            </p>
            <h1 className="text-3xl font-extrabold text-white">{t('incident_log.page_title')}</h1>
            <p className="text-sm text-gray-500 font-medium">{t('incident_log.subtitle')}</p>
          </div>
          <div className="flex gap-2.5">
            <button onClick={handlePdfExport} className="flex items-center gap-2 px-3 py-2 rounded border border-white/10 hover:border-white/20 text-gray-400 hover:text-white transition-all text-[10px] font-bold uppercase">
              <ArrowDownTrayIcon className="h-3.5 w-3.5" /> PDF
            </button>
            <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 px-6 py-2.5 rounded text-xs font-black text-white hover:opacity-90 transition-all shadow-xl" style={{ background: BLUE }}>
              <PlusCircleIcon className="h-4 w-4" /> {t('sidebar.report_incident')}
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col gap-4 mb-6 p-5 rounded-xl border bg-gray-900 shadow-xl" style={{ borderColor: BORDER }}>
          <div className="flex flex-col lg:flex-row items-center gap-3">
             <div className="flex-1 w-full relative">
               <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
               <input 
                 type="text" 
                 placeholder={t('common.search')} 
                 value={search} 
                 onChange={e => setSearch(e.target.value)} 
                 className="w-full text-xs font-medium pl-10 pr-4 py-2.5 rounded focus:outline-none transition-all" 
                 style={{ background: BG, border: `1px solid ${BORDER}`, color: '#FFF' }} 
               />
             </div>
             {(search || severityFilter || typeFilter || statusFilter || deptFilter) && (
               <button 
                 onClick={clearFilters}
                 className="flex items-center gap-2 px-4 py-2 rounded text-[10px] font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
               >
                 <XMarkIcon className="h-3.5 w-3.5" /> Clear All
               </button>
             )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select 
              value={severityFilter} 
              onChange={e => setSeverityFilter(e.target.value)}
              className="bg-[#0F131A] text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white border border-white/5 rounded py-2 px-3 focus:ring-0 cursor-pointer"
              style={{ colorScheme: 'dark' }}
            >
              <option value="">{t('common.severity')}: {t('common.all').toUpperCase()}</option>
              <option value="CRITICAL">{t('severity_levels.CRITICAL')}</option>
              <option value="HIGH">{t('severity_levels.HIGH')}</option>
              <option value="MEDIUM">{t('severity_levels.MEDIUM')}</option>
              <option value="LOW">{t('severity_levels.LOW')}</option>
            </select>
            
            <select 
              value={typeFilter} 
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-[#0F131A] text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white border border-white/5 rounded py-2 px-3 focus:ring-0 cursor-pointer"
              style={{ colorScheme: 'dark' }}
            >
              <option value="">{t('forms.incident_type')}: {t('common.all').toUpperCase()}</option>
              {['ACCIDENT', 'NEAR_MISS', 'UNSAFE_CONDITION', 'ENVIRONMENTAL', 'FIRST_AID'].map(type => (
                <option key={type} value={type}>{t(`incident_types.${type}`, type)}</option>
              ))}
            </select>

            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-[#0F131A] text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white border border-white/5 rounded py-2 px-3 focus:ring-0 cursor-pointer"
              style={{ colorScheme: 'dark' }}
            >
              <option value="">{t('common.status')}: {t('common.all').toUpperCase()}</option>
              <option value="DRAFT">{t('status.DRAFT')}</option>
              <option value="SUBMITTED">{t('status.SUBMITTED')}</option>
              <option value="UNDER_INVESTIGATION">{t('status.UNDER_INVESTIGATION')}</option>
              <option value="VALIDATED">{t('status.VALIDATED')}</option>
              <option value="CLOSED">{t('status.CLOSED')}</option>
            </select>

            <select 
              value={deptFilter} 
              onChange={e => setDeptFilter(e.target.value)}
              className="bg-[#0F131A] text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white border border-white/5 rounded py-2 px-3 focus:ring-0 cursor-pointer"
              style={{ colorScheme: 'dark' }}
            >
              <option value="">{t('common.department')}: {t('common.all').toUpperCase()}</option>
              {Array.from(new Set(incidents.map(i => i.department).filter(Boolean))).map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Registry Table */}
        <div className="rounded-xl overflow-hidden shadow-2xl border" style={{ background: CARD_BG, borderColor: BORDER }}>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: BORDER }}>
                  {COLS.map(c => (
                    <th 
                      key={c.key} 
                      onClick={() => handleSort(c.key)}
                      className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-[2px] text-gray-500 cursor-pointer hover:text-white transition-colors group" 
                      style={{ width: c.width }}
                    >
                      <div className="flex items-center gap-2">
                        {c.label}
                        {sortField === c.key ? (
                          sortOrder === 'asc' ? <ChevronUpIcon className="h-3 w-3 text-blue-500" /> : <ChevronDownIcon className="h-3 w-3 text-blue-500" />
                        ) : (
                          <ArrowsUpDownIcon className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: BORDER }}>
                {loading ? (
                   Array.from({length: 8}).map((_, i) => (
                      <tr key={i}><td colSpan={COLS.length} className="px-6 py-4"><div className="h-2 bg-white/5 rounded animate-pulse w-full" /></td></tr>
                   ))
                ) : filteredAndSorted.length === 0 ? (
                   <tr><td colSpan={COLS.length} className="px-6 py-16 text-center text-sm font-medium text-gray-600 uppercase tracking-widest">No results found</td></tr>
                ) : (
                  filteredAndSorted.map((inc) => (
                    <tr key={inc.id} onClick={() => openDetail(inc)} className="group cursor-pointer hover:bg-white/[0.02] transition-colors">
                       <td className="px-6 py-4 font-bold text-[11px] text-blue-500 uppercase tracking-wider">#{inc.reference}</td>
                       <td className="px-6 py-4 text-[11px] text-gray-500 font-bold tabular-nums">{new Date(inc.incident_date).toLocaleDateString()}</td>
                       <td className="px-6 py-4">
                          <p className="text-sm font-bold text-white mb-0.5 group-hover:text-blue-400 transition-colors uppercase">{inc.title}</p>
                          <p className="text-[9px] text-gray-600 uppercase font-black tracking-widest">{t(`incident_types.${inc.incident_type}`, inc.incident_type)}</p>
                       </td>
                       <td className="px-6 py-4">
                          <SeverityPill severity={inc.severity} />
                       </td>
                       <td className="px-6 py-4">
                          <StatusIndicator status={inc.status} />
                       </td>
                       <td className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">{inc.department || 'GLOBAL'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!loading && (
             <div className="px-6 py-3 border-t bg-gray-900 flex justify-between items-center" style={{ borderColor: BORDER }}>
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[2px]">Matching: {filteredAndSorted.length} / {incidents.length}</p>
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[2px]">Sorted by: {sortField.replace('_', ' ')} ({sortOrder.toUpperCase()})</p>
             </div>
          )}
        </div>
      </main>

      <CreateIncidentModal isOpen={createOpen} onClose={() => setCreateOpen(false)} onSuccess={fetchIncidents} />
      <IncidentDetailModal isOpen={detailOpen} onClose={() => setDetailOpen(false)} incident={selectedInc} onUpdate={fetchIncidents} />
    </div>
  );
};

export default HSEIncidentLog;
