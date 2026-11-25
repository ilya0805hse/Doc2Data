# DocToData

A local-first, OpenCode-inspired workspace for extracting structured, source-linked data from documents. Python backend, dependency-free browser UI.

## Run

On macOS, double-click **Open DocToData.command** (or its desktop shortcut). It opens Terminal, creates `.venv` if needed, checks package versions and imports, installs missing Python requirements, checks Tesseract and the configured OCR languages, starts the server, and opens your default browser once it is ready. With Homebrew available, missing Python/Tesseract/language packs are installed automatically. First-time installation requires internet access. Without Homebrew, missing optional OCR is reported; missing Python requires installing Python first.

Keep the Terminal window open while using the app; press **Control+C** to stop it. Opening the shortcut again reuses an already-running DocToData server. Model-provider configuration and model downloads remain separate. For a dependency check without starting the app, run `./"Open DocToData.command" --check-only`.

Manual startup:

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
2. Open **Model providers**. Choose a provider and use **Fetch models** to find and select a tool-capable model. For Ollama, start the local server and install the model first. For cloud providers, add an API key or set `OPENAI_API_KEY` / `DEEPSEEK_API_KEY` before starting the server.
3. Select documents and describe your desired fields. Use ⌘/Ctrl + Enter to run. If the run can send text or images to a non-loopback provider, confirm the listed destinations above the composer before it starts.
4. Inspect activity, review references, and export CSV or JSON. Requests, results, activity, and failures persist in the selected session.

## Implementation

- PDF text extraction via pypdf, Word via python-docx, Excel via openpyxl/xlrd.
- Source-addressable chunks retain PDF pages, Word paragraphs/table rows, or spreadsheet sheet/row locations.
- Local lexical RAG uses IDF-weighted keyword ranking. It does not require an embedding model or vector database.
- Extraction runs are limited to 50 iterations or 10 minutes, with `search_documents`, `read_document`, `list_visuals`, `inspect_visual`, and `submit_extraction` tools.
- Ollama native `/api/chat`; OpenAI and DeepSeek Chat Completions tool calling. DeepSeek response messages, including reasoning fields, are preserved between tool turns.
- Output validation checks table dimensions and a separate citation list for every non-null cell against passages actually exposed to the agent. This validates citation existence, not semantic correctness; inspect references for important data.
- SQLite stores parsed text, completed runs, and settings in `.data/workspace.db`. Keys are kept on the server and not returned to the browser. The database is local plaintext, not an encrypted credential vault.
- The server binds only to `127.0.0.1`. This is a personal local app, not a multi-user or publicly deployable service. Browser mutations require same-origin JSON requests.

## Limits

Scanned PDFs and embedded Word pictures are indexed with optional local OCR and retained for visual inspection. Word header/footer text is not indexed as ordinary text; embedded pictures in those parts are retained. Native Word charts, SmartArt, and unsupported image formats may require export to PDF; processing warnings identify these cases. Spreadsheet formulas use cached values, so save workbooks in Excel first if caches are missing. Very large documents may exceed model context limits; narrow the selected documents or prompt. A provider's tool-calling quality affects extraction quality. Stop requests take effect after an in-flight provider call returns or times out. Ollama requests use a 600-second socket timeout; other providers use 120 seconds. Requests, completed results, activity, and failures are stored in SQLite. In-flight jobs are marked interrupted after a server restart.

Selected source passages are sent to the chosen provider on each run. Ollama stays local if its configured URL is local; OpenAI and DeepSeek process these passages in the cloud. Google Fonts is used for optional typography, with system-font fallback.

Set `PORT` to change the default port, or `DOCTODATA_HOME` to change the data directory. Set `DOCTODATA_OLLAMA_TIMEOUT` to override the Ollama request timeout in seconds (default: 600), or `DOCTODATA_PROVIDER_TIMEOUT` for other providers (default: 120). Values must be positive, finite numbers. Restart the server after changing these settings. Each request uses the configured socket timeout or the remaining time in the 10-minute run budget, whichever is shorter.

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

