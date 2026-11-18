import assert from 'node:assert/strict';
import {
  computeStudentReportScore,
  calculateFormativeAverage,
  resolveSchoolWeights,
  formatScoreDecimal
} from '../src/utils/assessmentCalculation';
import { Curriculum, LearningChapter } from '../src/types/erapor';

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

const mockCurricula: Curriculum[] = [
  {
    id: 'cur-merdeka',
    code: 'KM',
    name: 'Kurikulum Merdeka',
    phase: 'Fase D',
    description: '',
    formatifWeight: 50,
    sumatifWeight: 50,
    passingCriteria: 75
  }
];

const mockChapters: LearningChapter[] = [
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
    createdAt: '2026-07-02T00:00:00.000Z',
    updatedAt: '2026-07-02T00:00:00.000Z'
  },
  {
    id: 'bab-3',
    code: 'BAB 3',
    orderIndex: 3,
    title: 'Geometri',
    subjectId: 'sub-mtk',
    classId: 'cls-7a',
    gradeLevel: '7',
    teacherId: 'tch-1',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    createdAt: '2026-07-03T00:00:00.000Z',
    updatedAt: '2026-07-03T00:00:00.000Z'
  }
];

// =============================================================================
// TEST 1: Kasus Contoh Resmi Permintaan Pengguna (Bagian 7)
// =============================================================================
runTest('Kasus Pengujian Resmi Bagian 7: Formatif (85,80,90) avg 85 + Sumatif (80,85,80, SAS:50) avg 73.75 => Nilai Akhir 79.38 / 79', () => {
  const weights = resolveSchoolWeights(mockCurricula);
  assert.equal(weights.formatifWeightPercent, 50);
  assert.equal(weights.sumatifWeightPercent, 50);

  // Formatif: 85, 80, 90. Rata-rata Formatif = 85
  const fmt = calculateFormativeAverage([85, 80, 90]);
  assert.equal(fmt.average, 85);
  assert.equal(fmt.count, 3);

  const calc = computeStudentReportScore({
    chapters: mockChapters,
    chapterScores: {
      'bab-1': 80,
      'bab-2': 85,
      'bab-3': 80
    },
    sasScore: 50,
    formatifScores: [85, 80, 90],
    formatifWeightPercent: weights.formatifWeightPercent,
    sumatifWeightPercent: weights.sumatifWeightPercent,
    passingCriteria: 75
  });

  // Komponen Sumatif berbobot sama: BAB 1 (80), BAB 2 (85), BAB 3 (80), SAS (50)
  // Rata-rata Sumatif = (80 + 85 + 80 + 50) / 4 = 295 / 4 = 73.75
  assert.equal(calc.formatifAverage, 85);
  assert.equal(calc.sumatifAverage, 73.75);

  // Nilai Akhir = (85 × 50%) + (73.75 × 50%) = 42.5 + 36.875 = 79.375
  // Pembulatan desimal: 79.38
  assert.equal(calc.rawFinalScore, 79.38);
  // Pembulatan integer skala rapor: 79
  assert.equal(calc.finalScore, 79);
  // Predikat C (KKTP 75, rentang C: 75–79)
  assert.equal(calc.predicate, 'C');

  // Breakdown transparan
  assert.ok(calc.breakdownText.includes('Formatif: 85 × 50%'));
  assert.ok(calc.breakdownText.includes('Sumatif: 73,75 × 50%'));
  assert.ok(calc.breakdownText.includes('79,38 → 79'));

  // Kelengkapan
  assert.equal(calc.isComplete, true);
  assert.equal(calc.completenessStatus, 'LENGKAP');
  assert.equal(calc.hasMissingComponents, false);
});

