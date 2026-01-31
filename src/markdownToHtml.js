import { createCell, createRow, createTable, normalizeTable } from './tableModel.js';

const SEPARATOR_RE = /^\|[\s:|-]+\|$/;

function parseAlignments(separatorLine) {
  const raw = separatorLine.replace(/^\|/, '').replace(/\|$/, '');
  return raw.split('|').map((seg) => {
    const trimmed = seg.trim();
    const left = trimmed.startsWith(':');
    const right = trimmed.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    return 'left';
  });
}

function parseCells(line) {
  // Strip leading/trailing pipes
  const inner = line.replace(/^\|/, '').replace(/\|$/, '');
  // Split on | that is NOT preceded by a backslash
  const parts = inner.split(/(?<!\\)\|/);
  return parts.map((p) => p.trim().replace(/\\\|/g, '|'));
}

export function parseMarkdownTable(markdown) {
  const lines = markdown
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return null;

  // Find separator row
  let separatorIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (SEPARATOR_RE.test(lines[i])) {
      separatorIndex = i;
      break;
    }
  }

  if (separatorIndex === -1) return null;

  const alignments = parseAlignments(lines[separatorIndex]);

  // Header rows are everything before the separator
  const headerLines = lines.slice(0, separatorIndex);
  const dataLines = lines.slice(separatorIndex + 1);

  const rows = [];

  for (const line of headerLines) {
    const cells = parseCells(line).map((c) => createCell(c));
    rows.push(createRow(cells, true));
  }

  for (const line of dataLines) {
    const cells = parseCells(line).map((c) => createCell(c));
    rows.push(createRow(cells, false));
  }

  return normalizeTable(createTable(rows, alignments));
}

function alignStyle(alignment) {
  if (alignment === 'center') return 'text-align: center;';
  if (alignment === 'right') return 'text-align: right;';
  return 'text-align: left;';
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function tableModelToHtml(table) {
  const cellStyle =
    'border: 1px solid black; padding: 6px 12px;';

  let html = '<table style="border-collapse: collapse; border: 1px solid black;">\n';

  const headerRows = table.rows.filter((r) => r.isHeader);
  const dataRows = table.rows.filter((r) => !r.isHeader);

  if (headerRows.length > 0) {
    html += '  <thead>\n';
    for (const row of headerRows) {
      html += '    <tr>\n';
      row.cells.forEach((cell, i) => {
        const align = table.alignments[i] || 'left';
        const attrs = `style="${cellStyle} ${alignStyle(align)} font-weight: bold;"`;
        html += `      <th ${attrs}>${escapeHtml(cell.content)}</th>\n`;
      });
      html += '    </tr>\n';
    }
    html += '  </thead>\n';
  }

  if (dataRows.length > 0) {
    html += '  <tbody>\n';
    for (const row of dataRows) {
      html += '    <tr>\n';
      row.cells.forEach((cell, i) => {
        const align = table.alignments[i] || 'left';
        const attrs = `style="${cellStyle} ${alignStyle(align)}"`;
        html += `      <td ${attrs}>${escapeHtml(cell.content)}</td>\n`;
      });
      html += '    </tr>\n';
    }
    html += '  </tbody>\n';
  }

  html += '</table>';
  return html;
}

export function markdownToHtml(markdown) {
  const table = parseMarkdownTable(markdown);
  if (!table) return null;
  return tableModelToHtml(table);
}
