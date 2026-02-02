import { htmlToMarkdown } from './htmlToMarkdown.js';
import { markdownToHtml } from './markdownToHtml.js';
import { containsTable } from './htmlSanitizer.js';
import { readFromPaste, writeHtmlToClipboard, writeTextToClipboard } from './clipboard.js';

const inputEl = document.getElementById('input');
const outputEl = document.getElementById('output');
const outputPreviewEl = document.getElementById('output-preview');
const outputPreviewContentEl = document.getElementById('output-preview-content');
const outputLabelEl = document.getElementById('output-label');
const toMarkdownBtn = document.getElementById('to-markdown');
const toWordBtn = document.getElementById('to-word');
const copyOutputBtn = document.getElementById('copy-output');
const clearInputBtn = document.getElementById('clear-input');
const toastEl = document.getElementById('toast');
const warningsEl = document.getElementById('warnings');

// Store the last pasted HTML so the "Word → Markdown" button can use it
// even though the textarea only shows plain text.
let lastPastedHtml = null;

// Store the last generated HTML for the copy button in preview mode
let lastGeneratedHtml = null;

// --- Output mode switching ---

function showTextOutput(text) {
  lastGeneratedHtml = null;
  outputEl.value = text;
  outputEl.classList.remove('hidden');
  outputPreviewEl.classList.add('hidden');
  outputLabelEl.textContent = 'Output';
}

function showPreviewOutput(html) {
  lastGeneratedHtml = html;
  outputEl.classList.add('hidden');
  outputPreviewContentEl.innerHTML = html;
  outputPreviewEl.classList.remove('hidden');
  outputLabelEl.textContent = 'Preview';
}

function clearOutput() {
  lastGeneratedHtml = null;
  outputEl.value = '';
  outputEl.classList.remove('hidden');
  outputPreviewContentEl.innerHTML = '';
  outputPreviewEl.classList.add('hidden');
  outputLabelEl.textContent = 'Output';
}

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
      showTextOutput(result.markdown);
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
      showTextOutput(result.markdown);
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
      showTextOutput(result.markdown);
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
  showPreviewOutput(html);
  if (success) {
    showToast('Table copied! Paste into Word with Ctrl+V.');
  } else {
    showToast('Could not auto-copy. Use the Copy button, then paste into Word.', 'error');
  }
});

// --- Copy output ---

copyOutputBtn.addEventListener('click', async () => {
  // If in preview mode, copy the HTML to clipboard for Word pasting
  if (lastGeneratedHtml) {
    const success = await writeHtmlToClipboard(lastGeneratedHtml, '');
    if (success) {
      showToast('Table copied! Paste into Word with Ctrl+V.');
    } else {
      showToast('Could not copy to clipboard', 'error');
    }
    return;
  }

  // Otherwise copy the text content (Markdown)
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
  clearOutput();
  lastPastedHtml = null;
  showWarnings([]);
});
