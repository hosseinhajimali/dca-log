// ─── CSV helpers ──────────────────────────────────────────────────────────────

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCSVString(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map(row => headers.map(h => escapeCSV(row[h])).join(',')),
  ];
  return lines.join('\n');
}

// ─── Download trigger ─────────────────────────────────────────────────────────

export function downloadFile(content: string | Blob, filename: string, mime = 'text/plain'): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── XLSX export (requires `xlsx` npm package) ────────────────────────────────

export async function downloadXLSX(rows: Record<string, unknown>[], filename: string): Promise<void> {
  // Dynamic import, will throw if package not installed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const XLSX: any = await import('xlsx');

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
  const buf: ArrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadFile(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
}

// ─── CSV import parser ────────────────────────────────────────────────────────

export interface ParsedImportRow {
  date: string;          // ISO string or human date
  symbol: string;        // asset symbol (upper-cased)
  quantity: number;
  priceUsd: number;
  amountUsd: number;
  exchange?: string;
  notes?: string;
  // resolved at match time:
  assetId?: string;
  matchError?: string;
}

/** Parse a CSV string exported by this app (or compatible format). */
export function parseImportCSV(text: string): ParsedImportRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Normalise header names
  const rawHeaders = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z_]/g, '_'));

  const col = (candidates: string[]) => {
    for (const c of candidates) {
      const idx = rawHeaders.findIndex(h => h.includes(c));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const dateIdx     = col(['date', 'purchased']);
  const symbolIdx   = col(['symbol', 'asset', 'ticker']);
  const qtyIdx      = col(['qty', 'quantity', 'amount_token']);
  const priceIdx    = col(['price', 'price_usd', 'unit_price']);
  const amountIdx   = col(['amount_usd', 'total', 'spent', 'amount']);
  const exchangeIdx = col(['exchange']);
  const notesIdx    = col(['notes', 'note', 'comment']);

  const rows: ParsedImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]);
    if (cells.every(c => !c.trim())) continue; // skip blank lines

    const quantity  = qtyIdx    >= 0 ? parseFloat(cells[qtyIdx])    : NaN;
    const priceUsd  = priceIdx  >= 0 ? parseFloat(cells[priceIdx])  : NaN;
    const amountUsd = amountIdx >= 0 ? parseFloat(cells[amountIdx]) : (!isNaN(quantity) && !isNaN(priceUsd) ? quantity * priceUsd : NaN);

    rows.push({
      date:      dateIdx     >= 0 ? cells[dateIdx].trim()     : '',
      symbol:    symbolIdx   >= 0 ? cells[symbolIdx].trim().toUpperCase() : '',
      quantity:  isNaN(quantity)  ? 0 : quantity,
      priceUsd:  isNaN(priceUsd)  ? 0 : priceUsd,
      amountUsd: isNaN(amountUsd) ? 0 : amountUsd,
      exchange:  exchangeIdx >= 0 ? cells[exchangeIdx]?.trim() || undefined : undefined,
      notes:     notesIdx    >= 0 ? cells[notesIdx]?.trim()   || undefined : undefined,
    });
  }

  return rows;
}

/** Basic CSV line parser that handles quoted fields. */
function parseLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (ch === ',' && !inQuote) {
      result.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}
