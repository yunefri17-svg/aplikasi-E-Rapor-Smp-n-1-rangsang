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
  Teacher,
  KokurikulerGroup,
  KokurikulerActivity,
  KokurikulerDescription,
  KokurikulerScore,
  KokurikulerDimensionMaster,
  TeachingAssignment
} from '../types/erapor';
import { getTutWuriHandayaniDataUrl } from '../components/common/TutWuriHandayaniLogo';
import { sortSubjects } from '../utils/subjectSort';
import { getSubdimensionMap } from '../utils/kokurikulerHelper';
import {
  buildPdfExtracurricularTableBody,
  resolveStudentExtracurricularRows
} from '../utils/extracurricularReportHelper';
import {
  buildElectiveTranscriptTableRows,
  buildReportGradeRows,
  ELECTIVE_TRANSCRIPT_DISCLAIMER,
  ELECTIVE_TRANSCRIPT_SUBTITLE,
  ELECTIVE_TRANSCRIPT_TITLE,
  ElectiveHistoryRow,
  getElectiveHistoryRows,
  hasEnteredAssessmentScore,
  hasEnteredNumericScore,
  normalizeAcademicYearValue,
  normalizeSemesterValue
} from '../utils/electiveSubjectHelper';

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
  teachingAssignments?: TeachingAssignment[];
  kokurikulerGroups?: KokurikulerGroup[];
  kokurikulerActivities?: KokurikulerActivity[];
  kokurikulerDescriptions?: KokurikulerDescription[];
  kokurikulerScores?: KokurikulerScore[];
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
  teachingAssignments?: TeachingAssignment[];
  kokurikulerGroups?: KokurikulerGroup[];
  kokurikulerActivities?: KokurikulerActivity[];
  kokurikulerDescriptions?: KokurikulerDescription[];
  kokurikulerScores?: KokurikulerScore[];
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
    semester,
    teachingAssignments = [],
    kokurikulerGroups = [],
    kokurikulerActivities = [],
    kokurikulerDescriptions = [],
    kokurikulerScores = []
  } = options;

  const pageWidth = doc.internal.pageSize.getWidth();

  // Title (Standar Kurikulum Merdeka - Tanpa Kop Surat di Halaman Nilai)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('LAPORAN HASIL BELAJAR (RAPOR)', pageWidth / 2, 16, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`KURIKULUM MERDEKA - TAHUN PELAJARAN ${academicYear}`, pageWidth / 2, 21, { align: 'center' });

  // Student Identity Grid with perfectly aligned colons using autoTable
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
  const tableRows = buildReportGradeRows({
    subjects,
    scores,
    studentId: student.id,
    classId: classroom.id,
    academicYear,
    semester: (semester === 'Genap' ? 'Genap' : 'Ganjil'),
    teachingAssignments
  }).map((row) => [
    row.no,
    row.subjectName,
    row.finalScoreText,
    row.competenceText
  ]);

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

  // EXACT PAGE BREAK: Page 1 ends after Section A Grades table. Page 2 starts with Section B Kokurikuler.
  doc.addPage();
  let finalY = 18;

  // B. Kegiatan Kokurikuler (Capaian Profil Lulusan)
  const studentGroups = kokurikulerGroups.filter(
    (g) =>
      g.academicYear === academicYear &&
      g.semester === semester &&
      Array.isArray(g.studentIds) &&
      g.studentIds.includes(student.id)
  );
  const studentGroupIds = new Set(studentGroups.map((g) => g.id));
  const studentActivities = kokurikulerActivities
    .filter(
      (a) =>
        a.academicYear === academicYear &&
        a.semester === semester &&
        studentGroupIds.has(a.groupId)
    )
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const studentDescMap = new Map(
    kokurikulerDescriptions
      .filter(
        (d) =>
          d.studentId === student.id &&
          d.academicYear === academicYear &&
          d.semester === semester
      )
      .map((d) => [`${d.groupId}_${d.activityId}`, d])
  );

  const studentKokScores = kokurikulerScores.filter(
    (sc) =>
      sc.studentId === student.id &&
      sc.academicYear === academicYear &&
      sc.semester === semester
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('B. Kegiatan Kokurikuler (Capaian Profil Lulusan)', 14, finalY);
  finalY += 3;

  const kokurikulerRows = studentActivities.map((act, idx) => {
    const grp = studentGroups.find((g) => g.id === act.groupId);
    const savedDesc = studentDescMap.get(`${act.groupId}_${act.id}`);
    const actScores = studentKokScores.filter(
      (sc) => sc.activityId === act.id && sc.groupId === act.groupId
    );

    let descText = savedDesc?.description?.trim() || '';
    if (!descText) {
      if (actScores.length > 0) {
        const levelsText = Array.from(new Set(actScores.map((s) => s.level))).join(', ');
        descText = `Peserta didik telah mengikuti kegiatan ${act.name} dengan capaian kompetensi pada tingkatan ${levelsText}. (Deskripsi akhir belum difinalisasi).`;
      } else {
        descText = 'Capaian kegiatan kokurikuler untuk periode ini belum diinput oleh koordinator/guru terkait.';
      }
    }

    return [
      idx + 1,
      `${act.name}\nTema: ${act.theme}${grp ? ` (${grp.name})` : ''}`,
      descText
    ];
  });

  if (kokurikulerRows.length === 0) {
    kokurikulerRows.push([
      '-',
      'Belum ada kegiatan kokurikuler terdaftar',
      `Siswa belum terdaftar pada kelompok kegiatan kokurikuler untuk Tahun Pelajaran ${academicYear} Semester ${semester}.`
    ] as any);
  }

  autoTable(doc, {
    startY: finalY,
    head: [['No', 'Kegiatan Kokurikuler & Tema', 'Capaian & Deskripsi Profil Lulusan']],
    body: kokurikulerRows,
    theme: 'plain',
    styles: { fontSize: 7.5, cellPadding: 2, lineColor: [100, 100, 100], lineWidth: 0.1, textColor: [20, 20, 20] },
    headStyles: { fillColor: [240, 244, 248], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 56, fontStyle: 'bold' },
      2: { cellWidth: 116 }
    },
    margin: { left: 14, right: 14 }
  });

  finalY = (doc as any).lastAutoTable.finalY + 5;

  // C. Extracurriculars
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('C. Kegiatan Ekstrakurikuler', 14, finalY);
  finalY += 3;

  const resolvedEkskulRows = resolveStudentExtracurricularRows({
    studentId: student.id,
    academicYear,
    semester,
    extracurriculars,
    studentExtracurriculars
  });
  const ekskulRows = buildPdfExtracurricularTableBody(resolvedEkskulRows);

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

  // D. Attendance Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('D. Ketidakhadiran', 14, finalY);
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

  // E. Homeroom Note
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('E. Catatan Wali Kelas', 14, finalY);
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

  // F. Promotion decision (if Genap semester)
  if (semester === 'Genap') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('F. Keputusan Kenaikan Kelas / Kelulusan', 14, finalY);
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
export const buildSingleReportCardPDFDoc = (options: ReportCardExportOptions): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  buildReportContentPages(doc, options, false);
  return doc;
};

