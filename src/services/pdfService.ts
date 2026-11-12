import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  SchoolProfile,
  Student,
  Classroom,
  Subject,
  AssessmentScore,
  Attendance,
  StudentExtracurricular,
  Extracurricular,
  HomeroomNote,
  Teacher
} from '../types/erapor';
import { getTutWuriHandayaniDataUrl } from '../components/common/TutWuriHandayaniLogo';
import { sortSubjects } from '../utils/subjectSort';

export interface ReportCardExportOptions {
  school: SchoolProfile;
  student: Student;
  classroom: Classroom;
  homeroomTeacher: Teacher | undefined;
  subjects: Subject[];
  scores: AssessmentScore[];
  attendance: Attendance | undefined;
  extracurriculars: Extracurricular[];
  studentExtracurriculars: StudentExtracurricular[];
  homeroomNote: HomeroomNote | undefined;
  academicYear: string;
  semester: string;
}

export interface BatchClassReportOptions {
  school: SchoolProfile;
  classroom: Classroom;
  students: Student[];
  homeroomTeacher: Teacher | undefined;
  subjects: Subject[];
  scores: AssessmentScore[];
  attendanceList: Attendance[];
  extracurriculars: Extracurricular[];
  studentExtracurriculars: StudentExtracurricular[];
  homeroomNotes: HomeroomNote[];
  academicYear: string;
  semester: string;
  mode?: 'complete' | 'gradesOnly';
}

/**
 * HALAMAN 1: SAMPUL RAPOR (Cover Sheet)
 * Berdasarkan gambar referensi 1 (cover_73cd4ce7.jfif)
 */
