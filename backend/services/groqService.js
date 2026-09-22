const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Keep the model configurable because Groq model availability changes over time.
const MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

// ─── Token budget constants ─────────────────────────────────────────
// qwen3.8-27b supports a large context window for document analysis.
// 1 token ≈ 3.5 chars (conservative estimate)
const RESPONSE_TOKENS = 4096;
const SAFE_MAX_DOC_CHARS = 20_000; // Keep requests below the account's 7k input-token limit.

// ─── System prompt for document analysis ────────────────────────────
const SYSTEM_PROMPT = `You are TrueDocs — an expert AI document analyst and research assistant.

ROLE & CAPABILITIES:
- You specialize in reading, understanding, and analyzing documents of all types (reports, research papers, contracts, spreadsheets, manuals, articles, letters, etc.)
- You provide accurate, well-structured, and insightful answers grounded exclusively in the document content provided to you.
- You can summarize, extract key points, find specific information, explain complex concepts, compare sections, identify patterns, and answer detailed questions.

RESPONSE GUIDELINES:
1. **Accuracy first** — Only answer based on what is actually in the document. If the document does not contain the answer, say so clearly.
2. **Be thorough but concise** — Provide complete answers without unnecessary filler. Use bullet points, numbered lists, and headers for clarity when appropriate.
3. **Use Markdown formatting** — Format your responses with bold, italics, lists, headers, and code blocks where they improve readability.
4. **Quote the document** — When referencing specific passages, quote them to back up your answer.
5. **Handle ambiguity gracefully** — If a question is vague, interpret it reasonably and mention your interpretation.
6. **Structured summaries** — When asked to summarize, organize by themes or sections rather than a wall of text.
7. **Be conversational** — While being accurate, maintain a helpful and approachable tone.

CONSTRAINTS:
- Never fabricate or hallucinate information that is not in the document.
- If you are unsure, say "Based on the document provided, I couldn't find specific information about that" rather than guessing.
- Do not reference your training data or knowledge outside the document unless the user explicitly asks for general context.
- Keep responses focused on what the user asked.
- NEVER output diagram code, graph notation, flowchart syntax, DOT/Graphviz markup, or any diagram markup in your responses. If the user asks for diagrams or visual representations, tell them to click the diagram/presentation button in the chat input bar instead.`;

// ─── Slide generation prompt ────────────────────────────────────────
const SLIDES_SYSTEM_PROMPT = `You are TrueDocs — an expert at creating visual diagram presentations from conversations about documents.

YOUR TASK: Analyze the conversation between user and AI about a document, then create Graphviz DOT diagrams that visualize the KEY TOPICS DISCUSSED. Diagrams must directly reflect what was asked about and explained — not just generic info.

OUTPUT FORMAT:
Return ONLY a valid JSON array (no markdown wrapping, no text before or after). Each element:
- "title": Slide title (max 8 words) — should reference a conversation topic
- "diagram": A valid Graphviz DOT language string (follow SYNTAX RULES below EXACTLY)
- "explanation": 2-3 sentence explanation connecting the diagram to what was discussed

GRAPHVIZ DOT SYNTAX — FOLLOW THESE RULES EXACTLY:

1. DIRECTED GRAPHS (use for most slides):
   Always start with: digraph G {
   End with: }
   Use -> for edges (NOT --> or any unicode arrows).
   Node IDs: simple lowercase identifiers (a, b, c, node1, step2). NO spaces in IDs.
   Labels use the label attribute: a [label="My Label"]
   Edge labels: a -> b [label="connects to"]
   VALID EXAMPLE:
     digraph G {
       rankdir=TB;
       node [shape=box, style="rounded,filled", fillcolor="#d1fae5", fontname="Arial"];
       edge [color="#059669"];
       a [label="Main Topic"];
       b [label="First Point"];
       c [label="Second Point"];
       d [label="Detail One"];
       a -> b;
       a -> c;
       b -> d;
     }

2. RECORD/TABLE STYLE (for comparisons):
     digraph G {
       node [shape=record, fontname="Arial"];
       a [label="{Category|Item 1|Item 2|Item 3}"];
     }

3. STYLING (include in EVERY diagram for good appearance):
   Add these lines right after the opening brace:
     rankdir=TB;
     node [shape=box, style="rounded,filled", fillcolor="#d1fae5", fontname="Arial", fontsize=12];
     edge [color="#059669", penwidth=1.5];
   For different node colors, set fillcolor on individual nodes.

ABSOLUTELY FORBIDDEN:
- Unicode arrows (→, ⟶, ⇒) — use ONLY ->
- Markdown fences inside the diagram string
- HTML-like labels (<...>) unless you are an expert — prefer simple label="text" instead
- Unescaped double quotes inside labels — use single quotes or escape with backslash

CONTENT RULES:
1. Create exactly 5 slides
2. Slide 1: Overview digraph of the MAIN TOPIC from the conversation (6-8 nodes)
3. Slides 2-4: Key SUBTOPICS that the user asked about or the AI explained
4. Slide 5: Summary or relationship diagram
5. ALL diagram content must directly reflect what was DISCUSSED in the conversation
6. Each diagram title should relate to a specific question or topic from the conversation
7. Keep diagrams simple — 4-8 nodes per diagram
8. Every diagram MUST be a valid digraph G { ... } block
9. Return ONLY the JSON array`;

