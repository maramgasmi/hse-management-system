import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import {
  XMarkIcon,
  PencilSquareIcon,
  PlusCircleIcon,
  CheckCircleIcon,
  ShieldExclamationIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import toast from 'react-hot-toast';
import EditIncidentModal from './EditIncidentModal';

const CARD_BG = '#151921';
const BORDER_COL = '#232933';
const INSET_BG = '#0F131A';
const BLUE = '#3498DB';
const GREEN = '#10B981';
const ORANGE = '#E67E22';
const RED = '#EF4444';
const YELLOW = '#EAB308';

const SEVERITY_PILL = {
  CRITICAL: { bg: '#7F1D1D', color: '#FCA5A5', border: '#EF4444' },
  HIGH: { bg: '#7C2D12', color: '#FDBA74', border: '#F97316' },
  MEDIUM: { bg: '#713F12', color: '#FDE047', border: '#EAB308' },
  LOW: { bg: '#14532D', color: '#86EFAC', border: '#22C55E' },
};

const STATUS_COLORS = {
  DRAFT: '#6B7280',
  SUBMITTED: '#3498DB',
  UNDER_INVESTIGATION: '#A855F7',
  VALIDATED: '#10B981',
  CLOSED: '#4B5563',
};

const IncidentDetailModal = ({ incident, isOpen, onClose, onUpdate }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [localInc, setLocalInc] = useState(incident);
  const [saving, setSaving] = useState(false);

  // Investigation Edit State
  const [isEditingInvest, setIsEditingInvest] = useState(false);
  const [investData, setInvestData] = useState({
    root_cause_category: '',
    root_cause_description: ''
  });

  // CAPA State
  const [capaData, setCapaData] = useState({
    title: '',
    description: '',
    due_date: '',
    control_hierarchy: 'ADMINISTRATIVE'
  });

  useEffect(() => {
    if (incident) {
      setLocalInc(incident);
      setInvestData({
        root_cause_category: incident.root_cause_category || '',
        root_cause_description: incident.root_cause_description || ''
      });
    }
  }, [incident]);

  const handleRefresh = async () => {
    try {
      const res = await api.get(`/incidents/${localInc.id}/`);
      setLocalInc(res.data);
      setInvestData({
        root_cause_category: res.data.root_cause_category || '',
        root_cause_description: res.data.root_cause_description || ''
      });
      onUpdate?.();
    } catch (_) {}
  };

  const handleSaveInvestigation = async () => {
    setSaving(true);
    try {
      await api.patch(`/incidents/${localInc.id}/`, investData);
      toast.success(t('common.success'));
      setIsEditingInvest(false);
      handleRefresh();
    } catch (err) {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddCapa = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // ✅ Added action_type: 'CORRECTIVE' (Required by model)
      await api.post('/capas/', { 
        ...capaData, 
        incident: localInc.id, 
        status: 'OPEN',
        action_type: 'CORRECTIVE',
        description: capaData.title // Duplicate title to description if not provided
      });
      toast.success(t('common.success'));
      setCapaData({ title: '', description: '', due_date: '', control_hierarchy: 'ADMINISTRATIVE' });
      handleRefresh();
    } catch (err) {
      const msg = err.response?.data?.detail || t('common.error');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAssessRisk = async () => {
    setSaving(true);
    try {
      await api.patch(`/incidents/${localInc.id}/assess-risk/`);
      toast.success('ISO 45001 Risk Calculation Complete');
      handleRefresh();
    } catch (err) {
      toast.error('Risk Matrix Error');
    } finally {
      setSaving(false);
    }
  };

  if (!localInc) return null;

  const tabs = [
    t('forms.tabs.general'),
    t('forms.tabs.investigation'),
    'CAPA',
    'RISK'
  ];

  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.75)' }} />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${BORDER_COL}` }}>
                  
                  {/* Header */}
                  <div className="px-8 pt-6 pb-2" style={{ borderBottom: `1px solid ${BORDER_COL}` }}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border" style={{ background: `${SEVERITY_PILL[localInc.severity]?.bg}20`, color: SEVERITY_PILL[localInc.severity]?.color, borderColor: SEVERITY_PILL[localInc.severity]?.border }}>
                          {t(`severity_levels.${localInc.severity}`, localInc.severity)}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border" style={{ background: `${STATUS_COLORS[localInc.status]}20`, color: STATUS_COLORS[localInc.status], borderColor: `${STATUS_COLORS[localInc.status]}50` }}>
                          {t(`status.${localInc.status}`, localInc.status?.replace('_', ' '))}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditOpen(true)} className="p-1 rounded hover:bg-white/5 transition-colors">
                          <PencilSquareIcon className="h-5 w-5 text-gray-400" />
                        </button>
                        <button onClick={onClose} className="p-1 rounded hover:bg-white/5 transition-colors">
                          <XMarkIcon className="h-5 w-5 text-gray-400" />
                        </button>
                      </div>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">{localInc.title}</h2>
                    <p className="text-xs text-blue-500 font-bold uppercase tracking-widest mb-4">#{localInc.reference} • {t(`incident_types.${localInc.incident_type}`, localInc.incident_type)}</p>

                    <div className="flex gap-8">
                      {tabs.map((tab, idx) => (
                        <button key={tab} onClick={() => setActiveTab(idx)} className={`pb-4 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === idx ? 'text-blue-500' : 'text-gray-500 hover:text-gray-300'}`}>
                          {tab}
                          {activeTab === idx && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="px-4 sm:px-8 py-8 max-h-[75vh] overflow-y-auto scrollbar-hide">
                    {/* --- TAB 0: GENERAL --- */}
                    {activeTab === 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{t('common.date')}</label>
                          <p className="text-sm font-medium text-white">{localInc.incident_date}</p>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{t('common.location')}</label>
                          <p className="text-sm font-medium text-white">{localInc.location}</p>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{t('common.department')}</label>
                          <p className="text-sm font-medium text-white">{localInc.department}</p>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{t('forms.has_property_damage')}</label>
                          <p className="text-sm font-medium text-white">{localInc.has_property_damage ? 'YES' : 'NO'}</p>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{t('forms.description')}</label>
                          <p className="text-sm text-gray-400 leading-relaxed">{localInc.description}</p>
                        </div>
                      </div>
                    )}

                    {/* --- TAB 1: INVESTIGATION --- */}
                    {activeTab === 1 && (
                      <div className="space-y-6">
                        <div className="flex justify-between items-center bg-[#0F131A] p-4 rounded-md border border-white/5">
                           <div className="flex-1">
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{t('forms.root_cause_category')}</label>
                              {isEditingInvest ? (
                                <select 
                                  value={investData.root_cause_category} 
                                  onChange={e => setInvestData({...investData, root_cause_category: e.target.value})}
                                  className="bg-[#0F131A] border border-gray-700 rounded text-xs text-white p-2 w-full outline-none focus:border-blue-500 transition-colors"
                                  style={{ colorScheme: 'dark' }}
                                >
                                  <option value="">{t('common.search')}...</option>
                                  <option value="HUMAN_ERROR">{t('rca_categories.HUMAN_ERROR')}</option>
                                  <option value="EQUIPMENT_FAILURE">{t('rca_categories.EQUIPMENT_FAILURE')}</option>
                                  <option value="PROCESS_GAP">{t('rca_categories.PROCESS_GAP')}</option>
                                  <option value="ENVIRONMENTAL_FACTOR">{t('rca_categories.ENVIRONMENTAL_FACTOR')}</option>
                                  <option value="MANAGEMENT_FAILURE">{t('rca_categories.MANAGEMENT_FAILURE')}</option>
                                  <option value="TRAINING_GAP">{t('rca_categories.TRAINING_GAP')}</option>
                                </select>
                              ) : (
                                <div className="inline-block px-3 py-1 rounded bg-white/5 text-xs font-bold text-white uppercase border border-white/10">
                                  {t(`rca_categories.${localInc.root_cause_category}`, localInc.root_cause_category?.replace('_', ' ') || 'NOT INVESTIGATED')}
                                </div>
                              )}
                           </div>
                           <button onClick={() => isEditingInvest ? handleSaveInvestigation() : setIsEditingInvest(true)} className="ml-4 px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-colors" style={{ background: isEditingInvest ? GREEN : BLUE, color: '#FFF' }}>
                              {saving ? '...' : isEditingInvest ? t('common.save') : 'EDIT RCA'}
                           </button>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Investigation Report</label>
                          {isEditingInvest ? (
                            <textarea 
                              value={investData.root_cause_description} 
                              onChange={e => setInvestData({...investData, root_cause_description: e.target.value})}
                              className="w-full min-h-[150px] bg-[#0F131A] border border-gray-700 rounded p-3 text-sm text-white focus:outline-none"
                              placeholder="Enter detailed investigation findings..."
                            />
                          ) : (
                            <p className="text-sm text-gray-400 leading-relaxed bg-[#0F131A] p-4 rounded border border-white/5 whitespace-pre-wrap">
                              {localInc.root_cause_description || 'No detailed report has been submitted yet.'}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* --- TAB 2: CAPA --- */}
                    {activeTab === 2 && (
                      <div className="space-y-6">
                        {/* List Existing CAPAs */}
                        <div className="space-y-3">
                           <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('incident_log.active_actions', { count: localInc.capas?.length || 0 })}</p>
                           {localInc.capas?.map(capa => (
                             <div key={capa.id} className="p-4 rounded bg-[#0F131A] border border-white/5 group relative">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                     <h4 className="text-sm font-bold text-white mb-0.5">{capa.title}</h4>
                                     <p className="text-[9px] font-bold text-blue-400 uppercase">{t(`forms.hierarchy_of_control_options.${capa.control_hierarchy}`, capa.control_hierarchy)}</p>
                                  </div>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase" style={{ background: capa.status === 'OPEN' ? `${ORANGE}20` : `${GREEN}20`, color: capa.status === 'OPEN' ? ORANGE : GREEN }}>{capa.status}</span>
                                </div>
                                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
                                   <p className="text-[10px] text-gray-500 uppercase font-bold">{t('common.due')}: {capa.due_date}</p>
                                </div>
                             </div>
                           ))}
                        </div>

                        {/* Add New CAPA Form */}
                        <form onSubmit={handleAddCapa} className="mt-8 pt-8 border-t border-white/10">
                           <div className="flex items-center gap-2 mb-4">
                              <div className="h-0.5 flex-1 bg-white/5" />
                              <span className="text-[10px] font-bold text-gray-500 uppercase">Issue New Action</span>
                              <div className="h-0.5 flex-1 bg-white/5" />
                           </div>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="col-span-2">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">{t('forms.title')}</label>
                                <input required value={capaData.title} onChange={e => setCapaData({...capaData, title: e.target.value})} className="w-full bg-[#0F131A] border border-gray-800 rounded p-2 text-xs text-white" />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">{t('forms.hierarchy_of_control')}</label>
                                <select value={capaData.control_hierarchy} onChange={e => setCapaData({...capaData, control_hierarchy: e.target.value})} className="w-full bg-[#0F131A] border border-gray-800 rounded p-2 text-xs text-white" style={{ colorScheme: 'dark' }}>
                                  <option value="ELIMINATION">1. Elimination</option>
                                  <option value="SUBSTITUTION">2. Substitution</option>
                                  <option value="ENGINEERING">3. Engineering</option>
                                  <option value="ADMINISTRATIVE">4. Admin</option>
                                  <option value="PPE">5. PPE</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">{t('forms.due_date')}</label>
                                <input required type="date" value={capaData.due_date} onChange={e => setCapaData({...capaData, due_date: e.target.value})} className="w-full bg-[#0F131A] border border-gray-800 rounded p-2 text-xs text-white" style={{ colorScheme: 'dark' }} />
                              </div>
                           </div>
                           <button type="submit" disabled={saving} className="w-full mt-4 py-2 rounded text-[10px] font-black uppercase text-white shadow-xl transition-all hover:opacity-90 flex items-center justify-center gap-2" style={{ background: BLUE }}>
                              <PlusCircleIcon className="h-3.5 w-3.5" /> {saving ? '...' : 'ASSIGN ACTION'}
                           </button>
                        </form>
                      </div>
                    )}

                    {/* --- TAB 3: RISK --- */}
                    {activeTab === 3 && (
                      <div className="flex flex-col items-center justify-center py-8">
                        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 relative" style={{ background: `${BLUE}10`, border: `2px dashed ${BLUE}30` }}>
                           <ShieldExclamationIcon className="h-10 w-10 text-blue-500" />
                        </div>
                        <h4 className="text-white font-bold text-center mb-2 uppercase tracking-widest">{t('dashboard.charts.risk_matrix')}</h4>
                        <p className="text-xs text-gray-500 text-center mb-8 px-12">{t('dashboard.risk_heatmap_sub')}</p>
                        
                        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-8">
                           <div className="bg-[#0F131A] p-4 rounded text-center border border-white/10">
                              <p className="text-[10px] font-bold text-gray-500 mb-1">SCORE</p>
                              <p className="text-xl font-black text-white">{localInc.risk_assessment?.risk_level || 'N/A'}</p>
                           </div>
                           <div className="bg-[#0F131A] p-4 rounded text-center border border-white/10">
                              <p className="text-[10px] font-bold text-gray-500 mb-1">GRADE</p>
                              <p className="text-sm font-black text-blue-500 uppercase">{localInc.risk_assessment?.risk_category || 'UNRATED'}</p>
                           </div>
                        </div>

                        <button onClick={handleAssessRisk} disabled={saving} className="px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-tighter text-white transition-all shadow-2xl active:scale-95" style={{ background: `linear-gradient(135deg, ${BLUE}, ${ORANGE})` }}>
                           {saving ? '...' : 'Recalculate ISO Risk'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="px-8 py-4 bg-black/20 flex justify-between items-center border-t border-white/5">
                    <div className="flex items-center gap-2">
                       <AcademicCapIcon className="h-4 w-4 text-gray-600" />
                       <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">ISO 45001 Compliance Verified</span>
                    </div>
                    <button onClick={onClose} className="px-6 py-2 rounded-md text-xs font-bold text-white transition-colors hover:bg-white/5" style={{ border: `1px solid ${BORDER_COL}` }}>
                      {t('common.close')}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <EditIncidentModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        incident={localInc}
        onSuccess={handleRefresh}
      />
    </>
  );
};

export default IncidentDetailModal;
