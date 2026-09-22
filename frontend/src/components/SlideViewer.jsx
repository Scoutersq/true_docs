import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Presentation, Maximize2, Minimize2 } from 'lucide-react';
import GraphvizDiagram from './GraphvizDiagram';
import '../styles/SlideViewer.css';

const slideVariants = {
  enter: (direction) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction < 0 ? 300 : -300, opacity: 0 }),
};

export default function SlideViewer({ slides, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!slides || slides.length === 0) return null;

  const slide = slides[currentIndex];
  const total = slides.length;

  const goTo = (newIndex) => {
    if (newIndex < 0 || newIndex >= total) return;
    setDirection(newIndex > currentIndex ? 1 : -1);
    setCurrentIndex(newIndex);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') goTo(currentIndex + 1);
    else if (e.key === 'ArrowLeft') goTo(currentIndex - 1);
    else if (e.key === 'Escape') onClose();
  };

  return (
    <motion.div
      className={`slide-viewer ${isFullscreen ? 'slide-viewer--fullscreen' : ''}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Header */}
      <div className="slide-viewer__header">
        <div className="slide-viewer__header-left">
          <Presentation size={18} />
          <span className="slide-viewer__title">Conversation Slides</span>
          <span className="slide-viewer__counter">
            {currentIndex + 1} / {total}
          </span>
        </div>
        <div className="slide-viewer__header-actions">
          <button
            className="slide-viewer__action-btn"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button className="slide-viewer__action-btn slide-viewer__action-btn--close" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Slide Content */}
      <div className="slide-viewer__content">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            className="slide-viewer__slide"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="slide-viewer__slide-title">{slide.title}</h2>

            <div className="slide-viewer__diagram-wrapper">
              <GraphvizDiagram dot={slide.diagram} className="slide-viewer__diagram" />
            </div>

            <p className="slide-viewer__explanation">{slide.explanation}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="slide-viewer__nav">
        <button
          className="slide-viewer__nav-btn"
          onClick={() => goTo(currentIndex - 1)}
          disabled={currentIndex === 0}
        >
          <ChevronLeft size={20} />
          <span>Previous</span>
        </button>

        <div className="slide-viewer__dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`slide-viewer__dot ${i === currentIndex ? 'slide-viewer__dot--active' : ''}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>

        <button
          className="slide-viewer__nav-btn"
          onClick={() => goTo(currentIndex + 1)}
          disabled={currentIndex === total - 1}
        >
          <span>Next</span>
          <ChevronRight size={20} />
        </button>
      </div>
    </motion.div>
  );
}
