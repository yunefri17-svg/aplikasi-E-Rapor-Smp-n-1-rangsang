import React, { useState } from 'react';
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  School,
  Calendar,
  LogIn,
  BookOpen,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { TutWuriHandayaniLogo } from '../components/common/TutWuriHandayaniLogo';
import { SchoolProfile, User } from '../types/erapor';
import { loginUser, requestPasswordReset } from '../services/authService';

interface LoginViewProps {
  school: SchoolProfile;
  allUsers: User[];
  onLoginSuccess: (user: User, selectedSemester?: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  school,
  allUsers,
  onLoginSuccess
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState('2026/2027 Ganjil');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Modals
  const [activeTab, setActiveTab] = useState<'login' | 'guide' | 'reset'>('login');
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetStatus, setResetStatus] = useState<{ message: string; success: boolean } | null>(null);
  const [isResetLoading, setIsResetLoading] = useState(false);

  const academicOptions = [
    '2026/2027 Ganjil',
    '2025/2026 Genap',
    '2025/2026 Ganjil',
    '2024/2025 Genap',
    '2024/2025 Ganjil',
    '2023/2024 Genap',
    '2023/2024 Ganjil'
  ];

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const result = await loginUser(username, password, allUsers);
      if (result.success && result.user) {
        onLoginSuccess(result.user, selectedSemester);
      } else {
        setErrorMessage(result.error || 'Login gagal. Periksa kembali username dan kata sandi Anda.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat otentikasi. Silakan coba kembali.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetLoading(true);
    setResetStatus(null);
    try {
      const res = await requestPasswordReset(resetIdentifier);
      setResetStatus(res);
    } catch {
      setResetStatus({
        success: false,
        message: 'Gagal mengirim permintaan reset. Hubungi Administrator sekolah secara langsung.'
      });
    } finally {
      setIsResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header Navbar */}
      <header className="bg-blue-700 text-white shadow-md sticky top-0 z-40 border-b border-blue-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Logo & App Title */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 p-1 flex items-center justify-center border border-white/20 shadow-xs">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="font-extrabold text-lg tracking-tight text-white">e-Rapor SMP</span>
              <span className="hidden md:inline-block text-xs text-blue-200 font-medium border-l border-blue-500 pl-2">
                SMP Negeri 1 Rangsang
              </span>
            </div>
          </div>

          {/* Right Header Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-3 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('login')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition ${
                activeTab === 'login'
                  ? 'bg-blue-900 text-white shadow-inner font-bold'
                  : 'text-blue-100 hover:bg-blue-600/70'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Masuk</span>
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition ${
                activeTab === 'guide'
                  ? 'bg-blue-900 text-white shadow-inner font-bold'
                  : 'text-blue-100 hover:bg-blue-600/70'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Panduan Aplikasi</span>
            </button>
            <button
              onClick={() => setActiveTab('reset')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition ${
                activeTab === 'reset'
                  ? 'bg-blue-900 text-white shadow-inner font-bold'
                  : 'text-blue-100 hover:bg-blue-600/70'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Reset Password</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Body Content */}
      <main className="flex-1 flex items-center justify-center p-3 sm:p-6 lg:p-8">
        <div className="max-w-6xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 grid grid-cols-1 lg:grid-cols-12 min-h-[560px]">
          
          {/* LEFT SECTION: Kemendikbud & School Hero Banner */}
          <div className="lg:col-span-7 bg-linear-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
            {/* Background decorative circles & watermark pattern */}
            <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />
            <div className="absolute right-10 top-1/4 w-96 h-96 rounded-full border border-white/10 pointer-events-none" />
            <div className="absolute -left-10 top-10 w-48 h-48 rounded-full bg-blue-500/20 blur-2xl pointer-events-none" />

            {/* Top Official Kemendikdasmen Institution Header */}
            <div className="relative z-10 flex items-start space-x-3.5 pb-4 border-b border-blue-500/40">
              <div className="w-12 h-12 shrink-0 drop-shadow-md">
                <TutWuriHandayaniLogo className="w-12 h-12 text-white" />
              </div>
              <div className="leading-tight">
                <h2 className="text-sm sm:text-base font-bold tracking-tight text-white drop-shadow-xs">
                  Direktorat Sekolah Menengah Pertama
                </h2>
                <p className="text-[11px] sm:text-xs text-blue-100 font-medium">
                  Direktorat Jenderal PAUD, Dikdas dan Dikmen
                </p>
                <p className="text-[10px] sm:text-[11px] text-blue-200 font-normal">
                  Kementerian Pendidikan Dasar dan Menengah
                </p>
              </div>
            </div>

            {/* Middle Centerpiece: Badges + Illustration + App Title */}
            <div className="my-6 relative z-10 flex flex-col items-center text-center space-y-4">
              {/* Badges */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs border border-white/20 text-[10px] sm:text-xs font-bold text-blue-50 tracking-wide uppercase">
                  #Pendidikan Bermutu Untuk Semua
                </span>
                <span className="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-[10px] sm:text-xs font-bold text-amber-200 uppercase">
                  Sekolah Ramah Anak
                </span>
              </div>

              {/* Circular Student Illustration graphic */}
              <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full p-2 bg-linear-to-b from-white/30 to-white/10 shadow-xl border-2 border-white/40 flex items-center justify-center overflow-hidden my-2">
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-sky-400 to-blue-200 flex flex-col items-center justify-center p-3 relative overflow-hidden">
                  {/* Decorative background sun rays */}
                  <div className="absolute inset-0 bg-white/20 rotate-45 transform pointer-events-none" />
                  
                  {/* Stylized SMP Students vector art */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="flex items-end justify-center -space-x-3 mb-1">
                      {/* Student 1 (Male) */}
                      <div className="flex flex-col items-center">
                        <div className="w-9 h-9 rounded-full bg-amber-100 border-2 border-blue-900 flex items-center justify-center shadow-xs overflow-hidden">
                          <div className="w-full h-full bg-linear-to-b from-slate-800 to-amber-200" />
                        </div>
                        <div className="w-10 h-7 bg-white rounded-t-lg border-t-2 border-blue-900 flex flex-col items-center">
                          <div className="w-2 h-4 bg-blue-900 rounded-b-xs" />
                        </div>
                      </div>

                      {/* Student 2 (Center Student with Open Book) */}
                      <div className="flex flex-col items-center z-10">
                        <div className="w-11 h-11 rounded-full bg-amber-100 border-2 border-blue-900 flex items-center justify-center shadow-sm overflow-hidden">
                          <div className="w-full h-full bg-linear-to-b from-amber-700 to-amber-100" />
                        </div>
                        <div className="w-12 h-9 bg-white rounded-t-lg border-t-2 border-blue-900 flex flex-col items-center">
                          <div className="w-2.5 h-5 bg-blue-900 rounded-b-xs" />
                        </div>
                      </div>

                      {/* Student 3 (Female Hijab) */}
                      <div className="flex flex-col items-center">
                        <div className="w-9 h-9 rounded-full bg-white border-2 border-blue-900 flex items-center justify-center shadow-xs overflow-hidden">
                          <div className="w-5 h-5 rounded-full bg-amber-100 mt-1" />
                        </div>
                        <div className="w-10 h-7 bg-white rounded-t-lg border-t-2 border-blue-900 flex flex-col items-center">
                          <div className="w-2 h-4 bg-blue-900 rounded-b-xs" />
                        </div>
                      </div>
                    </div>

                    {/* Book element */}
                    <div className="px-3 py-1 rounded-md bg-white border border-blue-800 text-[9px] font-black text-blue-900 shadow-md flex items-center space-x-1 mt-1">
                      <BookOpen className="w-3 h-3 text-blue-700" />
                      <span>BUKU LAPORAN BELAJAR</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Title & School Name */}
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">
                  e-Rapor SMP
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-blue-100">
                  Aplikasi Laporan Hasil Belajar Jenjang SMP
                </p>
                <div className="inline-block px-3 py-1 rounded-lg bg-blue-900/60 border border-blue-400/30 text-xs font-bold text-amber-300">
                  Versi 2025.2 &bull; Kurikulum Merdeka
                </div>
                <div className="text-xs font-bold text-white pt-1">
                  {school.name} &bull; NPSN {school.npsn}
                </div>
                <div className="text-[11px] text-blue-200">
                  {school.desa}, Kec. {school.kecamatan}, Kab. {school.kabupaten}
                </div>
              </div>
            </div>

            {/* Bottom Official Footer Info */}
            <div className="relative z-10 pt-4 border-t border-blue-500/40 flex flex-col sm:flex-row items-center justify-between text-[11px] text-blue-200 gap-2">
              <span className="font-mono">www.ditsmp.kemdikdasmen.go.id</span>
              <span className="flex items-center space-x-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Terotentikasi Firebase Zero-Trust</span>
              </span>
            </div>
          </div>

          {/* RIGHT SECTION: Modern Login Card Form */}
          <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-white">
            <div className="space-y-6">
              {/* Form Title */}
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-2 text-blue-700 font-extrabold text-lg uppercase tracking-wider">
                  <LogIn className="w-5 h-5 text-blue-600" />
                  <span>MASUK</span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Silakan Masuk Untuk Memulai Aplikasi
                </p>
              </div>

              {/* Error Alert Box */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <span className="font-bold block">Gagal Masuk:</span>
                    {errorMessage}
                  </div>
                </div>
              )}

              {/* Form Fields */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* 1. Username / NIP / Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Username / NIP / Email
                  </label>
                  <div className="relative rounded-xl border border-slate-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 transition shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username, NIP, atau Email"
                      className="w-full pl-9 pr-3 py-2.5 text-xs text-slate-800 bg-transparent rounded-xl focus:outline-hidden font-medium placeholder:text-slate-400"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {/* 2. Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative rounded-xl border border-slate-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 transition shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi..."
                      className="w-full pl-9 pr-10 py-2.5 text-xs text-slate-800 bg-transparent rounded-xl focus:outline-hidden font-medium placeholder:text-slate-400 font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 transition"
                      tabIndex={-1}
                      title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 3. Sekolah (Pre-selected) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sekolah :
                  </label>
                  <div className="relative rounded-xl border border-slate-200 bg-slate-50 text-slate-700 shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-600">
                      <School className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={`${school.name}`}
                      className="w-full pl-9 pr-3 py-2.5 text-xs font-bold text-slate-800 bg-transparent rounded-xl cursor-default focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* 4. Semester / Tahun Pelajaran */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Semester :
                  </label>
                  <div className="relative rounded-xl border border-slate-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 transition shadow-2xs bg-white">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-600">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <select
                      value={selectedSemester}
                      onChange={(e) => setSelectedSemester(e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 text-xs font-semibold text-slate-800 bg-transparent rounded-xl focus:outline-hidden appearance-none cursor-pointer"
                    >
                      {academicOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt} {opt === '2026/2027 Ganjil' ? '(Tahun Ajaran Aktif)' : ''}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                      <ChevronRight className="w-4 h-4 rotate-90" />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Memverifikasi Hak Akses...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>MASUK APLIKASI</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Informative credentials note */}
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-[11px] text-blue-900 space-y-1">
                <div className="font-bold flex items-center space-x-1.5 text-blue-950">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Keterangan Akun Pengguna:</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Administrator: username <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-blue-800 border border-blue-200">admin</code> (kata sandi: <code className="bg-white px-1 py-0.5 rounded font-mono text-slate-700">admin123</code> atau <code className="bg-white px-1 py-0.5 rounded font-mono text-slate-700">smpn1rangsang</code>) atau email akun Google Anda.
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Guru &amp; Wali Kelas: masuk dengan username masing-masing atau NIP (kata sandi default: <code className="bg-white px-1 py-0.5 rounded font-mono text-slate-700">smpn1rangsang</code>).
                </p>
              </div>
            </div>

            {/* Bottom Security Assurance */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Zero-Trust Auth SMPN 1 Rangsang</span>
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('reset')}
                className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
              >
                Lupa kata sandi?
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Official Kemendikdasmen Footer Bar */}
      <footer className="bg-blue-800 text-white py-3 px-4 text-center text-xs border-t border-blue-900 font-medium">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px] text-blue-100">
          <span>
            Aplikasi e-Rapor SMP | Versi 2025.2 | SMP Negeri 1 Rangsang
          </span>
          <span className="text-blue-200">
            Direktorat Sekolah Menengah Pertama &bull; Ditjen PAUD, Dikdas &amp; Dikmen &bull; Kemendikdasmen RI
          </span>
        </div>
      </footer>

      {/* MODAL 1: Panduan Aplikasi Modal */}
      {activeTab === 'guide' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-blue-50/70">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Panduan Penggunaan Aplikasi e-Rapor SMP
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Standar Alur Kerja Resmi Kurikulum Merdeka &amp; K13
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('login')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-600 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-900 space-y-1">
                <span className="font-bold block text-blue-950">1. Alur Peran Administrator</span>
                <p>
                  Bertanggung jawab mengelola profil sekolah, data siswa, data guru, rombongan belajar (VII.1 s/d IX.3), mata pelajaran resmi, pembagian tugas mengajar (SK Mengajar), serta manajemen akun pengguna dan hak akses.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-900 space-y-1">
                <span className="font-bold block text-emerald-950">2. Alur Peran Guru Mata Pelajaran</span>
                <p>
                  Hanya dapat menginput dan mengolah nilai pada kelas dan mata pelajaran yang ditugaskan secara resmi oleh Administrator. Menu mencakup perumusan TP, Asesmen Formatif, Asesmen Sumatif Lingkup Materi, Nilai Akhir, dan deskripsi capaian kompetensi otomatis.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-900 space-y-1">
                <span className="font-bold block text-amber-950">3. Alur Peran Wali Kelas</span>
                <p>
                  Mengelola rekapitulasi kehadiran (Sakit, Izin, Alpa), nilai kegiatan ekstrakurikuler, catatan perkembangan karakter, keputusan kenaikan kelas, leger nilai rombel, dan mencetak dokumen rapor resmi (PDF) untuk kelas binaannya.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-100 text-purple-900 space-y-1">
                <span className="font-bold block text-purple-950">4. Alur Peran Kepala Sekolah</span>
                <p>
                  Memantau rekapitulasi kemajuan pengisian nilai seluruh rombel, rekapitulasi leger nilai sekolah, laporan statistik capaian, dan pengesahan rapor.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setActiveTab('login')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
              >
                Kembali ke Form Masuk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Reset Password Modal */}
      {activeTab === 'reset' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-blue-50/70">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Reset Kata Sandi Akun
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Layanan Pemulihan Akses E-Rapor SMPN 1 Rangsang
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveTab('login');
                  setResetStatus(null);
                  setResetIdentifier('');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {resetStatus ? (
                <div className={`p-4 rounded-xl border ${resetStatus.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'} space-y-2`}>
                  <div className="flex items-center space-x-2 font-bold text-xs">
                    {resetStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                    <span>{resetStatus.success ? 'Permintaan Berhasil' : 'Pemberitahuan'}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{resetStatus.message}</p>
                </div>
              ) : (
                <form onSubmit={handleResetSubmit} className="space-y-4">
                  <p className="text-slate-600 leading-relaxed">
                    Masukkan <strong>Username</strong>, <strong>NIP</strong>, atau <strong>Alamat Email</strong> akun Anda yang terdaftar pada sistem E-Rapor SMP Negeri 1 Rangsang:
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Identitas Pengguna
                    </label>
                    <input
                      type="text"
                      value={resetIdentifier}
                      onChange={(e) => setResetIdentifier(e.target.value)}
                      placeholder="Contoh: zulkifli atau 198205152008011005"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-xs"
                      required
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1">
                    <span className="font-semibold text-slate-700 block">Prosedur Keamanan Sekolah:</span>
                    <p>
                      Untuk menjaga kerahasiaan nilai dan data rapor peserta didik, reset kata sandi diverifikasi langsung oleh Administrator / Operator E-Rapor SMPN 1 Rangsang.
                    </p>
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('login')}
                      className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isResetLoading}
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition flex items-center space-x-1.5"
                    >
                      {isResetLoading ? 'Memproses...' : 'Kirim Permintaan'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {resetStatus && (
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  onClick={() => {
                    setActiveTab('login');
                    setResetStatus(null);
                    setResetIdentifier('');
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                >
                  Tutup &amp; Kembali ke Halaman Masuk
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
