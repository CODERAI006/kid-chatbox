# Using Ollama from your own API

Ollama exposes a **local HTTP API** on **`http://localhost:11434`** (default). Call it from your **backend** (Node, Python, .NET, etc.). The browser cannot usually call it directly unless you add CORS or proxy through your server.

---

## Base URL

| Environment | URL |
|-------------|-----|
| Local default | `http://localhost:11434` |
| Loopback (same machine) | `http://127.0.0.1:11434` |

Use an environment variable in production, e.g. `OLLAMA_HOST=http://127.0.0.1:11434`, so you can point at another host later.

---

## 1. Chat-style API (typical for apps)

**Endpoint:** `POST /api/chat`

**Request body (JSON):**

```json
{
  "model": "llama3.2:latest",
  "messages": [
    { "role": "user", "content": "Explain APIs in one sentence." }
  ],
  "stream": false
}
```

**Response (simplified):** includes a `message` object with `role` and `content`, plus fields like `done`, `model`, etc.

---

## 2. Simple completion

**Endpoint:** `POST /api/generate`

**Request body (JSON):**

```json
{
  "model": "llama3.2:latest",
  "prompt": "Hello,",
  "stream": false
}
```

---

## 3. Examples

### curl (chat)

```bash
curl http://localhost:11434/api/chat -d "{\"model\":\"llama3.2:latest\",\"messages\":[{\"role\":\"user\",\"content\":\"Hi!\"}],\"stream\":false}"
```

### Node.js (fetch)

```javascript
const res = await fetch("http://localhost:11434/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "llama3.2:latest",
    messages: [{ role: "user", content: "Hi!" }],
    stream: false,
  }),
});
const data = await res.json();
console.log(data.message.content);
```

### Python (requests)

```python
import requests

r = requests.post(
    "http://localhost:11434/api/chat",
    json={
        "model": "llama3.2:latest",
        "messages": [{"role": "user", "content": "Hi!"}],
        "stream": False,
    },
    timeout=120,
)
r.raise_for_status()
print(r.json()["message"]["content"])
```

---

## 4. Wrapping Ollama in your own API

Recommended pattern:

1. **Client** → your `POST /api/ask` (or similar), with auth, rate limits, and logging.
2. **Your server** → `POST http://localhost:11434/api/chat` (or `/api/generate`).
3. **Response** → return only the text or a small JSON shape to the client.

This keeps Ollama off the public internet and avoids browser CORS issues.

---

## 5. Streaming

Set `"stream": true` in the request. The response body is **newline-delimited JSON**: each line is one JSON object; the last object has `"done": true`. Your HTTP client must read the stream incrementally (not a single `json()` parse on the whole body unless you buffer).

---

## 6. Embeddings (RAG)

Use **`POST /api/embed`** with a `model` and `input` (string or list of strings). Exact field names can vary slightly by Ollama version; see the official API reference below.

---

## 7. Quick sanity check

From a terminal (replace model if needed):

```bash
ollama run llama3.2:latest "Say hello in one sentence."
```

If that works, the daemon and model are fine; your API only needs to hit the same host/port.

---

## Official reference

- [Ollama REST API documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)

---

## Summary

| Use case | Endpoint | Key fields |
|----------|----------|------------|
| Chat / assistants | `POST /api/chat` | `model`, `messages`, `stream` |
| Single prompt completion | `POST /api/generate` | `model`, `prompt`, `stream` |
| Embeddings | `POST /api/embed` | `model`, `input` |

For most app integrations, start with **`POST /api/chat`**, **`stream: false`**, until you need streaming UX.
