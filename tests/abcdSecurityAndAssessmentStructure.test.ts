import assert from 'node:assert/strict';
import {
  AcademicYearPeriod,
  AssessmentPolicyConfig,
  AssessmentScore,
  AuthSessionContext,
  Curriculum,
  FormativeAssessment,
  LearningChapter,
  LearningObjective,
  SummativeAssessment,
  SummativeAssessmentPlan,
  Teacher,
  TeachingAssignment,
  User
} from '../src/types/erapor';
import {
  authorizeSensitiveAdminAction,
  authorizeSubjectAssessmentWrite,
  checkLearningChapterInUse,
  checkLearningObjectiveInUse,
  checkLegacyScoreProtection,
  checkSummativePlanInUse,
  detectScoreServerConflict,
  getAuthVerificationNotice,
  getAuthorizedSubjectClassIds,
  hasActiveTeachingAssignment,
  isObjectiveVisibleInContext
} from '../src/utils/authorizationGuard';
import { sanitizeUserForPublicProfile } from '../src/services/authService';
import {
  buildDeterministicScoreId,
  computeStudentReportScore,
  filterSummativePlansForContext,
  resolveSchoolWeights,
  suggestNextTpCode
} from '../src/utils/assessmentCalculation';
import { filterObjectivesForContext } from '../src/utils/tpAnalysisAndDescription';

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

const teachers: Teacher[] = [
  {
    id: 'tch-mtk',
    nip: '198801012015011001',
    nuptk: '10000001',
    name: 'Guru Matematika, S.Pd',
    degree: 'S.Pd',
    gender: 'L',
    education: 'S1',
    employmentStatus: 'PNS',
    position: 'Guru Mapel',
    phone: '0812',
    email: 'mtk@smpn1rangsang.sch.id',
    subjectsTaught: ['sub-mtk'],
    isHomeroom: false
  },
  {
    id: 'tch-wk7a',
    nip: '198902022016022002',
    nuptk: '10000002',
    name: 'Wali Kelas 7A, S.Pd',
    degree: 'S.Pd',
    gender: 'P',
    education: 'S1',
    employmentStatus: 'PNS',
    position: 'Wali Kelas',
    phone: '0813',
    email: 'wk7a@smpn1rangsang.sch.id',
    subjectsTaught: ['sub-ips'],
    isHomeroom: true,
    homeroomClassId: 'cls-7a'
  }
];

const teachingAssignments: TeachingAssignment[] = [
  {
    id: 'ta-mtk-7a',
    teacherId: 'tch-mtk',
    teacherName: 'Guru Matematika, S.Pd',
    subjectId: 'sub-mtk',
    classId: 'cls-7a',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    status: 'active'
  },
  {
    id: 'ta-mtk-7b-inactive',
    teacherId: 'tch-mtk',
    teacherName: 'Guru Matematika, S.Pd',
    subjectId: 'sub-mtk',
    classId: 'cls-7b',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    status: 'inactive'
  },
  {
    id: 'ta-ips-wk7a',
    teacherId: 'tch-wk7a',
    teacherName: 'Wali Kelas 7A, S.Pd',
    subjectId: 'sub-ips',
    classId: 'cls-7a',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    status: 'active'
  }
];

const adminUser: User = {
  id: 'u-admin',
  username: 'admin',
  name: 'Administrator',
  role: 'admin',
  status: 'active',
  password: 'secretAdminPassword123'
};

const guruUser: User = {
  id: 'u-mtk',
  username: 'guru_mtk',
  name: 'Guru Matematika, S.Pd',
  role: 'guru',
  teacherId: 'tch-mtk',
  status: 'active',
  password: 'pass12'
};

const wkUser: User = {
  id: 'u-wk7a',
  username: 'wk_7a',
  name: 'Wali Kelas 7A, S.Pd',
  role: 'walikelas',
  teacherId: 'tch-wk7a',
  classId: 'cls-7a',
  status: 'active',
  password: 'pass12'
};

const kepsekUser: User = {
  id: 'u-kepsek',
  username: 'kepsek',
  name: 'Kepala Sekolah',
  role: 'kepsek',
  status: 'active',
  password: 'pass12'
};

