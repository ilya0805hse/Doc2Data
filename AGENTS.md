# Repository Guidelines

## Project Structure & Module Organization

DocToData is a local-first document extraction app with a Python backend and dependency-free browser UI.

- `server.py`: HTTP server, document parsing, retrieval, provider integration, and extraction jobs.
- `workspace_store.py`: SQLite workspace/session storage, migration, and validation.
- `pdf_sources.py`: original PDF rendering and source highlights.
- `static/`: `index.html`, `app.js`, and `style.css` for the browser interface.
- `tests/`: core extraction, workspace, and PDF source tests.
- Root-level JPGs are UI reference screenshots. `.data/` holds private runtime data.

## Build, Test, and Development Commands

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python server.py
```

These commands create the environment, install dependencies, and serve the app at `http://localhost:8000`. There is no separate frontend build step. Use `PORT` to change the port and `DOCTODATA_HOME` to select another data directory.

Run the suite with an isolated data directory, because importing `server` initializes and migrates its database:

```sh
DOCTODATA_HOME="$(mktemp -d)" .venv/bin/python -m unittest discover -s tests -v
```

## Coding Style & Naming Conventions

Use four-space Python indentation, `snake_case` functions and variables, `PascalCase` classes, and uppercase constants. Follow nearby JavaScript naming and formatting; use `camelCase` for new functions and variables. Keep the UI dependency-free unless a change specifically requires otherwise. No formatter or linter is configured; keep edits focused and avoid unrelated reformatting.

## Testing Guidelines

Tests use standard-library `unittest` and mocked provider responses; routine tests should not require API keys or live models. Name files `test_*.py` and methods `test_*`. Add regression coverage for parsing, citation validation, workspace isolation, migrations, and PDF highlighting when changing those behaviors. Use temporary databases and generated document fixtures. No coverage threshold is configured. For UI changes, manually check desktop and narrow-screen layouts and the affected extraction/evidence flow.

## Commit & Pull Request Guidelines

This checkout has no Git history, so no established commit convention can be verified. Use concise, imperative subjects such as `Fix PDF highlight alignment`. PRs should describe the behavior change, relevant issues, and validation performed; include screenshots for UI changes and migration implications for storage changes.

## Security & Configuration

Never commit `.data/`, `.env`, credentials, or private documents. SQLite stores settings and keys in plaintext. Preserve localhost binding, same-origin mutation checks, and workspace boundaries. Selected source passages reach the configured model provider; keep test fixtures synthetic.
