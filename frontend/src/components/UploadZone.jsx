import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X, FileCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import '../styles/UploadZone.css';

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'text/csv': ['.csv'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
};

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function UploadZone() {
  const { uploadedFile, isFileProcessing, isFileReady, handleFileUpload, resetDocument, uploadProgress } = useApp();

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleFileUpload(acceptedFiles[0]);
      }
    },
    [handleFileUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    multiple: false,
    maxSize: 50 * 1024 * 1024, // 50 MB
  });

  // Show processing state
  if (isFileProcessing) {
    return (
      <div className="upload-zone">
        <motion.div
          className="upload-zone__processing"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="upload-zone__progress-container">
            <div className="upload-zone__progress-bar">
              <motion.div
                className="upload-zone__progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
            <p className="upload-zone__progress-text">{uploadProgress}%</p>
          </div>
          <div className="upload-zone__processing-text">
            <p className="upload-zone__processing-title">
              {uploadProgress < 100 ? 'Uploading...' : 'Analyzing your document...'}
            </p>
            <p className="upload-zone__processing-sub">{uploadedFile?.name}</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Show file badge if ready
  if (isFileReady && uploadedFile) {
    return (
      <motion.div
        className="upload-zone__file-badge"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="upload-zone__file-icon">
          <FileCheck size={22} />
        </div>
        <div className="upload-zone__file-info">
          <p className="upload-zone__file-name">{uploadedFile.name}</p>
          <p className="upload-zone__file-size">{formatFileSize(uploadedFile.size)}</p>
        </div>
        <button className="upload-zone__file-remove" onClick={resetDocument} title="Remove document">
          <X size={16} />
        </button>
      </motion.div>
    );
  }

  return (
    <div className="upload-zone">
      <motion.div
        {...getRootProps()}
        className={`upload-zone__dropzone ${isDragActive ? 'upload-zone__dropzone--active' : ''}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
          e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
        }}
      >
        <input {...getInputProps()} />

        <motion.div
          className="upload-zone__icon-wrapper"
          animate={isDragActive ? { scale: 1.1, rotate: 3 } : { scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          {isDragActive ? <FileText size={32} /> : <Upload size={32} />}
        </motion.div>

        <div className="upload-zone__text">
          <p className="upload-zone__title">
            {isDragActive ? 'Release to upload' : 'Drop your document here'}
          </p>
          <p className="upload-zone__subtitle">
            {isDragActive
              ? 'Your file is ready to be analyzed'
              : 'or click to browse — supports up to 50 MB'}
          </p>
        </div>

        <div className="upload-zone__formats">
          {['PDF', 'DOCX', 'TXT', 'MD', 'CSV', 'XLSX'].map((fmt) => (
            <span key={fmt} className="upload-zone__format-tag">{fmt}</span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
