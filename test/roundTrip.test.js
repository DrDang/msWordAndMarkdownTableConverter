import { describe, it, expect } from 'vitest';
import { parseMarkdownTable, tableModelToHtml } from '../src/markdownToHtml.js';
import { htmlTableToModel, tableModelToMarkdown } from '../src/htmlToMarkdown.js';

/**
 * Round-trip tests: verify that converting MD→HTML→MD or HTML→MD→HTML
 * preserves the table cell content and structure.
 *
 * We compare the intermediate models (cell content, row count, column count)
 * rather than raw strings, since separator width and alignment marker formatting
 * (:--- vs ---) are cosmetic and may differ between passes.
 */

function assertModelsEqual(model1, model2) {
  expect(model2.rows.length).toBe(model1.rows.length);
  for (let r = 0; r < model1.rows.length; r++) {
    expect(model2.rows[r].cells.length).toBe(model1.rows[r].cells.length);
    for (let c = 0; c < model1.rows[r].cells.length; c++) {
      expect(model2.rows[r].cells[c].content).toBe(model1.rows[r].cells[c].content);
    }
  }
}

describe('round-trip: Markdown → HTML → Markdown', () => {
  const testCases = [
    {
      name: 'simple 2x2',
      md: `| A | B |\n|---|---|\n| 1 | 2 |`,
    },
    {
      name: '3x3 with content',
      md: `| Name | Age | City |\n|------|-----|------|\n| Alice | 30 | NYC |\n| Bob | 25 | London |`,
    },
    {
      name: 'with center alignment',
      md: `| Left | Center | Right |\n|:-----|:------:|------:|\n| a | b | c |`,
    },
    {
      name: 'single data row',
      md: `| Header |\n|--------|\n| Value |`,
    },
    {
      name: 'special characters',
      md: `| Key | Value |\n|-----|-------|\n| x&y | a<b |`,
    },
  ];

  for (const { name, md } of testCases) {
    it(`preserves cell content for: ${name}`, () => {
      // MD → model
      const model1 = parseMarkdownTable(md);
      expect(model1).not.toBeNull();

      // model → HTML
      const html = tableModelToHtml(model1);

      // HTML → model
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const tableEl = doc.querySelector('table');
      const model2 = htmlTableToModel(tableEl);

      // Compare cell content
      assertModelsEqual(model1, model2);
    });

    it(`preserves center/right alignment for: ${name}`, () => {
      const model1 = parseMarkdownTable(md);
      const html = tableModelToHtml(model1);
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const tableEl = doc.querySelector('table');
      const model2 = htmlTableToModel(tableEl);

      // Center and right alignments should be preserved; left is the default
      for (let i = 0; i < model1.alignments.length; i++) {
        const orig = model1.alignments[i];
        const rt = model2.alignments[i];
        if (orig === 'center' || orig === 'right') {
          expect(rt).toBe(orig);
        }
      }
    });
  }
});

describe('round-trip: HTML → Markdown → HTML (model comparison)', () => {
  it('preserves table model through HTML→MD→HTML', () => {
    const html = `
      <table>
        <thead><tr><th>Product</th><th>Price</th></tr></thead>
        <tbody>
          <tr><td>Widget</td><td>$9.99</td></tr>
          <tr><td>Gadget</td><td>$19.99</td></tr>
        </tbody>
      </table>
    `;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const tableEl = doc.querySelector('table');

    // HTML → model → MD
    const model1 = htmlTableToModel(tableEl);
    const md = tableModelToMarkdown(model1);

    // MD → model
    const model2 = parseMarkdownTable(md);

    assertModelsEqual(model1, model2);
  });

  it('preserves alignment through HTML→MD→HTML', () => {
    const html = `
      <table>
        <thead>
          <tr>
            <th align="left">Left</th>
            <th align="center">Center</th>
            <th align="right">Right</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>a</td><td>b</td><td>c</td></tr>
        </tbody>
      </table>
    `;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const tableEl = doc.querySelector('table');

    const model1 = htmlTableToModel(tableEl);
    const md = tableModelToMarkdown(model1);
    const model2 = parseMarkdownTable(md);

    expect(model2.alignments).toEqual(['left', 'center', 'right']);
  });
});
