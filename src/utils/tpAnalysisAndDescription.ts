import {
  AssessmentPolicyConfig,
  AssessmentScore,
  Classroom,
  FormativeAssessment,
  FormativeMasteryStatus,
  KKTPConfig,
  LearningObjective,
  Student,
  Subject,
  SummativeAssessment,
  TPAttainmentSummary,
  TPAttainmentStatus
} from '../types/erapor';
import {
  DEFAULT_TP_PATTERNS_FALLBACK,
  SubjectDescriptionBank,
  SubjectTPDescriptionPattern,
  mergeDescriptionBankWithDefaults
} from './descriptionBank';

export const DEFAULT_ASSESSMENT_POLICY: AssessmentPolicyConfig = {
  id: 'assessment_policy',
  optimalMinScore: 88,
  goodMinScore: 75,
  needStrengtheningBelow: 75,
  minimumTpEvidenceCount: 1,
  usePerTpKktpIfConfigured: true,
  formulaPolicyMode: 'existing_default',
  confirmedFormulaNote:
    'Menggunakan rumus resmi sekolah yang berjalan: Nilai Akhir Rapor diolah dari penilaian Sumatif (50% Rata-rata Sumatif Materi + 50% SAS pada Input Nilai, atau metode Rata-rata / Pembobotan / Persentase TP pada Pengolahan Nilai Akhir). Asesmen Formatif memantau perkembangan dan bukti ketercapaian TP tanpa mengubah bobot angka rapor.',
  includeFormativeInFinalScore: false,
  isInputLocked: false,
  lockedPeriods: {},
  lockedMessage: '',
  updatedAt: '2026-07-01T00:00:00.000Z'
};

export function normalizeAssessmentPolicy(
  policy?: Partial<AssessmentPolicyConfig> | null
): AssessmentPolicyConfig {
  return {
    ...DEFAULT_ASSESSMENT_POLICY,
    ...(policy || {}),
    id: 'assessment_policy',
    optimalMinScore:
      typeof policy?.optimalMinScore === 'number' && !Number.isNaN(policy.optimalMinScore)
        ? policy.optimalMinScore
        : DEFAULT_ASSESSMENT_POLICY.optimalMinScore,
    goodMinScore:
      typeof policy?.goodMinScore === 'number' && !Number.isNaN(policy.goodMinScore)
        ? policy.goodMinScore
        : DEFAULT_ASSESSMENT_POLICY.goodMinScore,
    needStrengtheningBelow:
      typeof policy?.needStrengtheningBelow === 'number' && !Number.isNaN(policy.needStrengtheningBelow)
        ? policy.needStrengtheningBelow
        : DEFAULT_ASSESSMENT_POLICY.needStrengtheningBelow,
    minimumTpEvidenceCount:
      typeof policy?.minimumTpEvidenceCount === 'number' && policy.minimumTpEvidenceCount >= 1
        ? policy.minimumTpEvidenceCount
        : DEFAULT_ASSESSMENT_POLICY.minimumTpEvidenceCount,
    lockedPeriods: {
      ...(DEFAULT_ASSESSMENT_POLICY.lockedPeriods || {}),
      ...(policy?.lockedPeriods || {})
    }
  };
}

export function getPeriodLockKey(academicYear: string, semester: 'Ganjil' | 'Genap'): string {
  return `${String(academicYear || '').trim()}_${semester}`;
}

export function isPeriodInputLocked(
  policy: AssessmentPolicyConfig | undefined | null,
  academicYear: string,
  semester: 'Ganjil' | 'Genap'
): boolean {
  if (!policy) return false;
  if (policy.isInputLocked) return true;
  const key = getPeriodLockKey(academicYear, semester);
  return Boolean(policy.lockedPeriods?.[key]);
}

export function getFormativeTpIds(fa: FormativeAssessment): string[] {
  const list = Array.isArray(fa.tpIds) && fa.tpIds.length > 0 ? fa.tpIds : fa.tpId ? [fa.tpId] : [];
  return Array.from(new Set(list.filter(Boolean)));
}

export function getSummativeTpIds(sa: SummativeAssessment): string[] {
  const list = Array.isArray(sa.tpIds) && sa.tpIds.length > 0 ? sa.tpIds : sa.tpId ? [sa.tpId] : [];
  return Array.from(new Set(list.filter(Boolean)));
}

