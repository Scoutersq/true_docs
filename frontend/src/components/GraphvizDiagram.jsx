import { useEffect, useRef, useState } from 'react';
import { instance as vizInstance_ } from '@viz-js/viz';

let vizInst = null;
let vizLoading = null;

/**
 * Get or create the shared Viz (Graphviz WASM) instance.
 */
function getViz() {
  if (vizInst) return Promise.resolve(vizInst);
  if (vizLoading) return vizLoading;
  vizLoading = vizInstance_().then((v) => {
    vizInst = v;
    return v;
  });
  return vizLoading;
}

/**
 * Detect if text looks like Mermaid syntax and convert to Graphviz DOT.
 */
function convertMermaidToDot(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const first = lines[0].toLowerCase();
  // Detect mermaid: starts with graph/flowchart + direction
  const isMermaid = /^(graph|flowchart)\s+(td|tb|lr|rl|bt)/i.test(first);
  if (!isMermaid) return null;

  // Determine rankdir
  const dirMatch = first.match(/\b(td|tb|lr|rl|bt)\b/i);
  let rankdir = 'TB';
  if (dirMatch) {
    const d = dirMatch[1].toUpperCase();
    if (d === 'LR') rankdir = 'LR';
    else if (d === 'RL') rankdir = 'RL';
    else if (d === 'BT') rankdir = 'BT';
    else rankdir = 'TB';
  }

  const nodeLabels = {}; // nodeId -> label
  const edges = [];      // [fromId, toId, edgeLabel?]

  // Parse remaining lines
  for (let i = 1; i < lines.length; i++) {
    let line = lines[i];
    // Skip mermaid keywords
    if (/^(subgraph|end|style|classDef|class )\b/i.test(line)) continue;
    // Skip comments
    if (line.startsWith('%%')) continue;

    // Normalize arrows: any combo of dashes/equals/dots + > becomes ->
    line = line.replace(/[-=.]{1,3}>/g, '->');

    // Match: A[Label] -> B[Label]
    // Or:    A -> B
    // Or:    A[Label]
    const edgePattern = /^([\w]+)(?:\[([^\]]+)\])?\s*(?:->\s*(?:\|([^|]*)\|)?\s*([\w]+)(?:\[([^\]]+)\])?)?(.*)/;
    const m = line.match(edgePattern);
    if (m) {
      const [, srcId, srcLabel, edgeLabel, tgtId, tgtLabel, rest] = m;

      if (srcId && srcLabel) nodeLabels[srcId] = srcLabel.trim();
      if (tgtId && tgtLabel) nodeLabels[tgtId] = tgtLabel.trim();
      if (srcId && !nodeLabels[srcId]) nodeLabels[srcId] = srcId;
      if (tgtId && !nodeLabels[tgtId]) nodeLabels[tgtId] = tgtId;

      if (srcId && tgtId) {
        edges.push([srcId, tgtId, edgeLabel?.trim() || null]);
      }

      // Handle chained arrows: ... -> C[Label] in the rest
      if (rest && tgtId) {
        let remaining = rest.trim();
        let prevNode = tgtId;
        while (remaining) {
          const chainMatch = remaining.match(/^->\s*(?:\|([^|]*)\|)?\s*([\w]+)(?:\[([^\]]+)\])?(.*)/);  
          if (!chainMatch) break;
          const [, cEdgeLabel, cId, cLabel, cRest] = chainMatch;
          if (cId && cLabel) nodeLabels[cId] = cLabel.trim();
          if (cId && !nodeLabels[cId]) nodeLabels[cId] = cId;
          if (prevNode && cId) {
            edges.push([prevNode, cId, cEdgeLabel?.trim() || null]);
          }
          prevNode = cId;
          remaining = (cRest || '').trim();
        }
      }
    }
  }

  if (Object.keys(nodeLabels).length === 0) return null;

  // Build DOT
  let dot = 'digraph G {\n';
  dot += `  rankdir=${rankdir};\n`;
  dot += '  node [shape=box, style="rounded,filled", fillcolor="#d1fae5", fontname="Arial", fontsize=12];\n';
  dot += '  edge [color="#059669", penwidth=1.5];\n';

  for (const [id, label] of Object.entries(nodeLabels)) {
    const escaped = label.replace(/"/g, "'");
    dot += `  ${id} [label="${escaped}"];\n`;
  }
  for (const [from, to, label] of edges) {
    if (label) {
      const escaped = label.replace(/"/g, "'");
      dot += `  ${from} -> ${to} [label="${escaped}"];\n`;
    } else {
      dot += `  ${from} -> ${to};\n`;
    }
  }
  dot += '}';
  return dot;
}

/**
 * Sanitize a DOT diagram string from LLM output.
 * Also handles Mermaid syntax by auto-converting to DOT.
 */
function sanitizeDot(raw) {
  let d = (raw || '').trim();

  // Strip markdown fences (```dot ... ``` or ```mermaid ... ```)
  if (d.startsWith('```')) {
    d = d.replace(/^```(?:dot|graphviz|mermaid)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  // Curly quotes → straight
  d = d.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

  // Convert unicode arrows to ->
  d = d.replace(/[\u27F6\u2192\u27F9\u21D2\u279C\u2794\u2B95\u21E8\u27A1\u2B9E\u279E\u27A4]+/g, '->');
  d = d.replace(/[\u2014\u2013]+>/g, '->');
  // Fix --> to ->
  d = d.replace(/-{2,}>/g, '->');

  // Detect and convert Mermaid syntax to DOT
  const converted = convertMermaidToDot(d);
  if (converted) return converted;

  // Already DOT — ensure it starts with digraph or graph
  const lower = d.toLowerCase();
  if (!lower.startsWith('digraph') && !lower.startsWith('graph') && !lower.startsWith('strict')) {
    if (d.includes('->') || d.includes('--')) {
      d = 'digraph G {\n' + d + '\n}';
    }
  }

  return d.trim();
}

export default function GraphvizDiagram({ dot, className = '' }) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!dot) {
      setStatus('error');
      setErrorMsg('No diagram data');
      return;
    }

    setStatus('loading');
    setErrorMsg('');
    let cancelled = false;

    const render = async () => {
      try {
        const viz = await getViz();
        const cleanDot = sanitizeDot(dot);

        if (!cleanDot) {
          if (!cancelled) {
            setStatus('error');
            setErrorMsg('Empty diagram');
          }
          return;
        }

        // Render to SVG string
        const svgStr = viz.renderString(cleanDot, { format: 'svg', engine: 'dot' });

        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svgStr;

          // Make SVG responsive
          const svgEl = containerRef.current.querySelector('svg');
          if (svgEl) {
            svgEl.removeAttribute('width');
            svgEl.removeAttribute('height');
            svgEl.style.width = '100%';
            svgEl.style.height = 'auto';
            svgEl.style.maxWidth = '100%';
          }

          setStatus('success');
        }
      } catch (err) {
        console.warn('Graphviz render error:', err);
        if (!cancelled) {
          setStatus('error');
          setErrorMsg(sanitizeDot(dot));
        }
      }
    };

    render();

    return () => {
      cancelled = true;
    };
  }, [dot]);

  if (status === 'error') {
    return (
      <div className={`graphviz-error ${className}`}>
        <p className="graphviz-error__label">Diagram code:</p>
        <pre className="graphviz-error__code">{errorMsg || dot}</pre>
      </div>
    );
  }

  return (
    <>
      {status === 'loading' && (
        <div className={`graphviz-loading ${className}`}>
          <span className="graphviz-loading__spinner" />
          <span>Rendering diagram…</span>
        </div>
      )}
      <div
        ref={containerRef}
        className={`graphviz-diagram ${className}`}
        style={status !== 'success' ? { opacity: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' } : undefined}
      />
    </>
  );
}