const verifiedGuruCtx: AuthSessionContext = {
  firebaseUid: 'fb-uid-guru-1',
  verificationStatus: 'verified_password',
  providerId: 'password',
  boundUserId: 'u-mtk',
  boundRole: 'guru'
};

const fallbackAdminCtx: AuthSessionContext = {
  firebaseUid: 'fb-anon-1',
  verificationStatus: 'unverified_anonymous_fallback',
  providerId: 'anonymous',
  boundUserId: 'u-admin',
  boundRole: 'admin'
};

runTest('RBAC: kepsek is strictly read-only on TP, BAB, Summative, and Score writes', () => {
  const res = authorizeSubjectAssessmentWrite({
    user: kepsekUser,
    subjectId: 'sub-mtk',
    classId: 'cls-7a',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    teachers,
    teachingAssignments
  });
  assert.equal(res.allowed, false);
  assert.equal(res.readOnly, true);
});

runTest('RBAC & teaching_assignments: guru allowed only on active assigned subject/class/period', () => {
  const allowedRes = authorizeSubjectAssessmentWrite({
    user: guruUser,
    subjectId: 'sub-mtk',
    classId: 'cls-7a',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    teachers,
    teachingAssignments,
    authContext: verifiedGuruCtx
  });
  assert.equal(allowedRes.allowed, true);

  const inactiveClass = authorizeSubjectAssessmentWrite({
    user: guruUser,
    subjectId: 'sub-mtk',
    classId: 'cls-7b',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    teachers,
    teachingAssignments,
    authContext: verifiedGuruCtx
  });
  assert.equal(inactiveClass.allowed, false);

  const unassignedSubject = authorizeSubjectAssessmentWrite({
    user: guruUser,
    subjectId: 'sub-ipa',
    classId: 'cls-7a',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    teachers,
    teachingAssignments,
    authContext: verifiedGuruCtx
  });
  assert.equal(unassignedSubject.allowed, false);

  const wrongPeriod = hasActiveTeachingAssignment({
    user: guruUser,
    teachers,
    teachingAssignments,
    subjectId: 'sub-mtk',
    classId: 'cls-7a',
    academicYear: '2025/2026',
    semester: 'Ganjil'
  });
  assert.equal(wrongPeriod.matched, false);
});

runTest('RBAC: walikelas cannot write subject scores without active teaching_assignment', () => {
  const allowedOwnSubject = authorizeSubjectAssessmentWrite({
    user: wkUser,
    subjectId: 'sub-ips',
    classId: 'cls-7a',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    teachers,
    teachingAssignments
  });
  assert.equal(allowedOwnSubject.allowed, true);

  const deniedOtherSubjectInHomeroom = authorizeSubjectAssessmentWrite({
    user: wkUser,
    subjectId: 'sub-mtk',
    classId: 'cls-7a',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    teachers,
    teachingAssignments
  });
  assert.equal(deniedOtherSubjectInHomeroom.allowed, false);

  const scope = getAuthorizedSubjectClassIds({
    user: wkUser,
    teachers,
    teachingAssignments,
    subjectId: 'sub-mtk',
    academicYear: '2026/2027',
    semester: 'Ganjil'
  });
  assert.deepEqual(scope.writableClassIds, []);
  assert.deepEqual(scope.classIds, ['cls-7a']);
});

