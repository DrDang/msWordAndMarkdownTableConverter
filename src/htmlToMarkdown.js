import { createCell, createRow, createTable, normalizeTable } from './tableModel.js';
import { sanitizeWordHtml } from './htmlSanitizer.js';

/**
 * Parse a clean DOM <table> element into our intermediate table model.
 */
export function htmlTableToModel(tableEl) {
  const rows = [];
  const alignments = [];
  let alignmentsSet = false;

  // Collect all <tr> elements from thead and tbody
  const trElements = tableEl.querySelectorAll('tr');
  if (trElements.length === 0) return null;

  // Determine which rows are header rows
  const theadRows = new Set();
  const thead = tableEl.querySelector('thead');
  if (thead) {
    for (const tr of thead.querySelectorAll('tr')) {
      theadRows.add(tr);
    }
  }

  // If no <thead>, treat the first row as header
  const treatFirstAsHeader = theadRows.size === 0;

  // Track rowspan carry-overs: array of { content, remaining }
  const rowspanTracker = [];

  for (let rowIdx = 0; rowIdx < trElements.length; rowIdx++) {
    const tr = trElements[rowIdx];
    const isHeader = theadRows.has(tr) || (treatFirstAsHeader && rowIdx === 0);
    const cells = [];
    const cellElements = tr.querySelectorAll('td, th');

    let colIdx = 0;
    let cellElIdx = 0;

    while (cellElIdx < cellElements.length || (rowspanTracker[colIdx] && rowspanTracker[colIdx].remaining > 0)) {
      // Check if there's a rowspan carry-over for this column
      if (rowspanTracker[colIdx] && rowspanTracker[colIdx].remaining > 0) {
        cells.push(createCell(''));
        rowspanTracker[colIdx].remaining--;
        colIdx++;
        continue;
      }

      if (cellElIdx >= cellElements.length) break;

      const cellEl = cellElements[cellElIdx];
      // Collapse whitespace (newlines from <p> tags, tabs, etc.) into single spaces.
      // Word cells often contain multiple <p> elements whose newlines break Markdown rows.
      const content = cellEl.textContent.replace(/\s+/g, ' ').trim();
      const colspan = parseInt(cellEl.getAttribute('colspan') || '1', 10);
      const rowspan = parseInt(cellEl.getAttribute('rowspan') || '1', 10);

      // Extract alignment
      const align = cellEl.getAttribute('align') ||
        (cellEl.style && cellEl.style.textAlign) || null;

      if (!alignmentsSet && isHeader && align) {
        // We'll set alignments from the header row
      }

      // Handle colspan: expand into multiple cells
      for (let c = 0; c < colspan; c++) {
        const cellContent = c === 0 ? content : '';
        cells.push(createCell(cellContent));

        // Handle rowspan: set tracker for subsequent rows
        if (rowspan > 1) {
          rowspanTracker[colIdx] = { remaining: rowspan - 1 };
        }

        // Capture alignment for first occurrence
        if (isHeader && !alignmentsSet) {
          if (align) {
            alignments.push(align.toLowerCase());
          } else {
            alignments.push('left');
          }
        }

        colIdx++;
      }

      cellElIdx++;
    }

    // Handle any remaining rowspan carry-overs at the end
    while (rowspanTracker[colIdx] && rowspanTracker[colIdx].remaining > 0) {
      cells.push(createCell(''));
      rowspanTracker[colIdx].remaining--;
      colIdx++;
    }

    if (isHeader && !alignmentsSet) {
      alignmentsSet = true;
    }

    rows.push(createRow(cells, isHeader));
  }

  return normalizeTable(createTable(rows, alignments));
}

/**
 * Escape special Markdown characters inside table cells.
 */
function escapeMarkdownCell(content) {
  return content.replace(/\|/g, '\\|');
}

/**
 * Generate a Markdown table string from our table model.
 */
export function tableModelToMarkdown(table) {
  if (!table || table.rows.length === 0) return '';

  const colCount = table.alignments.length;

  // Calculate column widths for visual alignment
  const widths = new Array(colCount).fill(3); // minimum 3 for separator (---)
  for (const row of table.rows) {
    for (let i = 0; i < row.cells.length && i < colCount; i++) {
      const escaped = escapeMarkdownCell(row.cells[i].content);
      widths[i] = Math.max(widths[i], escaped.length);
    }
  }

  const lines = [];

  // Header row(s)
  const headerRows = table.rows.filter((r) => r.isHeader);
  const dataRows = table.rows.filter((r) => !r.isHeader);

  // If no header rows, use first row as header
  let actualHeaders = headerRows;
  let actualData = dataRows;
  if (headerRows.length === 0 && table.rows.length > 0) {
    actualHeaders = [table.rows[0]];
    actualData = table.rows.slice(1);
  }

  for (const row of actualHeaders) {
    const cells = [];
    for (let i = 0; i < colCount; i++) {
      const content = i < row.cells.length ? escapeMarkdownCell(row.cells[i].content) : '';
      cells.push(' ' + content.padEnd(widths[i]) + ' ');
    }
    lines.push('|' + cells.join('|') + '|');
  }

  // Separator row with alignment markers
  const separators = [];
  for (let i = 0; i < colCount; i++) {
    const align = table.alignments[i] || 'left';
    const w = widths[i];
    if (align === 'center') {
      separators.push(':' + '-'.repeat(w) + ':');
    } else if (align === 'right') {
      separators.push('-'.repeat(w) + '-:');
    } else {
      separators.push('-'.repeat(w + 2));
    }
  }
  lines.push('|' + separators.join('|') + '|');

  // Data rows
  for (const row of actualData) {
    const cells = [];
    for (let i = 0; i < colCount; i++) {
      const content = i < row.cells.length ? escapeMarkdownCell(row.cells[i].content) : '';
      cells.push(' ' + content.padEnd(widths[i]) + ' ');
    }
    lines.push('|' + cells.join('|') + '|');
  }

  return lines.join('\n');
}

/**
 * Convert an HTML string (potentially from Word) to a Markdown table.
 * Returns { markdown: string, warnings: string[] } or null if no table found.
 */
export function htmlToMarkdown(htmlString) {
  const result = sanitizeWordHtml(htmlString);
  if (!result) return null;

  const { table: tableEl, tableCount } = result;
  const model = htmlTableToModel(tableEl);
  if (!model) return null;

  const warnings = [];

  if (tableCount > 1) {
    warnings.push(`Found ${tableCount} tables — only the first was converted.`);
  }

  // Check for merged cells in the original HTML
  const cells = tableEl.querySelectorAll('td, th');
  for (const cell of cells) {
    const colspan = parseInt(cell.getAttribute('colspan') || '1', 10);
    const rowspan = parseInt(cell.getAttribute('rowspan') || '1', 10);
    if (colspan > 1 || rowspan > 1) {
      warnings.push('Merged cells were expanded into separate cells.');
      break;
    }
  }

  const markdown = tableModelToMarkdown(model);
  return { markdown, warnings };
}
