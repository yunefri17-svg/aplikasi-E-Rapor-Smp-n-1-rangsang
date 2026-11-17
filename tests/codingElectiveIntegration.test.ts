import assert from 'node:assert/strict';
import {
  AssessmentScore,
  Classroom,
  LearningObjective,
  Student,
  Subject,
  TeachingAssignment
} from '../src/types/erapor';
import { initialLearningObjectives, initialSubjects } from '../src/data/initialData';
import {
  buildElectiveTranscriptTableRows,
  buildReportGradeRows,
  CODING_SUBJECT_CODE,
  CODING_SUBJECT_ID,
  CODING_SUBJECT_NAME,
  ELECTIVE_TRANSCRIPT_DISCLAIMER,
  ELECTIVE_TRANSCRIPT_SUBTITLE,
  ELECTIVE_TRANSCRIPT_TITLE,
  ensureElectiveCodingSubject,
  getElectiveHistoryRows,
  getOfficialTranscriptSubjects,
  getReportSubjectsForStudent,
  getSubjectsForClassPeriod,
  hasEnteredAssessmentScore,
  isCodingSubject,
  isElectiveSubject
} from '../src/utils/electiveSubjectHelper';
import { sortSubjects } from '../src/utils/subjectSort';
import {
  defaultDescriptionBank,
  getAutomaticDescription,
  mergeDescriptionBankWithDefaults
} from '../src/utils/descriptionBank';
import { composeDescriptionFromSelectedTPs } from '../src/utils/tpAnalysisAndDescription';

// =========================================================================
// SETUP FIXTURES (Simulated real school dataset)
// =========================================================================
const classrooms: Classroom[] = [
  { id: 'cls-vii-1', name: 'Kelas VII.1', gradeLevel: '7', curriculumId: 'cur-merdeka', roomNumber: 'R-01', homeroomTeacherId: 'tch-1', capacity: 32 },
  { id: 'cls-vii-2', name: 'Kelas VII.2', gradeLevel: '7', curriculumId: 'cur-merdeka', roomNumber: 'R-02', homeroomTeacherId: 'tch-2', capacity: 32 },
  { id: 'cls-viii-1', name: 'Kelas VIII.1', gradeLevel: '8', curriculumId: 'cur-merdeka', roomNumber: 'R-03', homeroomTeacherId: 'tch-3', capacity: 32 }
];

const studentActiveGraded: Student = {
  id: 'std-ka-graded',
  nisn: '0131111111',
  nis: '5201',
  name: 'AULIA RAHMAWATI',
  gender: 'P',
  pob: 'Rangsang',
  dob: '2013-04-12',
  religion: 'Islam',
  classId: 'cls-viii-1',
  fatherName: 'Rahman',
  motherName: 'Siti',
  fatherJob: 'Wiraswasta',
  motherJob: 'Ibu Rumah Tangga',
  parentPhone: '081200000001',
  address: 'Desa Tanjung Samak',
  status: 'Aktif'
};

const studentActiveEmptyGrade: Student = {
  id: 'std-ka-empty',
  nisn: '0132222222',
  nis: '5202',
  name: 'BAGAS PRATAMA',
  gender: 'L',
  pob: 'Rangsang',
  dob: '2013-08-19',
  religion: 'Islam',
  classId: 'cls-vii-1',
  fatherName: 'Budi',
  motherName: 'Rina',
  fatherJob: 'Nelayan',
  motherJob: 'Ibu Rumah Tangga',
  parentPhone: '081200000002',
  address: 'Desa Tanjung Samak',
  status: 'Aktif'
};

const studentExcludedInClass: Student = {
  id: 'std-ka-excluded',
  nisn: '0133333333',
  nis: '5203',
  name: 'CITRA LESTARI',
  gender: 'P',
  pob: 'Rangsang',
  dob: '2013-09-01',
  religion: 'Islam',
  classId: 'cls-vii-1',
  fatherName: 'Candra',
  motherName: 'Dewi',
  fatherJob: 'Petani',
  motherJob: 'Ibu Rumah Tangga',
  parentPhone: '081200000003',
  address: 'Desa Tanjung Samak',
  status: 'Aktif'
};

