# DocToData

A local-first, OpenCode-inspired workspace for extracting structured, source-linked data from documents. Python backend, dependency-free browser UI.

## Run

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python server.py
```

Open **http://localhost:8000**. Create a workspace, add documents, and start a session. Existing installations are migrated into Personal workspace without discarding saved extractions.

```
cd /Users/i.a.chesnokov-posadskii/Desktop/DocToData
.venv/bin/python server.py
```

## Workflow

1. Upload PDF, DOCX, XLSX, XLS, CSV, or TXT files (25 MB each).
2. Open **Model providers**. Choose Ollama, OpenAI, or DeepSeek and enter a tool-capable model name. For Ollama, start the local server and install a tool-capable model; **Find installed models** discovers available names. For cloud providers, add an API key or set `OPENAI_API_KEY` / `DEEPSEEK_API_KEY` before starting the server.
3. Select documents and describe your desired fields. Use ⌘/Ctrl + Enter to run.
4. Inspect activity, review references, and export CSV or JSON. Requests, results, activity, and failures persist in the selected session.

## Implementation

- PDF text extraction via pypdf, Word via python-docx, Excel via openpyxl/xlrd.
- Source-addressable chunks retain PDF pages, Word paragraphs/table rows, or spreadsheet sheet/row locations.
- Local lexical RAG uses IDF-weighted keyword ranking. It does not require an embedding model or vector database.
- Up to 10 agent iterations, with `search_documents`, `read_document`, and `submit_extraction` tools.
- Ollama native `/api/chat`; OpenAI and DeepSeek Chat Completions tool calling. DeepSeek response messages, including reasoning fields, are preserved between tool turns.
- Output validation checks table dimensions and a separate citation list for every non-null cell against passages actually exposed to the agent. This validates citation existence, not semantic correctness; inspect references for important data.
- SQLite stores parsed text, completed runs, and settings in `.data/workspace.db`. Keys are kept on the server and not returned to the browser. The database is local plaintext, not an encrypted credential vault.
- The server binds only to `127.0.0.1`. This is a personal local app, not a multi-user or publicly deployable service. Browser mutations require same-origin JSON requests.

## Limits

Scanned/image-only PDFs need OCR first. Word header/footer text and embedded images are not extracted. Spreadsheet formulas use cached values, so save workbooks in Excel first if caches are missing. Very large documents may exceed model context limits; narrow the selected documents or prompt. A provider's tool-calling quality affects extraction quality. Stop requests take effect after an in-flight provider call returns or times out. Ollama requests use a 600-second socket timeout; other providers use 120 seconds. Requests, completed results, activity, and failures are stored in SQLite. In-flight jobs are marked interrupted after a server restart.

Selected source passages are sent to the chosen provider on each run. Ollama stays local if its configured URL is local; OpenAI and DeepSeek process these passages in the cloud. Google Fonts is used for optional typography, with system-font fallback.

Set `PORT` to change the default port, or `DOCTODATA_HOME` to change the data directory. Set `DOCTODATA_OLLAMA_TIMEOUT` to override the Ollama request timeout in seconds (default: 600), or `DOCTODATA_PROVIDER_TIMEOUT` for other providers (default: 120). Values must be positive, finite numbers. Restart the server after changing these settings. These are socket timeouts, not total extraction deadlines; a run can make multiple model requests.

For example, allow Ollama 15 minutes when waiting for a response:

```sh
DOCTODATA_OLLAMA_TIMEOUT=900 .venv/bin/python server.py
```

## Tests

```sh
.venv/bin/python -m unittest discover -s tests -v
```

The tests use simulated provider responses; live model access requires your local Ollama installation or an API key.

## PDF source viewer

PDF uploads now retain the original bytes locally. Clicking a row's source badge or **View original source** opens a rendered original page with coordinate-based boxes, page navigation, zoom, and a link to the original PDF. Exact extracted values are highlighted only where they overlap the cited passage; when exact values cannot be found, the viewer explicitly labels passage-level highlights. If text cannot be located reliably, no box is drawn. The renderer handles page rotation.

For PDFs uploaded before original-file storage was added, click **Attach original PDF** in the source viewer. The server verifies that its parsed chunks match the indexed document before attaching it, preserving existing extraction IDs and references. Source PDFs remain local; rendering does not call an AI provider.

PDF rendering uses PyMuPDF (AGPL/commercial licensing); review its license before distributing this application.


## Workspaces, sessions, and evidence

- The left explorer creates, chooses, and deletes workspaces. Deleted workspaces can be restored from Manage workspaces.
- Documents belong to a workspace and are shared across its sessions. Runs reject document IDs from another workspace.
- Sessions contain multiple requests and results. Recent completed turns are supplied as context when their documents remain selected. Session names can be edited.
- The center shows chat, provider controls, tool activity, and table/JSON/source output. Green checks mean completed steps, blue animated circles mean running steps, and red crosses mean failures or tool corrections.
- Each populated cell in new results must provide `cell_references`, aligned with the `values` array. Clicking a cell opens its supporting source in the right-hand evidence panel. Null cells are explicitly missing values and do not invent citations.
- Existing results retain their original row-level sources and display a legacy notice. Rerun an extraction to get precise cell-level citations.
- PDFs render original pages with coordinate-based highlights. DOCX and Excel evidence opens the indexed paragraph/table row/sheet row, with matching text highlighted. On narrow screens the evidence panel opens as a drawer.
- Removing a document hides it from future selections, while preserving saved evidence for prior sessions.

Before the workspace migration, a SQLite backup was saved under `.data/before-workspaces-*.db`.

### Provider list and custom connections

Open **Model providers** to choose Ollama (local), DeepSeek, Qwen, ChatGPT / OpenAI compatible API, or Claude. Each entry keeps its own model, API base URL, API format, and key. Choose **Add custom provider** to save additional connections, including multiple servers using the same API format. **Save and use provider** saves the selected entry and makes it active. Other unsaved edits are discarded when the dialog closes.

Base URLs exclude the final request path: the app adds `/chat/completions`, `/messages`, or `/api/chat` according to the API format. For Qwen, use the URL for your workspace and region ([Alibaba documentation](https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope)). Claude uses the native Messages API and tool calling ([Anthropic documentation](https://platform.claude.com/docs/en/api/messages/create)). Models must support tool calling. Cloud services require API credentials; custom servers can omit a key if they do not require authentication.

Provider profiles, keys, and sessions persist in the local SQLite database under `.data/` (or `DOCTODATA_HOME`). Existing provider settings migrate automatically when loaded and are written in the new format on the next save. Keys remain plaintext in that local database; the settings API returns only whether a key is configured. Blank key fields preserve saved keys; **Remove stored API key** clears the database value. Environment credentials still apply: `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `DASHSCOPE_API_KEY`, and `ANTHROPIC_API_KEY`. Selected source passages are sent to the chosen endpoint during extraction.

Model discovery loads automatically for saved connections and shortly after entering a key. Use **Fetch available models** to refresh, then choose from **Available models** and click **Save and use provider**. Discovery uses the draft connection without saving it or changing the active provider. OpenAI-compatible endpoints (including [DeepSeek](https://api-docs.deepseek.com/api/list-models/)) use `/models`; Claude uses its paginated Models API; Ollama lists installed models. Manual entry remains available for endpoints without discovery. Returned models are not guaranteed to support extraction tools. If you change a connection's base URL, re-enter its key before fetching models from the new address.

Session actions are available from the three-dot button beside each session in the left panel: **Pin / Unpin**, **Rename**, and **Delete**. Pinned sessions stay above other sessions and persist in the local database. The chat header's right-hand button expands or collapses the evidence viewer. Existing databases receive an additive `sessions.pinned` column with existing sessions unpinned.