export function filterObjectivesForContext(
  learningObjectives: LearningObjective[],
  params: {
    subjectId: string;
    gradeLevel?: '7' | '8' | '9' | string;
    classId?: string;
    semester: 'Ganjil' | 'Genap';
    academicYear?: string;
  }
): LearningObjective[] {
  return learningObjectives.filter((tp) => {
    if (tp.subjectId !== params.subjectId) return false;
    if (tp.semester !== params.semester) return false;
    if (params.gradeLevel && String(tp.gradeLevel) !== String(params.gradeLevel)) return false;
    if (tp.classId && params.classId && tp.classId !== params.classId) return false;
    if (tp.academicYear && params.academicYear && tp.academicYear !== params.academicYear) {
      return false;
    }
    return true;
  });
}

function inferFormativeMasteryStatus(
  fa: FormativeAssessment,
  thresholds: { optimalMin: number; goodMin: number }
): FormativeMasteryStatus {
  if (fa.masteryStatus) return fa.masteryStatus;
  if (typeof fa.score === 'number' && Number.isFinite(fa.score)) {
    if (fa.score >= thresholds.optimalMin) return 'Tercapai Optimal';
    if (fa.score >= thresholds.goodMin) return 'Tercapai Baik';
    return 'Perlu Penguatan';
  }
  const text = `${fa.observation || ''} ${fa.feedback || ''}`.toLowerCase();
  if (
    text.includes('perlu penguatan') ||
    text.includes('perlu bimbingan') ||
    text.includes('belum mampu') ||
    text.includes('belum menguasai') ||
    text.includes('kesulitan') ||
    text.includes('kurang') ||
    text.includes('remedial')
  ) {
    return 'Perlu Penguatan';
  }
  if (
    text.includes('sangat baik') ||
    text.includes('optimal') ||
    text.includes('mahir') ||
    text.includes('sangat aktif') ||
    text.includes('istimewa')
  ) {
    return 'Tercapai Optimal';
  }
  return 'Tercapai Baik';
}

export interface StudentTPAttainmentResult {
  tpSummaries: TPAttainmentSummary[];
  optimalTPs: TPAttainmentSummary[];
  goodTPs: TPAttainmentSummary[];
  improvementTPs: TPAttainmentSummary[];
  insufficientTPs: TPAttainmentSummary[];
  assessedTpCount: number;
  matchedFormativeIds: string[];
  matchedSummativeIds: string[];
  matchedTpIds: string[];
  completenessWarning?: string;
}

