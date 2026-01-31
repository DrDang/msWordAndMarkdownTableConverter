# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A bidirectional converter between MS Word table format and Markdown table format. Users paste Word tables to get Markdown output (for use with LLMs), then convert modified Markdown tables back into a format pasteable into MS Word. The tool must maintain table integrity through round-trip conversions.

See [mission.md](mission.md) for the full project goals and example workflow.

## Commands

- `npm run dev` — Start Vite dev server with hot reload
- `npm run build` — Production build to `dist/`
- `npm run preview` — Preview production build
- `npm test` — Run all tests once (vitest)
- `npm run test:watch` — Run tests in watch mode

## Architecture

Vite + vanilla JS, zero runtime dependencies. Tests use vitest with jsdom environment.

All conversion passes through an intermediate **table model** (`src/tableModel.js`):
```
{ alignments: string[], rows: [{ isHeader: bool, cells: [{ content, colspan, rowspan }] }] }
```

### Conversion flows

**Word → Markdown:** Paste event captures `text/html` → `htmlSanitizer.js` strips Word junk (mso-* styles, `<o:p>` tags, etc.) → `htmlToMarkdown.js` walks the clean `<table>` DOM into the table model → generates padded Markdown string.

**Markdown → Word:** `markdownToHtml.js` parses Markdown lines, splits on `|`, detects alignments → builds table model → generates HTML `<table>` with inline border/alignment styles (Word needs these) → `clipboard.js` writes both `text/html` and `text/plain` MIME types via ClipboardItem API (with legacy fallback for Firefox).

### Key files

- `src/tableModel.js` — Intermediate representation; foundation for round-trip fidelity
- `src/htmlSanitizer.js` — Strips Word-specific HTML noise to clean `<table>` DOM
- `src/htmlToMarkdown.js` — HTML table → model → Markdown string
- `src/markdownToHtml.js` — Markdown string → model → HTML table with inline styles
- `src/clipboard.js` — Clipboard read (paste event) and write (ClipboardItem + fallback)
- `src/main.js` — UI wiring, paste listener, button handlers, toast notifications
