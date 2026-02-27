import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Send, Sparkles, User, MessageSquare, Presentation, Loader } from 'lucide-react';
import { useApp } from '../context/AppContext';
import '../styles/ChatInterface.css';

const SUGGESTIONS = [
  'Summarize this document',
  'What are the key points?',
  'Explain the main argument',
  'List all important dates',
];

function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function ChatInterface() {
  const {
    chatMessages, isChatLoading, isFileReady, sendMessage,
    isSlidesLoading, generateSlides,
  } = useApp();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isChatLoading) return;
    sendMessage(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Empty state when no document uploaded
  if (!isFileReady) {
    return (
      <div className="chat">
        <div className="chat__empty">
          <motion.div
            className="chat__empty-icon"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <MessageSquare size={32} />
          </motion.div>
          <motion.p
            className="chat__empty-title"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Upload a document to begin
          </motion.p>
          <motion.p
            className="chat__empty-sub"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Drop any document above and I'll be ready to answer your questions about it
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat">
      {/* Messages */}
      <div className="chat__messages">
        <AnimatePresence mode="popLayout">
          {chatMessages.map((msg) => (
            <motion.div
              key={msg.id}
              className={`chat__message chat__message--${msg.role}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={`chat__avatar chat__avatar--${msg.role === 'assistant' ? 'ai' : 'user'}`}>
                {msg.role === 'assistant' ? <Sparkles size={18} /> : <User size={18} />}
              </div>
              <div>
                <div className={`chat__bubble chat__bubble--${msg.role === 'assistant' ? 'ai' : 'user'}`}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                <p className="chat__timestamp">{formatTime(msg.timestamp)}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isChatLoading && (
          <motion.div
            className="chat__typing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="chat__avatar chat__avatar--ai">
              <Sparkles size={18} />
            </div>
            <div className="chat__typing-dots">
              <span className="chat__typing-dot" />
              <span className="chat__typing-dot" />
              <span className="chat__typing-dot" />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion chips (show after first AI message, when there's only 1 message) */}
      {chatMessages.length === 1 && chatMessages[0].role === 'assistant' && (
        <motion.div
          className="chat__suggestions"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          {SUGGESTIONS.map((s) => (
            <button key={s} className="chat__suggestion" onClick={() => sendMessage(s)}>
              {s}
            </button>
          ))}
        </motion.div>
      )}

      {/* Input */}
      <div className="chat__input-area">
        <div className="chat__input-wrapper">
          <textarea
            ref={textareaRef}
            className="chat__textarea"
            placeholder="Ask anything about your document..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            className="chat__slides-btn"
            onClick={generateSlides}
            disabled={isSlidesLoading || isChatLoading || chatMessages.length < 2}
            title="Generate visual diagrams from conversation"
          >
            {isSlidesLoading ? <Loader size={18} className="chat__slides-spinner" /> : <Presentation size={18} />}
          </button>
          <button
            className="chat__send-btn"
            onClick={handleSend}
            disabled={!input.trim() || isChatLoading}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
