import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Maximize2, Minimize2, Layers } from 'lucide-react';
import GraphvizDiagram from './GraphvizDiagram';
import '../styles/DiagramPanel.css';

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir < 0 ? 200 : -200, opacity: 0 }),
};

export default function DiagramPanel({ slides, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const panelRef = useRef(null);

  // Auto-focus panel on mount so keyboard nav works and user sees it
  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.focus({ preventScroll: true });
    }
  }, []);

  // Force fullscreen styles via DOM API with !important to override framer-motion WAAPI
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;

    if (isExpanded) {
      const overrides = {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        width: '100vw',
        height: '100vh',
        'max-width': '100vw',
        'min-width': '100vw',
        'z-index': '9999',
        transform: 'none',
        'border-left': 'none',
        'border-radius': '0',
      };
      Object.entries(overrides).forEach(([prop, val]) => {
        el.style.setProperty(prop, val, 'important');
      });
    } else {
      ['position', 'top', 'left', 'right', 'bottom', 'width', 'height',
       'max-width', 'min-width', 'z-index', 'transform', 'border-left', 'border-radius'
      ].forEach(prop => el.style.removeProperty(prop));
    }
  }, [isExpanded]);

  if (!slides || slides.length === 0) return null;

  const slide = slides[currentIndex];
  const total = slides.length;

  const goTo = (newIndex) => {
    if (newIndex < 0 || newIndex >= total) return;
    setDirection(newIndex > currentIndex ? 1 : -1);
    setCurrentIndex(newIndex);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight') goTo(currentIndex + 1);
    else if (e.key === 'ArrowLeft') goTo(currentIndex - 1);
    else if (e.key === 'Escape') {
      if (isExpanded) setIsExpanded(false);
      else onClose();
    }
  };

  return (
    <>
      {/* Fullscreen overlay backdrop */}
      {isExpanded && (
        <motion.div
          className="diagram-panel__backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsExpanded(false)}
        />
      )}

      <motion.div
        ref={panelRef}
        className={`diagram-panel ${isExpanded ? 'diagram-panel--expanded' : ''}`}
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 60 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* Header */}
        <div className="diagram-panel__header">
          <div className="diagram-panel__header-left">
            <Layers size={16} />
            <span className="diagram-panel__title">Diagrams</span>
            <span className="diagram-panel__counter">
              {currentIndex + 1}/{total}
            </span>
          </div>
          <div className="diagram-panel__header-actions">
            <button
              className="diagram-panel__action-btn"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button
              className="diagram-panel__action-btn diagram-panel__action-btn--close"
              onClick={onClose}
              title="Close diagrams"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Slide content */}
        <div className="diagram-panel__body">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentIndex}
              className="diagram-panel__slide"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <h3 className="diagram-panel__slide-title">{slide.title}</h3>

              <div className="diagram-panel__diagram-area">
                <GraphvizDiagram dot={slide.diagram} />
              </div>

              <p className="diagram-panel__explanation">{slide.explanation}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="diagram-panel__nav">
          <button
            className="diagram-panel__nav-btn"
            onClick={() => goTo(currentIndex - 1)}
            disabled={currentIndex === 0}
          >
            <ChevronLeft size={16} />
          </button>

          <div className="diagram-panel__dots">
            {slides.map((_, i) => (
              <button
                key={i}
                className={`diagram-panel__dot ${i === currentIndex ? 'diagram-panel__dot--active' : ''}`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>

          <button
            className="diagram-panel__nav-btn"
            onClick={() => goTo(currentIndex + 1)}
            disabled={currentIndex === total - 1}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </motion.div>
    </>
  );
}