export function analyzeStudentTPAttainment(params: {
  studentId: string;
  subjectId: string;
  classId: string;
  gradeLevel?: '7' | '8' | '9' | string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  learningObjectives: LearningObjective[];
  formativeAssessments: FormativeAssessment[];
  summativeAssessments: SummativeAssessment[];
  existingScore?: AssessmentScore;
  kktpConfigs?: KKTPConfig[];
  policy?: AssessmentPolicyConfig;
}): StudentTPAttainmentResult {
  const policy = normalizeAssessmentPolicy(params.policy);
  const contextualTPs = filterObjectivesForContext(params.learningObjectives, {
    subjectId: params.subjectId,
    gradeLevel: params.gradeLevel,
    semester: params.semester,
    academicYear: params.academicYear
  });

  const matchedFormatives = params.formativeAssessments.filter(
    (fa) =>
      fa.studentId === params.studentId &&
      fa.subjectId === params.subjectId &&
      fa.academicYear === params.academicYear &&
      fa.semester === params.semester &&
      (!fa.classId || !params.classId || fa.classId === params.classId)
  );

  const matchedSummatives = params.summativeAssessments.filter(
    (sa) =>
      sa.studentId === params.studentId &&
      sa.subjectId === params.subjectId &&
      sa.academicYear === params.academicYear &&
      sa.semester === params.semester &&
      (!sa.classId || !params.classId || sa.classId === params.classId) &&
      typeof sa.score === 'number' &&
      Number.isFinite(sa.score)
  );

  const tpSummaries: TPAttainmentSummary[] = contextualTPs.map((tp) => {
    let optimalMin = policy.optimalMinScore;
    let goodMin = policy.goodMinScore;
    let strengtheningBelow = policy.needStrengtheningBelow;

    if (policy.usePerTpKktpIfConfigured && Array.isArray(params.kktpConfigs)) {
      const kktp = params.kktpConfigs.find(
        (k) => k.subjectId === params.subjectId && k.tpId === tp.id
      );
      if (kktp && Array.isArray(kktp.criteria)) {
        const sangatBaik = kktp.criteria.find((c) => c.category === 'Sangat Baik');
        const baik = kktp.criteria.find((c) => c.category === 'Baik');
        const cukup = kktp.criteria.find((c) => c.category === 'Cukup');
        if (sangatBaik && typeof sangatBaik.minScore === 'number' && sangatBaik.minScore > 0) {
          optimalMin = sangatBaik.minScore;
        }
        if (baik && typeof baik.minScore === 'number' && baik.minScore > 0) {
          goodMin = baik.minScore;
          strengtheningBelow = baik.minScore;
        } else if (cukup && typeof cukup.minScore === 'number' && cukup.minScore > 0) {
          goodMin = cukup.minScore;
          strengtheningBelow = cukup.minScore;
        }
      }
    }

    const tpSummatives = matchedSummatives.filter((sa) => getSummativeTpIds(sa).includes(tp.id));
    const summativeScores: number[] = tpSummatives.map((sa) => sa.score);

    const legacySumVal = params.existingScore?.sumatifMateriScores?.[tp.id];
    if (
      summativeScores.length === 0 &&
      typeof legacySumVal === 'number' &&
      Number.isFinite(legacySumVal)
    ) {
      summativeScores.push(legacySumVal);
    }

    const tpFormatives = matchedFormatives.filter((fa) => getFormativeTpIds(fa).includes(tp.id));
    const formativeStatuses: FormativeMasteryStatus[] = tpFormatives.map((fa) =>
      inferFormativeMasteryStatus(fa, { optimalMin, goodMin })
    );

    const legacyFormVal = params.existingScore?.formatifScores?.[tp.id];
    if (
      formativeStatuses.length === 0 &&
      typeof legacyFormVal === 'number' &&
      Number.isFinite(legacyFormVal)
    ) {
      if (legacyFormVal >= optimalMin) formativeStatuses.push('Tercapai Optimal');
      else if (legacyFormVal >= goodMin) formativeStatuses.push('Tercapai Baik');
      else formativeStatuses.push('Perlu Penguatan');
    }

    const summativeCount = summativeScores.length;
    const formativeCount = formativeStatuses.length;
    const summativeAvg =
      summativeCount > 0
        ? Math.round((summativeScores.reduce((a, b) => a + b, 0) / summativeCount) * 10) / 10
        : undefined;

    let status: TPAttainmentStatus = 'belum_cukup_bukti';
    let evidenceSummary = 'Belum ada bukti penilaian formatif maupun sumatif pada TP ini.';

    if (summativeCount === 0 && formativeCount === 0) {
      status = 'belum_cukup_bukti';
    } else if (summativeAvg !== undefined) {
      const weakFormativeCount = formativeStatuses.filter((st) => st === 'Perlu Penguatan').length;
      if (summativeAvg < strengtheningBelow || summativeAvg < goodMin) {
        status = 'perlu_penguatan';
      } else if (summativeAvg >= optimalMin) {
        const latestFormative =
          formativeStatuses.length > 0 ? formativeStatuses[formativeStatuses.length - 1] : undefined;
        if (latestFormative === 'Perlu Penguatan' && weakFormativeCount > formativeStatuses.length / 2) {
          status = 'tercapai_baik';
        } else {
          status = 'tercapai_optimal';
        }
      } else {
        status = 'tercapai_baik';
      }

      const parts = [`Sumatif rata-rata ${summativeAvg} (${summativeCount} penilaian)`];
      if (formativeCount > 0) {
        parts.push(`Formatif ${formativeCount}x (${formativeStatuses[formativeStatuses.length - 1]})`);
      }
      evidenceSummary = parts.join(' • ');
    } else {
      const optimalHits = formativeStatuses.filter((s) => s === 'Tercapai Optimal').length;
      const goodHits = formativeStatuses.filter((s) => s === 'Tercapai Baik').length;
      const weakHits = formativeStatuses.filter((s) => s === 'Perlu Penguatan').length;
      const latest = formativeStatuses[formativeStatuses.length - 1];

      if (latest === 'Perlu Penguatan' || weakHits > optimalHits + goodHits) {
        status = 'perlu_penguatan';
      } else if (optimalHits >= goodHits && optimalHits > 0 && latest === 'Tercapai Optimal') {
        status = 'tercapai_optimal';
      } else {
        status = 'tercapai_baik';
      }
      evidenceSummary = `Formatif ${formativeCount}x (terakhir: ${latest}; nilai sumatif TP belum diinput)`;
    }

    return {
      tpId: tp.id,
      code: tp.code,
      description: tp.description,
      materi: tp.materi,
      status,
      summativeAvg,
      summativeCount,
      formativeCount,
      formativeStatuses,
      evidenceSummary
    };
  });

  const optimalTPs = tpSummaries.filter((t) => t.status === 'tercapai_optimal');
  const goodTPs = tpSummaries.filter((t) => t.status === 'tercapai_baik');
  const improvementTPs = tpSummaries.filter((t) => t.status === 'perlu_penguatan');
  const insufficientTPs = tpSummaries.filter((t) => t.status === 'belum_cukup_bukti');
  const assessedTpCount = optimalTPs.length + goodTPs.length + improvementTPs.length;

  let completenessWarning: string | undefined;
  if (contextualTPs.length === 0) {
    completenessWarning = 'Belum ada Tujuan Pembelajaran (TP) yang terdaftar untuk mapel, kelas, dan semester ini.';
  } else if (assessedTpCount === 0) {
    completenessWarning =
      'Belum ada bukti penilaian formatif maupun sumatif pada TP mana pun untuk siswa ini. Input penilaian terlebih dahulu sebelum menyusun deskripsi rapor.';
  } else if (assessedTpCount < policy.minimumTpEvidenceCount) {
    completenessWarning = `Bukti TP baru tersedia ${assessedTpCount} dari minimal ${policy.minimumTpEvidenceCount} TP (${insufficientTPs.length} TP belum memiliki bukti nilai).`;
  } else if (insufficientTPs.length > 0) {
    completenessWarning = `${insufficientTPs.length} TP belum memiliki bukti penilaian (${insufficientTPs
      .map((t) => t.code)
      .join(', ')}).`;
  }

  return {
    tpSummaries,
    optimalTPs,
    goodTPs,
    improvementTPs,
    insufficientTPs,
    assessedTpCount,
    matchedFormativeIds: matchedFormatives.map((f) => f.id),
    matchedSummativeIds: matchedSummatives.map((s) => s.id),
    matchedTpIds: contextualTPs.map((t) => t.id),
    completenessWarning
  };
}

