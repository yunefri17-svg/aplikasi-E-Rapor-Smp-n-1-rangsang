import React from 'react';
import {
  SchoolProfile,
  Student,
  Teacher,
  Classroom,
  Subject,
  AssessmentScore,
  User
} from '../types/erapor';
import {
  Users,
  GraduationCap,
  BookOpen,
  School,
  CheckCircle2,
  Clock,
  TrendingUp,
  FileSpreadsheet,
  Printer,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Settings
} from 'lucide-react';
import { MenuId } from '../components/layout/Sidebar';
import { sortClassrooms } from '../utils/classroomSort';

interface DashboardViewProps {
  school: SchoolProfile;
  students: Student[];
  teachers: Teacher[];
  classrooms: Classroom[];
  subjects: Subject[];
  scores: AssessmentScore[];
  currentUser: User;
  onNavigate: (menu: MenuId) => void;
  onOpenQuickSettings: () => void;
  cloudSyncState?: {
    status: 'connected' | 'syncing' | 'synced' | 'offline' | 'error' | 'quota_exceeded';
    lastSyncTime: string | null;
    message: string;
    isOnline: boolean;
    quotaExceeded?: boolean;
  };
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  school,
  students,
  teachers,
  classrooms,
  subjects,
  scores,
  currentUser,
  onNavigate,
  onOpenQuickSettings,
  cloudSyncState
}) => {
  const isWaliKelas = currentUser.role === 'walikelas';
  const userClass = classrooms.find((c) => c.id === currentUser.classId);

  // If Wali Kelas, strictly filter students and scores to only their class
  const classStudents = isWaliKelas
    ? students.filter((s) => s.classId === currentUser.classId)
    : students;

  // Counts & stats
  const totalStudents = classStudents.length;
  const maleStudents = classStudents.filter((s) => s.gender === 'L').length;
  const femaleStudents = classStudents.filter((s) => s.gender === 'P').length;
  const totalTeachers = teachers.length;
  const totalClasses = classrooms.length;
  const totalSubjects = subjects.length;

  // Calculate grading completion
  const expectedScores = Math.max(1, totalStudents * totalSubjects);
  const currentScoresCount = isWaliKelas
    ? scores.filter(
        (sc) =>
          sc.classId === currentUser.classId &&
          sc.academicYear === school.activeAcademicYear &&
          sc.semester === school.activeSemester
      ).length
    : scores.filter(
        (sc) => sc.academicYear === school.activeAcademicYear && sc.semester === school.activeSemester
      ).length;
  const gradeCompletionPercent = Math.min(100, Math.round((currentScoresCount / expectedScores) * 100));

  // Report completion (students who have at least 70% subjects graded)
  const studentsWithGrades = classStudents.filter((std) => {
    const stdScores = scores.filter(
      (sc) =>
        sc.studentId === std.id &&
        sc.academicYear === school.activeAcademicYear &&
        sc.semester === school.activeSemester
    );
    return stdScores.length >= Math.floor(subjects.length * 0.7);
  }).length;
  const reportCompletionPercent = Math.min(100, Math.round((studentsWithGrades / Math.max(1, totalStudents)) * 100));

  if (isWaliKelas) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Dedicated Wali Kelas Identity Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-800 to-blue-900 text-white p-6 md:p-8 shadow-md">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-blue-500/30 text-blue-100 text-xs font-semibold backdrop-blur-xs border border-blue-400/30">
                  E-RAPOR SMP NEGERI 1 RANGSANG
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-200 text-xs font-bold border border-emerald-400/40 uppercase tracking-wide">
                  KELAS YANG DIKELOLA: {userClass ? userClass.name : 'Belum Ditugaskan'}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
                Selamat Datang, {currentUser.name}
              </h1>
              <p className="text-blue-100 text-sm leading-relaxed">
                Anda masuk sebagai <strong className="text-white">Wali {userClass?.name || 'Kelas'}</strong> &bull; Tahun Pelajaran{' '}
                <strong className="text-white">{school.activeAcademicYear}</strong> Semester{' '}
                <strong className="text-white">{school.activeSemester}</strong>.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => onNavigate('input-nilai')}
                className="px-4 py-2.5 rounded-xl bg-white text-blue-800 font-bold text-xs hover:bg-blue-50 transition shadow-sm flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-blue-700" />
                Input Nilai Kelas
              </button>
              <button
                onClick={() => onNavigate('cetak-rapor')}
                className="px-4 py-2.5 rounded-xl bg-blue-600/60 hover:bg-blue-600 border border-blue-400/40 text-white font-bold text-xs transition flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Cetak Rapor {userClass?.name}
              </button>
            </div>
          </div>
        </div>

        {/* Wali Kelas Statistics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Siswa {userClass?.name}</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{totalStudents}</p>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] font-medium text-slate-600">
                <span className="text-blue-600 font-semibold">L: {maleStudents}</span>
                <span className="text-pink-600 font-semibold">P: {femaleStudents}</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <GraduationCap className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Progres Nilai Siswa</p>
              <p className="text-2xl font-black text-blue-700 mt-1">{gradeCompletionPercent}%</p>
              <p className="text-[11px] text-slate-500 mt-1">{currentScoresCount} nilai masuk</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Kesiapan Rapor</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">{reportCompletionPercent}%</p>
              <p className="text-[11px] text-slate-500 mt-1">{studentsWithGrades} dari {totalStudents} siap</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Tingkat / Fase</p>
              <p className="text-lg font-black text-purple-700 mt-1">{userClass?.gradeLevel ? `Kelas ${userClass.gradeLevel === '7' ? 'VII' : userClass.gradeLevel === '8' ? 'VIII' : 'IX'}` : '-'}</p>
              <p className="text-[11px] text-purple-600 font-medium mt-1">Fase D SMP</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Student list for this class */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Daftar Peserta Didik Binaan — {userClass?.name}
              </h2>
              <p className="text-xs text-slate-500">
                Akses eksklusif Anda sebagai Wali Kelas. Data kelas lain dilindungi dan tidak dapat diakses.
              </p>
            </div>
            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              Otorisasi Kelas Terverifikasi
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">No</th>
                  <th className="px-4 py-3">NIS / NISN</th>
                  <th className="px-4 py-3">Nama Lengkap Siswa</th>
                  <th className="px-4 py-3 text-center">L/P</th>
                  <th className="px-4 py-3">Agama</th>
                  <th className="px-4 py-3 text-center">Status Data</th>
                  <th className="px-4 py-3 text-right">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classStudents.map((std, idx) => (
                  <tr key={std.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {std.nis} / {std.nisn}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">{std.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        std.gender === 'L' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                      }`}>
                        {std.gender}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{std.religion}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Aktif
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => onNavigate('input-nilai')}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-[11px] hover:underline"
                      >
                        Input Nilai
                      </button>
                      <button
                        onClick={() => onNavigate('pengolahan-rapor')}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold text-[11px] hover:underline"
                      >
                        Catatan Wali
                      </button>
                      <button
                        onClick={() => onNavigate('cetak-rapor')}
                        className="text-emerald-600 hover:text-emerald-800 font-semibold text-[11px] hover:underline"
                      >
                        Rapor
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  const isLocalOnly = cloudSyncState?.status === 'quota_exceeded' || cloudSyncState?.status === 'offline';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Sync Status Banner (Only visible if issues or offline) */}
      {isLocalOnly && (
        <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500 ${
          cloudSyncState?.status === 'quota_exceeded' ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl shadow-sm ${
              cloudSyncState?.status === 'quota_exceeded' ? 'bg-white text-amber-600' : 'bg-white text-rose-600'
            }`}>
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className={`font-bold text-sm ${
                cloudSyncState?.status === 'quota_exceeded' ? 'text-amber-900' : 'text-rose-900'
              }`}>
                {cloudSyncState?.status === 'quota_exceeded' ? 'Mode Penyimpanan Lokal (Quota Terlampaui)' : 'Koneksi Terputus'}
              </h3>
              <p className={`text-xs mt-1 leading-relaxed max-w-2xl ${
                cloudSyncState?.status === 'quota_exceeded' ? 'text-amber-800/80' : 'text-rose-800/80'
              }`}>
                {cloudSyncState?.status === 'quota_exceeded' 
                  ? 'Batas harian Cloud tercapai. Data Anda tetap tersimpan AMAN di browser ini, tetapi perubahan tidak akan muncul di HP/Laptop lain secara otomatis sampai besok. Gunakan fitur Ekspor JSON untuk memindahkan data antar perangkat jika mendesak.'
                  : 'Sistem tidak dapat terhubung ke server Cloud. Pastikan koneksi internet stabil agar data dapat disinkronkan ke HP/Laptop lain.'}
              </p>
              <div className="mt-3 flex gap-2">
                <button 
                  onClick={() => onNavigate('pengaturan-aplikasi')}
                  className="px-3 py-1.5 rounded-lg bg-white/50 hover:bg-white text-[11px] font-bold text-slate-800 border border-slate-200 transition flex items-center gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Pengaturan Sinkronisasi
                </button>
                <button 
                  onClick={() => onNavigate('dashboard')} // Triggers re-render and check
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold shadow-sm hover:bg-blue-700 transition"
                >
                  Coba Hubungkan Kembali
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Penyimpanan: LOKAL</span>
             <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
          </div>
        </div>
      )}

      {/* Sync Success / Real-time Status (Only if connected) */}
      {!isLocalOnly && (
        <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-emerald-800">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold flex items-center gap-1.5 uppercase tracking-wide">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Real-time Sync Aktif
            </span>
            <span className="text-[10px] text-emerald-600 font-medium">
              Data akan otomatis muncul di HP & Laptop lain tanpa perlu muat ulang.
            </span>
          </div>
          <div className="text-[10px] text-emerald-500 font-mono italic">
            {cloudSyncState?.lastSyncTime ? `Terakhir sinkron: ${cloudSyncState.lastSyncTime}` : 'Terhubung ke Cloud'}
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-6 md:p-8 shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/30 text-blue-100 text-xs font-semibold backdrop-blur-xs border border-blue-400/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Sistem Informasi Penilaian Resmi Kemendikbud
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
              Selamat Datang di E-Rapor {school.name}
            </h1>
            <p className="text-blue-100 text-sm leading-relaxed">
              Tahun Pelajaran <strong className="text-white">{school.activeAcademicYear}</strong> Semester{' '}
              <strong className="text-white">{school.activeSemester}</strong> &bull; Kabupaten {school.kabupaten}, Provinsi {school.provinsi}.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => onNavigate('input-nilai')}
              className="px-4 py-2.5 rounded-xl bg-white text-blue-800 font-bold text-xs hover:bg-blue-50 transition shadow-sm flex items-center justify-center gap-2"

            >
              <FileSpreadsheet className="w-4 h-4 text-blue-700" />
              Input Nilai Siswa
            </button>
            <button
              onClick={() => onNavigate('cetak-rapor')}
              className="px-4 py-2.5 rounded-xl bg-blue-600/60 hover:bg-blue-600 border border-blue-400/40 text-white font-bold text-xs transition flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Cetak Rapor
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Primary Statistics Cards (Section 3 Requirement) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Siswa */}
        <div className="col-span-2 sm:col-span-1 lg:col-span-2 bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Jumlah Seluruh Siswa</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{totalStudents}</p>
            <div className="flex items-center gap-3 mt-1.5 text-[11px] font-medium text-slate-600">
              <span className="flex items-center gap-1 text-blue-600">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                L: {maleStudents}
              </span>
              <span className="flex items-center gap-1 text-pink-600">
                <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                P: {femaleStudents}
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        {/* Guru */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Jumlah Guru</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{totalTeachers}</p>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">PNS, PPPK & Honor</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Rombel */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Rombel</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{totalClasses}</p>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">VII.1 - IX.3 (9 Rombel)</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <School className="w-5 h-5" />
          </div>
        </div>

        {/* Mata Pelajaran */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Mata Pelajaran</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{totalSubjects}</p>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">Nasional & Mulok</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        {/* Kurikulum */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Kurikulum</p>
            <p className="text-sm font-black text-slate-800 mt-1 truncate">Kur. Merdeka</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">Fase D SMP</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Progress & Status Section (Section 3 Requirement) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Pengisian Nilai & Rapor */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Status Pengisian Nilai & Kesiapan Rapor
              </h2>
              <p className="text-xs text-slate-500">
                Pantauan realtime progres entri penilaian guru untuk Semester {school.activeSemester}
              </p>
            </div>
            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
              TP {school.activeAcademicYear}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Box 1: Pengisian Nilai */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  Status Pengisian Nilai
                </span>
                <span className="text-xs font-black text-blue-700">{gradeCompletionPercent}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${gradeCompletionPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                {currentScoresCount} nilai tercatat dari estimasi total {expectedScores} komponen mapel.
              </p>
            </div>

            {/* Box 2: Pengisian Rapor Siswa */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-emerald-600" />
                  Status Kesiapan Rapor
                </span>
                <span className="text-xs font-black text-emerald-700">{reportCompletionPercent}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${reportCompletionPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                {studentsWithGrades} dari {totalStudents} siswa siap cetak rapor.
              </p>
            </div>
          </div>

          {/* Kurikulum Merdeka 2025 Quick Access */}
          <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
            <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Sistem Asesmen Kurikulum Merdeka 2025
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => onNavigate('kktp-config')}
                className="p-3 bg-white rounded-xl border border-indigo-200 hover:border-indigo-400 hover:shadow-sm transition text-left"
              >
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Pengaturan</div>
                <div className="text-xs font-bold text-indigo-700">Set KKTP</div>
              </button>
              <button
                onClick={() => onNavigate('asesmen-formatif')}
                className="p-3 bg-white rounded-xl border border-indigo-200 hover:border-indigo-400 hover:shadow-sm transition text-left"
              >
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Proses</div>
                <div className="text-xs font-bold text-emerald-700">Asesmen Formatif</div>
              </button>
              <button
                onClick={() => onNavigate('asesmen-sumatif')}
                className="p-3 bg-white rounded-xl border border-indigo-200 hover:border-indigo-400 hover:shadow-sm transition text-left"
              >
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Hasil Belajar</div>
                <div className="text-xs font-bold text-amber-700">Asesmen Sumatif</div>
              </button>
              <button
                onClick={() => onNavigate('pengolahan-nilai-akhir')}
                className="p-3 bg-white rounded-xl border border-indigo-200 hover:border-indigo-400 hover:shadow-sm transition text-left"
              >
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Sinkronisasi</div>
                <div className="text-xs font-bold text-indigo-700">Posting Rapor</div>
              </button>
            </div>
          </div>

          {/* Rombel Overview Table */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Perkembangan Nilai Per Rombongan Belajar
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Rombel</th>
                    <th className="px-4 py-2.5">Tingkat</th>
                    <th className="px-4 py-2.5">Wali Kelas</th>
                    <th className="px-4 py-2.5 text-center">Jml Siswa</th>
                    <th className="px-4 py-2.5">Status Nilai</th>
                    <th className="px-4 py-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortClassrooms(classrooms).map((cls) => {
                    const classStudents = students.filter((s) => s.classId === cls.id);
                    const teacher = teachers.find((t) => t.id === cls.homeroomTeacherId);
                    const classScores = scores.filter((sc) => sc.classId === cls.id);
                    const hasScores = classScores.length > 0;

                    return (
                      <tr key={cls.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-2.5 font-bold text-slate-800">{cls.name}</td>
                        <td className="px-4 py-2.5 text-slate-600">
                          Kelas {cls.gradeLevel === '7' ? 'VII' : cls.gradeLevel === '8' ? 'VIII' : 'IX'}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 font-medium">
                          {teacher?.name || 'Belum ditentukan'}
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold text-slate-800">
                          {classStudents.length}
                        </td>
                        <td className="px-4 py-2.5">
                          {hasScores ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Sedang Berjalan
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              Menunggu Entri
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => onNavigate('leger-nilai')}
                            className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 hover:underline text-[11px]"
                          >
                            Lihat Leger <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Info & School Profile Box */}
        <div className="space-y-6">
          {/* School Profile Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <School className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">{school.name}</h3>
                <p className="text-[11px] text-slate-500">NPSN: {school.npsn}</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Kepala Sekolah</span>
                <span className="font-semibold text-slate-800">{school.headmasterName}</span>
                <span className="block text-[11px] text-slate-500">NIP. {school.headmasterNip}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Alamat Satuan Pendidikan</span>
                <span className="text-slate-700">{school.address}, Kec. {school.kecamatan}, Kab. {school.kabupaten}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Tanggal Cetak Rapor</span>
                <span className="font-medium text-slate-800">{school.reportPlace}, {school.reportDate}</span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('data-sekolah')}
              className="w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
            >
              Ubah Data Profil Sekolah
            </button>
          </div>

          {/* Quick Menu Shortcuts */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Akses Cepat Pengolahan
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => onNavigate('input-nilai')}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-left transition"
              >
                <FileSpreadsheet className="w-4 h-4 text-blue-600 mb-1" />
                <span className="font-bold text-slate-800 block text-[11px]">Input Nilai</span>
                <span className="text-[10px] text-slate-500">Formatif & SAS</span>
              </button>
              <button
                onClick={() => onNavigate('leger-nilai')}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-left transition"
              >
                <TrendingUp className="w-4 h-4 text-emerald-600 mb-1" />
                <span className="font-bold text-slate-800 block text-[11px]">Leger Nilai</span>
                <span className="text-[10px] text-slate-500">Rekap & Excel</span>
              </button>
              <button
                onClick={() => onNavigate('cetak-rapor')}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-left transition"
              >
                <Printer className="w-4 h-4 text-purple-600 mb-1" />
                <span className="font-bold text-slate-800 block text-[11px]">Cetak Rapor</span>
                <span className="text-[10px] text-slate-500">Format Resmi Kemdikbud</span>
              </button>
              <button
                onClick={() => onNavigate('impor-ekspor')}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-left transition"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-600 mb-1" />
                <span className="font-bold text-slate-800 block text-[11px]">Impor Dapodik</span>
                <span className="text-[10px] text-slate-500">Sinkronisasi Excel</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
