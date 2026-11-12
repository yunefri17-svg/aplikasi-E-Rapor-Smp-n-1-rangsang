import React, { useState } from 'react';
import {
  SchoolProfile,
  User,
  UserRole,
  AppNotification,
  DutyMode
} from '../../types/erapor';
import {
  Bell,
  Calendar,
  Clock,
  LogOut,
  School,
  ShieldCheck,
  UserCheck,
  Users,
  Award,
  ChevronDown,
  Menu,
  CheckCircle2,
  AlertTriangle,
  Info,
  BookOpen,
  Database,
  ExternalLink,
  X
} from 'lucide-react';

interface HeaderProps {
  school: SchoolProfile;
  currentUser: User;
  onSwitchUser: (user: User) => void;
  allUsers: User[];
  notifications?: AppNotification[];
  onMarkNotificationRead?: (id: string) => void;
  onToggleSidebar?: () => void;
  onOpenQuickSettings: () => void;
  activeDutyMode?: DutyMode;
  onToggleDutyMode?: (mode: DutyMode) => void;
  canSwitchDutyMode?: boolean;
  homeroomClassName?: string;
  cloudSyncState?: {
    status: 'connected' | 'syncing' | 'synced' | 'offline' | 'error' | 'quota_exceeded';
    lastSyncTime: string | null;
    message: string;
    isOnline: boolean;
    quotaExceeded?: boolean;
  };
  onTriggerSync?: () => void;
  onReconnect?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  school,
  currentUser,
  onSwitchUser,
  allUsers,
  notifications = [],
  onMarkNotificationRead,
  onToggleSidebar,
  onOpenQuickSettings,
  activeDutyMode,
  onToggleDutyMode,
  canSwitchDutyMode = false,
  homeroomClassName,
  cloudSyncState,
  onTriggerSync,
  onReconnect,
  onLogout
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);

  const handleReconnect = () => {
    if (onReconnect) onReconnect();
    setShowQuotaModal(false);
  };

  // Filter notifications for current user
  const userNotifs = notifications.filter((n) => {
    if (n.recipientUserId && n.recipientUserId === currentUser.id) return true;
    if (n.recipientUserId && currentUser.teacherId && n.recipientUserId === `usr-${currentUser.teacherId}`) return true;
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'walikelas' && n.recipientRole === 'walikelas') return true;
    if (currentUser.role === 'guru' && n.recipientRole === 'guru') return true;
    return false;
  });

  const unreadCount = userNotifs.filter((n) => !n.isRead).length;

  const roleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return { label: 'Administrator', bg: 'bg-red-100 text-red-700 border-red-300' };
      case 'kepsek':
        return { label: 'Kepala Sekolah', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'walikelas':
        return { label: 'Wali Kelas', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'guru':
        return { label: 'Guru Mapel', bg: 'bg-blue-100 text-blue-800 border-blue-300' };
    }
  };

  const badge = roleBadge(currentUser.role);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs print:hidden">
      <div className="px-4 py-2.5 flex items-center justify-between">
        {/* Left Section: Mobile toggle & School Identity */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-hidden"
            aria-label="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-700 to-indigo-800 text-white flex items-center justify-center font-bold text-lg shadow-sm border border-blue-600">
              <School className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-800 text-base leading-tight tracking-tight">
                  {school.name}
                </h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  NPSN {school.npsn}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {school.kabupaten}, {school.provinsi} &bull; Jenjang {school.jenjang}
              </p>
            </div>
          </div>
        </div>

        {/* Right Section: Academic Year & Semester Pill + Active User / Role Switcher */}
        <div className="flex items-center gap-3">
          {/* Dual Duty Mode Switcher for Multi-Role Teachers */}
          {canSwitchDutyMode && onToggleDutyMode && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => onToggleDutyMode('walikelas')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeDutyMode === 'walikelas'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title="Beralih ke Mode Wali Kelas (Kelola administrasi & rapor kelas Anda)"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Mode Wali Kelas {homeroomClassName ? `(${homeroomClassName})` : ''}</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleDutyMode('guru')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeDutyMode === 'guru'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title="Beralih ke Mode Guru Mapel (Pilih mapel & semua kelas yang Anda ajar)"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Mode Guru Mapel</span>
              </button>
            </div>
          )}

          {/* Academic Info Pill */}
          <button
            onClick={onOpenQuickSettings}
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition text-xs font-medium text-slate-700"
            title="Klik untuk mengubah Tahun Pelajaran / Semester"
          >
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>TP {school.activeAcademicYear}</span>
            <span className="text-slate-300">|</span>
            <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[11px] font-semibold">
              Sm. {school.activeSemester}
            </span>
          </button>

          {/* Cloud Firebase Auto-Sync Indicator */}
          {cloudSyncState && (
            <button
              type="button"
              onClick={
                cloudSyncState.status === 'quota_exceeded'
                  ? () => setShowQuotaModal(true)
                  : onTriggerSync
              }
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition shadow-2xs ${
                cloudSyncState.status === 'quota_exceeded'
                  ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                  : cloudSyncState.status === 'syncing'
                  ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                  : cloudSyncState.status === 'synced' || cloudSyncState.status === 'connected'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}
              title={
                cloudSyncState.status === 'quota_exceeded'
                  ? 'Batas kuota harian Cloud Firebase tercapai. Seluruh data & nilai tersimpan 100% aman di browser Anda. Klik untuk informasi lengkap.'
                  : `Status Cloud Firebase: ${cloudSyncState.message}. Klik untuk sinkronisasi manual sekarang.`
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  cloudSyncState.status === 'quota_exceeded'
                    ? 'bg-amber-500'
                    : cloudSyncState.status === 'syncing'
                    ? 'bg-amber-500 animate-ping'
                    : cloudSyncState.status === 'synced' || cloudSyncState.status === 'connected'
                    ? 'bg-emerald-500'
                    : 'bg-rose-500'
                }`}
              />
              <span className="text-[11px] font-bold">
                {cloudSyncState.status === 'quota_exceeded'
                  ? 'Penyimpanan Lokal Aktif'
                  : cloudSyncState.status === 'syncing'
                  ? 'Sinkron...'
                  : cloudSyncState.status === 'synced'
                  ? 'Cloud Firebase Aktif'
                  : 'Cloud Terhubung'}
              </span>
              {cloudSyncState.status !== 'quota_exceeded' && cloudSyncState.lastSyncTime && (
                <span className="text-[10px] text-emerald-700/80 font-mono hidden xl:inline">
                  {cloudSyncState.lastSyncTime}
                </span>
              )}
            </button>
          )}

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
              title="Notifikasi Real-Time Sinkronisasi"
            >
              <Bell className="w-5 h-5 text-slate-700" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <div className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <Bell className="w-3.5 h-3.5 text-blue-600" />
                    <span>Notifikasi Sinkronisasi Real-Time</span>
                  </div>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
                      {unreadCount} Baru
                    </span>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {userNotifs.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      Belum ada notifikasi baru.
                    </div>
                  ) : (
                    userNotifs.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => onMarkNotificationRead?.(n.id)}
                        className={`p-3 text-xs cursor-pointer transition hover:bg-slate-50 ${
                          !n.isRead ? 'bg-blue-50/50 font-medium' : 'text-slate-600'
                        }`}
                      >
                        <div className="flex items-start space-x-2">
                          {n.type === 'revision_requested' ? (
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="font-bold text-slate-800 text-xs">{n.title}</div>
                            <div className="text-slate-600 text-[11px] mt-0.5">{n.message}</div>
                            <div className="text-[10px] text-slate-400 mt-1">
                              {new Date(n.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Verified User Profile Card & Actions */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 pr-2 rounded-xl hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
              title="Informasi Profil & Keamanan Akun"
            >
              <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-blue-700 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-800 leading-tight">
                  {currentUser.name}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold ${badge.bg}`}>
                    {badge.label}
                  </span>
                  {currentUser.classId && (
                    <span className="text-[10px] text-slate-500 font-semibold">
                      Wali {currentUser.classId.replace('cls-', '').replace('-', '.').toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* User Profile Card Modal / Popover */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-3 px-4 z-50 animate-in fade-in slide-in-from-top-1 text-xs">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-bold text-slate-900 truncate">{currentUser.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">@{currentUser.username}</div>
                    {currentUser.nip && (
                      <div className="text-[10px] text-slate-400">NIP: {currentUser.nip}</div>
                    )}
                  </div>
                </div>

                <div className="py-2.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Peran Resmi:</span>
                    <span className={`px-2 py-0.5 rounded border font-bold text-[10px] ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>

                  {currentUser.classId && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Tugas Wali Kelas:</span>
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {currentUser.classId.replace('cls-', '').replace('-', '.').toUpperCase()}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50/80 p-2 rounded-lg border border-emerald-200/80">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Sesi Terotentikasi Firebase Auth</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowLogoutModal(true);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>Keluar (Logout)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Logout Button */}
          {onLogout && (
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="p-2 rounded-xl text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 transition cursor-pointer"
              title="Keluar dari Aplikasi E-Rapor"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Cloud Quota Limit Information Modal */}
      {showQuotaModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-amber-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Database className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Penyimpanan Lokal Aktif & Aman
                  </h3>
                  <p className="text-[11px] text-amber-800 font-medium">
                    Batas Kuota Harian Cloud Firebase Tercapai (Spark Tier)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuotaModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-600 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-950 block">Data & Nilai Anda 100% Aman:</span>
                  Semua input nilai mata pelajaran, rekapitulasi absensi, dan data rapor yang Anda simpan tersimpan langsung dan permanen di penyimpanan peramban lokal (LocalStorage). Data tidak akan hilang saat halaman disegarkan atau saat Anda membuka kembali e-Rapor.
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-slate-800">Mengapa status ini muncul?</div>
                <p>
                  Proyek Firebase Anda menggunakan paket gratis (<strong>Spark Plan</strong>) dengan batas <strong>20.000 unit tulis/hari</strong>. Kuota harian ini telah tercapai untuk hari ini dan akan otomatis direset oleh Google Cloud besok hari (tengah malam waktu Pasifik). Informasi kuota lengkap dapat dipelajari pada kolom Spark plan di bagian Enterprise edition pada{' '}
                  <a
                    href="https://firebase.google.com/pricing#cloud-firestore"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline font-semibold hover:text-blue-800 inline-flex items-center gap-0.5"
                  >
                    Panduan Harga Firebase Firestore
                    <ExternalLink className="w-3 h-3 inline" />
                  </a>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-[11px]">
                <div className="font-semibold text-slate-800">Informasi Teknis Database:</div>
                <div className="grid grid-cols-2 gap-2 font-mono text-[10px] text-slate-600">
                  <div>Project: reverberant-tangent-vt3g1</div>
                  <div>Status: Local Persistence Mode (Aman)</div>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-100">
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleReconnect}
                    className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Sambungkan Kembali
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQuotaModal(false)}
                    className="flex-1 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition"
                  >
                    Tutup
                  </button>
                </div>
                <a
                  href="https://console.firebase.google.com/project/reverberant-tangent-vt3g1/firestore/databases/ai-studio-eraporsmpn1rangs-ef6a47b0-810d-45e3-82b2-295552400b20/data?openUpgradeDialog=true"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Upgrade Firebase
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <LogOut className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Konfirmasi Keluar Aplikasi
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin mengakhiri sesi kerja pengguna <strong>{currentUser.name}</strong> (@{currentUser.username})?
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 text-left space-y-1">
              <div className="font-semibold text-slate-800">Catatan Keamanan:</div>
              <p>
                Sesi login Firebase akan ditutup dan Anda harus memasukkan kata sandi kembali untuk mengakses sistem rapor.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  if (onLogout) onLogout();
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
