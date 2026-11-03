import React, { useState } from 'react';
import {
  SchoolProfile,
  Classroom,
  Student,
  Subject,
  AssessmentScore,
  Attendance,
  Extracurricular,
  StudentExtracurricular,
  HomeroomNote,
  Teacher,
  User
} from '../types/erapor';
import {
  Printer,
  Download,
  ChevronLeft,
  ChevronRight,
  FileText,
  School,
  Contact,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Users,
  Eye,
  Loader2
} from 'lucide-react';
import {
  generateCompleteReportPDF,
  generateSingleReportCardPDF,
  generateBiodataSiswaPDF,
  generateClassBatchReportPDF,
  ReportCardExportOptions
} from '../services/pdfService';
import { TutWuriHandayaniLogo } from '../components/common/TutWuriHandayaniLogo';
import { SecurityAccessDenied } from '../components/SecurityAccessDenied';
import { sortClassrooms } from '../utils/classroomSort';
import { sortSubjects } from '../utils/subjectSort';

interface CetakRaporViewProps {
  school: SchoolProfile;
  classrooms: Classroom[];
  students: Student[];
  subjects: Subject[];
  scores: AssessmentScore[];
  attendanceList: Attendance[];
  extracurriculars: Extracurricular[];
  studentExtracurriculars: StudentExtracurricular[];
  homeroomNotes: HomeroomNote[];
  teachers: Teacher[];
  preselectedStudentId?: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  currentUser: User;
}

type PreviewPage = 'all' | 'cover' | 'school' | 'biodata' | 'grades';