const studentNonParticipatingClass: Student = {
  id: 'std-no-ka-class',
  nisn: '0134444444',
  nis: '5204',
  name: 'DIMAS PUTRA',
  gender: 'L',
  pob: 'Rangsang',
  dob: '2013-11-22',
  religion: 'Islam',
  classId: 'cls-vii-2',
  fatherName: 'Darma',
  motherName: 'Yuni',
  fatherJob: 'Pedagang',
  motherJob: 'Ibu Rumah Tangga',
  parentPhone: '081200000004',
  address: 'Desa Repan',
  status: 'Aktif'
};

// Assignment: VII.1 follows KA (except std-ka-excluded); VIII.1 follows KA; VII.2 does NOT follow KA
const assignments: TeachingAssignment[] = [
  {
    id: 'ta-ka-vii-1',
    teacherId: 'tch-ka',
    teacherName: 'Guru Koding, S.Kom.',
    subjectId: CODING_SUBJECT_ID,
    subjectName: CODING_SUBJECT_NAME,
    classId: 'cls-vii-1',
    className: 'Kelas VII.1',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    status: 'active',
    excludedStudentIds: [studentExcludedInClass.id]
  },
  {
    id: 'ta-ka-viii-1',
    teacherId: 'tch-ka',
    teacherName: 'Guru Koding, S.Kom.',
    subjectId: CODING_SUBJECT_ID,
    subjectName: CODING_SUBJECT_NAME,
    classId: 'cls-viii-1',
    className: 'Kelas VIII.1',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    status: 'active'
  }
];

// Multi-semester & promoted academic history for studentActiveGraded + Informatika isolation check
const scores: AssessmentScore[] = [
  // Informatika score in 2026/2027 Ganjil (must stay 100% separate from KA)
  {
    id: 'sc-inf-1',
    studentId: studentActiveGraded.id,
    subjectId: 'sub-inf',
    subjectName: 'Informatika',
    classId: 'cls-viii-1',
    className: 'Kelas VIII.1',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    formatifScores: {},
    sumatifMateriScores: {},
    sumatifAkhirSemester: 81,
    finalScore: 81,
    predicate: 'B',
    highestCompetenceDesc: 'Menunjukkan penguasaan baik pada pengelolaan data perkantoran informatika.',
    lowestCompetenceDesc: '',
    finalDescription: 'Menunjukkan penguasaan baik pada pengelolaan data perkantoran informatika.',
    updatedAt: '2026-12-19 08:00'
  },
  // KA Sem 1 (Grade 7 - 2025/2026 Ganjil) — historic record before class promotion to VIII.1!
  {
    id: 'sc-ka-sem1',
    studentId: studentActiveGraded.id,
    studentName: studentActiveGraded.name,
    subjectId: CODING_SUBJECT_ID,
    subjectName: CODING_SUBJECT_NAME,
    classId: 'cls-vii-1',
    className: 'Kelas VII.1',
    academicYear: '2025/2026',
    semester: 'Ganjil',
    formatifScores: {},
    sumatifMateriScores: {},
    sumatifAkhirSemester: 88,
    finalScore: 88,
    predicate: 'B',
    highestCompetenceDesc: 'Mampu menerapkan logika percabangan dan perulangan dalam pemrograman blok.',
    lowestCompetenceDesc: 'Perlu bimbingan lebih lanjut dalam menyusun dekomposisi masalah algoritma kompleks.',
    finalDescription:
      'Mampu menerapkan logika percabangan dan perulangan dalam pemrograman blok. Perlu bimbingan lebih lanjut dalam menyusun dekomposisi masalah algoritma kompleks.',
    updatedAt: '2025-12-20 10:00'
  },
  // KA Sem 2 (Grade 7 - 2025/2026 Genap) — must NOT overwrite Sem 1!
  {
    id: 'sc-ka-sem2',
    studentId: studentActiveGraded.id,
    studentName: studentActiveGraded.name,
    subjectId: CODING_SUBJECT_ID,
    subjectName: CODING_SUBJECT_NAME,
    classId: 'cls-vii-1',
    className: 'Kelas VII.1',
    academicYear: '2025/2026',
    semester: 'Genap',
    formatifScores: {},
    sumatifMateriScores: {},
    sumatifAkhirSemester: 90,
    finalScore: 90,
    predicate: 'A',
    highestCompetenceDesc: 'Sangat baik dalam merancang model klasifikasi data sederhana berbasis kecerdasan artifisial.',
    lowestCompetenceDesc: '',
    finalDescription:
      'Sangat baik dalam merancang model klasifikasi data sederhana berbasis kecerdasan artifisial.',
    updatedAt: '2026-06-20 10:00'
  },
  // KA Sem 3 (Grade 8 - 2026/2027 Ganjil after promotion to VIII.1)
  {
    id: 'sc-ka-sem3',
    studentId: studentActiveGraded.id,
    studentName: studentActiveGraded.name,
    subjectId: CODING_SUBJECT_ID,
    subjectName: CODING_SUBJECT_NAME,
    classId: 'cls-viii-1',
    className: 'Kelas VIII.1',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    formatifScores: {},
    sumatifMateriScores: {},
    sumatifAkhirSemester: 93,
    finalScore: 93,
    predicate: 'A',
    manualFinalScore: 93,
    highestCompetenceDesc: 'Sangat cakap dalam mengimplementasikan struktur fungsi serta melatih model AI sederhana secara etis.',
    lowestCompetenceDesc: '',
    finalDescription:
      'Sangat cakap dalam mengimplementasikan struktur fungsi serta melatih model AI sederhana secara etis.',
    descriptionStatus: 'Sudah disimpan',
    status: 'SELESAI',
    updatedAt: '2026-12-19 09:30'
  },
  // Student with Informatika score ONLY in Kelas VII.2 (must NEVER leak to KA)
  {
    id: 'sc-inf-dimas',
    studentId: studentNonParticipatingClass.id,
    subjectId: 'sub-inf',
    subjectName: 'Informatika',
    classId: 'cls-vii-2',
    className: 'Kelas VII.2',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    formatifScores: {},
    sumatifMateriScores: {},
    sumatifAkhirSemester: 86,
    finalScore: 86,
    predicate: 'B',
    highestCompetenceDesc: 'Baik dalam memahami sistem komputer dasar informatika.',
    lowestCompetenceDesc: '',
    finalDescription: 'Baik dalam memahami sistem komputer dasar informatika.',
    updatedAt: '2026-12-19 08:00'
  }
];

