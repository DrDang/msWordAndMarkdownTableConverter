import { describe, it, expect } from 'vitest';
import { htmlTableToModel, tableModelToMarkdown, htmlToMarkdown } from '../src/htmlToMarkdown.js';
import { parseMarkdownTable } from '../src/markdownToHtml.js';

function makeTable(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return doc.querySelector('table');
}

describe('htmlTableToModel', () => {
  it('parses a simple table with thead', () => {
    const table = makeTable(`
      <table>
        <thead><tr><th>Name</th><th>Age</th></tr></thead>
        <tbody><tr><td>Alice</td><td>30</td></tr></tbody>
      </table>
    `);
    const model = htmlTableToModel(table);
    expect(model.rows).toHaveLength(2);
    expect(model.rows[0].isHeader).toBe(true);
    expect(model.rows[0].cells[0].content).toBe('Name');
    expect(model.rows[1].cells[0].content).toBe('Alice');
  });

  it('treats first row as header when no thead', () => {
    const table = makeTable(`
      <table>
        <tr><td>A</td><td>B</td></tr>
        <tr><td>1</td><td>2</td></tr>
      </table>
    `);
    const model = htmlTableToModel(table);
    expect(model.rows[0].isHeader).toBe(true);
    expect(model.rows[1].isHeader).toBe(false);
  });

  it('extracts alignment from align attribute', () => {
    const table = makeTable(`
      <table>
        <tr><th align="left">A</th><th align="center">B</th><th align="right">C</th></tr>
        <tr><td>1</td><td>2</td><td>3</td></tr>
      </table>
    `);
    const model = htmlTableToModel(table);
    expect(model.alignments).toEqual(['left', 'center', 'right']);
  });

  it('handles colspan by expanding cells', () => {
    const table = makeTable(`
      <table>
        <tr><th>A</th><th>B</th><th>C</th></tr>
        <tr><td colspan="2">Merged</td><td>Single</td></tr>
      </table>
    `);
    const model = htmlTableToModel(table);
    expect(model.rows[1].cells).toHaveLength(3);
    expect(model.rows[1].cells[0].content).toBe('Merged');
    expect(model.rows[1].cells[1].content).toBe('');
    expect(model.rows[1].cells[2].content).toBe('Single');
  });

  it('handles empty table gracefully', () => {
    const table = makeTable('<table></table>');
    const model = htmlTableToModel(table);
    expect(model).toBeNull();
  });
});

describe('tableModelToMarkdown', () => {
  it('generates properly formatted markdown', () => {
    const md = `
| Name  | Age |
|-------|-----|
| Alice | 30  |
    `;
    const model = parseMarkdownTable(md);
    const output = tableModelToMarkdown(model);
    expect(output).toContain('| Name');
    expect(output).toContain('| Alice');
    expect(output).toContain('---');
  });

  it('includes alignment markers', () => {
    const md = `
| Left | Center | Right |
|:-----|:------:|------:|
| a    | b      | c     |
    `;
    const model = parseMarkdownTable(md);
    const output = tableModelToMarkdown(model);
    // Check that the separator row contains alignment markers
    const lines = output.split('\n');
    const sepLine = lines[1];
    expect(sepLine).toMatch(/:\-+:/); // center
    expect(sepLine).toMatch(/\-+\-:/); // right (ends with -:)
  });

  it('escapes pipe characters in cells', () => {
    const model = {
      alignments: ['left'],
      rows: [
        { isHeader: true, cells: [{ content: 'Col', colspan: 1, rowspan: 1 }] },
        { isHeader: false, cells: [{ content: 'a | b', colspan: 1, rowspan: 1 }] },
      ],
    };
    const output = tableModelToMarkdown(model);
    expect(output).toContain('a \\| b');
  });
});

describe('htmlToMarkdown', () => {
  it('converts a complete HTML table to markdown', () => {
    const html = `
      <table>
        <thead><tr><th>Name</th><th>Value</th></tr></thead>
        <tbody>
          <tr><td>foo</td><td>42</td></tr>
          <tr><td>bar</td><td>99</td></tr>
        </tbody>
      </table>
    `;
    const result = htmlToMarkdown(html);
    expect(result).not.toBeNull();
    expect(result.markdown).toContain('Name');
    expect(result.markdown).toContain('foo');
    expect(result.markdown).toContain('42');
    expect(result.warnings).toHaveLength(0);
  });

  it('warns about merged cells', () => {
    const html = `
      <table>
        <tr><th>A</th><th>B</th><th>C</th></tr>
        <tr><td colspan="2">Merged</td><td>X</td></tr>
      </table>
    `;
    const result = htmlToMarkdown(html);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('Merged cells');
  });

  it('returns null when no table is present', () => {
    expect(htmlToMarkdown('<p>no table here</p>')).toBeNull();
  });

  it('collapses multi-line cell content into single line', () => {
    const html = `
      <table>
        <tr><th>Step</th><th>Action</th></tr>
        <tr>
          <td>1</td>
          <td>
            <p>First paragraph of content.</p>
            <p>Second paragraph with more detail.</p>
          </td>
        </tr>
      </table>
    `;
    const result = htmlToMarkdown(html);
    expect(result).not.toBeNull();
    // Each row must be a single line — no newlines within a row
    const lines = result.markdown.split('\n');
    for (const line of lines) {
      expect(line).toMatch(/^\|.*\|$/);
    }
    expect(result.markdown).toContain('First paragraph of content. Second paragraph with more detail.');
  });

  it('preserves comment markers like [CD1] in cell content', () => {
    const html = `
      <table>
        <tr><th>Step</th><th>Response</th></tr>
        <tr><td>1</td><td>System is operational [CD1] on laptop</td></tr>
      </table>
    `;
    const result = htmlToMarkdown(html);
    expect(result.markdown).toContain('[CD1]');
  });

  it('warns when multiple tables are found', () => {
    const html = `
      <table><tr><td>Table 1</td></tr></table>
      <table><tr><td>Table 2</td></tr></table>
    `;
    const result = htmlToMarkdown(html);
    expect(result).not.toBeNull();
    expect(result.markdown).toContain('Table 1');
    expect(result.markdown).not.toContain('Table 2');
    expect(result.warnings.some(w => w.includes('2 tables'))).toBe(true);
  });

  it('handles Word-style HTML with mso styles', () => {
    const html = `
      <table class="MsoTableGrid" style="mso-yfti-tbllook:1184">
        <tr style="mso-yfti-firstrow:yes">
          <td style="width:100pt;mso-border-alt:solid windowtext">
            <p class="MsoNormal"><span style="font-family:Calibri">Hello</span></p>
          </td>
          <td><p class="MsoNormal">World</p></td>
        </tr>
        <tr>
          <td><p class="MsoNormal">Foo</p></td>
          <td><p class="MsoNormal">Bar</p></td>
        </tr>
      </table>
    `;
    const result = htmlToMarkdown(html);
    expect(result).not.toBeNull();
    expect(result.markdown).toContain('Hello');
    expect(result.markdown).toContain('World');
    expect(result.markdown).toContain('Foo');
    expect(result.markdown).toContain('Bar');
  });
});
