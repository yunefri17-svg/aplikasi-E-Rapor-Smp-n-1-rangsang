const MONTH_MAP: Record<string, number> = {
  januari: 1,
  jan: 1,
  january: 1,
  februari: 2,
  feb: 2,
  pebruari: 2,
  february: 2,
  maret: 3,
  mar: 3,
  march: 3,
  april: 4,
  apr: 4,
  mei: 5,
  may: 5,
  juni: 6,
  jun: 6,
  june: 6,
  juli: 7,
  jul: 7,
  july: 7,
  agustus: 8,
  agu: 8,
  ags: 8,
  agt: 8,
  aug: 8,
  august: 8,
  september: 9,
  sep: 9,
  sept: 9,
  oktober: 10,
  okt: 10,
  oct: 10,
  october: 10,
  november: 11,
  nov: 11,
  nopember: 11,
  nop: 11,
  desember: 12,
  des: 12,
  dec: 12,
  december: 12
};

const pad2 = (n: number): string => String(n).padStart(2, '0');

const buildValidIsoDate = (year: number, month: number, day: number): string => {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return '';
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return '';
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() + 1 !== month ||
    d.getUTCDate() !== day
  ) {
    return '';
  }
  return `${year}-${pad2(month)}-${pad2(day)}`;
};

/**
 * Normalizes student date values (ISO, DD/MM/YYYY, DD-MM-YYYY, Indonesian month names,
 * ISO timestamps, or Excel serial dates) into strict YYYY-MM-DD required by <input type="date">.
 */
export function normalizeDateToIso(raw: string | number | Date | null | undefined): string {
  if (raw === null || raw === undefined) return '';

  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return '';
    return buildValidIsoDate(raw.getFullYear(), raw.getMonth() + 1, raw.getDate());
  }

  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw < 1000 || raw > 80000) return '';
    const utcMillis = Date.UTC(1899, 11, 30) + Math.floor(raw) * 86400000;
    const d = new Date(utcMillis);
    return buildValidIsoDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }

  const s = String(raw).trim();
  if (!s || s === '-' || s === '0') return '';

  // 1. Numeric Excel serial date string (e.g., "41418" or "41418.0")
  if (/^\d{4,5}(?:\.\d+)?$/.test(s)) {
    const serial = Math.floor(Number(s));
    if (serial >= 1000 && serial <= 80000) {
      const utcMillis = Date.UTC(1899, 11, 30) + serial * 86400000;
      const d = new Date(utcMillis);
      const iso = buildValidIsoDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
      if (iso) return iso;
    }
  }

  // 2. YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD (with optional ISO time suffix)
  const ymdMatch = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/);
  if (ymdMatch) {
    const iso = buildValidIsoDate(
      Number(ymdMatch[1]),
      Number(ymdMatch[2]),
      Number(ymdMatch[3])
    );
    if (iso) return iso;
  }

  // 3. DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (Indonesian/Dapodik standard, with optional time)
  const dmyMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[\sT].*)?$/);
  if (dmyMatch) {
    const p1 = Number(dmyMatch[1]);
    const p2 = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    // Default to DD/MM/YYYY; fallback to MM/DD/YYYY only if middle value > 12
    const [day, month] = p2 > 12 && p1 <= 12 ? [p2, p1] : [p1, p2];
    const iso = buildValidIsoDate(year, month, day);
    if (iso) return iso;
  }

  // 4. DD/MM/YY or DD-MM-YY
  const dmyShortMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/);
  if (dmyShortMatch) {
    const p1 = Number(dmyShortMatch[1]);
    const p2 = Number(dmyShortMatch[2]);
    const yy = Number(dmyShortMatch[3]);
    const year = yy >= 50 ? 1900 + yy : 2000 + yy;
    const [day, month] = p2 > 12 && p1 <= 12 ? [p2, p1] : [p1, p2];
    const iso = buildValidIsoDate(year, month, day);
    if (iso) return iso;
  }

  // 5. Named month: "15 Mei 2013", "15-Mei-2013", "15 Agustus 2012"
  const namedDmyMatch = s.match(/^(\d{1,2})[\s,/-]+([a-zA-Z]+)[\s,/-]+(\d{4})$/);
  if (namedDmyMatch) {
    const day = Number(namedDmyMatch[1]);
    const monthNum = MONTH_MAP[namedDmyMatch[2].toLowerCase()];
    const year = Number(namedDmyMatch[3]);
    if (monthNum) {
      const iso = buildValidIsoDate(year, monthNum, day);
      if (iso) return iso;
    }
  }

  // 6. Named month English order: "May 15, 2013"
  const namedMdyMatch = s.match(/^([a-zA-Z]+)[\s.-]+(\d{1,2})[\s,/-]+(\d{4})$/);
  if (namedMdyMatch) {
    const monthNum = MONTH_MAP[namedMdyMatch[1].toLowerCase()];
    const day = Number(namedMdyMatch[2]);
    const year = Number(namedMdyMatch[3]);
    if (monthNum) {
      const iso = buildValidIsoDate(year, monthNum, day);
      if (iso) return iso;
    }
  }

  // 7. Compact 8 digits: YYYYMMDD or DDMMYYYY
  const compactMatch = s.match(/^(\d{8})$/);
  if (compactMatch) {
    const digits = compactMatch[1];
    if (digits.startsWith('19') || digits.startsWith('20')) {
      const iso = buildValidIsoDate(
        Number(digits.slice(0, 4)),
        Number(digits.slice(4, 6)),
        Number(digits.slice(6, 8))
      );
      if (iso) return iso;
    }
    const isoDmy = buildValidIsoDate(
      Number(digits.slice(4, 8)),
      Number(digits.slice(2, 4)),
      Number(digits.slice(0, 2))
    );
    if (isoDmy) return isoDmy;
  }

  return '';
}