/**
 * Detect if text looks like Mermaid syntax and convert to Graphviz DOT.
 */
function convertMermaidToDot(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const first = lines[0].toLowerCase();
  const isMermaid = /^(graph|flowchart)\s+(td|tb|lr|rl|bt)/i.test(first);
  if (!isMermaid) return null;

  const dirMatch = first.match(/\b(td|tb|lr|rl|bt)\b/i);
  let rankdir = 'TB';
  if (dirMatch) {
    const d = dirMatch[1].toUpperCase();
    if (d === 'LR') rankdir = 'LR';
    else if (d === 'RL') rankdir = 'RL';
    else if (d === 'BT') rankdir = 'BT';
    else rankdir = 'TB';
  }

  const nodeLabels = {};
  const edges = [];

  for (let i = 1; i < lines.length; i++) {
    let line = lines[i];
    if (/^(subgraph|end|style|classDef|class )\b/i.test(line)) continue;
    if (line.startsWith('%%')) continue;
    line = line.replace(/[-=.]{1,3}>/g, '->');

    const edgePattern = /^([\w]+)(?:\[([^\]]+)\])?\s*(?:->\s*(?:\|([^|]*)\|)?\s*([\w]+)(?:\[([^\]]+)\])?)?(.*)/;
    const m = line.match(edgePattern);
    if (m) {
      const [, srcId, srcLabel, edgeLabel, tgtId, tgtLabel, rest] = m;
      if (srcId && srcLabel) nodeLabels[srcId] = srcLabel.trim();
      if (tgtId && tgtLabel) nodeLabels[tgtId] = tgtLabel.trim();
      if (srcId && !nodeLabels[srcId]) nodeLabels[srcId] = srcId;
      if (tgtId && !nodeLabels[tgtId]) nodeLabels[tgtId] = tgtId;
      if (srcId && tgtId) edges.push([srcId, tgtId, edgeLabel?.trim() || null]);

      if (rest && tgtId) {
        let remaining = rest.trim();
        let prevNode = tgtId;
        while (remaining) {
          const chainMatch = remaining.match(/^->\s*(?:\|([^|]*)\|)?\s*([\w]+)(?:\[([^\]]+)\])?(.*)/);  
          if (!chainMatch) break;
          const [, cEdgeLabel, cId, cLabel, cRest] = chainMatch;
          if (cId && cLabel) nodeLabels[cId] = cLabel.trim();
          if (cId && !nodeLabels[cId]) nodeLabels[cId] = cId;
          if (prevNode && cId) edges.push([prevNode, cId, cEdgeLabel?.trim() || null]);
          prevNode = cId;
          remaining = (cRest || '').trim();
        }
      }
    }
  }

  if (Object.keys(nodeLabels).length === 0) return null;

  let dot = 'digraph G {\n';
  dot += `  rankdir=${rankdir};\n`;
  dot += '  node [shape=box, style="rounded,filled", fillcolor="#d1fae5", fontname="Arial", fontsize=12];\n';
  dot += '  edge [color="#059669", penwidth=1.5];\n';
  for (const [id, label] of Object.entries(nodeLabels)) {
    dot += `  ${id} [label="${label.replace(/"/g, "'")}"];\n`;
  }
  for (const [from, to, label] of edges) {
    dot += label
      ? `  ${from} -> ${to} [label="${label.replace(/"/g, "'")}"];\n`
      : `  ${from} -> ${to};\n`;
  }
  dot += '}';
  return dot;
}

