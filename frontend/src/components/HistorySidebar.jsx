import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Clock,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import '../styles/HistorySidebar.css';

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function HistorySidebar() {
  const {
    documentHistory,
    isHistoryLoading,
    activeDocumentId,
    loadDocument,
    deleteDocument,
    startNewDocument,
  } = useApp();

  const [collapsed, setCollapsed] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (e, docId) => {
    e.stopPropagation();
    setDeletingId(docId);
    await deleteDocument(docId);
    setDeletingId(null);
  };

  return (
    <motion.aside
      className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Collapse toggle */}
      <button
        className="sidebar__toggle"
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {!collapsed && (
        <div className="sidebar__inner">
          {/* New document button */}
          <button className="sidebar__new-btn" onClick={startNewDocument}>
            <Plus size={16} />
            <span>New Document</span>
          </button>

          {/* History header */}
          <div className="sidebar__section-header">
            <Clock size={14} />
            <span>History</span>
          </div>

          {/* Document list */}
          <div className="sidebar__list">
            {isHistoryLoading ? (
              <div className="sidebar__empty">
                <Loader2 size={20} className="sidebar__spinner" />
                <span>Loading...</span>
              </div>
            ) : documentHistory.length === 0 ? (
              <div className="sidebar__empty">
                <FileText size={20} />
                <span>No documents yet</span>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {documentHistory.map((doc) => (
                  <motion.div
                    key={doc._id}
                    className={`sidebar__item ${
                      activeDocumentId === doc._id ? 'sidebar__item--active' : ''
                    }`}
                    onClick={() => loadDocument(doc._id)}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    tabIndex={0}
                    role="button"
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') loadDocument(doc._id);
                    }}
                  >
                    <div className="sidebar__item-icon">
                      {doc.status === 'processing' ? (
                        <Loader2 size={14} className="sidebar__spinner" />
                      ) : doc.status === 'error' ? (
                        <AlertCircle size={14} />
                      ) : (
                        <FileText size={14} />
                      )}
                    </div>
                    <div className="sidebar__item-info">
                      <span className="sidebar__item-name" title={doc.originalName}>
                        {doc.originalName}
                      </span>
                      <span className="sidebar__item-meta">
                        {formatFileSize(doc.fileSize)} · {formatDate(doc.createdAt)}
                      </span>
                    </div>
                    <span
                      className="sidebar__item-delete"
                      role="button"
                      tabIndex={0}
                      onClick={e => { e.stopPropagation(); handleDelete(e, doc._id); }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); handleDelete(e, doc._id); }
                      }}
                      aria-disabled={deletingId === doc._id}
                      title="Delete document"
                      style={{ pointerEvents: deletingId === doc._id ? 'none' : undefined }}
                    >
                      {deletingId === doc._id ? (
                        <Loader2 size={13} className="sidebar__spinner" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      )}
    </motion.aside>
  );
}
