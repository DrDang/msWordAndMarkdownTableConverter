# Word <-> Markdown Table Converter

A simple browser tool for converting tables between Microsoft Word and Markdown format. Paste a Word table to get Markdown, or paste Markdown to get a Word-compatible table back.

## Why?

LLMs work well with Markdown tables but can't handle Word formatting directly. This tool bridges the gap:

1. Copy a table from Word
2. Paste it here to get Markdown
3. Send the Markdown to an LLM for analysis or editing
4. Paste the LLM's modified Markdown back into this tool
5. Click one button to copy a Word-compatible table to your clipboard
6. Paste back into Word

Tables stay intact through the round trip.

## Setup

Requires [Node.js](https://nodejs.org/) (v18 or later).

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

## Usage

### Word to Markdown

1. In Microsoft Word, select and copy a table (Ctrl+C / Cmd+C)
2. Click in the **Input** panel and paste (Ctrl+V / Cmd+V)
3. The Markdown table appears automatically in the **Output** panel
4. Click **Copy** on the output panel to copy the Markdown

### Markdown to Word

1. Paste or type a Markdown table in the **Input** panel
2. Click **Markdown -> Word (Copy)**
3. The HTML table is copied to your clipboard
4. In Word, paste with Ctrl+V / Cmd+V — the table renders with borders and formatting

## Notes

- **Merged cells**: Colspan/rowspan are expanded into separate cells since Markdown doesn't support merges. A warning is shown when this happens.
- **Alignment**: Column alignment (left, center, right) is preserved in both directions.
- **Formatting**: Bold/italic inside cells is not preserved — only text content is converted.
- **Multiple tables**: If you paste content with multiple tables, only the first one is converted.

## Building for Production

```bash
npm run build
```

The output in `dist/` can be served by any static file server.