/**
 * Sanitize a Graphviz DOT diagram string to fix common LLM output issues.
 * Also auto-converts Mermaid syntax to DOT as a fallback.
 */
function sanitizeDotDiagram(diagram) {
  let d = diagram.trim();

  // Remove markdown fences
  if (d.startsWith('```')) {
    d = d.replace(/^```(?:dot|graphviz|mermaid)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  // Curly quotes → straight
  d = d.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

  // Convert unicode arrows to ->
  d = d.replace(/[\u27F6\u2192\u27F9\u21D2\u279C\u2794\u2B95\u21E8\u27A1\u2B9E\u279E\u27A4]+/g, '->');
  d = d.replace(/[\u2014\u2013]+>/g, '->');
  d = d.replace(/\u2212+>/g, '->');
  d = d.replace(/-{2,}>/g, '->');

  // Detect and convert Mermaid syntax to DOT
  const converted = convertMermaidToDot(d);
  if (converted) return converted;

  // Already DOT — ensure wrapper
  const lower = d.trimStart().toLowerCase();
  if (!lower.startsWith('digraph') && !lower.startsWith('graph') && !lower.startsWith('strict')) {
    if (d.includes('->') || d.includes('--')) {
      d = 'digraph G {\n' + d + '\n}';
    }
  }

  d = d.split('\n').filter(l => l.trim()).join('\n');
  return d.trim();
}

/**
 * Smart truncation — for large documents, keep beginning + end
 * so the AI has context from both the opening and closing sections.
 */
function smartTruncate(text, maxChars) {
  if (text.length <= maxChars) return text;

  const headSize = Math.floor(maxChars * 0.7);
  const tailSize = maxChars - headSize - 200;

  const head = text.slice(0, headSize);
  const tail = text.slice(-tailSize);
  const omittedKB = Math.round((text.length - maxChars) / 1000);

  return (
    head +
    `\n\n[... DOCUMENT TRUNCATED — ~${omittedKB}k characters omitted from the middle for context limits ...]\n\n` +
    tail
  );
}

/**
 * Estimate token count for a list of messages.
 */
function estimateTokens(messages) {
  let chars = 0;
  for (const msg of messages) {
    chars += (msg.content || '').length + 20;
  }
  return Math.ceil(chars / 3.5);
}

/**
 * Build the messages array for a chat completion request.
 */
function buildMessages(documentText, chatHistory, userMessage) {
  // Estimate how many chars the chat history takes
  const historyChars = chatHistory.reduce((s, m) => s + (m.content || '').length + 20, 0);
  const userMsgChars = userMessage.length + 200;

  // Dynamic doc budget — shrink doc if chat history is long
  const docMaxChars = Math.max(
    20_000,
    SAFE_MAX_DOC_CHARS - historyChars - userMsgChars
  );

  const truncatedDoc = smartTruncate(documentText, docMaxChars);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Here is the document I need you to analyze:\n\n---\n${truncatedDoc}\n---\n\nI will now ask you questions about this document.`,
    },
    {
      role: 'assistant',
      content: `I've thoroughly read and analyzed the document. I'm ready to answer your questions about it. What would you like to know?`,
    },
  ];

  // Append recent chat history — cap at last 40 messages to avoid overflow
  const recentHistory = chatHistory.slice(-40);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  messages.push({ role: 'user', content: userMessage });

  return messages;
}

/**
 * Retry wrapper for Groq API calls with exponential backoff.
 * Handles rate limits (429), context overflow (400), and server errors (5xx).
 */
