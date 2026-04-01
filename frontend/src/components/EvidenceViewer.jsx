// =============================================================
// EvidenceViewer.jsx — high-fidelity dark redesign
// -------------------------------------------------------------
// Consistent with SafetyFirst HSE dark theme.
// Displays saved attachments with optimistic deletion and 
// download functionality.
// =============================================================

import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  DocumentIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { deleteEvidence } from '../services/api';

const BORDER    = '#232933';
const INSET_BG  = '#0F131A';
const BLUE      = '#3498DB';

const EvidenceViewer = ({ attachments = [], onDelete, uploadQueue = [] }) => {
  const [localAttachments, setLocalAttachments] = useState(attachments);

  if (attachments !== undefined && localAttachments !== attachments) {
    setLocalAttachments(attachments);
  }

  const handleDelete = async (evidence) => {
    if (!window.confirm(`Permanently delete "${evidence.filename || 'this file'}" from records?`)) return;

    setLocalAttachments((prev) => prev.filter((e) => e.id !== evidence.id));

    try {
      await deleteEvidence(evidence.id);
      toast.success(`Removed from registry`);
      onDelete?.(evidence.id);
    } catch (err) {
      setLocalAttachments((prev) => [...prev, evidence]);
      toast.error(`Purge failed`);
    }
  };

  const handleDownload = (evidence) => {
    const link = document.createElement('a');
    link.href = evidence.file_url;
    link.download = evidence.filename || 'attachment';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (localAttachments.length === 0 && uploadQueue.length === 0) {
    return (
      <div className="text-center py-6 border border-dashed rounded-lg" style={{ borderColor: BORDER, background: INSET_BG }}>
        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">No documentation attached</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 ml-1">
        Registry Records {localAttachments.length > 0 && <span style={{ color: BLUE }}>({localAttachments.length})</span>}
      </h4>

      <ul className="space-y-2">
        {localAttachments.map((evidence) => (
          <li key={evidence.id} className="flex items-center gap-3 p-2 rounded-md border group" style={{ background: '#1A1F26', borderColor: BORDER }}>
            {evidence.is_image ? (
                <img src={evidence.file_url} alt={evidence.filename} className="h-10 w-10 rounded object-cover flex-shrink-0 border" style={{ borderColor: BORDER }} />
            ) : (
                <div className="h-10 w-10 flex items-center justify-center rounded flex-shrink-0 bg-gray-800 border border-gray-700">
                  <DocumentIcon className="h-5 w-5 text-gray-500" />
                </div>
            )}

            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-200 truncate">{evidence.filename || 'Record'}</p>
                <p className="text-[10px] font-bold text-gray-600 uppercase">
                    Stored {evidence.file_size_mb?.toFixed(2)} MB • {evidence.file_type?.split('/')[1]?.toUpperCase()}
                </p>
            </div>

            <div className="flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                <a href={evidence.file_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-blue-400" title="Inspect">
                    <EyeIcon className="h-4 w-4" />
                </a>
                <button type="button" onClick={() => handleDownload(evidence)} className="p-1.5 text-gray-400 hover:text-white" title="Export">
                    <ArrowDownTrayIcon className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => handleDelete(evidence)} className="p-1.5 text-gray-400 hover:text-red-500" title="Purge">
                    <TrashIcon className="h-4 w-4" />
                </button>
            </div>
          </li>
        ))}

        {uploadQueue.map((item) => (
          <li key={item.name} className="p-3 rounded-md border border-blue-500/30" style={{ background: `${BLUE}10` }}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500" />
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest truncate">{item.name}</span>
                </div>
                <span className="text-[10px] font-bold text-blue-500">{item.progress}%</span>
            </div>
            <div className="w-full bg-black/40 rounded-full h-1 overflow-hidden">
                <div className="bg-blue-500 h-1 rounded-full transition-all duration-300" style={{ width: `${item.progress}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default EvidenceViewer;
