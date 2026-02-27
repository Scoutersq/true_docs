import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  MessageSquare,
  HardDrive,
  Upload,
  Clock,
  TrendingUp,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Search,
  ArrowUpDown,
  LayoutGrid,
  List,
  FileType,
  Plus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import '../styles/Dashboard.css';

const API_URL = 'http://localhost:5000';

function getToken() {
  return localStorage.getItem('token');
}

// ── Helpers ──────────────────────────────────────────────────────────
function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelativeDate(dateStr) {
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
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(dateStr);
}

function getFileIcon(name) {
  const ext = name?.split('.').pop()?.toLowerCase();
  const iconMap = {
    pdf: '📄',
    doc: '📝',
    docx: '📝',
    txt: '📃',
    md: '📋',
    csv: '📊',
    xls: '📊',
    xlsx: '📊',
    ppt: '📎',
    pptx: '📎',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
  };
  return iconMap[ext] || '📄';
}

function getStatusConfig(status) {
  switch (status) {
    case 'ready':
      return { label: 'Ready', icon: CheckCircle2, className: 'status--ready' };
    case 'processing':
      return { label: 'Processing', icon: Loader2, className: 'status--processing' };
    case 'error':
      return { label: 'Error', icon: AlertCircle, className: 'status--error' };
    default:
      return { label: status, icon: FileText, className: '' };
  }
}

