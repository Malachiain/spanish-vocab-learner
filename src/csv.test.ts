import { describe, expect, it } from 'vitest';
import { parseVocabCsv } from './csv';

describe('parseVocabCsv', () => {
  it('skips a header row and parses quoted fields with commas', () => {
    const csv = 'spanish,english,notes\nser,to be,"identity, origin"\r\ntener,to have,\n';
    expect(parseVocabCsv(csv)).toEqual([
      { spanish: 'ser', english: 'to be', notes: 'identity, origin' },
      { spanish: 'tener', english: 'to have', notes: '' },
    ]);
  });

  it('works without a header, notes column, or trailing newline', () => {
    expect(parseVocabCsv('ir,to go')).toEqual([{ spanish: 'ir', english: 'to go', notes: '' }]);
  });

  it('handles escaped quotes, multi-line notes, BOM, and blank lines', () => {
    const csv = '\uFEFFdecir,to say,"irregular ""digo""\nsecond line"\n\n,,\n';
    expect(parseVocabCsv(csv)).toEqual([
      { spanish: 'decir', english: 'to say', notes: 'irregular "digo"\nsecond line' },
    ]);
  });
});
