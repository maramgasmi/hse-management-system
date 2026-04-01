// =============================================================
// EvidenceUploader.jsx — high-fidelity dark redesign
// -------------------------------------------------------------
// Consistent with SafetyFirst HSE dark theme.
// Reusable component for drag-and-drop file selection.
// =============================================================

import { useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  CloudArrowUpIcon,
  XCircleIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const ALLOWED_TYPES_LABEL = 'JPEG, PNG, WEBP, PDF, DOCX, XLSX';

const BORDER    = '#232933';
const INSET_BG  = '#0F131A';
const BLUE      = '#3498DB';

const validateFile = (file) => {
  if (!ALLOWED_TYPES.includes(file.type)) return `"${file.name}" unsupported type. Allowed: ${ALLOWED_TYPES_LABEL}`;
  if (file.size > MAX_FILE_SIZE_BYTES) return `"${file.name}" too large (max 10MB)`;
  return null;
};

const buildFileEntry = (file) => ({
  raw: file,
  id: `${file.name}-${file.size}`,
  name: file.name,
  size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
  isImage: file.type.startsWith('image/'),
  previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
});

const EvidenceUploader = ({ onFilesChange }) => {
  const [fileEntries, setFileEntries] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const processFiles = useCallback((fileList) => {
    const newEntries = [];
    Array.from(fileList).forEach(file => {
      const error = validateFile(file);
      if (error) { toast.error(error); return; }
      if (fileEntries.some(e => e.id === `${file.name}-${file.size}`)) return;
      newEntries.push(buildFileEntry(file));
    });
    if (newEntries.length === 0) return;
    setFileEntries(prev => {
      const updated = [...prev, ...newEntries];
      onFilesChange?.(updated.map(e => e.raw));
      return updated;
    });
  }, [fileEntries, onFilesChange]);

  const removeFile = useCallback((entryId) => {
    setFileEntries(prev => {
      const entry = prev.find(e => e.id === entryId);
      if (entry?.previewUrl) URL.revokeObjectURL(entry.previewUrl);
      const updated = prev.filter(e => e.id !== entryId);
      onFilesChange?.(updated.map(e => e.raw));
      return updated;
    });
  }, [onFilesChange]);

  return (
    <div className="mt-6">
      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 ml-1">Attach Evidence</h4>
      
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200"
        style={{ 
            background: isDragging ? `${BLUE}10` : INSET_BG, 
            borderColor: isDragging ? BLUE : BORDER 
        }}
      >
        <CloudArrowUpIcon className="h-10 w-10 text-gray-600 mb-2" />
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            <span style={{ color: BLUE }}>Select</span> or Drag Experience
        </p>
        <p className="text-[10px] text-gray-600 mt-1 uppercase font-medium">{ALLOWED_TYPES_LABEL}</p>
      </div>

      <input
        ref={inputRef} type="file" multiple
        accept={ALLOWED_TYPES.join(',')}
        onChange={(e) => { if (e.target.files.length) processFiles(e.target.files); e.target.value = ''; }}
        className="hidden"
      />

      {fileEntries.length > 0 && (
        <ul className="mt-4 space-y-2">
          {fileEntries.map((entry) => (
            <li key={entry.id} className="flex items-center gap-3 p-2 rounded-md border animate-in slide-in-from-right-2 duration-300" style={{ background: '#1A1F26', borderColor: BORDER }}>
              {entry.isImage ? (
                <img src={entry.previewUrl} alt={entry.name} className="h-10 w-10 rounded object-cover flex-shrink-0 border" style={{ borderColor: BORDER }} />
              ) : (
                <div className="h-10 w-10 flex items-center justify-center rounded flex-shrink-0 bg-gray-800 border border-gray-700">
                  <DocumentIcon className="h-5 w-5 text-gray-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-200 truncate">{entry.name}</p>
                <p className="text-[10px] font-bold text-gray-500 uppercase">{entry.size}</p>
              </div>
              <button type="button" onClick={(e) => { e.stopPropagation(); removeFile(entry.id); }} className="p-2 text-gray-600 hover:text-red-500 transition-colors">
                <XCircleIcon className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default EvidenceUploader;