// ── Stat Card Component ──────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sublabel, accent, delay = 0 }) {
  return (
    <motion.div
      className={`dash-stat ${accent ? `dash-stat--${accent}` : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="dash-stat__icon">
        <Icon size={20} />
      </div>
      <div className="dash-stat__content">
        <span className="dash-stat__value">{value}</span>
        <span className="dash-stat__label">{label}</span>
        {sublabel && <span className="dash-stat__sublabel">{sublabel}</span>}
      </div>
    </motion.div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────
export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const { loadDocument, deleteDocument } = useApp();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [viewMode, setViewMode] = useState('list');
  const [deletingId, setDeletingId] = useState(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, navigate]);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/documents/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setDocuments(data.documents);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // ── Sort & filter ─────────────────────────────────────────────────
  const filtered = documents
    .filter((d) =>
      d.originalName?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'createdAt') {
        cmp = new Date(a.createdAt) - new Date(b.createdAt);
      } else if (sortBy === 'name') {
        cmp = (a.originalName || '').localeCompare(b.originalName || '');
      } else if (sortBy === 'size') {
        cmp = (a.fileSize || 0) - (b.fileSize || 0);
      } else if (sortBy === 'chats') {
        cmp = (a.chatCount || 0) - (b.chatCount || 0);
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

  const handleOpenDocument = (docId) => {
    loadDocument(docId);
    navigate('/workspace');
  };

  const handleDelete = async (e, docId) => {
    e.stopPropagation();
    setDeletingId(docId);
    await deleteDocument(docId);
    setDocuments((prev) => prev.filter((d) => d._id !== docId));
    // Recompute stats locally
    setStats((prev) => {
      if (!prev) return prev;
      const deletedDoc = documents.find((d) => d._id === docId);
      return {
        ...prev,
        totalDocuments: prev.totalDocuments - 1,
        totalChats: prev.totalChats - (deletedDoc?.chatCount || 0),
        totalStorageBytes: prev.totalStorageBytes - (deletedDoc?.fileSize || 0),
      };
    });
    setDeletingId(null);
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  if (loading) {
    return (
      <div className="dash">
        <div className="dash__loading">
          <Loader2 size={32} className="dash__spinner" />
          <span>Loading your dashboard…</span>
        </div>
      </div>
    );
  }

  const fileTypeEntries = stats?.fileTypes ? Object.entries(stats.fileTypes) : [];

  return (
    <div className="dash">
      <div className="dash__inner">
        {/* ── Header ─────────────────────────────────────── */}
        <motion.div
          className="dash__header"
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="dash__greeting">
            <h1 className="dash__title">
              Welcome back, <em>{user?.name?.split(' ')[0] || 'there'}</em>
            </h1>
            <p className="dash__subtitle">
              Here's an overview of your documents and activity
            </p>
          </div>
          <motion.button
            className="dash__upload-btn"
            onClick={() => navigate('/workspace')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus size={18} />
            <span>New Document</span>
          </motion.button>
        </motion.div>

        {/* ── Stats Grid ─────────────────────────────────── */}
        <div className="dash__stats">
          <StatCard
            icon={FileText}
            label="Total Documents"
            value={stats?.totalDocuments || 0}
            sublabel={`${stats?.readyCount || 0} ready`}
            accent="primary"
            delay={0.05}
          />
          <StatCard
            icon={MessageSquare}
            label="Total Messages"
            value={stats?.totalChats || 0}
            sublabel="across all docs"
            accent="blue"
            delay={0.1}
          />
          <StatCard
            icon={HardDrive}
            label="Storage Used"
            value={formatFileSize(stats?.totalStorageBytes || 0)}
            sublabel={`${stats?.totalDocuments || 0} files`}
            accent="amber"
            delay={0.15}
          />
          <StatCard
            icon={TrendingUp}
            label="This Week"
            value={stats?.recentUploads || 0}
            sublabel="new uploads"
            accent="emerald"
            delay={0.2}
          />
        </div>

        {/* ── File Type Breakdown ────────────────────────── */}
        {fileTypeEntries.length > 0 && (
          <motion.div
            className="dash__filetypes"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="dash__filetypes-header">
              <FileType size={16} />
              <span>File Types</span>
            </div>
            <div className="dash__filetypes-list">
              {fileTypeEntries.map(([ext, count]) => (
                <div key={ext} className="dash__filetype-chip">
                  <span className="dash__filetype-ext">.{ext}</span>
                  <span className="dash__filetype-count">{count}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Documents Section ──────────────────────────── */}
        <motion.div
          className="dash__docs-section"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Toolbar */}
          <div className="dash__toolbar">
            <div className="dash__search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search documents…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="dash__toolbar-right">
              <div className="dash__sort-group">
                {[
                  { key: 'createdAt', label: 'Date' },
                  { key: 'name', label: 'Name' },
                  { key: 'size', label: 'Size' },
                  { key: 'chats', label: 'Chats' },
                ].map((s) => (
                  <button
                    key={s.key}
                    className={`dash__sort-btn ${sortBy === s.key ? 'dash__sort-btn--active' : ''}`}
                    onClick={() => toggleSort(s.key)}
                  >
                    {s.label}
                    {sortBy === s.key && (
                      <ArrowUpDown size={12} className={sortDir === 'asc' ? 'flipped' : ''} />
                    )}
                  </button>
                ))}
              </div>

              <div className="dash__view-toggle">
                <button
                  className={viewMode === 'list' ? 'active' : ''}
                  onClick={() => setViewMode('list')}
                  title="List view"
                >
                  <List size={16} />
                </button>
                <button
                  className={viewMode === 'grid' ? 'active' : ''}
                  onClick={() => setViewMode('grid')}
                  title="Grid view"
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Document list / grid */}
          {filtered.length === 0 ? (
            <div className="dash__empty">
              {searchQuery ? (
                <>
                  <Search size={40} />
                  <h3>No matching documents</h3>
                  <p>Try a different search term</p>
                </>
              ) : (
                <>
                  <Upload size={40} />
                  <h3>No documents yet</h3>
                  <p>Upload your first document to get started</p>
                  <button
                    className="dash__empty-cta"
                    onClick={() => navigate('/workspace')}
                  >
                    Go to Workspace
                  </button>
                </>
              )}
            </div>
          ) : viewMode === 'list' ? (
            <div className="dash__list">
              {/* List header */}
              <div className="dash__list-header">
                <span className="dash__col dash__col--name">Document</span>
                <span className="dash__col dash__col--status">Status</span>
                <span className="dash__col dash__col--size">Size</span>
                <span className="dash__col dash__col--chats">Chats</span>
                <span className="dash__col dash__col--date">Uploaded</span>
                <span className="dash__col dash__col--actions"></span>
              </div>

              <AnimatePresence mode="popLayout">
                {filtered.map((doc, i) => {
                  const st = getStatusConfig(doc.status);
                  const StatusIcon = st.icon;
                  return (
                    <motion.div
                      key={doc._id}
                      className="dash__list-row"
                      onClick={() => handleOpenDocument(doc._id)}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25, delay: i * 0.03 }}
                      layout
                    >
                      <span className="dash__col dash__col--name">
                        <span className="dash__file-icon">{getFileIcon(doc.originalName)}</span>
                        <span className="dash__file-name" title={doc.originalName}>
                          {doc.originalName}
                        </span>
                      </span>
                      <span className={`dash__col dash__col--status`}>
                        <span className={`dash__status-badge ${st.className}`}>
                          <StatusIcon
                            size={12}
                            className={doc.status === 'processing' ? 'dash__spinner' : ''}
                          />
                          {st.label}
                        </span>
                      </span>
                      <span className="dash__col dash__col--size">
                        {formatFileSize(doc.fileSize)}
                      </span>
                      <span className="dash__col dash__col--chats">
                        <MessageSquare size={13} />
                        {doc.chatCount}
                      </span>
                      <span className="dash__col dash__col--date">
                        {formatRelativeDate(doc.createdAt)}
                      </span>
                      <span className="dash__col dash__col--actions">
                        <button
                          className="dash__action-btn dash__action-btn--open"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDocument(doc._id);
                          }}
                          title="Open in workspace"
                        >
                          <ExternalLink size={14} />
                        </button>
                        <button
                          className="dash__action-btn dash__action-btn--delete"
                          onClick={(e) => handleDelete(e, doc._id)}
                          disabled={deletingId === doc._id}
                          title="Delete document"
                        >
                          {deletingId === doc._id ? (
                            <Loader2 size={14} className="dash__spinner" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <div className="dash__grid">
              <AnimatePresence mode="popLayout">
                {filtered.map((doc, i) => {
                  const st = getStatusConfig(doc.status);
                  const StatusIcon = st.icon;
                  return (
                    <motion.div
                      key={doc._id}
                      className="dash__card"
                      onClick={() => handleOpenDocument(doc._id)}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3, delay: i * 0.04 }}
                      layout
                      whileHover={{ y: -4 }}
                    >
                      <div className="dash__card-top">
                        <span className="dash__card-icon">{getFileIcon(doc.originalName)}</span>
                        <span className={`dash__status-badge ${st.className}`}>
                          <StatusIcon
                            size={11}
                            className={doc.status === 'processing' ? 'dash__spinner' : ''}
                          />
                          {st.label}
                        </span>
                      </div>
                      <h4 className="dash__card-name" title={doc.originalName}>
                        {doc.originalName}
                      </h4>
                      <div className="dash__card-meta">
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span className="dash__card-dot">·</span>
                        <span>{formatRelativeDate(doc.createdAt)}</span>
                      </div>
                      <div className="dash__card-footer">
                        <span className="dash__card-chats">
                          <MessageSquare size={13} />
                          {doc.chatCount} messages
                        </span>
                        <div className="dash__card-actions">
                          <button
                            className="dash__action-btn dash__action-btn--delete"
                            onClick={(e) => handleDelete(e, doc._id)}
                            disabled={deletingId === doc._id}
                            title="Delete"
                          >
                            {deletingId === doc._id ? (
                              <Loader2 size={13} className="dash__spinner" />
                            ) : (
                              <Trash2 size={13} />
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
