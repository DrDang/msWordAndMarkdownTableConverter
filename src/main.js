import { htmlToMarkdown } from './htmlToMarkdown.js';
import { markdownToHtml } from './markdownToHtml.js';
import { containsTable } from './htmlSanitizer.js';
import { readFromPaste, writeHtmlToClipboard, writeTextToClipboard } from './clipboard.js';

const inputEl = document.getElementById('input');
const outputEl = document.getElementById('output');
const toMarkdownBtn = document.getElementById('to-markdown');
const toWordBtn = document.getElementById('to-word');
const copyOutputBtn = document.getElementById('copy-output');
const clearInputBtn = document.getElementById('clear-input');
const toastEl = document.getElementById('toast');
const warningsEl = document.getElementById('warnings');

// Store the last pasted HTML so the "Word → Markdown" button can use it
// even though the textarea only shows plain text.
let lastPastedHtml = null;

// --- Toast ---

let toastTimeout = null;

function showToast(message, type = 'success') {
  toastEl.textContent = message;
  toastEl.className = `toast ${type}`;
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 3000);
}

function showWarnings(warnings) {
  if (!warnings || warnings.length === 0) {
    warningsEl.classList.add('hidden');
    warningsEl.textContent = '';
    return;
  }
  warningsEl.textContent = warnings.join(' ');
  warningsEl.classList.remove('hidden');
}

// --- Paste handler ---

inputEl.addEventListener('paste', (e) => {
  const { html, plainText } = readFromPaste(e);

  if (html && containsTable(html)) {
    // Word table paste detected — store HTML and auto-convert
    e.preventDefault();
    lastPastedHtml = html;

    // Show a plain-text summary in the input textarea
    const result = htmlToMarkdown(html);
    if (result) {
      inputEl.value = '[Pasted Word table]';
      outputEl.value = result.markdown;
      showWarnings(result.warnings);
      showToast('Word table converted to Markdown');
    } else {
      inputEl.value = plainText || '';
      showToast('Could not parse table from pasted content', 'error');
    }
  } else {
    // Regular text paste — clear stored HTML
    lastPastedHtml = null;
    showWarnings([]);
  }
});

// --- Word → Markdown ---

toMarkdownBtn.addEventListener('click', () => {
  showWarnings([]);

  if (lastPastedHtml) {
    // Use the stored HTML from the last Word paste
    const result = htmlToMarkdown(lastPastedHtml);
    if (result) {
      outputEl.value = result.markdown;
      showWarnings(result.warnings);
      showToast('Converted to Markdown');
    } else {
      showToast('Could not parse table from pasted HTML', 'error');
    }
    return;
  }

  // No stored HTML — try treating the input as HTML (maybe pasted from source)
  const text = inputEl.value.trim();
  if (!text) {
    showToast('Input is empty. Paste a Word table first.', 'error');
    return;
  }

  if (containsTable(text)) {
    const result = htmlToMarkdown(text);
    if (result) {
      outputEl.value = result.markdown;
      showWarnings(result.warnings);
      showToast('Converted to Markdown');
      return;
    }
  }

  showToast('No table found. Paste a table from Word.', 'error');
});

// --- Markdown → Word ---

toWordBtn.addEventListener('click', async () => {
  showWarnings([]);

  const text = inputEl.value.trim();
  if (!text) {
    showToast('Input is empty. Enter a Markdown table.', 'error');
    return;
  }

  const html = markdownToHtml(text);
  if (!html) {
    showToast('Could not parse a valid Markdown table from input.', 'error');
    return;
  }

  const success = await writeHtmlToClipboard(html, text);
  if (success) {
    outputEl.value = html;
    showToast('Table copied! Paste into Word with Ctrl+V.');
  } else {
    outputEl.value = html;
    showToast('Could not copy to clipboard. You can manually copy the HTML from the output.', 'error');
  }
});

// --- Copy output ---

copyOutputBtn.addEventListener('click', async () => {
  const text = outputEl.value.trim();
  if (!text) {
    showToast('Nothing to copy.', 'error');
    return;
  }

  const success = await writeTextToClipboard(text);
  if (success) {
    showToast('Output copied to clipboard');
  } else {
    showToast('Could not copy to clipboard', 'error');
  }
});

// --- Clear input ---

clearInputBtn.addEventListener('click', () => {
  inputEl.value = '';
  outputEl.value = '';
  lastPastedHtml = null;
  showWarnings([]);
});
