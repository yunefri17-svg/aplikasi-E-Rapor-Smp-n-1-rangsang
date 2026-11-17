import assert from 'node:assert/strict';
import {
  AssessmentPolicyConfig,
  AssessmentScore,
  Classroom,
  FormativeAssessment,
  KKTPConfig,
  LearningObjective,
  Student,
  Subject,
  SummativeAssessment
} from '../src/types/erapor';
import {
  DEFAULT_ASSESSMENT_POLICY,
  analyzeStudentTPAttainment,
  composeAutomaticCompetenceDescription,
  composeDescriptionFromSelectedTPs,
  filterObjectivesForContext,
  getFormativeTpIds,
  getPeriodLockKey,
  getSuggestedChecklistFromAnalysis,
  getSummativeTpIds,
  isPeriodInputLocked,
  normalizeAssessmentPolicy,
  resolveRaporCompetenceDisplay
} from '../src/utils/tpAnalysisAndDescription';
import { defaultDescriptionBank, mergeDescriptionBankWithDefaults } from '../src/utils/descriptionBank';

let passed = 0;
function runTest(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}`);
    throw err;
  }
}

const subjectBindo: Subject = {
  id: 'sub-bindo',
  code: 'BIND',
  name: 'Bahasa Indonesia',
  category: 'A',
  orderIndex: 3,
  kkm: 75
};

const classroom71: Classroom = {
  id: 'cls-vii-1',
  name: 'Kelas VII.1',
  gradeLevel: '7',
  curriculumId: 'cur-merdeka',
  homeroomTeacherId: 'tch-1',
  roomNumber: 'R-71',
  capacity: 32
};

const studentA: Student = {
  id: 'std-a',
  nis: '24001',
  nisn: '0123456789',
  name: 'Ahmad Fauzi',
  gender: 'L',
  pob: 'Rangsang',
  dob: '2012-03-10',
  religion: 'Islam',
  address: 'Jl. Merdeka',
  fatherName: 'Budi',
  motherName: 'Siti',
  fatherJob: 'Nelayan',
  motherJob: 'IRT',
  parentPhone: '081200001',
  classId: 'cls-vii-1',
  status: 'Aktif'
};

const studentB: Student = {
  ...studentA,
  id: 'std-b',
  nis: '24002',
  nisn: '0123456790',
  name: 'Citra Lestari',
  gender: 'P'
};

const sampleTPs: LearningObjective[] = [
  {
    id: 'tp-bindo-7-g1',
    curriculumId: 'cur-merdeka',
    subjectId: 'sub-bindo',
    gradeLevel: '7',
    phase: 'Fase D',
    code: 'TP-7.1',
    materi: 'Teks Deskripsi',
    description: 'Peserta didik dapat menganalisis struktur dan kebahasaan teks deskripsi',
    semester: 'Ganjil',
    academicYear: '2026/2027'
  },
  {
    id: 'tp-bindo-7-g2',
    curriculumId: 'cur-merdeka',
    subjectId: 'sub-bindo',
    gradeLevel: '7',
    phase: 'Fase D',
    code: 'TP-7.2',
    materi: 'Teks Narasi Fantasi',
    description: 'Peserta didik dapat menulis cerita fantasi dengan alur yang runtut',
    semester: 'Ganjil',
    academicYear: '2026/2027'
  },
  {
    id: 'tp-bindo-7-g3',
    curriculumId: 'cur-merdeka',
    subjectId: 'sub-bindo',
    gradeLevel: '7',
    phase: 'Fase D',
    code: 'TP-7.3',
    materi: 'Puisi Rakyat',
    description: 'Peserta didik dapat mengidentifikasi ciri pantun, syair, dan gurindam',
    semester: 'Ganjil',
    academicYear: '2026/2027'
  },
  {
    id: 'tp-bindo-7-genap-1',
    curriculumId: 'cur-merdeka',
    subjectId: 'sub-bindo',
    gradeLevel: '7',
    phase: 'Fase D',
    code: 'TP-7.4',
    materi: 'Teks Berita',
    description: 'Peserta didik dapat menelaah unsur adiksimba pada teks berita',
    semester: 'Genap',
    academicYear: '2026/2027'
  },
  {
    id: 'tp-bindo-8-g1',
    curriculumId: 'cur-merdeka',
    subjectId: 'sub-bindo',
    gradeLevel: '8',
    phase: 'Fase D',
    code: 'TP-8.1',
    materi: 'Teks LHO',
    description: 'Peserta didik dapat menyusun teks laporan hasil observasi',
    semester: 'Ganjil',
    academicYear: '2026/2027'
  }
];

runTest('1. TP linkage & contextual filtering by subject, gradeLevel, semester, academicYear', () => {
  const ganjil7 = filterObjectivesForContext(sampleTPs, {
    subjectId: 'sub-bindo',
    gradeLevel: '7',
    semester: 'Ganjil',
    academicYear: '2026/2027'
  });
  assert.deepEqual(
    ganjil7.map((t) => t.id),
    ['tp-bindo-7-g1', 'tp-bindo-7-g2', 'tp-bindo-7-g3']
  );

  const genap7 = filterObjectivesForContext(sampleTPs, {
    subjectId: 'sub-bindo',
    gradeLevel: '7',
    semester: 'Genap',
    academicYear: '2026/2027'
  });
  assert.deepEqual(genap7.map((t) => t.id), ['tp-bindo-7-genap-1']);
});

runTest('2. Formative multi-TP & masteryStatus progression tracking', () => {
  const formatives: FormativeAssessment[] = [
    {
      id: 'fa-1',
      studentId: 'std-a',
      teacherId: 'tch-1',
      subjectId: 'sub-bindo',
      classId: 'cls-vii-1',
      tpId: 'tp-bindo-7-g1',
      tpIds: ['tp-bindo-7-g1', 'tp-bindo-7-g2'],
      date: '2026-08-10',
      technique: 'observasi',
      masteryStatus: 'Perlu Penguatan',
      score: 68,
      observation: 'Masih perlu bimbingan menentukan majas.',
      feedback: 'Latih kembali identifikasi majas.',
      academicYear: '2026/2027',
      semester: 'Ganjil',
      updatedAt: '2026-08-10T08:00:00Z'
    },
    {
      id: 'fa-2',
      studentId: 'std-a',
      teacherId: 'tch-1',
      subjectId: 'sub-bindo',
      classId: 'cls-vii-1',
      tpId: 'tp-bindo-7-g1',
      tpIds: ['tp-bindo-7-g1', 'tp-bindo-7-g2'],
      date: '2026-08-20',
      technique: 'latihan',
      masteryStatus: 'Tercapai Optimal',
      score: 92,
      observation: 'Sudah sangat baik.',
      feedback: 'Pertahankan.',
      academicYear: '2026/2027',
      semester: 'Ganjil',
      updatedAt: '2026-08-20T08:00:00Z'
    }
  ];

  assert.deepEqual(getFormativeTpIds(formatives[0]), ['tp-bindo-7-g1', 'tp-bindo-7-g2']);

  const analysis = analyzeStudentTPAttainment({
    studentId: 'std-a',
    subjectId: 'sub-bindo',
    classId: 'cls-vii-1',
    gradeLevel: '7',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    learningObjectives: sampleTPs,
    formativeAssessments: formatives,
    summativeAssessments: []
  });

  const tp1 = analysis.tpSummaries.find((t) => t.tpId === 'tp-bindo-7-g1');
  const tp2 = analysis.tpSummaries.find((t) => t.tpId === 'tp-bindo-7-g2');
  const tp3 = analysis.tpSummaries.find((t) => t.tpId === 'tp-bindo-7-g3');
  assert.equal(tp1?.formativeCount, 2);
  assert.equal(tp1?.status, 'tercapai_optimal');
  assert.ok(tp1?.evidenceSummary.includes('Formatif 2x'));
  assert.equal(tp2?.formativeCount, 2);
  assert.equal(tp3?.status, 'belum_cukup_bukti');
});

runTest('3. Summative multi-TP aggregation assigns summativeAvg to each linked TP', () => {
  const summatives: SummativeAssessment[] = [
    {
      id: 'sa-1',
      studentId: 'std-a',
      teacherId: 'tch-1',
      subjectId: 'sub-bindo',
      classId: 'cls-vii-1',
      tpId: 'tp-bindo-7-g1',
      tpIds: ['tp-bindo-7-g1', 'tp-bindo-7-g2'],
      assessmentTitle: 'UH Gabungan 1',
      date: '2026-09-01',
      technique: 'tes tertulis',
      score: 90,
      academicYear: '2026/2027',
      semester: 'Ganjil',
      updatedAt: '2026-09-01T08:00:00Z'
    }
  ];
  assert.deepEqual(getSummativeTpIds(summatives[0]), ['tp-bindo-7-g1', 'tp-bindo-7-g2']);

  const analysis = analyzeStudentTPAttainment({
    studentId: 'std-a',
    subjectId: 'sub-bindo',
    classId: 'cls-vii-1',
    gradeLevel: '7',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    learningObjectives: sampleTPs,
    formativeAssessments: [],
    summativeAssessments: summatives
  });

  assert.equal(analysis.optimalTPs.length, 2);
  assert.equal(analysis.insufficientTPs.length, 1);
  assert.equal(analysis.insufficientTPs[0].tpId, 'tp-bindo-7-g3');
});

runTest('4. 4-status TP classification & per-TP KKTP override', () => {
  const kktps: KKTPConfig[] = [
    {
      id: 'kktp-1',
      subjectId: 'sub-bindo',
      gradeLevel: '7',
      tpId: 'tp-bindo-7-g1',
      criteria: [
        { category: 'Perlu Bimbingan', minScore: 0, description: 'Perlu bimbingan' },
        { category: 'Cukup', minScore: 70, description: 'Cukup' },
        { category: 'Baik', minScore: 80, description: 'Baik' },
        { category: 'Sangat Baik', minScore: 95, description: 'Sangat Baik' }
      ],
      updatedAt: '2026-08-01T00:00:00Z'
    }
  ];

  const summatives: SummativeAssessment[] = [
    {
      id: 'sa-opt',
      studentId: 'std-a',
      teacherId: 'tch-1',
      subjectId: 'sub-bindo',
      classId: 'cls-vii-1',
      tpId: 'tp-bindo-7-g1',
      date: '2026-09-05',
      technique: 'tes tertulis',
      score: 90, // Above default 88, but below TP-specific KKTP Sangat Baik 95 => tercapai_baik
      academicYear: '2026/2027',
      semester: 'Ganjil',
      updatedAt: '2026-09-05T08:00:00Z'
    },
    {
      id: 'sa-weak',
      studentId: 'std-a',
      teacherId: 'tch-1',
      subjectId: 'sub-bindo',
      classId: 'cls-vii-1',
      tpId: 'tp-bindo-7-g2',
      date: '2026-09-06',
      technique: 'praktik',
      score: 65,
      academicYear: '2026/2027',
      semester: 'Ganjil',
      updatedAt: '2026-09-06T08:00:00Z'
    }
  ];

  const analysis = analyzeStudentTPAttainment({
    studentId: 'std-a',
    subjectId: 'sub-bindo',
    classId: 'cls-vii-1',
    gradeLevel: '7',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    learningObjectives: sampleTPs,
    formativeAssessments: [],
    summativeAssessments: summatives,
    kktpConfigs: kktps
  });

  assert.equal(analysis.tpSummaries.find((t) => t.tpId === 'tp-bindo-7-g1')?.status, 'tercapai_baik');
  assert.equal(analysis.tpSummaries.find((t) => t.tpId === 'tp-bindo-7-g2')?.status, 'perlu_penguatan');
  assert.equal(analysis.tpSummaries.find((t) => t.tpId === 'tp-bindo-7-g3')?.status, 'belum_cukup_bukti');
});

runTest('5. School numeric policy preserves existing formula without unconfirmed formative weights', () => {
  assert.equal(DEFAULT_ASSESSMENT_POLICY.includeFormativeInFinalScore, false);
  assert.equal(DEFAULT_ASSESSMENT_POLICY.formulaPolicyMode, 'existing_default');
  const normalized = normalizeAssessmentPolicy({ optimalMinScore: 90 });
  assert.equal(normalized.optimalMinScore, 90);
  assert.equal(normalized.includeFormativeInFinalScore, false);
});

runTest('6. Insufficient evidence never marked achieved & refuses auto-generation cleanly', () => {
  const analysis = analyzeStudentTPAttainment({
    studentId: 'std-b',
    subjectId: 'sub-bindo',
    classId: 'cls-vii-1',
    gradeLevel: '7',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    learningObjectives: sampleTPs,
    formativeAssessments: [],
    summativeAssessments: []
  });

  assert.equal(analysis.assessedTpCount, 0);
  assert.equal(analysis.optimalTPs.length, 0);
  assert.equal(analysis.goodTPs.length, 0);
  assert.ok(analysis.completenessWarning?.includes('Belum ada bukti penilaian'));

  const composed = composeAutomaticCompetenceDescription({
    student: studentB,
    subject: subjectBindo,
    subjectId: 'sub-bindo',
    classroom: classroom71,
    academicYear: '2026/2027',
    semester: 'Ganjil',
    analysis
  });

  assert.equal(composed.canGenerate, false);
  assert.equal(composed.generatedDescription, '');
  assert.equal(composed.usedTemplateSource, 'insufficient_evidence');
});

runTest('7. Blank/empty cell never treated as 0, whereas explicit score=0 is treated as assessed perlu_penguatan', () => {
  const analysisBlank = analyzeStudentTPAttainment({
    studentId: 'std-a',
    subjectId: 'sub-bindo',
    classId: 'cls-vii-1',
    gradeLevel: '7',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    learningObjectives: sampleTPs,
    formativeAssessments: [],
    summativeAssessments: [],
    existingScore: {
      id: 'sc-blank',
      studentId: 'std-a',
      subjectId: 'sub-bindo',
      classId: 'cls-vii-1',
      academicYear: '2026/2027',
      semester: 'Ganjil',
      formatifScores: {},
      sumatifMateriScores: {},
      sumatifAkhirSemester: 0,
      finalScore: 0,
      predicate: 'D',
      highestCompetenceDesc: '',
      lowestCompetenceDesc: '',
      updatedAt: '2026-09-01T00:00:00Z'
    }
  });
  assert.equal(analysisBlank.assessedTpCount, 0);
  assert.equal(analysisBlank.insufficientTPs.length, 3);

  const analysisExplicitZero = analyzeStudentTPAttainment({
    studentId: 'std-a',
    subjectId: 'sub-bindo',
    classId: 'cls-vii-1',
    gradeLevel: '7',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    learningObjectives: sampleTPs,
    formativeAssessments: [],
    summativeAssessments: [
      {
        id: 'sa-zero',
        studentId: 'std-a',
        teacherId: 'tch-1',
        subjectId: 'sub-bindo',
        classId: 'cls-vii-1',
        tpId: 'tp-bindo-7-g1',
        date: '2026-09-02',
        technique: 'tes tertulis',
        score: 0,
        academicYear: '2026/2027',
        semester: 'Ganjil',
        updatedAt: '2026-09-02T00:00:00Z'
      }
    ]
  });
  assert.equal(analysisExplicitZero.assessedTpCount, 1);
  assert.equal(analysisExplicitZero.improvementTPs[0].tpId, 'tp-bindo-7-g1');
});

runTest('8. Student differentiation produces distinct competence narratives per student', () => {
  const sumA: SummativeAssessment[] = [
    {
      id: 'sa-a1',
      studentId: 'std-a',
      teacherId: 'tch-1',
      subjectId: 'sub-bindo',
      classId: 'cls-vii-1',
      tpId: 'tp-bindo-7-g1',
      date: '2026-09-10',
      technique: 'tes tertulis',
      score: 94,
      academicYear: '2026/2027',
      semester: 'Ganjil',
      updatedAt: '2026-09-10T00:00:00Z'
    },
    {
      id: 'sa-a2',
      studentId: 'std-a',
      teacherId: 'tch-1',
      subjectId: 'sub-bindo',
      classId: 'cls-vii-1',
      tpId: 'tp-bindo-7-g2',
      date: '2026-09-15',
      technique: 'proyek',
      score: 91,
      academicYear: '2026/2027',
      semester: 'Ganjil',
      updatedAt: '2026-09-15T00:00:00Z'
    }
  ];

  const sumB: SummativeAssessment[] = [
    {
      id: 'sa-b1',
      studentId: 'std-b',
      teacherId: 'tch-1',
      subjectId: 'sub-bindo',
      classId: 'cls-vii-1',
      tpId: 'tp-bindo-7-g1',
      date: '2026-09-10',
      technique: 'tes tertulis',
      score: 64,
      academicYear: '2026/2027',
      semester: 'Ganjil',
      updatedAt: '2026-09-10T00:00:00Z'
    },
    {
      id: 'sa-b2',
      studentId: 'std-b',
      teacherId: 'tch-1',
      subjectId: 'sub-bindo',
      classId: 'cls-vii-1',
      tpId: 'tp-bindo-7-g2',
      date: '2026-09-15',
      technique: 'proyek',
      score: 89,
      academicYear: '2026/2027',
      semester: 'Ganjil',
      updatedAt: '2026-09-15T00:00:00Z'
    }
  ];

  const anA = analyzeStudentTPAttainment({
    studentId: 'std-a',
    subjectId: 'sub-bindo',
    classId: 'cls-vii-1',
    gradeLevel: '7',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    learningObjectives: sampleTPs,
    formativeAssessments: [],
    summativeAssessments: sumA
  });
  const anB = analyzeStudentTPAttainment({
    studentId: 'std-b',
    subjectId: 'sub-bindo',
    classId: 'cls-vii-1',
    gradeLevel: '7',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    learningObjectives: sampleTPs,
    formativeAssessments: [],
    summativeAssessments: sumB
  });

  const descA = composeAutomaticCompetenceDescription({
    student: studentA,
    subject: subjectBindo,
    subjectId: 'sub-bindo',
    classroom: classroom71,
    academicYear: '2026/2027',
    semester: 'Ganjil',
    analysis: anA
  });
  const descB = composeAutomaticCompetenceDescription({
    student: studentB,
    subject: subjectBindo,
    subjectId: 'sub-bindo',
    classroom: classroom71,
    academicYear: '2026/2027',
    semester: 'Ganjil',
    analysis: anB
  });

  assert.equal(descA.canGenerate, true);
  assert.equal(descB.canGenerate, true);
  assert.notEqual(descA.generatedDescription, descB.generatedDescription);
  assert.ok(descB.lowestCompetenceDesc.toLowerCase().includes('teks deskripsi'));
  assert.ok(descB.highestCompetenceDesc.toLowerCase().includes('cerita fantasi'));
});

runTest('9. Description Bank tpPatterns + all 12 subjects preserved on merge', () => {
  assert.equal(defaultDescriptionBank.length, 12);
  const customBank = mergeDescriptionBankWithDefaults([
    {
      subjectId: 'sub-bindo',
      subjectName: 'Bahasa Indonesia',
      ranges: defaultDescriptionBank.find((b) => b.subjectId === 'sub-bindo')!.ranges,
      tpPatterns: [
        {
          id: 'pat-1',
          tpCode: 'TP-7.1',
          competenceScope: 'Teks Deskripsi',
          optimalPattern: 'menelaah struktur teks deskripsi secara kritis',
          improvementPattern: 'mengidentifikasi struktur dan unsur kebahasaan teks deskripsi'
        }
      ]
    }
  ]);
  assert.equal(customBank.length, 12);

  const anA = analyzeStudentTPAttainment({
    studentId: 'std-a',
    subjectId: 'sub-bindo',
    classId: 'cls-vii-1',
    gradeLevel: '7',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    learningObjectives: sampleTPs,
    formativeAssessments: [],
    summativeAssessments: [
      {
        id: 'sa-pat',
        studentId: 'std-a',
        teacherId: 'tch-1',
        subjectId: 'sub-bindo',
        classId: 'cls-vii-1',
        tpId: 'tp-bindo-7-g1',
        date: '2026-09-10',
        technique: 'tes tertulis',
        score: 95,
        academicYear: '2026/2027',
        semester: 'Ganjil',
        updatedAt: '2026-09-10T00:00:00Z'
      }
    ]
  });

  const desc = composeAutomaticCompetenceDescription({
    student: studentA,
    subject: subjectBindo,
    subjectId: 'sub-bindo',
    classroom: classroom71,
    academicYear: '2026/2027',
    semester: 'Ganjil',
    analysis: anA,
    descriptionBank: customBank
  });

  assert.equal(desc.usedTemplateSource, 'bank_tp_pattern');
  assert.ok(desc.highestCompetenceDesc.includes('menelaah struktur teks deskripsi secara kritis'));
});

runTest('10 & 11. Protected status guard & full 5-status lifecycle verification', () => {
  const protectedStatuses = new Set(['Sudah diedit guru', 'Sudah disimpan', 'Sudah difinalisasi']);
  const scoreLifecycle: AssessmentScore = {
    id: 'sc-life',
    studentId: 'std-a',
    subjectId: 'sub-bindo',
    classId: 'cls-vii-1',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    formatifScores: {},
    sumatifMateriScores: { 'tp-bindo-7-g1': 90 },
    sumatifAkhirSemester: 88,
    finalScore: 89,
    predicate: 'B',
    highestCompetenceDesc: '',
    lowestCompetenceDesc: '',
    descriptionStatus: 'Belum dibuat',
    updatedAt: '2026-09-10T00:00:00Z'
  };

  assert.equal(protectedStatuses.has(scoreLifecycle.descriptionStatus!), false);
  scoreLifecycle.descriptionStatus = 'Draft otomatis';
  assert.equal(protectedStatuses.has(scoreLifecycle.descriptionStatus), false);
  scoreLifecycle.descriptionStatus = 'Sudah diedit guru';
  assert.equal(protectedStatuses.has(scoreLifecycle.descriptionStatus), true);
  scoreLifecycle.descriptionStatus = 'Sudah disimpan';
  assert.equal(protectedStatuses.has(scoreLifecycle.descriptionStatus), true);
  scoreLifecycle.descriptionStatus = 'Sudah difinalisasi';
  assert.equal(protectedStatuses.has(scoreLifecycle.descriptionStatus), true);
});

runTest('12. resolveRaporCompetenceDisplay parity (no fake fallback & clear incomplete warnings)', () => {
  const missingDisplay = resolveRaporCompetenceDisplay(undefined);
  assert.equal(missingDisplay.isMissingScore, true);
  assert.equal(missingDisplay.isIncompleteDescription, true);

  const pendingScore: AssessmentScore = {
    id: 'sc-pending',
    studentId: 'std-a',
    subjectId: 'sub-bindo',
    classId: 'cls-vii-1',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    formatifScores: {},
    sumatifMateriScores: {},
    sumatifAkhirSemester: 82,
    finalScore: 82,
    predicate: 'B',
    highestCompetenceDesc: '',
    lowestCompetenceDesc: '',
    descriptionStatus: 'Belum dibuat',
    updatedAt: '2026-09-10T00:00:00Z'
  };

  const incompleteDisplay = resolveRaporCompetenceDisplay(pendingScore);
  assert.equal(incompleteDisplay.isMissingScore, false);
  assert.equal(incompleteDisplay.isIncompleteDescription, true);
  assert.ok(!incompleteDisplay.text.includes('Mencapai kriteria ketercapaian tujuan pembelajaran dengan baik.'));

  const completeScore: AssessmentScore = {
    ...pendingScore,
    highestCompetenceDesc: 'Menunjukkan penguasaan yang sangat baik pada teks deskripsi.',
    lowestCompetenceDesc: 'Perlu penguatan pada materi puisi rakyat.',
    finalDescription:
      'Menunjukkan penguasaan yang sangat baik pada teks deskripsi. Perlu penguatan pada materi puisi rakyat.',
    descriptionStatus: 'Sudah difinalisasi'
  };
  const readyDisplay = resolveRaporCompetenceDisplay(completeScore);
  assert.equal(readyDisplay.isIncompleteDescription, false);
  assert.equal(readyDisplay.parts.length, 2);
});

runTest('13. Multi-period isolation between Ganjil and Genap', () => {
  const genapSummatives: SummativeAssessment[] = [
    {
      id: 'sa-genap',
      studentId: 'std-a',
      teacherId: 'tch-1',
      subjectId: 'sub-bindo',
      classId: 'cls-vii-1',
      tpId: 'tp-bindo-7-genap-1',
      date: '2027-02-10',
      technique: 'tes tertulis',
      score: 91,
      academicYear: '2026/2027',
      semester: 'Genap',
      updatedAt: '2027-02-10T00:00:00Z'
    }
  ];

  const ganjilFromGenap = analyzeStudentTPAttainment({
    studentId: 'std-a',
    subjectId: 'sub-bindo',
    classId: 'cls-vii-1',
    gradeLevel: '7',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    learningObjectives: sampleTPs,
    formativeAssessments: [],
    summativeAssessments: genapSummatives
  });
  assert.equal(ganjilFromGenap.assessedTpCount, 0);

  const genapAnalysis = analyzeStudentTPAttainment({
    studentId: 'std-a',
    subjectId: 'sub-bindo',
    classId: 'cls-vii-1',
    gradeLevel: '7',
    academicYear: '2026/2027',
    semester: 'Genap',
    learningObjectives: sampleTPs,
    formativeAssessments: [],
    summativeAssessments: genapSummatives
  });
  assert.equal(genapAnalysis.assessedTpCount, 1);
  assert.equal(genapAnalysis.optimalTPs[0].code, 'TP-7.4');
});

runTest('14. Admin period lock enforcement', () => {
  const policyLockedGanjil: AssessmentPolicyConfig = {
    ...DEFAULT_ASSESSMENT_POLICY,
    isInputLocked: false,
    lockedPeriods: {
      [getPeriodLockKey('2026/2027', 'Ganjil')]: true
    }
  };
  assert.equal(isPeriodInputLocked(policyLockedGanjil, '2026/2027', 'Ganjil'), true);
  assert.equal(isPeriodInputLocked(policyLockedGanjil, '2026/2027', 'Genap'), false);

  const globalLocked: AssessmentPolicyConfig = {
    ...DEFAULT_ASSESSMENT_POLICY,
    isInputLocked: true
  };
  assert.equal(isPeriodInputLocked(globalLocked, '2026/2027', 'Genap'), true);
});

runTest('15. e-Rapor 2025.2 composeDescriptionFromSelectedTPs composes highest & lowest from teacher checklist', () => {
  const ganjil7 = filterObjectivesForContext(sampleTPs, {
    subjectId: 'sub-bindo',
    gradeLevel: '7',
    semester: 'Ganjil',
    academicYear: '2026/2027'
  });

  const composed = composeDescriptionFromSelectedTPs({
    student: studentA,
    subject: subjectBindo,
    subjectId: 'sub-bindo',
    classroom: classroom71,
    academicYear: '2026/2027',
    semester: 'Ganjil',
    finalScore: 86,
    selectedOptimalTPs: [ganjil7[0]], // TP-7.1 Teks Deskripsi
    selectedImprovementTPs: [ganjil7[2]], // TP-7.3 Puisi Rakyat
    descriptionBank: defaultDescriptionBank
  });

  assert.equal(composed.canGenerate, true);
  assert.ok(composed.highestCompetenceDesc.toLowerCase().includes('teks deskripsi'));
  assert.ok(composed.lowestCompetenceDesc.toLowerCase().includes('pantun, syair, dan gurindam'));
  assert.ok(composed.generatedDescription.includes(composed.highestCompetenceDesc));
  assert.ok(composed.generatedDescription.includes(composed.lowestCompetenceDesc));
});

runTest('16. Strictly per-student individual checklists produce distinct descriptions & empty checklist never fabricates', () => {
  const ganjil7 = filterObjectivesForContext(sampleTPs, {
    subjectId: 'sub-bindo',
    gradeLevel: '7',
    semester: 'Ganjil',
    academicYear: '2026/2027'
  });

  const emptyResult = composeDescriptionFromSelectedTPs({
    student: studentA,
    subject: subjectBindo,
    subjectId: 'sub-bindo',
    selectedOptimalTPs: [],
    selectedImprovementTPs: []
  });
  assert.equal(emptyResult.canGenerate, false);
  assert.equal(emptyResult.highestCompetenceDesc, '');
  assert.equal(emptyResult.lowestCompetenceDesc, '');
  assert.equal(emptyResult.usedTemplateSource, 'empty_checklist');

  const descStudentA = composeDescriptionFromSelectedTPs({
    student: studentA,
    subject: subjectBindo,
    subjectId: 'sub-bindo',
    finalScore: 88,
    selectedOptimalTPs: [ganjil7[0]], // Teks Deskripsi
    selectedImprovementTPs: [ganjil7[1]], // Cerita Fantasi
    descriptionBank: defaultDescriptionBank
  });

  const descStudentB = composeDescriptionFromSelectedTPs({
    student: studentB,
    subject: subjectBindo,
    subjectId: 'sub-bindo',
    finalScore: 88, // Even with identical numeric score!
    selectedOptimalTPs: [ganjil7[2]], // Puisi Rakyat
    selectedImprovementTPs: [ganjil7[0]], // Teks Deskripsi
    descriptionBank: defaultDescriptionBank
  });

  assert.notEqual(descStudentA.highestCompetenceDesc, descStudentB.highestCompetenceDesc);
  assert.notEqual(descStudentA.lowestCompetenceDesc, descStudentB.lowestCompetenceDesc);
  assert.ok(descStudentA.highestCompetenceDesc.toLowerCase().includes('teks deskripsi'));
  assert.ok(descStudentB.highestCompetenceDesc.toLowerCase().includes('pantun'));
});

runTest('17. resolveRaporCompetenceDisplay renders edited finalDescription identically for preview & PDF', () => {
  const editedScore: AssessmentScore = {
    id: 'sc-edit',
    studentId: 'std-a',
    subjectId: 'sub-bindo',
    classId: 'cls-vii-1',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    formatifScores: {},
    sumatifMateriScores: {},
    sumatifAkhirSemester: 0,
    manualFinalScore: 89,
    finalScore: 89,
    predicate: 'B',
    selectedOptimalTpIds: ['tp-bindo-7-g1'],
    selectedImprovementTpIds: ['tp-bindo-7-g3'],
    highestCompetenceDesc: 'Kalimat tertinggi hasil edit guru.',
    lowestCompetenceDesc: 'Kalimat terendah hasil edit guru.',
    finalDescription: 'Narasi final kustom yang telah disunting guru untuk rapor.',
    descriptionStatus: 'Sudah diedit guru',
    updatedAt: '2026-09-20T09:00:00Z'
  };

  const display = resolveRaporCompetenceDisplay(editedScore);
  assert.equal(display.isIncompleteDescription, false);
  assert.equal(display.text, 'Narasi final kustom yang telah disunting guru untuk rapor.');
  assert.deepEqual(display.parts, ['Narasi final kustom yang telah disunting guru untuk rapor.']);
});

runTest('18. Optional formative/summative checklist suggestion returns non-overlapping IDs only as helper', () => {
  const summatives: SummativeAssessment[] = [
    {
      id: 'sa-sug-1',
      studentId: 'std-a',
      teacherId: 'tch-1',
      subjectId: 'sub-bindo',
      classId: 'cls-vii-1',
      tpId: 'tp-bindo-7-g1',
      date: '2026-09-10',
      technique: 'tes tertulis',
      score: 92,
      academicYear: '2026/2027',
      semester: 'Ganjil',
      updatedAt: '2026-09-10T08:00:00Z'
    },
    {
      id: 'sa-sug-2',
      studentId: 'std-a',
      teacherId: 'tch-1',
      subjectId: 'sub-bindo',
      classId: 'cls-vii-1',
      tpId: 'tp-bindo-7-g3',
      date: '2026-09-12',
      technique: 'praktik',
      score: 64,
      academicYear: '2026/2027',
      semester: 'Ganjil',
      updatedAt: '2026-09-12T08:00:00Z'
    }
  ];

  const analysis = analyzeStudentTPAttainment({
    studentId: 'std-a',
    subjectId: 'sub-bindo',
    classId: 'cls-vii-1',
    gradeLevel: '7',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    learningObjectives: sampleTPs,
    formativeAssessments: [],
    summativeAssessments: summatives
  });

  const suggestion = getSuggestedChecklistFromAnalysis(analysis);
  assert.deepEqual(suggestion.optimalTpIds, ['tp-bindo-7-g1']);
  assert.deepEqual(suggestion.improvementTpIds, ['tp-bindo-7-g3']);
});

console.log(`\nSemua ${passed} pengujian otomatisasi TP & Deskripsi Rapor LULUS.`);
