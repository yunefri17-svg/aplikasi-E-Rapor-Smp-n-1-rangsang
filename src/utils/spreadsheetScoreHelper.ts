import * as XLSX from 'xlsx';
import {
  AcademicYearPeriod,
  AssessmentPolicyConfig,
  AssessmentScore,
  LearningChapter,
  Student,
  Subject,
  SummativeAssessment,
  SummativeAssessmentPlan,
  User
} from '../types/erapor';
import {
  buildDeterministicChapterSummativeId,
  buildDeterministicScoreId,
  calculateFormativeAverage,
  clampScore0To100,
  computeStudentReportScore,
  getEffectiveSasScore,
  ResolvedSchoolWeights,
  sanitizePeriodSegment
} from './assessmentCalculation';
import { checkLegacyScoreProtection } from './authorizationGuard';
import { normalizeAcademicYearValue, normalizeSemesterValue } from './electiveSubjectHelper';

export interface SpreadsheetScoreColumn {
  key: string;
  kind: 'plan' | 'chapter';
  id: string;
  label: string;
  subLabel?: string;
  chapterId: string;
  tpIds: string[];
  technique?: SummativeAssessment['technique'];
}

export interface StudentSpreadsheetEditState {
  cellValues: Record<string, string>; // columnKey -> raw input string
  sasValue: string;
  manualFinalValue: string;
  formatifValue?: string;
}

export interface ComputedSpreadsheetRow {
  student: Student;
  existingScore?: AssessmentScore;
  isProtected: boolean;
  protectedReason?: string;
  chapterScores: Record<string, number>;
  babAverage?: number;
  sasScore?: number;
  formatifAverage?: number;
  sumatifAverage?: number;
  rawFinalScore?: number;
  completenessStatus?: 'LENGKAP' | 'BELUM_LENGKAP';
  manualFinalScore?: number;
  finalScore?: number;
  predicate?: 'A' | 'B' | 'C' | 'D';
  breakdownText: string;
  missingComponentNote?: string;
  hasInvalidCells: boolean;
  invalidMessages: string[];
}

export interface ParsedPasteCellError {
  rowOffset: number;
  colOffset: number;
  raw: string;
  error: string;
}

export interface ParsedSpreadsheetPasteResult {
  grid: Array<Array<number | undefined>>;
  errors: ParsedPasteCellError[];
  totalCells: number;
}

export function buildDeterministicPlanSummativeId(planId: string, studentId: string): string {
  return `sa-plan-${sanitizePeriodSegment(planId)}-${sanitizePeriodSegment(studentId)}`.slice(0, 128);
}

/**
 * Builds spreadsheet columns seamlessly from SummativeAssessmentPlans + LearningChapters.
 * - If Summative Plans exist for a chapter, each Plan gets its own writable column.
 * - Chapters without Plans also appear as direct BAB writable columns so legacy & simplified flows unify cleanly.
 */
export function buildSpreadsheetColumns(params: {
  chapters: LearningChapter[];
  plans: SummativeAssessmentPlan[];
}): SpreadsheetScoreColumn[] {
  const { chapters, plans } = params;
  const columns: SpreadsheetScoreColumn[] = [];
  const chaptersCoveredByPlans = new Set<string>();

  plans.forEach((pl) => {
    chaptersCoveredByPlans.add(pl.chapterId);
    const parentChapter = chapters.find((ch) => ch.id === pl.chapterId);
    columns.push({
      key: `plan:${pl.id}`,
      kind: 'plan',
      id: pl.id,
      label: pl.title,
      subLabel: parentChapter ? `${parentChapter.code}${pl.tpIds.length ? ` • ${pl.tpIds.length} TP` : ''}` : pl.chapterCode,
      chapterId: pl.chapterId,
      tpIds: pl.tpIds || [],
      technique: pl.technique || 'tes tertulis'
    });
  });

  chapters.forEach((ch) => {
    if (!chaptersCoveredByPlans.has(ch.id)) {
      columns.push({
        key: `chapter:${ch.id}`,
        kind: 'chapter',
        id: ch.id,
        label: ch.code,
        subLabel: ch.title,
        chapterId: ch.id,
        tpIds: ch.linkedTpIds || [],
        technique: 'tes tertulis'
      });
    }
  });

  return columns;
}

export function parseNumericScoreInput(raw: string): {
  isEmpty: boolean;
  value?: number;
  error?: string;
} {
  const trimmed = String(raw ?? '').trim();
  if (trimmed === '' || trimmed === '-' || trimmed === '--') {
    return { isEmpty: true, value: undefined };
  }
  const normalized = trimmed.replace(',', '.');
  const num = Number(normalized);
  if (!Number.isFinite(num)) {
    return { isEmpty: false, error: `"${trimmed}" bukan angka yang valid.` };
  }
  if (num < 0 || num > 100) {
    return { isEmpty: false, error: `Nilai ${num} harus berada pada rentang 0–100.` };
  }
  return { isEmpty: false, value: Math.round(num * 100) / 100 };
}

/**
 * Parses tabular text copied from Excel or Google Sheets (TSV) into numeric score grid.
 */