runTest('Auth fallback safety: unbound anonymous session blocked & sensitive admin actions gated', () => {
  const mismatchedFallback: AuthSessionContext = {
    firebaseUid: 'fb-anon-hijack',
    verificationStatus: 'unverified_anonymous_fallback',
    providerId: 'anonymous',
    boundUserId: 'u-other',
    boundRole: 'guru'
  };
  const blockedSubjectWrite = authorizeSubjectAssessmentWrite({
    user: guruUser,
    subjectId: 'sub-mtk',
    classId: 'cls-7a',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    teachers,
    teachingAssignments,
    authContext: mismatchedFallback
  });
  assert.equal(blockedSubjectWrite.allowed, false);
  assert.equal(blockedSubjectWrite.isUnverifiedFallback, true);

  const blockedAdminAction = authorizeSensitiveAdminAction({
    user: adminUser,
    authContext: fallbackAdminCtx,
    actionLabel: 'ubah kebijakan nilai'
  });
  assert.equal(blockedAdminAction.allowed, false);
  assert.equal(blockedAdminAction.isUnverifiedFallback, true);

  const verifiedAdminAction = authorizeSensitiveAdminAction({
    user: adminUser,
    authContext: {
      firebaseUid: 'fb-admin-1',
      verificationStatus: 'verified_password',
      providerId: 'password',
      boundUserId: 'u-admin',
      boundRole: 'admin'
    },
    actionLabel: 'ubah kebijakan nilai'
  });
  assert.equal(verifiedAdminAction.allowed, true);

  const fallbackNotice = getAuthVerificationNotice(fallbackAdminCtx, { ...adminUser, password: '123' });
  assert.equal(fallbackNotice.isVerified, false);
});

runTest('sanitizeUserForPublicProfile never leaks password fields', () => {
  const pub = sanitizeUserForPublicProfile(adminUser, verifiedGuruCtx);
  assert.equal('password' in pub, false);
  assert.equal(pub.username, 'admin');
  assert.equal(pub.role, 'admin');
  assert.equal(pub.firebaseUid, 'fb-uid-guru-1');
});

runTest('Legacy finalScore protection: archived periods, locked docs, and school weights preserved', () => {
  const academicYears: AcademicYearPeriod[] = [
    {
      id: 'ay-2024',
      name: '2024/2025',
      status: 'arsip',
      isLocked: true,
      semesters: [{ semester: 'Ganjil', status: 'arsip', reportDate: '2024-12-20', isLocked: true }]
    }
  ];
  const policy: AssessmentPolicyConfig = {
    id: 'assessment_policy',
    optimalMinScore: 88,
    goodMinScore: 75,
    needStrengtheningBelow: 75,
    minimumTpEvidenceCount: 1,
    usePerTpKktpIfConfigured: true,
    formulaPolicyMode: 'existing_default',
    confirmedFormulaNote: '',
    includeFormativeInFinalScore: false,
    isInputLocked: false,
    lockedPeriods: { '2025/2026_Genap': true },
    updatedAt: '2026-07-01T00:00:00.000Z'
  };

  const oldScore: Partial<AssessmentScore> = {
    id: 'sc-old',
    academicYear: '2024/2025',
    semester: 'Ganjil',
    finalScore: 84,
    status: 'TERKUNCI'
  };

  const guruCheck = checkLegacyScoreProtection({
    score: oldScore,
    academicYears,
    assessmentPolicy: policy,
    user: guruUser
  });
  assert.equal(guruCheck.isProtected, true);

  const adminLockedCheck = checkLegacyScoreProtection({
    score: oldScore,
    academicYears,
    assessmentPolicy: policy,
    user: adminUser
  });
  assert.equal(adminLockedCheck.isProtected, true);

  const curricula: Curriculum[] = [
    {
      id: 'cur-merdeka',
      code: 'KM',
      name: 'Kurikulum Merdeka',
      phase: 'Fase D',
      description: '',
      formatifWeight: 60,
      sumatifWeight: 40,
      passingCriteria: 75
    }
  ];
  const weights = resolveSchoolWeights(curricula);
  assert.equal(weights.babWeightPercent, 60);
  assert.equal(weights.sasWeightPercent, 40);

  const calc = computeStudentReportScore({
    chapters: [
      {
        id: 'bab-1',
        code: 'BAB 1',
        orderIndex: 1,
        title: 'Bilangan',
        subjectId: 'sub-mtk',
        classId: 'cls-7a',
        gradeLevel: '7',
        teacherId: 'tch-mtk',
        academicYear: '2026/2027',
        semester: 'Ganjil',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z'
      }
    ],
    chapterScores: { 'bab-1': 80 },
    sasScore: 90,
    babWeightPercent: weights.babWeightPercent,
    sasWeightPercent: weights.sasWeightPercent,
    passingCriteria: 75
  });
  assert.equal(calc.finalScore, 84); // 80*0.6 + 90*0.4 = 48 + 36 = 84 (not hardcoded 50:50 -> 85)
});

