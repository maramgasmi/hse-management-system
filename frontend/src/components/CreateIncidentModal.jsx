import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import toast from 'react-hot-toast';

const CreateIncidentModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    incident_type: 'ACCIDENT',
    severity: 'MEDIUM',
    incident_date: new Date().toISOString().split('T')[0],
    location: '',
    department: '',
    injuries: '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Add status field for Django
      const dataToSend = {
        ...formData,
        status: 'DRAFT',
      };
      
      console.log('📤 Sending incident data:', dataToSend);
      
      const response = await api.post('/incidents/', dataToSend);
      
      console.log('✅ Incident created successfully:', response.data);
      console.log('🔄 Calling onSuccess callback to refresh table...');
      
      toast.success('Incident created successfully! ✅');
      
      // Close modal first
      onClose();
      
      // Then refresh the list (this calls refreshIncidents in parent)
      await onSuccess();
      
      console.log('✅ Table refresh completed!');
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        incident_type: 'ACCIDENT',
        severity: 'MEDIUM',
        incident_date: new Date().toISOString().split('T')[0],
        location: '',
        department: '',
        injuries: '',
        work_hours_lost: 0,
        days_lost: 0,
      });
    } catch (error) {
      console.error('❌ Error creating incident:', error);
      console.error('❌ Error response:', error.response?.data);
      
      const errorMsg = error.response?.data?.detail || 
                       JSON.stringify(error.response?.data) || 
                       'Failed to create incident';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="div"
                  className="flex justify-between items-center mb-4"
                >
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    Create New Incident
                  </h3>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </Dialog.Title>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information Section */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                      Basic Information
                    </h4>
                    <div className="space-y-4">
                      {/* Title */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Title *
                        </label>
                        <input
                          type="text"
                          name="title"
                          required
                          value={formData.title}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
                          placeholder="Brief description of the incident"
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Description *
                        </label>
                        <textarea
                          name="description"
                          required
                          rows={3}
                          value={formData.description}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
                          placeholder="Detailed description of what happened"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Classification Section */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                      Classification
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Incident Type *
                        </label>
                        <select
                          name="incident_type"
                          value={formData.incident_type}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
                        >
                          <option value="ACCIDENT">Accident</option>
                          <option value="NEAR_MISS">Near Miss</option>
                          <option value="UNSAFE_CONDITION">Unsafe Condition</option>
                          <option value="ENVIRONMENTAL">Environmental</option>
                        </select>
                      </div>

                      {/* Severity */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Severity *
                        </label>
                        <select
                          name="severity"
                          value={formData.severity}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="CRITICAL">Critical</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Location & Time Section */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                      Location & Time
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Date *
                        </label>
                        <input
                          type="date"
                          name="incident_date"
                          required
                          value={formData.incident_date}
                          onChange={handleChange}
                          max={new Date().toISOString().split('T')[0]}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
                        />
                      </div>

                      {/* Location */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Location *
                        </label>
                        <input
                          type="text"
                          name="location"
                          required
                          value={formData.location}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
                          placeholder="Where it happened"
                        />
                      </div>

                      {/* Department */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Department *
                        </label>
                        <input
                          type="text"
                          name="department"
                          required
                          value={formData.department}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
                          placeholder="e.g., Operations"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Impact Section */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                      Impact
                    </h4>
                    <div className="space-y-4">
                      {/* Injuries */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Injuries (if any)
                        </label>
                        <input
                          type="text"
                          name="injuries"
                          value={formData.injuries}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
                          placeholder="Describe any injuries"
                        />
                      </div>

                      {/* Work Impact */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Work Hours Lost
                          </label>
                          <input
                            type="number"
                            name="work_hours_lost"
                            min="0"
                            value={formData.work_hours_lost}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Days Lost
                          </label>
                          <input
                            type="number"
                            name="days_lost"
                            min="0"
                            value={formData.days_lost}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creating...
                        </span>
                      ) : (
                        'Create Incident'
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