export const generateSingleReportCardPDF = (options: ReportCardExportOptions) => {
  const { student, classroom } = options;
  const doc = buildSingleReportCardPDFDoc(options);

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
    mode = 'complete',
    teachingAssignments = [],
    kokurikulerGroups = [],
    kokurikulerActivities = [],
    kokurikulerDescriptions = [],
    kokurikulerScores = []
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
      semester,
      teachingAssignments,
      kokurikulerGroups,
      kokurikulerActivities,
      kokurikulerDescriptions,
      kokurikulerScores
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

// Export Leger PDF (buildable cleanly for both browser download & verification)
export const buildLegerPDFDoc = (
  classroom: Classroom,
  students: Student[],
  subjects: Subject[],
  scores: AssessmentScore[],
  school: SchoolProfile,
  academicYear: string,
  semester: string,
  homeroomTeacher?: Teacher,
  logoBase64?: string
): jsPDF => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const margin = 10;
  const usableWidth = pageWidth - margin * 2; // 277mm

  const schoolName = school.name || 'SMP Negeri 1 Rangsang';
  const schoolKab = school.kabupaten || 'Kepulauan Meranti';
  const schoolKec = school.kecamatan || 'Rangsang';
  const schoolAddress = school.address || 'Jl. Pendidikan';
  const waliName = homeroomTeacher?.name || '-';
  const waliNip = homeroomTeacher?.nip ? `NIP. ${homeroomTeacher.nip}` : '';

  // 1. Top decorative gradient-style accent bar (Navy Blue + Emerald + Amber strip)
  doc.setFillColor(30, 64, 175); // Blue-800
  doc.rect(0, 0, pageWidth, 3.2, 'F');
  doc.setFillColor(16, 185, 129); // Emerald-500
  doc.rect(pageWidth * 0.65, 0, pageWidth * 0.22, 3.2, 'F');
  doc.setFillColor(245, 158, 11); // Amber-500
  doc.rect(pageWidth * 0.87, 0, pageWidth * 0.13, 3.2, 'F');

  // 2. Kop Sekolah
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin + 2, 6, 15, 15);
  }

  doc.setTextColor(30, 58, 138);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`PEMERINTAH KABUPATEN ${schoolKab.toUpperCase()} • DINAS PENDIDIKAN DAN KEBUDAYAAN`, pageWidth / 2, 9.5, {
    align: 'center'
  });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11.5);
  doc.text(`LEGER NILAI HASIL BELAJAR PESERTA DIDIK — ${schoolName.toUpperCase()}`, pageWidth / 2, 14.8, {
    align: 'center'
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `NPSN: ${school.npsn || '10400880'} • ${schoolAddress}, Kec. ${schoolKec}, Kab. ${schoolKab}`,
    pageWidth / 2,
    19.2,
    { align: 'center' }
  );

  // 3. Kartu Info Rombel, Wali Kelas & Tahun Pelajaran (Soft Colored Banner)
  doc.setFillColor(239, 246, 255); // Blue-50
  doc.setDrawColor(147, 197, 253); // Blue-300
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, 22, usableWidth, 9.5, 1.8, 1.8, 'FD');

  // Left accent inside info pill
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(margin, 22, 2.2, 9.5, 1, 1, 'F');

  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.setFont('helvetica', 'bold');
  doc.text(`Kelas / Rombel : ${classroom.name}`, margin + 6, 27.8);

  doc.setTextColor(6, 95, 70);
  doc.text(
    `Wali Kelas : ${waliName}${waliNip ? ` (${waliNip})` : ''}`,
    pageWidth / 2,
    27.8,
    { align: 'center' }
  );

  doc.setTextColor(55, 48, 163);
  doc.text(
    `TP ${academicYear} • Semester ${semester}`,
    pageWidth - margin - 5,
    27.8,
    { align: 'right' }
  );

  // 4. Map scores (aligned with Cetak Rapor)
  const normYear = normalizeAcademicYearValue(academicYear);
  const normSem = normalizeSemesterValue(semester);
  const classStudentIdSet = new Set(students.map((s) => s.id));
  const scoreMap = new Map<string, Map<string, number>>();
  scores.forEach((sc) => {
    if (
      (sc.classId === classroom.id || classStudentIdSet.has(sc.studentId)) &&
      normalizeSemesterValue(sc.semester) === normSem &&
      normalizeAcademicYearValue(sc.academicYear) === normYear &&
      hasEnteredNumericScore(sc)
    ) {
      const resolvedVal = sc.manualFinalScore ?? sc.finalScore;
      if (typeof resolvedVal === 'number' && Number.isFinite(resolvedVal)) {
        if (!scoreMap.has(sc.studentId)) scoreMap.set(sc.studentId, new Map());
        scoreMap.get(sc.studentId)!.set(sc.subjectId, resolvedVal);
      }
    }
  });

  const sortedSubjects = sortSubjects(subjects);
  const headers = ['No', 'NISN', 'Nama Siswa', 'JK', ...sortedSubjects.map((s) => s.code), 'Jml', 'Rata', 'Rank'];

  const subjectSums = new Array<number>(sortedSubjects.length).fill(0);
  const subjectCounts = new Array<number>(sortedSubjects.length).fill(0);

  const rowsData = students.map((std, idx) => {
    const sMap = scoreMap.get(std.id) || new Map();
    let total = 0;
    let count = 0;

    const numericSubjectVals: Array<number | undefined> = [];
    const subjectScores = sortedSubjects.map((s, sIdx) => {
      const val = sMap.get(s.id);
      if (typeof val === 'number') {
        total += val;
        count++;
        subjectSums[sIdx] += val;
        subjectCounts[sIdx] += 1;
        numericSubjectVals.push(val);
        return String(val);
      }
      numericSubjectVals.push(undefined);
      return '-';
    });

    const avg = count > 0 ? Number((total / count).toFixed(1)) : 0;
    return {
      idx: idx + 1,
      nisn: std.nisn || std.nis || '-',
      name: std.name,
      jk: std.gender,
      subjectScores,
      numericSubjectVals,
      total,
      avg,
      count
    };
  });

  // Calculate ranks
  const sorted = [...rowsData].sort((a, b) => b.avg - a.avg);
  const rankLookup = new Map<any, number>();
  sorted.forEach((item, rIdx) => rankLookup.set(item, rIdx + 1));

  const tableBody = rowsData.map((item) => [
    String(item.idx),
    item.nisn,
    item.name,
    item.jk,
    ...item.subjectScores,
    item.count > 0 ? String(item.total) : '-',
    item.count > 0 ? String(item.avg) : '-',
    String(rankLookup.get(item) || 1)
  ]);

  const gradedStudents = rowsData.filter((r) => r.count > 0);
  const overallAvg =
    gradedStudents.length > 0
      ? (gradedStudents.reduce((acc, r) => acc + r.avg, 0) / gradedStudents.length).toFixed(1)
      : '-';
  const avgTotal =
    gradedStudents.length > 0
      ? Math.round(gradedStudents.reduce((acc, r) => acc + r.total, 0) / gradedStudents.length)
      : '-';

  const footerRow = [
    '',
    '',
    'Rata-Rata Kelas',
    '',
    ...sortedSubjects.map((_, sIdx) =>
      subjectCounts[sIdx] > 0 ? (subjectSums[sIdx] / subjectCounts[sIdx]).toFixed(1) : '-'
    ),
    String(avgTotal),
    String(overallAvg),
    '-'
  ];

  const subjectStartCol = 4;
  const jmlColIdx = subjectStartCol + sortedSubjects.length;
  const rataColIdx = jmlColIdx + 1;
  const rankColIdx = jmlColIdx + 2;

  autoTable(doc, {
    startY: 34,
    head: [headers],
    body: tableBody,
    foot: [footerRow],
    theme: 'grid',
    styles: {
      fontSize: 7.2,
      cellPadding: 1.6,
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
      textColor: [30, 41, 59]
    },
    headStyles: {
      fillColor: [30, 64, 175], // Blue-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle'
    },
    footStyles: {
      fillColor: [219, 234, 254], // Blue-100
      textColor: [30, 58, 138],
      fontStyle: 'bold',
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 20 },
      2: { cellWidth: 42, fontStyle: 'bold' },
      3: { halign: 'center', cellWidth: 7 },
      [jmlColIdx]: { halign: 'center', fontStyle: 'bold' },
      [rataColIdx]: { halign: 'center', fontStyle: 'bold' },
      [rankColIdx]: { halign: 'center', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.section === 'head') {
        if (data.column.index === jmlColIdx) {
          data.cell.styles.fillColor = [30, 58, 138]; // Navy
        } else if (data.column.index === rataColIdx) {
          data.cell.styles.fillColor = [67, 56, 202]; // Indigo-700
        } else if (data.column.index === rankColIdx) {
          data.cell.styles.fillColor = [180, 83, 9]; // Amber-700
        }
      }
      if (data.section === 'foot' && data.column.index === 2) {
        data.cell.styles.halign = 'left';
      }
      if (data.section === 'body') {
        const rowData = rowsData[data.row.index];
        if (!rowData) return;

        // Subject score columns
        if (data.column.index >= subjectStartCol && data.column.index < jmlColIdx) {
          data.cell.styles.halign = 'center';
          const sIdx = data.column.index - subjectStartCol;
          const val = rowData.numericSubjectVals[sIdx];
          const kkm = sortedSubjects[sIdx]?.kkm || 75;
          if (val === undefined) {
            data.cell.styles.textColor = [148, 163, 184];
          } else if (val < kkm) {
            data.cell.styles.fillColor = [255, 241, 242]; // Rose-50
            data.cell.styles.textColor = [190, 18, 60]; // Rose-700
            data.cell.styles.fontStyle = 'bold';
          }
        } else if (data.column.index === jmlColIdx) {
          data.cell.styles.fillColor = [239, 246, 255];
          data.cell.styles.textColor = [30, 64, 175];
        } else if (data.column.index === rataColIdx) {
          data.cell.styles.fillColor = [238, 242, 255];
          data.cell.styles.textColor = [55, 48, 163];
        } else if (data.column.index === rankColIdx) {
          const rankVal = rankLookup.get(rowData) || 1;
          if (rankVal === 1) {
            data.cell.styles.fillColor = [254, 243, 199]; // Gold
            data.cell.styles.textColor = [146, 64, 14];
          } else if (rankVal === 2) {
            data.cell.styles.fillColor = [226, 232, 240]; // Silver
            data.cell.styles.textColor = [30, 41, 59];
          } else if (rankVal === 3) {
            data.cell.styles.fillColor = [254, 235, 200]; // Bronze
            data.cell.styles.textColor = [154, 52, 18];
          } else {
            data.cell.styles.fillColor = [255, 251, 235];
            data.cell.styles.textColor = [100, 116, 139];
          }
        }
      }
    },
    margin: { left: margin, right: margin }
  });

  // 5. Keterangan & Blok Tanda Tangan Kepala Sekolah + Wali Kelas
  let afterTableY = ((doc as any).lastAutoTable?.finalY || 140) + 4;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Keterangan: Sel berwarna merah muda menandakan nilai di bawah KKTP masing-masing mata pelajaran. Peringkat 1–3 ditandai warna emas, perak, dan perunggu.',
    margin,
    afterTableY
  );

  let signY = afterTableY + 6;
  if (signY + 30 > pageHeight - 8) {
    doc.addPage();
    signY = 18;
  }

  const reportPlace = school.reportPlace || schoolKec || 'Tanjung Samak';
  const reportDate =
    school.reportDate ||
    new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

  const leftSignX = margin + 12;
  const rightSignX = pageWidth - margin - 72;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Mengetahui,', leftSignX, signY);
  doc.setFont('helvetica', 'bold');
  doc.text(`Kepala ${schoolName},`, leftSignX, signY + 4.5);
  doc.text(school.headmasterName || '.........................', leftSignX, signY + 21);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`NIP. ${school.headmasterNip || '-'}`, leftSignX, signY + 25);

  doc.setFontSize(8.5);
  doc.text(`${reportPlace}, ${reportDate}`, rightSignX, signY);
  doc.setFont('helvetica', 'bold');
  doc.text(`Wali Kelas ${classroom.name},`, rightSignX, signY + 4.5);
  doc.text(waliName !== '-' ? waliName : '.........................', rightSignX, signY + 21);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(homeroomTeacher?.nip ? `NIP. ${homeroomTeacher.nip}` : 'NIP. -', rightSignX, signY + 25);

  return doc;
};

