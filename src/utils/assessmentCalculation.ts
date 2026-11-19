import {
  AssessmentScore,
  Curriculum,
  LearningChapter,
  LearningObjective,
  SummativeAssessment,
  SummativeAssessmentPlan
} from '../types/erapor';
import { calculatePredicate } from '../services/storage';
import { normalizeAcademicYearValue, normalizeSemesterValue } from './electiveSubjectHelper';

export function sanitizePeriodSegment(val?: string | null): string {
  return String(val || '')
    .trim()
    .replace(/[\/\s#\[\]*?]/g, '_');
}

export function buildDeterministicScoreId(
  studentId: string,
  subjectId: string,
  academicYear: string,
  semester: 'Ganjil' | 'Genap'
): string {
  return `sc-${sanitizePeriodSegment(studentId)}-${sanitizePeriodSegment(subjectId)}-${sanitizePeriodSegment(
    academicYear
  )}-${sanitizePeriodSegment(semester)}`;
}

export function buildDeterministicChapterSummativeId(
  chapterId: string,
  studentId: string
): string {
  return `sa-bab-${sanitizePeriodSegment(chapterId)}-${sanitizePeriodSegment(studentId)}`.slice(0, 128);
}

export function buildLearningChapterId(
  subjectId: string,
  classId: string,
  academicYear: string,
  semester: 'Ganjil' | 'Genap',
  orderIndex: number
): string {
  const rand = Math.random().toString(36).slice(2, 6);
  return `bab-${sanitizePeriodSegment(subjectId)}-${sanitizePeriodSegment(classId)}-${sanitizePeriodSegment(
    academicYear
  )}-${sanitizePeriodSegment(semester)}-${orderIndex}-${Date.now().toString(36)}${rand}`.slice(0, 128);
}

export function buildSummativePlanId(
  subjectId: string,
  classId: string,
  academicYear: string,
  semester: 'Ganjil' | 'Genap',
  orderIndex: number
): string {
  const rand = Math.random().toString(36).slice(2, 6);
  return `sumplan-${sanitizePeriodSegment(subjectId)}-${sanitizePeriodSegment(classId)}-${sanitizePeriodSegment(
    academicYear
  )}-${sanitizePeriodSegment(semester)}-${orderIndex}-${Date.now().toString(36)}${rand}`.slice(0, 128);
}

export function clampScore0To100(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.min(100, Math.max(0, val));
}

export function filterChaptersForContext(
  chapters: LearningChapter[],
  params: {
    subjectId: string;
    classId?: string;
    academicYear: string;
    semester: 'Ganjil' | 'Genap';
  }
): LearningChapter[] {
  const targetYear = normalizeAcademicYearValue(params.academicYear);
  const targetSem = normalizeSemesterValue(params.semester);

  return (chapters || [])
    .filter((ch) => {
      if (!ch || ch.subjectId !== params.subjectId) return false;
      if (params.classId && ch.classId !== params.classId) return false;
      if (normalizeAcademicYearValue(ch.academicYear) !== targetYear) return false;
      if (normalizeSemesterValue(ch.semester) !== targetSem) return false;
      return true;
    })
    .sort((a, b) => {
      if ((a.orderIndex || 0) !== (b.orderIndex || 0)) {
        return (a.orderIndex || 0) - (b.orderIndex || 0);
      }
      return (a.code || '').localeCompare(b.code || '');
    });
}

export function filterSummativePlansForContext(
  plans: SummativeAssessmentPlan[],
  params: {
    subjectId: string;
    classId?: string;
    academicYear: string;
    semester: 'Ganjil' | 'Genap';
  }
): SummativeAssessmentPlan[] {
  const targetYear = normalizeAcademicYearValue(params.academicYear);
  const targetSem = normalizeSemesterValue(params.semester);

  return (plans || [])
    .filter((pl) => {
      if (!pl || pl.subjectId !== params.subjectId) return false;
      if (params.classId && pl.classId !== params.classId) return false;
      if (normalizeAcademicYearValue(pl.academicYear) !== targetYear) return false;
      if (normalizeSemesterValue(pl.semester) !== targetSem) return false;
      return true;
    })
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '') || (a.title || '').localeCompare(b.title || ''));
}

