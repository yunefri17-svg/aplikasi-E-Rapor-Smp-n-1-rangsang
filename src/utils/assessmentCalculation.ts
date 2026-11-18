import {
  AssessmentScore,
  Curriculum,
  LearningChapter,
  SummativeAssessment
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

export interface ResolvedSchoolWeights {
  babWeightPercent: number;
  sasWeightPercent: number;
  passingCriteria: number;
  curriculumId: string;
  formulaLabel: string;
}

export function resolveSchoolWeights(curricula: Curriculum[] = []): ResolvedSchoolWeights {
  const curMerdeka = curricula.find((c) => c.id === 'cur-merdeka') || curricula[0];
  const rawBab = Number(curMerdeka?.formatifWeight);
  const rawSas = Number(curMerdeka?.sumatifWeight);
  const babWeightPercent = Number.isFinite(rawBab) && rawBab >= 0 ? rawBab : 50;
  const sasWeightPercent = Number.isFinite(rawSas) && rawSas >= 0 ? rawSas : 100 - babWeightPercent;
  const total = babWeightPercent + sasWeightPercent;

  const normalizedBab = total > 0 ? Math.round((babWeightPercent / total) * 100) : 50;
  const normalizedSas = 100 - normalizedBab;

  return {
    babWeightPercent: normalizedBab,
    sasWeightPercent: normalizedSas,
    passingCriteria: curMerdeka?.passingCriteria || 75,
    curriculumId: curMerdeka?.id || 'cur-merdeka',
    formulaLabel: `(${normalizedBab}% × Rata-rata Nilai BAB) + (${normalizedSas}% × Nilai SAS)`
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

export interface StudentReportCalculationResult {
  chapterScores: Record<string, number>;
  babAverage: number | undefined;
  filledChapterCount: number;
  totalChapterCount: number;
  sasScore: number | undefined;
  finalScore: number | undefined;
  predicate: 'A' | 'B' | 'C' | 'D' | undefined;
  breakdownText: string;
  missingWarnings: string[];
  missingComponentNote: string | undefined;
  hasMissingComponents: boolean;
  isComplete: boolean;
}

const formatNum = (n: number): string => {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
};

export function computeStudentReportScore(params: {
  chapters: LearningChapter[];
  chapterScores?: Record<string, number>;
  sasScore?: number;
  manualFinalScore?: number;
  babWeightPercent: number;
  sasWeightPercent: number;
  passingCriteria?: number;
  legacyMateriScores?: Record<string, number>;
}): StudentReportCalculationResult {
  const {
    chapters,
    chapterScores = {},
    sasScore,
    manualFinalScore,
    babWeightPercent,
    sasWeightPercent,
    passingCriteria = 75,
    legacyMateriScores = {}
  } = params;

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

  // Legacy fallback only when no BABs have been configured yet
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
  const babAverage = rawBabAvg !== undefined ? Math.round(rawBabAvg * 10) / 10 : undefined;

  const hasSas = typeof sasScore === 'number' && Number.isFinite(sasScore);
  const cleanSas = hasSas ? clampScore0To100(sasScore!) : undefined;

  const missingWarnings: string[] = [];
  if (chapters.length === 0 && legacyValues.length === 0) {
    missingWarnings.push('Belum ada BAB Materi di modul Sumatif');
  } else if (missingChapterCodes.length > 0) {
    missingWarnings.push(`${missingChapterCodes.join(', ')} belum diisi (tidak dihitung 0)`);
  }
  if (!hasSas) {
    missingWarnings.push('Nilai SAS belum diisi (tidak dihitung 0)');
  }

  let finalScore: number | undefined;
  let breakdownText = '';

  if (typeof manualFinalScore === 'number' && Number.isFinite(manualFinalScore)) {
    finalScore = Math.round(clampScore0To100(manualFinalScore));
    breakdownText = `Input langsung Nilai Akhir oleh guru: ${finalScore}`;
  } else if (rawBabAvg !== undefined && cleanSas !== undefined) {
    const rawFinal = rawBabAvg * (babWeightPercent / 100) + cleanSas * (sasWeightPercent / 100);
    finalScore = Math.round(clampScore0To100(rawFinal));
    const sourceLabel =
      chapters.length > 0
        ? `Rata-rata ${activeMateriValues.length}/${chapters.length} BAB`
        : `Rata-rata ${activeMateriValues.length} Materi`;
    breakdownText = `(${sourceLabel}: ${formatNum(rawBabAvg)} × ${babWeightPercent}%) + (SAS: ${formatNum(
      cleanSas
    )} × ${sasWeightPercent}%) = ${formatNum(rawFinal)} → ${finalScore}`;
  } else if (rawBabAvg !== undefined) {
    finalScore = Math.round(clampScore0To100(rawBabAvg));
    breakdownText = `Sementara dari rata-rata ${activeMateriValues.length} BAB terisi (${formatNum(
      rawBabAvg
    )}) — SAS belum diisi`;
  } else if (cleanSas !== undefined) {
    finalScore = Math.round(clampScore0To100(cleanSas));
    breakdownText = `Sementara dari Nilai SAS (${formatNum(cleanSas)}) — Nilai BAB belum diisi`;
  } else {
    finalScore = undefined;
    breakdownText = 'Belum ada nilai BAB maupun SAS yang diisi.';
  }

  const predicate = finalScore !== undefined ? calculatePredicate(finalScore, passingCriteria) : undefined;
  const hasMissingComponents = missingWarnings.length > 0;
  const missingComponentNote = hasMissingComponents ? missingWarnings.join('; ') : undefined;

  return {
    chapterScores: cleanChapterScores,
    babAverage,
    filledChapterCount: filledChapterValues.length,
    totalChapterCount: chapters.length,
    sasScore: cleanSas,
    finalScore,
    predicate,
    breakdownText,
    missingWarnings,
    missingComponentNote,
    hasMissingComponents,
    isComplete: chapters.length > 0 && missingChapterCodes.length === 0 && hasSas
  };
}
