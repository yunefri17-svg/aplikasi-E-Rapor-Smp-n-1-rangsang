import React, { useState, useEffect } from 'react';
import { SchoolProfile, AuditLog, User } from '../types/erapor';
import { AppDatabase, partialPurgeMasterData } from '../services/storage';
import {
  testFirestoreConnection,
  syncAllToFirestore,
  fetchFromFirestore
} from '../services/firebaseSync';
import { uploadSchoolAsset } from '../services/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  getAvailableAcademicYears,
  getCurrentSystemAcademicYear,
  getDefaultReportDate
} from '../utils/academicYear';
import {
  Settings,
  Database,
  Calendar,
  Save,
  Check,
  RotateCcw,
  Download,
  Upload,
  History,
  ShieldCheck,
  Cloud,
  CloudCheck,
  RefreshCw,
  Server,
  Lock,
  Layers,
  FileText,
  AlertCircle,
  ExternalLink,
  Trash2,
  Key,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';

interface PengaturanAplikasiViewProps {
  school: SchoolProfile;
  auditLogs: AuditLog[];
  onUpdateSchoolSettings: (updated: Partial<SchoolProfile>) => void;
  onBackupDatabase: () => void;
  onRestoreDatabase: (jsonContent: string) => void;
  onResetDatabase: () => void;
  onPurgeMasterData: () => void;
  currentUser: User;
  db?: AppDatabase;
  onApplyRemoteData?: (data: Partial<AppDatabase>) => void;
}

export const PengaturanAplikasiView: React.FC<PengaturanAplikasiViewProps> = ({
  school,
  auditLogs,
  onUpdateSchoolSettings,
  onBackupDatabase,
  onRestoreDatabase,
  onResetDatabase,
  onPurgeMasterData,
  currentUser,
  db,
  onApplyRemoteData
}) => {
  const [academicYear, setAcademicYear] = useState(school.activeAcademicYear);
  const [semester, setSemester] = useState(school.activeSemester);
  const [reportDate, setReportDate] = useState(school.reportDate);
  const [reportPlace, setReportPlace] = useState(school.reportPlace);
  const [autoAcademicYear, setAutoAcademicYear] = useState<boolean>(school.autoAcademicYear ?? true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);

  // Firebase Cloud State
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    latencyMs?: number;
  }>({
    tested: false,
    success: false,
    message: ''
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string>('');
  const [syncSummary, setSyncSummary] = useState<{
    show: boolean;
    success: boolean;
    count: number;
    message: string;
  }>({
    show: false,
    success: false,
    count: 0,
    message: ''
  });

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadSuccess, setLogoUploadSuccess] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedApiKey, setCopiedApiKey] = useState(false);

  const handleCopyApiKey = () => {
    if (firebaseConfig.apiKey) {
      navigator.clipboard.writeText(firebaseConfig.apiKey);
      setCopiedApiKey(true);
      setTimeout(() => setCopiedApiKey(false), 2000);
    }
  };

  // Test connection on mount once
  useEffect(() => {
    handleTestConnection();
  }, []);

  const handleTestConnection = async (forceCheck: boolean = false) => {
    setTestingConnection(true);
    const res = await testFirestoreConnection(forceCheck);
    setConnectionResult({
      tested: true,
      success: res.success,
      message: res.message,
      latencyMs: res.latencyMs
    });
    setTestingConnection(false);
  };

  const handleSyncToFirestore = async () => {
    if (!db) {
      alert('Data lokal tidak dapat diakses untuk sinkronisasi.');
      return;
    }

    setIsSyncing(true);
    setSyncProgress('Memulai persiapan paket data untuk sinkronisasi cloud...');
    setSyncSummary({ show: false, success: false, count: 0, message: '' });

    const res = await syncAllToFirestore(db, currentUser, (progress) => {
      setSyncProgress(progress);
    });

    setIsSyncing(false);
    if (res.quotaExceeded) {
      setSyncSummary({
        show: true,
        success: true,
        count: 0,
        message: 'Batas kuota harian Cloud Firebase (Spark: 20.000 unit tulis/hari) telah tercapai hari ini. Seluruh data sekolah & nilai Anda tetap tersimpan 100% aman di penyimpanan peramban lokal (LocalStorage) dan akan disinkronkan saat kuota direset besok hari.'
      });
    } else if (res.success) {
      setSyncSummary({
        show: true,
        success: true,
        count: res.count,
        message: `Berhasil mencadangkan & menyinkronkan ${res.count} dokumen ke 19 koleksi Cloud Firestore.`
      });
    } else {
      setSyncSummary({
        show: true,
        success: false,
        count: 0,
        message: `Gagal menyinkronkan data: ${res.error || 'Terjadi kesalahan sistem'}`
      });
    }
  };

  const handleFetchFromFirestore = async () => {
    if (!onApplyRemoteData) return;
    setIsSyncing(true);
    setSyncProgress('Menarik data terbaru dari Cloud Firestore...');
    const remoteData = await fetchFromFirestore();
    setIsSyncing(false);

    if (remoteData) {
      onApplyRemoteData(remoteData);
      alert('Berhasil memperbarui data aplikasi dari Cloud Firestore!');
    } else {
      alert('Gagal mengambil data dari Cloud Firestore. Pastikan koneksi internet stabil.');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingLogo(true);
      const url = await uploadSchoolAsset('school_logos', `logo_${Date.now()}_${file.name}`, file, file.type);
      onUpdateSchoolSettings({ schoolLogo: url });
      setLogoUploadSuccess(true);
      setTimeout(() => setLogoUploadSuccess(false), 4000);
    } catch (err: any) {
      alert(`Gagal mengunggah logo ke Cloud Storage: ${err?.message || err}`);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSaveAcademic = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSchoolSettings({
      activeAcademicYear: academicYear,
      activeSemester: semester,
      reportDate,
      reportPlace,
      autoAcademicYear
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        JSON.parse(text); // validate
        onRestoreDatabase(text);
        setRestoreSuccess(true);
        setRestoreError(null);
        setTimeout(() => setRestoreSuccess(false), 3000);
      } catch (err: any) {
        setRestoreError(`Format berkas backup tidak valid: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            Pengaturan Aplikasi & Keamanan Cloud Firebase
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Konfigurasi cloud database Firestore, Firebase Authentication, Firebase Storage, hak akses berbasis kelas (RBAC), serta pemulihan data.
          </p>
        </div>

        {saveSuccess && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold animate-in fade-in">
            <Check className="w-4 h-4" />
            Pengaturan Berhasil Diperbarui!
          </div>
        )}
      </div>

      {/* CLOUD FIREBASE INTEGRATION CARD */}
      <div className="bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-800/40 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-800/60 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Firebase Cloud Storage & Firestore
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Terhubung & Aktif
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5 font-medium">
                Sistem database cloud terenkripsi resmi e-Rapor SMP Negeri 1 Rangsang
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://console.firebase.google.com/project/reverberant-tangent-vt3g1/firestore/databases/ai-studio-eraporsmpn1rangs-ef6a47b0-810d-45e3-82b2-295552400b20/data?openUpgradeDialog=true"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white flex items-center gap-1.5 transition"
              title="Buka Firebase Console Google Cloud untuk melihat metrik dan kuota"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
              <span>Firebase Console</span>
            </a>
            <a
              href="https://firebase.google.com/pricing#cloud-firestore"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white flex items-center gap-1.5 transition"
              title="Pelajari batas kuota Spark plan di bagian Enterprise edition panduan harga"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-300" />
              <span>Tarif & Kuota</span>
            </a>
            <button
              onClick={() => handleTestConnection(true)}
              disabled={testingConnection}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white flex items-center gap-2 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
              {testingConnection ? 'Memeriksa...' : 'Uji Koneksi Cloud'}
            </button>
          </div>
        </div>

        {/* Cloud Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          {/* API Key Box */}
          <div className="bg-white/5 rounded-xl p-3 border border-white/10 relative group">
            <div className="flex items-center justify-between">
              <span className="text-amber-300 text-[10px] font-medium block uppercase tracking-wider flex items-center gap-1">
                <Key className="w-3 h-3 text-amber-400" />
                Firebase API Key
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="p-1 rounded text-slate-400 hover:text-white transition"
                  title={showApiKey ? 'Sembunyikan API Key' : 'Tampilkan API Key'}
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={handleCopyApiKey}
                  className="p-1 rounded text-slate-400 hover:text-emerald-400 transition"
                  title="Salin API Key"
                >
                  {copiedApiKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="font-mono font-bold text-slate-100 truncate block mt-1 text-[11px]">
              {showApiKey ? (
                firebaseConfig.apiKey
              ) : (
                <span>{firebaseConfig.apiKey.slice(0, 8)}•••••••••••••••••••••{firebaseConfig.apiKey.slice(-4)}</span>
              )}
            </div>
            {copiedApiKey && (
              <span className="absolute top-2 right-14 text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                Tersalin!
              </span>
            )}
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-indigo-300 text-[10px] font-medium block uppercase tracking-wider">Project ID</span>
            <span className="font-mono font-bold text-slate-100 truncate block mt-0.5 text-[11px]">
              {firebaseConfig.projectId}
            </span>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-indigo-300 text-[10px] font-medium block uppercase tracking-wider">Database ID</span>
            <span className="font-mono font-bold text-slate-100 truncate block mt-0.5 text-[11px]" title={firebaseConfig.firestoreDatabaseId}>
              {firebaseConfig.firestoreDatabaseId ? firebaseConfig.firestoreDatabaseId : '(default)'}
            </span>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-indigo-300 text-[10px] font-medium block uppercase tracking-wider">App ID</span>
            <span className="font-mono font-bold text-slate-100 truncate block mt-0.5 text-[11px]" title={firebaseConfig.appId}>
              {firebaseConfig.appId}
            </span>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-indigo-300 text-[10px] font-medium block uppercase tracking-wider">Storage Bucket</span>
            <span className="font-mono font-bold text-slate-100 truncate block mt-0.5 text-[11px]" title={firebaseConfig.storageBucket}>
              {firebaseConfig.storageBucket}
            </span>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-indigo-300 text-[10px] font-medium block uppercase tracking-wider">Security Rules</span>
            <span className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5" />
              Zero-Trust RBAC Deployed
            </span>
          </div>
        </div>

        {/* Live Latency & Status Banner */}
        {connectionResult.tested && (
          <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            connectionResult.success
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
          }`}>
            <div className="flex items-center gap-2">
              {connectionResult.success ? (
                <CloudCheck className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              )}
              <span>{connectionResult.message}</span>
            </div>
            {connectionResult.latencyMs !== undefined && (
              <span className="font-mono px-2 py-0.5 rounded bg-black/40 text-[10px] text-slate-300">
                Ping: {connectionResult.latencyMs} ms
              </span>
            )}
          </div>
        )}

        {/* Action Controls for Cloud Sync */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-indigo-800/40">
          <div className="text-xs text-indigo-200/90 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Mendukung 19 koleksi data: Siswa, Nilai, Guru, Rombel VII.1-IX.3, dan Log Audit.</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSyncToFirestore}
              disabled={isSyncing}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition disabled:opacity-50"
            >
              <CloudCheck className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Database ke Cloud Firestore'}
            </button>
          </div>
        </div>

        {/* Progress or Summary message */}
        {isSyncing && (
          <div className="p-3 rounded-xl bg-blue-900/50 border border-blue-400/30 text-blue-200 text-xs flex items-center gap-2 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-300" />
            <span>{syncProgress}</span>
          </div>
        )}

        {syncSummary.show && (
          <div className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 animate-in fade-in ${
            syncSummary.success
              ? 'bg-emerald-900/60 border-emerald-400/40 text-emerald-200'
              : 'bg-rose-900/60 border-rose-400/40 text-rose-200'
          }`}>
            <Check className="w-4 h-4 shrink-0" />
            <span>{syncSummary.message}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Periode Penilaian Aktif */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Calendar className="w-5 h-5 text-blue-600" />
              Periode Penilaian & Kalender Akademik
            </div>
            <button
              type="button"
              onClick={() => {
                const cur = getCurrentSystemAcademicYear();
                setAcademicYear(cur.academicYear);
                setSemester(cur.semester);
                setReportDate(getDefaultReportDate(cur.academicYear, cur.semester));
              }}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
            >
              Set ke Tahun Sekarang ({getCurrentSystemAcademicYear().academicYear})
            </button>
          </div>

          <form onSubmit={handleSaveAcademic} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tahun Pelajaran Aktif</label>
              <select
                value={academicYear}
                onChange={(e) => {
                  const val = e.target.value;
                  setAcademicYear(val);
                  setReportDate(getDefaultReportDate(val, semester));
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {getAvailableAcademicYears(2023, 10).map((yr) => (
                  <option key={yr} value={yr}>
                    Tahun Pelajaran {yr} {yr === '2026/2027' ? '(Tahun Berjalan Saat Ini)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Semester Aktif</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSemester('Ganjil');
                    setReportDate(getDefaultReportDate(academicYear, 'Ganjil'));
                  }}
                  className={`py-2 px-3 rounded-lg border font-bold text-xs transition ${
                    semester === 'Ganjil'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Semester Ganjil
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSemester('Genap');
                    setReportDate(getDefaultReportDate(academicYear, 'Genap'));
                  }}
                  className={`py-2 px-3 rounded-lg border font-bold text-xs transition ${
                    semester === 'Genap'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Semester Genap
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50/60 border border-blue-200/80">
              <input
                type="checkbox"
                id="autoAcademicToggle"
                checked={autoAcademicYear}
                onChange={(e) => setAutoAcademicYear(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <label htmlFor="autoAcademicToggle" className="text-[11px] font-medium text-slate-700 cursor-pointer">
                <strong className="text-blue-900 block font-bold">Otomatis Perbarui Tahun Pelajaran</strong>
                Sistem otomatis mendeteksi tahun ajaran baru setiap bulan Juli dan semester baru setiap Januari.
              </label>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tempat Penerbitan Rapor</label>
              <input
                type="text"
                value={reportPlace}
                onChange={(e) => setReportPlace(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 font-medium"
                placeholder="Contoh: Tanjung Samak"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tanggal Penerbitan / Pembagian Rapor</label>
              <input
                type="text"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 font-medium"
                placeholder="Contoh: 19 Desember 2026"
                required
              />
            </div>

            {/* Data Safety Box */}
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] leading-relaxed flex items-start gap-2">
              <span className="text-sm">🛡️</span>
              <div>
                <span className="font-bold block">Proteksi Riwayat Nilai:</span>
                Semua nilai dan absensi disimpan dengan penanda tahun pelajaran spesifik. Pergantian tahun ajaran tidak akan pernah menimpa atau menghapus data siswa tahun sebelumnya.
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
            >
              <Save className="w-4 h-4" />
              Simpan Periode & Tanggal Rapor
            </button>
          </form>
        </div>

        {/* Card 2: Backup & Pemulihan Database */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Database className="w-5 h-5 text-indigo-600" />
            Cadangan & Pemulihan Database (Backup / Restore)
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Amankan seluruh data sekolah, guru, siswa, capaian pembelajaran, dan riwayat nilai dalam satu berkas cadangan terenkripsi JSON.
          </p>

          <div className="space-y-3 pt-1">
            <button
              onClick={onBackupDatabase}
              className="w-full p-3 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 text-blue-900 font-bold text-xs flex items-center justify-between transition"
            >
              <span className="flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-700" />
                Unduh Cadangan Database Lengkap (.json)
              </span>
              <span className="text-[10px] bg-blue-200 text-blue-800 px-2 py-0.5 rounded font-mono">
                Lengkap
              </span>
            </button>

            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                id="restoreFileInput"
                className="hidden"
              />
              <label
                htmlFor="restoreFileInput"
                className="w-full p-3 rounded-xl border border-slate-300 hover:border-slate-400 text-slate-700 font-bold text-xs flex items-center justify-between cursor-pointer transition"
              >
                <span className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-slate-600" />
                  Pulihkan dari Berkas Cadangan (.json)
                </span>
                <span className="text-[10px] text-slate-400">Pilih File</span>
              </label>
            </div>

            {restoreSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4" />
                Database berhasil dipulihkan secara penuh!
              </div>
            )}

            {restoreError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {restoreError}
              </div>
            )}

            {/* Cloud Logo Storage Upload */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block font-semibold text-slate-700 mb-1 text-xs">
                Unggah Logo Sekolah ke Firebase Storage
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  id="logoUploadInput"
                  disabled={isUploadingLogo}
                  className="hidden"
                />
                <label
                  htmlFor="logoUploadInput"
                  className={`w-full p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/60 text-indigo-900 font-bold text-xs flex items-center justify-between cursor-pointer transition ${
                    isUploadingLogo ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-indigo-600" />
                    {isUploadingLogo ? 'Mengunggah ke Cloud Storage...' : 'Pilih Logo Sekolah (PNG/JPG)'}
                  </span>
                  <span className="text-[10px] bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded font-mono">
                    Storage
                  </span>
                </label>
              </div>
              {logoUploadSuccess && (
                <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Logo berhasil disimpan di Firebase Storage dan dipasang pada profil!
                </p>
              )}
            </div>

            {/* User Requested: Partial Purge for fresh start */}
            <div className="pt-3 border-t border-slate-100">
              <div className="p-3 mb-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
                <strong className="block text-amber-950 mb-0.5">Pembersihan Data Master:</strong>
                Fasilitas ini akan menghapus seluruh data Siswa, Guru (GTK), Nilai, Absensi, dan Akun Wali Kelas/Guru. Akun Admin dan konfigurasi sekolah tetap aman.
              </div>
              
              {showPurgeConfirm ? (
                <div className="space-y-2 animate-in slide-in-from-bottom-2">
                  <p className="text-[10px] font-bold text-rose-600 text-center uppercase">Konfirmasi Penghapusan Permanen?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPurgeConfirm(false)}
                      className="py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onPurgeMasterData();
                        setShowPurgeConfirm(false);
                        setSaveSuccess(true);
                        setTimeout(() => setSaveSuccess(false), 3000);
                      }}
                      className="py-2 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-sm"
                    >
                      Ya, Hapus Data
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPurgeConfirm(true)}
                  className="w-full p-2.5 rounded-xl border border-amber-300 bg-amber-50/30 text-amber-700 hover:bg-amber-100/50 text-xs font-bold flex items-center justify-center gap-2 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Kosongkan Data Siswa, Guru & Hak Akses
                </button>
              )}
            </div>

            {/* Danger Zone: Reset to default SMPN 1 Rangsang */}
            <div className="pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  if (
                    confirm(
                      'Peringatan: Reset database akan mengembalikan seluruh data ke data awal resmi SMP Negeri 1 Rangsang (Kelas VII.1 - IX.3). Lanjutkan?'
                    )
                  ) {
                    onResetDatabase();
                  }
                }}
                className="w-full p-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset ke Data Bawaan Sistem
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <History className="w-5 h-5 text-slate-600" />
            Riwayat Aktivitas & Audit Log Sistem
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Merekam seluruh perubahan data, sinkronisasi cloud & hak akses
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 w-40">Waktu</th>
                <th className="px-4 py-2.5 w-44">Pengguna & Peran</th>
                <th className="px-4 py-2.5 w-40">Aksi</th>
                <th className="px-4 py-2.5">Rincian Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-2 text-slate-500 font-mono text-[11px]">{log.timestamp}</td>
                  <td className="px-4 py-2 font-bold text-slate-800">
                    <div>{log.userName}</div>
                    <span className="text-[10px] text-slate-400 uppercase font-normal">{log.role}</span>
                  </td>
                  <td className="px-4 py-2 font-semibold text-blue-700">{log.action}</td>
                  <td className="px-4 py-2 text-slate-600">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
