import assert from 'node:assert/strict';
import {
  AcademicYearPeriod,
  AssessmentScore,
  Curriculum,
  LearningChapter,
  Student,
  Subject,
  SummativeAssessment,
  SummativeAssessmentPlan,
  User
} from '../src/types/erapor';
import { resolveSchoolWeights } from '../src/utils/assessmentCalculation';
import {
  buildGuardedSpreadsheetSavePayloads,
  buildSpreadsheetColumns,
  computeSpreadsheetRowSummary,
  extractStudentInitialEditState,
  parseNumericScoreInput,
  parseSpreadsheetPasteGrid,
  parseSpreadsheetTableExcelData,
  parseQuickTextColumnScores,
  StudentSpreadsheetEditState
} from '../src/utils/spreadsheetScoreHelper';

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

const subject: Subject = {
  id: 'sub-mtk',
  code: 'MTK',
  name: 'Matematika',
  category: 'A',
  orderIndex: 4,
  kkm: 75
};

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

const chapters: LearningChapter[] = [
  {
    id: 'bab-1',
    code: 'BAB 1',
    orderIndex: 1,
    title: 'Bilangan Bulat',
    subjectId: 'sub-mtk',
    classId: 'cls-7a',
    gradeLevel: '7',
    teacherId: 'tch-1',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    linkedTpIds: ['tp-1'],
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z'
  },
  {
    id: 'bab-2',
    code: 'BAB 2',
    orderIndex: 2,
    title: 'Aljabar',
    subjectId: 'sub-mtk',
    classId: 'cls-7a',
    gradeLevel: '7',
    teacherId: 'tch-1',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    linkedTpIds: ['tp-2'],
    createdAt: '2026-07-02T00:00:00.000Z',
    updatedAt: '2026-07-02T00:00:00.000Z'
  }
];

const plans: SummativeAssessmentPlan[] = [
  {
    id: 'plan-1',
    title: 'Sumatif 1A Bilangan',
    chapterId: 'bab-1',
    tpIds: ['tp-1'],
    subjectId: 'sub-mtk',
    classId: 'cls-7a',
    gradeLevel: '7',
    teacherId: 'tch-1',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z'
  },
  {
    id: 'plan-2',
    title: 'Sumatif 1B Operasi',
    chapterId: 'bab-1',
    tpIds: ['tp-1'],
    subjectId: 'sub-mtk',
    classId: 'cls-7a',
    gradeLevel: '7',
    teacherId: 'tch-1',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    createdAt: '2026-07-02T00:00:00.000Z',
    updatedAt: '2026-07-02T00:00:00.000Z'
  }
];

const students: Student[] = [
  {
    id: 'std-1',
    nis: '1001',
    nisn: '00112233',
    name: 'Aisyah',
    gender: 'P',
    pob: 'Rangsang',
    dob: '2012-01-01',
    religion: 'Islam',
    address: 'Rangsang',
    fatherName: 'Ayah',
    motherName: 'Ibu',
    fatherJob: 'Petani',
    motherJob: 'IRT',
    parentPhone: '0812',
    classId: 'cls-7a',
    status: 'Aktif'
  },
  {
    id: 'std-2',
    nis: '1002',
    nisn: '00112244',
    name: 'Budi (Terkunci)',
    gender: 'L',
    pob: 'Rangsang',
    dob: '2012-02-02',
    religion: 'Islam',
    address: 'Rangsang',
    fatherName: 'Ayah',
    motherName: 'Ibu',
    fatherJob: 'Nelayan',
    motherJob: 'IRT',
    parentPhone: '0813',
    classId: 'cls-7a',
    status: 'Aktif'
  },
  {
    id: 'std-3',
    nis: '1003',
    nisn: '00112255',
    name: 'Citra (Kosong)',
    gender: 'P',
    pob: 'Rangsang',
    dob: '2012-03-03',
    religion: 'Islam',
    address: 'Rangsang',
    fatherName: 'Ayah',
    motherName: 'Ibu',
    fatherJob: 'Pedagang',
    motherJob: 'IRT',
    parentPhone: '0814',
    classId: 'cls-7a',
    status: 'Aktif'
  }
];

const guruUser: User = {
  id: 'u-guru',
  username: 'guru',
  name: 'Guru Matematika',
  role: 'guru',
  teacherId: 'tch-1',
  status: 'active'
};

