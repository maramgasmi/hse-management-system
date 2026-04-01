// =============================================================
// EditIncidentModal.jsx — high-fidelity dark redesign
// -------------------------------------------------------------
// Consistent with SafetyFirst HSE dark theme.
// Features: Dynamic tabs (General vs Investigation), evidence
// management, and ISO-compliant investigation fields.
// =============================================================

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
    XMarkIcon, 
    PencilSquareIcon, 
    MagnifyingGlassCircleIcon,
    CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import api, { fetchEvidence, uploadEvidence } from '../services/api';
import toast from 'react-hot-toast';
import EvidenceUploader from './EvidenceUploader';
import EvidenceViewer from './EvidenceViewer';

// ---------------------------------------------------------------
// Theme tokens
// ---------------------------------------------------------------
const CARD_BG   = '#151921';
const BORDER    = '#232933';
const INSET_BG  = '#0F131A';
const BLUE      = '#3498DB';
const ORANGE    = '#E67E22';

const FormField = ({ label, name, value, onChange, type = 'text', as = 'input', required, placeholder, children, icon: Icon }) => {
  const inputStyle = {
    background: INSET_BG,
    border: `1px solid ${BORDER}`,
    color: '#FFF',
    borderRadius: 6,
    width: '100%',
    padding: Icon ? '8px 12px 8px 36px' : '8px 12px',
    fontSize: 14,
    outline: 'none',
  };

  return (
    <div className="mb-4">
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
        {label}{required && <span style={{ color: ORANGE }}> *</span>}
      </label>
      <div className="relative">
          {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />}
          {as === 'textarea' ? (
            <textarea
              name={name}
              value={value}
              onChange={onChange}
              style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
              placeholder={placeholder}
              required={required}
            />
          ) : as === 'select' ? (
            <select name={name} value={value} onChange={onChange} style={inputStyle} required={required}>
              {children}
            </select>
          ) : (
            <input
              type={type}
              name={name}
              value={value}
              onChange={onChange}
              style={inputStyle}
              placeholder={placeholder}
              required={required}
            />
          )}
      </div>
    </div>
  );
};

