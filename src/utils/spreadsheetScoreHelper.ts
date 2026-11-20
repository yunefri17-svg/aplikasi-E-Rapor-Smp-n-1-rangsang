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
  sasNonTesValue?: string;
  sasTesValue?: string;
  sasValue: string;
  manualFinalValue: string;
  formatifValue?: string;
  kktpValues?: Record<string, string>; // tpId -> '0' | '1' | ''
  showValues?: Record<string, string>; // tpId -> '0' | '1' | ''
  highestCompetenceDesc?: string;
  lowestCompetenceDesc?: string;
  formatifDirty?: boolean;
}

export interface ComputedSpreadsheetRow {
  student: Student;
  existingScore?: AssessmentScore;
  isProtected: boolean;
  protectedReason?: string;
  chapterScores: Record<string, number>;
  babAverage?: number;
  sasNonTesScore?: number;
  sasTesScore?: number;
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
  hasFormatifData: boolean;
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
      const fromScore =
        existingScore?.chapterScores?.[col.id] ?? existingScore?.sumatifMateriScores?.[col.id];
      const latestDirectTs = matchedDirect.reduce((maxTs, sa) => {
        const ts = String(sa.updatedAt || sa.date || '');
        return ts > maxTs ? ts : maxTs;
      }, '');
      const existingUpdatedAt = String(existingScore?.updatedAt || '');