runTest('buildSpreadsheetColumns combines Plans and uncovered Chapters without duplicates', () => {
  const cols = buildSpreadsheetColumns({ chapters, plans });
  assert.equal(cols.length, 3);
  assert.deepEqual(
    cols.map((c) => `${c.kind}:${c.id}`),
    ['plan:plan-1', 'plan:plan-2', 'chapter:bab-2']
  );
});

runTest('parseNumericScoreInput & parseSpreadsheetPasteGrid handle Excel TSV decimals, blanks, and out-of-range errors', () => {
  assert.equal(parseNumericScoreInput('').isEmpty, true);
  assert.equal(parseNumericScoreInput('87,5').value, 87.5);
  assert.ok(parseNumericScoreInput('105').error);
  assert.ok(parseNumericScoreInput('-1').error);

  const okPaste = parseSpreadsheetPasteGrid('80\t90\t85,5\n75\t\t88\n');
  assert.equal(okPaste.errors.length, 0);
  assert.equal(okPaste.grid.length, 2);
  assert.deepEqual(okPaste.grid[0], [80, 90, 85.5]);
  assert.deepEqual(okPaste.grid[1], [75, undefined, 88]);

  const badPaste = parseSpreadsheetPasteGrid('80\tabc\n120\t90');
  assert.equal(badPaste.errors.length, 2);
});

runTest('computeSpreadsheetRowSummary aggregates Plan averages per BAB and applies school weights (60:40)', () => {
  const cols = buildSpreadsheetColumns({ chapters, plans });
  // Plan 1 = 80, Plan 2 = 90 => BAB 1 avg = 85; Chapter BAB 2 = 95 => babAverage = (85 + 95)/2 = 90
  // SAS = 80 => finalScore = 90*0.6 + 80*0.4 = 54 + 32 = 86
  const row = computeSpreadsheetRowSummary({
    student: students[0],
    editState: {
      cellValues: {
        'plan:plan-1': '80',
        'plan:plan-2': '90',
        'chapter:bab-2': '95'
      },
      sasValue: '80',
      manualFinalValue: ''
    },
    columns: cols,
    chapters,
    weights,
    passingCriteria: 75,
    currentUser: guruUser
  });

  assert.equal(row.chapterScores['bab-1'], 85);
  assert.equal(row.chapterScores['bab-2'], 95);
  assert.equal(row.babAverage, 90);
  assert.equal(row.finalScore, 86);
  assert.equal(row.predicate, 'B');
});

runTest('computeSpreadsheetRowSummary distinguishes explicit 0 from blank and respects manual override', () => {
  const cols = buildSpreadsheetColumns({ chapters, plans });
  const explicitZeroSas = computeSpreadsheetRowSummary({
    student: students[0],
    editState: {
      cellValues: { 'plan:plan-1': '80' },
      sasValue: '0',
      manualFinalValue: ''
    },
    columns: cols,
    chapters,
    weights,
    passingCriteria: 75,
    currentUser: guruUser
  });
  // BAB 1 = 80, SAS = 0 => 80*0.6 + 0*0.4 = 48
  assert.equal(explicitZeroSas.sasScore, 0);
  assert.equal(explicitZeroSas.finalScore, 48);

  const manualRow = computeSpreadsheetRowSummary({
    student: students[0],
    editState: {
      cellValues: { 'plan:plan-1': '80' },
      sasValue: '0',
      manualFinalValue: '92'
    },
    columns: cols,
    chapters,
    weights,
    passingCriteria: 75,
    currentUser: guruUser
  });
  assert.equal(manualRow.finalScore, 92);
});