// =============================================================================
// TEST 2: Nilai formatif belum diisi jangan menganggap nilainya 0
// =============================================================================
runTest('Jika belum ada nilai formatif, tampilkan status belum lengkap dan jangan menganggap nilainya 0', () => {
  const calc = computeStudentReportScore({
    chapters: mockChapters,
    chapterScores: {
      'bab-1': 80,
      'bab-2': 85,
      'bab-3': 80
    },
    sasScore: 50,
    formatifScores: [], // Kosong!
    formatifWeightPercent: 50,
    sumatifWeightPercent: 50
  });

  assert.equal(calc.formatifAverage, undefined);
  assert.equal(calc.sumatifAverage, 73.75);
  assert.equal(calc.isComplete, false);
  assert.equal(calc.completenessStatus, 'BELUM_LENGKAP');
  assert.ok(calc.missingWarnings.some((w) => w.includes('Formatif belum diisi')));
  assert.ok(!calc.breakdownText.includes('Formatif: 0'));
});

// =============================================================================
// TEST 3: SAS belum diisi jangan menganggap nilainya 0
// =============================================================================
runTest('Jika SAS belum diisi, tampilkan status belum lengkap dan jangan menganggap nilainya 0', () => {
  const calc = computeStudentReportScore({
    chapters: mockChapters,
    chapterScores: {
      'bab-1': 80,
      'bab-2': 85,
      'bab-3': 80
    },
    sasScore: undefined, // Belum diisi!
    formatifScores: [85, 80, 90],
    formatifWeightPercent: 50,
    sumatifWeightPercent: 50
  });

  assert.equal(calc.sasScore, undefined);
  // Rata-rata sumatif sementara hanya dari BAB yang ada: (80 + 85 + 80)/3 = 81.67
  assert.equal(calc.sumatifAverage, 81.67);
  assert.equal(calc.isComplete, false);
  assert.equal(calc.completenessStatus, 'BELUM_LENGKAP');
  assert.ok(calc.missingWarnings.some((w) => w.includes('SAS belum diisi')));
});

// =============================================================================
// TEST 4: Pembeda eksplisit 0 vs kosong
// =============================================================================
runTest('Pembeda angka 0 eksplisit (hadir tapi dapat 0) vs belum dinilai/kosong', () => {
  const zeroSasCalc = computeStudentReportScore({
    chapters: mockChapters,
    chapterScores: { 'bab-1': 80, 'bab-2': 80, 'bab-3': 80 },
    sasScore: 0, // Eksplisit dinilai 0
    formatifScores: [80],
    formatifWeightPercent: 50,
    sumatifWeightPercent: 50
  });

  // Sumatif = (80 + 80 + 80 + 0) / 4 = 240 / 4 = 60
  assert.equal(zeroSasCalc.sasScore, 0);
  assert.equal(zeroSasCalc.sumatifAverage, 60);
  // Nilai Akhir = (80 * 0.5) + (60 * 0.5) = 40 + 30 = 70
  assert.equal(zeroSasCalc.finalScore, 70);
  assert.equal(zeroSasCalc.isComplete, true);
});

// =============================================================================
// TEST 5: Manual Override mengesampingkan rumus hitungan
// =============================================================================
runTest('Manual Override langsung menetapkan Nilai Akhir sesuai input guru', () => {
  const manualCalc = computeStudentReportScore({
    chapters: mockChapters,
    chapterScores: { 'bab-1': 80, 'bab-2': 85, 'bab-3': 80 },
    sasScore: 50,
    formatifScores: [85, 80, 90],
    manualFinalScore: 82, // Manual override
    formatifWeightPercent: 50,
    sumatifWeightPercent: 50
  });

  assert.equal(manualCalc.finalScore, 82);
  assert.ok(manualCalc.breakdownText.includes('Input langsung Nilai Akhir oleh guru: 82'));
});

// =============================================================================
// TEST 6: Format desimal koma Indonesia (formatScoreDecimal)
// =============================================================================
runTest('formatScoreDecimal menghasilkan angka koma Indonesia yang rapi', () => {
  assert.equal(formatScoreDecimal(85), '85');
  assert.equal(formatScoreDecimal(73.75), '73,75');
  assert.equal(formatScoreDecimal(79.375), '79,38');
  assert.equal(formatScoreDecimal(42.5), '42,5');
});

console.log(`All ${passed} tests passed!`);