async function callGroqWithRetry(params, maxRetries = 3) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const completion = await groq.chat.completions.create(params);
      return completion;
    } catch (err) {
      lastError = err;
      const status = err?.status || err?.statusCode || err?.error?.status;
      const errMsg = err?.message || err?.error?.message || '';

      console.error(`Groq API error (attempt ${attempt + 1}/${maxRetries + 1}):`, status, errMsg.slice(0, 200));

      // Rate limit — wait and retry
      if (status === 429) {
        const retryAfter = parseFloat(err?.headers?.['retry-after']) || (2 ** attempt * 3);
        console.warn(`  Rate limited. Retrying in ${retryAfter}s...`);
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        continue;
      }

      // Context length exceeded — not retryable with same params
      if (
        status === 400 &&
        (errMsg.includes('context_length') ||
         errMsg.includes('too many tokens') ||
         errMsg.includes('maximum context') ||
         errMsg.includes('Please reduce') ||
         errMsg.includes('token'))
      ) {
        throw new Error(
          'Document is too large for analysis even after truncation. ' +
          'Try uploading a shorter document or one with less text content.'
        );
      }

      if (
        status === 413 ||
        errMsg.includes('input tokens per minute') ||
        errMsg.includes('Request too large')
      ) {
        throw new Error(
          'This document is too large for the current AI usage limit. ' +
          'Please upload a shorter document or split it into smaller files.'
        );
      }

      // Request timeout or server error — retry
      if (status === 408 || status === 503 || status === 502 || status >= 500) {
        const wait = 2 ** attempt * 2000;
        console.warn(`  Server error. Retrying in ${wait}ms...`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      // Other errors — don't retry
      throw err;
    }
  }
  throw lastError;
}

/**
 * Send a chat request to Groq and return the AI response.
 */
async function chat(documentText, chatHistory, userMessage) {
  const messages = buildMessages(documentText, chatHistory, userMessage);

  const completion = await callGroqWithRetry({
    model: MODEL,
    messages,
    temperature: 0.3,
    max_tokens: RESPONSE_TOKENS,
    top_p: 0.9,
    stream: false,
  });

  return completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
}

/**
 * Generate an initial analysis message when a document is first uploaded.
 */
async function analyzeDocument(documentText, fileName) {
  const truncatedDoc = smartTruncate(documentText, SAFE_MAX_DOC_CHARS);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `I just uploaded a document called "${fileName}". Here is its content:\n\n---\n${truncatedDoc}\n---\n\nPlease provide a brief welcome message confirming you've analyzed it. Include:\n1. What type of document this appears to be\n2. A one-line summary of what it's about\n3. 2-3 suggested questions I could ask\n\nKeep it concise and friendly (under 150 words).`,
    },
  ];

  const completion = await callGroqWithRetry({
    model: MODEL,
    messages,
    temperature: 0.4,
    max_tokens: 1024,
    top_p: 0.9,
    stream: false,
  });

  return completion.choices[0]?.message?.content || `I've analyzed **"${fileName}"** and I'm ready to help. Ask me anything about this document!`;
}

/**
 * Generate visual slides with Graphviz DOT diagrams based on document content and chat history.
 */
async function generateSlides(documentText, chatHistory) {
  const truncatedDoc = smartTruncate(documentText, 100_000); // smaller budget since slides need less doc context

  // Build a conversation summary for the AI
  const recentHistory = chatHistory.slice(-30);
  const conversationText = recentHistory
    .map((msg) => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`)
    .join('\n');

  const messages = [
    { role: 'system', content: SLIDES_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Here is the document:\n\n---\n${truncatedDoc}\n---\n\nHere is the conversation between the user and AI about this document:\n\n---\n${conversationText}\n---\n\nCreate diagrams that visualize the specific topics discussed in this conversation. Focus on what the user asked about and what the AI explained. Return ONLY a valid JSON array.`,
    },
  ];

  const completion = await callGroqWithRetry({
    model: MODEL,
    messages,
    temperature: 0.4,
    max_tokens: 8192,
    top_p: 0.9,
    stream: false,
  });

  const raw = completion.choices[0]?.message?.content || '[]';

  // Parse the JSON response — handle potential markdown fences
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  try {
    const slides = JSON.parse(cleaned);
    if (!Array.isArray(slides)) throw new Error('Response is not an array');

    // Validate and sanitise each slide
    return slides
      .filter((s) => s && s.title && s.diagram && s.explanation)
      .map((s) => ({
        title: String(s.title).slice(0, 100),
        diagram: sanitizeDotDiagram(String(s.diagram)),
        explanation: String(s.explanation).slice(0, 500),
      }));
  } catch (parseErr) {
    console.error('Failed to parse slide JSON:', parseErr.message, '\nRaw:', raw.slice(0, 500));
    throw new Error('Failed to generate slides. Please try again.');
  }
}

module.exports = { chat, analyzeDocument, generateSlides };
