import React, { useState } from 'react';
import {
  AcademicYearPeriod,
  AcademicSemesterConfig,
  SchoolProfile,
  User,
  AuditLog,
  AssessmentScore,
  Student
} from '../types/erapor';
import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  Lock,
  Unlock,
  Archive,
  Plus,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  History,
  Sparkles,
  FileText,
  Layers,
  Save,
  Check,
  Info,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { SecurityAccessDenied } from '../components/SecurityAccessDenied';

interface ManajemenTahunAjaranViewProps {
  schoolProfile: SchoolProfile;
  academicYears: AcademicYearPeriod[];
  students: Student[];
  scores: AssessmentScore[];
  auditLogs: AuditLog[];
  currentUser: User;
  onUpdateAcademicYears: (years: AcademicYearPeriod[], activeYear: string, activeSemester: 'Ganjil' | 'Genap', reportDate: string) => void;
  onLogAudit: (action: string, details: string) => void;
}

export const ManajemenTahunAjaranView: React.FC<ManajemenTahunAjaranViewProps> = ({
  schoolProfile,
  academicYears,
  students,
  scores,
  auditLogs,
  currentUser,
  onUpdateAcademicYears,
  onLogAudit
}) => {
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'kepsek';

  if (!isAdmin) {
    return (
      <SecurityAccessDenied
        currentUser={currentUser}
        customMessage="Akses Terbatas: Menu Manajemen Tahun Ajaran dan Semester hanya dapat diakses oleh Administrator Sistem dan Kepala Sekolah."
      />
    );
  }

  const [yearsList, setYearsList] = useState<AcademicYearPeriod[]>(academicYears);
  const [selectedYearId, setSelectedYearId] = useState<string>(
    academicYears.find((y) => y.name === schoolProfile.activeAcademicYear)?.id || academicYears[0]?.id || ''
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newYearName, setNewYearName] = useState('');
  const [newYearNotes, setNewYearNotes] = useState('');
  const [unlockPasswordModal, setUnlockPasswordModal] = useState<AcademicYearPeriod | null>(null);
  const [unlockPasswordInput, setUnlockPasswordInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'semua' | 'aktif' | 'persiapan' | 'arsip'>('semua');

  // Active year selected
  const selectedPeriod = yearsList.find((y) => y.id === selectedYearId) || yearsList[0];

  // Helper stats
  const getYearStats = (yearName: string) => {
    const yearScores = scores.filter((s) => s.academicYear === yearName);
    const assessedStudents = new Set(yearScores.map((s) => s.studentId)).size;
    return {
      totalScores: yearScores.length,
      assessedStudents
    };
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // 1. Activate an Academic Year & Semester
  const handleActivateYear = (targetYear: AcademicYearPeriod, semester: 'Ganjil' | 'Genap') => {
    if (targetYear.isLocked) {
      alert('Tahun ajaran ini sedang dikunci/arsip. Buka kunci arsip terlebih dahulu jika ingin mengaktifkan kembali.');
      return;
    }

    const confirmMsg = `Konfirmasi Pergantian Periode Aktif:\n\n` +
      `Anda akan mengaktifkan Tahun Ajaran ${targetYear.name} (${semester}).\n\n` +
      `Catatan Penting:\n` +
      `• Seluruh data nilai, absensi, dan rapor tahun sebelumnya (${schoolProfile.activeAcademicYear}) TIDAK AKAN DIHAPUS dan tetap tersimpan utuh sebagai arsip.\n` +
      `• Pengguna di laptop dan HP akan otomatis beralih ke periode ${targetYear.name} (${semester}).\n\n` +
      `Lanjutkan proses aktivasi?`;

    if (!window.confirm(confirmMsg)) return;

    // Target semester report date
    const targetSem = targetYear.semesters.find((s) => s.semester === semester);
    const repDate = targetSem?.reportDate || schoolProfile.reportDate;

    // Update list: only ONE active year
    const updatedYears: AcademicYearPeriod[] = yearsList.map((y) => {
      if (y.id === targetYear.id) {
        return {
          ...y,
          status: 'aktif',
          semesters: y.semesters.map((s) => ({
            ...s,
            status: s.semester === semester ? 'aktif' : (s.status === 'arsip' ? 'arsip' : 'persiapan')
          })),
          updatedAt: new Date().toISOString()
        };
      } else {
        // If it was active, change to archive
        const wasActive = y.status === 'aktif';
        return {
          ...y,
          status: wasActive ? 'arsip' : y.status,
          semesters: y.semesters.map((s) => ({
            ...s,
            status: wasActive ? 'arsip' : s.status
          })),
          isLocked: wasActive ? true : y.isLocked
        };
      }
    });

    setYearsList(updatedYears);
    onUpdateAcademicYears(updatedYears, targetYear.name, semester, repDate);
    onLogAudit(
      'Aktivasi Tahun Ajaran',
      `Administrator mengaktifkan Tahun Ajaran ${targetYear.name} Semester ${semester}. Tahun sebelumnya diarsipkan.`
    );
    showToast(`Tahun Ajaran ${targetYear.name} (${semester}) berhasil diaktifkan!`);
  };

  // 2. Add New Academic Year
  const handleAddNewYear = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newYearName.trim();
    if (!trimmed) return;

    // Check format YYYY/YYYY
    if (!/^\d{4}\/\d{4}$/.test(trimmed)) {
      alert('Format tahun ajaran harus YYYY/YYYY, contoh: 2027/2028');
      return;
    }

    if (yearsList.some((y) => y.name === trimmed)) {
      alert(`Tahun ajaran ${trimmed} sudah terdaftar.`);
      return;
    }

    const startYear = parseInt(trimmed.split('/')[0]) || 2027;
    const newPeriod: AcademicYearPeriod = {
      id: `ay-${trimmed.replace('/', '-')}`,
      name: trimmed,
      status: 'persiapan',
      isLocked: false,
      startDate: `${startYear}-07-15`,
      endDate: `${startYear + 1}-06-20`,
      notes: newYearNotes || `Tahun ajaran ${trimmed} (tahap persiapan)`,
      semesters: [
        {
          semester: 'Ganjil',
          status: 'persiapan',
          reportDate: `18 Desember ${startYear}`,
          isLocked: false
        },
        {
          semester: 'Genap',
          status: 'persiapan',
          reportDate: `19 Juni ${startYear + 1}`,
          isLocked: false
        }
      ],
      createdAt: new Date().toISOString()
    };

    const updated = [...yearsList, newPeriod].sort((a, b) => a.name.localeCompare(b.name));
    setYearsList(updated);
    onUpdateAcademicYears(updated, schoolProfile.activeAcademicYear, schoolProfile.activeSemester, schoolProfile.reportDate);
    onLogAudit('Tambah Tahun Ajaran', `Menambahkan tahun ajaran baru ${trimmed} dengan status Persiapan.`);
    setIsAddModalOpen(false);
    setNewYearName('');
    setNewYearNotes('');
    showToast(`Tahun ajaran ${trimmed} berhasil ditambahkan!`);
  };

  // 3. Toggle Lock / Unlock Archive
  const handleRequestUnlock = (year: AcademicYearPeriod) => {
    if (year.status === 'aktif') {
      alert('Tahun ajaran aktif tidak dapat dikunci karena sedang digunakan untuk operasional sekolah.');
      return;
    }

    if (year.isLocked) {
      // Need password confirmation to unlock
      setUnlockPasswordModal(year);
      setUnlockPasswordInput('');
      setUnlockError('');
    } else {
      // Direct lock
      const updated = yearsList.map((y) => (y.id === year.id ? { ...y, isLocked: true } : y));
      setYearsList(updated);
      onUpdateAcademicYears(updated, schoolProfile.activeAcademicYear, schoolProfile.activeSemester, schoolProfile.reportDate);
      onLogAudit('Kunci Arsip Tahun Ajaran', `Mengunci arsip Tahun Ajaran ${year.name} untuk mencegah modifikasi nilai.`);
      showToast(`Arsip ${year.name} berhasil dikunci!`);
    }
  };

  const handleConfirmUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPasswordModal) return;

    // Verify admin identity
    if (unlockPasswordInput !== 'admin123' && unlockPasswordInput !== 'smpn1rangsang') {
      setUnlockError('Kata sandi otorisasi Administrator salah. Akses membuka arsip ditolak.');
      return;
    }

    const updated = yearsList.map((y) =>
      y.id === unlockPasswordModal.id ? { ...y, isLocked: false } : y
    );
    setYearsList(updated);
    onUpdateAcademicYears(updated, schoolProfile.activeAcademicYear, schoolProfile.activeSemester, schoolProfile.reportDate);
    onLogAudit(
      'Buka Kunci Arsip',
      `Administrator membuka kunci arsip ${unlockPasswordModal.name} untuk perbaikan data riwayat.`
    );
    setUnlockPasswordModal(null);
    showToast(`Arsip ${unlockPasswordModal.name} berhasil dibuka kuncinya!`);
  };

  // 4. Update Semester Report Dates
  const handleSaveSemesterDates = (yearId: string, sem: 'Ganjil' | 'Genap', newDate: string) => {
    const updated = yearsList.map((y) => {
      if (y.id === yearId) {
        return {
          ...y,
          semesters: y.semesters.map((s) => (s.semester === sem ? { ...s, reportDate: newDate } : s))
        };
      }
      return y;
    });
    setYearsList(updated);
    
    // If updating current active year, also sync schoolProfile
    const isCurrent = selectedPeriod.name === schoolProfile.activeAcademicYear && schoolProfile.activeSemester === sem;
    onUpdateAcademicYears(
      updated,
      schoolProfile.activeAcademicYear,
      schoolProfile.activeSemester,
      isCurrent ? newDate : schoolProfile.reportDate
    );
    onLogAudit(
      'Perbarui Tanggal Rapor',
      `Memperbarui tanggal rapor Tahun ${selectedPeriod.name} Semester ${sem} menjadi: ${newDate}`
    );
    showToast(`Tanggal pembagian rapor semester ${sem} berhasil diperbarui!`);
  };

  const filteredYears = yearsList.filter((y) => {
    if (filterStatus === 'semua') return true;
    return y.status === filterStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Manajemen Tahun Ajaran & Semester
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengelolaan periode akademik SMP NEGERI 1 RANGSANG, aktivasi semester, penguncian arsip, dan riwayat multi-tahun.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {successToast && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold animate-in fade-in">
              <Check className="w-4 h-4" />
              {successToast}
            </div>
          )}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Tambah Tahun Ajaran Baru
          </button>
        </div>
      </div>

      {/* Active Academic Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <CalendarDays className="w-48 h-48" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-800 animate-pulse"></span>
              Periode Akademik Aktif Saat Ini
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Tahun Pelajaran {schoolProfile.activeAcademicYear}
              <span className="text-sm font-semibold px-2.5 py-0.5 rounded-lg bg-white/20 text-white">
                Semester {schoolProfile.activeSemester}
              </span>
            </h2>
            <p className="text-xs text-blue-100 max-w-2xl leading-relaxed">
              Seluruh penilaian harian, asesmen sumatif, pengolahan nilai, absensi, dan cetak rapor saat ini merujuk pada periode ini. Tanggal penandatanganan rapor resmi: <span className="font-bold underline text-white">{schoolProfile.reportDate}</span>.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto bg-black/25 backdrop-blur-sm p-3 rounded-xl border border-white/10 text-xs">
            <div className="text-right">
              <div className="text-[10px] text-blue-200">Siswa Aktif</div>
              <div className="text-base font-bold text-white">{students.length} Siswa</div>
            </div>
            <div className="h-8 w-px bg-white/20 mx-2"></div>
            <div className="text-right">
              <div className="text-[10px] text-blue-200">Total Penilaian</div>
              <div className="text-base font-bold text-white">
                {scores.filter((s) => s.academicYear === schoolProfile.activeAcademicYear).length} Nilai
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: List of Academic Years */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                Daftar Tahun Ajaran
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                {yearsList.length} Periode
              </span>
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap gap-1 text-[11px]">
              {(['semua', 'aktif', 'persiapan', 'arsip'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded-lg capitalize font-semibold transition ${
                    filterStatus === st
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="space-y-2 pt-1 max-h-[500px] overflow-y-auto">
              {filteredYears.map((year) => {
                const isCurrentActive = year.name === schoolProfile.activeAcademicYear;
                const isSelected = selectedYearId === year.id;
                const stats = getYearStats(year.name);

                return (
                  <div
                    key={year.id}
                    onClick={() => setSelectedYearId(year.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition text-xs ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                        {year.name}
                        {year.isLocked && (
                          <span title="Arsip Terkunci">
                            <Lock className="w-3.5 h-3.5 text-amber-600" />
                          </span>
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          year.status === 'aktif'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : year.status === 'persiapan'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-slate-100 text-slate-600 border border-slate-300'
                        }`}
                      >
                        {year.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                      <span>{stats.totalScores} rekaman nilai</span>
                      <span>{stats.assessedStudents} siswa dinilai</span>
                    </div>

                    {isCurrentActive && (
                      <div className="mt-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Berjalan ({schoolProfile.activeSemester})
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Policy Information Box */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              Kebijakan Keamanan Data Multi-Tahun
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              Pergantian tahun ajaran tidak menghapus data siswa, guru, maupun nilai tahun sebelumnya. Semua rekaman akademik tersimpan dengan identitas tahun spesifik dan dapat dibuka kembali kapan saja di Buku Induk & Transkrip.
            </p>
          </div>
        </div>

        {/* Right Column: Detailed Configuration of Selected Academic Year */}
        {selectedPeriod ? (
          <div className="lg:col-span-2 space-y-5">
            {/* Header Detail Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-800">
                      Tahun Pelajaran {selectedPeriod.name}
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        selectedPeriod.status === 'aktif'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedPeriod.status === 'persiapan'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Status: {selectedPeriod.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedPeriod.notes || 'Periode tahun ajaran resmi SMP Negeri 1 Rangsang'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRequestUnlock(selectedPeriod)}
                    disabled={selectedPeriod.status === 'aktif'}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      selectedPeriod.isLocked
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                    title={selectedPeriod.isLocked ? 'Buka kunci arsip' : 'Kunci arsip agar tidak dapat diubah'}
                  >
                    {selectedPeriod.isLocked ? (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-amber-700" />
                        Buka Kunci Arsip
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-slate-600" />
                        Kunci Arsip
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Semester 1 & Semester 2 Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedPeriod.semesters.map((sem) => {
                  const isActiveNow =
                    selectedPeriod.name === schoolProfile.activeAcademicYear &&
                    schoolProfile.activeSemester === sem.semester;

                  return (
                    <div
                      key={sem.semester}
                      className={`p-4 rounded-xl border transition space-y-3 ${
                        isActiveNow
                          ? 'border-emerald-300 bg-emerald-50/40 shadow-xs'
                          : 'border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                          <CalendarDays className="w-4 h-4 text-blue-600" />
                          Semester {sem.semester === 'Ganjil' ? '1 (Ganjil)' : '2 (Genap)'}
                        </div>
                        {isActiveNow ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold">
                            Sedang Berjalan
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-semibold uppercase">
                            {sem.status}
                          </span>
                        )}
                      </div>

                      <div className="text-xs space-y-2 text-slate-600">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Tanggal Pembagian Rapor
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              defaultValue={sem.reportDate}
                              onBlur={(e) =>
                                handleSaveSemesterDates(selectedPeriod.id, sem.semester, e.target.value)
                              }
                              disabled={selectedPeriod.isLocked && !isAdmin}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium bg-white focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                              placeholder="Contoh: 19 Desember 2026"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                          {sem.semester === 'Ganjil' ? 'Bulan Juli - Desember' : 'Bulan Januari - Juni'}
                        </span>

                        {!isActiveNow && (
                          <button
                            onClick={() => handleActivateYear(selectedPeriod, sem.semester)}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            Aktifkan Periode Ini
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Data Summary in this Academic Year */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-3">
                <div className="font-bold text-slate-700 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-blue-600" />
                  Statistik & Rekapitulasi Data Tahun {selectedPeriod.name}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Siswa Terdaftar</div>
                    <div className="text-lg font-black text-slate-800">{students.length}</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Total Nilai Rapor</div>
                    <div className="text-lg font-black text-blue-600">
                      {scores.filter((s) => s.academicYear === selectedPeriod.name).length}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Semester Ganjil</div>
                    <div className="text-lg font-black text-indigo-600">
                      {scores.filter((s) => s.academicYear === selectedPeriod.name && s.semester === 'Ganjil').length}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Semester Genap</div>
                    <div className="text-lg font-black text-indigo-600">
                      {scores.filter((s) => s.academicYear === selectedPeriod.name && s.semester === 'Genap').length}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Audit Logs for Academic Year */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Catatan Riwayat & Log Perubahan Periode Akademik
                </span>
                <span className="text-[11px] text-slate-400">Aman & Terverifikasi</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {auditLogs
                  .filter((log) => log.action.toLowerCase().includes('tahun') || log.action.toLowerCase().includes('periode') || log.action.toLowerCase().includes('arsip'))
                  .slice(0, 8)
                  .map((log) => (
                    <div key={log.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] flex items-start justify-between gap-3">
                      <div>
                        <span className="font-bold text-slate-800">{log.action}</span>: {log.details}
                        <div className="text-slate-400 text-[10px] mt-0.5">Oleh: {log.userName} ({log.role})</div>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 font-mono">{log.timestamp}</span>
                    </div>
                  ))}

                {auditLogs.filter((log) => log.action.toLowerCase().includes('tahun') || log.action.toLowerCase().includes('periode')).length === 0 && (
                  <div className="text-slate-400 text-center py-4 italic text-xs">
                    Belum ada perubahan periode akademik terbaru.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Modal 1: Add New Academic Year */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-1">
              <Plus className="w-5 h-5 text-blue-600" />
              Tambah Tahun Ajaran Baru
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Membuat periode tahun ajaran baru dengan status persiapan. Data siswa dan rombel lama tidak akan hilang.
            </p>

            <form onSubmit={handleAddNewYear} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Format Tahun Pelajaran</label>
                <input
                  type="text"
                  value={newYearName}
                  onChange={(e) => setNewYearName(e.target.value)}
                  placeholder="Contoh: 2027/2028"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold focus:ring-2 focus:ring-blue-500"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Format: 4 digit tahun / 4 digit tahun (contoh: 2027/2028).</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan / Deskripsi Tambahan</label>
                <textarea
                  value={newYearNotes}
                  onChange={(e) => setNewYearNotes(e.target.value)}
                  rows={2}
                  placeholder="Catatan perencanaan kurikulum atau pembagian tugas..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-[11px] leading-relaxed">
                <Info className="w-3.5 h-3.5 inline mr-1 text-blue-700" />
                Tahun ajaran baru akan dimulai dengan status <strong>Persiapan</strong> sehingga tidak langsung menggantikan tahun yang sedang aktif.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs"
                >
                  Simpan Tahun Ajaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Password Authorization to Unlock Archive */}
      {unlockPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-800 text-center mb-1">
              Otorisasi Membuka Arsip
            </h3>
            <p className="text-xs text-slate-500 text-center mb-4 leading-relaxed">
              Arsip Tahun Ajaran <strong>{unlockPasswordModal.name}</strong> dikunci untuk melindungi keaslian dokumen rapor. Masukkan kata sandi Administrator untuk membuka kunci.
            </p>

            <form onSubmit={handleConfirmUnlock} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kata Sandi Administrator</label>
                <input
                  type="password"
                  value={unlockPasswordInput}
                  onChange={(e) => {
                    setUnlockPasswordInput(e.target.value);
                    setUnlockError('');
                  }}
                  placeholder="Masukkan kata sandi..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium focus:ring-2 focus:ring-blue-500"
                  required
                  autoFocus
                />
                {unlockError && (
                  <span className="text-[11px] text-rose-600 mt-1 block font-medium">
                    {unlockError}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUnlockPasswordModal(null)}
                  className="px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Buka Kunci Arsip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
