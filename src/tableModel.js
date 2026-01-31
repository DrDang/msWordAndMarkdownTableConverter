/**
 * Intermediate table representation used by both conversion directions.
 *
 * Structure:
 *   { alignments: string[], rows: Row[] }
 *   Row: { isHeader: boolean, cells: Cell[] }
 *   Cell: { content: string, colspan: number, rowspan: number }
 */

export function createCell(content = '', colspan = 1, rowspan = 1) {
  return { content, colspan, rowspan };
}

export function createRow(cells = [], isHeader = false) {
  return { isHeader, cells };
}

export function createTable(rows = [], alignments = []) {
  return { alignments, rows };
}

export function getColumnCount(table) {
  let max = 0;
  for (const row of table.rows) {
    let count = 0;
    for (const cell of row.cells) {
      count += cell.colspan;
    }
    if (count > max) max = count;
  }
  return max;
}

/**
 * Normalize a table so every row has the same number of effective columns.
 * Short rows get padded with empty cells; alignments array gets padded with 'left'.
 */
export function normalizeTable(table) {
  const colCount = getColumnCount(table);

  for (const row of table.rows) {
    let currentCols = 0;
    for (const cell of row.cells) {
      currentCols += cell.colspan;
    }
    while (currentCols < colCount) {
      row.cells.push(createCell());
      currentCols++;
    }
  }

  while (table.alignments.length < colCount) {
    table.alignments.push('left');
  }
  table.alignments = table.alignments.slice(0, colCount);

  return table;
}