export function getNextChapterOrderAndCode(existingChapters: LearningChapter[]): {
  orderIndex: number;
  code: string;
} {
  const maxOrder = existingChapters.reduce((max, ch) => Math.max(max, Number(ch.orderIndex) || 0), 0);
  const nextOrder = maxOrder + 1;
  return {
    orderIndex: nextOrder,
    code: `BAB ${nextOrder}`
  };
}

export function suggestNextTpCode(
  existingObjectives: LearningObjective[],
  gradeLevel: '7' | '8' | '9' | string
): string {
  const prefix = String(gradeLevel || '7').trim();
  let maxMinor = 0;
  existingObjectives.forEach((tp) => {
    const code = String(tp.code || '').trim();
    const match = code.match(/(\d+)\.(\d+)/);
    if (match && match[1] === prefix) {
      const minor = Number(match[2]);
      if (Number.isFinite(minor) && minor > maxMinor) {
        maxMinor = minor;
      }
    }
  });
  return `TP ${prefix}.${maxMinor + 1}`;
}

export interface ResolvedSchoolWeights {
  formatifWeightPercent: number; // e.g. 50%
  sumatifWeightPercent: number; // e.g. 50%
  babWeightPercent: number; // Backward compatibility alias
  sasWeightPercent: number; // Backward compatibility alias
  passingCriteria: number;
  curriculumId: string;
  formulaLabel: string;
}

export function resolveSchoolWeights(curricula: Curriculum[] = []): ResolvedSchoolWeights {
  const curMerdeka = curricula.find((c) => c.id === 'cur-merdeka') || curricula[0];

  return {
    formatifWeightPercent: 0,
    sumatifWeightPercent: 100,
    babWeightPercent: 0,
    sasWeightPercent: 100,
    passingCriteria: curMerdeka?.passingCriteria || 75,
    curriculumId: curMerdeka?.id || 'cur-merdeka',
    formulaLabel: 'Nilai Rapor dari Asesmen Sumatif (NA Lingkup Materi + SAS)'
  };
}

export function getEffectiveSasScore(score?: Partial<AssessmentScore> | null): number | undefined {
  if (!score) return undefined;
  if (score.hasSasScore === false) return undefined;
  if (score.hasSasScore === true) {
    return typeof score.sumatifAkhirSemester === 'number' && Number.isFinite(score.sumatifAkhirSemester)
      ? score.sumatifAkhirSemester
      : undefined;
  }
  // Backward compatibility for legacy records without hasSasScore flag:
  // 0 in legacy records was placeholder default when SAS was unentered
  if (
    typeof score.sumatifAkhirSemester === 'number' &&
    Number.isFinite(score.sumatifAkhirSemester) &&
    score.sumatifAkhirSemester > 0
  ) {
    return score.sumatifAkhirSemester;
  }
  return undefined;
}

export function aggregateChapterScoresFromSummatives(params: {
  studentId: string;
  subjectId: string;
  classId?: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  chapters: LearningChapter[];
  summativeAssessments: SummativeAssessment[];
  existingChapterScores?: Record<string, number>;
}): Record<string, number> {
  const targetYear = normalizeAcademicYearValue(params.academicYear);
  const targetSem = normalizeSemesterValue(params.semester);

  const studentSummatives = (params.summativeAssessments || []).filter(
    (sa) =>
      sa.studentId === params.studentId &&
      sa.subjectId === params.subjectId &&
      (!params.classId || sa.classId === params.classId) &&
      normalizeAcademicYearValue(sa.academicYear) === targetYear &&
      normalizeSemesterValue(sa.semester) === targetSem &&
      Boolean(sa.chapterId)
  );

  const grouped: Record<string, number[]> = {};
  studentSummatives.forEach((sa) => {
    const chId = sa.chapterId!;
    if (!grouped[chId]) grouped[chId] = [];
    if (typeof sa.score === 'number' && Number.isFinite(sa.score)) {
      grouped[chId].push(clampScore0To100(sa.score));
    }
  });

  const result: Record<string, number> = {};
  params.chapters.forEach((ch) => {
    const vals = grouped[ch.id];
    if (vals && vals.length > 0) {
      result[ch.id] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    } else if (
      params.existingChapterScores &&
      typeof params.existingChapterScores[ch.id] === 'number' &&
      Number.isFinite(params.existingChapterScores[ch.id])
    ) {
      result[ch.id] = clampScore0To100(params.existingChapterScores[ch.id]);
    }
  });

  return result;
}