      if (existingUpdatedAt && matchedDirect.length > 0 && existingUpdatedAt > latestDirectTs) {
        cellValues[col.key] =
          typeof fromScore === 'number' && Number.isFinite(fromScore) ? String(fromScore) : '';
      } else if (matchedDirect.length > 0) {
        const avg = matchedDirect.reduce((sum, sa) => sum + sa.score, 0) / matchedDirect.length;
        cellValues[col.key] = String(Math.round(clampScore0To100(avg) * 100) / 100);
      } else {
        cellValues[col.key] =
          typeof fromScore === 'number' && Number.isFinite(fromScore) ? String(fromScore) : '';
      }
    }
  });

  const sasNum = getEffectiveSasScore(existingScore);
  const hasNonTes =
    typeof existingScore?.sasNonTes === 'number' && Number.isFinite(existingScore.sasNonTes);
  const hasTes =
    typeof existingScore?.sasTes === 'number' && Number.isFinite(existingScore.sasTes);

  let sasNonTesValue = '';
  let sasTesValue = '';
  if (sasNum === undefined) {
    sasNonTesValue = hasNonTes ? String(existingScore!.sasNonTes) : '';
    sasTesValue = hasTes ? String(existingScore!.sasTes) : '';
  } else {
    let derivedFromParts: number | undefined;
    if (hasNonTes && hasTes) {
      derivedFromParts =
        Math.round(((existingScore!.sasNonTes! + existingScore!.sasTes!) / 2) * 100) / 100;
    } else if (hasNonTes) {
      derivedFromParts = existingScore!.sasNonTes!;
    } else if (hasTes) {
      derivedFromParts = existingScore!.sasTes!;
    }
    if (derivedFromParts !== undefined && Math.abs(derivedFromParts - sasNum) < 0.05) {
      sasNonTesValue = hasNonTes ? String(existingScore!.sasNonTes) : '';
      sasTesValue = hasTes ? String(existingScore!.sasTes) : '';
    } else {
      sasNonTesValue = '';
      sasTesValue = String(sasNum);
    }
  }

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

  const kktpValues: Record<string, string> = {};
  if (existingScore?.formatifKktpScores) {
    Object.entries(existingScore.formatifKktpScores).forEach(([tpId, val]) => {
      if (val === 0 || val === 1) kktpValues[tpId] = String(val);
    });
  }

  const showValues: Record<string, string> = {};
  if (existingScore?.formatifShowScores) {
    Object.entries(existingScore.formatifShowScores).forEach(([tpId, val]) => {
      if (val === 0 || val === 1) showValues[tpId] = String(val);
    });
  }

  const highestCompetenceDesc = existingScore?.highestCompetenceDesc || '';
  const lowestCompetenceDesc = existingScore?.lowestCompetenceDesc || '';

  return {
    cellValues,
    sasNonTesValue,
    sasTesValue,
    sasValue,
    manualFinalValue,
    formatifValue,
    kktpValues,
    showValues,
    highestCompetenceDesc,
    lowestCompetenceDesc,
    formatifDirty: false
  };
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

  const sasNonTesParsed = parseNumericScoreInput(editState.sasNonTesValue ?? '');
  if (sasNonTesParsed.error) {
    invalidMessages.push(`SAS Non Tes: ${sasNonTesParsed.error}`);
  }
  const sasTesParsed = parseNumericScoreInput(editState.sasTesValue ?? '');
  if (sasTesParsed.error) {
    invalidMessages.push(`SAS Tes: ${sasTesParsed.error}`);
  }
  const sasParsed = parseNumericScoreInput(editState.sasValue ?? '');
  if (sasParsed.error) {
    invalidMessages.push(`SAS: ${sasParsed.error}`);
  }

  let effectiveSasScore: number | undefined;
  if (weights.sasConducted) {
    if (!sasNonTesParsed.isEmpty && !sasTesParsed.isEmpty && sasNonTesParsed.value !== undefined && sasTesParsed.value !== undefined) {
      effectiveSasScore = Math.round(((sasNonTesParsed.value + sasTesParsed.value) / 2) * 100) / 100;
    } else if (!sasNonTesParsed.isEmpty && sasNonTesParsed.value !== undefined) {
      effectiveSasScore = sasNonTesParsed.value;
    } else if (!sasTesParsed.isEmpty && sasTesParsed.value !== undefined) {
      effectiveSasScore = sasTesParsed.value;
    } else if (!sasParsed.isEmpty && sasParsed.value !== undefined) {
      effectiveSasScore = sasParsed.value;
    }
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
    sasScore: effectiveSasScore,
    formatifScore: formatifParsed.isEmpty ? undefined : formatifParsed.value,
    manualFinalScore: manualParsed.isEmpty ? undefined : manualParsed.value,
    lingkupMateriWeightPercent: weights.lingkupMateriWeightPercent,
    babWeightPercent: weights.babWeightPercent,
    sasWeightPercent: weights.sasWeightPercent,
    sasConducted: weights.sasConducted,
    sasNotConductedPolicy: weights.sasNotConductedPolicy,
    assessmentPolicy,
    passingCriteria,
    legacyMateriScores: chapters.length > 0 ? undefined : existingScore?.sumatifMateriScores
  });

  const legacyCheck = checkLegacyScoreProtection({
    score: existingScore,
    academicYears,
    assessmentPolicy,
    user: currentUser
  });

  const hasFormatifData = Boolean(
    Object.values(editState.kktpValues || {}).some((v) => v === '0' || v === '1') ||
      Object.values(editState.showValues || {}).some((v) => v === '0' || v === '1') ||
      (editState.highestCompetenceDesc || '').trim() ||
      (editState.lowestCompetenceDesc || '').trim()
  );

  return {
    student,
    existingScore,
    isProtected: legacyCheck.isProtected,
    protectedReason: legacyCheck.reason,
    chapterScores: calc.chapterScores,
    babAverage: calc.babAverage,
    sasNonTesScore: sasNonTesParsed.isEmpty ? undefined : sasNonTesParsed.value,
    sasTesScore: sasTesParsed.isEmpty ? undefined : sasTesParsed.value,
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
    hasFormatifData,
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

    // 2. Build AssessmentScore when numeric 0-100 finalScore OR Formatif KKTP/Descriptions exist
    const existing = row.existingScore;
    const hasValidNumericFinal =
      row.finalScore !== undefined && Number.isFinite(row.finalScore);
    const shouldSaveFormatifOnly =
      !hasValidNumericFinal && (Boolean(edit.formatifDirty) || row.hasFormatifData);

    if (!hasValidNumericFinal && !shouldSaveFormatifOnly) {
      skippedNullScoreStudents.push(std.name);
      return;
    }

    const stableId =
      existing?.id || buildDeterministicScoreId(std.id, subject.id, academicYear, semester);

    // Merge Formatif KKTP (0/1) & Tampil/Tidak (0/1)
    const nextKktpScores: Record<string, number> = {
      ...(existing?.formatifKktpScores || {})
    };
    Object.entries(edit.kktpValues || {}).forEach(([tpId, raw]) => {
      if (raw === '0') nextKktpScores[tpId] = 0;
      else if (raw === '1') nextKktpScores[tpId] = 1;
      else delete nextKktpScores[tpId];
    });

    const nextShowScores: Record<string, number> = {
      ...(existing?.formatifShowScores || {})
    };
    Object.entries(edit.showValues || {}).forEach(([tpId, raw]) => {
      if (raw === '0') nextShowScores[tpId] = 0;
      else if (raw === '1') nextShowScores[tpId] = 1;
      else delete nextShowScores[tpId];
    });

    const highDesc = (
      edit.highestCompetenceDesc ?? existing?.highestCompetenceDesc ?? ''
    ).trim();
    const lowDesc = (edit.lowestCompetenceDesc ?? existing?.lowestCompetenceDesc ?? '').trim();
    const combinedDesc = edit.formatifDirty
      ? [highDesc, lowDesc].filter(Boolean).join(' ') || existing?.finalDescription || ''
      : existing?.finalDescription || [highDesc, lowDesc].filter(Boolean).join(' ') || '';
    const nextDescriptionStatus = edit.formatifDirty
      ? highDesc || lowDesc
        ? 'Sudah disimpan'
        : existing?.descriptionStatus || 'Belum dibuat'
      : existing?.descriptionStatus || (highDesc || lowDesc ? 'Sudah disimpan' : 'Belum dibuat');

    const effectiveFinalScore = hasValidNumericFinal
      ? row.finalScore!
      : existing?.finalScore ?? 0;
    const effectivePredicate = hasValidNumericFinal
      ? row.predicate || 'D'
      : existing?.predicate || 'D';

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
      formatifKktpScores: nextKktpScores,
      formatifShowScores: nextShowScores,
      formatifAverage: existing?.formatifAverage,
      sumatifAverage: row.sumatifAverage,
      rawFinalScore: row.rawFinalScore,
      completenessStatus: row.completenessStatus,
      chapterScores: row.chapterScores,
      sumatifMateriScores: {
        ...(existing?.sumatifMateriScores || {}),
        ...row.chapterScores
      },
      sumatifAkhirSemester: weights.sasConducted
        ? row.sasScore ?? 0
        : existing?.sumatifAkhirSemester ?? 0,
      hasSasScore: weights.sasConducted ? row.sasScore !== undefined : false,
      sasNonTes: weights.sasConducted ? row.sasNonTesScore : existing?.sasNonTes,
      sasTes: weights.sasConducted ? row.sasTesScore : existing?.sasTes,
      naSas: weights.sasConducted ? row.sasScore : existing?.naSas,
      babAverage: row.babAverage,
      babWeightPercent: weights.babWeightPercent,
      sasWeightPercent: weights.sasWeightPercent,
      finalScoreBreakdown: (row.breakdownText || '').slice(0, 500),
      hasMissingComponents: !hasValidNumericFinal || Boolean(row.missingComponentNote),
      missingComponentNote: (
        row.missingComponentNote ||
        (!hasValidNumericFinal ? 'Nilai Sumatif belum diisi' : '')
      )
        ? (
            row.missingComponentNote ||
            (!hasValidNumericFinal ? 'Nilai Sumatif belum diisi' : '')
          ).slice(0, 500)
        : undefined,
      manualFinalScore: row.manualFinalScore,
      finalScore: effectiveFinalScore,
      finalScoreStatus:
        row.manualFinalScore !== undefined
          ? 'MANUAL_OVERRIDE'
          : !hasValidNumericFinal || row.missingComponentNote
          ? 'DRAFT_INCOMPLETE'
          : 'FINAL_VALID',
      predicate: effectivePredicate,
      highestCompetenceDesc: highDesc,
      lowestCompetenceDesc: lowDesc,
      selectedOptimalTpIds: existing?.selectedOptimalTpIds,
      selectedImprovementTpIds: existing?.selectedImprovementTpIds,
      finalDescription: combinedDesc,
      descriptionStatus: nextDescriptionStatus,
      status:
        existing?.status === 'TERKUNCI'
          ? 'TERKUNCI'
          : hasValidNumericFinal
          ? 'SELESAI'
          : 'DALAM PROSES',
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
  importedSasNonTes?: number;
  importedSasTes?: number;
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
  let sasNonTesCol = -1;
  let sasTesCol = -1;
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
    } else if (upper.includes('REKAP_FORMATIF') || upper.includes('KKTP') || upper.includes('DESKRIPSI')) {
      // Skip non-numeric Formatif KKTP/Description columns so re-importing exported grid works cleanly
      if (formatifCol === -1) formatifCol = idx;
    } else if (upper.includes('SAS_NON_TES') || upper.includes('NON_TES') || upper.includes('NON TES')) {
      if (sasNonTesCol === -1) sasNonTesCol = idx;
    } else if (upper.includes('SAS_TES') || upper === 'SAS TES') {
      if (sasTesCol === -1) sasTesCol = idx;
    } else if (upper.includes('NA_SAS') || upper.includes('NILAI_AKHIR_SAS')) {
      // Skip derived NA_SAS if split columns exist; fallback if no sasCol yet
      if (sasCol === -1 && sasNonTesCol === -1 && sasTesCol === -1) sasCol = idx;
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
      if (
        matchedColIndices.has(idx) ||
        idx === nameCol ||
        idx === nisnCol ||
        idx === nisCol ||
        idx === formatifCol ||
        idx === sasNonTesCol ||
        idx === sasTesCol ||
        idx === sasCol ||
        idx === manualCol
      )
        return;
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

  if (sasNonTesCol !== -1) {
    mappedColumns.push({
      key: 'sas_nontes',
      label: 'SAS Non Tes',
      fileHeader: headers[sasNonTesCol],
      columnIndex: sasNonTesCol
    });
  }

  if (sasTesCol !== -1) {
    mappedColumns.push({
      key: 'sas_tes',
      label: 'SAS Tes',
      fileHeader: headers[sasTesCol],
      columnIndex: sasTesCol
    });
  }

  if (sasCol !== -1 && sasNonTesCol === -1 && sasTesCol === -1) {
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
    let importedSasNonTes: number | undefined;
    let importedSasTes: number | undefined;
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
        } else if (mc.key === 'sas_nontes') {
          importedSasNonTes = parsed.value;
        } else if (mc.key === 'sas_tes') {
          importedSasTes = parsed.value;
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
      importedSasNonTes,
      importedSasTes,
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
        if (targetKey === 'sas_nontes') {
          pr.importedSasNonTes = parsed.value;
        } else if (targetKey === 'sas_tes') {
          pr.importedSasTes = parsed.value;
        } else if (targetKey === 'sas') {
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
        if (targetKey === 'sas_nontes') {
          pr.importedSasNonTes = scoreVal;
        } else if (targetKey === 'sas_tes') {
          pr.importedSasTes = scoreVal;
        } else if (targetKey === 'sas') {
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
            if (targetKey === 'sas_nontes') {
              pr.importedSasNonTes = scoreVal;
            } else if (targetKey === 'sas_tes') {
              pr.importedSasTes = scoreVal;
            } else if (targetKey === 'sas') {
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