runTest('Deterministic score IDs and server conflict detection prevent duplicate or blind overwrites', () => {
  const id1 = buildDeterministicScoreId('std-1', 'sub-mtk', '2026/2027', 'Ganjil');
  const id2 = buildDeterministicScoreId('std-1', 'sub-mtk', '2026/2027', 'Ganjil');
  assert.equal(id1, id2);
  assert.equal(id1, 'sc-std-1-sub-mtk-2026_2027-Ganjil');

  const conflict = detectScoreServerConflict({
    localBaseUpdatedAt: '2026-08-01T10:00:00.000Z',
    currentUserId: 'u-mtk',
    serverScore: {
      id: id1,
      studentId: 'std-1',
      subjectId: 'sub-mtk',
      classId: 'cls-7a',
      academicYear: '2026/2027',
      semester: 'Ganjil',
      formatifScores: {},
      sumatifMateriScores: {},
      sumatifAkhirSemester: 80,
      finalScore: 80,
      predicate: 'B',
      highestCompetenceDesc: '',
      lowestCompetenceDesc: '',
      updatedAt: '2026-08-01T10:05:00.000Z',
      updatedBy: 'Admin',
      updatedById: 'u-admin'
    }
  });
  assert.equal(conflict.hasConflict, true);

  const sameEditorNoConflict = detectScoreServerConflict({
    localBaseUpdatedAt: '2026-08-01T10:00:00.000Z',
    currentUserId: 'u-mtk',
    serverScore: {
      id: id1,
      studentId: 'std-1',
      subjectId: 'sub-mtk',
      classId: 'cls-7a',
      academicYear: '2026/2027',
      semester: 'Ganjil',
      formatifScores: {},
      sumatifMateriScores: {},
      sumatifAkhirSemester: 80,
      finalScore: 80,
      predicate: 'B',
      highestCompetenceDesc: '',
      lowestCompetenceDesc: '',
      updatedAt: '2026-08-01T10:05:00.000Z',
      updatedBy: 'Guru Matematika',
      updatedById: 'u-mtk'
    }
  });
  assert.equal(sameEditorNoConflict.hasConflict, false);
});

runTest('Formatif TP filtering (backward compatible) and code suggestion', () => {
  const tps: LearningObjective[] = [
    {
      id: 'tp-legacy-global',
      curriculumId: 'cur-merdeka',
      subjectId: 'sub-mtk',
      gradeLevel: '7',
      code: 'TP 7.1',
      description: 'Menjelaskan bilangan bulat',
      semester: 'Ganjil'
    },
    {
      id: 'tp-class-7a',
      curriculumId: 'cur-merdeka',
      subjectId: 'sub-mtk',
      classId: 'cls-7a',
      gradeLevel: '7',
      code: 'TP 7.2',
      description: 'Menyelesaikan masalah rasio kelas 7A',
      semester: 'Ganjil',
      academicYear: '2026/2027'
    },
    {
      id: 'tp-class-7b',
      curriculumId: 'cur-merdeka',
      subjectId: 'sub-mtk',
      classId: 'cls-7b',
      gradeLevel: '7',
      code: 'TP 7.3',
      description: 'Khusus kelas 7B',
      semester: 'Ganjil',
      academicYear: '2026/2027'
    }
  ];

  const visibleIn7A = filterObjectivesForContext(tps, {
    subjectId: 'sub-mtk',
    gradeLevel: '7',
    classId: 'cls-7a',
    semester: 'Ganjil',
    academicYear: '2026/2027'
  });
  assert.deepEqual(
    visibleIn7A.map((t) => t.id),
    ['tp-legacy-global', 'tp-class-7a']
  );

  assert.equal(
    isObjectiveVisibleInContext(tps[2], {
      subjectId: 'sub-mtk',
      gradeLevel: '7',
      classId: 'cls-7a',
      semester: 'Ganjil',
      academicYear: '2026/2027'
    }),
    false
  );

  assert.equal(suggestNextTpCode(tps, '7'), 'TP 7.4');
});

