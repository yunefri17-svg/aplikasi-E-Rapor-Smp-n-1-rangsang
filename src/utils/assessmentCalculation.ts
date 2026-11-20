import {
  AssessmentPolicyConfig,
  AssessmentScore,
  Curriculum,
  LearningChapter,
  LearningObjective,
  SasNotConductedPolicy,
  SummativeAssessment,
  SummativeAssessmentPlan
} from '../types/erapor';
import { calculatePredicate } from '../services/storage';
import { normalizeAcademicYearValue, normalizeSemesterValue } from './electiveSubjectHelper';
import { normalizeAssessmentPolicy } from './tpAnalysisAndDescription';

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
  formatifWeightPercent: number; // Always 0% under Kurikulum Merdeka E-Rapor formula
  sumatifWeightPercent: number; // Always 100%
  configuredLingkupMateriWeightPercent: number; // Admin-configured (default 70%)
  configuredSasWeightPercent: number; // Admin-configured (default 30%)
  lingkupMateriWeightPercent: number; // Effective Lingkup Materi weight %
  babWeightPercent: number; // Effective Lingkup Materi weight % alias
  sasWeightPercent: number; // Effective SAS weight %
  sasConducted: boolean;
  sasNotConductedPolicy: SasNotConductedPolicy;
  passingCriteria: number;
  curriculumId: string;
  formulaLabel: string;
}