const EditIncidentModal = ({ isOpen, onClose, onSuccess, incident }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'investigation'
  const [attachments, setAttachments] = useState([]);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    incident_type: 'ACCIDENT',
    severity: 'MEDIUM',
    status: 'DRAFT',
    incident_date: '',
    location: '',
    department: '',
    injuries: '',
    has_property_damage: false,
    property_damage: '',
    work_hours_lost: 0,
    days_lost: 0,
    root_cause_category: '',
    root_cause_description: '',
    estimated_cost: 0,
  });

  useEffect(() => {
    if (incident) {
      setFormData({
        title: incident.title || '',
        description: incident.description || '',
        incident_type: incident.incident_type || 'ACCIDENT',
        severity: incident.severity || 'MEDIUM',
        status: incident.status || 'DRAFT',
        incident_date: incident.incident_date ? new Date(incident.incident_date).toISOString().split('T')[0] : '',
        location: incident.location || '',
        department: incident.department || '',
        injuries: incident.injuries || '',
        has_property_damage: incident.has_property_damage || false,
        property_damage: incident.property_damage || '',
        work_hours_lost: incident.work_hours_lost || 0,
        days_lost: incident.days_lost || 0,
        root_cause_category: incident.root_cause_category || '',
        root_cause_description: incident.root_cause_description || '',
        estimated_cost: incident.estimated_cost || 0,
      });

      const loadAttachments = async () => {
        try {
          const res = await fetchEvidence(incident.id);
          const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
          setAttachments(data);
        } catch (err) { console.warn('⚠️ Attachments failed:', err); }
      };
      loadAttachments();
    }
  }, [incident]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
    }));
  };

  const handleNewFiles = async (files) => {
    if (!files.length) return;
    const initialQueue = files.map((f) => ({ name: f.name, progress: 0 }));
    setUploadQueue(initialQueue);
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
            const res = await uploadEvidence(incident.id, file, (pct) => {
                setUploadQueue(prev => prev.map((s, idx) => idx === i ? { ...s, progress: pct } : s));
            });
            setAttachments(prev => [...prev, res.data]);
        } catch (err) { toast.error(`Failed to attach "${file.name}"`); }
    }
    setUploadQueue([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/incidents/${incident.id}/`, formData);
      toast.success(t('common.save_changes') + ' ✅');
      onSuccess?.();
      onClose();
    } catch (error) {
      const msg = error.response?.data?.detail || 'Update failed. Check requirements.';
      toast.error(msg);
    } finally { setLoading(false); }
  };

  if (!incident) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.8)' }} />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-2xl rounded-xl shadow-2xl flex flex-col" style={{ background: CARD_BG, border: `1px solid ${BORDER}`, maxHeight: '90vh' }}>
                
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md" style={{ background: `${BLUE}18` }}>
                      <PencilSquareIcon className="h-5 w-5" style={{ color: BLUE }} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white leading-tight">#{incident?.reference} — {t('sidebar.report_incident')}</h3>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('incident_log.subtitle')}</p>
                    </div>
                  </div>
                  <button onClick={onClose} className="p-2 rounded-md hover:bg-white/5 transition-colors">
                    <XMarkIcon className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex px-6 pt-4 gap-6" style={{ background: INSET_BG, borderBottom: `1px solid ${BORDER}` }}>
                    <button onClick={() => setActiveTab('general')} className={`pb-3 text-[10px] font-bold uppercase tracking-widest relative transition-all ${activeTab === 'general' ? 'text-blue-500' : 'text-gray-600 hover:text-gray-400'}`}>
                        {t('common.general_info')}
                        {activeTab === 'general' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />}
                    </button>
                    <button onClick={() => setActiveTab('investigation')} className={`pb-3 text-[10px] font-bold uppercase tracking-widest relative transition-all ${activeTab === 'investigation' ? 'text-blue-500' : 'text-gray-600 hover:text-gray-400'}`}>
                        {t('common.investigation')}
                        {activeTab === 'investigation' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />}
                    </button>
                </div>

                {/* Form Content */}
                <form id="edit-incident-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                  {activeTab === 'general' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 animate-in fade-in duration-300">
                        <div className="col-span-2">
                           <FormField label={t('forms.incident_title')} name="title" value={formData.title} onChange={handleChange} required />
                           <FormField label={t('forms.description')} name="description" as="textarea" value={formData.description} onChange={handleChange} required />
                        </div>
                        
                        <FormField label={t('forms.incident_type')} name="incident_type" as="select" value={formData.incident_type} onChange={handleChange} required>
                           <option value="ACCIDENT">{t('incident_types.ACCIDENT')}</option>
                           <option value="NEAR_MISS">{t('incident_types.NEAR_MISS')}</option>
                           <option value="UNSAFE_CONDITION">{t('incident_types.UNSAFE_CONDITION')}</option>
                           <option value="FIRST_AID">{t('incident_types.FIRST_AID')}</option>
                           <option value="ENVIRONMENTAL">{t('incident_types.ENVIRONMENTAL')}</option>
                        </FormField>

                        <FormField label={t('forms.severity')} name="severity" as="select" value={formData.severity} onChange={handleChange} required>
                           <option value="LOW">{t('severity_levels.LOW')}</option>
                           <option value="MEDIUM">{t('severity_levels.MEDIUM')}</option>
                           <option value="HIGH">{t('severity_levels.HIGH')}</option>
                           <option value="CRITICAL">{t('severity_levels.CRITICAL')}</option>
                        </FormField>

                        <FormField label={t('forms.date')} name="incident_date" type="date" value={formData.incident_date} onChange={handleChange} required />
                        <FormField label={t('common.status')} name="status" as="select" value={formData.status} onChange={handleChange} required>
                            <option value="DRAFT">{t('status.DRAFT')}</option>
                            <option value="SUBMITTED">{t('status.SUBMITTED')}</option>
                            <option value="UNDER_INVESTIGATION">{t('status.UNDER_INVESTIGATION')}</option>
                            <option value="VALIDATED">{t('status.VALIDATED')}</option>
                            <option value="CLOSED">{t('status.CLOSED')}</option>
                        </FormField>

                        <FormField label={t('common.location')} name="location" value={formData.location} onChange={handleChange} required />
                        <FormField label={t('common.department')} name="department" value={formData.department} onChange={handleChange} />

                        <div className="col-span-2 space-y-4 mt-4">
                           <hr style={{ borderColor: BORDER }} />
                           <FormField label={t('forms.injuries')} name="injuries" as="textarea" value={formData.injuries} onChange={handleChange} />
                           
                           <div className="mb-4">
                              <label className="flex items-center gap-3 cursor-pointer group">
                                  <input 
                                    type="checkbox" 
                                    name="has_property_damage" 
                                    checked={formData.has_property_damage} 
                                    onChange={handleChange}
                                    className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-blue-500 focus:ring-blue-500/20"
                                  />
                                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-gray-200 transition-colors">
                                    {t('forms.has_property_damage')}
                                  </span>
                              </label>
                           </div>

                           {formData.has_property_damage && (
                              <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                                  <FormField 
                                    label={t('forms.property_damage')} 
                                    name="property_damage" 
                                    as="textarea" 
                                    value={formData.property_damage} 
                                    onChange={handleChange} 
                                  />
                              </div>
                           )}

                           <div className="grid grid-cols-2 gap-4">
                                <FormField label={t('forms.hrs_lost')} name="work_hours_lost" type="number" value={formData.work_hours_lost} onChange={handleChange} />
                                <FormField label={t('forms.days_lost')} name="days_lost" type="number" value={formData.days_lost} onChange={handleChange} />
                           </div>
                        </div>
                    </div>
                  ) : (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex items-center gap-2 mb-4">
                            <MagnifyingGlassCircleIcon className="h-5 w-5 text-blue-500" />
                            <h4 className="text-sm font-bold text-white">{t('common.investigation')}</h4>
                        </div>
                        
                        <FormField label={t('forms.root_cause_category')} name="root_cause_category" as="select" value={formData.root_cause_category} onChange={handleChange}>
                            <option value="">{t('common.search')}...</option>
                            <option value="HUMAN_ERROR">Human Error / Unsafe Act</option>
                            <option value="EQUIPMENT_FAILURE">Equipment / Tool Failure</option>
                            <option value="PROCESS_GAP">Workflow / Process Gap</option>
                            <option value="ENVIRONMENTAL_FACTOR">Environmental Factors</option>
                            <option value="MANAGEMENT_FAILURE">Supervisory / Mgmt Failure</option>
                            <option value="TRAINING_GAP">Inadequate Training</option>
                        </FormField>

                        <FormField label={t('forms.root_cause_description')} name="root_cause_description" as="textarea" value={formData.root_cause_description} onChange={handleChange} />
                        
                        <FormField label={t('forms.estimated_cost')} name="estimated_cost" type="number" value={formData.estimated_cost} onChange={handleChange} icon={CurrencyDollarIcon} />
                        
                        <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                            <p className="text-xs text-blue-300 font-medium leading-relaxed italic">
                                Note: Root causes are mandatory for ISO 45001 compliance.
                            </p>
                        </div>
                    </div>
                  )}

                  <div className="mt-8">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 ml-1">{t('common.evidence')}</label>
                        <div className="rounded-lg p-4" style={{ background: INSET_BG, border: `1px solid ${BORDER}` }}>
                            <EvidenceViewer attachments={attachments} uploadQueue={uploadQueue} onDelete={(id) => setAttachments(p => p.filter(a => a.id !== id))} />
                            <div className="mt-4 border-t pt-4" style={{ borderColor: BORDER }}>
                                <EvidenceUploader onFilesChange={handleNewFiles} />
                            </div>
                        </div>
                  </div>
                </form>

                {/* Footer */}
                <div className="flex items-center justify-between px-8 py-6" style={{ borderTop: `1px solid ${BORDER}`, background: INSET_BG }}>
                    <div className="flex items-center gap-2">
                        <div className={`h-1.5 w-1.5 rounded-full ${loading ? 'animate-pulse bg-blue-500' : 'bg-green-500'}`} />
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{loading ? 'Processing' : 'System Ready'}</span>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="px-5 py-2 text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors">{t('common.cancel')}</button>
                        <button form="edit-incident-form" type="submit" disabled={loading} className="px-8 py-2.5 rounded-md text-xs font-bold text-white shadow-xl active:scale-95 transition-all" style={{ background: `linear-gradient(90deg, #2980B9 0%, ${BLUE} 100%)` }}>
                            {loading ? '...' : t('common.save_changes')}
                        </button>
                    </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default EditIncidentModal;