Use **Fetch models** after configuring the connection. Choose from **Available models** or select **+ Add new model** to enter a name, then click **Save and use provider**. Text and vision share fetched lists for the same connection while the dialog is open. Discovery uses the draft connection without saving it or changing the active provider. OpenAI-compatible endpoints (including [DeepSeek](https://api-docs.deepseek.com/api/list-models/)) use `/models`; Claude uses its paginated Models API; Ollama lists installed models. Manual entry remains available for endpoints without discovery. Returned models are not guaranteed to support extraction tools. If you change a connection's base URL, re-enter its key before fetching models from the new address.

Session actions are available from the three-dot button beside each session in the left panel: **Pin / Unpin**, **Rename**, and **Delete**. Pinned sessions stay above other sessions and persist in the local database. The chat header's right-hand button expands or collapses the evidence viewer. Existing databases receive an additive `sessions.pinned` column with existing sessions unpinned.


## OCR and visual understanding

Uploads process in the background, with progress displayed in the document panel. Native text is preserved. Original PDFs, DOCX files, and PNG/JPEG images are retained. Visual locations are indexed without retaining rendered images; pages (including vector charts) and embedded pictures are rendered on demand. Pages with no native text or substantial raster-image coverage, Word pictures, and standalone images receive local OCR. OCR renders are transient. Missing OCR dependencies/languages or unreadable pictures produce visible document warnings instead of silently discarding content. OCR does not run on every text-only page.

Install Tesseract separately from Python dependencies. On macOS with Homebrew:

```sh
brew install tesseract tesseract-lang
```

On Debian/Ubuntu, install `tesseract-ocr` and the needed language packages, such as `tesseract-ocr-eng` and `tesseract-ocr-rus`. Tesseract must be on the server's PATH. Model providers → **OCR and visual understanding** shows installed languages. Set `eng+rus` for English and Russian, or other installed codes joined by `+`. This is explicit language selection, not automatic language detection. Settings apply to new uploads. Re-upload documents indexed before this feature to add OCR/visual sources.

In the same settings, select a **Vision provider** and enter an image-capable **Vision model**. It uses that provider profile's saved URL and key independently of the main extraction model. The main model still needs tool calling. Ollama, OpenAI-compatible image chat, and Anthropic image messages are supported; not every model or compatible endpoint accepts images. Vision is disabled until configured. You can save a custom provider connection, then select your main extraction provider and choose the custom connection for vision.

During extraction, the main model lists page/image locations and asks targeted questions through `inspect_visual`. Original images and nearby source text go to the selected vision provider at this point; uploads never call cloud models. Vision results contain typed observations: exact, estimated, description, or missing. The main model is instructed to preserve estimates and use null for missing values. These labels describe model output, not verified accuracy. Review evidence for important values.

OCR citations display the retained image with measured OCR word boxes. Vision citations display the image, question, model, and observations without invented highlight coordinates. Answers are cached locally by image, provider endpoint, model, and exact question; cached observations also become searchable in subsequent runs. Initial image discovery uses page locations and surrounding native text/OCR; images are not automatically captioned by a cloud provider at upload.

Limits: 5,000 PDF pages or visual sources, 25 megapixels per embedded image, 90 seconds per OCR image, two concurrent uploads, and 30 visual inspections per extraction. Large pages are rendered to at most 2,200 pixels on their longest side. Split large documents or use a higher-quality crop when fine labels are unreadable. OCR may duplicate native text on mixed pages; the source type distinguishes them. External linked DOCX pictures are never fetched.

The SQLite migration adds document warnings and `visual_assets`, `visual_locations`, `visual_cache`, and `uploads` tables. Existing document chunks and extraction citations remain unchanged. These tables contain private source images/text; keep the database private. Completed uploads are atomic; failed uploads do not leave partially indexed documents. Uploads interrupted by a server restart are marked failed and can be uploaded again.

### Per-request processing modes

The prompt bar offers **Auto**, **Text only**, and **Manual visuals**. Auto lets the extraction agent inspect relevant visual sources. Text only uses native text and OCR, excludes cached vision observations and prior answer context, and blocks vision tools on the server. Manual visuals opens a picker for selected documents: scroll continuously through pages/images, check whole pages or switch to Select region and draw rectangles, then click Done. Regions save on release. Use the page-number field to jump; selection chips return to their pages. Document tabs switch between files. Nearby previews load on demand and distant images are released from memory. Every selected visual is inspected before extraction; no additional visual calls are allowed. Include titles, legends, and units when cropping. A configured vision provider is required for manual mode.

Selections are scoped to the current session draft and selected documents (up to 30 per request). Crop coordinates follow the displayed page orientation and are retained with evidence; vision citations reopen the actual crop. Cache keys include the region. Existing uploads and citations remain usable; newly uploaded documents use lazy visual locations. No cloud calls occur during upload. OCR still runs during background upload processing, so large scans may take time before they become available.