// =========================================================================
// TEST 1 & 2: Subject Definition, Separate from Informatika, Not Muatan Lokal
// =========================================================================
const codingSub = initialSubjects.find((s) => s.id === CODING_SUBJECT_ID);
assert.ok(codingSub, 'Koding dan Kecerdasan Artifisial harus terdaftar di initialSubjects');
assert.equal(codingSub.name, CODING_SUBJECT_NAME);
assert.equal(codingSub.code, CODING_SUBJECT_CODE);
assert.equal(codingSub.category, 'Pilihan', 'Kategori tidak boleh otomatis Muatan Lokal');
assert.notEqual(codingSub.category, 'Muatan Lokal');
assert.equal(isCodingSubject(codingSub), true);
assert.equal(isElectiveSubject(codingSub), true);

const infSub = initialSubjects.find((s) => s.id === 'sub-inf');
assert.ok(infSub, 'Informatika harus tetap terpisah');
assert.equal(isCodingSubject(infSub), false);
assert.equal(isElectiveSubject(infSub), false);

// =========================================================================
// TEST 3: Non-destructive migration on legacy DB (with Seni Budaya at orderIndex 10)
// =========================================================================
const legacySubjects: Subject[] = [
  { id: 'sub-pai', code: 'PAI', name: 'Pendidikan Agama dan Budi Pekerti', category: 'A', orderIndex: 1, kkm: 75 },
  { id: 'sub-inf', code: 'INF', name: 'Informatika', category: 'B', orderIndex: 9, kkm: 75 },
  { id: 'sub-seni', code: 'SBK', name: 'Seni Budaya (Seni Tari / Musik / Rupa)', category: 'B', orderIndex: 10, kkm: 75 },
  { id: 'sub-bmr', code: 'BMR', name: 'Budaya Melayu Riau (BMR)', category: 'Muatan Lokal', orderIndex: 11, kkm: 75 }
];

const migratedSubjects = ensureElectiveCodingSubject(legacySubjects);
assert.equal(migratedSubjects.length, 5, 'Migrasi harus menambah Koding & KA tanpa menghapus mapel lama');
const sortedMigrated = sortSubjects(migratedSubjects);
const infPos = sortedMigrated.findIndex((s) => s.id === 'sub-inf');
const kaPos = sortedMigrated.findIndex((s) => s.id === CODING_SUBJECT_ID);
const seniPos = sortedMigrated.findIndex((s) => s.id === 'sub-seni');
assert.equal(kaPos, infPos + 1, 'Koding dan Kecerdasan Artifisial wajib diletakkan tepat setelah Informatika');
assert.ok(seniPos > kaPos, 'Seni Budaya tetap setelah Koding dan Kecerdasan Artifisial');