runTest('buildGuardedSpreadsheetSavePayloads protects locked/archived scores, preserves descriptions/TPs, and avoids finalScore: null', () => {
  const cols = buildSpreadsheetColumns({ chapters, plans });
  const existingScores: Record<string, AssessmentScore> = {
    'std-1': {
      id: 'sc-std-1-sub-mtk-2026_2027-Ganjil',
      studentId: 'std-1',
      subjectId: 'sub-mtk',
      classId: 'cls-7a',
      academicYear: '2026/2027',
      semester: 'Ganjil',
      formatifScores: {},
      sumatifMateriScores: {},
      sumatifAkhirSemester: 0,
      finalScore: 80,
      predicate: 'B',
      highestCompetenceDesc: 'Sudah tersimpan',
      lowestCompetenceDesc: '',
      selectedOptimalTpIds: ['tp-1'],
      finalDescription: 'Ananda sangat baik dalam bilangan bulat.',
      descriptionStatus: 'Sudah disimpan',
      updatedAt: '2026-08-01T00:00:00.000Z'
    },
    'std-2': {
      id: 'sc-std-2-sub-mtk-2026_2027-Ganjil',
      studentId: 'std-2',
      subjectId: 'sub-mtk',
      classId: 'cls-7a',
      academicYear: '2026/2027',
      semester: 'Ganjil',
      formatifScores: {},
      sumatifMateriScores: {},
      sumatifAkhirSemester: 88,
      finalScore: 88,
      predicate: 'B',
      highestCompetenceDesc: '',
      lowestCompetenceDesc: '',
      status: 'TERKUNCI',
      descriptionStatus: 'Sudah difinalisasi',
      updatedAt: '2026-08-01T00:00:00.000Z'
    }
  };

  const academicYears: AcademicYearPeriod[] = [
    {
      id: 'ay-26',
      name: '2026/2027',
      status: 'aktif',
      semesters: [{ semester: 'Ganjil', status: 'aktif', reportDate: '2026-12-19' }]
    }
  ];

  const editsByStudentId: Record<string, StudentSpreadsheetEditState> = {
    'std-1': {
      cellValues: { 'plan:plan-1': '90', 'plan:plan-2': '90', 'chapter:bab-2': '90' },
      sasValue: '90',
      manualFinalValue: ''
    },
    'std-2': {
      cellValues: { 'plan:plan-1': '50' },
      sasValue: '50',
      manualFinalValue: ''
    },
    'std-3': {
      cellValues: {},
      sasValue: '',
      manualFinalValue: ''
    }
  };

  const rows = students.map((st) =>
    computeSpreadsheetRowSummary({
      student: st,
      editState: editsByStudentId[st.id],
      columns: cols,
      chapters,
      existingScore: existingScores[st.id],
      weights,
      passingCriteria: 75,
      academicYears,
      currentUser: guruUser
    })
  );

  const payload = buildGuardedSpreadsheetSavePayloads({
    dirtyStudentIds: new Set(['std-1', 'std-2', 'std-3']),
    rows,
    editsByStudentId,
    columns: cols,
    chapters,
    subject,
    classId: 'cls-7a',
    className: 'Kelas 7A',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    weights,
    currentUser: guruUser,
    resolvedTeacherId: 'tch-1'
  });

  // Only std-1 should produce an AssessmentScore
  assert.equal(payload.scoresToSave.length, 1);
  assert.equal(payload.scoresToSave[0].studentId, 'std-1');
  assert.equal(payload.scoresToSave[0].finalScore, 90);
  // Preserved teacher description & TP checklist
  assert.deepEqual(payload.scoresToSave[0].selectedOptimalTpIds, ['tp-1']);
  assert.equal(payload.scoresToSave[0].finalDescription, 'Ananda sangat baik dalam bilangan bulat.');
  assert.equal(payload.scoresToSave[0].descriptionStatus, 'Sudah disimpan');

  // std-2 locked/finalized was skipped
  assert.deepEqual(payload.skippedProtectedStudents, ['Budi (Terkunci)']);
  // std-3 empty never emits finalScore: null
  assert.deepEqual(payload.skippedNullScoreStudents, ['Citra (Kosong)']);
  // 3 summative records created only for std-1 (plan-1, plan-2, bab-2)
  assert.equal(payload.summativesToSave.length, 3);
  assert.ok(payload.summativesToSave.every((sa) => sa.studentId === 'std-1'));
});

runTest('extractStudentInitialEditState hydrates existing plan scores and explicit SAS 0 cleanly', () => {
  const cols = buildSpreadsheetColumns({ chapters, plans });
  const saList: SummativeAssessment[] = [
    {
      id: 'sa-plan-plan-1-std-1',
      studentId: 'std-1',
      teacherId: 'tch-1',
      subjectId: 'sub-mtk',
      classId: 'cls-7a',
      chapterId: 'bab-1',
      planId: 'plan-1',
      tpId: 'tp-1',
      score: 84,
      date: '2026-08-01',
      technique: 'tes tertulis',
      academicYear: '2026/2027',
      semester: 'Ganjil',
      updatedAt: '2026-08-01T00:00:00.000Z'
    }
  ];
  const scoreWithZeroSas: AssessmentScore = {
    id: 'sc-std-1-sub-mtk-2026_2027-Ganjil',
    studentId: 'std-1',
    subjectId: 'sub-mtk',
    classId: 'cls-7a',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    formatifScores: {},
    sumatifMateriScores: {},
    sumatifAkhirSemester: 0,
    hasSasScore: true,
    finalScore: 50,
    predicate: 'D',
    highestCompetenceDesc: '',
    lowestCompetenceDesc: '',
    updatedAt: '2026-08-01T00:00:00.000Z'
  };

  const state = extractStudentInitialEditState({
    studentId: 'std-1',
    subjectId: 'sub-mtk',
    classId: 'cls-7a',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    columns: cols,
    existingScore: scoreWithZeroSas,
    summativeAssessments: saList
  });

  assert.equal(state.cellValues['plan:plan-1'], '84');
  assert.equal(state.cellValues['plan:plan-2'], '');
  assert.equal(state.sasValue, '0');
});

