import * as XLSX from 'xlsx';
import {
  AssessmentScore,
  Classroom,
  LearningChapter,
  Student,
  Subject,
  SummativeAssessment
} from '../types/erapor';
import {
  aggregateChapterScoresFromSummatives,
  computeStudentReportScore,
  getEffectiveSasScore,
  ResolvedSchoolWeights
} from '../utils/assessmentCalculation';
import { normalizeAcademicYearValue, normalizeSemesterValue } from '../utils/electiveSubjectHelper';

export interface ReportScoreExcelTemplateParams {
  schoolName: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  subject: Subject;
  classroom: Classroom;
  students: Student[];
  chapters: LearningChapter[];
  scores: AssessmentScore[];
  summativeAssessments: SummativeAssessment[];
  weights: ResolvedSchoolWeights;
}

export const formatChapterExcelHeader = (chapter: LearningChapter): string => {
  const code = (chapter.code || 'BAB').trim();
  const title = (chapter.title || '').trim();
  return title ? `[${code}] ${title}` : `[${code}]`;
};

export function buildReportScoreExcelWorkbook(params: ReportScoreExcelTemplateParams): XLSX.WorkBook {
  const {
    schoolName,
    academicYear,
    semester,
    subject,
    classroom,
    students,
    chapters,
    scores,
    summativeAssessments,
    weights
  } = params;

  const sortedStudents = [...students].sort((a, b) => a.name.localeCompare(b.name));
  const chapterHeaders = chapters.map(formatChapterExcelHeader);

  const aoa: any[][] = [
    [`FORMAT PENGISIAN NILAI RAPOR - ${schoolName.toUpperCase()}`],
    [
      'PETUNJUK',
      'Isi nilai BAB dan Nilai SAS dengan angka 0-100. Kosongkan sel jika belum dinilai (jangan diisi 0 jika belum ikut). Kolom NILAI_AKHIR dihitung otomatis oleh sistem saat diunggah.'
    ],
    ['TAHUN_AJARAN', academicYear, 'SEMESTER', semester],
    ['ID_MAPEL', subject.id, 'NAMA_MAPEL', subject.name],
    ['ID_ROMBEL', classroom.id, 'NAMA_ROMBEL', classroom.name],
    ['MODEL_PENILAIAN', weights.formulaLabel, 'KKM', subject.kkm || weights.passingCriteria],
    [],
    ['NO', 'NIS', 'NISN', 'NAMA_SISWA', ...chapterHeaders, 'NILAI_SAS', 'NILAI_AKHIR']
  ];

  const targetYear = normalizeAcademicYearValue(academicYear);
  const targetSem = normalizeSemesterValue(semester);

  sortedStudents.forEach((std, idx) => {
    const existing = scores.find(
      (sc) =>
        sc.studentId === std.id &&
        sc.subjectId === subject.id &&
        normalizeAcademicYearValue(sc.academicYear) === targetYear &&
        normalizeSemesterValue(sc.semester) === targetSem
    );

    const chapterScores = aggregateChapterScoresFromSummatives({
      studentId: std.id,
      subjectId: subject.id,
      classId: classroom.id,
      academicYear,
      semester,
      chapters,
      summativeAssessments,
      existingChapterScores: existing?.chapterScores
    });

    const sasScore = getEffectiveSasScore(existing);
    const calc = computeStudentReportScore({
      chapters,
      chapterScores,
      sasScore,
      babWeightPercent: weights.babWeightPercent,
      sasWeightPercent: weights.sasWeightPercent,
      passingCriteria: subject.kkm || weights.passingCriteria,
      legacyMateriScores: existing?.sumatifMateriScores
    });

    aoa.push([
      idx + 1,
      std.nis || '',
      std.nisn || '',
      std.name,
      ...chapters.map((ch) => (calc.chapterScores[ch.id] !== undefined ? calc.chapterScores[ch.id] : '')),
      calc.sasScore !== undefined ? calc.sasScore : '',
      calc.finalScore !== undefined ? calc.finalScore : ''
    ]);
  });

  const wsInput = XLSX.utils.aoa_to_sheet(aoa);
  wsInput['!cols'] = [
    { wch: 5 },
    { wch: 13 },
    { wch: 14 },
    { wch: 30 },
    ...chapters.map(() => ({ wch: 24 })),
    { wch: 12 },
    { wch: 13 }
  ];

  // Sheet 2: Metadata BAB & Rumus Sekolah
  const refAoa: any[][] = [
    ['REFERENSI DAFTAR BAB MATERI & RUMUS PENILAIAN RAPOR'],
    ['TAHUN_AJARAN', academicYear, 'SEMESTER', semester],
    ['MAPEL', subject.name, 'ROMBEL', classroom.name],
    ['RUMUS_AKTIF', weights.formulaLabel, 'KKM/KKTP', subject.kkm || weights.passingCriteria],
    [],
    ['URUTAN', 'KODE_BAB', 'JUDUL_MATERI_BAB', 'ID_BAB', 'NAMA_KOLOM_EXCEL']
  ];

  if (chapters.length === 0) {
    refAoa.push([
      '-',
      '-',
      'Belum ada BAB materi diinput pada modul Asesmen Sumatif',
      '-',
      '-'
    ]);
  } else {
    chapters.forEach((ch) => {
      refAoa.push([
        ch.orderIndex,
        ch.code,
        ch.title,
        ch.id,
        formatChapterExcelHeader(ch)
      ]);
    });
  }

  const wsRef = XLSX.utils.aoa_to_sheet(refAoa);
  wsRef['!cols'] = [
    { wch: 10 },
    { wch: 12 },
    { wch: 36 },
    { wch: 28 },
    { wch: 36 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsInput, 'Input_Nilai_Rapor');
  XLSX.utils.book_append_sheet(wb, wsRef, 'Info_BAB_dan_Rumus');
  return wb;
}

export function downloadReportScoreExcelTemplate(params: ReportScoreExcelTemplateParams): void {
  const wb = buildReportScoreExcelWorkbook(params);
  const safeSubj = (params.subject.code || params.subject.name).replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeCls = params.classroom.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeYear = params.academicYear.replace(/[\/\s]/g, '-');
  XLSX.writeFile(
    wb,
    `Template_Nilai_Rapor_${safeSubj}_${safeCls}_${safeYear}_${params.semester}.xlsx`
  );
}

export interface ParsedReportScoreRow {
  rowNumber: number;
  studentId?: string;
  nis: string;
  nisn: string;
  studentName: string;
  matchedBy?: 'nisn' | 'nis' | 'name';
  chapterScores: Record<string, number>;
  sasScore?: number;
  computedFinalScore?: number;
  predicate?: 'A' | 'B' | 'C' | 'D';
  breakdownText: string;
  excelTypedFinalScore?: string | number;
  warnings: string[];
  errors: string[];
  hasChanges: boolean;
}

export interface ParsedReportScoreExcelResult {
  metadataErrors: string[];
  columnWarnings: string[];
  duplicateErrors: string[];
  unrecognizedRows: ParsedReportScoreRow[];
  rows: ParsedReportScoreRow[];
  validRows: ParsedReportScoreRow[];
  errorRows: ParsedReportScoreRow[];
  hasBlockingErrors: boolean;
  detectedMetadata: {
    academicYear?: string;
    semester?: string;
    subjectId?: string;
    subjectName?: string;
    classId?: string;
    className?: string;
  };
}

const normalizeHeaderToken = (val: unknown): string =>
  String(val ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');

const normalizePersonName = (val: unknown): string =>
  String(val ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const normalizeCodeId = (val: unknown): string => String(val ?? '').trim();

function parseScoreCell(
  raw: unknown,
  columnLabel: string
): { value?: number; error?: string } {
  if (raw === null || raw === undefined) return { value: undefined };
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) {
      return { error: `Kolom ${columnLabel} bukan angka valid.` };
    }
    if (raw < 0 || raw > 100) {
      return { error: `Kolom ${columnLabel} (${raw}) di luar rentang 0–100.` };
    }
    return { value: Math.round(raw * 100) / 100 };
  }

  const trimmed = String(raw).trim();
  if (trimmed === '' || trimmed === '-' || trimmed === '--') {
    return { value: undefined };
  }

  // Reject non-numeric formats cleanly (allow standard decimal point/comma numeric strings only)
  const normalized = trimmed.replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return { error: `Kolom ${columnLabel} ("${trimmed}") harus berupa angka 0–100.` };
  }

  const num = Number(normalized);
  if (!Number.isFinite(num) || num < 0 || num > 100) {
    return { error: `Kolom ${columnLabel} (${trimmed}) harus berada di rentang 0–100.` };
  }

  return { value: Math.round(num * 100) / 100 };
}

