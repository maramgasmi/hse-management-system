import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          localStorage.setItem('access_token', access);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// ============================================================
// EVIDENCE / ATTACHMENTS API FUNCTIONS
// These are named exports so individual components can import
// only the function they need (tree-shaking friendly).
// ============================================================

/**
 * Upload a single file as evidence for a given incident.
 */
export const uploadEvidence = (incidentId, file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  return api.post(`/incidents/${incidentId}/add_evidence/`, formData, {
    onUploadProgress: (progressEvent) => {
      const percentage = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      if (onProgress) onProgress(percentage);
    },
  });
};

/**
 * Fetch the list of evidence attached to a specific incident.
 */
export const fetchEvidence = (incidentId) =>
  api.get(`/incidents/${incidentId}/evidence/`);

/**
 * Delete a specific evidence item by its own ID.
 */
export const deleteEvidence = (evidenceId) =>
  api.delete(`/evidence/${evidenceId}/`);

/**
 * Export all incidents as a PDF report.
 * Since we need to pass the Authorization header, we fetch as a blob.
 */
export const exportIncidentsPdf = async () => {
  try {
    const response = await api.get('/incidents/export-pdf/', {
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf'
      }
    });
    
    // Create a URL for the blob
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    
    // Set filename
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `HSE_Audit_Registry_${dateStr}.pdf`);
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('PDF Export failed:', error);
    throw error;
  }
};