runTest('parseSpreadsheetTableExcelData maps exported grid headers, matches students by NISN/Name, and extracts scores', () => {
  const cols = buildSpreadsheetColumns({ chapters, plans });
  const aoa = [
    ['PENGOLAHAN NILAI SISWA - SMP NEGERI 1 RANGSANG'],
    ['MAPEL', 'Matematika', 'ROMBEL', 'Kelas 7A'],
    ['TAHUN_AJARAN', '2026/2027', 'SEMESTER', 'Ganjil'],
    [],
    ['NO', 'NIS', 'NISN', 'NAMA_SISWA', 'Sumatif 1A', 'Sumatif 1B', 'BAB 2', 'RATA_BAB', 'NILAI_SAS', 'NILAI_AKHIR'],
    [1, '1001', '00112233', 'Aisyah', 88, 92, 90, 90, 85, 88],
    [2, '1002', '00112244', 'Budi', 70, 75, 80, 75, 78, 76],
    [3, '', '', 'Citra (Kosong)', 95, 90, 85, 90, 92, 91]
  ];

  const parsed = parseSpreadsheetTableExcelData(aoa, {
    students,
    columns: cols,
    sheetName: 'Pengolahan_Nilai'
  });

  assert.equal(parsed.matchedStudentsCount, 3);
  assert.equal(parsed.headerRowIndex, 4);
  assert.ok(parsed.mappedColumns.some((mc) => mc.key === 'plan:plan-1'));
  assert.ok(parsed.mappedColumns.some((mc) => mc.key === 'plan:plan-2'));
  assert.ok(parsed.mappedColumns.some((mc) => mc.key === 'chapter:bab-2'));
  assert.ok(parsed.mappedColumns.some((mc) => mc.key === 'sas'));

  const aisyahRow = parsed.previewRows.find((r) => r.studentId === 'std-1');
  assert.ok(aisyahRow);
  assert.equal(aisyahRow?.matchedBy, 'nisn');
  assert.equal(aisyahRow?.importedScores['plan:plan-1'], 88);
  assert.equal(aisyahRow?.importedScores['plan:plan-2'], 92);
  assert.equal(aisyahRow?.importedScores['chapter:bab-2'], 90);
  assert.equal(aisyahRow?.importedSas, 85);

  const citraRow = parsed.previewRows.find((r) => r.studentId === 'std-3');
  assert.ok(citraRow);
  assert.equal(citraRow?.matchedBy, 'name');
  assert.equal(citraRow?.importedSas, 92);
});

runTest('parseQuickTextColumnScores parses single-column paste by student order or name detection', () => {
  // Test 1: Order mode for SAS column
  const orderRes = parseQuickTextColumnScores({
    text: '85\n90,5\n78',
    students,
    targetKey: 'sas',
    targetLabel: 'Nilai SAS',
    matchMode: 'order'
  });

  assert.equal(orderRes.appliedCount, 3);
  assert.equal(orderRes.errors.length, 0);
  assert.equal(orderRes.previewRows[0].importedSas, 85);
  assert.equal(orderRes.previewRows[1].importedSas, 90.5);
  assert.equal(orderRes.previewRows[2].importedSas, 78);

  // Test 2: Auto-detect name + score for Plan 1
  const autoRes = parseQuickTextColumnScores({
    text: 'Aisyah: 94\nCitra 88',
    students,
    targetKey: 'plan:plan-1',
    targetLabel: 'Sumatif 1A',
    matchMode: 'auto_detect'
  });

  assert.equal(autoRes.appliedCount, 2);
  const aisyah = autoRes.previewRows.find((r) => r.studentId === 'std-1');
  assert.equal(aisyah?.importedScores['plan:plan-1'], 94);
  const citra = autoRes.previewRows.find((r) => r.studentId === 'std-3');
  assert.equal(citra?.importedScores['plan:plan-1'], 88);
});

console.log(`All ${passed} tests passed!`);