export function resolveSchoolWeights(
  curricula: Curriculum[] = [],
  assessmentPolicy?: Partial<AssessmentPolicyConfig> | null
): ResolvedSchoolWeights {
  const curMerdeka = curricula.find((c) => c.id === 'cur-merdeka') || curricula[0];
  const policy = normalizeAssessmentPolicy(assessmentPolicy);

  const configuredLingkup = policy.lingkupMateriWeightPercent ?? 70;
  const configuredSas = policy.sasWeightPercent ?? 30;
  const sasConducted = policy.sasConducted ?? true;
  const sasNotConductedPolicy = policy.sasNotConductedPolicy ?? 'lingkup_materi_100';

  const effectiveLingkup =
    !sasConducted && sasNotConductedPolicy === 'lingkup_materi_100' ? 100 : configuredLingkup;
  const effectiveSas =
    !sasConducted && sasNotConductedPolicy === 'lingkup_materi_100' ? 0 : configuredSas;

  let formulaLabel = `Nilai Rapor = (${effectiveLingkup}% × NA Sumatif Lingkup Materi) + (${effectiveSas}% × Nilai SAS)`;
  if (!sasConducted && sasNotConductedPolicy === 'lingkup_materi_100') {
    formulaLabel = 'SAS Tidak Dilaksanakan: Nilai Rapor = 100% × NA Sumatif Lingkup Materi';
  } else if (!sasConducted && sasNotConductedPolicy === 'keep_weight_mark_incomplete') {
    formulaLabel = `SAS Tidak Dilaksanakan (Bobot tetap ${configuredLingkup}% Lingkup Materi + ${configuredSas}% SAS — menunggu nilai/kebijakan)`;
  } else if (effectiveSas === 0) {
    formulaLabel = 'Nilai Rapor = 100% × NA Sumatif Lingkup Materi';
  }

  return {
    formatifWeightPercent: 0,
    sumatifWeightPercent: 100,
    configuredLingkupMateriWeightPercent: configuredLingkup,
    configuredSasWeightPercent: configuredSas,
    lingkupMateriWeightPercent: effectiveLingkup,
    babWeightPercent: effectiveLingkup,
    sasWeightPercent: effectiveSas,
    sasConducted,
    sasNotConductedPolicy,
    passingCriteria: curMerdeka?.passingCriteria || 75,
    curriculumId: curMerdeka?.id || 'cur-merdeka',
    formulaLabel
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
  existingScoreUpdatedAt?: string;
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

  const planGrouped: Record<string, number[]> = {};
  const directGrouped: Record<string, number[]> = {};
  const latestDirectUpdatedAt: Record<string, string> = {};

  studentSummatives.forEach((sa) => {
    const chId = sa.chapterId!;
    if (typeof sa.score !== 'number' || !Number.isFinite(sa.score)) return;
    const clamped = clampScore0To100(sa.score);
    if (sa.planId) {
      if (!planGrouped[chId]) planGrouped[chId] = [];
      planGrouped[chId].push(clamped);
    } else {
      if (!directGrouped[chId]) directGrouped[chId] = [];
      directGrouped[chId].push(clamped);
      const saTs = String(sa.updatedAt || sa.date || '');
      if (!latestDirectUpdatedAt[chId] || saTs > latestDirectUpdatedAt[chId]) {
        latestDirectUpdatedAt[chId] = saTs;
      }
    }
  });

  const result: Record<string, number> = {};
  const scoreUpdatedAt = String(params.existingScoreUpdatedAt || '');

  params.chapters.forEach((ch) => {
    const planVals = planGrouped[ch.id];
    if (planVals && planVals.length > 0) {
      result[ch.id] = Math.round((planVals.reduce((a, b) => a + b, 0) / planVals.length) * 100) / 100;
      return;
    }

    const existingVal = params.existingChapterScores?.[ch.id];
    const hasExistingVal = typeof existingVal === 'number' && Number.isFinite(existingVal);
    const directVals = directGrouped[ch.id];
    const hasDirectVals = Boolean(directVals && directVals.length > 0);
    const directTs = latestDirectUpdatedAt[ch.id] || '';

    if (scoreUpdatedAt && hasDirectVals && scoreUpdatedAt > directTs) {
      if (hasExistingVal) {
        result[ch.id] = clampScore0To100(existingVal!);
      }
      return;
    }

    if (hasDirectVals) {
      result[ch.id] = Math.round((directVals.reduce((a, b) => a + b, 0) / directVals.length) * 100) / 100;
    } else if (hasExistingVal) {
      result[ch.id] = clampScore0To100(existingVal!);
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
  effectiveBabWeightPercent: number;
  effectiveSasWeightPercent: number;
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
  formatifWeightPercent?: number; // Unused for numeric calculation
  sumatifWeightPercent?: number; // Unused for numeric calculation
  lingkupMateriWeightPercent?: number; // e.g. 70%
  babWeightPercent?: number; // Alias for lingkupMateriWeightPercent
  sasWeightPercent?: number; // e.g. 30%
  sasConducted?: boolean; // default true
  sasNotConductedPolicy?: SasNotConductedPolicy; // default 'lingkup_materi_100'
  assessmentPolicy?: Partial<AssessmentPolicyConfig> | null;
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
    passingCriteria = 75,
    legacyMateriScores = {}
  } = params;

  const resolvedWeights = resolveSchoolWeights([], params.assessmentPolicy);
  const rawBabWeight =
    params.lingkupMateriWeightPercent ??
    params.babWeightPercent ??
    resolvedWeights.configuredLingkupMateriWeightPercent;
  const clampedBabWeight = Math.min(100, Math.max(0, Math.round(rawBabWeight)));
  const clampedSasWeight =
    typeof params.sasWeightPercent === 'number' && Number.isFinite(params.sasWeightPercent)
      ? Math.min(100, Math.max(0, Math.round(params.sasWeightPercent)))
      : 100 - clampedBabWeight;

  const normalizedBabWeight =
    clampedBabWeight + clampedSasWeight === 100 ? clampedBabWeight : 100 - clampedSasWeight;
  const normalizedSasWeight = 100 - normalizedBabWeight;

  const sasConducted = params.sasConducted ?? resolvedWeights.sasConducted;
  const sasNotConductedPolicy =
    params.sasNotConductedPolicy ?? resolvedWeights.sasNotConductedPolicy;

  const effectiveBabWeightPercent =
    !sasConducted && sasNotConductedPolicy === 'lingkup_materi_100'
      ? 100
      : normalizedBabWeight;
  const effectiveSasWeightPercent =
    !sasConducted && sasNotConductedPolicy === 'lingkup_materi_100'
      ? 0
      : normalizedSasWeight;

  // 1. Optional diagnostic Formatif average (never mixed into numeric finalScore)
  const fmtRes = calculateFormativeAverage(formatifScores, formatifScore);
  const formatifAverage = fmtRes.average;

  // 2. Sumatif Lingkup Materi (BAB): only filled cells counted; explicit 0 IS counted; blank is NOT 0
  const cleanChapterScores: Record<string, number> = {};
  const filledChapterValues: number[] = [];
  const missingChapterLabels: string[] = [];

  chapters.forEach((ch, idx) => {
    const val = chapterScores[ch.id];
    if (typeof val === 'number' && Number.isFinite(val)) {
      const clamped = clampScore0To100(val);
      cleanChapterScores[ch.id] = clamped;
      filledChapterValues.push(clamped);
    } else {
      missingChapterLabels.push(ch.code || `BAB ${idx + 1}`);
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

  // 3. SAS Score (never treat blank as 0)
  const hasSas = typeof sasScore === 'number' && Number.isFinite(sasScore);
  const cleanSas = hasSas ? clampScore0To100(sasScore!) : undefined;

  // 4. Missing Component Warnings
  const missingWarnings: string[] = [];
  if (chapters.length === 0 && legacyValues.length === 0 && effectiveBabWeightPercent > 0) {
    missingWarnings.push('Belum ada nilai Sumatif Lingkup Materi (BAB)');
  } else if (missingChapterLabels.length > 0 && effectiveBabWeightPercent > 0) {
    missingWarnings.push(`${missingChapterLabels.join(', ')} belum diisi (tidak dihitung 0)`);
  }

  if (effectiveSasWeightPercent > 0 && cleanSas === undefined) {
    if (!sasConducted) {
      missingWarnings.push(
        `SAS tidak dilaksanakan (bobot SAS ${effectiveSasWeightPercent}% aktif — kebijakan tidak menganggap 0)`
      );
    } else {
      missingWarnings.push('Nilai SAS belum diisi (tidak dianggap 0)');
    }
  }

  // 5. Weighted Nilai Rapor calculation:
  // Nilai Rapor = (Rata-rata Sumatif Lingkup Materi × Bobot Lingkup Materi) + (Nilai SAS × Bobot SAS)
  let rawFinalScore: number | undefined;
  let finalScore: number | undefined;
  let sumatifAverage: number | undefined = babAverage;
  let breakdownText = '';

  if (effectiveSasWeightPercent === 0) {
    // 100% Lingkup Materi (either Admin configured 100:0 or SAS not conducted with 100% LM policy)
    if (babAverage !== undefined) {
      rawFinalScore = babAverage;
      finalScore = Math.round(clampScore0To100(rawFinalScore));
      sumatifAverage = babAverage;
      breakdownText = !sasConducted
        ? `SAS tidak dilaksanakan (Lingkup Materi 100%): ${formatScoreDecimal(babAverage)} → ${finalScore}`
        : `Lingkup Materi 100%: ${formatScoreDecimal(babAverage)} → ${finalScore}`;
    } else {
      breakdownText = 'Belum lengkap: Nilai Sumatif Lingkup Materi (BAB) belum diisi.';
    }
  } else if (effectiveBabWeightPercent === 0) {
    // 100% SAS
    if (cleanSas !== undefined) {
      rawFinalScore = cleanSas;
      finalScore = Math.round(clampScore0To100(rawFinalScore));
      sumatifAverage = cleanSas;
      breakdownText = `SAS 100%: ${formatScoreDecimal(cleanSas)} → ${finalScore}`;
    } else {
      breakdownText = 'Belum lengkap: Nilai SAS belum diisi (tidak dianggap 0).';
    }
  } else {
    // Weighted combination of Lingkup Materi & SAS
    if (babAverage !== undefined && cleanSas !== undefined) {
      rawFinalScore =
        Math.round(
          ((babAverage * effectiveBabWeightPercent + cleanSas * effectiveSasWeightPercent) / 100) *
            100
        ) / 100;
      finalScore = Math.round(clampScore0To100(rawFinalScore));
      sumatifAverage = rawFinalScore;
      breakdownText = `(${formatScoreDecimal(babAverage)} × ${effectiveBabWeightPercent}%) + (${formatScoreDecimal(
        cleanSas
      )} × ${effectiveSasWeightPercent}%) = ${formatScoreDecimal(rawFinalScore)} → ${finalScore}`;
    } else if (babAverage !== undefined && cleanSas === undefined) {
      // NEVER coerce missing SAS to 0; show provisional Lingkup Materi score clearly flagged incomplete
      rawFinalScore = babAverage;
      finalScore = Math.round(clampScore0To100(babAverage));
      sumatifAverage = babAverage;
      breakdownText = !sasConducted
        ? `Sementara dari NA Lingkup Materi (${formatScoreDecimal(babAverage)}) → ${finalScore} (SAS tidak dilaksanakan, tidak dihitung 0)`
        : `Sementara dari NA Lingkup Materi (${formatScoreDecimal(babAverage)}) → ${finalScore} (SAS belum diisi, tidak dihitung 0)`;
    } else if (babAverage === undefined && cleanSas !== undefined) {
      rawFinalScore = cleanSas;
      finalScore = Math.round(clampScore0To100(cleanSas));
      sumatifAverage = cleanSas;
      breakdownText = `Sementara dari Nilai SAS (${formatScoreDecimal(cleanSas)}) → ${finalScore} (BAB belum diisi)`;
    } else {
      rawFinalScore = undefined;
      finalScore = undefined;
      sumatifAverage = undefined;
      breakdownText = 'Belum lengkap: Nilai BAB dan SAS belum diisi (tidak dihitung 0).';
    }
  }

  if (typeof manualFinalScore === 'number' && Number.isFinite(manualFinalScore)) {
    finalScore = Math.round(clampScore0To100(manualFinalScore));
    breakdownText = `Input langsung Nilai Akhir oleh guru: ${finalScore}${
      rawFinalScore !== undefined ? ` (Kalkulasi bobot: ${formatScoreDecimal(rawFinalScore)})` : ''
    }`;
  }

  const predicate = finalScore !== undefined ? calculatePredicate(finalScore, passingCriteria) : undefined;
  const hasMissingComponents = missingWarnings.length > 0;
  const missingComponentNote = hasMissingComponents ? missingWarnings.join('; ') : undefined;

  const babRequirementMet =
    effectiveBabWeightPercent === 0 ||
    (chapters.length > 0 ? hasBab && missingChapterLabels.length === 0 : hasBab);
  const sasRequirementMet = effectiveSasWeightPercent === 0 || hasSas;
  const isComplete = babRequirementMet && sasRequirementMet;

  return {
    chapterScores: cleanChapterScores,
    babAverage,
    filledChapterCount: filledChapterValues.length,
    totalChapterCount: chapters.length,
    sasScore: cleanSas,
    formatifAverage,
    sumatifAverage,
    effectiveBabWeightPercent,
    effectiveSasWeightPercent,
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