function cleanTpPhrase(tp: { code: string; description: string }): string {
  let raw = String(tp.description || '').trim();
  raw = raw.replace(/^(peserta didik|siswa|murid)\s+(diharapkan\s+)?(dapat|mampu|terampil|bisa)\s+/i, '');
  raw = raw.replace(/[.]+$/, '').trim();
  if (!raw) return tp.code;
  if (/^[A-Z][a-z]/.test(raw)) {
    raw = raw.charAt(0).toLowerCase() + raw.slice(1);
  }
  return raw;
}

function formatIndonesianList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} dan ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, serta ${items[items.length - 1]}`;
}

function matchTpBankPattern(
  tp: { tpId?: string; id?: string; code: string; materi?: string; description: string },
  subBank?: SubjectDescriptionBank
): SubjectTPDescriptionPattern | undefined {
  const patterns = subBank?.tpPatterns;
  if (!Array.isArray(patterns) || patterns.length === 0) return undefined;

  const targetTpId = tp.tpId || tp.id;
  const byId = patterns.find((p) => p.tpId && targetTpId && p.tpId === targetTpId);
  if (byId) return byId;

  const byCode = patterns.find(
    (p) => p.tpCode && p.tpCode.trim().toLowerCase() === tp.code.trim().toLowerCase()
  );
  if (byCode) return byCode;

  const targetText = `${tp.materi || ''} ${tp.description}`.toLowerCase();
  return patterns.find(
    (p) => p.competenceScope && targetText.includes(p.competenceScope.trim().toLowerCase())
  );
}

function renderTemplate(template: string, phraseList: string): string {
  if (!template || !template.trim()) {
    return phraseList;
  }
  if (template.includes('{tps}')) {
    return template.replace(/\{tps\}/g, phraseList);
  }
  const base = template.trim().replace(/[.]+$/, '');
  return `${base} dalam ${phraseList}.`;
}

export interface ComposedDescriptionResult {
  canGenerate: boolean;
  highestCompetenceDesc: string;
  lowestCompetenceDesc: string;
  generatedDescription: string;
  completenessWarning?: string;
  usedTemplateSource: 'bank_tp_pattern' | 'bank_subject_template' | 'insufficient_evidence';
}

export function composeAutomaticCompetenceDescription(params: {
  student?: Student;
  subject?: Subject;
  subjectId: string;
  classroom?: Classroom;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  finalScore?: number;
  analysis: StudentTPAttainmentResult;
  descriptionBank?: SubjectDescriptionBank[];
  policy?: AssessmentPolicyConfig;
}): ComposedDescriptionResult {
  const bank = mergeDescriptionBankWithDefaults(params.descriptionBank);
  const subBank = bank.find((b) => b.subjectId === params.subjectId);
  const { optimalTPs, goodTPs, improvementTPs, insufficientTPs, assessedTpCount, completenessWarning } =
    params.analysis;

  if (assessedTpCount === 0) {
    return {
      canGenerate: false,
      highestCompetenceDesc: '',
      lowestCompetenceDesc: '',
      generatedDescription: '',
      completenessWarning:
        completenessWarning ||
        'Data penilaian TP belum tersedia sehingga deskripsi otomatis tidak dapat dibuat.',
      usedTemplateSource: 'insufficient_evidence'
    };
  }

  let usedPatternMatch = false;
  const formatTpPhraseWithPattern = (
    tp: TPAttainmentSummary,
    mode: 'optimal' | 'improvement'
  ): string => {
    const matched = matchTpBankPattern(tp, subBank);
    if (matched) {
      const candidate =
        mode === 'optimal' ? matched.optimalPattern?.trim() : matched.improvementPattern?.trim();
      if (candidate) {
        usedPatternMatch = true;
        return candidate.replace(/[.]+$/, '');
      }
    }
    return cleanTpPhrase(tp);
  };

  let highestCompetenceDesc = '';
  if (optimalTPs.length > 0 && goodTPs.length > 0) {
    const optList = formatIndonesianList(
      optimalTPs.map((t) => formatTpPhraseWithPattern(t, 'optimal'))
    );
    const goodList = formatIndonesianList(
      goodTPs.map((t) => formatTpPhraseWithPattern(t, 'optimal'))
    );
    const optTpl = subBank?.optimalTemplate || DEFAULT_TP_PATTERNS_FALLBACK.optimalTemplate;
    const partOpt = renderTemplate(optTpl, optList);
    highestCompetenceDesc = `${partOpt.replace(/[.]+$/, '')}, serta menunjukkan pemahaman yang baik dalam ${goodList}.`;
  } else if (optimalTPs.length > 0) {
    const optList = formatIndonesianList(
      optimalTPs.map((t) => formatTpPhraseWithPattern(t, 'optimal'))
    );
    const optTpl = subBank?.optimalTemplate || DEFAULT_TP_PATTERNS_FALLBACK.optimalTemplate;
    highestCompetenceDesc = renderTemplate(optTpl, optList);
  } else if (goodTPs.length > 0) {
    const goodList = formatIndonesianList(
      goodTPs.map((t) => formatTpPhraseWithPattern(t, 'optimal'))
    );
    const goodTpl = subBank?.goodTemplate || DEFAULT_TP_PATTERNS_FALLBACK.goodTemplate;
    highestCompetenceDesc = renderTemplate(goodTpl, goodList);
  } else {
    const baselineList = formatIndonesianList(improvementTPs.map((t) => cleanTpPhrase(t)));
    highestCompetenceDesc = `Sedang berproses membangun penguasaan dasar dalam ${baselineList} dan terus didorong meningkatkan capaian ketuntasan.`;
  }

  let lowestCompetenceDesc = '';
  if (improvementTPs.length > 0) {
    const impList = formatIndonesianList(
      improvementTPs.map((t) => formatTpPhraseWithPattern(t, 'improvement'))
    );
    const impTpl = subBank?.improvementTemplate || DEFAULT_TP_PATTERNS_FALLBACK.improvementTemplate;
    lowestCompetenceDesc = renderTemplate(impTpl, impList);
  } else if (insufficientTPs.length > 0) {
    const missingCodes = insufficientTPs.map((t) => t.code).join(', ');
    lowestCompetenceDesc = `Belum seluruh TP terukur (${missingCodes} belum memiliki bukti penilaian); diharapkan menyelesaikan seluruh asesmen untuk penguatan kompetensi menyeluruh.`;
  } else {
    lowestCompetenceDesc =
      subBank?.allOptimalFollowUpTemplate ||
      DEFAULT_TP_PATTERNS_FALLBACK.allOptimalFollowUpTemplate;
  }

  const generatedDescription = [highestCompetenceDesc, lowestCompetenceDesc]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ');

  return {
    canGenerate: true,
    highestCompetenceDesc,
    lowestCompetenceDesc,
    generatedDescription,
    completenessWarning,
    usedTemplateSource: usedPatternMatch ? 'bank_tp_pattern' : 'bank_subject_template'
  };
}

export interface ComposedChecklistDescriptionResult {
  canGenerate: boolean;
  highestCompetenceDesc: string;
  lowestCompetenceDesc: string;
  generatedDescription: string;
  completenessWarning?: string;
  usedTemplateSource: 'tp_checklist' | 'bank_tp_pattern' | 'empty_checklist';
}

export function getSuggestedChecklistFromAnalysis(
  analysis?: StudentTPAttainmentResult
): { optimalTpIds: string[]; improvementTpIds: string[] } {
  if (!analysis) return { optimalTpIds: [], improvementTpIds: [] };
  const optimalTpIds =
    analysis.optimalTPs.length > 0
      ? analysis.optimalTPs.map((t) => t.tpId)
      : analysis.goodTPs.map((t) => t.tpId);
  const improvementTpIds = analysis.improvementTPs
    .map((t) => t.tpId)
    .filter((id) => !optimalTpIds.includes(id));
  return { optimalTpIds, improvementTpIds };
}

export function composeDescriptionFromSelectedTPs(params: {
  student?: Student;
  subject?: Subject;
  subjectId: string;
  classroom?: Classroom;
  academicYear?: string;
  semester?: 'Ganjil' | 'Genap';
  finalScore?: number;
  selectedOptimalTPs: LearningObjective[];
  selectedImprovementTPs: LearningObjective[];
  descriptionBank?: SubjectDescriptionBank[];
  policy?: AssessmentPolicyConfig;
}): ComposedChecklistDescriptionResult {
  const optimalList = Array.isArray(params.selectedOptimalTPs) ? params.selectedOptimalTPs : [];
  const improvementList = Array.isArray(params.selectedImprovementTPs)
    ? params.selectedImprovementTPs.filter(
        (tp) => !optimalList.some((opt) => opt.id === tp.id)
      )
    : [];

  if (optimalList.length === 0 && improvementList.length === 0) {
    return {
      canGenerate: false,
      highestCompetenceDesc: '',
      lowestCompetenceDesc: '',
      generatedDescription: '',
      completenessWarning:
        'Checklist TP Optimal maupun TP Perlu Pendampingan belum dipilih oleh guru untuk siswa ini.',
      usedTemplateSource: 'empty_checklist'
    };
  }

  const bank = mergeDescriptionBankWithDefaults(params.descriptionBank);
  const subBank = bank.find((b) => b.subjectId === params.subjectId);
  const subjectLabel = params.subject?.name || subBank?.subjectName || 'mata pelajaran ini';

  let usedPatternMatch = false;
  const formatCheckedTp = (tp: LearningObjective, mode: 'optimal' | 'improvement'): string => {
    const matched = matchTpBankPattern(tp, subBank);
    if (matched) {
      const candidate =
        mode === 'optimal' ? matched.optimalPattern?.trim() : matched.improvementPattern?.trim();
      if (candidate) {
        usedPatternMatch = true;
        return candidate.replace(/[.]+$/, '');
      }
    }
    return cleanTpPhrase(tp);
  };

  let highestCompetenceDesc = '';
  if (optimalList.length > 0) {
    const optPhrases = formatIndonesianList(optimalList.map((t) => formatCheckedTp(t, 'optimal')));
    const optTpl =
      subBank?.optimalTemplate ||
      `Menunjukkan penguasaan yang sangat baik pada ${subjectLabel} dalam {tps}.`;
    highestCompetenceDesc = renderTemplate(optTpl, optPhrases);
  } else {
    highestCompetenceDesc = `Terus didorong mengembangkan penguasaan kompetensi pada mata pelajaran ${subjectLabel} secara bertahap.`;
  }

  let lowestCompetenceDesc = '';
  if (improvementList.length > 0) {
    const impPhrases = formatIndonesianList(
      improvementList.map((t) => formatCheckedTp(t, 'improvement'))
    );
    const impTpl =
      subBank?.improvementTemplate ||
      `Perlu pendampingan dan penguatan lebih lanjut pada ${subjectLabel} dalam {tps}.`;
    lowestCompetenceDesc = renderTemplate(impTpl, impPhrases);
  } else {
    lowestCompetenceDesc =
      subBank?.allOptimalFollowUpTemplate ||
      DEFAULT_TP_PATTERNS_FALLBACK.allOptimalFollowUpTemplate;
  }

  const generatedDescription = [highestCompetenceDesc, lowestCompetenceDesc]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ');

  return {
    canGenerate: true,
    highestCompetenceDesc,
    lowestCompetenceDesc,
    generatedDescription,
    usedTemplateSource: usedPatternMatch ? 'bank_tp_pattern' : 'tp_checklist'
  };
}

export interface RaporCompetenceDisplay {
  text: string;
  parts: string[];
  isMissingScore: boolean;
  isIncompleteDescription: boolean;
  warningText?: string;
}

export function resolveRaporCompetenceDisplay(score?: AssessmentScore): RaporCompetenceDisplay {
  if (!score) {
    const msg = 'Nilai dan deskripsi capaian kompetensi belum diinput oleh guru mata pelajaran.';
    return {
      text: msg,
      parts: [msg],
      isMissingScore: true,
      isIncompleteDescription: true,
      warningText: msg
    };
  }

  const explicitFull = String(score.finalDescription || '').trim();
  const high = String(score.highestCompetenceDesc || '').trim();
  const low = String(score.lowestCompetenceDesc || '').trim();

  if (score.descriptionStatus === 'Belum dibuat' && !explicitFull && !high && !low) {
    const msg = 'Deskripsi capaian kompetensi belum dibuat/diverifikasi guru mata pelajaran.';
    return {
      text: msg,
      parts: [msg],
      isMissingScore: false,
      isIncompleteDescription: true,
      warningText: score.completenessWarning || msg
    };
  }

  if (high || low) {
    const parts = [high, low].filter(Boolean);
    const combinedHighLow = parts.join(' ');
    if (explicitFull && explicitFull !== combinedHighLow) {
      return {
        text: explicitFull,
        parts: [explicitFull],
        isMissingScore: false,
        isIncompleteDescription: false,
        warningText: score.completenessWarning
      };
    }
    return {
      text: combinedHighLow,
      parts: parts.length > 0 ? parts : [combinedHighLow],
      isMissingScore: false,
      isIncompleteDescription: false,
      warningText: score.completenessWarning
    };
  }

  if (explicitFull) {
    return {
      text: explicitFull,
      parts: [explicitFull],
      isMissingScore: false,
      isIncompleteDescription: false,
      warningText: score.completenessWarning
    };
  }

  const msg = 'Deskripsi capaian kompetensi belum dilengkapi guru mata pelajaran.';
  return {
    text: msg,
    parts: [msg],
    isMissingScore: false,
    isIncompleteDescription: true,
    warningText: score.completenessWarning || msg
  };
}