export const formatScoreDecimal = (n: number): string => {
  if (!Number.isFinite(n)) return '';
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded)
    ? String(rounded)
    : String(rounded).replace('.', ',');
};

export function calculateFormativeAverage(
  formatifScores?: Record<string, number> | number[] | null,
  directScore?: number | null
): {
  average?: number;
  count: number;
  scores: number[];
} {
  const vals: number[] = [];
  if (typeof directScore === 'number' && Number.isFinite(directScore)) {
    vals.push(clampScore0To100(directScore));
  }
  if (Array.isArray(formatifScores)) {
    formatifScores.forEach((v) => {
      if (typeof v === 'number' && Number.isFinite(v)) {
        vals.push(clampScore0To100(v));
      }
    });
  } else if (formatifScores && typeof formatifScores === 'object') {
    Object.values(formatifScores).forEach((v) => {
      if (typeof v === 'number' && Number.isFinite(v)) {
        vals.push(clampScore0To100(v));
      }
    });
  }

  if (vals.length === 0) {
    return { average: undefined, count: 0, scores: [] };
  }
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return {
    average: Math.round(avg * 100) / 100,
    count: vals.length,
    scores: vals
  };
}

export interface StudentReportCalculationResult {
  chapterScores: Record<string, number>;
  babAverage: number | undefined;
  filledChapterCount: number;
  totalChapterCount: number;
  sasScore: number | undefined;
  formatifAverage: number | undefined;
  sumatifAverage: number | undefined;
  rawFinalScore: number | undefined;
  finalScore: number | undefined;
  predicate: 'A' | 'B' | 'C' | 'D' | undefined;
  breakdownText: string;
  missingWarnings: string[];
  missingComponentNote: string | undefined;
  hasMissingComponents: boolean;
  isComplete: boolean;
  completenessStatus: 'LENGKAP' | 'BELUM_LENGKAP';
}

export interface ComputeStudentReportScoreParams {
  chapters: LearningChapter[];
  chapterScores?: Record<string, number>;
  sasScore?: number;
  formatifScore?: number;
  formatifScores?: Record<string, number> | number[];
  manualFinalScore?: number;
  formatifWeightPercent?: number; // default 50%
  sumatifWeightPercent?: number; // default 50%
  babWeightPercent?: number; // Backward compatibility alias
  sasWeightPercent?: number; // Backward compatibility alias
  passingCriteria?: number;
  legacyMateriScores?: Record<string, number>;
}

