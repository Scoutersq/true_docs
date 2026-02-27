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
  const documentIdRef = useRef(null);

  // ─── Fetch document history on auth change ─────────────────────
  const fetchHistory = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setIsHistoryLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/documents`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setDocumentHistory(data.documents || []);
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
    documentIdRef.current = null;
    setActiveDocumentId(null);

    try {
      // Upload the file to the backend
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch(`${API_URL}/api/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        credentials: 'include',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Upload failed');
      }

      const { document } = await uploadRes.json();
      documentIdRef.current = document.id;
      setActiveDocumentId(document.id);

      // Poll for processing completion
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(
            `${API_URL}/api/documents/${document.id}/status`,
            {
              headers: { Authorization: `Bearer ${getToken()}` },
              credentials: 'include',
            }
          );

          if (!statusRes.ok) {
            clearInterval(pollInterval);
            setIsFileProcessing(false);
            return;
          }

          const statusData = await statusRes.json();

          if (statusData.status === 'ready') {
            clearInterval(pollInterval);
            setIsFileProcessing(false);
            setIsFileReady(true);

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
                },
              ]);
            } else {
              setChatMessages([
                {
                  id: 1,
                  role: 'assistant',
                  content: `I've analyzed **"${file.name}"** and I'm ready to help. Ask me anything about this document!`,
                  timestamp: new Date(),
                },
              ]);
            }
          } else if (statusData.status === 'error') {
            clearInterval(pollInterval);
            setIsFileProcessing(false);
            setChatMessages([
              {
                id: 1,
                role: 'assistant',
                content: `Sorry, I had trouble processing **"${file.name}"**. ${statusData.errorMessage || 'Please try again.'}`,
                timestamp: new Date(),
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
      setChatMessages([
        {
          id: 1,
          role: 'assistant',
          content: `Failed to upload the document. Please check your connection and try again.`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [fetchHistory]);

  const sendMessage = useCallback(async (content) => {
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content,
      timestamp: new Date(),
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
      });

      if (!res.ok) {
        throw new Error('Chat request failed');
      }

      const data = await res.json();

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(data.timestamp),
      };
      setChatMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
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
