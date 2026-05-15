/**
 * Local Ollama HTTP client (POST /api/chat).
 * @see docs/ollama-api.md
 *
 * Logging: set OLLAMA_LOG=off | summary (default) | full
 * - summary: URL, model, options, per-message role + length + text preview
 * - full: entire message bodies and model response (very large for quiz prompts)
 *
 * Timeouts: OLLAMA_TIMEOUT_MS (default 900000 = 15 min). Cold load + large prompts can exceed 2 minutes.
 * Optional requestTimeoutMs on ollamaChat() overrides one call (capped at 1 hour).
 */

const DEFAULT_HOST = 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'llama3.2:latest';
const PREVIEW_CHARS = Number(process.env.OLLAMA_LOG_PREVIEW_CHARS) || 2500;
/** Default wait for Ollama /api/chat (ms). */
const DEFAULT_TIMEOUT_MS = 900000;

function getOllamaBaseUrl() {
  const raw = (
    process.env.OLLAMA_HOST ||
    process.env.OLLAMA_BASE_URL ||
    DEFAULT_HOST
  ).trim();
  return raw.replace(/\/$/, '');
}

function getOllamaModel() {
  return (process.env.OLLAMA_MODEL || DEFAULT_MODEL).trim();
}

function isLlmConfigured() {
  const disabled = process.env.OLLAMA_DISABLED;
  if (disabled === '1' || String(disabled).toLowerCase() === 'true') {
    return false;
  }
  return true;
}

/**
 * @param {number} [overrideMs] per-request override from ollamaChat()
 * @returns {number}
 */
function resolveTimeoutMs(overrideMs) {
  if (typeof overrideMs === 'number' && Number.isFinite(overrideMs) && overrideMs > 0) {
    return Math.min(Math.floor(overrideMs), 3_600_000); // cap 1 hour
  }
  const n = Number(process.env.OLLAMA_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 3_600_000) : DEFAULT_TIMEOUT_MS;
}

function createFetchSignal(overrideMs) {
  const ms = resolveTimeoutMs(overrideMs);
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

/**
 * @returns {'off' | 'summary' | 'full'}
 */
function getOllamaLogMode() {
  const v = (process.env.OLLAMA_LOG || 'summary').toLowerCase();
  if (v === 'off' || v === '0' || v === 'false' || v === 'no') return 'off';
  if (v === 'full' || v === 'debug' || v === 'verbose') return 'full';
  return 'summary';
}

function previewText(text, limit, fullMode) {
  if (fullMode) return text;
  if (!text || text.length <= limit) return text;
  return `${text.slice(0, limit)}…(+${text.length - limit} chars)`;
}

function logOllamaLine(payload) {
  console.info(`[Ollama] ${JSON.stringify(payload)}`);
}

/**
 * @param {object} params
 * @param {Array<{ role: string, content: string }>} params.messages
 * @param {number} [params.temperature]
 * @param {number} [params.num_predict] max new tokens
 * @param {number} [params.requestTimeoutMs] override socket wait (see resolveTimeoutMs)
 * @returns {Promise<{ content: string, model?: string }>}
 */
async function ollamaChat({
  messages,
  temperature = 0.7,
  num_predict = 4096,
  logContext = 'ollama.chat',
  requestTimeoutMs,
}) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Ollama: messages must be a non-empty array');
  }
  const url = `${getOllamaBaseUrl()}/api/chat`;
  const body = {
    model: getOllamaModel(),
    messages,
    stream: false,
    options: {
      temperature,
      num_predict,
    },
  };

  const mode = getOllamaLogMode();
  const fullMode = mode === 'full';
  const started = Date.now();
  const timeoutMs = resolveTimeoutMs(requestTimeoutMs);

  if (mode !== 'off') {
    logOllamaLine({
      event: 'request',
      context: logContext,
      url,
      timeoutMs,
      model: body.model,
      options: body.options,
      messageCount: messages.length,
      messages: messages.map((m, i) => ({
        index: i,
        role: m.role,
        contentChars: m.content.length,
        content: previewText(m.content, PREVIEW_CHARS, fullMode),
      })),
    });
  }

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: createFetchSignal(requestTimeoutMs),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (mode !== 'off') {
      logOllamaLine({
        event: 'fetch_error',
        context: logContext,
        url,
        timeoutMs,
        ms: Date.now() - started,
        error: msg,
      });
    }
    const hint = /abort|timeout/i.test(msg)
      ? ` (effective timeout ${timeoutMs}ms — raise OLLAMA_TIMEOUT_MS or pass requestTimeoutMs for long runs.)`
      : '';
    throw new Error(
      `Cannot reach Ollama at ${url}. Is Ollama running? (${msg})${hint}`
    );
  }

  const text = await res.text();
  if (!res.ok) {
    if (mode !== 'off') {
      logOllamaLine({
        event: 'http_error',
        context: logContext,
        url,
        status: res.status,
        ms: Date.now() - started,
        bodyPreview: text.slice(0, 600),
      });
    }
    throw new Error(
      `Ollama request failed (${res.status}): ${text.slice(0, 400)}`
    );
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    if (mode !== 'off') {
      logOllamaLine({
        event: 'parse_error',
        context: logContext,
        ms: Date.now() - started,
        bodyPreview: text.slice(0, 400),
      });
    }
    throw new Error('Ollama returned non-JSON response');
  }

  const content = data?.message?.content;
  if (!content || typeof content !== 'string') {
    if (mode !== 'off') {
      logOllamaLine({
        event: 'missing_content',
        context: logContext,
        ms: Date.now() - started,
        keys: data && typeof data === 'object' ? Object.keys(data) : [],
      });
    }
    throw new Error('Ollama response missing message.content');
  }

  if (mode !== 'off') {
    logOllamaLine({
      event: 'response',
      context: logContext,
      ms: Date.now() - started,
      model: data.model,
      responseChars: content.length,
      response: previewText(content, PREVIEW_CHARS, fullMode),
    });
  }

  return { content, model: data.model };
}

module.exports = {
  ollamaChat,
  getOllamaBaseUrl,
  getOllamaModel,
  isLlmConfigured,
  getOllamaLogMode,
  resolveTimeoutMs,
};