// Tombstone protection check: deleted subject must not resurrect
const respectedTombstone = ensureElectiveCodingSubject(legacySubjects, (id) => id === CODING_SUBJECT_ID);
assert.equal(respectedTombstone.length, 4, 'Migrasi menghormati tombstone jika sengaja dihapus Admin');

// =========================================================================
// TEST 4: Independent Grades (0-100) & Competence Descriptions + Bank
// =========================================================================
const kaBankEntry = defaultDescriptionBank.find((b) => b.subjectId === CODING_SUBJECT_ID);
assert.ok(kaBankEntry, 'Bank deskripsi khusus untuk Koding dan Kecerdasan Artifisial harus tersedia');
const kaDescAuto = getAutomaticDescription(CODING_SUBJECT_ID, 92, defaultDescriptionBank);
const kaCombinedText = `${kaDescAuto.highest} ${kaDescAuto.lowest}`.toLowerCase();
assert.ok(
  kaCombinedText.includes('koding') ||
    kaCombinedText.includes('kecerdasan artifisial') ||
    kaCombinedText.includes('algoritma')
);
assert.ok(
  mergeDescriptionBankWithDefaults([]).some((b) => b.subjectId === CODING_SUBJECT_ID),
  'mergeDescriptionBankWithDefaults wajib melengkapi entri Koding dan Kecerdasan Artifisial'
);

const kaTps: LearningObjective[] = initialLearningObjectives.filter(
  (tp) => tp.subjectId === CODING_SUBJECT_ID && tp.gradeLevel === '7'
);
assert.ok(kaTps.length >= 2, 'TP awal Fase D Koding dan Kecerdasan Artifisial harus tersedia');

const composedKA = composeDescriptionFromSelectedTPs({
  student: studentActiveEmptyGrade,
  subject: codingSub,
  subjectId: CODING_SUBJECT_ID,
  classroom: classrooms[0],
  academicYear: '2026/2027',
  semester: 'Ganjil',
  finalScore: 89,
  selectedOptimalTPs: [kaTps[0]],
  selectedImprovementTPs: [kaTps[1]],
  descriptionBank: defaultDescriptionBank
});
assert.equal(composedKA.canGenerate, true);
assert.ok(composedKA.highestCompetenceDesc.length > 10);
assert.ok(composedKA.lowestCompetenceDesc.length > 10);

// =========================================================================
// TEST 5, 6, 7: Report Card Eligibility (Graded, Empty-Graded, Opted-Out / Non-Participating)
// =========================================================================
const subjectsAulia = getReportSubjectsForStudent({
  subjects: initialSubjects,
  studentId: studentActiveGraded.id,
  classId: 'cls-viii-1',
  academicYear: '2026/2027',
  semester: 'Ganjil',
  teachingAssignments: assignments,
  scores
});
const auliaInfIdx = subjectsAulia.findIndex((s) => s.id === 'sub-inf');
const auliaKaIdx = subjectsAulia.findIndex((s) => s.id === CODING_SUBJECT_ID);
assert.ok(auliaKaIdx > 0 && auliaKaIdx === auliaInfIdx + 1, 'Rapor siswa peserta KA menempatkan KA tepat setelah Informatika');

const subjectsBagas = getReportSubjectsForStudent({
  subjects: initialSubjects,
  studentId: studentActiveEmptyGrade.id,
  classId: 'cls-vii-1',
  academicYear: '2026/2027',
  semester: 'Ganjil',
  teachingAssignments: assignments,
  scores
});
assert.ok(
  subjectsBagas.some((s) => s.id === CODING_SUBJECT_ID),
  'Siswa peserta KA yang belum dinilai tetap menampilkan nama mapel KA dengan kolom nilai/deskripsi kosong'
);
assert.equal(hasEnteredAssessmentScore(undefined), false);

