const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Using llama-3.3-70b-versatile — best balance of quality, speed, and context on Groq
const MODEL = 'llama-3.3-70b-versatile';

// ─── Token budget constants ─────────────────────────────────────────
// llama-3.3-70b-versatile context: 128k tokens
// 1 token ≈ 3.5 chars (conservative estimate)
const RESPONSE_TOKENS = 4096;
const SAFE_MAX_DOC_CHARS = 250_000; // ~71k tokens — uses more of the 128k context for better coverage

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
- NEVER output Mermaid diagram code, graph notation, flowchart syntax, or any diagram markup in your responses. If the user asks for diagrams or visual representations, tell them to click the diagram/presentation button in the chat input bar instead.`;

// ─── Slide generation prompt ────────────────────────────────────────
const SLIDES_SYSTEM_PROMPT = `You are TrueDocs — an expert at creating visual diagram presentations from document conversations.

Your task is to analyze a document and conversation, then create visual diagrams explaining key topics.

OUTPUT FORMAT:
Return ONLY a valid JSON array. No text before or after. Each element:
- "title": Slide title (max 8 words)
- "diagram": A valid Mermaid.js diagram string (see STRICT RULES below)
- "explanation": 2-3 sentence explanation of the diagram

STRICT MERMAID SYNTAX RULES — follow exactly:
1. FLOWCHARTS: Start with "graph TD" or "graph LR" on its own line. Each connection on its own line.
   - Node IDs MUST be single letters or short alphanumeric (A, B, C, nodeA, step1). NO spaces in IDs.
   - Labels go in brackets: A[My Label] --> B[Other Label]
   - ONLY these bracket types: [square] (round) {diamond}
   - Arrow types: --> or --- or -.-> only
   - Edge labels: A -->|some text| B
   - Example:
     graph TD
     A[Start Process] --> B[Step One]
     B --> C{Decision}
     C -->|Yes| D[Do This]
     C -->|No| E[Do That]
   - Maximum 6-10 nodes per flowchart

2. SEQUENCE DIAGRAMS: Start with "sequenceDiagram" on its own line.
   - participant Name (no special chars)
   - Name->>Other: Message text
   - Use ->> or -->> only
   - Example:
     sequenceDiagram
     participant User
     participant System
     User->>System: Upload file
     System-->>User: Confirm receipt

3. PIE CHARTS: Start with "pie title My Title" on its own line.
   - Each slice: "Label" : number
   - Example:
     pie title Distribution
     "Category A" : 40
     "Category B" : 30
     "Category C" : 30

FORBIDDEN — never use these:
- subgraph, classDiagram, stateDiagram, erDiagram, gantt, journey
- Colons, semicolons, quotes, or parentheses INSIDE node labels
- Backticks or markdown fences inside the diagram string
- HTML tags or style/class definitions
- Special unicode characters

RULES:
1. Create exactly 4-5 slides
2. First slide: overview flowchart of document (6-8 nodes)
3. Include at least 2 flowcharts and 1 pie chart
4. Base ALL content on the actual document — never fabricate
5. Keep diagrams simple and valid — fewer nodes done correctly beats many nodes with errors
6. Return ONLY the JSON array`;

/**
 * Sanitize a Mermaid diagram string to fix common LLM output issues.
 */
function sanitizeMermaidDiagram(diagram) {
  let d = diagram.trim();

  // Remove markdown fences if LLM wrapped the diagram
  if (d.startsWith('```')) {
    d = d.replace(/^```(?:mermaid)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  // Remove any HTML tags
  d = d.replace(/<[^>]+>/g, '');

  // Remove style/classDef lines
  d = d.replace(/^\s*(style|classDef|class ).*$/gm, '');

  // Fix common issues: curly quotes to straight
  d = d.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

  // Convert unicode arrows to standard mermaid arrows
  // ⟶ (U+27F6), → (U+2192), ⟹ (U+27F9), ⇒ (U+21D2), ➜ (U+279C), ➔ (U+2794)
  d = d.replace(/[\u27F6\u2192\u27F9\u21D2\u279C\u2794\u2B95\u21E8]+/g, '-->');
  // Em-dash/en-dash arrows: —> or –> to -->
  d = d.replace(/[\u2014\u2013]>/g, '-->');
  // Dotted unicode arrows ⤑ ⇢ to -.->
  d = d.replace(/[\u2911\u21E2]+/g, '-.->');

  // Remove semicolons at end of lines (common LLM mistake)
  d = d.replace(/;\s*$/gm, '');

  // Ensure the diagram starts with a valid directive
  const firstLine = d.split('\n')[0].trim().toLowerCase();
  const validStarts = ['graph ', 'flowchart ', 'sequencediagram', 'pie ', 'pie\n', 'pie\r'];
  if (!validStarts.some(s => firstLine.startsWith(s))) {
    // Try to salvage by prepending graph TD if it looks like flowchart nodes
    if (d.includes('-->') || d.includes('---') || d.includes('-.->')) {
      d = 'graph TD\n' + d;
    }
  }

  return d;
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
 * Generate visual slides with Mermaid diagrams based on document content and chat history.
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
      content: `Here is the document:\n\n---\n${truncatedDoc}\n---\n\nHere is the conversation about this document:\n\n---\n${conversationText}\n---\n\nCreate a visual slide presentation with Mermaid diagrams that explains the key topics from this document and conversation. Return ONLY a valid JSON array.`,
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
        diagram: sanitizeMermaidDiagram(String(s.diagram)),
        explanation: String(s.explanation).slice(0, 500),
      }));
  } catch (parseErr) {
    console.error('Failed to parse slide JSON:', parseErr.message, '\nRaw:', raw.slice(0, 500));
    throw new Error('Failed to generate slides. Please try again.');
  }
}

module.exports = { chat, analyzeDocument, generateSlides };