export const CetakRaporView: React.FC<CetakRaporViewProps> = ({
  school,
  classrooms,
  students,
  subjects,
  scores,
  attendanceList,
  extracurriculars,
  studentExtracurriculars,
  homeroomNotes,
  teachers,
  preselectedStudentId,
  academicYear,
  semester,
  currentUser
}) => {
  const [activePreviewPage, setActivePreviewPage] = useState<PreviewPage>('cover');
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchMode, setBatchMode] = useState<'complete' | 'gradesOnly'>('complete');
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; name: string } | null>(null);

  const isWaliKelas = currentUser.role === 'walikelas';
  const authorizedClass = classrooms.find((c) => c.id === currentUser.classId);

  const [selectedClass, setSelectedClass] = useState<string>(
    isWaliKelas && currentUser.classId ? currentUser.classId : classrooms[0]?.id || 'cls-vii-1'
  );

  // Security check: if Wali Kelas attempts to access another class
  const isUnauthorized = isWaliKelas && currentUser.classId && selectedClass !== currentUser.classId;
  const attemptedClass = isUnauthorized ? classrooms.find((c) => c.id === selectedClass) : null;

  if (isUnauthorized) {
    return (
      <SecurityAccessDenied
        currentUser={currentUser}
        authorizedClassroom={authorizedClass}
        targetClassroom={attemptedClass}
        onResetToAuthorizedClass={() => setSelectedClass(currentUser.classId || '')}
      />
    );
  }

  const sortedClassrooms = sortClassrooms(classrooms);
  const sortedSubjects = sortSubjects(subjects);

  const visibleClassrooms = isWaliKelas
    ? sortedClassrooms.filter((c) => c.id === currentUser.classId)
    : sortedClassrooms;

  const classStudents = students.filter((s) => s.classId === selectedClass);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    preselectedStudentId || classStudents[0]?.id || students[0]?.id || ''
  );

  const classroom = classrooms.find((c) => c.id === selectedClass) || classrooms[0];
  const currentStudent = students.find((s) => s.id === selectedStudentId) || classStudents[0] || students[0];
  const homeroomTeacher = teachers.find((t) => t.id === classroom?.homeroomTeacherId);

  // Data for the current student
  const studentScores = scores.filter(
    (sc) =>
      sc.studentId === currentStudent?.id &&
      sc.academicYear === academicYear &&
      sc.semester === semester
  );
  const scoreLookup = new Map(studentScores.map((s) => [s.subjectId, s]));

  const studentAtt = attendanceList.find(
    (a) =>
      a.studentId === currentStudent?.id &&
      a.academicYear === academicYear &&
      a.semester === semester
  );

  const studentEkskuls = studentExtracurriculars.filter(
    (e) =>
      e.studentId === currentStudent?.id &&
      e.academicYear === academicYear &&
      e.semester === semester
  );
  const ekskulMap = new Map(extracurriculars.map((e) => [e.id, e.name]));

  const studentNote = homeroomNotes.find(
    (n) =>
      n.studentId === currentStudent?.id &&
      n.academicYear === academicYear &&
      n.semester === semester
  );

  // Next / Previous Student Navigation
  const currentIndex = classStudents.findIndex((s) => s.id === currentStudent?.id);
  const handlePrev = () => {
    if (currentIndex > 0) setSelectedStudentId(classStudents[currentIndex - 1].id);
  };
  const handleNext = () => {
    if (currentIndex < classStudents.length - 1) setSelectedStudentId(classStudents[currentIndex + 1].id);
  };

  // Check completeness for data verification notice
  const missingSubjects = sortedSubjects.filter((sub) => !scoreLookup.has(sub.id));
  const isDataComplete =
    currentStudent &&
    currentStudent.nisn &&
    (currentStudent.fatherName || currentStudent.motherName) &&
    missingSubjects.length === 0;

  // Single Student Export Options
  const getSingleExportOptions = (): ReportCardExportOptions | null => {
    if (!currentStudent || !classroom) return null;
    return {
      school,
      student: currentStudent,
      classroom,
      homeroomTeacher,
      subjects: sortedSubjects,
      scores: studentScores,
      attendance: studentAtt,
      extracurriculars,
      studentExtracurriculars: studentEkskuls,
      homeroomNote: studentNote,
      academicYear,
      semester
    };
  };

  // Handler A & C: Cetak Rapor Lengkap
  const handleDownloadCompletePDF = async () => {
    const opts = getSingleExportOptions();
    if (!opts) return;
    await generateCompleteReportPDF(opts);
  };

  // Handler B: Cetak Isi Rapor Saja
  const handleDownloadGradesOnlyPDF = () => {
    const opts = getSingleExportOptions();
    if (!opts) return;
    generateSingleReportCardPDF(opts);
  };

  // Handler Biodata PDF
  const handleDownloadBiodataOnlyPDF = () => {
    if (!currentStudent || !classroom) return;
    generateBiodataSiswaPDF({ school, student: currentStudent, classroom });
  };

  // Handler D: Cetak Seluruh Siswa Rombel (Batch)
  const handleStartBatchPrint = async () => {
    if (!classroom || classStudents.length === 0) return;
    setIsGeneratingBatch(true);
    try {
      await generateClassBatchReportPDF(
        {
          school,
          classroom,
          students: classStudents,
          homeroomTeacher,
          subjects: sortedSubjects,
          scores,
          attendanceList,
          extracurriculars,
          studentExtracurriculars,
          homeroomNotes,
          academicYear,
          semester,
          mode: batchMode
        },
        (current, total, name) => {
          setBatchProgress({ current, total, name });
        }
      );
      setIsBatchModalOpen(false);
    } finally {
      setIsGeneratingBatch(false);
      setBatchProgress(null);
    }
  };

  const handlePrintBrowser = () => {
    window.print();
  };

  const parentSignName = currentStudent?.fatherName || currentStudent?.motherName || 'Orang Tua / Wali Siswa';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top action bar - hidden during print */}
      <div className="print:hidden flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-600" />
            Cetak Dokumen Rapor SMP Negeri 1 Rangsang
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Format resmi Kemendikbud: Sampul Rapor, Identitas Satuan Pendidikan, Keterangan Diri Siswa (Buku Induk), dan Laporan Capaian Kompetensi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Cetak Rapor Lengkap */}
          <button
            onClick={handleDownloadCompletePDF}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
            title="Cetak Seluruh Halaman: Sampul, Identitas Sekolah, Identitas Siswa, dan Isi Nilai"
          >
            <Download className="w-4 h-4" />
            Cetak Rapor Lengkap (PDF)
          </button>

          {/* Tombol Cetak Isi Saja */}
          <button
            onClick={handleDownloadGradesOnlyPDF}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            title="Cetak Nilai Akademik, Ekskul, dan Absensi Saja (Tanpa Sampul)"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            Isi Nilai Saja
          </button>

          {/* Tombol Batch Seluruh Siswa Rombel */}
          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
            title="Cetak Rapor Untuk Seluruh Siswa Dalam Satu Rombel Sekaligus"
          >
            <Users className="w-4 h-4 text-emerald-700" />
            Cetak 1 Kelas ({classStudents.length} Siswa)
          </button>

          {/* Tombol Cetak via Printer Fisik */}
          <button
            onClick={handlePrintBrowser}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs flex items-center gap-1.5 transition"
            title="Cetak Langsung Menggunakan Printer Kertas A4"
          >
            <Printer className="w-4 h-4" />
            Print Browser (A4)
          </button>
        </div>
      </div>

      {/* Selector & pagination controls - hidden during print */}
      <div className="print:hidden bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Rombel:</span>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                const nextClsStudents = students.filter((s) => s.classId === e.target.value);
                if (nextClsStudents.length > 0) setSelectedStudentId(nextClsStudents[0].id);
              }}
              className="px-3 py-2 rounded-lg border border-slate-300 font-bold bg-white text-slate-800"
            >
              {visibleClassrooms.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Pilih Siswa:</span>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 font-bold bg-white text-slate-800 max-w-xs"
            >
              {classStudents.map((s, idx) => (
                <option key={s.id} value={s.id}>
                  {idx + 1}. {s.name} ({s.nisn || s.nis || 'NISN -'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Next / Prev buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={currentIndex <= 0}
            className="p-2 rounded-lg border border-slate-300 text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition"
            title="Siswa Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-600">
            Siswa {currentIndex + 1} dari {classStudents.length}
          </span>
          <button
            onClick={handleNext}
            disabled={currentIndex >= classStudents.length - 1}
            className="p-2 rounded-lg border border-slate-300 text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition"
            title="Siswa Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status Kelengkapan Data Verifikasi Notice */}
      {!isDataComplete && (
        <div className="print:hidden bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-800">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-900">Perhatian Pengisian Nilai & Data Siswa:</p>
            <ul className="list-disc list-inside space-y-0.5 text-amber-800/90 text-[11px]">
              {missingSubjects.length > 0 && (
                <li>
                  Masih terdapat <strong>{missingSubjects.length} mata pelajaran</strong> yang belum diisi nilainya untuk siswa ini (
                  {missingSubjects.map((s) => s.name).slice(0, 3).join(', ')}
                  {missingSubjects.length > 3 ? ', dsb.' : ''}).
                </li>
              )}
              {!currentStudent?.nisn && <li>NISN siswa belum tercatat di data induk.</li>}
              {!currentStudent?.fatherName && !currentStudent?.motherName && (
                <li>Nama orang tua belum lengkap di data siswa.</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Interactive Pratinjau Tabs (Section 9: Pratinjau Rapor) */}
      <div className="print:hidden bg-slate-100 p-1.5 rounded-xl flex flex-wrap gap-1 border border-slate-200">
        <button
          onClick={() => setActivePreviewPage('cover')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
            activePreviewPage === 'cover'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Layers className="w-4 h-4" />
          Hal. 1: Sampul Rapor
        </button>

        <button
          onClick={() => setActivePreviewPage('school')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
            activePreviewPage === 'school'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <School className="w-4 h-4" />
          Hal. 2: Identitas Sekolah
        </button>

        <button
          onClick={() => setActivePreviewPage('biodata')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
            activePreviewPage === 'biodata'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Contact className="w-4 h-4" />
          Hal. 3: Identitas Peserta Didik
        </button>

        <button
          onClick={() => setActivePreviewPage('grades')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
            activePreviewPage === 'grades'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <FileText className="w-4 h-4" />
          Hal. 4: Isi Rapor Nilai
        </button>

        <button
          onClick={() => setActivePreviewPage('all')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ml-auto ${
            activePreviewPage === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Eye className="w-4 h-4" />
          Tampilkan Seluruh Halaman Sekaligus
        </button>
      </div>

      {/* RENDER DOKUMEN CETAK & PRATINJAU */}
      <div className="flex flex-col items-center gap-8">
        {/* ========================================================= */}
        {/* HALAMAN 1: SAMPUL RAPOR */}
        {/* ========================================================= */}
        {(activePreviewPage === 'cover' || activePreviewPage === 'all') && (
          <div className="w-full max-w-4xl bg-white text-slate-900 border border-slate-300 shadow-lg rounded-2xl p-10 sm:p-16 min-h-[1050px] flex flex-col justify-between items-center text-center relative print:border-none print:shadow-none print:p-0 print:min-h-0 print:page-break-after-always">
            {/* Header Sampul */}
            <div className="space-y-2 mt-8">
              <h2 className="text-xl sm:text-2xl font-black tracking-widest uppercase text-slate-900">
                LAPORAN
              </h2>
              <h3 className="text-base sm:text-lg font-bold tracking-wider uppercase text-slate-800">
                HASIL BELAJAR PESERTA DIDIK
              </h3>
              <h4 className="text-sm sm:text-base font-bold tracking-wider uppercase text-slate-800">
                SEKOLAH MENENGAH PERTAMA
              </h4>
              <p className="text-sm sm:text-base font-bold text-slate-700">(SMP)</p>
            </div>

            {/* Logo Tut Wuri Handayani */}
            <div className="my-8 flex justify-center">
              <TutWuriHandayaniLogo className="w-44 h-44 sm:w-52 sm:h-52 drop-shadow-md" />
            </div>

            {/* Kotak Identitas Siswa */}
            <div className="w-full max-w-md space-y-5 my-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  NAMA PESERTA DIDIK
                </p>
                <div className="border-2 border-slate-800 rounded-md py-2.5 px-4 font-bold text-sm sm:text-base text-slate-900 uppercase bg-slate-50/50">
                  {currentStudent?.name || '-'}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  NIS / NISN
                </p>
                <div className="border-2 border-slate-800 rounded-md py-2.5 px-4 font-mono font-bold text-sm sm:text-base text-slate-900 bg-slate-50/50">
                  {currentStudent?.nis || '-'} / {currentStudent?.nisn || '-'}
                </div>
              </div>
            </div>

            {/* Bagian Bawah Sampul */}
            <div className="space-y-1 mb-8 pt-6">
              <p className="text-sm sm:text-base font-bold uppercase tracking-wider text-slate-900">
                KEMENTERIAN PENDIDIKAN DASAR DAN MENENGAH
              </p>
              <p className="text-sm sm:text-base font-bold uppercase tracking-wider text-slate-900">
                REPUBLIK INDONESIA
              </p>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* HALAMAN 2: IDENTITAS SEKOLAH */}
        {/* ========================================================= */}
        {(activePreviewPage === 'school' || activePreviewPage === 'all') && (
          <div className="w-full max-w-4xl bg-white text-slate-900 border border-slate-300 shadow-lg rounded-2xl p-10 sm:p-16 min-h-[1050px] flex flex-col justify-between text-xs relative print:border-none print:shadow-none print:p-0 print:min-h-0 print:page-break-after-always">
            <div className="space-y-10">
              {/* Judul Halaman */}
              <div className="text-center space-y-1.5 pt-6">
                <h2 className="text-base sm:text-lg font-black tracking-wider uppercase text-slate-900">
                  LAPORAN
                </h2>
                <h3 className="text-sm sm:text-base font-bold tracking-wider uppercase text-slate-800">
                  HASIL PENCAPAIAN KOMPETENSI PESERTA DIDIK
                </h3>
                <h4 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-slate-800">
                  SEKOLAH MENENGAH PERTAMA (SMP)
                </h4>
              </div>

              {/* Tabel Informasi Sekolah */}
              <div className="max-w-2xl mx-auto pt-6">
                <table className="w-full text-xs sm:text-sm text-left">
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="w-48 py-2.5 font-semibold text-slate-700">Nama Sekolah</td>
                      <td className="py-2.5 font-bold text-slate-900">: {school.name}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold text-slate-700">NPSN</td>
                      <td className="py-2.5 font-mono text-slate-900">: {school.npsn}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold text-slate-700">NSS</td>
                      <td className="py-2.5 font-mono text-slate-900">: {school.nss || '201040101001'}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold text-slate-700 align-top">Alamat Sekolah</td>
                      <td className="py-2.5 text-slate-900">
                        <div>: {school.address}</div>
                        <div className="text-xs text-slate-600 pl-2 mt-0.5">
                          Kode Pos: {school.postalCode}, Telp.: {school.phone || '-'}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold text-slate-700">Kelurahan / Desa</td>
                      <td className="py-2.5 text-slate-900">: {school.desa}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold text-slate-700">Kecamatan</td>
                      <td className="py-2.5 text-slate-900">: {school.kecamatan}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold text-slate-700">Kabupaten / Kota</td>
                      <td className="py-2.5 text-slate-900">: {school.kabupaten}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold text-slate-700">Provinsi</td>
                      <td className="py-2.5 text-slate-900">: {school.provinsi}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold text-slate-700">Website</td>
                      <td className="py-2.5 text-blue-700 font-mono text-xs">: {school.website}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold text-slate-700">E-mail</td>
                      <td className="py-2.5 text-blue-700 font-mono text-xs">: {school.email}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Nomor Halaman di Bawah */}
            <div className="text-center pb-4 text-slate-500 font-medium">
              1
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* HALAMAN 3: IDENTITAS PESERTA DIDIK */}
        {/* ========================================================= */}
        {(activePreviewPage === 'biodata' || activePreviewPage === 'all') && (
          <div className="w-full max-w-4xl bg-white text-slate-900 border border-slate-300 shadow-lg rounded-2xl p-10 sm:p-14 min-h-[1050px] flex flex-col justify-between text-xs relative print:border-none print:shadow-none print:p-0 print:min-h-0 print:page-break-after-always">
            <div>
              {/* Judul Lembar Identitas */}
              <div className="text-center mb-6 pt-2">
                <h2 className="text-sm sm:text-base font-black tracking-wide uppercase text-slate-900">
                  IDENTITAS PESERTA DIDIK
                </h2>
              </div>

              {/* Data 1 - 16 dengan 4 kolom presisi: Nomor, Label, Titik Dua (:), dan Nilai */}
              <div className="space-y-1 text-xs text-slate-900">
                <table className="w-full text-xs table-fixed">
                  <colgroup>
                    <col className="w-7" />
                    <col className="w-64" />
                    <col className="w-4" />
                    <col />
                  </colgroup>
                  <tbody>
                    <tr className="py-1">
                      <td className="py-1 font-semibold text-slate-600 align-top">1.</td>
                      <td className="py-1 font-semibold text-slate-700 align-top">Nama Peserta Didik (Lengkap)</td>
                      <td className="py-1 font-bold text-slate-800 text-center align-top">:</td>
                      <td className="py-1 font-bold text-slate-950 align-top pl-1">{currentStudent?.name}</td>
                    </tr>
                    <tr className="py-1">
                      <td className="py-1 font-semibold text-slate-600 align-top">2.</td>
                      <td className="py-1 font-semibold text-slate-700 align-top">Nomor Induk Siswa Nasional</td>
                      <td className="py-1 font-bold text-slate-800 text-center align-top">:</td>
                      <td className="py-1 font-mono text-slate-900 align-top pl-1">{currentStudent?.nisn || '-'}</td>
                    </tr>
                    <tr className="py-1">
                      <td className="py-1 font-semibold text-slate-600 align-top">3.</td>
                      <td className="py-1 font-semibold text-slate-700 align-top">Tempat Tanggal Lahir</td>
                      <td className="py-1 font-bold text-slate-800 text-center align-top">:</td>
                      <td className="py-1 text-slate-900 align-top pl-1">{currentStudent?.pob || '-'}, {currentStudent?.dob || '-'}</td>
                    </tr>
                    <tr className="py-1">
                      <td className="py-1 font-semibold text-slate-600 align-top">4.</td>
                      <td className="py-1 font-semibold text-slate-700 align-top">Jenis Kelamin</td>
                      <td className="py-1 font-bold text-slate-800 text-center align-top">:</td>
                      <td className="py-1 text-slate-900 align-top pl-1">{currentStudent?.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                    </tr>
                    <tr className="py-1">
                      <td className="py-1 font-semibold text-slate-600 align-top">5.</td>
                      <td className="py-1 font-semibold text-slate-700 align-top">Agama</td>
                      <td className="py-1 font-bold text-slate-800 text-center align-top">:</td>
                      <td className="py-1 text-slate-900 align-top pl-1">{currentStudent?.religion || '-'}</td>
                    </tr>
                    <tr className="py-1">
                      <td className="py-1 font-semibold text-slate-600 align-top">6.</td>
                      <td className="py-1 font-semibold text-slate-700 align-top">Status dalam keluarga</td>
                      <td className="py-1 font-bold text-slate-800 text-center align-top">:</td>
                      <td className="py-1 text-slate-900 align-top pl-1">{currentStudent?.familyStatus || 'Anak Kandung'}</td>
                    </tr>
                    <tr className="py-1">
                      <td className="py-1 font-semibold text-slate-600 align-top">7.</td>
                      <td className="py-1 font-semibold text-slate-700 align-top">Anak ke</td>
                      <td className="py-1 font-bold text-slate-800 text-center align-top">:</td>
                      <td className="py-1 text-slate-900 align-top pl-1">{currentStudent?.childOrder ? String(currentStudent.childOrder) : '-'}</td>
                    </tr>
                    <tr className="py-1">
                      <td className="py-1 font-semibold text-slate-600 align-top">8.</td>
                      <td className="py-1 font-semibold text-slate-700 align-top">Alamat Peserta Didik</td>
                      <td className="py-1 font-bold text-slate-800 text-center align-top">:</td>
                      <td className="py-1 text-slate-900 align-top pl-1">{currentStudent?.address || '-'}</td>
                    </tr>
                    <tr className="py-1">
                      <td className="py-1 font-semibold text-slate-600 align-top">9.</td>
                      <td className="py-1 font-semibold text-slate-700 align-top">Nomor Telepon Rumah</td>
                      <td className="py-1 font-bold text-slate-800 text-center align-top">:</td>
                      <td className="py-1 font-mono text-slate-900 align-top pl-1">{currentStudent?.homePhone || currentStudent?.parentPhone || '-'}</td>
                    </tr>
                    <tr className="py-1">
                      <td className="py-1 font-semibold text-slate-600 align-top">10.</td>
                      <td className="py-1 font-semibold text-slate-700 align-top">Sekolah Asal</td>
                      <td className="py-1 font-bold text-slate-800 text-center align-top">:</td>
                      <td className="py-1 text-slate-900 align-top pl-1">{currentStudent?.previousSchool || 'SD / Sederajat'}</td>
                    </tr>
                    <tr className="py-1">
                      <td className="py-1 font-semibold text-slate-600 align-top">11.</td>
                      <td className="py-1 font-semibold text-slate-700 align-top">Diterima di sekolah ini</td>
                      <td className="py-1"></td>
                      <td className="py-1"></td>
                    </tr>
                    <tr className="py-1">
                      <td className="py-1"></td>
                      <td className="py-1 pl-4 text-slate-600 align-top">Di kelas</td>
                      <td className="py-1 font-bold text-slate-800 text-center align-top">:</td>
                      <td className="py-1 text-slate-900 align-top pl-1">{currentStudent?.acceptedClass || classroom?.gradeLevel || 'VII'}</td>
                    </tr>
                    <tr className="py-1">
                      <td className="py-1"></td>
                      <td className="py-1 pl-4 text-slate-600 align-top">Pada tanggal</td>
                      <td className="py-1 font-bold text-slate-800 text-center align-top">:</td>
                      <td className="py-1 text-slate-900 align-top pl-1">{currentStudent?.acceptedDate || '15 Juli 2024'}</td>
                    </tr>
                    <tr className="py-1">
                      <td className="py-1 font-semibold text-slate-600 align-top">12.</td>
                      <td className="py-1 font-semibold text-slate-700 align-top">Nama Orang Tua</td>
                      <td className="py-1"></td>
                      <td className="py-1"></td>
                    </tr>
                    <tr className="py-1">
                      <td className="py-1"></td>
                      <td className="py-1 pl-4 text-slate-600 align-top">a. Ayah</td>
                      <td className="py-1 font-bold text-slate-800 text-center align-top">:</td>
                      <td className="py-1 font-bold text-slate-950 align-top pl-1">{currentStudent?.fatherName || '-'}</td>
                    </tr>
                    <tr className="py-1">
                      <td className="py-1"></td>
                      <td className="py-1 pl-4 text-slate-600 align-top">b. Ibu</td>
                      <td className="py-1 font-bold text-slate-800 text-center align-top">:</td>
                      <td className="py-1 font-bold text-slate-950 align-top pl-1">{currentStudent?.motherName || '-'}</td>
                    </tr>
                    <tr className="py-1">
                      <td className="py-1 font-semibold text-slate-600 align-top">13.</td>
                      <td className="py-1 font-semibold text-slate-700 align-top">Alamat Orang Tua</td>
                      <td className="py-1 font-bold text-slate-800 text-center align-top">:</td>
                      <td className="py-1 text-slate-900 align-top pl-1">{currentStudent?.parentAddress || currentStudent?.address || '-'}</td>
                    </tr>
                    <tr className="py-1">
                      <td className="py-1 font-semibold text-slate-600 align-top">14.</td>
                      <td className="py-1 font-semibold text-slate-700 align-top">Nomor Telepon Rumah</td>
                      <td className="py-1 font-bold text-slate-800 text-center align-top">:</td>
                      <td className="py-1 font-mono text-slate-900 align-top pl-1">{currentStudent?.parentPhone || currentStudent?.homePhone || '-'}</td>
                    </tr>
                    <tr className="py-1">
                      <td className="py-1 font-semibold text-slate-600 align-top">15.</td>
                      <td className="py-1 font-semibold text-slate-700 align-top">Pekerjaan Orang Tua</td>
                      <td className="py-1"></td>
                      <td className="py-1"></td>
                    </tr>
                    <tr className="py-1">
                      <td className="py-1"></td>
                      <td className="py-1 pl-4 text-slate-600 align-top">a. Ayah</td>
                      <td className="py-1 font-bold text-slate-800 text-center align-top">:</td>
                      <td className="py-1 text-slate-900 align-top pl-1">{currentStudent?.fatherJob || '-'}</td>
                    </tr>
                    <tr className="py-1">
                      <td className="py-1"></td>
                      <td className="py-1 pl-4 text-slate-600 align-top">b. Ibu</td>
                      <td className="py-1 font-bold text-slate-800 text-center align-top">:</td>
                      <td className="py-1 text-slate-900 align-top pl-1">{currentStudent?.motherJob || '-'}</td>
                    </tr>
                    <tr className="py-1">
                      <td className="py-1 font-semibold text-slate-600 align-top">16.</td>
                      <td className="py-1 font-semibold text-slate-700 align-top">Nama Wali Peserta Didik</td>
                      <td className="py-1 font-bold text-slate-800 text-center align-top">:</td>
                      <td className="py-1 text-slate-900 align-top pl-1">{currentStudent?.guardianName || '-'}</td>
                    </tr>
                    <tr className="py-1">
                      <td className="py-1"></td>
                      <td className="py-1 pl-4 text-slate-600 align-top">Alamat Wali Peserta Didik</td>
                      <td className="py-1 font-bold text-slate-800 text-center align-top">:</td>
                      <td className="py-1 text-slate-900 align-top pl-1">{currentStudent?.guardianAddress || '-'}</td>
                    </tr>
                    <tr className="py-1">
                      <td className="py-1"></td>
                      <td className="py-1 pl-4 text-slate-600 align-top">Nomor Telepon Rumah</td>
                      <td className="py-1 font-bold text-slate-800 text-center align-top">:</td>
                      <td className="py-1 font-mono text-slate-900 align-top pl-1">{currentStudent?.guardianPhone || '-'}</td>
                    </tr>
                    <tr className="py-1">
                      <td className="py-1"></td>
                      <td className="py-1 pl-4 text-slate-600 align-top">Pekerjaan Wali Peserta Didik</td>
                      <td className="py-1 font-bold text-slate-800 text-center align-top">:</td>
                      <td className="py-1 text-slate-900 align-top pl-1">{currentStudent?.guardianJob || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bagian Bawah: Foto & Pengesahan Kepala Sekolah */}
            <div className="pt-6 flex justify-between items-end border-t border-slate-100">
              <div className="flex items-center pl-24 sm:pl-36">
                {/* Kotak Pas Foto 3x4 diposisikan di dekat area tanda tangan (posisi cap sebelumnya) */}
                <div className="w-24 h-32 border-2 border-slate-400 rounded-md flex flex-col items-center justify-center text-slate-500 text-[10px] bg-slate-50 shadow-xs">
                  {currentStudent?.photoUrl ? (
                    <img
                      src={currentStudent.photoUrl}
                      alt={currentStudent.name}
                      className="w-full h-full object-cover rounded-sm"
                    />
                  ) : (
                    <>
                      <span>Pas Foto</span>
                      <span className="font-bold">3 x 4 cm</span>
                    </>
                  )}
                </div>
              </div>

              {/* Tanda Tangan Kepala Sekolah */}
              <div className="text-center w-64 space-y-1">
                <p className="text-slate-700">
                  {school.reportPlace.toUpperCase()}, {school.reportDate}
                </p>
                <p className="font-semibold text-slate-800">Kepala Sekolah,</p>
                <div className="h-20 flex items-end justify-center pb-1">
                  {/* Space for wet signature */}
                </div>
                <p className="font-bold border-b border-slate-900 inline-block px-4 text-slate-900">
                  {school.headmasterName}
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  NIP. {school.headmasterNip}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* HALAMAN 4+: ISI RAPOR NILAI HASIL BELAJAR */}
        {/* ========================================================= */}
        {(activePreviewPage === 'grades' || activePreviewPage === 'all') && (
          <div className="w-full max-w-4xl bg-white text-slate-900 border border-slate-300 shadow-lg rounded-2xl p-8 sm:p-12 print:p-0 print:border-none print:shadow-none space-y-6 text-xs relative">
            {/* KOP SEKOLAH RESMI */}
            <div className="text-center space-y-1 relative pb-3 border-b-2 border-slate-900">
              <div className="flex items-center justify-center gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center border border-slate-300 text-blue-900 font-black text-xl">
                  SMP
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800">
                    PEMERINTAH KABUPATEN KEPULAUAN MERANTI
                  </h3>
                  <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800">
                    DINAS PENDIDIKAN DAN KEBUDAYAAN
                  </h4>
                  <h2 className="text-base sm:text-lg font-black uppercase text-slate-950 tracking-tight">
                    {school.name}
                  </h2>
                  <p className="text-[10px] text-slate-600">
                    {school.address}, Kec. {school.kecamatan}, Kab. {school.kabupaten}, Prov. {school.provinsi} &bull; Kode Pos: {school.postalCode}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    NPSN: {school.npsn} &bull; Email: {school.email} &bull; Website: {school.website}
                  </p>
                </div>
              </div>
              {/* Double divider line */}
              <div className="pt-2">
                <div className="border-t border-slate-900 mb-0.5"></div>
                <div className="border-t-2 border-slate-900"></div>
              </div>
            </div>

            {/* JUDUL RAPOR */}
            <div className="text-center space-y-0.5">
              <h1 className="text-sm sm:text-base font-black tracking-wide uppercase">
                LAPORAN HASIL BELAJAR PESERTA DIDIK (RAPOR)
              </h1>
              <p className="text-xs font-semibold text-slate-700">
                KURIKULUM MERDEKA &bull; TAHUN PELAJARAN {academicYear}
              </p>
            </div>

            {/* IDENTITAS SISWA GRID DENGAN NAMA ORANG TUA */}
            <table className="w-full text-xs border border-slate-300 rounded-lg bg-slate-50/50 mb-4">
              <tbody>
                <tr>
                  <td className="py-1.5 px-3 text-slate-600 w-36">Nama Peserta Didik</td>
                  <td className="py-1.5 px-1 text-center font-bold">:</td>
                  <td className="py-1.5 px-2 font-bold text-slate-900">{currentStudent?.name}</td>
                  <td className="py-1.5 px-3 text-slate-600 w-32">Kelas</td>
                  <td className="py-1.5 px-1 text-center font-bold">:</td>
                  <td className="py-1.5 px-2 font-bold text-slate-900">{classroom?.name}</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 text-slate-600">NIS / NISN</td>
                  <td className="py-1.5 px-1 text-center font-bold">:</td>
                  <td className="py-1.5 px-2 font-mono text-slate-800">{currentStudent?.nis || '-'} / {currentStudent?.nisn || '-'}</td>
                  <td className="py-1.5 px-3 text-slate-600">Fase</td>
                  <td className="py-1.5 px-1 text-center font-bold">:</td>
                  <td className="py-1.5 px-2 text-slate-800">Fase D (SMP)</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 text-slate-600">Nama Sekolah</td>
                  <td className="py-1.5 px-1 text-center font-bold">:</td>
                  <td className="py-1.5 px-2 font-semibold text-slate-800">{school.name}</td>
                  <td className="py-1.5 px-3 text-slate-600">Semester</td>
                  <td className="py-1.5 px-1 text-center font-bold">:</td>
                  <td className="py-1.5 px-2 text-slate-800">{semester}</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 text-slate-600">Alamat Sekolah</td>
                  <td className="py-1.5 px-1 text-center font-bold">:</td>
                  <td className="py-1.5 px-2 text-slate-800">{school.address}</td>
                  <td className="py-1.5 px-3 text-slate-600">Tahun Pelajaran</td>
                  <td className="py-1.5 px-1 text-center font-bold">:</td>
                  <td className="py-1.5 px-2 text-slate-800">{academicYear}</td>
                </tr>
              </tbody>
            </table>

            {/* TABEL NILAI AKADEMIK & CAPAIAN KOMPETENSI */}
            <div className="space-y-2">
              <h3 className="font-bold text-xs uppercase text-slate-900 tracking-wider">
                A. Nilai Hasil Belajar & Capaian Kompetensi
              </h3>
              <table className="w-full text-xs text-left border-collapse border border-slate-400">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-400 text-center">
                    <th className="px-2 py-2 border-r border-slate-400 w-10">No</th>
                    <th className="px-3 py-2 border-r border-slate-400 text-left">Mata Pelajaran</th>
                    <th className="px-2 py-2 border-r border-slate-400 w-16">Nilai Akhir</th>
                    <th className="px-3 py-2 text-left">Capaian Kompetensi Pembelajaran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {sortedSubjects.map((sub, idx) => {
                    const sc = scoreLookup.get(sub.id);
                    const finalVal = sc?.finalScore !== undefined ? sc.finalScore : '-';
                    const highest = sc?.highestCompetenceDesc;
                    const lowest = sc?.lowestCompetenceDesc;

                    return (
                      <tr key={sub.id} className="align-top">
                        <td className="px-2 py-2 text-center font-medium border-r border-slate-300">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2 font-bold text-slate-900 border-r border-slate-300">
                          {sub.name}
                        </td>
                        <td className="px-2 py-2 text-center font-black text-sm border-r border-slate-300">
                          {finalVal}
                        </td>
                        <td className="px-3 py-2 text-slate-800 leading-relaxed text-[11px] space-y-1">
                          {sc ? (
                            <>
                              {highest && <div>{highest}</div>}
                              {lowest && <div>{lowest}</div>}
                            </>
                          ) : (
                            <span className="text-slate-400 italic">Nilai belum diinput oleh guru pengampu.</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* PAGE BREAK UNTUK HALAMAN 2 */}
            <div className="print:page-break-before-always pt-8 border-t-2 border-dashed border-slate-300 mt-8">
              <div className="text-center text-[10px] text-slate-400 pb-4 print:hidden font-semibold uppercase tracking-widest">
                &mdash; Batas Halaman 1 / Lanjut ke Halaman 2 &mdash;
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ekskul */}
              <div className="space-y-1.5">
                <h3 className="font-bold text-xs uppercase text-slate-900 tracking-wider">
                  B. Kegiatan Ekstrakurikuler
                </h3>
                <table className="w-full text-xs text-left border-collapse border border-slate-400">
                  <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-400">
                    <tr>
                      <th className="px-2 py-1.5 border-r border-slate-400 text-center w-8">No</th>
                      <th className="px-2 py-1.5 border-r border-slate-400">Kegiatan</th>
                      <th className="px-2 py-1.5 border-r border-slate-400 text-center w-16">Predikat</th>
                      <th className="px-2 py-1.5">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {studentEkskuls.length > 0 ? (
                      studentEkskuls.map((se, i) => (
                        <tr key={se.id}>
                          <td className="px-2 py-1.5 text-center border-r border-slate-300">{i + 1}</td>
                          <td className="px-2 py-1.5 font-semibold border-r border-slate-300">
                            {ekskulMap.get(se.extracurricularId) || 'Ekstrakurikuler'}
                          </td>
                          <td className="px-2 py-1.5 text-center font-bold border-r border-slate-300">
                            {se.predicate}
                          </td>
                          <td className="px-2 py-1.5 text-slate-600 text-[11px]">{se.description}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-2 py-1.5 text-center border-r border-slate-300">1</td>
                        <td className="px-2 py-1.5 font-semibold border-r border-slate-300">Pramuka Gudep SMPN 1 Rangsang</td>
                        <td className="px-2 py-1.5 text-center font-bold border-r border-slate-300">Baik</td>
                        <td className="px-2 py-1.5 text-slate-600 text-[11px]">Aktif mengikuti latihan kepramukaan rutin.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Absensi */}
              <div className="space-y-1.5">
                <h3 className="font-bold text-xs uppercase text-slate-900 tracking-wider">
                  C. Ketidakhadiran
                </h3>
                <table className="w-full text-xs text-left border-collapse border border-slate-400">
                  <tbody className="divide-y divide-slate-300">
                    <tr>
                      <td className="px-3 py-1.5 font-semibold border-r border-slate-300">Sakit</td>
                      <td className="px-3 py-1.5 text-center font-bold w-24">
                        {studentAtt?.sakit ?? 0} hari
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1.5 font-semibold border-r border-slate-300">Izin</td>
                      <td className="px-3 py-1.5 text-center font-bold w-24">
                        {studentAtt?.izin ?? 0} hari
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1.5 font-semibold border-r border-slate-300">Tanpa Keterangan</td>
                      <td className="px-3 py-1.5 text-center font-bold w-24">
                        {studentAtt?.alpa ?? 0} hari
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Catatan Wali Kelas */}
            <div className="space-y-1.5">
              <h3 className="font-bold text-xs uppercase text-slate-900 tracking-wider">
                D. Catatan Wali Kelas
              </h3>
              <div className="border border-slate-400 p-3 rounded text-xs bg-slate-50/50 leading-relaxed text-slate-800">
                {studentNote?.growthNote
                  ? `${studentNote.growthNote} ${studentNote.suggestions || ''}`
                  : 'Pertahankan prestasi belajar, tingkatkan kehadiran, dan terus kembangkan bakat positif di sekolah.'}
              </div>
            </div>

            {/* Keputusan Kenaikan Kelas jika Semester Genap */}
            {semester === 'Genap' && (
              <div className="space-y-1.5">
                <h3 className="font-bold text-xs uppercase text-slate-900 tracking-wider">
                  E. Keputusan Kenaikan Kelas / Kelulusan
                </h3>
                <div className="border-2 border-slate-800 p-3 rounded text-xs font-bold bg-slate-50 text-slate-900">
                  Berdasarkan pencapaian seluruh tujuan pembelajaran, peserta didik ditetapkan:{' '}
                  <span className="text-emerald-700 uppercase">
                    {studentNote?.promotionDecision || 'NAIK KE KELAS BERIKUTNYA'}
                  </span>
                </div>
              </div>
            )}

            {/* TANDA TANGAN RESMI PENGESAHAN */}
            <div className="pt-6 space-y-8">
              <div className="flex justify-between items-start text-xs">
                <div className="text-center w-64">
                  <p className="invisible">Tanggal</p>
                  <p className="font-semibold">Orang Tua / Wali Siswa,</p>
                  <div className="h-16 flex items-end justify-center pb-1"></div>
                  <p className="font-bold border-b border-slate-900 inline-block px-4">
                    ( {parentSignName} )
                  </p>
                </div>

                <div className="text-center w-64">
                  <p>{school.reportPlace}, {school.reportDate}</p>
                  <p className="font-semibold">Wali Kelas,</p>
                  <div className="h-16 flex items-end justify-center pb-1"></div>
                  <p className="font-bold border-b border-slate-900 inline-block px-4">
                    {homeroomTeacher?.name || 'Wali Kelas'}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    NIP. {homeroomTeacher?.nip || '-'}
                  </p>
                </div>
              </div>

              {/* Kepala Sekolah Center Signature */}
              <div className="text-center pt-2">
                <p>Mengetahui,</p>
                <p className="font-semibold">Kepala Sekolah SMP Negeri 1 Rangsang</p>
                <div className="h-16 flex items-end justify-center pb-1"></div>
                <p className="font-bold border-b border-slate-900 inline-block px-8 text-sm">
                  {school.headmasterName}
                </p>
                <p className="text-[11px] text-slate-700 mt-0.5 font-medium">
                  NIP. {school.headmasterNip}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Batch Export Modal (Cetak Seluruh Siswa Dalam Kelas) */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Users className="w-5 h-5 text-emerald-600" />
                Cetak Rapor Rombel: {classroom.name}
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] bg-blue-100 text-blue-800 font-bold">
                {classStudents.length} Siswa
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Sistem akan memproses dan menyusun seluruh lembar rapor peserta didik kelas{' '}
              <strong>{classroom.name}</strong> secara berurutan dalam satu berkas PDF resmi berkualitas tinggi.
            </p>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 block">Pilihan Format Dokumen:</label>

              <label
                onClick={() => setBatchMode('complete')}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  batchMode === 'complete'
                    ? 'border-blue-600 bg-blue-50/60 text-blue-900'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="batchMode"
                  checked={batchMode === 'complete'}
                  onChange={() => setBatchMode('complete')}
                  className="mt-1"
                />
                <div className="text-xs">
                  <p className="font-bold">A. Rapor Lengkap Resmi (Direkomendasikan)</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Mencakup Sampul Rapor, Identitas Sekolah, Keterangan Diri Siswa, dan Lembar Nilai Hasil Belajar lengkap untuk setiap siswa.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setBatchMode('gradesOnly')}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  batchMode === 'gradesOnly'
                    ? 'border-blue-600 bg-blue-50/60 text-blue-900'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="batchMode"
                  checked={batchMode === 'gradesOnly'}
                  onChange={() => setBatchMode('gradesOnly')}
                  className="mt-1"
                />
                <div className="text-xs">
                  <p className="font-bold">B. Isi Nilai Hasil Belajar Saja</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Hanya mencetak tabel nilai akademik, ekskul, ketidakhadiran, catatan wali kelas, dan tanda tangan pengesahan.
                  </p>
                </div>
              </label>
            </div>

            {isGeneratingBatch && batchProgress && (
              <div className="space-y-2 pt-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                    Menyusun PDF Rapor...
                  </span>
                  <span>
                    {batchProgress.current} / {batchProgress.total} Siswa
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  Memproses: <strong>{batchProgress.name}</strong>
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isGeneratingBatch}
                onClick={() => setIsBatchModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Tutup
              </button>
              <button
                type="button"
                disabled={isGeneratingBatch}
                onClick={handleStartBatchPrint}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs disabled:opacity-50 transition"
              >
                {isGeneratingBatch ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sedang Mengunduh...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Mulai Unduh PDF 1 Kelas
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
