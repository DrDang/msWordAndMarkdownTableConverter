/**
 * Clipboard read/write utilities.
 * Handles browser API differences and provides fallbacks.
 */

/**
 * Extract HTML and plain text from a paste event.
 * @param {ClipboardEvent} pasteEvent
 * @returns {{ html: string|null, plainText: string|null }}
 */
export function readFromPaste(pasteEvent) {
  const cd = pasteEvent.clipboardData;
  if (!cd) return { html: null, plainText: null };

  const html = cd.getData('text/html') || null;
  const plainText = cd.getData('text/plain') || null;

  return { html, plainText };
}

/**
 * Write HTML content to the clipboard so it can be pasted into Word.
 * Also writes a plain-text fallback.
 *
 * @param {string} htmlString - The HTML table string
 * @param {string} plainTextFallback - Plain text version (e.g. the markdown)
 * @returns {Promise<boolean>} true if successful
 */
export async function writeHtmlToClipboard(htmlString, plainTextFallback) {
  // Try modern Clipboard API first
  if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
    try {
      const item = new ClipboardItem({
        'text/html': new Blob([htmlString], { type: 'text/html' }),
        'text/plain': new Blob([plainTextFallback], { type: 'text/plain' }),
      });
      await navigator.clipboard.write([item]);
      return true;
    } catch {
      // Fall through to legacy method
    }
  }

  // Legacy fallback for browsers that don't support ClipboardItem (e.g. Firefox)
  return writeHtmlLegacy(htmlString);
}

/**
 * Legacy clipboard write using a temporary contenteditable element.
 */
function writeHtmlLegacy(htmlString) {
  const el = document.createElement('div');
  el.setAttribute('contenteditable', 'true');
  el.innerHTML = htmlString;
  el.style.position = 'fixed';
  el.style.left = '-9999px';
  document.body.appendChild(el);

  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  let success = false;
  try {
    success = document.execCommand('copy');
  } catch {
    success = false;
  }

  document.body.removeChild(el);
  sel.removeAllRanges();
  return success;
}

/**
 * Write plain text to the clipboard.
 */
export async function writeTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through
    }
  }

  // Legacy fallback
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  let success = false;
  try {
    success = document.execCommand('copy');
  } catch {
    success = false;
  }
  document.body.removeChild(textarea);
  return success;
}
