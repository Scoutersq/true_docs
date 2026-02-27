import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import UploadZone from '../components/UploadZone';
import ChatInterface from '../components/ChatInterface';
import HistorySidebar from '../components/HistorySidebar';
import DiagramPanel from '../components/DiagramPanel';
import '../styles/Workspace.css';

export default function Workspace() {
  const { isFileReady, uploadedFile, slidesData, closeSlides } = useApp();
  const { isAuthenticated } = useAuth();
  const mainRef = useRef(null);

  // When diagrams appear, scroll the main area to the top so the panel is visible
  useEffect(() => {
    if (slidesData && slidesData.length > 0 && mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [slidesData]);

  return (
    <div className="workspace">
      <div className="workspace__layout">
        {isAuthenticated && <HistorySidebar />}

        <div ref={mainRef} className={`workspace__main ${slidesData ? 'workspace__main--with-panel' : ''}`}>
          <div className="workspace__container">
            <motion.div
              className="workspace__header"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="workspace__title">
                {isFileReady ? (
                  <>Chatting with <em>{uploadedFile?.name}</em></>
                ) : (
                  <>Upload your <em>document</em></>
                )}
              </h1>
              <p className="workspace__subtitle">
                {isFileReady
                  ? 'Ask questions, request summaries, or explore your document'
                  : 'Drag and drop or click to select a file to get started'}
              </p>
            </motion.div>

            <div className="workspace__content">
              {!isFileReady && <UploadZone />}
              {isFileReady && (
                <>
                  <UploadZone />
                  <div className="workspace__divider" />
                </>
              )}
              <ChatInterface />
            </div>
          </div>
        </div>

        {/* Diagram side panel */}
        <AnimatePresence>
          {slidesData && slidesData.length > 0 && (
            <DiagramPanel slides={slidesData} onClose={closeSlides} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
