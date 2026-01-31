import { describe, it, expect } from 'vitest';
import { parseMarkdownTable, markdownToHtml } from '../src/markdownToHtml.js';

describe('parseMarkdownTable', () => {
  it('parses a simple 3x3 table', () => {
    const md = `
| Name | Age | City    |
|------|-----|---------|
| Alice| 30  | New York|
| Bob  | 25  | London  |
    `;
    const table = parseMarkdownTable(md);
    expect(table).not.toBeNull();
    expect(table.rows).toHaveLength(3);
    expect(table.rows[0].isHeader).toBe(true);
    expect(table.rows[0].cells[0].content).toBe('Name');
    expect(table.rows[1].cells[0].content).toBe('Alice');
    expect(table.rows[2].cells[1].content).toBe('25');
  });

  it('parses alignments correctly', () => {
    const md = `
| Left | Center | Right |
|:-----|:------:|------:|
| a    | b      | c     |
    `;
    const table = parseMarkdownTable(md);
    expect(table.alignments).toEqual(['left', 'center', 'right']);
  });

  it('handles escaped pipes in cell content', () => {
    const md = `
| Expression | Result |
|------------|--------|
| a \\| b     | true   |
    `;
    const table = parseMarkdownTable(md);
    expect(table.rows[1].cells[0].content).toBe('a | b');
  });

  it('pads short rows with empty cells', () => {
    const md = `
| A | B | C |
|---|---|---|
| 1 | 2 |
    `;
    const table = parseMarkdownTable(md);
    expect(table.rows[1].cells).toHaveLength(3);
    expect(table.rows[1].cells[2].content).toBe('');
  });

  it('returns null for invalid input', () => {
    expect(parseMarkdownTable('not a table')).toBeNull();
    expect(parseMarkdownTable('')).toBeNull();
  });

  it('handles header-only table', () => {
    const md = `
| A | B |
|---|---|
    `;
    const table = parseMarkdownTable(md);
    expect(table).not.toBeNull();
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0].isHeader).toBe(true);
  });
});

describe('markdownToHtml', () => {
  it('generates valid HTML table', () => {
    const md = `
| Name | Age |
|------|-----|
| Alice| 30  |
    `;
    const html = markdownToHtml(md);
    expect(html).toContain('<table');
    expect(html).toContain('<thead>');
    expect(html).toContain('<tbody>');
    expect(html).toContain('<th');
    expect(html).toContain('<td');
    expect(html).toContain('Alice');
    expect(html).toContain('30');
  });

  it('applies alignment styles', () => {
    const md = `
| Left | Center | Right |
|:-----|:------:|------:|
| a    | b      | c     |
    `;
    const html = markdownToHtml(md);
    expect(html).toContain('text-align: center;');
    expect(html).toContain('text-align: right;');
  });

  it('escapes HTML special characters in cells', () => {
    const md = `
| Code |
|------|
| <div> |
    `;
    const html = markdownToHtml(md);
    expect(html).toContain('&lt;div&gt;');
    expect(html).not.toContain('<div>');
  });

  it('includes inline border styles for Word compatibility', () => {
    const md = `
| A |
|---|
| 1 |
    `;
    const html = markdownToHtml(md);
    expect(html).toContain('border-collapse: collapse');
    expect(html).toContain('border: 1px solid black');
  });

  it('returns null for invalid markdown', () => {
    expect(markdownToHtml('just text')).toBeNull();
  });
});
