import assert from 'node:assert/strict';
import { Extracurricular, StudentExtracurricular } from '../src/types/erapor';
import {
  buildPdfExtracurricularTableBody,
  resolveStudentExtracurricularRows
} from '../src/utils/extracurricularReportHelper';

const masterEkskul: Extracurricular[] = [
  {
    id: 'ekskul-1',
    name: 'Pramuka Gudep SMPN 1 Rangsang',
    coachName: 'Rahmat Hidayat, S.Pd.',
    dayAndTime: 'Jumat, 15:00 - 17:00 WIB',
    description: 'Kepanduan dan kepemimpinan.'
  },
  {
    id: 'ekskul-2',
    name: 'Palang Merah Remaja (PMR)',
    coachName: 'Siti Rohani, S.Pd.',
    dayAndTime: 'Sabtu, 08:00 - 10:00 WIB',
    description: 'Kepalangmerahan.'
  },
  {
    id: 'ekskul-4',
    name: 'Futsal & Sepak Bola Sekolah',
    coachName: 'Hendra Wijaya, S.Pd.',
    dayAndTime: 'Selasa & Sabtu sore',
    description: 'Olahraga beregu.'
  }
];

const records: StudentExtracurricular[] = [
  // Kondisi 1: Siswa A hanya ikut Pramuka pada 2026/2027 Ganjil
  {
    id: 'se-a-1',
    studentId: 'std-a',
    extracurricularId: 'ekskul-1',
    classId: 'cls-vii-1',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    predicate: 'Sangat Baik',
    description: 'Aktif mengikuti latihan kepramukaan dan disiplin.'
  },
  // Data Siswa A di semester berbeda (Genap) — tidak boleh ikut tercetak pada Ganjil
  {
    id: 'se-a-genap',
    studentId: 'std-a',
    extracurricularId: 'ekskul-2',
    classId: 'cls-vii-1',
    academicYear: '2026/2027',
    semester: 'Genap',
    predicate: 'Baik',
    description: 'Aktif di PMR semester genap.'
  },
  // Kondisi 2: Siswa B ikut lebih dari satu kegiatan (Pramuka & Futsal)
  {
    id: 'se-b-1',
    studentId: 'std-b',
    extracurricularId: 'ekskul-1',
    classId: 'cls-vii-1',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    predicate: 'Baik',
    description: 'Rajin hadir latihan mingguan.'
  },
  {
    id: 'se-b-2',
    studentId: 'std-b',
    extracurricularId: 'ekskul-4',
    classId: 'cls-vii-1',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    predicate: 'Sangat Baik',
    description: 'Menunjukkan kerja sama tim yang baik dalam futsal.'
  },
  // Data tahun ajaran berbeda — tidak boleh ikut tercetak pada 2026/2027
  {
    id: 'se-c-old-year',
    studentId: 'std-c',
    extracurricularId: 'ekskul-1',
    classId: 'cls-vii-1',
    academicYear: '2025/2026',
    semester: 'Ganjil',
    predicate: 'Baik',
    description: 'Data tahun sebelumnya.'
  },
  // Record tidak mengikuti secara eksplisit atau ID ekskul tidak valid
  {
    id: 'se-c-nonaktif',
    studentId: 'std-c',
    extracurricularId: 'ekskul-2',
    classId: 'cls-vii-1',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    predicate: '-' as any,
    description: 'Tidak mengikuti'
  },
  {
    id: 'se-c-orphan',
    studentId: 'std-c',
    extracurricularId: 'ekskul-terhapus',
    classId: 'cls-vii-1',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    predicate: 'Baik',
    description: 'Kegiatan terhapus.'
  }
];

// Uji Kondisi 1: Siswa mengikuti Pramuka
const rowsA = resolveStudentExtracurricularRows({
  studentId: 'std-a',
  academicYear: '2026/2027',
  semester: 'Ganjil',
  extracurriculars: masterEkskul,
  studentExtracurriculars: records
});
assert.equal(rowsA.length, 1);
assert.equal(rowsA[0].no, 1);
assert.equal(rowsA[0].activityName, 'Pramuka Gudep SMPN 1 Rangsang');
assert.equal(rowsA[0].predicate, 'Sangat Baik');
assert.equal(rowsA[0].description, 'Aktif mengikuti latihan kepramukaan dan disiplin.');
assert.deepEqual(buildPdfExtracurricularTableBody(rowsA), [
  [1, 'Pramuka Gudep SMPN 1 Rangsang', 'Sangat Baik', 'Aktif mengikuti latihan kepramukaan dan disiplin.']
]);

// Uji Kondisi 2: Siswa mengikuti lebih dari satu kegiatan
const rowsB = resolveStudentExtracurricularRows({
  studentId: 'std-b',
  academicYear: '2026/2027',
  semester: 'Ganjil',
  extracurriculars: masterEkskul,
  studentExtracurriculars: records
});
assert.equal(rowsB.length, 2);
assert.deepEqual(
  rowsB.map((r) => [r.no, r.activityName, r.predicate]),
  [
    [1, 'Pramuka Gudep SMPN 1 Rangsang', 'Baik'],
    [2, 'Futsal & Sepak Bola Sekolah', 'Sangat Baik']
  ]
);
assert.equal(buildPdfExtracurricularTableBody(rowsB).length, 2);

// Uji Kondisi 3: Siswa tidak mengikuti kegiatan apa pun pada periode cetak
const rowsC = resolveStudentExtracurricularRows({
  studentId: 'std-c',
  academicYear: '2026/2027',
  semester: 'Ganjil',
  extracurriculars: masterEkskul,
  studentExtracurriculars: records
});
assert.equal(rowsC.length, 0, 'Siswa tanpa ekskul aktif pada periode cetak tidak boleh mendapat Pramuka otomatis');
assert.deepEqual(
  buildPdfExtracurricularTableBody(rowsC),
  [['', '', '', '']],
  'Tabel PDF harus tetap ada dengan 1 baris kosong tanpa teks kegiatan/predikat/keterangan'
);

// Uji Kondisi 3b: Siswa benar-benar belum memiliki record sama sekali
const rowsD = resolveStudentExtracurricularRows({
  studentId: 'std-belum-ada',
  academicYear: '2026/2027',
  semester: 'Ganjil',
  extracurriculars: masterEkskul,
  studentExtracurriculars: records
});
assert.equal(rowsD.length, 0);
assert.deepEqual(buildPdfExtracurricularTableBody(rowsD), [['', '', '', '']]);

console.log('extracurricularReport tests passed: 3 core conditions + validation & parity checks OK');
