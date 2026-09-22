import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';

const API_URL = 'http://localhost:5000';

const AppContext = createContext(null);

/** Helper to get the auth token */
function getToken() {
  return localStorage.getItem('token');
}

export function AppProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isFileProcessing, setIsFileProcessing] = useState(false);
  const [isFileReady, setIsFileReady] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [slidesData, setSlidesData] = useState(null);
  const [isSlidesLoading, setIsSlidesLoading] = useState(false);
  const [documentHistory, setDocumentHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [activeDocumentId, setActiveDocumentId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [theme, setTheme] = useState('light');
  const [totalTokensUsed, setTotalTokensUsed] = useState(0);
  const [documentTags, setDocumentTags] = useState({});
  const documentIdRef = useRef(null);
  const abortControllerRef = useRef(null);
  const docTextCacheRef = useRef({});

  // ─── Initialize theme from system preference ────────────────────
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
      setTheme(prefersLight ? 'light' : 'dark');
    }
  }, []);

  // ─── Apply theme to document ─────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // ─── Fetch document history on auth change ─────────────────────
  const fetchHistory = useCallback(async (pageNum = 0, append = false) => {
    const token = getToken();
    if (!token) return;
    setIsHistoryLoading(true);
    try {
      const limit = 10; // Load 10 documents per page
      const res = await fetch(`${API_URL}/api/documents?limit=${limit}&skip=${pageNum * limit}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        const docs = data.documents || [];
        
        if (append) {
          setDocumentHistory(prev => [...prev, ...docs]);
        } else {
          setDocumentHistory(docs);
        }
        
        setHistoryPage(pageNum);
        setHasMoreHistory(docs.length === limit);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchHistory();
    } else {
      setDocumentHistory([]);
    }
  }, [isAuthenticated, fetchHistory]);

  // ─── Load a previously uploaded document ───────────────────────
  const loadDocument = useCallback(async (docId) => {
    if (docId === documentIdRef.current) return; // already loaded

    setIsFileProcessing(false);
    setIsChatLoading(false);
    setChatMessages([]);
    setSlidesData(null);
    setIsSlidesLoading(false);

    try {
      // Fetch doc metadata via status endpoint
      const statusRes = await fetch(`${API_URL}/api/documents/${docId}/status`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        credentials: 'include',
      });
      if (!statusRes.ok) throw new Error('Document not found');
      const statusData = await statusRes.json();

      // Fetch full chat history
      const chatRes = await fetch(`${API_URL}/api/chat/${docId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        credentials: 'include',
      });
      if (!chatRes.ok) throw new Error('Failed to load chat');
      const chatData = await chatRes.json();

      documentIdRef.current = docId;
      setActiveDocumentId(docId);
      setUploadedFile({ name: statusData.originalName, size: statusData.fileSize });
      setIsFileReady(statusData.status === 'ready');

      // Map chat history to the format our UI expects
      const messages = (chatData.messages || []).map((msg, idx) => ({
        id: idx + 1,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
      }));
      setChatMessages(messages);
    } catch (err) {
      console.error('Error loading document:', err);
    }
  }, []);

  // ─── Start a new document (reset without deleting) ─────────────
  const startNewDocument = useCallback(() => {
    setUploadedFile(null);
    setIsFileProcessing(false);
    setIsFileReady(false);
    setChatMessages([]);
    setIsChatLoading(false);
    setSlidesData(null);
    setIsSlidesLoading(false);
    documentIdRef.current = null;
    setActiveDocumentId(null);
  }, []);

  const handleFileUpload = useCallback(async (file) => {
    setUploadedFile(file);
    setIsFileProcessing(true);
    setIsFileReady(false);
    setChatMessages([]);
    setUploadProgress(0);
    documentIdRef.current = null;
    setActiveDocumentId(null);

    try {
      // Upload the file to the backend with progress tracking
      const formData = new FormData();
      formData.append('file', file);
      const token = getToken();

      // Use fetch with progress tracking
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percent);
        }
      });

      // Handle completion
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch {
              reject(new Error('Invalid response'));
            }
          } else {
            let message = 'Upload failed';
            try {
              const response = JSON.parse(xhr.responseText);
              if (response.error) message = response.error;
            } catch {
              // Keep the generic message when the server does not return JSON.
            }
            reject(new Error(message));
          }
        });
        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));
      });

      xhr.open('POST', `${API_URL}/api/documents/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.withCredentials = true;
      xhr.send(formData);

      const uploadRes = await uploadPromise;
      const { document } = uploadRes;
      const documentId = document.id || document._id;
      if (!documentId) {
        throw new Error('Upload response did not include a document ID');
      }

      documentIdRef.current = documentId;
      setActiveDocumentId(documentId);
      setUploadProgress(100);

      // Poll for processing completion
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(
            `${API_URL}/api/documents/${documentId}/status`,
            {
              headers: { Authorization: `Bearer ${token}` },
              credentials: 'include',
            }
          );

          if (!statusRes.ok) {
            clearInterval(pollInterval);
            setIsFileProcessing(false);
            setChatMessages([
              {
                id: 1,
                role: 'assistant',
                content: 'I could not check the document processing status. Please try uploading it again.',
                timestamp: new Date(),
              },
            ]);
            return;
          }

          const statusData = await statusRes.json();

          if (statusData.status === 'ready') {
            clearInterval(pollInterval);
            setIsFileProcessing(false);
            setIsFileReady(true);
            
            // Cache document text
            docTextCacheRef.current[documentId] = statusData.textContent || '';

            // Refresh history to include the new document
            fetchHistory();

            // Set the initial AI analysis message
            if (statusData.initialMessage) {
              setChatMessages([
                {
                  id: 1,
                  role: 'assistant',
                  content: statusData.initialMessage.content,
                  timestamp: new Date(statusData.initialMessage.timestamp),
                  reactions: { likes: 0, dislikes: 0, userReaction: null },
                },
              ]);
            } else {
              setChatMessages([
                {
                  id: 1,
                  role: 'assistant',
                  content: `I've analyzed **"${file.name}"** and I'm ready to help. Ask me anything about this document!`,
                  timestamp: new Date(),
                  reactions: { likes: 0, dislikes: 0, userReaction: null },
                },
              ]);
            }
          } else if (statusData.status === 'error') {
            clearInterval(pollInterval);
            setIsFileProcessing(false);
            setIsFileReady(false);
            setChatMessages([
              {
                id: 1,
                role: 'assistant',
                content: `Sorry, I had trouble processing **"${file.name}"**. ${statusData.errorMessage || 'Please try again.'}`,
                timestamp: new Date(),
                reactions: { likes: 0, dislikes: 0, userReaction: null },
              },
            ]);
          }
        } catch {
          clearInterval(pollInterval);
          setIsFileProcessing(false);
        }
      }, 1500);
    } catch (err) {
      console.error('Upload error:', err);
      setIsFileProcessing(false);
      setUploadProgress(0);
      setChatMessages([
        {
          id: 1,
          role: 'assistant',
          content: `Failed to upload the document. ${err.message || 'Please check your connection and try again.'}`,
          timestamp: new Date(),
          reactions: { likes: 0, dislikes: 0, userReaction: null },
        },
      ]);
    }
  }, [fetchHistory]);

  const sendMessage = useCallback(async (content) => {
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    // Feature 18: Estimate input tokens (roughly 1 token per 4 characters)
    const inputTokens = Math.ceil(content.length / 4);

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content,
      timestamp: new Date(),
      reactions: { likes: 0, dislikes: 0, userReaction: null },
      tokens: inputTokens,
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setIsChatLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/chat/${documentIdRef.current}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        credentials: 'include',
        body: JSON.stringify({ message: content }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        throw new Error('Chat request failed');
      }

      const data = await res.json();

      // Estimate output tokens
      const outputTokens = Math.ceil(data.reply.length / 4);

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(data.timestamp),
        reactions: { likes: 0, dislikes: 0, userReaction: null },
        tokens: outputTokens,
      };
      
      setChatMessages((prev) => [...prev, aiMessage]);
      setTotalTokensUsed((prev) => prev + inputTokens + outputTokens);
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Chat request was cancelled');
        // Remove the user message if request was cancelled
        setChatMessages((prev) => prev.filter(msg => msg.id !== userMessage.id));
        setTotalTokensUsed((prev) => Math.max(0, prev - inputTokens));
      } else {
        console.error('Chat error:', err);
        const errorMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: new Date(),
          reactions: { likes: 0, dislikes: 0, userReaction: null },
          tokens: 0,
        };
        setChatMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsChatLoading(false);
    }
  }, []);

  // ─── Generate visual slides from conversation ─────────────────
  const generateSlides = useCallback(async () => {
    if (!documentIdRef.current || isSlidesLoading) return;

    setIsSlidesLoading(true);
    setSlidesData(null);

    try {
      const res = await fetch(`${API_URL}/api/chat/${documentIdRef.current}/slides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        credentials: 'include',
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate slides');
      }

      const data = await res.json();
      setSlidesData(data.slides);
    } catch (err) {
      console.error('Slides error:', err);
      // Show error as a chat message so the user sees feedback
      const errorMessage = {
        id: Date.now() + 2,
        role: 'assistant',
        content: `⚠️ ${err.message || 'Could not generate slides. Please try again.'}`,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSlidesLoading(false);
    }
  }, [isSlidesLoading]);

  const closeSlides = useCallback(() => {
    setSlidesData(null);
  }, []);

  // ─── Delete document and refresh history ───────────────────────
  const deleteDocument = useCallback(async (docId) => {
    try {
      await fetch(`${API_URL}/api/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
        credentials: 'include',
      });
    } catch {
      // Ignore errors on cleanup
    }

    // If we deleted the active document, reset the view
    if (docId === documentIdRef.current) {
      setUploadedFile(null);
      setIsFileProcessing(false);
      setIsFileReady(false);
      setChatMessages([]);
      setIsChatLoading(false);
      documentIdRef.current = null;
      setActiveDocumentId(null);
    }

    fetchHistory();
  }, [fetchHistory]);

  const resetDocument = useCallback(async () => {
    // Delete the document from backend if it exists
    if (documentIdRef.current) {
      try {
        await fetch(`${API_URL}/api/documents/${documentIdRef.current}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${getToken()}` },
          credentials: 'include',
        });
      } catch {
        // Ignore errors on cleanup
      }
    }

    setUploadedFile(null);
    setIsFileProcessing(false);
    setIsFileReady(false);
    setChatMessages([]);
    setIsChatLoading(false);
    documentIdRef.current = null;
    setActiveDocumentId(null);
    fetchHistory();
  }, [fetchHistory]);

  // ─── Cancel current chat request ───────────────────────────────
  const cancelChatRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsChatLoading(false);
    }
  }, []);

  // ─── Add reaction to a message ─────────────────────────────────
  const addMessageReaction = useCallback((messageId, reactionType) => {
    setChatMessages((prev) => prev.map((msg) => {
      if (msg.id === messageId) {
        const reactions = { ...msg.reactions };
        
        if (reactions.userReaction === reactionType) {
          // Remove reaction if clicking same type
          if (reactionType === 'like') reactions.likes--;
          else reactions.dislikes--;
          reactions.userReaction = null;
        } else {
          // Add new reaction
          if (reactions.userReaction === 'like') reactions.likes--;
          if (reactions.userReaction === 'dislike') reactions.dislikes--;
          
          if (reactionType === 'like') reactions.likes++;
          else reactions.dislikes++;
          reactions.userReaction = reactionType;
        }
        
        return { ...msg, reactions };
      }
      return msg;
    }));
  }, []);

  // ─── Feature 11: Export Chat History ──────────────────────────
  const exportChatHistory = useCallback((format = 'json') => {
    if (chatMessages.length === 0) {
      alert('No chat history to export');
      return;
    }

    let content = '';
    let filename = `chat-export-${new Date().toISOString().split('T')[0]}`;

    if (format === 'json') {
      content = JSON.stringify(chatMessages, null, 2);
      filename += '.json';
    } else if (format === 'csv') {
      const headers = ['Timestamp', 'Role', 'Content', 'Tokens'];
      const rows = chatMessages.map((msg) => [
        msg.timestamp.toISOString(),
        msg.role,
        `"${msg.content.replace(/"/g, '""')}"`,
        msg.tokens || 0,
      ]);
      content = [headers, ...rows].map((r) => r.join(',')).join('\n');
      filename += '.csv';
    } else if (format === 'txt') {
      content = chatMessages
        .map(
          (msg) =>
            `[${msg.timestamp.toLocaleString()}] ${msg.role.toUpperCase()}: ${msg.content}\n` +
            (msg.tokens ? `Tokens used: ${msg.tokens}\n` : '') +
            '\n---\n\n'
        )
        .join('');
      filename += '.txt';
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [chatMessages]);

  // ─── Feature 13: Document Tagging ─────────────────────────────
  const addDocumentTag = useCallback((docId, tag) => {
    setDocumentTags((prev) => ({
      ...prev,
      [docId]: [...(prev[docId] || []), tag].filter((t, i, arr) => arr.indexOf(t) === i),
    }));
  }, []);

  const removeDocumentTag = useCallback((docId, tag) => {
    setDocumentTags((prev) => ({
      ...prev,
      [docId]: (prev[docId] || []).filter((t) => t !== tag),
    }));
  }, []);

  const getDocumentTags = useCallback((docId) => {
    return documentTags[docId] || [];
  }, [documentTags]);

  // ─── Load more documents (pagination) ───────────────────────────
  const loadMoreHistory = useCallback(() => {
    if (!hasMoreHistory || isHistoryLoading) return;
    fetchHistory(historyPage + 1, true);
  }, [historyPage, hasMoreHistory, isHistoryLoading, fetchHistory]);

  return (
    <AppContext.Provider
      value={{
        uploadedFile,
        isFileProcessing,
        isFileReady,
        chatMessages,
        isChatLoading,
        handleFileUpload,
        sendMessage,
        resetDocument,
        documentHistory,
        isHistoryLoading,
        activeDocumentId,
        fetchHistory,
        loadDocument,
        deleteDocument,
        startNewDocument,
        slidesData,
        isSlidesLoading,
        generateSlides,
        closeSlides,
        uploadProgress,
        cancelChatRequest,
        addMessageReaction,
        loadMoreHistory,
        hasMoreHistory,
        theme,
        setTheme,
        totalTokensUsed,
        exportChatHistory,
        addDocumentTag,
        removeDocumentTag,
        getDocumentTags,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