export const generateLegerPDF = async (
  classroom: Classroom,
  students: Student[],
  subjects: Subject[],
  scores: AssessmentScore[],
  school: SchoolProfile,
  academicYear: string,
  semester: string,
  homeroomTeacher?: Teacher
) => {
  let logoBase64 = '';
  try {
    logoBase64 = await getTutWuriHandayaniDataUrl();
  } catch {
    logoBase64 = '';
  }
  const doc = buildLegerPDFDoc(
    classroom,
    students,
    subjects,
    scores,
    school,
    academicYear,
    semester,
    homeroomTeacher,
    logoBase64
  );
  doc.save(`Leger_${classroom.name.replace(/\s+/g, '_')}_${academicYear.replace('/', '-')}.pdf`);
};

export interface KokurikulerReportPDFOptions {
  school: SchoolProfile;
  academicYear: string;
  semester: string;
  title: string;
  groups: KokurikulerGroup[];
  activities: KokurikulerActivity[];
  scores: KokurikulerScore[];
  descriptions: KokurikulerDescription[];
  students: Student[];
  classrooms: Classroom[];
  dimensions: KokurikulerDimensionMaster[];
}

export const generateKokurikulerReportPDF = (opts: KokurikulerReportPDFOptions) => {
  const {
    school,
    academicYear,
    semester,
    title,
    groups,
    activities,
    scores,
    descriptions,
    students,
    classrooms,
    dimensions
  } = opts;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const classMap = new Map(classrooms.map((c) => [c.id, c.name]));
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const subMap = getSubdimensionMap(dimensions);

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(title.toUpperCase(), pageWidth / 2, 13, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`${school.name.toUpperCase()} (${school.npsn})`, pageWidth / 2, 18.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Tahun Pelajaran: ${academicYear} | Semester: ${semester} | Acuan: BSKAP No. 058/H/KR/2025 & e-Rapor SMP 2025.2`,
    pageWidth / 2,
    23.5,
    { align: 'center' }
  );

  // Table 1: Ringkasan Kelompok & Rekap Distribusi Capaian
  const summaryRows: any[] = [];
  activities.forEach((act, idx) => {
    const grp = groups.find((g) => g.id === act.groupId);
    if (!grp) return;
    const actScores = scores.filter(
      (sc) => sc.activityId === act.id && sc.groupId === grp.id && sc.academicYear === academicYear && sc.semester === semester
    );
    const bCount = actScores.filter((s) => s.level === 'Berkembang').length;
    const cCount = actScores.filter((s) => s.level === 'Cakap').length;
    const mCount = actScores.filter((s) => s.level === 'Mahir').length;
    const targetSubCodes = (act.subdimensionIds || [])
      .map((sid) => subMap.get(sid)?.sub.code || sid)
      .join(', ');

    summaryRows.push([
      idx + 1,
      `${grp.code} - ${grp.name}`,
      act.name,
      act.theme,
      grp.studentIds.length,
      targetSubCodes || '-',
      bCount,
      cCount,
      mCount
    ]);
  });

  autoTable(doc, {
    startY: 28,
    head: [['No', 'Kelompok', 'Kegiatan Kokurikuler', 'Tema', 'Peserta', 'Subdimensi Target', 'B', 'C', 'M']],
    body: summaryRows.length ? summaryRows : [['-', 'Belum ada kegiatan kokurikuler pada filter terpilih', '-', '-', 0, '-', 0, 0, 0]],
    theme: 'plain',
    styles: { fontSize: 7.5, cellPadding: 1.8, lineColor: [130, 130, 130], lineWidth: 0.1 },
    headStyles: { fillColor: [232, 240, 252], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      4: { halign: 'center', cellWidth: 16 },
      6: { halign: 'center', cellWidth: 12 },
      7: { halign: 'center', cellWidth: 12 },
      8: { halign: 'center', cellWidth: 12 }
    },
    margin: { left: 10, right: 10 }
  });

  // Table 2: Daftar Capaian & Deskripsi per Peserta Didik
  const participantRows: any[] = [];
  let rowNo = 1;
  activities.forEach((act) => {
    const grp = groups.find((g) => g.id === act.groupId);
    if (!grp) return;
    (grp.studentIds || []).forEach((sid) => {
      const std = studentMap.get(sid);
      if (!std) return;
      const actScores = scores.filter(
        (sc) =>
          sc.studentId === sid &&
          sc.activityId === act.id &&
          sc.groupId === grp.id &&
          sc.academicYear === academicYear &&
          sc.semester === semester
      );
      const desc = descriptions.find(
        (d) =>
          d.studentId === sid &&
          d.activityId === act.id &&
          d.groupId === grp.id &&
          d.academicYear === academicYear &&
          d.semester === semester
      );

      const levelBreakdown =
        actScores.length > 0
          ? actScores
              .map((sc) => `${subMap.get(sc.subdimensionId)?.sub.code || sc.subdimensionId}: ${sc.level}`)
              .join('; ')
          : 'Belum dinilai';

      participantRows.push([
        rowNo++,
        std.nisn || std.nis || '-',
        std.name,
        classMap.get(std.classId) || '-',
        `${act.name} (${grp.code})`,
        levelBreakdown,
        desc?.status || 'Belum diisi',
        desc?.description || '-'
      ]);
    });
  });

  let nextY = (doc as any).lastAutoTable.finalY + 6;
  if (nextY > 165) {
    doc.addPage();
    nextY = 15;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('REKAP CAPAIAN SUBDIMENSI & DESKRIPSI RAPOR PESERTA DIDIK', 10, nextY);

  autoTable(doc, {
    startY: nextY + 3,
    head: [['No', 'NISN', 'Nama Peserta Didik', 'Rombel', 'Kegiatan / Kelompok', 'Capaian Subdimensi', 'Status', 'Deskripsi Rapor']],
    body: participantRows.length
      ? participantRows
      : [['-', '-', 'Belum ada data peserta pada filter terpilih', '-', '-', '-', '-', '-']],
    theme: 'plain',
    styles: { fontSize: 7, cellPadding: 1.6, lineColor: [140, 140, 140], lineWidth: 0.1 },
    headStyles: { fillColor: [240, 244, 248], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 20 },
      2: { cellWidth: 36 },
      3: { halign: 'center', cellWidth: 18 },
      4: { cellWidth: 36 },
      5: { cellWidth: 48 },
      6: { halign: 'center', cellWidth: 20 },
      7: { cellWidth: 88 }
    },
    margin: { left: 10, right: 10 }
  });

  const signY = Math.min((doc as any).lastAutoTable.finalY + 10, doc.internal.pageSize.getHeight() - 32);
  const signX = pageWidth - 75;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${school.reportPlace}, ${school.reportDate}`, signX, signY);
  doc.text('Kepala SMP Negeri 1 Rangsang,', signX, signY + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.text(school.headmasterName, signX, signY + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`NIP. ${school.headmasterNip}`, signX, signY + 24);

  doc.save(`Laporan_Kokurikuler_${school.name.replace(/\s+/g, '_')}_${academicYear.replace('/', '-')}_${semester}.pdf`);
};

export interface ElectiveTranscriptPDFOptions {
  school: SchoolProfile;
  student: Student;
  classroom?: Classroom;
  classrooms: Classroom[];
  subjects: Subject[];
  scores: AssessmentScore[];
  rows?: ElectiveHistoryRow[];
  preparedByName?: string;
  preparedByNip?: string;
}

export const buildElectiveTranscriptPDFDoc = (opts: ElectiveTranscriptPDFOptions): jsPDF => {
  const {
    school,
    student,
    classroom,
    classrooms,
    subjects,
    scores,
    preparedByName,
    preparedByNip
  } = opts;

  const historyRows =
    opts.rows ||
    getElectiveHistoryRows({
      student,
      subjects,
      scores,
      classrooms
    });

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Sekolah
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('PEMERINTAH KABUPATEN KEPULAUAN MERANTI', pageWidth / 2, 14, { align: 'center' });
  doc.setFontSize(9.5);
  doc.text('DINAS PENDIDIKAN DAN KEBUDAYAAN', pageWidth / 2, 19, { align: 'center' });
  doc.setFontSize(12);
  doc.text(school.name.toUpperCase(), pageWidth / 2, 25, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    `NPSN: ${school.npsn} • Alamat: ${school.address}, Kec. ${school.kecamatan}, Kab. ${school.kabupaten} - ${school.provinsi}`,
    pageWidth / 2,
    29.5,
    { align: 'center' }
  );

  doc.setDrawColor(20, 20, 20);
  doc.setLineWidth(0.6);
  doc.line(14, 32, pageWidth - 14, 32);

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(ELECTIVE_TRANSCRIPT_TITLE, pageWidth / 2, 40, { align: 'center' });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.text(
    ELECTIVE_TRANSCRIPT_SUBTITLE,
    pageWidth / 2,
    45,
    { align: 'center' }
  );

  // Identity
  const identityRows = [
    ['Nama Peserta Didik', ':', student.name, 'NIS / NISN', ':', `${student.nis || '-'} / ${student.nisn || '-'}`],
    ['Kelas Saat Ini', ':', classroom?.name || '-', 'Tempat, Tgl Lahir', ':', `${student.pob || '-'}, ${student.dob || '-'}`]
  ];

  autoTable(doc, {
    startY: 49,
    body: identityRows,
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 1.2, textColor: [20, 20, 20] },
    columnStyles: {
      0: { cellWidth: 34 },
      1: { cellWidth: 4, halign: 'center' },
      2: { cellWidth: 58, fontStyle: 'bold' },
      3: { cellWidth: 32 },
      4: { cellWidth: 4, halign: 'center' },
      5: { cellWidth: 50, fontStyle: 'bold' }
    },
    margin: { left: 14, right: 14 }
  });

  const tableStartY = (doc as any).lastAutoTable.finalY + 5;
  const tableBody = buildElectiveTranscriptTableRows(historyRows);

  autoTable(doc, {
    startY: tableStartY,
    head: [['No', 'Mata Pelajaran', 'Tahun Ajaran', 'Semester', 'Kelas', 'Nilai Akhir', 'Deskripsi Capaian Kompetensi']],
    body: tableBody,
    theme: 'plain',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: [110, 110, 110],
      lineWidth: 0.1,
      textColor: [20, 20, 20]
    },
    headStyles: {
      fillColor: [232, 244, 248],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 34, fontStyle: 'bold' },
      2: { halign: 'center', cellWidth: 21 },
      3: { halign: 'center', cellWidth: 22 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'center', cellWidth: 15, fontStyle: 'bold' },
      6: { cellWidth: 64 }
    },
    margin: { left: 14, right: 14 }
  });

  let noteY = (doc as any).lastAutoTable.finalY + 6;
  if (noteY > 235) {
    doc.addPage();
    noteY = 20;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(180, 190, 205);
  doc.rect(14, noteY, pageWidth - 28, 16, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Catatan Penting:', 17, noteY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    ELECTIVE_TRANSCRIPT_DISCLAIMER,
    17,
    noteY + 9.5,
    { maxWidth: pageWidth - 34 }
  );

  const signY = noteY + 24;
  doc.setFontSize(8.5);
  doc.text('Mengetahui,', 18, signY);
  doc.setFont('helvetica', 'bold');
  doc.text('Wali Kelas / Guru Pengampu,', 18, signY + 4.5);
  doc.text(preparedByName || '-', 18, signY + 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  if (preparedByNip) {
    doc.text(`NIP. ${preparedByNip}`, 18, signY + 28);
  }

  const rightX = pageWidth - 72;
  doc.setFontSize(8.5);
  doc.text(`${school.reportPlace || 'Tanjung Samak'}, ${school.reportDate}`, rightX, signY);
  doc.setFont('helvetica', 'bold');
  doc.text(`Kepala ${school.name},`, rightX, signY + 4.5);
  doc.text(school.headmasterName, rightX, signY + 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`NIP. ${school.headmasterNip}`, rightX, signY + 28);

  return doc;
};

export const generateElectiveTranscriptPDF = (opts: ElectiveTranscriptPDFOptions) => {
  const { student } = opts;
  const doc = buildElectiveTranscriptPDFDoc(opts);
  doc.save(`Riwayat_Mapel_Pilihan_${student.nisn || student.nis}_${student.name.replace(/\s+/g, '_')}.pdf`);
};

export interface PengolahanNilaiPDFOptions {
  school?: Partial<SchoolProfile>;
  classroom: Classroom;
  subject: Subject;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  subjectTeacherName: string;
  subjectTeacherNip?: string;
  homeroomTeacherName?: string;
  kkm: number;
  stats: {
    totalStudents: number;
    totalEntries: number;
    averageScore: number;
    maxScore: number;
    minScore: number;
    passedCount: number;
    remedialCount: number;
    passingRate: number;
    predA: number;
    predB: number;
    predC: number;
    predD: number;
  };
  rows: Array<{
    no: number;
    nisn: string;
    name: string;
    score?: number;
    predicate: string;
    statusLabel: string;
    isPassed?: boolean;
  }>;
}

export const buildPengolahanNilaiPDFDoc = (
  opts: PengolahanNilaiPDFOptions,
  logoBase64?: string
): jsPDF => {
  const {
    school,
    classroom,
    subject,
    academicYear,
    semester,
    subjectTeacherName,
    subjectTeacherNip,
    homeroomTeacherName,
    kkm,
    stats,
    rows
  } = opts;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const usableWidth = pageWidth - margin * 2; // 182mm

  const schoolName = school?.name || 'SMP Negeri 1 Rangsang';
  const schoolNpsn = school?.npsn || '10400880';
  const schoolAddress = school?.address || 'Jl. Pendidikan';
  const schoolKec = school?.kecamatan || 'Rangsang';
  const schoolKab = school?.kabupaten || 'Kepulauan Meranti';
  const reportPlace = school?.reportPlace || schoolKec || 'Tanjung Samak';
  const reportDate =
    school?.reportDate ||
    new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

  // 1. Kop Sekolah
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, 10.5, 16.5, 16.5);
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(`PEMERINTAH KABUPATEN ${schoolKab.toUpperCase()}`, pageWidth / 2, 14, { align: 'center' });
  doc.setFontSize(9.5);
  doc.text('DINAS PENDIDIKAN DAN KEBUDAYAAN', pageWidth / 2, 18.5, { align: 'center' });
  doc.setFontSize(12);
  doc.text(schoolName.toUpperCase(), pageWidth / 2, 24, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `NPSN: ${schoolNpsn} • ${schoolAddress}, Kec. ${schoolKec}, Kab. ${schoolKab}`,
    pageWidth / 2,
    28.5,
    { align: 'center' }
  );

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.7);
  doc.line(margin, 31.5, pageWidth - margin, 31.5);
  doc.setLineWidth(0.2);
  doc.line(margin, 32.5, pageWidth - margin, 32.5);

  // 2. Judul Dokumen
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PENGOLAHAN & ANALISIS HASIL PENILAIAN MATA PELAJARAN', pageWidth / 2, 39.5, {
    align: 'center'
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Tahun Pelajaran ${academicYear} • Semester ${semester}`, pageWidth / 2, 44.5, {
    align: 'center'
  });

  // 3. Blok Identitas Mapel, Kelas & Guru Mata Pelajaran
  const teacherDisplay = subjectTeacherNip
    ? `${subjectTeacherName} (NIP. ${subjectTeacherNip})`
    : subjectTeacherName;

  autoTable(doc, {
    startY: 48,
    body: [
      [
        'Mata Pelajaran',
        ':',
        `${subject.name} (${subject.code})`,
        'Kelas / Rombel',
        ':',
        classroom.name
      ],
      [
        'Guru Mata Pelajaran',
        ':',
        teacherDisplay || '-',
        'KKTP Satuan Pendidikan',
        ':',
        String(kkm)
      ],
      [
        'Wali Kelas',
        ':',
        homeroomTeacherName || '-',
        'Siswa Dinilai',
        ':',
        `${stats.totalEntries} dari ${stats.totalStudents} Siswa`
      ]
    ],
    theme: 'plain',
    styles: {
      fontSize: 8,
      cellPadding: 1.6,
      textColor: [30, 41, 59],
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: 'bold', textColor: [71, 85, 105] },
      1: { cellWidth: 3, halign: 'center' },
      2: { cellWidth: 64, fontStyle: 'bold' },
      3: { cellWidth: 35, fontStyle: 'bold', textColor: [71, 85, 105] },
      4: { cellWidth: 3, halign: 'center' },
      5: { cellWidth: 45, fontStyle: 'bold' }
    },
    margin: { left: margin, right: margin },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.2
  });

  // 4. Bagan Ringkasan Statistik (4 Kartu)
  const statSectionY = ((doc as any).lastAutoTable?.finalY || 68) + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('A. RINGKASAN STATISTIK & KETUNTASAN BELAJAR', margin, statSectionY);

  const cardY = statSectionY + 2.5;
  const cardGap = 3;
  const cardWidth = (usableWidth - cardGap * 3) / 4; // 43.25mm
  const cardHeight = 19.5;

  const statCards: Array<{
    title: string;
    value: string;
    subtitle: string;
    fill: [number, number, number];
    border: [number, number, number];
    titleColor: [number, number, number];
    valueColor: [number, number, number];
  }> = [
    {
      title: 'Rata-Rata Kelas',
      value: String(stats.averageScore),
      subtitle: `Dari ${stats.totalEntries} nilai siswa`,
      fill: [239, 246, 255],
      border: [191, 219, 254],
      titleColor: [30, 64, 175],
      valueColor: [29, 78, 216]
    },
    {
      title: 'Tingkat Ketuntasan',
      value: `${stats.passingRate}%`,
      subtitle: `${stats.passedCount} Tuntas • ${stats.remedialCount} Remedial`,
      fill: [236, 253, 245],
      border: [167, 243, 208],
      titleColor: [6, 95, 70],
      valueColor: [5, 150, 105]
    },
    {
      title: 'Nilai Tertinggi',
      value: String(stats.maxScore),
      subtitle: 'Pencapaian Maksimal',
      fill: [238, 242, 255],
      border: [199, 210, 254],
      titleColor: [55, 48, 163],
      valueColor: [67, 56, 202]
    },
    {
      title: 'Nilai Terendah',
      value: String(stats.minScore),
      subtitle: 'Batas Bawah Kelas',
      fill: [255, 241, 242],
      border: [254, 205, 211],
      titleColor: [159, 18, 57],
      valueColor: [225, 29, 72]
    }
  ];

  statCards.forEach((card, i) => {
    const x = margin + i * (cardWidth + cardGap);
    doc.setFillColor(...card.fill);
    doc.setDrawColor(...card.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...card.titleColor);
    doc.text(card.title, x + 3, cardY + 5);

    doc.setFontSize(14);
    doc.setTextColor(...card.valueColor);
    doc.text(card.value, x + 3, cardY + 12.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(card.subtitle, x + 3, cardY + 16.8);
  });

  // 5. Bagan Distribusi Predikat (A, B, C, D) + Grafik Batang Proporsi
  const predSectionY = cardY + cardHeight + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('B. BAGAN DISTRIBUSI PREDIKAT CAPAIAN SISWA (A, B, C, D)', margin, predSectionY);

  const predBoxY = predSectionY + 2.5;
  const predBoxHeight = 46;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, predBoxY, usableWidth, predBoxHeight, 2, 2, 'FD');

  const denom = Math.max(1, stats.totalEntries);
  const toPct = (count: number) =>
    stats.totalEntries > 0 ? Math.round((count / denom) * 100) : 0;

  const predItems: Array<{
    label: string;
    shortLabel: string;
    desc: string;
    count: number;
    pct: number;
    fill: [number, number, number];
    border: [number, number, number];
    barColor: [number, number, number];
    textColor: [number, number, number];
  }> = [
    {
      label: 'Predikat A (>= 90)',
      shortLabel: 'A (>= 90)',
      desc: 'Sangat Baik',
      count: stats.predA,
      pct: toPct(stats.predA),
      fill: [239, 246, 255],
      border: [191, 219, 254],
      barColor: [37, 99, 235],
      textColor: [30, 64, 175]
    },
    {
      label: 'Predikat B (80 - 89)',
      shortLabel: 'B (80 - 89)',
      desc: 'Baik',
      count: stats.predB,
      pct: toPct(stats.predB),
      fill: [236, 253, 245],
      border: [167, 243, 208],
      barColor: [16, 185, 129],
      textColor: [6, 95, 70]
    },
    {
      label: `Predikat C (${kkm} - 79)`,
      shortLabel: `C (${kkm} - 79)`,
      desc: 'Cukup',
      count: stats.predC,
      pct: toPct(stats.predC),
      fill: [255, 251, 235],
      border: [253, 230, 138],
      barColor: [245, 158, 11],
      textColor: [146, 64, 14]
    },
    {
      label: `Predikat D (< ${kkm})`,
      shortLabel: `D (< ${kkm})`,
      desc: 'Perlu Bimbingan',
      count: stats.predD,
      pct: toPct(stats.predD),
      fill: [255, 241, 242],
      border: [254, 205, 211],
      barColor: [225, 29, 72],
      textColor: [159, 18, 57]
    }
  ];

  const innerPad = 3;
  const innerCardGap = 2.5;
  const innerCardW = (usableWidth - innerPad * 2 - innerCardGap * 3) / 4;
  const innerCardH = 16.5;
  const innerCardY = predBoxY + 3;

  predItems.forEach((p, i) => {
    const x = margin + innerPad + i * (innerCardW + innerCardGap);
    doc.setFillColor(...p.fill);
    doc.setDrawColor(...p.border);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, innerCardY, innerCardW, innerCardH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...p.textColor);
    doc.text(p.label, x + innerCardW / 2, innerCardY + 4.5, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`${p.count}`, x + innerCardW / 2, innerCardY + 10.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(`${p.desc} (${p.pct}%)`, x + innerCardW / 2, innerCardY + 14.5, { align: 'center' });
  });

  // Horizontal bar chart inside box
  const chartStartY = innerCardY + innerCardH + 4;
  const labelX = margin + innerPad;
  const trackX = margin + innerPad + 26;
  const trackW = usableWidth - innerPad * 2 - 26 - 30; // ~120mm
  const valueX = trackX + trackW + 3;

  predItems.forEach((p, idx) => {
    const ry = chartStartY + idx * 5.2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text(p.shortLabel, labelX, ry + 2.8);

    // Track
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(trackX, ry, trackW, 3.4, 1, 1, 'F');

    // Fill
    const fillW = stats.totalEntries > 0 ? Math.max(p.count > 0 ? 2 : 0, (p.count / denom) * trackW) : 0;
    if (fillW > 0) {
      doc.setFillColor(...p.barColor);
      doc.roundedRect(trackX, ry, fillW, 3.4, 1, 1, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text(`${p.count} siswa (${p.pct}%)`, valueX, ry + 2.7);
  });

  // 6. Tabel Daftar Nilai & Ketuntasan Siswa
  const tableTitleY = predBoxY + predBoxHeight + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('C. DAFTAR NILAI AKHIR & STATUS KETERCAPAIAN PESERTA DIDIK', margin, tableTitleY);

  const tableBody = rows.map((r) => [
    String(r.no),
    r.nisn || '-',
    r.name,
    r.score !== undefined ? String(r.score) : '-',
    r.predicate || '-',
    r.statusLabel
  ]);

  autoTable(doc, {
    startY: tableTitleY + 2.5,
    head: [['No', 'NISN', 'Nama Peserta Didik', 'Nilai Akhir', 'Predikat', 'Status Ketercapaian']],
    body: tableBody,
    foot: [
      [
        '',
        '',
        'Rata-Rata & Ketuntasan Kelas',
        String(stats.averageScore),
        '-',
        `${stats.passingRate}% Tuntas (${stats.passedCount}/${stats.totalEntries})`
      ]
    ],
    theme: 'plain',
    styles: {
      fontSize: 7.8,
      cellPadding: 1.9,
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
      textColor: [30, 41, 59]
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      halign: 'center'
    },
    footStyles: {
      fillColor: [239, 246, 255],
      textColor: [30, 64, 175],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 26 },
      2: { cellWidth: 64, fontStyle: 'bold' },
      3: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
      4: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      5: { halign: 'center', cellWidth: 44 }
    },
    didParseCell: (data) => {
      if (data.section === 'foot' && data.column.index === 2) {
        data.cell.styles.halign = 'left';
      }
      if (data.section === 'body') {
        const rowData = rows[data.row.index];
        if (!rowData) return;
        if (rowData.score === undefined) {
          if (data.column.index >= 3) {
            data.cell.styles.textColor = [148, 163, 184];
          }
        } else if (rowData.isPassed === false) {
          if (data.column.index === 3 || data.column.index === 5) {
            data.cell.styles.textColor = [190, 18, 60];
            data.cell.styles.fillColor = [255, 241, 242];
            data.cell.styles.fontStyle = 'bold';
          }
        } else if (rowData.isPassed === true) {
          if (data.column.index === 3 || data.column.index === 5) {
            data.cell.styles.textColor = [4, 120, 87];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    },
    margin: { left: margin, right: margin }
  });

  // 7. Blok Pengesahan & Tanda Tangan Guru Mapel
  let signY = ((doc as any).lastAutoTable?.finalY || 220) + 10;
  if (signY + 34 > pageHeight - 12) {
    doc.addPage();
    signY = 20;
  }

  const leftSignX = margin + 4;
  const rightSignX = pageWidth - margin - 62;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Mengetahui,', leftSignX, signY);
  doc.setFont('helvetica', 'bold');
  doc.text(`Kepala ${schoolName},`, leftSignX, signY + 4.5);
  doc.text(school?.headmasterName || '.........................', leftSignX, signY + 23);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`NIP. ${school?.headmasterNip || '-'}`, leftSignX, signY + 27);

  doc.setFontSize(8.5);
  doc.text(`${reportPlace}, ${reportDate}`, rightSignX, signY);
  doc.setFont('helvetica', 'bold');
  doc.text('Guru Mata Pelajaran,', rightSignX, signY + 4.5);
  doc.text(subjectTeacherName || '-', rightSignX, signY + 23);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(subjectTeacherNip ? `NIP. ${subjectTeacherNip}` : 'NIP. -', rightSignX, signY + 27);

  return doc;
};

export const generatePengolahanNilaiPDF = async (opts: PengolahanNilaiPDFOptions) => {
  let logoBase64 = '';
  try {
    logoBase64 = await getTutWuriHandayaniDataUrl();
  } catch {
    logoBase64 = '';
  }
  const doc = buildPengolahanNilaiPDFDoc(opts, logoBase64);
  const safeClass = opts.classroom.name.replace(/\s+/g, '_');
  const safeSubject = (opts.subject.code || opts.subject.name).replace(/\s+/g, '_');
  const safeYear = opts.academicYear.replace(/\//g, '-');
  doc.save(`Pengolahan_Nilai_${safeSubject}_${safeClass}_${safeYear}_${opts.semester}.pdf`);
};