const subjectsCitra = getReportSubjectsForStudent({
  subjects: initialSubjects,
  studentId: studentExcludedInClass.id,
  classId: 'cls-vii-1',
  academicYear: '2026/2027',
  semester: 'Ganjil',
  teachingAssignments: assignments,
  scores
});
assert.equal(
  subjectsCitra.some((s) => s.id === CODING_SUBJECT_ID),
  false,
  'Siswa yang dikecualikan pada rombel tidak boleh mendapat baris Koding & KA di rapor'
);

const subjectsDimas = getReportSubjectsForStudent({
  subjects: initialSubjects,
  studentId: studentNonParticipatingClass.id,
  classId: 'cls-vii-2',
  academicYear: '2026/2027',
  semester: 'Ganjil',
  teachingAssignments: assignments,
  scores
});
assert.equal(
  subjectsDimas.some((s) => s.id === CODING_SUBJECT_ID),
  false,
  'Kelas yang tidak mengikuti KA (VII.2) tidak boleh otomatis menampilkan Koding & KA atau mengambil nilai dari Informatika'
);

const vii2ClassSubjects = getSubjectsForClassPeriod({
  subjects: initialSubjects,
  classId: 'cls-vii-2',
  academicYear: '2026/2027',
  semester: 'Ganjil',
  teachingAssignments: assignments,
  scores,
  classStudentIds: [studentNonParticipatingClass.id]
});
assert.equal(vii2ClassSubjects.some((s) => s.id === CODING_SUBJECT_ID), false);

// =========================================================================
// TEST 8 & 9: Report Card Rows Builder (Graded vs Empty vs Excluded) for Preview/PDF Parity
// =========================================================================
const rowsGraded = buildReportGradeRows({
  subjects: initialSubjects,
  scores,
  studentId: studentActiveGraded.id,
  classId: 'cls-viii-1',
  academicYear: '2026/2027',
  semester: 'Ganjil',
  teachingAssignments: assignments
});
const kaRowGraded = rowsGraded.find((r) => r.subjectId === CODING_SUBJECT_ID);
const infRowGraded = rowsGraded.find((r) => r.subjectId === 'sub-inf');
assert.ok(kaRowGraded && infRowGraded);
assert.equal(kaRowGraded.no, infRowGraded.no + 1, 'Urutan baris rapor KA tepat setelah Informatika');
assert.equal(kaRowGraded.finalScoreText, '93');
assert.equal(infRowGraded.finalScoreText, '81', 'Nilai Informatika tidak tertukar dengan Koding & KA');
assert.ok(kaRowGraded.competenceText.includes('etis'));
assert.equal(kaRowGraded.isElectiveEmpty, false);

const rowsEmpty = buildReportGradeRows({
  subjects: initialSubjects,
  scores,
  studentId: studentActiveEmptyGrade.id,
  classId: 'cls-vii-1',
  academicYear: '2026/2027',
  semester: 'Ganjil',
  teachingAssignments: assignments
});
const kaRowEmpty = rowsEmpty.find((r) => r.subjectId === CODING_SUBJECT_ID);
assert.ok(kaRowEmpty, 'Peserta KA tanpa nilai tetap mendapat baris mata pelajaran');
assert.equal(kaRowEmpty.isElectiveEmpty, true);
assert.equal(kaRowEmpty.finalScoreText, '', 'Kolom nilai kosong saat peserta belum memiliki nilai');
assert.equal(kaRowEmpty.competenceText, '', 'Kolom deskripsi kosong tanpa nilai palsu saat belum dinilai');

const rowsExcluded = buildReportGradeRows({
  subjects: initialSubjects,
  scores,
  studentId: studentNonParticipatingClass.id,
  classId: 'cls-vii-2',
  academicYear: '2026/2027',
  semester: 'Ganjil',
  teachingAssignments: assignments
});
assert.equal(
  rowsExcluded.some((r) => r.subjectId === CODING_SUBJECT_ID),
  false,
  'Siswa non-peserta tidak menampilkan baris Koding dan Kecerdasan Artifisial di rapor'
);
const infRowDimas = rowsExcluded.find((r) => r.subjectId === 'sub-inf');
assert.equal(infRowDimas?.finalScoreText, '86', 'Informatika siswa non-KA tetap utuh');