runTest('Sumatif Plans & In-Use delete protection preserve TP/BAB integrity (1 TP reusable across plans)', () => {
  const chapters: LearningChapter[] = [
    {
      id: 'bab-1',
      code: 'BAB 1',
      orderIndex: 1,
      title: 'Bilangan Bulat',
      subjectId: 'sub-mtk',
      classId: 'cls-7a',
      gradeLevel: '7',
      teacherId: 'tch-mtk',
      academicYear: '2026/2027',
      semester: 'Ganjil',
      linkedTpIds: ['tp-1'],
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z'
    }
  ];
  const plans: SummativeAssessmentPlan[] = [
    {
      id: 'plan-1',
      title: 'Sumatif 1 Bilangan',
      chapterId: 'bab-1',
      tpIds: ['tp-1'],
      subjectId: 'sub-mtk',
      classId: 'cls-7a',
      gradeLevel: '7',
      teacherId: 'tch-mtk',
      academicYear: '2026/2027',
      semester: 'Ganjil',
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z'
    },
    {
      id: 'plan-2',
      title: 'Sumatif 2 Penguatan TP 1',
      chapterId: 'bab-1',
      tpIds: ['tp-1', 'tp-2'],
      subjectId: 'sub-mtk',
      classId: 'cls-7a',
      gradeLevel: '7',
      teacherId: 'tch-mtk',
      academicYear: '2026/2027',
      semester: 'Ganjil',
      createdAt: '2026-07-02T00:00:00.000Z',
      updatedAt: '2026-07-02T00:00:00.000Z'
    }
  ];
  const summatives: SummativeAssessment[] = [
    {
      id: 'sa-1',
      studentId: 'std-1',
      teacherId: 'tch-mtk',
      subjectId: 'sub-mtk',
      classId: 'cls-7a',
      chapterId: 'bab-1',
      planId: 'plan-1',
      tpId: 'tp-1',
      score: 85,
      date: '2026-08-01',
      technique: 'tes tertulis',
      academicYear: '2026/2027',
      semester: 'Ganjil',
      updatedAt: '2026-08-01T00:00:00.000Z'
    }
  ];
  const formatives: FormativeAssessment[] = [
    {
      id: 'fa-hist-1',
      studentId: 'std-1',
      teacherId: 'tch-mtk',
      subjectId: 'sub-mtk',
      classId: 'cls-7a',
      tpId: 'tp-hist',
      date: '2026-08-01',
      technique: 'observasi',
      observation: 'Catatan historis',
      feedback: 'Pertahankan capaian',
      academicYear: '2026/2027',
      semester: 'Ganjil',
      updatedAt: '2026-08-01T00:00:00.000Z'
    }
  ];

  const contextPlans = filterSummativePlansForContext(plans, {
    subjectId: 'sub-mtk',
    classId: 'cls-7a',
    academicYear: '2026/2027',
    semester: 'Ganjil'
  });
  assert.equal(contextPlans.length, 2);

  assert.equal(
    checkLearningObjectiveInUse({ tpId: 'tp-1', learningChapters: chapters, summativePlans: plans }).inUse,
    true
  );
  assert.equal(
    checkLearningObjectiveInUse({ tpId: 'tp-hist', formativeAssessments: formatives }).inUse,
    true
  );
  assert.equal(
    checkLearningObjectiveInUse({ tpId: 'tp-unused', learningChapters: chapters, summativePlans: plans }).inUse,
    false
  );
  assert.equal(
    checkLearningChapterInUse({ chapterId: 'bab-1', summativePlans: plans, summativeAssessments: summatives }).inUse,
    true
  );
  assert.equal(
    checkSummativePlanInUse({ planId: 'plan-1', summativeAssessments: summatives }).inUse,
    true
  );
  assert.equal(
    checkSummativePlanInUse({ planId: 'plan-2', summativeAssessments: summatives }).inUse,
    false
  );
});

console.log(`All ${passed} tests passed!`);