export function computeStudentReportScore(
  params: ComputeStudentReportScoreParams
): StudentReportCalculationResult {
  const {
    chapters,
    chapterScores = {},
    sasScore,
    formatifScore,
    formatifScores,
    manualFinalScore,
    formatifWeightPercent = 50,
    sumatifWeightPercent = 50,
    passingCriteria = 75,
    legacyMateriScores = {}
  } = params;

  // 1. Calculate Formatif Average
  const fmtRes = calculateFormativeAverage(formatifScores, formatifScore);
  const formatifAverage = fmtRes.average;

  // 2. Calculate Sumatif BABs
  const cleanChapterScores: Record<string, number> = {};
  const filledChapterValues: number[] = [];
  const missingChapterCodes: string[] = [];

  chapters.forEach((ch) => {
    const val = chapterScores[ch.id];
    if (typeof val === 'number' && Number.isFinite(val)) {
      const clamped = clampScore0To100(val);
      cleanChapterScores[ch.id] = clamped;
      filledChapterValues.push(clamped);
    } else {
      missingChapterCodes.push(ch.code || ch.title);
    }
  });

  const legacyValues =
    chapters.length === 0
      ? Object.values(legacyMateriScores).filter(
          (v): v is number => typeof v === 'number' && Number.isFinite(v)
        )
      : [];

  const activeMateriValues = filledChapterValues.length > 0 ? filledChapterValues : legacyValues;
  const hasBab = activeMateriValues.length > 0;
  const rawBabAvg = hasBab
    ? activeMateriValues.reduce((a, b) => a + b, 0) / activeMateriValues.length
    : undefined;
  const babAverage = rawBabAvg !== undefined ? Math.round(rawBabAvg * 100) / 100 : undefined;

  // 3. SAS Score
  const hasSas = typeof sasScore === 'number' && Number.isFinite(sasScore);
  const cleanSas = hasSas ? clampScore0To100(sasScore!) : undefined;

  // 4. Sumatif Components: All filled BAB scores + SAS
  const allSummativeVals: number[] = [...activeMateriValues];
  if (cleanSas !== undefined) {
    allSummativeVals.push(cleanSas);
  }

  let sumatifAverage: number | undefined;
  if (allSummativeVals.length > 0) {
    const rawSumAvg = allSummativeVals.reduce((a, b) => a + b, 0) / allSummativeVals.length;
    sumatifAverage = Math.round(rawSumAvg * 100) / 100;
  }

  // 5. Missing Component Warnings (Formatif uses KKTP 0/1 & Tampil for descriptions; SAS is optional)
  const missingWarnings: string[] = [];
  if (chapters.length === 0 && legacyValues.length === 0 && !hasSas) {
    missingWarnings.push('Belum ada nilai Sumatif Lingkup Materi');
  } else if (missingChapterCodes.length > 0) {
    missingWarnings.push(`${missingChapterCodes.join(', ')} belum diisi (tidak dihitung 0)`);
  }

  // 6. Calculate Final Score from Summative components (NA Sumatif Lingkup Materi & optional SAS)
  let finalScore: number | undefined;
  let rawFinalScore: number | undefined;
  let breakdownText = '';

  if (sumatifAverage !== undefined) {
    rawFinalScore = sumatifAverage;
    finalScore = Math.round(clampScore0To100(sumatifAverage));
    breakdownText = hasSas
      ? `Nilai Rapor dari Asesmen Sumatif (Lingkup Materi + SAS): ${formatScoreDecimal(rawFinalScore)} → ${finalScore}`
      : `Nilai Rapor dari NA Sumatif Lingkup Materi (Tanpa SAS): ${formatScoreDecimal(rawFinalScore)} → ${finalScore}`;
  } else {
    rawFinalScore = undefined;
    finalScore = undefined;
    breakdownText = 'Belum lengkap: Nilai Sumatif Lingkup Materi belum diisi (tidak dihitung 0).';
  }

  if (typeof manualFinalScore === 'number' && Number.isFinite(manualFinalScore)) {
    finalScore = Math.round(clampScore0To100(manualFinalScore));
    breakdownText = `Input langsung Nilai Akhir oleh guru: ${finalScore}${rawFinalScore !== undefined ? ` (Otomatis kalkulasi: ${formatScoreDecimal(rawFinalScore)})` : ''}`;
  }

  const predicate = finalScore !== undefined ? calculatePredicate(finalScore, passingCriteria) : undefined;
  const hasMissingComponents = missingWarnings.length > 0;
  const missingComponentNote = hasMissingComponents ? missingWarnings.join('; ') : undefined;
  const isComplete =
    chapters.length > 0
      ? hasBab && missingChapterCodes.length === 0
      : hasBab || hasSas;

  return {
    chapterScores: cleanChapterScores,
    babAverage,
    filledChapterCount: filledChapterValues.length,
    totalChapterCount: chapters.length,
    sasScore: cleanSas,
    formatifAverage,
    sumatifAverage,
    rawFinalScore,
    finalScore,
    predicate,
    breakdownText,
    missingWarnings,
    missingComponentNote,
    hasMissingComponents,
    isComplete,
    completenessStatus: isComplete ? 'LENGKAP' : 'BELUM_LENGKAP'
  };
}
