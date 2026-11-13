import * as XLSX from 'xlsx';
import {
  Student,
  Teacher,
  Classroom,
  Subject,
  AssessmentScore,
  KokurikulerAchievementLevel,
  KokurikulerGroup,
  KokurikulerActivity,
  KokurikulerDimensionMaster,
  KokurikulerScore,
  KokurikulerDescription
} from '../types/erapor';
import { sortSubjects } from '../utils/subjectSort';
import {
  buildKokurikulerScoreId,
  getSubdimensionMap,
  mapLevelToNumericCode,
  mapNumericCodeToLevel
} from '../utils/kokurikulerHelper';

// 1. Export Students to Excel
export const exportStudentsToExcel = (
  students: Student[],
  classrooms: Classroom[],
  filename: string = 'Dapodik_Data_Siswa_SMPN1Rangsang.xlsx'
) => {
  const classMap = new Map(classrooms.map((c) => [c.id, c.name]));

  const data = students.map((s, idx) => ({
    NO: idx + 1,
    NIS: s.nis,
    NISN: s.nisn,
    NAMA_LENGKAP: s.name,
    JK: s.gender,
    TEMPAT_LAHIR: s.pob,
    TANGGAL_LAHIR: s.dob,
    AGAMA: s.religion,
    ALAMAT_TINGGAL: s.address,
    NAMA_AYAH: s.fatherName,
    NAMA_IBU: s.motherName,
    PEKERJAAN_AYAH: s.fatherJob,
    PEKERJAAN_IBU: s.motherJob,
    NO_HP_ORANGTUA: s.parentPhone,
    ROMBEL: classMap.get(s.classId) || s.classId,
    STATUS: s.status
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Peserta_Didik');
  XLSX.writeFile(workbook, filename);
};

// 2. Download Student Import Template
export const downloadStudentImportTemplate = () => {
  const template = [
    {
      NIS: '24710',
      NISN: '0112345678',
      NAMA_LENGKAP: 'Budi Santoso',
      JK: 'L',
      TEMPAT_LAHIR: 'Tanjung Samak',
      TANGGAL_LAHIR: '2011-05-15',
      AGAMA: 'Islam',
      ALAMAT: 'Jl. Bahari No. 10 Tanjung Samak',
      NAMA_AYAH: 'Samsuri',
      NAMA_IBU: 'Halimah',
      PEKERJAAN_AYAH: 'Nelayan',
      PEKERJAAN_IBU: 'Ibu Rumah Tangga',
      NO_HP: '0812-7000-1122',
      KELAS: 'Kelas VII.1',
      STATUS: 'Aktif'
    },
    {
      NIS: '24711',
      NISN: '0119876543',
      NAMA_LENGKAP: 'Nurul Hidayah',
      JK: 'P',
      TEMPAT_LAHIR: 'Selatpanjang',
      TANGGAL_LAHIR: '2011-09-20',
      AGAMA: 'Islam',
      ALAMAT: 'Jl. Merdeka No. 45',
      NAMA_AYAH: 'Herman',
      NAMA_IBU: 'Rosnani',
      PEKERJAAN_AYAH: 'Wiraswasta',
      PEKERJAAN_IBU: 'Pedagang',
      NO_HP: '0813-7000-3344',
      KELAS: 'Kelas VII.1',
      STATUS: 'Aktif'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(template);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template_Siswa_Dapodik');
  XLSX.writeFile(workbook, 'Template_Import_Siswa_Dapodik_SMPN1Rangsang.xlsx');
};

// 3. Parse Student Excel File
export interface ParseStudentResult {
  validStudents: Partial<Student>[];
  errors: string[];
  totalRows: number;
}

export const parseStudentExcelFile = async (file: File, classrooms: Classroom[]): Promise<ParseStudentResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);

        const classNameToIdMap = new Map<string, string>();
        classrooms.forEach((c) => {
          const name = c.name.toLowerCase().trim();
          classNameToIdMap.set(name, c.id);
          classNameToIdMap.set(c.id.toLowerCase().trim(), c.id);
          
          // Also map short names like "vii.1" if full name is "Kelas VII.1"
          const shortName = name.replace('kelas', '').trim();
          if (shortName) classNameToIdMap.set(shortName, c.id);

          // Map grade + index like "7.1"
          const numericName = `${c.gradeLevel}.${name.split('.').pop() || ''}`;
          classNameToIdMap.set(numericName, c.id);
        });

        const validStudents: Partial<Student>[] = [];
        const errors: string[] = [];

        rows.forEach((row, idx) => {
          const rowNum = idx + 2; // header is row 1
          const nisn = String(row.NISN || row.nisn || '').trim();
          const name = String(row.NAMA_LENGKAP || row.nama || row.Nama || '').trim();
          const jk = String(row.JK || row.jk || row.Jenis_Kelamin || 'L').trim().toUpperCase();
          const rawClassInput = String(row.KELAS || row.kelas || row.Rombel || row.ROMBEL || '').trim().toLowerCase();

          if (!name) {
            errors.push(`Baris ${rowNum}: Nama siswa kosong.`);
            return;
          }

          if (!nisn || nisn.length < 8) {
            errors.push(`Baris ${rowNum} (${name}): Format NISN '${nisn}' tidak valid (minimal 8-10 digit).`);
            return;
          }

          // Robust matching: check exact, then without "kelas", then defaults
          let matchedClassId = classNameToIdMap.get(rawClassInput);
          
          if (!matchedClassId) {
            // Try cleaning common prefixes
            const cleanRaw = rawClassInput.replace('kelas', '').trim();
            matchedClassId = classNameToIdMap.get(cleanRaw);
          }

          if (!matchedClassId) {
            // Fallback to classrooms[0] but log warning
            matchedClassId = classrooms[0]?.id || 'cls-vii-1';
          }

          validStudents.push({
            id: `std-imp-${Date.now()}-${idx}`,
            nis: String(row.NIS || row.nis || Math.floor(10000 + Math.random() * 90000)),
            nisn: nisn,
            name: name,
            gender: jk === 'P' ? 'P' : 'L',
            pob: String(row.TEMPAT_LAHIR || row.tempat_lahir || 'Tanjung Samak'),
            dob: String(row.TANGGAL_LAHIR || row.tanggal_lahir || '2011-01-01'),
            religion: (row.AGAMA || 'Islam') as any,
            address: String(row.ALAMAT || row.alamat || 'Kecamatan Rangsang'),
            fatherName: String(row.NAMA_AYAH || row.ayah || '-'),
            motherName: String(row.NAMA_IBU || row.ibu || '-'),
            fatherJob: String(row.PEKERJAAN_AYAH || '-'),
            motherJob: String(row.PEKERJAAN_IBU || '-'),
            parentPhone: String(row.NO_HP || row.no_hp || '-'),
            classId: matchedClassId,
            status: 'Aktif'
          });
        });

        resolve({
          validStudents,
          errors,
          totalRows: rows.length
        });
      } catch (err: any) {
        reject(new Error(`Gagal membaca file Excel: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membuka file.'));
    reader.readAsBinaryString(file);
  });
};

// 4. Export Leger Nilai to Excel
export const exportLegerToExcel = (
  classroom: Classroom,
  students: Student[],
  subjects: Subject[],
  scores: AssessmentScore[],
  academicYear: string,
  semester: string
) => {
  // Build a 2D lookup: studentId -> subjectId -> finalScore
  const scoreMap = new Map<string, Map<string, number>>();
  scores.forEach((sc) => {
    if (sc.classId === classroom.id && sc.semester === semester && sc.academicYear === academicYear) {
      if (!scoreMap.has(sc.studentId)) {
        scoreMap.set(sc.studentId, new Map());
      }
      scoreMap.get(sc.studentId)!.set(sc.subjectId, sc.finalScore);
    }
  });

  const sortedSubjects = sortSubjects(subjects);

  // Calculate student totals & ranking
  const studentRows = students.map((std, idx) => {
    const sMap = scoreMap.get(std.id) || new Map();
    let totalScore = 0;
    let gradedCount = 0;

    const rowObj: Record<string, any> = {
      NO: idx + 1,
      NIS: std.nis,
      NISN: std.nisn,
      NAMA_SISWA: std.name,
      JK: std.gender
    };

    sortedSubjects.forEach((sb) => {
      const score = sMap.get(sb.id) ?? '-';
      rowObj[sb.code] = score;
      if (typeof score === 'number') {
        totalScore += score;
        gradedCount += 1;
      }
    });

    const average = gradedCount > 0 ? Number((totalScore / gradedCount).toFixed(1)) : 0;
    rowObj['JUMLAH_NILAI'] = totalScore;
    rowObj['RATA_RATA'] = average;

    return {
      rowObj,
      totalScore,
      average
    };
  });

  // Sort by average to determine rank
  const sorted = [...studentRows].sort((a, b) => b.average - a.average);
  const rankMap = new Map<any, number>();
  sorted.forEach((item, rIdx) => {
    rankMap.set(item, rIdx + 1);
  });

  const finalRows = studentRows.map((item) => {
    const finalObj = { ...item.rowObj, PERINGKAT: rankMap.get(item) || 1 };
    return finalObj;
  });

  const worksheet = XLSX.utils.json_to_sheet(finalRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Leger_${classroom.name.replace(/\s+/g, '_')}`);

  XLSX.writeFile(
    workbook,
    `Leger_Nilai_${classroom.name.replace(/\s+/g, '_')}_${academicYear.replace('/', '-')}_${semester}.xlsx`
  );
};

// ============================================================================
// 5. KOKURIKULER EXCEL TEMPLATE, VALIDATOR & REPORT EXPORTER
// ============================================================================

export const downloadKokurikulerTemplate = (
  schoolName: string,
  group: KokurikulerGroup,
  activity: KokurikulerActivity,
  students: Student[],
  classrooms: Classroom[],
  dimensions: KokurikulerDimensionMaster[],
  existingScores: KokurikulerScore[] = []
) => {
  const classMap = new Map(classrooms.map((c) => [c.id, c.name]));
  const subMap = getSubdimensionMap(dimensions);

  const targetSubs = (activity.subdimensionIds || [])
    .map((id) => subMap.get(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const groupStudentSet = new Set(group.studentIds || []);
  const enrolledStudents = students
    .filter((s) => groupStudentSet.has(s.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Build existing score lookup: scoreId -> KokurikulerScore
  const scoreMap = new Map(existingScores.map((sc) => [sc.id, sc]));

  // Sheet 1: Input Nilai Kokurikuler
  const aoa: any[][] = [
    [`FORMAT IMPORT NILAI KOKURIKULER - ${schoolName.toUpperCase()}`],
    ['PETUNJUK', 'Isi kolom subdimensi HANYA dengan kode angka: 1 = Berkembang, 2 = Cakap, 3 = Mahir. Kosongkan sel jika belum dinilai (jangan diisi 0).'],
    ['KODE_KELOMPOK', group.code, 'NAMA_KELOMPOK', group.name],
    ['ID_KEGIATAN', activity.id, 'NAMA_KEGIATAN', activity.name],
    ['TAHUN_PELAJARAN', group.academicYear, 'SEMESTER', group.semester],
    ['TEMA', activity.theme, 'FASE', activity.phase],
    [], // Blank separator row (Row 7)
    [
      'NO',
      'NIS',
      'NISN',
      'NAMA_SISWA',
      'ROMBEL',
      ...targetSubs.map((item) => `[${item.sub.code}] ${item.sub.name}`)
    ]
  ];

  enrolledStudents.forEach((std, idx) => {
    const subValues = targetSubs.map((item) => {
      const scoreId = buildKokurikulerScoreId(
        group.academicYear,
        group.semester,
        group.id,
        activity.id,
        std.id,
        item.sub.id
      );
      const found = scoreMap.get(scoreId);
      return found ? mapLevelToNumericCode(found.level) : '';
    });

    aoa.push([
      idx + 1,
      std.nis || '',
      std.nisn || '',
      std.name,
      classMap.get(std.classId) || '-',
      ...subValues
    ]);
  });

  const wsInput = XLSX.utils.aoa_to_sheet(aoa);
  wsInput['!cols'] = [
    { wch: 5 },
    { wch: 12 },
    { wch: 14 },
    { wch: 30 },
    { wch: 14 },
    ...targetSubs.map(() => ({ wch: 24 }))
  ];

  // Sheet 2: Referensi Kode & Rubrik BSKAP 058/H/KR/2025
  const rubricAoa: any[][] = [
    ['REFERENSI KODE PENILAIAN KOKURIKULER (BSKAP NO. 058/H/KR/2025 - SMP FASE D)'],
    [],
    ['KODE ANGKA', 'TINGKATAN CAPAIAN', 'KETERANGAN'],
    [1, 'Berkembang', 'Mulai menunjukkan pemahaman/perilaku sesuai subdimensi dengan arahan/bimbingan pendidik.'],
    [2, 'Cakap', 'Standar kelulusan SMP: konsisten memahami dan mengamalkan subdimensi secara mandiri.'],
    [3, 'Mahir', 'Melampaui standar: menjadi teladan, menginisiasi, dan menginspirasi komunitas sekolah.'],
    ['(Kosong)', 'Belum Dinilai', 'Sel kosong tidak akan dipaksa menjadi angka 1 dan akan dilewati saat import.'],
    [],
    ['KODE SUBDIMENSI', 'DIMENSI PROFIL LULUSAN', 'NAMA SUBDIMENSI', '1 = BERKEMBANG', '2 = CAKAP', '3 = MAHIR']
  ];

  targetSubs.forEach(({ sub, dim }) => {
    rubricAoa.push([
      sub.code,
      dim.name,
      sub.name,
      sub.levelDescriptions.Berkembang,
      sub.levelDescriptions.Cakap,
      sub.levelDescriptions.Mahir
    ]);
  });

  const wsRef = XLSX.utils.aoa_to_sheet(rubricAoa);
  wsRef['!cols'] = [
    { wch: 16 },
    { wch: 28 },
    { wch: 28 },
    { wch: 42 },
    { wch: 42 },
    { wch: 42 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsInput, 'Input_Nilai_Kokurikuler');
  XLSX.utils.book_append_sheet(wb, wsRef, 'Referensi_Kode_dan_Rubrik');

  const safeGroup = group.code.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeAct = activity.name.slice(0, 24).replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(
    wb,
    `Format_Kokurikuler_${safeGroup}_${safeAct}_${group.academicYear.replace('/', '-')}_${group.semester}.xlsx`
  );
};

export interface ParsedKokurikulerEntry {
  rowNumber: number;
  studentId: string;
  studentName: string;
  nis: string;
  nisn: string;
  rombelId: string;
  dimensionId: string;
  subdimensionId: string;
  subdimensionCode: string;
  subdimensionName: string;
  numericCode: 1 | 2 | 3;
  level: KokurikulerAchievementLevel;
  scoreId: string;
  hasExisting: boolean;
  existingLevel?: KokurikulerAchievementLevel;
}

export interface ParseKokurikulerResult {
  validEntries: ParsedKokurikulerEntry[];
  skippedEmptyCount: number;
  duplicateStudentErrors: string[];
  rowErrors: string[];
  metadataErrors: string[];
  existingConflicts: number;
  totalRowsProcessed: number;
}

export const parseAndValidateKokurikulerExcel = async (
  file: File,
  group: KokurikulerGroup,
  activity: KokurikulerActivity,
  groupStudents: Student[],
  existingScores: KokurikulerScore[],
  dimensions: KokurikulerDimensionMaster[]
): Promise<ParseKokurikulerResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          reject(new Error('File Excel kosong atau tidak memiliki sheet yang valid.'));
          return;
        }

        const sheetName = workbook.SheetNames.includes('Input_Nilai_Kokurikuler')
          ? 'Input_Nilai_Kokurikuler'
          : workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const matrix = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });

        const metadataErrors: string[] = [];
        const duplicateStudentErrors: string[] = [];
        const rowErrors: string[] = [];
        const validEntries: ParsedKokurikulerEntry[] = [];
        let skippedEmptyCount = 0;

        // Validate optional metadata lines in first 8 rows
        for (let r = 0; r < Math.min(8, matrix.length); r++) {
          const row = matrix[r] || [];
          const key = String(row[0] || '').trim().toUpperCase();
          if (key === 'KODE_KELOMPOK' && String(row[1] || '').trim() && String(row[1] || '').trim() !== group.code) {
            metadataErrors.push(
              `Kode Kelompok di file (${row[1]}) tidak cocok dengan kelompok terpilih (${group.code}).`
            );
          }
          if (key === 'ID_KEGIATAN' && String(row[1] || '').trim() && String(row[1] || '').trim() !== activity.id) {
            metadataErrors.push(
              `ID Kegiatan di file (${row[1]}) tidak cocok dengan kegiatan terpilih (${activity.name}).`
            );
          }
          if (key === 'TAHUN_PELAJARAN') {
            const fileYear = String(row[1] || '').trim();
            const fileSem = String(row[3] || '').trim();
            if (fileYear && fileYear !== group.academicYear) {
              metadataErrors.push(`Tahun pelajaran file (${fileYear}) berbeda dengan kelompok (${group.academicYear}).`);
            }
            if (fileSem && fileSem !== group.semester) {
              metadataErrors.push(`Semester file (${fileSem}) berbeda dengan kelompok (${group.semester}).`);
            }
          }
        }

        // Locate header row containing NAMA_SISWA or NISN
        let headerRowIdx = -1;
        for (let r = 0; r < Math.min(15, matrix.length); r++) {
          const cells = (matrix[r] || []).map((c) => String(c || '').trim().toUpperCase());
          if (cells.includes('NAMA_SISWA') && (cells.includes('NISN') || cells.includes('NIS'))) {
            headerRowIdx = r;
            break;
          }
        }

        if (headerRowIdx === -1) {
          reject(
            new Error(
              'Format kolom tidak dikenali. Gunakan tombol "Download Format Kelompok Ini" untuk mendapatkan struktur kolom resmi.'
            )
          );
          return;
        }

        const headers = (matrix[headerRowIdx] || []).map((c) => String(c || '').trim());
        const nisColIdx = headers.findIndex((h) => h.toUpperCase() === 'NIS');
        const nisnColIdx = headers.findIndex((h) => h.toUpperCase() === 'NISN');
        const nameColIdx = headers.findIndex((h) => h.toUpperCase() === 'NAMA_SISWA');

        const subMap = getSubdimensionMap(dimensions);
        const targetSubs = (activity.subdimensionIds || [])
          .map((id) => subMap.get(id))
          .filter((item): item is NonNullable<typeof item> => Boolean(item));

        // Map Excel column index -> { sub, dim }
        const colToSub = new Map<number, { subId: string; subCode: string; subName: string; dimId: string }>();
        headers.forEach((h, cIdx) => {
          if (cIdx <= Math.max(nisColIdx, nisnColIdx, nameColIdx, 4)) return;
          const codeMatch = h.match(/^\[([^\]]+)\]/);
          const extractedCode = codeMatch ? codeMatch[1].trim() : '';
          const found = targetSubs.find(
            ({ sub }) =>
              (extractedCode && sub.code.toLowerCase() === extractedCode.toLowerCase()) ||
              sub.name.toLowerCase() === h.toLowerCase() ||
              `[${sub.code}] ${sub.name}`.toLowerCase() === h.toLowerCase()
          );
          if (found) {
            colToSub.set(cIdx, {
              subId: found.sub.id,
              subCode: found.sub.code,
              subName: found.sub.name,
              dimId: found.dim.id
            });
          }
        });

        if (colToSub.size === 0) {
          reject(
            new Error(
              'Tidak ada kolom subdimensi pada file yang cocok dengan target Profil Lulusan kegiatan ini.'
            )
          );
          return;
        }

        // Student lookups scoped strictly to registered groupStudents
        const byNisn = new Map<string, Student>();
        const byNis = new Map<string, Student>();
        const byName = new Map<string, Student>();
        groupStudents.forEach((s) => {
          if (s.nisn) byNisn.set(s.nisn.trim(), s);
          if (s.nis) byNis.set(s.nis.trim(), s);
          byName.set(s.name.trim().toLowerCase(), s);
        });

        const existingMap = new Map(existingScores.map((sc) => [sc.id, sc]));
        const seenStudentIds = new Set<string>();
        let totalRowsProcessed = 0;

        for (let r = headerRowIdx + 1; r < matrix.length; r++) {
          const row = matrix[r] || [];
          const excelRowNum = r + 1;
          const rawNis = nisColIdx >= 0 ? String(row[nisColIdx] || '').trim() : '';
          const rawNisn = nisnColIdx >= 0 ? String(row[nisnColIdx] || '').trim() : '';
          const rawName = nameColIdx >= 0 ? String(row[nameColIdx] || '').trim() : '';

          // Skip completely empty trailing rows
          if (!rawNis && !rawNisn && !rawName) continue;
          totalRowsProcessed += 1;

          const matchedStudent =
            (rawNisn && byNisn.get(rawNisn)) ||
            (rawNis && byNis.get(rawNis)) ||
            (rawName && byName.get(rawName.toLowerCase()));

          if (!matchedStudent) {
            rowErrors.push(
              `Baris ${excelRowNum} (${rawName || rawNisn || rawNis}): Siswa tidak terdaftar sebagai anggota kelompok "${group.name}".`
            );
            continue;
          }

          if (seenStudentIds.has(matchedStudent.id)) {
            duplicateStudentErrors.push(
              `Baris ${excelRowNum}: Siswa ganda terdeteksi (${matchedStudent.name} / NISN ${matchedStudent.nisn}). Baris duplikat dilewati.`
            );
            continue;
          }
          seenStudentIds.add(matchedStudent.id);

          colToSub.forEach((subInfo, colIdx) => {
            const rawVal = row[colIdx];
            const mapped = mapNumericCodeToLevel(rawVal);
            if (!mapped.valid) {
              rowErrors.push(
                `Baris ${excelRowNum} (${matchedStudent.name}) kolom [${subInfo.subCode}]: Nilai "${rawVal}" ditolak. Hanya diperbolehkan kode 1, 2, 3, atau kosong.`
              );
              return;
            }
            if (mapped.empty || !mapped.level) {
              skippedEmptyCount += 1;
              return;
            }

            const scoreId = buildKokurikulerScoreId(
              group.academicYear,
              group.semester,
              group.id,
              activity.id,
              matchedStudent.id,
              subInfo.subId
            );
            const existing = existingMap.get(scoreId);

            validEntries.push({
              rowNumber: excelRowNum,
              studentId: matchedStudent.id,
              studentName: matchedStudent.name,
              nis: matchedStudent.nis,
              nisn: matchedStudent.nisn,
              rombelId: matchedStudent.classId,
              dimensionId: subInfo.dimId,
              subdimensionId: subInfo.subId,
              subdimensionCode: subInfo.subCode,
              subdimensionName: subInfo.subName,
              numericCode: Number(String(rawVal).trim()) as 1 | 2 | 3,
              level: mapped.level,
              scoreId,
              hasExisting: Boolean(existing),
              existingLevel: existing?.level
            });
          });
        }

        const existingConflicts = validEntries.filter((v) => v.hasExisting).length;

        resolve({
          validEntries,
          skippedEmptyCount,
          duplicateStudentErrors,
          rowErrors,
          metadataErrors,
          existingConflicts,
          totalRowsProcessed
        });
      } catch (err: any) {
        reject(new Error(`Gagal membaca file Excel Kokurikuler: ${err?.message || err}`));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membuka berkas Excel.'));
    reader.readAsBinaryString(file);
  });
};

export const exportKokurikulerReportToExcel = (
  schoolName: string,
  academicYear: string,
  semester: string,
  groups: KokurikulerGroup[],
  activities: KokurikulerActivity[],
  scores: KokurikulerScore[],
  descriptions: KokurikulerDescription[],
  students: Student[],
  classrooms: Classroom[],
  dimensions: KokurikulerDimensionMaster[]
) => {
  const classMap = new Map(classrooms.map((c) => [c.id, c.name]));
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const groupMap = new Map(groups.map((g) => [g.id, g]));
  const actMap = new Map(activities.map((a) => [a.id, a]));
  const subMap = getSubdimensionMap(dimensions);

  // Sheet 1: Rekap Peserta & Deskripsi
  const summaryRows: any[] = [];
  activities.forEach((act) => {
    const grp = groupMap.get(act.groupId);
    if (!grp) return;
    (grp.studentIds || []).forEach((sid) => {
      const std = studentMap.get(sid);
      if (!std) return;
      const desc = descriptions.find(
        (d) =>
          d.studentId === sid &&
          d.activityId === act.id &&
          d.groupId === grp.id &&
          d.academicYear === academicYear &&
          d.semester === semester
      );
      const stdScores = scores.filter(
        (sc) =>
          sc.studentId === sid &&
          sc.activityId === act.id &&
          sc.groupId === grp.id &&
          sc.academicYear === academicYear &&
          sc.semester === semester
      );
      const countBerkembang = stdScores.filter((s) => s.level === 'Berkembang').length;
      const countCakap = stdScores.filter((s) => s.level === 'Cakap').length;
      const countMahir = stdScores.filter((s) => s.level === 'Mahir').length;

      summaryRows.push({
        TAHUN_PELAJARAN: academicYear,
        SEMESTER: semester,
        KODE_KELOMPOK: grp.code,
        NAMA_KELOMPOK: grp.name,
        KEGIATAN: act.name,
        TEMA: act.theme,
        NIS: std.nis,
        NISN: std.nisn,
        NAMA_SISWA: std.name,
        ROMBEL: classMap.get(std.classId) || '-',
        SUBDIMENSI_TERISI: `${stdScores.length}/${act.subdimensionIds.length}`,
        BERKEMBANG: countBerkembang,
        CAKAP: countCakap,
        MAHIR: countMahir,
        STATUS_DESKRIPSI: desc?.status || 'Belum diisi',
        DESKRIPSI_RAPOR: desc?.description || '-'
      });
    });
  });

  // Sheet 2: Detail Capaian Subdimensi
  const detailRows = scores
    .filter((sc) => sc.academicYear === academicYear && sc.semester === semester)
    .map((sc, idx) => {
      const std = studentMap.get(sc.studentId);
      const grp = groupMap.get(sc.groupId);
      const act = actMap.get(sc.activityId);
      const meta = subMap.get(sc.subdimensionId);
      return {
        NO: idx + 1,
        KODE_KELOMPOK: grp?.code || '-',
        NAMA_KELOMPOK: grp?.name || '-',
        KEGIATAN: act?.name || '-',
        NISN: std?.nisn || '-',
        NAMA_SISWA: std?.name || '-',
        ROMBEL: classMap.get(sc.rombelId) || '-',
        DIMENSI: meta?.dim.name || sc.dimensionId,
        KODE_SUB: meta?.sub.code || sc.subdimensionId,
        SUBDIMENSI: meta?.sub.name || sc.subdimensionId,
        CAPAIAN: sc.level,
        STATUS: sc.status
      };
    });

  // Sheet 3: Ringkasan Kelompok
  const groupRows = groups.map((g, idx) => {
    const grpActs = activities.filter((a) => a.groupId === g.id);
    const grpScores = scores.filter((sc) => sc.groupId === g.id);
    return {
      NO: idx + 1,
      KODE: g.code,
      NAMA_KELOMPOK: g.name,
      TAHUN_PELAJARAN: g.academicYear,
      SEMESTER: g.semester,
      TEMA: g.theme,
      FASE: g.phase,
      JUMLAH_SISWA: g.studentIds.length,
      JUMLAH_KEGIATAN: grpActs.length,
      CAPAIAN_TERINPUT: grpScores.length,
      STATUS_KELOMPOK: g.status,
      KUNCI_PENILAIAN: g.isAssessmentLocked ? 'Terkunci' : 'Terbuka'
    };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows.length ? summaryRows : [{ INFO: 'Belum ada data rekap kokurikuler.' }]), 'Rekap_Peserta_Deskripsi');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows.length ? detailRows : [{ INFO: 'Belum ada detail capaian subdimensi.' }]), 'Detail_Subdimensi');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(groupRows.length ? groupRows : [{ INFO: 'Belum ada kelompok kokurikuler.' }]), 'Ringkasan_Kelompok');

  XLSX.writeFile(
    wb,
    `Laporan_Kokurikuler_${schoolName.replace(/\s+/g, '_')}_${academicYear.replace('/', '-')}_${semester}.xlsx`
  );
};