export const buildCoverPage = (
  doc: jsPDF,
  school: SchoolProfile,
  student: Student,
  academicYear: string,
  logoBase64?: string
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('LAPORAN', pageWidth / 2, 42, { align: 'center' });
  doc.setFontSize(12.5);
  doc.text('HASIL BELAJAR PESERTA DIDIK', pageWidth / 2, 50, { align: 'center' });
  doc.text('SEKOLAH MENENGAH PERTAMA', pageWidth / 2, 57.5, { align: 'center' });
  doc.text('(SMP)', pageWidth / 2, 65, { align: 'center' });

  // Center: Tut Wuri Handayani Logo
  if (logoBase64) {
    const logoSize = 58;
    const logoX = (pageWidth - logoSize) / 2;
    doc.addImage(logoBase64, 'PNG', logoX, 90, logoSize, logoSize);
  } else {
    // Vector placeholder if logo not available
    const logoSize = 50;
    const logoX = (pageWidth - logoSize) / 2;
    doc.setDrawColor(2, 132, 199);
    doc.setLineWidth(1);
    doc.circle(pageWidth / 2, 115, 25);
    doc.setFontSize(9);
    doc.text('TUT WURI HANDAYANI', pageWidth / 2, 116, { align: 'center' });
  }

  // Student Identity Box
  const boxW = 138;
  const boxX = (pageWidth - boxW) / 2;

  // Nama Siswa Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('NAMA PESERTA DIDIK', pageWidth / 2, 172, { align: 'center' });

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.5);
  doc.rect(boxX, 178, boxW, 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(student.name.toUpperCase(), pageWidth / 2, 185.5, { align: 'center' });

  // NIS / NISN Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('NIS / NISN', pageWidth / 2, 202, { align: 'center' });

  doc.rect(boxX, 208, boxW, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.text(`${student.nis || '-'} / ${student.nisn || '-'}`, pageWidth / 2, 215, { align: 'center' });

  // Bottom Institution Signature
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('KEMENTERIAN PENDIDIKAN DASAR DAN MENENGAH', pageWidth / 2, pageHeight - 38, { align: 'center' });
  doc.text('REPUBLIK INDONESIA', pageWidth / 2, pageHeight - 31, { align: 'center' });
};

/**
 * HALAMAN 2: IDENTITAS SEKOLAH (School Identity Sheet)
 * Berdasarkan gambar referensi 2 (data_sekolah_dc5b549c.jfif)
 * Catatan instruksi user: "Logo Garuda Pancasila.( hilangkan logo garuda nya)"
 */
export const buildSchoolProfilePage = (
  doc: jsPDF,
  school: SchoolProfile
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Judul Halaman Resmi
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('LAPORAN', pageWidth / 2, 45, { align: 'center' });
  doc.setFontSize(11.5);
  doc.text('HASIL PENCAPAIAN KOMPETENSI PESERTA DIDIK', pageWidth / 2, 53, { align: 'center' });
  doc.text('SEKOLAH MENENGAH PERTAMA', pageWidth / 2, 60, { align: 'center' });
  doc.text('( SMP )', pageWidth / 2, 67, { align: 'center' });

  // Data Tabel Identitas Sekolah
  const schoolRows = [
    ['Nama Sekolah', `:\t${school.name}`],
    ['NPSN', `:\t${school.npsn}`],
    ['NSS', `:\t${school.nss || '201040101001'}`],
    [
      'Alamat Sekolah',
      `:\t${school.address}\n\tKode Pos : ${school.postalCode}, Telp. : ${school.phone || '-'}`
    ],
    ['Kelurahan / Desa', `:\t${school.desa}`],
    ['Kecamatan', `:\t${school.kecamatan}`],
    ['Kabupaten / Kota', `:\t${school.kabupaten}`],
    ['Provinsi', `:\t${school.provinsi}`],
    ['Website', `:\t${school.website}`],
    ['E-mail', `:\t${school.email}`]
  ];

  autoTable(doc, {
    startY: 92,
    body: schoolRows,
    theme: 'plain',
    styles: {
      fontSize: 9.5,
      cellPadding: 3.2,
      textColor: [20, 20, 20],
      font: 'helvetica'
    },
    columnStyles: {
      0: { cellWidth: 48, fontStyle: 'normal' },
      1: { cellWidth: 125 }
    },
    margin: { left: 24, right: 20 }
  });

  // Nomor halaman formal di bawah
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('1', pageWidth / 2, pageHeight - 20, { align: 'center' });
};

/**
 * HALAMAN 3: IDENTITAS PESERTA DIDIK (Student Biodata Sheet)
 */
export const buildStudentBiodataPage = (
  doc: jsPDF,
  school: SchoolProfile,
  student: Student,
  classroom: Classroom
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Judul Resmi Halaman Identitas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text('IDENTITAS PESERTA DIDIK', pageWidth / 2, 28, { align: 'center' });

  // Numbered fields 1 to 16
  const parentAddress = student.parentAddress || student.address;
  const acceptedClass = student.acceptedClass || classroom.gradeLevel || 'VII';
  const acceptedDate = student.acceptedDate || '15 Juli 2024';
  const familyStatus = student.familyStatus || 'Anak Kandung';
  const childOrder = student.childOrder ? String(student.childOrder) : '-';
  const homePhone = student.homePhone || student.parentPhone || '-';
  const previousSchool = student.previousSchool || 'SD / Sederajat';

  // 4-Column structure: [No, Label, Colon, Value] ensures 100% straight vertical alignment
  const rows = [
    ['1.', 'Nama Peserta Didik (Lengkap)', ':', student.name],
    ['2.', 'Nomor Induk Siswa Nasional', ':', student.nisn || '-'],
    ['3.', 'Tempat Tanggal Lahir', ':', `${student.pob || '-'}, ${student.dob || '-'}`],
    ['4.', 'Jenis Kelamin', ':', student.gender === 'L' ? 'Laki-laki' : 'Perempuan'],
    ['5.', 'Agama', ':', student.religion || '-'],
    ['6.', 'Status dalam keluarga', ':', familyStatus],
    ['7.', 'Anak ke', ':', childOrder],
    ['8.', 'Alamat Peserta Didik', ':', student.address || '-'],
    ['9.', 'Nomor Telepon Rumah', ':', homePhone],
    ['10.', 'Sekolah Asal', ':', previousSchool],
    ['11.', 'Diterima di sekolah ini', '', ''],
    ['', '   Di kelas', ':', acceptedClass],
    ['', '   Pada tanggal', ':', acceptedDate],
    ['12.', 'Nama Orang Tua', '', ''],
    ['', '   a. Ayah', ':', student.fatherName || '-'],
    ['', '   b. Ibu', ':', student.motherName || '-'],
    ['13.', 'Alamat Orang Tua', ':', parentAddress],
    ['14.', 'Nomor Telepon Rumah', ':', student.parentPhone || homePhone || '-'],
    ['15.', 'Pekerjaan Orang Tua', '', ''],
    ['', '   a. Ayah', ':', student.fatherJob || '-'],
    ['', '   b. Ibu', ':', student.motherJob || '-'],
    ['16.', 'Nama Wali Peserta Didik', ':', student.guardianName || '-'],
    ['', '   Alamat Wali Peserta Didik', ':', student.guardianAddress || '-'],
    ['', '   Nomor Telepon Rumah', ':', student.guardianPhone || '-'],
    ['', '   Pekerjaan Wali Peserta Didik', ':', student.guardianJob || '-']
  ];

  autoTable(doc, {
    startY: 34,
    body: rows,
    theme: 'plain',
    styles: {
      fontSize: 8.5,
      cellPadding: 1.3,
      textColor: [20, 20, 20],
      font: 'helvetica'
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'left' },
      1: { cellWidth: 54, fontStyle: 'normal' },
      2: { cellWidth: 4, halign: 'center' },
      3: { cellWidth: 110 }
    },
    margin: { left: 18, right: 16 }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 6;

  // Kotak Pas Foto Siswa (3 x 4 cm = 28mm x 37mm) diposisikan di dekat tanda tangan (posisi cap sebelumnya)
  const photoW = 28;
  const photoH = 37;
  const photoX = 66;
  const photoY = Math.min(finalY, pageHeight - 55);

  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.4);
  doc.rect(photoX, photoY, photoW, photoH);
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Pas Foto\n3 x 4 cm', photoX + photoW / 2, photoY + 16, { align: 'center' });

  // Tanda Tangan Kepala Sekolah di kanan bawah
  const signX = pageWidth - 68;
  const signY = photoY;
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${school.reportPlace.toUpperCase()}, ${school.reportDate}`, signX, signY);
  doc.text('Kepala Sekolah,', signX, signY + 4.5);

  const nameY = signY + 28;
  doc.setFont('helvetica', 'bold');
  doc.text(school.headmasterName, signX, nameY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`NIP. ${school.headmasterNip}`, signX, nameY + 4);
};

/**
 * HALAMAN 4 DAN SETERUSNYA: ISI RAPOR HASIL BELAJAR (Grades, Ekskul, Absensi, Tanda Tangan)
 */
export const buildReportContentPages = (
  doc: jsPDF,
  options: ReportCardExportOptions,
  startOnNewPage = true
) => {
  if (startOnNewPage) {
    doc.addPage();
  }

  const {
    school,
    student,
    classroom,
    homeroomTeacher,
    subjects,
    scores,
    attendance,
    extracurriculars,
    studentExtracurriculars,
    homeroomNote,
    academicYear,
    semester
  } = options;

  const sortedSubjects = sortSubjects(subjects);
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title (Standar Kurikulum Merdeka - Tanpa Kop Surat di Halaman Nilai)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('LAPORAN HASIL BELAJAR (RAPOR)', pageWidth / 2, 16, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`KURIKULUM MERDEKA - TAHUN PELAJARAN ${academicYear}`, pageWidth / 2, 21, { align: 'center' });

  // Student Identity Grid with perfectly aligned colons using autoTable
  const parentNameDisplay = student.fatherName
    ? (student.motherName ? `${student.fatherName} / ${student.motherName}` : student.fatherName)
    : (student.motherName || '-');

  const identityRows = [
    ['Nama Peserta Didik', ':', student.name, 'Kelas', ':', classroom.name],
    ['NIS / NISN', ':', `${student.nis || '-'} / ${student.nisn || '-'}`, 'Fase', ':', 'Fase D'],
    ['Nama Sekolah', ':', school.name, 'Semester', ':', semester],
    ['Alamat Sekolah', ':', school.address, 'Tahun Pelajaran', ':', academicYear]
  ];

  autoTable(doc, {
    startY: 26,
    body: identityRows,
    theme: 'plain',
    styles: {
      fontSize: 8.5,
      cellPadding: 1,
      textColor: [20, 20, 20],
      font: 'helvetica'
    },
    columnStyles: {
      0: { cellWidth: 36, fontStyle: 'normal' },
      1: { cellWidth: 4, halign: 'center' },
      2: { cellWidth: 64, fontStyle: 'bold' },
      3: { cellWidth: 32, fontStyle: 'normal' },
      4: { cellWidth: 4, halign: 'center' },
      5: { cellWidth: 42, fontStyle: 'bold' }
    },
    margin: { left: 14, right: 14 }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 5;

  // A. Subject Grades Table Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('A. Nilai Hasil Belajar & Capaian Kompetensi', 14, currentY);
  currentY += 4;

  // Subject Grades Table
  const scoreLookup = new Map(scores.map((sc) => [sc.subjectId, sc]));
  const tableRows = sortedSubjects.map((sub, idx) => {
    const sc = scoreLookup.get(sub.id);
    const finalVal = sc?.finalScore !== undefined ? String(sc.finalScore) : '-';
    let competenceText = '';
    if (sc) {
      competenceText = `${sc.highestCompetenceDesc || ''}\n${sc.lowestCompetenceDesc || ''}`.trim();
      if (!competenceText) competenceText = 'Mencapai kriteria ketercapaian tujuan pembelajaran dengan baik.';
    } else {
      competenceText = 'Nilai belum diinput oleh guru mata pelajaran.';
    }

    return [
      idx + 1,
      sub.name,
      finalVal,
      competenceText
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['No', 'Mata Pelajaran', 'Nilai Akhir', 'Capaian Kompetensi']],
    body: tableRows,
    theme: 'plain',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: [100, 100, 100],
      lineWidth: 0.1,
      textColor: [20, 20, 20]
    },
    headStyles: {
      fillColor: [240, 244, 248],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 46 },
      2: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
      3: { cellWidth: 110 }
    },
    margin: { left: 14, right: 14 }
  });

  // EXACT PAGE BREAK: Page 1 ends after Section A Grades table. Page 2 starts with Section B.
  doc.addPage();
  let finalY = 20;

  // B. Extracurriculars
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('B. Kegiatan Ekstrakurikuler', 14, finalY);
  finalY += 3;

  const ekskulMap = new Map(extracurriculars.map((e) => [e.id, e.name]));
  const ekskulRows = studentExtracurriculars.map((se, i) => [
    i + 1,
    ekskulMap.get(se.extracurricularId) || 'Ekstrakurikuler',
    se.predicate,
    se.description
  ]);

  if (ekskulRows.length === 0) {
    ekskulRows.push(['1', 'Pramuka Gudep SMPN 1 Rangsang', 'Baik', 'Aktif mengikuti kegiatan kepramukaan mingguan dengan disiplin.'] as any);
  }

  autoTable(doc, {
    startY: finalY,
    head: [['No', 'Kegiatan Ekstrakurikuler', 'Predikat', 'Keterangan']],
    body: ekskulRows,
    theme: 'plain',
    styles: { fontSize: 7.5, cellPadding: 1.8, lineColor: [100, 100, 100], lineWidth: 0.1 },
    headStyles: { fillColor: [240, 244, 248], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 50 },
      2: { halign: 'center', cellWidth: 26 },
      3: { cellWidth: 96 }
    },
    margin: { left: 14, right: 14 }
  });

  finalY = (doc as any).lastAutoTable.finalY + 5;

  // C. Attendance Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('C. Ketidakhadiran', 14, finalY);
  finalY += 3;

  autoTable(doc, {
    startY: finalY,
    body: [
      ['Sakit', `${attendance?.sakit ?? 0} hari`],
      ['Izin', `${attendance?.izin ?? 0} hari`],
      ['Tanpa Keterangan', `${attendance?.alpa ?? 0} hari`]
    ],
    theme: 'plain',
    styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [100, 100, 100], lineWidth: 0.1 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 40, halign: 'center' }
    },
    margin: { left: 14 }
  });

  finalY = (doc as any).lastAutoTable.finalY + 5;

  // D. Homeroom Note
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('D. Catatan Wali Kelas', 14, finalY);
  finalY += 3;

  const noteText = homeroomNote?.growthNote
    ? `${homeroomNote.growthNote} ${homeroomNote.suggestions || ''}`
    : 'Terus pertahankan motivasi belajar, tingkatkan kedisiplinan dan keaktifan di kelas.';

  autoTable(doc, {
    startY: finalY,
    body: [[noteText]],
    theme: 'plain',
    styles: { fontSize: 7.5, cellPadding: 2.5, lineColor: [100, 100, 100], lineWidth: 0.1 },
    margin: { left: 14, right: 14 }
  });

  finalY = (doc as any).lastAutoTable.finalY + 5;

  // E. Promotion decision (if Genap semester)
  if (semester === 'Genap') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('E. Keputusan Kenaikan Kelas / Kelulusan', 14, finalY);
    finalY += 3;

    const defaultDecision =
      classroom.gradeLevel === '7'
        ? 'Naik ke Kelas VIII'
        : classroom.gradeLevel === '8'
        ? 'Naik ke Kelas IX'
        : 'Lulus dari Satuan Pendidikan SMP Negeri 1 Rangsang';
    const decision =
      homeroomNote?.promotionDecision && homeroomNote.promotionDecision !== 'Belum Ditentukan'
        ? homeroomNote.promotionDecision
        : defaultDecision;
    autoTable(doc, {
      startY: finalY,
      body: [[`Berdasarkan pencapaian seluruh kriteria, siswa ditetapkan: ${decision.toUpperCase()}`]],
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 2.5, fontStyle: 'bold', lineColor: [100, 100, 100], lineWidth: 0.1 },
      margin: { left: 14, right: 14 }
    });
    finalY = (doc as any).lastAutoTable.finalY + 5;
  }

  // Check if enough space for signatures
  if (finalY > 235) {
    doc.addPage();
    finalY = 25;
  }

  // Signatures Section
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const signY = finalY + 4;
  const col1 = 20;
  const col2 = pageWidth - 65;

  doc.text('Mengetahui,', col1, signY);
  doc.text('Orang Tua / Wali Siswa,', col1, signY + 4.5);

  doc.text(`${school.reportPlace}, ${school.reportDate}`, col2, signY);
  doc.text('Wali Kelas,', col2, signY + 4.5);

  const nameY = signY + 24;
  const parentSignName = student.fatherName || student.motherName || 'Orang Tua / Wali Siswa';
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${parentSignName} )`, col1, nameY);
  doc.setFont('helvetica', 'normal');

  const teacherName = homeroomTeacher?.name || 'Wali Kelas';
  const teacherNip = homeroomTeacher?.nip || '-';
  doc.setFont('helvetica', 'bold');
  doc.text(teacherName, col2, nameY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`NIP. ${teacherNip}`, col2, nameY + 4);

  // Center: Kepala Sekolah
  const kepsekY = nameY + 12;
  doc.setFontSize(8.5);
  doc.text('Mengetahui,', pageWidth / 2, kepsekY, { align: 'center' });
  doc.text('Kepala SMP Negeri 1 Rangsang,', pageWidth / 2, kepsekY + 4.5, { align: 'center' });

  const kepsekNameY = kepsekY + 22;
  doc.setFont('helvetica', 'bold');
  doc.text(school.headmasterName, pageWidth / 2, kepsekNameY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`NIP. ${school.headmasterNip}`, pageWidth / 2, kepsekNameY + 4, { align: 'center' });
};

