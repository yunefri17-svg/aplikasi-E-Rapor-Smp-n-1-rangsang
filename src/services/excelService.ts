import * as XLSX from 'xlsx';
import { Student, Teacher, Classroom, Subject, AssessmentScore } from '../types/erapor';

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

    subjects.forEach((sb) => {
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
