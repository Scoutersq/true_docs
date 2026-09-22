import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

let mermaidReady = false;

function ensureMermaidInit() {
  if (mermaidReady) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    flowchart: { curve: 'basis', padding: 20, htmlLabels: true },
    securityLevel: 'loose',
    suppressErrorRendering: true,
  });
  mermaidReady = true;
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

  // Remove HTML tags
  d = d.replace(/<[^>]+>/g, '');

  // Curly quotes to straight
  d = d.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

  // Convert ALL unicode arrow variants to standard -->
  d = d.replace(/[\u27F6\u2192\u27F9\u21D2\u279C\u2794\u2B95\u21E8\u27A1\u2B9E\u25B6\u25BA\u2023\u279E\u27A4]+/g, '-->');
  d = d.replace(/[\u2014\u2013]+>/g, '-->');
  d = d.replace(/\u2212+>/g, '-->');
  d = d.replace(/[\u2911\u21E2]+/g, '-.->');

  // Fix non-standard arrow formats
  d = d.replace(/-+>/g, '-->');
  d = d.replace(/=+>/g, '-->');

  // Remove trailing semicolons
  d = d.replace(/;\s*$/gm, '');

  // Remove style/classDef/subgraph/end lines
  d = d.replace(/^\s*(style|classDef|class )\b.*$/gm, '');
  d = d.replace(/^\s*subgraph\b.*$/gm, '');
  d = d.replace(/^\s*end\s*$/gm, '');

  // Determine diagram type
  const lines = d.split('\n').filter((l) => l.trim());
  if (lines.length === 0) return '';

  const firstLower = lines[0].trim().toLowerCase();
  const isSequence = firstLower.startsWith('sequencediagram');
  const isPie = firstLower.startsWith('pie');

  if (!isSequence && !isPie) {
    // Flowchart — clean node labels
    d = d.replace(/\[([^\]]*)\]/g, (_, label) => {
      const clean = label
        .replace(/[":;'`|<>&{}()\\\/]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return '[' + (clean || 'Node') + ']';
    });

    d = d.replace(/\{([^}]*)\}/g, (_, label) => {
      const clean = label
        .replace(/[":;'`|<>&\[\]()\\\/]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return '{' + (clean || 'Decision') + '}';
    });

    // Fix node IDs that contain spaces: "node A[..." → "nodeA[..."
    d = d.replace(/^(\s*)([A-Za-z]\w*)\s+([A-Za-z]\w*)\[/gm, '$1$2$3[');
  }

  // Remove empty lines
  d = d
    .split('\n')
    .filter((l) => l.trim())
    .join('\n');

  // Ensure valid diagram type on first line
  const checkFirst = d.split('\n')[0].trim().toLowerCase();
  const validStarts = ['graph ', 'graph\t', 'flowchart ', 'sequencediagram', 'pie '];
  if (!validStarts.some((s) => checkFirst.startsWith(s))) {
    if (d.includes('-->') || d.includes('---') || d.includes('-.->')) {
      d = 'graph TD\n' + d;
    }
  }

  // Normalize multiple arrows on same segment: A --> --> B → A --> B
  d = d.replace(/(-->\s*){2,}/g, '--> ');

  return d.trim();
}

/**
 * Aggressive sanitization — last resort for render failures.
 */
function aggressiveSanitize(d) {
  let result = d;

  // Normalize ALL arrow-like patterns to -->
  result = result.replace(/[-=.]{1,4}>/g, '-->');
  result = result.replace(/-{2,}>/g, '-->');

  // Remove edge labels |...|
  result = result.replace(/-->\|[^|]*\|/g, '-->');

  // Strip ALL non-alphanumeric from labels (keep spaces and hyphens)
  result = result.replace(/\[([^\]]*)\]/g, (_, label) => {
    const clean = label.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
    return '[' + (clean || 'Node') + ']';
  });

  result = result.replace(/\{([^}]*)\}/g, (_, label) => {
    const clean = label.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
    return '{' + (clean || 'Decision') + '}';
  });

  // Keep only lines that look like valid mermaid syntax
  const lines = result.split('\n');
  const firstLine = lines[0];
  const kept = [firstLine];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (
      line.includes('-->') ||
      line.includes('---') ||
      line.includes('-.->') ||
      line.startsWith('participant') ||
      line.includes('->>') ||
      line.includes('-->>') ||
      /^"[^"]*"\s*:\s*\d/.test(line) ||
      /^[A-Za-z]\w*[\s\[({]/.test(line)
    ) {
      kept.push(lines[i]);
    }
  }

  return kept.join('\n').trim();
}

/**
 * Remove orphaned mermaid-injected DOM elements.
 */
function cleanupOrphans() {
  try {
    document.querySelectorAll('div[id^="dmermaid-"], svg[id^="dmermaid-"]').forEach((el) => el.remove());
    document.querySelectorAll('div.mermaid-error-container').forEach((el) => el.remove());
    // Clean up any leftover temp SVGs from failed renders
    document.querySelectorAll('svg[id^="mermaid_"]').forEach((el) => {
      if (!el.closest('.mermaid-diagram')) el.remove();
    });
  } catch {
    // Ignore cleanup errors
  }
}

export default function MermaidDiagram({ chart, className = '' }) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [errorCode, setErrorCode] = useState('');

  useEffect(() => {
    if (!chart) {
      setStatus('error');
      setErrorCode('');
      return;
    }

    ensureMermaidInit();
    setStatus('loading');
    setErrorCode('');

    let cancelled = false;
    const el = containerRef.current;
    if (!el) return;

    const doRender = async () => {
      const cleanChart = sanitizeChart(chart);
      if (!cleanChart) {
        if (!cancelled) {
          setStatus('error');
          setErrorCode('');
        }
        return;
      }

      // ── Attempt 1: standard sanitized chart via mermaid.run() ──
      try {
        el.textContent = cleanChart;
        el.removeAttribute('data-processed');
        await mermaid.run({ nodes: [el], suppressErrors: false });
        if (!cancelled) setStatus('success');
        cleanupOrphans();
        return;
      } catch (err) {
        console.warn('Mermaid run #1 failed:', String(err?.message || err).slice(0, 300));
        cleanupOrphans();
      }

      // ── Attempt 2: aggressive sanitization via mermaid.run() ──
      try {
        const aggressive = aggressiveSanitize(cleanChart);
        el.textContent = aggressive;
        el.removeAttribute('data-processed');
        await mermaid.run({ nodes: [el], suppressErrors: false });
        if (!cancelled) setStatus('success');
        cleanupOrphans();
        return;
      } catch (err) {
        console.warn('Mermaid run #2 failed:', String(err?.message || err).slice(0, 300));
        cleanupOrphans();
      }

      // ── Attempt 3: fallback using mermaid.render() without container ──
      try {
        const aggressive = aggressiveSanitize(cleanChart);
        const id = `mermaid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const { svg } = await mermaid.render(id, aggressive);
        if (!cancelled && el) {
          el.innerHTML = svg;
          setStatus('success');
        }
        cleanupOrphans();
        return;
      } catch (err) {
        console.warn('Mermaid render #3 failed:', String(err?.message || err).slice(0, 300));
        cleanupOrphans();
      }

      // All attempts failed
      if (!cancelled) {
        el.textContent = '';
        setStatus('error');
        setErrorCode(cleanChart);
      }
    };

    doRender();

    return () => {
      cancelled = true;
      cleanupOrphans();
    };
  }, [chart]);

  if (status === 'error') {
    return (
      <div className={`mermaid-error ${className}`}>
        <p className="mermaid-error__label">Diagram code:</p>
        <pre className="mermaid-error__code">{errorCode || chart}</pre>
      </div>
    );
  }

  return (
    <>
      {status === 'loading' && (
        <div className={`mermaid-loading ${className}`}>
          <span className="mermaid-loading__spinner" />
          <span>Rendering diagram…</span>
        </div>
      )}
      <div
        ref={containerRef}
        className={`mermaid-diagram ${className}`}
        style={status !== 'success' ? { opacity: 0, pointerEvents: 'none', position: 'absolute', width: '100%' } : undefined}
      />
    </>
  );
}