export function parseSpreadsheetPasteGrid(clipboardText: string): ParsedSpreadsheetPasteResult {
  const cleanText = String(clipboardText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawLines = cleanText.split('\n');
  // Strip single trailing empty newline produced by Excel row copy
  if (rawLines.length > 1 && rawLines[rawLines.length - 1] === '') {
    rawLines.pop();
  }

  const grid: Array<Array<number | undefined>> = [];
  const errors: ParsedPasteCellError[] = [];
  let totalCells = 0;

  rawLines.forEach((line, rIdx) => {
    const cells = line.split('\t');
    const parsedRow: Array<number | undefined> = [];
    cells.forEach((cellRaw, cIdx) => {
      totalCells++;
      const parsed = parseNumericScoreInput(cellRaw);
      if (parsed.error) {
        errors.push({
          rowOffset: rIdx,
          colOffset: cIdx,
          raw: cellRaw,
          error: `Baris +${rIdx + 1}, Kolom +${cIdx + 1}: ${parsed.error}`
        });
        parsedRow.push(undefined);
      } else {
        parsedRow.push(parsed.value);
      }
    });
    grid.push(parsedRow);
  });

  return { grid, errors, totalCells };
}

export function extractStudentInitialEditState(params: {
  studentId: string;
  subjectId: string;
  classId: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  columns: SpreadsheetScoreColumn[];
  existingScore?: AssessmentScore;
  summativeAssessments: SummativeAssessment[];
}): StudentSpreadsheetEditState {
  const {
    studentId,
    subjectId,
    classId,
    academicYear,
    semester,
    columns,
    existingScore,
    summativeAssessments
  } = params;

  const targetYear = normalizeAcademicYearValue(academicYear);
  const targetSem = normalizeSemesterValue(semester);

  const studentSummatives = (summativeAssessments || []).filter(
    (sa) =>
      sa.studentId === studentId &&
      sa.subjectId === subjectId &&
      (!classId || sa.classId === classId) &&
      normalizeAcademicYearValue(sa.academicYear) === targetYear &&
      normalizeSemesterValue(sa.semester) === targetSem
  );

  const cellValues: Record<string, string> = {};

  columns.forEach((col) => {
    if (col.kind === 'plan') {
      const matched = studentSummatives.filter((sa) => sa.planId === col.id);
      if (matched.length > 0) {
        const avg = matched.reduce((sum, sa) => sum + sa.score, 0) / matched.length;
        cellValues[col.key] = String(Math.round(clampScore0To100(avg) * 100) / 100);
      } else {
        cellValues[col.key] = '';
      }
    } else {
      const matchedDirect = studentSummatives.filter(
        (sa) => sa.chapterId === col.id && !sa.planId
      );
      if (matchedDirect.length > 0) {
        const avg = matchedDirect.reduce((sum, sa) => sum + sa.score, 0) / matchedDirect.length;
        cellValues[col.key] = String(Math.round(clampScore0To100(avg) * 100) / 100);
      } else {
        const fromScore =
          existingScore?.chapterScores?.[col.id] ?? existingScore?.sumatifMateriScores?.[col.id];
        cellValues[col.key] =
          typeof fromScore === 'number' && Number.isFinite(fromScore) ? String(fromScore) : '';
      }
    }
  });

  const sasNum = getEffectiveSasScore(existingScore);
  const sasValue = typeof sasNum === 'number' && Number.isFinite(sasNum) ? String(sasNum) : '';
  const manualFinalValue =
    typeof existingScore?.manualFinalScore === 'number' &&
    Number.isFinite(existingScore.manualFinalScore)
      ? String(existingScore.manualFinalScore)
      : '';

  const formatifNum =
    existingScore?.formatifAverage !== undefined
      ? existingScore.formatifAverage
      : existingScore?.formatifScores && Object.keys(existingScore.formatifScores).length > 0
      ? calculateFormativeAverage(existingScore.formatifScores).average
      : undefined;
  const formatifValue =
    typeof formatifNum === 'number' && Number.isFinite(formatifNum) ? String(formatifNum) : '';

  return { cellValues, sasValue, manualFinalValue, formatifValue };
}

export function computeSpreadsheetRowSummary(params: {
  student: Student;
  editState: StudentSpreadsheetEditState;
  columns: SpreadsheetScoreColumn[];
  chapters: LearningChapter[];
  existingScore?: AssessmentScore;
  weights: ResolvedSchoolWeights;
  passingCriteria: number;
  academicYears?: AcademicYearPeriod[];
  assessmentPolicy?: AssessmentPolicyConfig;
  currentUser?: User | null;
}): ComputedSpreadsheetRow {
  const {
    student,
    editState,
    columns,
    chapters,
    existingScore,
    weights,
    passingCriteria,
    academicYears = [],
    assessmentPolicy,
    currentUser
  } = params;

  const invalidMessages: string[] = [];
  const planScoresByChapter: Record<string, number[]> = {};
  const directChapterScores: Record<string, number> = {};

  columns.forEach((col) => {
    const raw = editState.cellValues[col.key] ?? '';
    const parsed = parseNumericScoreInput(raw);
    if (parsed.error) {
      invalidMessages.push(`${col.label}: ${parsed.error}`);
      return;
    }
    if (!parsed.isEmpty && parsed.value !== undefined) {
      if (col.kind === 'plan') {
        if (!planScoresByChapter[col.chapterId]) planScoresByChapter[col.chapterId] = [];
        planScoresByChapter[col.chapterId].push(parsed.value);
      } else {
        directChapterScores[col.id] = parsed.value;
      }
    }
  });

  const sasParsed = parseNumericScoreInput(editState.sasValue);
  if (sasParsed.error) {
    invalidMessages.push(`SAS: ${sasParsed.error}`);
  }
  const manualParsed = parseNumericScoreInput(editState.manualFinalValue);
  if (manualParsed.error) {
    invalidMessages.push(`Nilai Manual: ${manualParsed.error}`);
  }
  const formatifParsed = parseNumericScoreInput(editState.formatifValue ?? '');
  if (formatifParsed.error) {
    invalidMessages.push(`Formatif: ${formatifParsed.error}`);
  }

  const chapterScores: Record<string, number> = {};
  chapters.forEach((ch) => {
    const fromPlans = planScoresByChapter[ch.id];
    if (fromPlans && fromPlans.length > 0) {
      chapterScores[ch.id] =
        Math.round((fromPlans.reduce((a, b) => a + b, 0) / fromPlans.length) * 100) / 100;
    } else if (directChapterScores[ch.id] !== undefined) {
      chapterScores[ch.id] = directChapterScores[ch.id];
    }
  });

  const calc = computeStudentReportScore({
    chapters,
    chapterScores,
    sasScore: sasParsed.isEmpty ? undefined : sasParsed.value,
    formatifScore: formatifParsed.isEmpty ? undefined : formatifParsed.value,
    manualFinalScore: manualParsed.isEmpty ? undefined : manualParsed.value,
    formatifWeightPercent: weights.formatifWeightPercent,
    sumatifWeightPercent: weights.sumatifWeightPercent,
    babWeightPercent: weights.babWeightPercent,
    sasWeightPercent: weights.sasWeightPercent,
    passingCriteria,
    legacyMateriScores: existingScore?.sumatifMateriScores
  });

  const legacyCheck = checkLegacyScoreProtection({
    score: existingScore,
    academicYears,
    assessmentPolicy,
    user: currentUser
  });

  return {
    student,
    existingScore,
    isProtected: legacyCheck.isProtected,
    protectedReason: legacyCheck.reason,
    chapterScores: calc.chapterScores,
    babAverage: calc.babAverage,
    sasScore: calc.sasScore,
    formatifAverage: calc.formatifAverage,
    sumatifAverage: calc.sumatifAverage,
    rawFinalScore: calc.rawFinalScore,
    completenessStatus: calc.completenessStatus,
    manualFinalScore: manualParsed.isEmpty ? undefined : manualParsed.value,
    finalScore: calc.finalScore,
    predicate: calc.predicate,
    breakdownText: calc.breakdownText,
    missingComponentNote: calc.missingComponentNote,
    hasInvalidCells: invalidMessages.length > 0,
    invalidMessages
  };
}

export interface GuardedSpreadsheetSavePayload {
  scoresToSave: AssessmentScore[];
  summativesToSave: SummativeAssessment[];
  skippedProtectedStudents: string[];
  skippedNullScoreStudents: string[];
  invalidStudents: string[];
}

/**
 * Builds deterministic, Firestore-rules-safe batch payloads ONLY for edited (dirty) students.
 * - Preserves locked/archived legacy scores untouched.
 * - Preserves existing TP checklists and teacher descriptions.
 * - Never sends `finalScore: null` to `assessment_scores` while production `firestore.rules` enforces numeric 0–100.
 */
export function buildGuardedSpreadsheetSavePayloads(params: {
  dirtyStudentIds: Set<string>;
  rows: ComputedSpreadsheetRow[];
  editsByStudentId: Record<string, StudentSpreadsheetEditState>;
  columns: SpreadsheetScoreColumn[];
  chapters: LearningChapter[];
  subject: Subject;
  classId: string;
  className: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  weights: ResolvedSchoolWeights;
  currentUser: User;
  resolvedTeacherId?: string;
  allowAdminOverrideLocked?: boolean;
}): GuardedSpreadsheetSavePayload {
  const {
    dirtyStudentIds,
    rows,
    editsByStudentId,
    columns,
    chapters,
    subject,
    classId,
    className,
    academicYear,
    semester,
    weights,
    currentUser,
    resolvedTeacherId,
    allowAdminOverrideLocked = false
  } = params;

  const scoresToSave: AssessmentScore[] = [];
  const summativesToSave: SummativeAssessment[] = [];
  const skippedProtectedStudents: string[] = [];
  const skippedNullScoreStudents: string[] = [];
  const invalidStudents: string[] = [];

  const nowIso = new Date().toISOString();
  const todayStr = nowIso.slice(0, 10);
  const teacherId = resolvedTeacherId || currentUser.teacherId || currentUser.id || 'admin';

  rows.forEach((row) => {
    const std = row.student;
    if (!dirtyStudentIds.has(std.id)) return;

    if (row.hasInvalidCells) {
      invalidStudents.push(std.name);
      return;
    }

    if (row.isProtected && !(currentUser.role === 'admin' && allowAdminOverrideLocked)) {
      skippedProtectedStudents.push(std.name);
      return;
    }

    const edit = editsByStudentId[std.id];
    if (!edit) return;

    // 1. Build SummativeAssessment records for numeric component cells
    columns.forEach((col) => {
      const parsed = parseNumericScoreInput(edit.cellValues[col.key] ?? '');
      if (parsed.isEmpty || parsed.value === undefined) return;

      const parentChapter = chapters.find((ch) => ch.id === col.chapterId);
      const effectiveTpIds =
        col.tpIds.length > 0
          ? col.tpIds
          : parentChapter?.linkedTpIds?.length
          ? parentChapter.linkedTpIds
          : ['tp-general'];

      if (col.kind === 'plan') {
        summativesToSave.push({
          id: buildDeterministicPlanSummativeId(col.id, std.id),
          studentId: std.id,
          teacherId,
          subjectId: subject.id,
          classId,
          chapterId: col.chapterId,
          chapterCode: parentChapter?.code,
          chapterTitle: parentChapter?.title,
          planId: col.id,
          planTitle: col.label,
          tpId: effectiveTpIds[0],
          tpIds: effectiveTpIds,
          assessmentTitle: col.label,
          date: todayStr,
          technique: col.technique || 'tes tertulis',
          score: parsed.value,
          academicYear,
          semester,
          updatedAt: nowIso
        });
      } else {
        summativesToSave.push({
          id: buildDeterministicChapterSummativeId(col.id, std.id),
          studentId: std.id,
          teacherId,
          subjectId: subject.id,
          classId,
          chapterId: col.id,
          chapterCode: parentChapter?.code,
          chapterTitle: parentChapter?.title,
          tpId: effectiveTpIds[0],
          tpIds: effectiveTpIds,
          assessmentTitle: `${col.label}${col.subLabel ? `: ${col.subLabel}` : ''}`,
          date: todayStr,
          technique: col.technique || 'tes tertulis',
          score: parsed.value,
          academicYear,
          semester,
          updatedAt: nowIso
        });
      }
    });

    // 2. Build AssessmentScore ONLY when numeric 0-100 finalScore is available (production firestore.rules compatibility)
    if (row.finalScore === undefined || !Number.isFinite(row.finalScore)) {
      skippedNullScoreStudents.push(std.name);
      return;
    }

    const existing = row.existingScore;
    const stableId =
      existing?.id || buildDeterministicScoreId(std.id, subject.id, academicYear, semester);

    scoresToSave.push({
      ...(existing || {}),
      id: stableId,
      studentId: std.id,
      studentName: std.name,
      subjectId: subject.id,
      subjectName: subject.name,
      classId,
      className,
      academicYear,
      semester,
      formatifScores: existing?.formatifScores || {},
      formatifAverage: existing?.formatifAverage,
      sumatifAverage: row.sumatifAverage,
      rawFinalScore: row.rawFinalScore,
      completenessStatus: row.completenessStatus,
      chapterScores: row.chapterScores,
      sumatifMateriScores: {
        ...(existing?.sumatifMateriScores || {}),
        ...row.chapterScores
      },
      sumatifAkhirSemester: row.sasScore ?? 0,
      hasSasScore: row.sasScore !== undefined,
      babAverage: row.babAverage,
      babWeightPercent: weights.babWeightPercent,
      sasWeightPercent: weights.sasWeightPercent,
      finalScoreBreakdown: row.breakdownText,
      hasMissingComponents: Boolean(row.missingComponentNote),
      missingComponentNote: row.missingComponentNote,
      manualFinalScore: row.manualFinalScore,
      finalScore: row.finalScore,
      finalScoreStatus:
        row.manualFinalScore !== undefined
          ? 'MANUAL_OVERRIDE'
          : row.missingComponentNote
          ? 'DRAFT_INCOMPLETE'
          : 'FINAL_VALID',
      predicate: row.predicate || 'D',
      highestCompetenceDesc: existing?.highestCompetenceDesc || '',
      lowestCompetenceDesc: existing?.lowestCompetenceDesc || '',
      selectedOptimalTpIds: existing?.selectedOptimalTpIds,
      selectedImprovementTpIds: existing?.selectedImprovementTpIds,
      finalDescription: existing?.finalDescription,
      descriptionStatus: existing?.descriptionStatus || 'Belum dibuat',
      status: existing?.status === 'TERKUNCI' ? 'TERKUNCI' : 'SELESAI',
      updatedAt: nowIso,
      updatedBy: currentUser.name,
      updatedById: currentUser.id
    });
  });

  return {
    scoresToSave,
    summativesToSave,
    skippedProtectedStudents,
    skippedNullScoreStudents,
    invalidStudents
  };
}

// =============================================================================
// MODUL TAMBAHAN IMPOR: EXCEL TABLE FILE & QUICK TEXT PASTE
// =============================================================================

export interface MappedImportColumn {
  key: string; // 'sas' | 'manual' | col.key (e.g. 'plan:plan-1')
  label: string;
  fileHeader: string;
  columnIndex: number;
}

export interface StudentImportPreviewRow {
  studentId: string;
  studentName: string;
  nis: string;
  nisn: string;
  matchedBy: 'nisn' | 'nis' | 'name' | 'order' | 'none';
  isProtected?: boolean;
  importedScores: Record<string, number>;
  importedFormatif?: number;
  importedSas?: number;
  importedManualFinal?: number;
  warnings: string[];
  errors: string[];
}

export interface ExcelTableImportResult {
  sheetName: string;
  totalRowsInSheet: number;
  headerRowIndex: number;
  mappedColumns: MappedImportColumn[];
  previewRows: StudentImportPreviewRow[];
  matchedStudentsCount: number;
  totalStudentsCount: number;
  unmatchedExcelRows: Array<{ rowNumber: number; text: string; reason: string }>;
  generalWarnings: string[];
  generalErrors: string[];
}

export const normalizePersonName = (val: unknown): string =>
  String(val ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ');

/**
 * Parses raw Array-of-Arrays (from XLSX / CSV) matching against classroom students and columns.
 */
export function parseSpreadsheetTableExcelData(
  sheetAoa: any[][],
  options: {
    students: Student[];
    columns: SpreadsheetScoreColumn[];
    sheetName?: string;
  }
): ExcelTableImportResult {
  const { students, columns, sheetName = 'Sheet1' } = options;
  const generalWarnings: string[] = [];
  const generalErrors: string[] = [];
  const unmatchedExcelRows: Array<{ rowNumber: number; text: string; reason: string }> = [];

  if (!sheetAoa || sheetAoa.length === 0) {
    return {
      sheetName,
      totalRowsInSheet: 0,
      headerRowIndex: -1,
      mappedColumns: [],
      previewRows: [],
      matchedStudentsCount: 0,
      totalStudentsCount: students.length,
      unmatchedExcelRows,
      generalWarnings,
      generalErrors: ['Lembar kerja Excel kosong atau tidak memiliki baris data.']
    };
  }

  // 1. Detect header row by scanning rows 0 to 15
  let bestHeaderRowIndex = 0;
  let maxHeaderMatches = 0;

  const headerKeywords = ['NAMA', 'NAMA_SISWA', 'PESERTA_DIDIK', 'SISWA', 'NISN', 'NIS', 'SAS', 'NILAI_SAS'];
  const columnLabelsUpper = columns.map((c) => c.label.toUpperCase());

  for (let r = 0; r < Math.min(sheetAoa.length, 15); r++) {
    const row = sheetAoa[r];
    if (!Array.isArray(row)) continue;
    let matchCount = 0;
    row.forEach((cell) => {
      const cellStr = String(cell ?? '').trim().toUpperCase();
      if (!cellStr) return;
      if (headerKeywords.some((kw) => cellStr.includes(kw))) matchCount += 2;
      if (columnLabelsUpper.some((lbl) => cellStr.includes(lbl))) matchCount += 2;
      if (cellStr === 'NO' || cellStr === 'NILAI_AKHIR' || cellStr === 'PREDIKAT') matchCount += 1;
    });

    if (matchCount > maxHeaderMatches) {
      maxHeaderMatches = matchCount;
      bestHeaderRowIndex = r;
    }
  }

  const rawHeaderRow = sheetAoa[bestHeaderRowIndex] || [];
  const headers = rawHeaderRow.map((h: any) => String(h ?? '').trim());

  // 2. Identify identifier columns
  let nameCol = -1;
  let nisnCol = -1;
  let nisCol = -1;
  let sasCol = -1;
  let manualCol = -1;

  let formatifCol = -1;

  headers.forEach((h, idx) => {
    const upper = h.toUpperCase();
    if (upper.includes('NAMA') || upper.includes('SISWA') || upper.includes('PESERTA_DIDIK')) {
      if (nameCol === -1) nameCol = idx;
    } else if (upper.includes('NISN')) {
      if (nisnCol === -1) nisnCol = idx;
    } else if (upper.includes('NIS') && !upper.includes('NISN')) {
      if (nisCol === -1) nisCol = idx;
    } else if (upper.includes('REKAP_FORMATIF') || upper.includes('KKTP')) {
      // Skip non-numeric Formatif KKTP summary column so re-importing exported grid works cleanly
      if (formatifCol === -1) formatifCol = idx;
    } else if (upper.includes('SAS') || upper.includes('SUMATIF_AKHIR') || upper.includes('AKHIR_SEMESTER')) {
      if (!upper.includes('NILAI_AKHIR') || upper.includes('SAS')) {
        if (sasCol === -1) sasCol = idx;
      }
    } else if (upper.includes('MANUAL') || upper.includes('OVERRIDE')) {
      if (manualCol === -1) manualCol = idx;
    }
  });

  // 3. Map score columns to spreadsheet columns
  const mappedColumns: MappedImportColumn[] = [];
  const matchedColIndices = new Set<number>();

  columns.forEach((col) => {
    const colLabelNorm = col.label.trim().toLowerCase();
    const colSubLabelNorm = (col.subLabel || '').trim().toLowerCase();

    let matchedIndex = -1;
    // Exact or substring match
    headers.forEach((h, idx) => {
      if (matchedColIndices.has(idx) || idx === nameCol || idx === nisnCol || idx === nisCol || idx === formatifCol || idx === sasCol || idx === manualCol) return;
      const hNorm = h.toLowerCase().trim();
      if (!hNorm) return;
      const hClean = hNorm.replace(/[^a-z0-9]/g, '');
      const colClean = colLabelNorm.replace(/[^a-z0-9]/g, '');

      if (hNorm === colLabelNorm || (hClean && hClean === colClean)) {
        matchedIndex = idx;
      } else if (colLabelNorm.includes(hNorm) || hNorm.includes(colLabelNorm)) {
        matchedIndex = idx;
      } else if (colSubLabelNorm && (hNorm.includes(colSubLabelNorm) || colSubLabelNorm.includes(hNorm))) {
        matchedIndex = idx;
      }
    });

    if (matchedIndex !== -1) {
      matchedColIndices.add(matchedIndex);
      mappedColumns.push({
        key: col.key,
        label: col.label,
        fileHeader: headers[matchedIndex],
        columnIndex: matchedIndex
      });
    }
  });

  if (sasCol !== -1) {
    mappedColumns.push({
      key: 'sas',
      label: 'Nilai SAS',
      fileHeader: headers[sasCol],
      columnIndex: sasCol
    });
  }

  if (manualCol !== -1) {
    mappedColumns.push({
      key: 'manual',
      label: 'Manual Override',
      fileHeader: headers[manualCol],
      columnIndex: manualCol
    });
  }

  if (mappedColumns.length === 0) {
    generalWarnings.push(
      'Tidak ditemukan kolom nilai (Sumatif atau SAS) yang cocok dengan header lembar kerja. Pastikan nama kolom sesuai format.'
    );
  }

  // 4. Map rows to students
  const previewRowsMap = new Map<string, StudentImportPreviewRow>();
  const processedStudentIds = new Set<string>();

  for (let r = bestHeaderRowIndex + 1; r < sheetAoa.length; r++) {
    const row = sheetAoa[r];
    if (!Array.isArray(row)) continue;

    // Skip empty rows
    const hasAnyCell = row.some((c) => String(c ?? '').trim() !== '');
    if (!hasAnyCell) continue;

    const rawName = nameCol !== -1 ? String(row[nameCol] ?? '').trim() : '';
    const rawNisn = nisnCol !== -1 ? String(row[nisnCol] ?? '').trim().replace(/[^0-9]/g, '') : '';
    const rawNis = nisCol !== -1 ? String(row[nisCol] ?? '').trim().replace(/[^0-9a-zA-Z]/g, '') : '';

    let matchedStudent: Student | undefined;
    let matchedBy: StudentImportPreviewRow['matchedBy'] = 'none';

    // 1st priority: NISN
    if (rawNisn && rawNisn.length >= 4) {
      matchedStudent = students.find((st) => (st.nisn || '').replace(/[^0-9]/g, '') === rawNisn);
      if (matchedStudent) matchedBy = 'nisn';
    }

    // 2nd priority: NIS
    if (!matchedStudent && rawNis && rawNis.length >= 2) {
      matchedStudent = students.find((st) => (st.nis || '').trim() === rawNis);
      if (matchedStudent) matchedBy = 'nis';
    }

    // 3rd priority: Name match (normalized)
    if (!matchedStudent && rawName && rawName.length >= 2) {
      const normRaw = normalizePersonName(rawName);
      matchedStudent = students.find((st) => normalizePersonName(st.name) === normRaw);
      if (matchedStudent) matchedBy = 'name';
    }

    // 4th priority: Sequential match fallback if no name/nis columns exist
    if (!matchedStudent && nameCol === -1 && nisnCol === -1 && nisCol === -1) {
      const seqIndex = r - bestHeaderRowIndex - 1;
      if (seqIndex >= 0 && seqIndex < students.length) {
        matchedStudent = students[seqIndex];
        matchedBy = 'order';
      }
    }

    if (!matchedStudent) {
      unmatchedExcelRows.push({
        rowNumber: r + 1,
        text: row.filter((c) => String(c ?? '').trim() !== '').slice(0, 4).join(' | '),
        reason: 'Siswa tidak ditemukan berdasarkan NISN, NIS, maupun Nama'
      });
      continue;
    }

    if (processedStudentIds.has(matchedStudent.id)) {
      unmatchedExcelRows.push({
        rowNumber: r + 1,
        text: rawName || rawNis || rawNisn || `Baris ${r + 1}`,
        reason: `Siswa "${matchedStudent.name}" muncul lebih dari satu kali di file Excel (duplikasi dilewati)`
      });
      continue;
    }

    processedStudentIds.add(matchedStudent.id);

    const importedScores: Record<string, number> = {};
    let importedFormatif: number | undefined;
    let importedSas: number | undefined;
    let importedManualFinal: number | undefined;
    const rowErrors: string[] = [];
    const rowWarnings: string[] = [];

    mappedColumns.forEach((mc) => {
      const rawCell = row[mc.columnIndex];
      const parsed = parseNumericScoreInput(String(rawCell ?? ''));
      if (parsed.error) {
        rowErrors.push(`${mc.label}: ${parsed.error}`);
      } else if (parsed.value !== undefined) {
        if (mc.key === 'formatif') {
          importedFormatif = parsed.value;
        } else if (mc.key === 'sas') {
          importedSas = parsed.value;
        } else if (mc.key === 'manual') {
          importedManualFinal = parsed.value;
        } else {
          importedScores[mc.key] = parsed.value;
        }
      }
    });

    previewRowsMap.set(matchedStudent.id, {
      studentId: matchedStudent.id,
      studentName: matchedStudent.name,
      nis: matchedStudent.nis || '',
      nisn: matchedStudent.nisn || '',
      matchedBy,
      importedScores,
      importedFormatif,
      importedSas,
      importedManualFinal,
      warnings: rowWarnings,
      errors: rowErrors
    });
  }

  // 5. Fill remaining unmatched students
  students.forEach((st) => {
    if (!previewRowsMap.has(st.id)) {
      previewRowsMap.set(st.id, {
        studentId: st.id,
        studentName: st.name,
        nis: st.nis || '',
        nisn: st.nisn || '',
        matchedBy: 'none',
        importedScores: {},
        warnings: ['Siswa tidak ada dalam file Excel yang diunggah'],
        errors: []
      });
    }
  });

  const previewRows = students.map((st) => previewRowsMap.get(st.id)!);
  const matchedStudentsCount = processedStudentIds.size;

  return {
    sheetName,
    totalRowsInSheet: sheetAoa.length,
    headerRowIndex: bestHeaderRowIndex,
    mappedColumns,
    previewRows,
    matchedStudentsCount,
    totalStudentsCount: students.length,
    unmatchedExcelRows,
    generalWarnings,
    generalErrors
  };
}

/**
 * Parses binary Excel/CSV file buffer using xlsx library.
 */
export function parseSpreadsheetTableExcelBuffer(
  buffer: ArrayBuffer | Uint8Array,
  options: {
    students: Student[];
    columns: SpreadsheetScoreColumn[];
  }
): ExcelTableImportResult {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetNames = workbook.SheetNames || [];
    if (sheetNames.length === 0) {
      return {
        sheetName: '',
        totalRowsInSheet: 0,
        headerRowIndex: -1,
        mappedColumns: [],
        previewRows: [],
        matchedStudentsCount: 0,
        totalStudentsCount: options.students.length,
        unmatchedExcelRows: [],
        generalWarnings: [],
        generalErrors: ['File Excel tidak memiliki lembar kerja (worksheet).']
      };
    }

    // Prefer sheet named 'Pengolahan_Nilai' or 'Input_Nilai_Rapor' or fallback to 1st sheet
    const targetSheetName =
      sheetNames.find(
        (name) =>
          name.toLowerCase().includes('pengolahan') ||
          name.toLowerCase().includes('nilai') ||
          name.toLowerCase().includes('input')
      ) || sheetNames[0];

    const worksheet = workbook.Sheets[targetSheetName];
    if (!worksheet) {
      return {
        sheetName: targetSheetName,
        totalRowsInSheet: 0,
        headerRowIndex: -1,
        mappedColumns: [],
        previewRows: [],
        matchedStudentsCount: 0,
        totalStudentsCount: options.students.length,
        unmatchedExcelRows: [],
        generalWarnings: [],
        generalErrors: [`Lembar kerja "${targetSheetName}" tidak dapat dibaca.`]
      };
    }

    const sheetAoa: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false
    });

    return parseSpreadsheetTableExcelData(sheetAoa, {
      ...options,
      sheetName: targetSheetName
    });
  } catch (err: any) {
    return {
      sheetName: '',
      totalRowsInSheet: 0,
      headerRowIndex: -1,
      mappedColumns: [],
      previewRows: [],
      matchedStudentsCount: 0,
      totalStudentsCount: options.students.length,
      unmatchedExcelRows: [],
      generalWarnings: [],
      generalErrors: [`Gagal membaca file Excel: ${err?.message || 'Format tidak valid'}`]
    };
  }
}

