import { useEffect, useRef, useState, useId } from 'react';
import mermaid from 'mermaid';

let mermaidInitialized = false;

function initMermaid() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
      primaryColor: '#d1fae5',
      primaryBorderColor: '#059669',
      primaryTextColor: '#111827',
      secondaryColor: '#f0fdf4',
      secondaryBorderColor: '#10B981',
      secondaryTextColor: '#111827',
      tertiaryColor: '#F8FBF9',
      tertiaryBorderColor: '#9CA3AF',
      lineColor: '#059669',
      textColor: '#111827',
      fontSize: '14px',
      fontFamily: "'DM Sans', sans-serif",
      nodeTextColor: '#111827',
    },
    flowchart: { curve: 'basis', padding: 20, htmlLabels: true },
    securityLevel: 'loose',
    suppressErrorRendering: true,
  });
  mermaidInitialized = true;
}

/**
 * Sanitize the mermaid chart string before rendering.
 */
function sanitizeChart(raw) {
  let d = (raw || '').trim();

  // Strip markdown fences
  if (d.startsWith('```')) {
    d = d.replace(/^```(?:mermaid)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  // Curly quotes → straight
  d = d.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

  // Convert unicode arrows to standard mermaid arrows
  d = d.replace(/[\u27F6\u2192\u27F9\u21D2\u279C\u2794\u2B95\u21E8]+/g, '-->');
  d = d.replace(/[\u2014\u2013]>/g, '-->');
  d = d.replace(/[\u2911\u21E2]+/g, '-.->');

  // Remove trailing semicolons on lines
  d = d.replace(/;\s*$/gm, '');

  // Remove style/classDef lines
  d = d.replace(/^\s*(style|classDef|class )\b.*$/gm, '');

  return d.trim();
}

/**
 * Remove any orphaned mermaid error elements from the document body.
 */
function cleanupMermaidErrors() {
  // Mermaid v11 may inject error text and SVGs into the body
  document.querySelectorAll('div[id^="dmermaid"], svg[id^="dmermaid"]').forEach((el) => el.remove());
  // Also remove orphaned mermaid error containers
  document.querySelectorAll('div.mermaid-error-container, #d').forEach((el) => el.remove());
}

export default function MermaidDiagram({ chart, className = '' }) {
  const containerRef = useRef(null);
  const [svgContent, setSvgContent] = useState('');
  const [error, setError] = useState(null);
  const uniqueId = useId().replace(/:/g, '_');

  useEffect(() => {
    if (!chart) return;
    initMermaid();

    let cancelled = false;

    const renderDiagram = async () => {
      try {
        const cleanChart = sanitizeChart(chart);
        if (!cleanChart) {
          if (!cancelled) setError('Empty diagram');
          return;
        }

        const id = `mermaid${uniqueId}${Date.now()}`;

        // Create a hidden container to isolate rendering
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '-9999px';
        tempContainer.style.visibility = 'hidden';
        document.body.appendChild(tempContainer);

        try {
          const { svg } = await mermaid.render(id, cleanChart, tempContainer);
          if (!cancelled) {
            setSvgContent(svg);
            setError(null);
          }
        } finally {
          // Always clean up temp container and any orphaned elements
          tempContainer.remove();
          cleanupMermaidErrors();
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('Mermaid render error:', err);
          setError(err?.message || 'Failed to render diagram');
          cleanupMermaidErrors();
        }
      }
    };

    renderDiagram();
    return () => {
      cancelled = true;
      cleanupMermaidErrors();
    };
  }, [chart, uniqueId]);

  if (error) {
    return (
      <div className={`mermaid-error ${className}`}>
        <p className="mermaid-error__label">Diagram code:</p>
        <pre className="mermaid-error__code">{chart}</pre>
      </div>
    );
  }

  if (!svgContent) {
    return (
      <div className={`mermaid-loading ${className}`}>
        <span className="mermaid-loading__spinner" />
        <span>Rendering diagram…</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`mermaid-diagram ${className}`}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}
