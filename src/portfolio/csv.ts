/**
 * Minimal RFC 4180-style CSV parse/stringify for portfolio import/export.
 */

export function escapeCsvField(value: string): string {
  if (/[",\\r\\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function stringifyCsv(rows: string[][]): string {
  const lines = rows.map((row) => row.map((cell) => escapeCsvField(cell ?? "")).join(","));
  return `${lines.join("\\r\\n")}\\r\\n`;
}

/**
 * Parses CSV text into rows of raw string fields (no type coercion).
 * Rejects malformed quoting rather than silently shifting imported columns.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  let afterQuote = false;
  const s = text.replace(/\\r\\n/g, "\\n").replace(/\\r/g, "\\n");

  while (i < s.length) {
    const c = s[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        afterQuote = true;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }

    if (afterQuote) {
      if (c !== "," && c !== "\\n") {
        throw new Error("Malformed CSV: unexpected character after closing quote");
      }
      afterQuote = false;
    } else if (c === '"') {
      if (field.length !== 0) {
        throw new Error("Malformed CSV: quote inside an unquoted field");
      }
      inQuotes = true;
      i += 1;
      continue;
    }

    if (c === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (c === "\\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }

  if (inQuotes) throw new Error("Malformed CSV: unterminated quoted field");
  row.push(field);
  rows.push(row);

  while (rows.length > 0 && rows[rows.length - 1]!.every((c) => c === "")) {
    rows.pop();
  }

  return rows;
}