/**
 * A. CETAK RAPOR LENGKAP (Full Report Card: Sampul + Identitas Sekolah + Identitas Siswa + Isi Rapor)
 */
export const generateCompleteReportPDF = async (options: ReportCardExportOptions) => {
  const { school, student, classroom, academicYear } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const logoBase64 = await getTutWuriHandayaniDataUrl();

  // 1. Halaman 1: Sampul
  buildCoverPage(doc, school, student, academicYear, logoBase64);

  // 2. Halaman 2: Identitas Sekolah
  doc.addPage();
  buildSchoolProfilePage(doc, school);

  // 3. Halaman 3: Keterangan Tentang Diri Peserta Didik
  doc.addPage();
  buildStudentBiodataPage(doc, school, student, classroom);

  // 4. Halaman 4+: Isi Rapor Nilai & Capaian
  buildReportContentPages(doc, options, true);

  // Save
  doc.save(
    `Rapor_Lengkap_${student.nisn}_${student.name.replace(/\s+/g, '_')}_${classroom.name.replace(/\s+/g, '_')}.pdf`
  );
};

/**
 * B. CETAK ISI RAPOR SAJA (Grades only, without cover and identity pages)
 */
export const generateSingleReportCardPDF = (options: ReportCardExportOptions) => {
  const { student, classroom } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  buildReportContentPages(doc, options, false);

  doc.save(
    `Isi_Rapor_${student.nisn}_${student.name.replace(/\s+/g, '_')}_${classroom.name.replace(/\s+/g, '_')}.pdf`
  );
};

