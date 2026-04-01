// =============================================================
// CreateIncidentModal.jsx — high-fidelity dark redesign
// -------------------------------------------------------------
// Features in this version:
//   • Full-screen dark modal (SafetyFirst HSE theme)
//   • Backdrop blur with semi-transparent overlay
//   • Detailed form layout with industrial typography
//   • File Evidence Uploader (integrated before submission)
//   • Multi-step process (record incident → upload evidence sequentaly)
//
// All colours match the #0B0E14 → #151921 palette.
// =============================================================

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, DocumentPlusIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import api, { uploadEvidence } from '../services/api';
import toast from 'react-hot-toast';
import EvidenceUploader from './EvidenceUploader';

// ---------------------------------------------------------------
// Theme tokens
// ---------------------------------------------------------------
const BG        = '#0B0E14';
const CARD_BG   = '#151921';
const BORDER    = '#232933';
const INSET_BG  = '#0F131A';
const BLUE      = '#3498DB';
const ORANGE    = '#E67E22';

// ---------------------------------------------------------------
// Custom input field component
// ---------------------------------------------------------------
const FormField = ({ label, name, value, onChange, type = 'text', as = 'input', required, placeholder, options, children }) => {
  const inputStyle = {
    background: INSET_BG,
    border: `1px solid ${BORDER}`,
    color: '#FFF',
    borderRadius: 6,
    width: '100%',
    padding: '8px 12px',
    fontSize: 14,
    focusBorderColor: BLUE,
    outline: 'none',
  };

  return (
    <div className="mb-4">
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
        {label}{required && <span style={{ color: ORANGE }}> *</span>}
      </label>
      {as === 'textarea' ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
          placeholder={placeholder}
          required={required}
        />
      ) : as === 'select' ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          style={inputStyle}
          required={required}
        >
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
  );
};

const CreateIncidentModal = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploadStatuses, setUploadStatuses] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    incident_type: 'ACCIDENT',
    severity: 'MEDIUM',
    incident_date: new Date().toISOString().split('T')[0],
    location: '',
    department: '',
    injuries: '',
    has_property_damage: false,
    property_damage: '',
    work_hours_lost: 0,
    days_lost: 0,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      incident_type: 'ACCIDENT',
      severity: 'MEDIUM',
      incident_date: new Date().toISOString().split('T')[0],
      location: '',
      department: '',
      injuries: '',
      has_property_damage: false,
      property_damage: '',
      work_hours_lost: 0,
      days_lost: 0,
    });
    setPendingFiles([]);
    setUploadStatuses([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Step 1: Create incident record
      const response = await api.post('/incidents/', { ...formData, status: 'DRAFT' });
      const newIncident = response.data;
      
      // Step 2: Upload evidence files sequentially
      if (pendingFiles.length > 0) {
        toast.loading(t('common.evidence') + '...', { id: 'upload-toast' });
        
        for (let i = 0; i < pendingFiles.length; i++) {
          const file = pendingFiles[i];
          try {
            await uploadEvidence(newIncident.id, file, (progress) => {
              setUploadStatuses(prev => {
                const copy = [...prev];
                copy[i] = { name: file.name, progress };
                return copy;
              });
            });
          } catch (uploadErr) {
            console.error(`❌ Failed to upload ${file.name}:`, uploadErr);
            toast.error(`Failed to upload ${file.name}`);
          }
        }
        toast.dismiss('upload-toast');
      }

      toast.success(t('common.save_changes') + ' ✅');
      resetForm();
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('❌ Error reporting incident:', err);
      const msg = err.response?.data?.detail || Object.values(err.response?.data || {}).flat().join(', ') || 'Failed to report incident';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        
        {/* Backdrop blur */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.7)' }} />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className="w-full max-w-2xl rounded-lg shadow-2xl transition-all"
                style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
              >
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md" style={{ background: `${BLUE}18` }}>
                      <DocumentPlusIcon className="h-5 w-5" style={{ color: BLUE }} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white leading-tight">{t('sidebar.report_incident')}</h3>
                      <p className="text-xs text-gray-500 font-medium">{t('incident_log.subtitle')}</p>
                    </div>
                  </div>
                  <button onClick={onClose} className="p-1.5 rounded-md hover:bg-white/5 transition-colors">
                    <XMarkIcon className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    {/* Main Information */}
                    <div className="col-span-1 md:col-span-2">
                       <FormField label={t('forms.incident_title')} name="title" value={formData.title} onChange={handleChange} required placeholder="..." />
                       <FormField label={t('forms.description')} name="description" as="textarea" value={formData.description} onChange={handleChange} required placeholder="..." />
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
                    
                    <FormField label={t('forms.location')} name="location" value={formData.location} onChange={handleChange} required placeholder="e.g. Workshop B" />
                    <FormField label={t('forms.department')} name="department" value={formData.department} onChange={handleChange} placeholder="e.g. Operations" />
                    
                    <div className="col-span-1 md:col-span-2">
                      <hr className="my-4" style={{ borderColor: BORDER }} />
                      <h4 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3">{t('forms.optional')}</h4>
                    </div>

                    <FormField label={t('forms.injuries')} name="injuries" value={formData.injuries} onChange={handleChange} placeholder="..." />
                    
                    <div className="col-span-1 md:col-span-2 mb-4">
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
                       <div className="col-span-1 md:col-span-2 animate-in fade-in slide-in-from-top-1 duration-300">
                          <FormField 
                             label={t('forms.property_damage')} 
                             name="property_damage" 
                             as="textarea" 
                             value={formData.property_damage} 
                             onChange={handleChange} 
                             placeholder="..." 
                          />
                       </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                       <FormField label={t('forms.hrs_lost')} name="work_hours_lost" type="number" value={formData.work_hours_lost} onChange={handleChange} />
                       <FormField label={t('forms.days_lost')} name="days_lost" type="number" value={formData.days_lost} onChange={handleChange} />
                    </div>

                    {/* Evidence Uploader Section */}
                    <div className="col-span-1 md:col-span-2 mt-2">
                       <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 ml-1">{t('common.evidence')}</label>
                       <EvidenceUploader
                          pendingFiles={pendingFiles}
                          setPendingFiles={setPendingFiles}
                          uploadStatuses={uploadStatuses}
                       />
                    </div>
                  </div>

                  {/* Footer Actions */}
                   <div className="flex items-center justify-end gap-3 mt-8 pt-6" style={{ borderTop: `1px solid ${BORDER}` }}>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-2 rounded-md text-sm font-bold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                      style={{ background: 'linear-gradient(90deg, #2980B9 0%, #3498DB 100%)' }}
                    >
                      {loading ? '...' : (
                        <Fragment>
                          <CheckCircleIcon className="h-4 w-4" />
                          {t('sidebar.report_incident')}
                        </Fragment>
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default CreateIncidentModal;