export interface QuickTextImportOptions {
  text: string;
  students: Student[];
  targetKey: string; // 'sas' | 'manual' | col.key
  targetLabel: string;
  matchMode: 'order' | 'auto_detect';
}

export interface QuickTextImportResult {
  previewRows: StudentImportPreviewRow[];
  appliedCount: number;
  unmatchedLines: string[];
  errors: string[];
}

/**
 * Parses quick multiline text pasted into a textarea for a single column (e.g. SAS or Sumatif).
 */
export function parseQuickTextColumnScores(options: QuickTextImportOptions): QuickTextImportResult {
  const { text, students, targetKey, targetLabel, matchMode } = options;
  const clean = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawLines = clean
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const previewRowsMap = new Map<string, StudentImportPreviewRow>();
  const unmatchedLines: string[] = [];
  const errors: string[] = [];
  const processedStudentIds = new Set<string>();

  students.forEach((st) => {
    previewRowsMap.set(st.id, {
      studentId: st.id,
      studentName: st.name,
      nis: st.nis || '',
      nisn: st.nisn || '',
      matchedBy: 'none',
      importedScores: {},
      warnings: [],
      errors: []
    });
  });

  if (matchMode === 'order') {
    // Line i matches student i
    rawLines.forEach((line, idx) => {
      if (idx >= students.length) {
        unmatchedLines.push(`Baris ${idx + 1} (${line}): Melebihi jumlah ${students.length} siswa`);
        return;
      }
      const st = students[idx];
      const parsed = parseNumericScoreInput(line);
      const pr = previewRowsMap.get(st.id)!;

      if (parsed.error) {
        pr.errors.push(`${targetLabel}: ${parsed.error}`);
        errors.push(`Siswa "${st.name}": ${parsed.error}`);
      } else if (parsed.value !== undefined) {
        pr.matchedBy = 'order';
        if (targetKey === 'sas') {
          pr.importedSas = parsed.value;
        } else if (targetKey === 'manual') {
          pr.importedManualFinal = parsed.value;
        } else {
          pr.importedScores[targetKey] = parsed.value;
        }
        processedStudentIds.add(st.id);
      }
    });
  } else {
    // auto_detect: each line might contain name/nisn and a score
    rawLines.forEach((line, lineIdx) => {
      // Find numeric score token (last token or token between 0-100)
      const tokens = line.split(/[\t,;:]+|\s+/).map((t) => t.trim()).filter(Boolean);
      let scoreVal: number | undefined;
      let scoreTokenIdx = -1;

      for (let i = tokens.length - 1; i >= 0; i--) {
        const p = parseNumericScoreInput(tokens[i]);
        if (p.value !== undefined && !p.error) {
          scoreVal = p.value;
          scoreTokenIdx = i;
          break;
        }
      }

      if (scoreVal === undefined) {
        unmatchedLines.push(`Baris ${lineIdx + 1} (${line}): Tidak ditemukan angka nilai valid (0–100)`);
        return;
      }

      // Remaining line text used for matching
      const nameCandidate = tokens
        .filter((_, idx) => idx !== scoreTokenIdx)
        .join(' ')
        .trim();
      const normCandidate = normalizePersonName(nameCandidate);

      let matchedSt: Student | undefined;
      // 1. match NISN
      if (nameCandidate) {
        const digits = nameCandidate.replace(/[^0-9]/g, '');
        if (digits.length >= 4) {
          matchedSt = students.find((s) => (s.nisn || '').replace(/[^0-9]/g, '') === digits);
        }
      }
      // 2. match NIS
      if (!matchedSt && nameCandidate) {
        matchedSt = students.find((s) => s.nis && nameCandidate.includes(s.nis));
      }
      // 3. match Name
      if (!matchedSt && normCandidate.length >= 2) {
        matchedSt = students.find((s) => {
          const sNorm = normalizePersonName(s.name);
          return sNorm === normCandidate || normCandidate.includes(sNorm) || sNorm.includes(normCandidate);
        });
      }

      if (matchedSt) {
        if (processedStudentIds.has(matchedSt.id)) {
          unmatchedLines.push(`Baris ${lineIdx + 1}: Siswa "${matchedSt.name}" sudah dipetakan sebelumnya`);
          return;
        }
        processedStudentIds.add(matchedSt.id);
        const pr = previewRowsMap.get(matchedSt.id)!;
        pr.matchedBy = 'name';
        if (targetKey === 'sas') {
          pr.importedSas = scoreVal;
        } else if (targetKey === 'manual') {
          pr.importedManualFinal = scoreVal;
        } else {
          pr.importedScores[targetKey] = scoreVal;
        }
      } else {
        // Fallback to order if line index is valid
        if (lineIdx < students.length) {
          const st = students[lineIdx];
          if (!processedStudentIds.has(st.id)) {
            processedStudentIds.add(st.id);
            const pr = previewRowsMap.get(st.id)!;
            pr.matchedBy = 'order';
            if (targetKey === 'sas') {
              pr.importedSas = scoreVal;
            } else if (targetKey === 'manual') {
              pr.importedManualFinal = scoreVal;
            } else {
              pr.importedScores[targetKey] = scoreVal;
            }
            return;
          }
        }
        unmatchedLines.push(`Baris ${lineIdx + 1} (${line}): Nama siswa tidak dapat dikenali`);
      }
    });
  }

  const previewRows = students.map((st) => previewRowsMap.get(st.id)!);
  return {
    previewRows,
    appliedCount: processedStudentIds.size,
    unmatchedLines,
    errors
  };
}
