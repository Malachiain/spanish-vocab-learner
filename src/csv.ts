export interface Word {
  spanish: string;
  english: string;
  notes: string;
}

/** Parses RFC 4180-style CSV (quoted fields, escaped quotes, CRLF) into rows of fields. */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const HEADER_PATTERN = /^(spanish|español|espanol|word|palabra)$/i;

/** Parses a "spanish,english,notes" CSV into words; a header row and blank lines are skipped. */
export function parseVocabCsv(text: string): Word[] {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ''));
  if (rows.length > 0 && HEADER_PATTERN.test(rows[0][0]?.trim() ?? '')) rows.shift();

  return rows
    .map(([spanish = '', english = '', notes = '']) => ({
      spanish: spanish.trim(),
      english: english.trim(),
      notes: notes.trim(),
    }))
    .filter((v) => v.spanish !== '' && v.english !== '');
}