/**
 * D. CETAK SELURUH SISWA DALAM KELAS (Batch Export)
 */
export const generateClassBatchReportPDF = async (
  options: BatchClassReportOptions,
  onProgress?: (current: number, total: number, name: string) => void
) => {
  const {
    school,
    classroom,
    students,
    homeroomTeacher,
    subjects,
    scores,
    attendanceList,
    extracurriculars,
    studentExtracurriculars,
    homeroomNotes,
    academicYear,
    semester,
    mode = 'complete'
  } = options;

  if (!students || students.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const logoBase64 = mode === 'complete' ? await getTutWuriHandayaniDataUrl() : undefined;
  const total = students.length;

  for (let i = 0; i < total; i++) {
    const student = students[i];
    if (onProgress) {
      onProgress(i + 1, total, student.name);
    }

    const studentScores = scores.filter(
      (sc) =>
        sc.studentId === student.id &&
        sc.academicYear === academicYear &&
        sc.semester === semester
    );

    const studentAtt = attendanceList.find(
      (a) =>
        a.studentId === student.id &&
        a.academicYear === academicYear &&
        a.semester === semester
    );

    const studentEkskuls = studentExtracurriculars.filter(
      (e) =>
        e.studentId === student.id &&
        e.academicYear === academicYear &&
        e.semester === semester
    );

    const studentNote = homeroomNotes.find(
      (n) =>
        n.studentId === student.id &&
        n.academicYear === academicYear &&
        n.semester === semester
    );

    const reportOpts: ReportCardExportOptions = {
      school,
      student,
      classroom,
      homeroomTeacher,
      subjects,
      scores: studentScores,
      attendance: studentAtt,
      extracurriculars,
      studentExtracurriculars: studentEkskuls,
      homeroomNote: studentNote,
      academicYear,
      semester
    };

    if (i > 0) {
      doc.addPage();
    }

    if (mode === 'complete') {
      // Halaman 1: Sampul
      buildCoverPage(doc, school, student, academicYear, logoBase64);
      // Halaman 2: Identitas Sekolah
      doc.addPage();
      buildSchoolProfilePage(doc, school);
      // Halaman 3: Biodata Siswa
      doc.addPage();
      buildStudentBiodataPage(doc, school, student, classroom);
      // Halaman 4+: Isi Rapor
      buildReportContentPages(doc, reportOpts, true);
    } else {
      // Hanya Isi Rapor
      buildReportContentPages(doc, reportOpts, false);
    }

    // Small delay to let browser breathe
    await new Promise((r) => setTimeout(r, 20));
  }

  const modeName = mode === 'complete' ? 'Lengkap' : 'Isi_Nilai';
  doc.save(
    `Rapor_${modeName}_Kelas_${classroom.name.replace(/\s+/g, '_')}_${academicYear.replace('/', '-')}_${semester}.pdf`
  );
};

// Export Biodata Lengkap Saja
export const generateBiodataSiswaPDF = (options: {
  school: SchoolProfile;
  student: Student;
  classroom: Classroom;
}) => {
  const { school, student, classroom } = options;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  buildStudentBiodataPage(doc, school, student, classroom);

  doc.save(`Biodata_${student.nisn}_${student.name.replace(/\s+/g, '_')}.pdf`);
};

// Export Leger PDF
export const generateLegerPDF = (
  classroom: Classroom,
  students: Student[],
  subjects: Subject[],
  scores: AssessmentScore[],
  school: SchoolProfile,
  academicYear: string,
  semester: string
) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`LEGER NILAI HASIL BELAJAR PESERTA DIDIK`, pageWidth / 2, 12, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`${school.name} - KELAS ${classroom.name.toUpperCase()}`, pageWidth / 2, 17, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Tahun Pelajaran: ${academicYear} | Semester: ${semester}`, pageWidth / 2, 22, { align: 'center' });

  // Map scores
  const scoreMap = new Map<string, Map<string, number>>();
  scores.forEach((sc) => {
    if (sc.classId === classroom.id && sc.semester === semester && sc.academicYear === academicYear) {
      if (!scoreMap.has(sc.studentId)) scoreMap.set(sc.studentId, new Map());
      scoreMap.get(sc.studentId)!.set(sc.subjectId, sc.finalScore);
    }
  });

  const sortedSubjects = sortSubjects(subjects);
  const headers = ['No', 'NISN', 'Nama Siswa', 'JK', ...sortedSubjects.map((s) => s.code), 'Jml', 'Rata', 'Rank'];

  const rowsData = students.map((std, idx) => {
    const sMap = scoreMap.get(std.id) || new Map();
    let total = 0;
    let count = 0;

    const subjectScores = sortedSubjects.map((s) => {
      const val = sMap.get(s.id);
      if (typeof val === 'number') {
        total += val;
        count++;
        return String(val);
      }
      return '-';
    });

    const avg = count > 0 ? Number((total / count).toFixed(1)) : 0;
    return {
      idx: idx + 1,
      nisn: std.nisn,
      name: std.name,
      jk: std.gender,
      subjectScores,
      total,
      avg
    };
  });

  // Calculate ranks
  const sorted = [...rowsData].sort((a, b) => b.avg - a.avg);
  const rankLookup = new Map<any, number>();
  sorted.forEach((item, rIdx) => rankLookup.set(item, rIdx + 1));

  const tableBody = rowsData.map((item) => [
    item.idx,
    item.nisn,
    item.name,
    item.jk,
    ...item.subjectScores,
    item.total,
    item.avg,
    rankLookup.get(item) || 1
  ]);

  autoTable(doc, {
    startY: 26,
    head: [headers],
    body: tableBody,
    theme: 'plain',
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      lineColor: [140, 140, 140],
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [230, 240, 250],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 20 },
      2: { cellWidth: 42 },
      3: { halign: 'center', cellWidth: 8 }
    },
    margin: { left: 10, right: 10 }
  });

  doc.save(`Leger_${classroom.name.replace(/\s+/g, '_')}_${academicYear.replace('/', '-')}.pdf`);
};