export function parseAndValidateReportScoreWorkbook(
  workbook: XLSX.WorkBook,
  params: {
    academicYear: string;
    semester: 'Ganjil' | 'Genap';
    subject: Subject;
    classroom: Classroom;
    students: Student[];
    chapters: LearningChapter[];
    scores: AssessmentScore[];
    weights: ResolvedSchoolWeights;
  }
): ParsedReportScoreExcelResult {
  const { academicYear, semester, subject, classroom, students, chapters, scores, weights } = params;

  const targetSheetName =
    workbook.SheetNames.find((n) => n.toLowerCase().includes('input_nilai')) || workbook.SheetNames[0];
  const sheet = workbook.Sheets[targetSheetName];

  if (!sheet) {
    return {
      metadataErrors: ['Berkas Excel tidak memiliki lembar kerja (sheet) yang dapat dibaca.'],
      columnWarnings: [],
      duplicateErrors: [],
      unrecognizedRows: [],
      rows: [],
      validRows: [],
      errorRows: [],
      hasBlockingErrors: true,
      detectedMetadata: {}
    };
  }

  const aoa = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });

  // 1. Extract metadata block above header row
  const detectedMetadata: ParsedReportScoreExcelResult['detectedMetadata'] = {};
  let headerRowIdx = -1;

  for (let r = 0; r < aoa.length; r++) {
    const row = aoa[r] || [];
    const upperCells = row.map((c) => normalizeHeaderToken(c));
    if (upperCells.includes('NAMA_SISWA') && (upperCells.includes('NISN') || upperCells.includes('NO'))) {
      headerRowIdx = r;
      break;
    }

    for (let c = 0; c < row.length - 1; c++) {
      const key = normalizeHeaderToken(row[c]);
      const val = String(row[c + 1] ?? '').trim();
      if (!val) continue;
      if (key === 'TAHUN_AJARAN' || key === 'TAHUN_PELAJARAN') detectedMetadata.academicYear = val;
      if (key === 'SEMESTER') detectedMetadata.semester = val;
      if (key === 'ID_MAPEL') detectedMetadata.subjectId = val;
      if (key === 'NAMA_MAPEL') detectedMetadata.subjectName = val;
      if (key === 'ID_ROMBEL') detectedMetadata.classId = val;
      if (key === 'NAMA_ROMBEL') detectedMetadata.className = val;
    }
  }

  const metadataErrors: string[] = [];
  if (
    detectedMetadata.academicYear &&
    normalizeAcademicYearValue(detectedMetadata.academicYear) !== normalizeAcademicYearValue(academicYear)
  ) {
    metadataErrors.push(
      `Tahun ajaran di Excel (${detectedMetadata.academicYear}) tidak cocok dengan pilihan aktif (${academicYear}).`
    );
  }
  if (
    detectedMetadata.semester &&
    normalizeSemesterValue(detectedMetadata.semester) !== normalizeSemesterValue(semester)
  ) {
    metadataErrors.push(
      `Semester di Excel (${detectedMetadata.semester}) tidak cocok dengan pilihan aktif (${semester}).`
    );
  }
  if (detectedMetadata.subjectId && detectedMetadata.subjectId !== subject.id) {
    metadataErrors.push(
      `Mata pelajaran di Excel (${detectedMetadata.subjectName || detectedMetadata.subjectId}) tidak sesuai dengan mapel terpilih (${subject.name}).`
    );
  } else if (
    !detectedMetadata.subjectId &&
    detectedMetadata.subjectName &&
    detectedMetadata.subjectName.toLowerCase() !== subject.name.toLowerCase()
  ) {
    metadataErrors.push(
      `Nama mata pelajaran di Excel (${detectedMetadata.subjectName}) tidak sesuai dengan mapel terpilih (${subject.name}).`
    );
  }
  if (detectedMetadata.classId && detectedMetadata.classId !== classroom.id) {
    metadataErrors.push(
      `Kelas/rombel di Excel (${detectedMetadata.className || detectedMetadata.classId}) tidak sesuai dengan rombel terpilih (${classroom.name}).`
    );
  } else if (
    !detectedMetadata.classId &&
    detectedMetadata.className &&
    detectedMetadata.className.toLowerCase() !== classroom.name.toLowerCase()
  ) {
    metadataErrors.push(
      `Nama rombel di Excel (${detectedMetadata.className}) tidak sesuai dengan rombel terpilih (${classroom.name}).`
    );
  }

  if (headerRowIdx < 0) {
    metadataErrors.push(
      'Header tabel tidak ditemukan. Pastikan menggunakan template Excel resmi dengan kolom NO, NIS, NISN, NAMA_SISWA, kolom BAB, dan NILAI_SAS.'
    );
    return {
      metadataErrors,
      columnWarnings: [],
      duplicateErrors: [],
      unrecognizedRows: [],
      rows: [],
      validRows: [],
      errorRows: [],
      hasBlockingErrors: true,
      detectedMetadata
    };
  }

  // Optional sheet 2 lookup for exact ID_BAB
  const refChapterIdByHeader = new Map<string, string>();
  const refSheetName = workbook.SheetNames.find((n) => n.toLowerCase().includes('info_bab'));
  if (refSheetName && workbook.Sheets[refSheetName]) {
    const refAoa = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets[refSheetName], { header: 1, defval: '' });
    const refHeaderIdx = refAoa.findIndex((r) =>
      r.some((c) => normalizeHeaderToken(c) === 'ID_BAB')
    );
    if (refHeaderIdx >= 0) {
      const refHeaders = refAoa[refHeaderIdx].map(normalizeHeaderToken);
      const idIdx = refHeaders.indexOf('ID_BAB');
      const colNameIdx = refHeaders.indexOf('NAMA_KOLOM_EXCEL');
      for (let i = refHeaderIdx + 1; i < refAoa.length; i++) {
        const chId = String(refAoa[i]?.[idIdx] || '').trim();
        const colName = String(refAoa[i]?.[colNameIdx] || '').trim();
        if (chId && colName) {
          refChapterIdByHeader.set(colName.toLowerCase(), chId);
        }
      }
    }
  }

  // 2. Map columns from header row
  const headerCells = (aoa[headerRowIdx] || []).map((c) => String(c ?? '').trim());
  const normHeaders = headerCells.map((h) => normalizeHeaderToken(h));

  const colNis = normHeaders.findIndex((h) => h === 'NIS');
  const colNisn = normHeaders.findIndex((h) => h === 'NISN');
  const colName = normHeaders.findIndex((h) => h === 'NAMA_SISWA' || h === 'NAMA');
  const colSas = normHeaders.findIndex((h) => h === 'NILAI_SAS' || h === 'SAS');
  const colFinal = normHeaders.findIndex((h) => h === 'NILAI_AKHIR');

  const chapterColumnMappings: { colIndex: number; chapter: LearningChapter; label: string }[] = [];
  const columnWarnings: string[] = [];

  headerCells.forEach((rawHeader, colIdx) => {
    if (!rawHeader) return;
    if (
      colIdx === colNis ||
      colIdx === colNisn ||
      colIdx === colName ||
      colIdx === colSas ||
      colIdx === colFinal ||
      normalizeHeaderToken(rawHeader) === 'NO'
    ) {
      return;
    }

    const refId = refChapterIdByHeader.get(rawHeader.toLowerCase());
    let matchedChapter = refId ? chapters.find((ch) => ch.id === refId) : undefined;

    if (!matchedChapter) {
      const bracketMatch = rawHeader.match(/^\[([^\]]+)\]/);
      const codeToken = bracketMatch ? bracketMatch[1].trim().toLowerCase() : '';
      matchedChapter = chapters.find((ch) => {
        const expected = formatChapterExcelHeader(ch).toLowerCase();
        if (rawHeader.toLowerCase() === expected) return true;
        if (codeToken && (ch.code || '').trim().toLowerCase() === codeToken) return true;
        if (rawHeader.toLowerCase() === (ch.title || '').trim().toLowerCase()) return true;
        if (rawHeader.toLowerCase() === `nilai ${(ch.code || '').trim().toLowerCase()}`) return true;
        return false;
      });
    }

    if (matchedChapter) {
      chapterColumnMappings.push({ colIndex: colIdx, chapter: matchedChapter, label: rawHeader });
    } else if (rawHeader.toLowerCase().includes('bab')) {
      columnWarnings.push(
        `Kolom "${rawHeader}" tidak cocok dengan daftar BAB Sumatif saat ini dan dilewati.`
      );
    }
  });

  if (colSas < 0 && chapterColumnMappings.length === 0) {
    metadataErrors.push(
      'Tidak ditemukan kolom nilai BAB ataupun kolom NILAI_SAS pada baris header Excel.'
    );
  }

  // Student lookup maps
  const studentByNisn = new Map<string, Student>();
  const studentByNis = new Map<string, Student>();
  const studentByName = new Map<string, Student>();
  students.forEach((st) => {
    const cleanNisn = normalizeCodeId(st.nisn);
    const cleanNis = normalizeCodeId(st.nis);
    const cleanName = normalizePersonName(st.name);
    if (cleanNisn) studentByNisn.set(cleanNisn, st);
    if (cleanNis) studentByNis.set(cleanNis, st);
    if (cleanName) studentByName.set(cleanName, st);
  });

  const targetYear = normalizeAcademicYearValue(academicYear);
  const targetSem = normalizeSemesterValue(semester);
  const seenStudentRowMap = new Map<string, number>();

  const rows: ParsedReportScoreRow[] = [];
  const duplicateErrors: string[] = [];
  const unrecognizedRows: ParsedReportScoreRow[] = [];

  for (let r = headerRowIdx + 1; r < aoa.length; r++) {
    const rawRow = aoa[r] || [];
    const excelRowNumber = r + 1;

    const nisVal = colNis >= 0 ? normalizeCodeId(rawRow[colNis]) : '';
    const nisnVal = colNisn >= 0 ? normalizeCodeId(rawRow[colNisn]) : '';
    const nameVal = colName >= 0 ? String(rawRow[colName] ?? '').trim() : '';

    // Skip empty trailing rows
    const hasAnyValue =
      nisVal !== '' ||
      nisnVal !== '' ||
      nameVal !== '' ||
      chapterColumnMappings.some((m) => String(rawRow[m.colIndex] ?? '').trim() !== '') ||
      (colSas >= 0 && String(rawRow[colSas] ?? '').trim() !== '');

    if (!hasAnyValue) continue;

    let matchedStudent: Student | undefined;
    let matchedBy: 'nisn' | 'nis' | 'name' | undefined;

    if (nisnVal && studentByNisn.has(nisnVal)) {
      matchedStudent = studentByNisn.get(nisnVal);
      matchedBy = 'nisn';
    } else if (nisVal && studentByNis.has(nisVal)) {
      matchedStudent = studentByNis.get(nisVal);
      matchedBy = 'nis';
    } else if (nameVal && studentByName.has(normalizePersonName(nameVal))) {
      matchedStudent = studentByName.get(normalizePersonName(nameVal));
      matchedBy = 'name';
    }

    const rowErrors: string[] = [];
    const rowWarnings: string[] = [];

    if (!matchedStudent) {
      rowErrors.push(
        `Baris ${excelRowNumber}: Siswa "${nameVal || nisnVal || nisVal || '-'}" tidak terdaftar pada rombel ${classroom.name}.`
      );
      const unrecognized: ParsedReportScoreRow = {
        rowNumber: excelRowNumber,
        nis: nisVal,
        nisn: nisnVal,
        studentName: nameVal || '(Tanpa Nama)',
        chapterScores: {},
        breakdownText: '-',
        warnings: rowWarnings,
        errors: rowErrors,
        hasChanges: false
      };
      unrecognizedRows.push(unrecognized);
      rows.push(unrecognized);
      continue;
    }

    if (seenStudentRowMap.has(matchedStudent.id)) {
      const firstRow = seenStudentRowMap.get(matchedStudent.id);
      const dupMsg = `Baris ${excelRowNumber}: Siswa "${matchedStudent.name}" terdeteksi duplikat dengan baris ${firstRow}.`;
      rowErrors.push(dupMsg);
      duplicateErrors.push(dupMsg);
    } else {
      seenStudentRowMap.set(matchedStudent.id, excelRowNumber);
    }

    if (matchedBy === 'name') {
      rowWarnings.push('Dicocokkan berdasarkan Nama Siswa karena NISN/NIS kosong atau tidak cocok.');
    }

    // Parse BAB scores
    const existing = scores.find(
      (sc) =>
        sc.studentId === matchedStudent!.id &&
        sc.subjectId === subject.id &&
        normalizeAcademicYearValue(sc.academicYear) === targetYear &&
        normalizeSemesterValue(sc.semester) === targetSem
    );

    const parsedChapterScores: Record<string, number> = {
      ...(existing?.chapterScores || {})
    };

    chapterColumnMappings.forEach((mapping) => {
      const cellRes = parseScoreCell(rawRow[mapping.colIndex], mapping.chapter.code);
      if (cellRes.error) {
        rowErrors.push(`Baris ${excelRowNumber}: ${cellRes.error}`);
      } else if (cellRes.value !== undefined) {
        parsedChapterScores[mapping.chapter.id] = cellRes.value;
      } else {
        // Explicit blank cell in Excel clears unsaved / leaves empty without treating as 0
        delete parsedChapterScores[mapping.chapter.id];
      }
    });

    // Parse SAS score
    let parsedSas: number | undefined = getEffectiveSasScore(existing);
    if (colSas >= 0) {
      const sasRes = parseScoreCell(rawRow[colSas], 'NILAI_SAS');
      if (sasRes.error) {
        rowErrors.push(`Baris ${excelRowNumber}: ${sasRes.error}`);
      } else {
        parsedSas = sasRes.value;
      }
    }

    // Read Excel Nilai Akhir only for comparison notice (NEVER trust manual Excel Nilai Akhir)
    const excelTypedFinalRaw = colFinal >= 0 ? rawRow[colFinal] : '';
    const calc = computeStudentReportScore({
      chapters,
      chapterScores: parsedChapterScores,
      sasScore: parsedSas,
      babWeightPercent: weights.babWeightPercent,
      sasWeightPercent: weights.sasWeightPercent,
      passingCriteria: subject.kkm || weights.passingCriteria,
      legacyMateriScores: existing?.sumatifMateriScores
    });

    calc.missingWarnings.forEach((w) => rowWarnings.push(w));

    const typedNum = Number(String(excelTypedFinalRaw ?? '').replace(',', '.'));
    if (
      String(excelTypedFinalRaw ?? '').trim() !== '' &&
      Number.isFinite(typedNum) &&
      calc.finalScore !== undefined &&
      Math.round(typedNum) !== calc.finalScore
    ) {
      rowWarnings.push(
        `Nilai Akhir pada Excel (${typedNum}) diabaikan; dihitung ulang oleh sistem menjadi ${calc.finalScore}.`
      );
    }

    const hasAnyInput =
      Object.keys(calc.chapterScores).length > 0 || calc.sasScore !== undefined;

    rows.push({
      rowNumber: excelRowNumber,
      studentId: matchedStudent.id,
      nis: matchedStudent.nis || nisVal,
      nisn: matchedStudent.nisn || nisnVal,
      studentName: matchedStudent.name,
      matchedBy,
      chapterScores: calc.chapterScores,
      sasScore: calc.sasScore,
      computedFinalScore: calc.finalScore,
      predicate: calc.predicate,
      breakdownText: calc.breakdownText,
      excelTypedFinalScore: excelTypedFinalRaw,
      warnings: rowWarnings,
      errors: rowErrors,
      hasChanges: hasAnyInput
    });
  }

  const errorRows = rows.filter((r) => r.errors.length > 0);
  const validRows = rows.filter((r) => r.errors.length === 0 && r.studentId && r.hasChanges);

  return {
    metadataErrors,
    columnWarnings,
    duplicateErrors,
    unrecognizedRows,
    rows,
    validRows,
    errorRows,
    hasBlockingErrors: metadataErrors.length > 0 || errorRows.length > 0 || validRows.length === 0,
    detectedMetadata
  };
}

export async function parseAndValidateReportScoreExcel(
  file: File,
  params: {
    academicYear: string;
    semester: 'Ganjil' | 'Genap';
    subject: Subject;
    classroom: Classroom;
    students: Student[];
    chapters: LearningChapter[];
    scores: AssessmentScore[];
    weights: ResolvedSchoolWeights;
  }
): Promise<ParsedReportScoreExcelResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  return parseAndValidateReportScoreWorkbook(workbook, params);
}
