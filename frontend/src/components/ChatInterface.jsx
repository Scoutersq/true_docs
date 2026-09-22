import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Send, Sparkles, User, MessageSquare, Presentation, Loader, Copy, Check, ThumbsUp, ThumbsDown, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import '../styles/ChatInterface.css';

const SUGGESTIONS = [
  'Summarize this document',
  'What are the key points?',
  'Explain the main argument',
  'List all important dates',
];

// Feature 17: AI Prompt Templates
const PROMPT_TEMPLATES = [
  { label: 'Summarize', prompt: 'Provide a comprehensive summary of this document in 3-4 paragraphs.' },
  { label: 'Extract Key Points', prompt: 'List all the key points and main ideas from this document in bullet format.' },
  { label: 'Create Outline', prompt: 'Create a detailed outline with main sections and subsections for this document.' },
  { label: 'Q&A', prompt: 'Generate 5-10 important questions and answers based on this document.' },
  { label: 'Executive Summary', prompt: 'Create a concise executive summary (200 words max) of this document.' },
];

function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// Custom code block component with syntax highlighting
const CodeBlock = ({ node, inline, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : 'text';

  if (inline) {
    return (
      <code className="chat__inline-code" {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="chat__code-block">
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="pre"
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  );
};

export default function ChatInterface() {
  const {
    chatMessages, isChatLoading, isFileReady, sendMessage,
    isSlidesLoading, generateSlides, cancelChatRequest, addMessageReaction,
    totalTokensUsed, exportChatHistory,
  } = useApp();
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
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

  const copyToClipboard = (text, messageId) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Feature 17: Handle template selection
  const handleTemplateSelect = (template) => {
    sendMessage(template.prompt);
  };

  // Feature 11: Handle export
  const handleExport = (format) => {
    exportChatHistory(format);
    setShowExportMenu(false);
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
              <div className="chat__message-wrapper">
                <div className={`chat__bubble chat__bubble--${msg.role === 'assistant' ? 'ai' : 'user'}`}>
                  <ReactMarkdown components={{ code: CodeBlock }}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
                <div className="chat__message-footer">
                  <p className="chat__timestamp">{formatTime(msg.timestamp)}</p>
                  {/* Feature 18: Display token usage */}
                  {msg.tokens && (
                    <p className="chat__token-count" title="Tokens used in this message">
                      {msg.tokens} tokens
                    </p>
                  )}
                  
                  {/* Message Actions */}
                  <div className="chat__message-actions">
                    {/* Copy button */}
                    <button
                      className="chat__message-action"
                      onClick={() => copyToClipboard(msg.content, msg.id)}
                      title="Copy message"
                    >
                      {copiedId === msg.id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                    
                    {/* Reactions (only for assistant messages) */}
                    {msg.role === 'assistant' && msg.reactions && (
                      <>
                        <button
                          className={`chat__reaction-btn ${msg.reactions.userReaction === 'like' ? 'active' : ''}`}
                          onClick={() => addMessageReaction(msg.id, 'like')}
                          title="Helpful"
                        >
                          <ThumbsUp size={14} />
                          {msg.reactions.likes > 0 && <span>{msg.reactions.likes}</span>}
                        </button>
                        <button
                          className={`chat__reaction-btn ${msg.reactions.userReaction === 'dislike' ? 'active' : ''}`}
                          onClick={() => addMessageReaction(msg.id, 'dislike')}
                          title="Not helpful"
                        >
                          <ThumbsDown size={14} />
                          {msg.reactions.dislikes > 0 && <span>{msg.reactions.dislikes}</span>}
                        </button>
                      </>
                    )}
                  </div>
                </div>
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
            <div className="chat__typing-content">
              <div className="chat__typing-dots">
                <span className="chat__typing-dot" />
                <span className="chat__typing-dot" />
                <span className="chat__typing-dot" />
              </div>
              <p className="chat__typing-text">AI is analyzing...</p>
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

      {/* Feature 17: Prompt Templates */}
      {chatMessages.length > 0 && (
        <motion.div
          className="chat__templates"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="chat__templates-label">Quick Prompts:</p>
          <div className="chat__templates-grid">
            {PROMPT_TEMPLATES.map((template) => (
              <button
                key={template.label}
                className="chat__template-btn"
                onClick={() => handleTemplateSelect(template)}
                disabled={isChatLoading}
                title={template.prompt}
              >
                {template.label}
              </button>
            ))}
          </div>
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
            disabled={isChatLoading}
          />
          <button
            className="chat__slides-btn"
            onClick={generateSlides}
            disabled={isSlidesLoading || isChatLoading || chatMessages.length < 2}
            title="Generate visual diagrams from conversation"
          >
            {isSlidesLoading ? <Loader size={18} className="chat__slides-spinner" /> : <Presentation size={18} />}
          </button>
          {isChatLoading ? (
            <button
              className="chat__send-btn chat__cancel-btn"
              onClick={cancelChatRequest}
              title="Cancel request"
            >
              <X size={18} />
            </button>
          ) : (
            <button
              className="chat__send-btn"
              onClick={handleSend}
              disabled={!input.trim()}
            >
              <Send size={18} />
            </button>
          )}
          {/* Feature 11: Export button */}
          <div className="chat__export-menu">
            <button
              className="chat__export-btn"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={chatMessages.length === 0}
              title="Export chat history"
            >
              ↓
            </button>
            {showExportMenu && (
              <div className="chat__export-dropdown">
                <button onClick={() => handleExport('json')}>Export as JSON</button>
                <button onClick={() => handleExport('csv')}>Export as CSV</button>
                <button onClick={() => handleExport('txt')}>Export as TXT</button>
              </div>
            )}
          </div>
        </div>
        {/* Feature 18: Token usage display */}
        {totalTokensUsed > 0 && (
          <p className="chat__token-usage">Total tokens used: {totalTokensUsed}</p>
        )}
      </div>
    </div>
  );
}