// =========================================================================
// TEST 10 & 11: Multi-Semester Academic History & Promotion + Official Transcript Separation
// =========================================================================
const officialTranscriptSubjects = getOfficialTranscriptSubjects(initialSubjects);
assert.equal(
  officialTranscriptSubjects.some((s) => s.id === CODING_SUBJECT_ID),
  false,
  'Transkrip Nilai Resmi tidak boleh dimodifikasi/dimasuki mapel pilihan Koding dan Kecerdasan Artifisial'
);
assert.equal(
  officialTranscriptSubjects.some((s) => s.id === 'sub-inf'),
  true,
  'Transkrip Nilai Resmi tetap memuat Informatika'
);

const electiveHistory = getElectiveHistoryRows({
  student: studentActiveGraded,
  subjects: initialSubjects,
  scores,
  classrooms
});
assert.equal(electiveHistory.length, 3, 'Seluruh riwayat lintas 3 semester (Sem 1 VII, Sem 2 VII, Sem 3 VIII) tersimpan tanpa tertimpa');
assert.deepEqual(
  electiveHistory.map((r) => ({ year: r.academicYear, sem: r.semester, cls: r.className, score: r.finalScore })),
  [
    { year: '2025/2026', sem: 'Ganjil', cls: 'Kelas VII.1', score: 88 },
    { year: '2025/2026', sem: 'Genap', cls: 'Kelas VII.1', score: 90 },
    { year: '2026/2027', sem: 'Ganjil', cls: 'Kelas VIII.1', score: 93 }
  ]
);

// =========================================================================
// TEST 12: Dedicated "RIWAYAT NILAI MATA PELAJARAN PILIHAN" Table & Disclaimer
// =========================================================================
const electiveTableBody = buildElectiveTranscriptTableRows(electiveHistory);
assert.equal(electiveTableBody.length, 3);
assert.deepEqual(
  electiveTableBody.map((r) => [r[1], r[2], r[3], r[4], r[5]]),
  [
    ['Koding dan Kecerdasan Artifisial', '2025/2026', 'Sem. 1 (Ganjil)', 'Kelas VII.1', 88],
    ['Koding dan Kecerdasan Artifisial', '2025/2026', 'Sem. 2 (Genap)', 'Kelas VII.1', 90],
    ['Koding dan Kecerdasan Artifisial', '2026/2027', 'Sem. 3 (Ganjil)', 'Kelas VIII.1', 93]
  ]
);
assert.equal(ELECTIVE_TRANSCRIPT_TITLE, 'RIWAYAT NILAI MATA PELAJARAN PILIHAN');
assert.ok(ELECTIVE_TRANSCRIPT_SUBTITLE.includes('Bukan Transkrip Nilai Resmi Pemerintah'));
assert.ok(ELECTIVE_TRANSCRIPT_DISCLAIMER.includes('BUKAN merupakan Transkrip Nilai Resmi Pemerintah'));

// Empty elective history graceful row
const emptyElectiveTable = buildElectiveTranscriptTableRows([]);
assert.equal(emptyElectiveTable.length, 1);
assert.equal(emptyElectiveTable[0][1], CODING_SUBJECT_NAME);
assert.equal(emptyElectiveTable[0][5], '-');

// =========================================================================
// TEST 13: Normalized Academic Year / Semester & Cleared Exclusion List
// =========================================================================
const variantAssignments: TeachingAssignment[] = [
  {
    id: 'ta-ka-variant',
    teacherId: 'tch-ka',
    teacherName: 'Guru Koding',
    subjectId: CODING_SUBJECT_ID,
    subjectName: CODING_SUBJECT_NAME,
    classId: 'cls-vii-2',
    className: 'Kelas VII.2',
    academicYear: '2026_2027',
    semester: 'Semua',
    status: 'active',
    excludedStudentIds: []
  }
];
const rowsVariant = buildReportGradeRows({
  subjects: initialSubjects,
  scores,
  studentId: studentNonParticipatingClass.id,
  classId: 'cls-vii-2',
  academicYear: '2026 / 2027',
  semester: 'Ganjil',
  teachingAssignments: variantAssignments
});
assert.ok(
  rowsVariant.some((r) => r.subjectId === CODING_SUBJECT_ID),
  'Penugasan dengan format tahun ajaran 2026_2027 / spasi tetap cocok dengan periode aktif'
);
assert.equal(isCodingSubject({ id: 'sub-custom', code: 'KODING', name: 'Koding dan AI' }), true);
assert.equal(isCodingSubject({ id: 'sub-inf', code: 'INF', name: 'Informatika' }), false);

console.log('codingElectiveIntegration tests passed: all 13 verification checks OK!');

