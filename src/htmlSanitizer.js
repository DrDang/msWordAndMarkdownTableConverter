/**
 * Strips Word-specific HTML junk and extracts a clean <table> element.
 * Word pastes contain mso-* styles, <o:p> tags, conditional comments, etc.
 */

export function sanitizeWordHtml(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  const table = doc.querySelector('table');
  if (!table) return null;

  // Remove Word-specific namespaced elements (o:p, w:*, v:*)
  const nsElements = table.querySelectorAll('*');
  for (const el of nsElements) {
    if (el.tagName.includes(':')) {
      el.replaceWith(...el.childNodes);
    }
  }

  // Remove <col> and <colgroup> elements
  for (const el of table.querySelectorAll('col, colgroup')) {
    el.remove();
  }

  // Strip all style and class attributes, but preserve alignment info
  const allElements = table.querySelectorAll('*');
  for (const el of allElements) {
    // Extract text-align before removing style
    const style = el.getAttribute('style') || '';
    const alignMatch = style.match(/text-align:\s*(left|center|right)/i);
    const align = el.getAttribute('align') || (alignMatch ? alignMatch[1].toLowerCase() : null);

    el.removeAttribute('style');
    el.removeAttribute('class');
    el.removeAttribute('width');
    el.removeAttribute('height');
    el.removeAttribute('valign');

    // Preserve alignment as the align attribute
    if (align) {
      el.setAttribute('align', align);
    }
  }

  // Also clean the table element itself
  const tableStyle = table.getAttribute('style') || '';
  table.removeAttribute('style');
  table.removeAttribute('class');
  table.removeAttribute('width');
  table.removeAttribute('cellspacing');
  table.removeAttribute('cellpadding');

  return table;
}

/**
 * Check if an HTML string contains a table element.
 */
export function containsTable(htmlString) {
  if (!htmlString) return false;
  return /<table[\s>]/i.test(htmlString);
}
