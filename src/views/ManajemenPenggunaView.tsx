import React, { useState } from 'react';
import {
  User,
  UserRole,
  Teacher,
  Classroom,
  AuditLog,
  Subject,
  TeachingAssignment
} from '../types/erapor';
import {
  ShieldCheck,
  Plus,
  Edit,
  Trash2,
  KeyRound,
  UserCheck,
  Check,
  X,
  ShieldAlert,
  Search,
  Lock,
  Eye,
  EyeOff,
  UserX,
  History,
  Users,
  Award,
  Sparkles,
  BookOpen,
  CheckCircle2
} from 'lucide-react';
import { sortClassrooms } from '../utils/classroomSort';

interface ManajemenPenggunaViewProps {
  users: User[];
  teachers: Teacher[];
  classrooms: Classroom[];
  currentUser: User;
  onSaveUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onSwitchUser?: (user: User) => void;
  onToggleUserStatus?: (userId: string, status: 'active' | 'inactive') => void;
  onResetPassword?: (userId: string, newPass: string) => void;
  auditLogs?: AuditLog[];
  subjects?: Subject[];
  teachingAssignments?: TeachingAssignment[];
}

export const ManajemenPenggunaView: React.FC<ManajemenPenggunaViewProps> = ({
  users,
  teachers,
  classrooms,
  currentUser,
  onSaveUser,
  onDeleteUser,
  onToggleUserStatus,
  onResetPassword,
  auditLogs = [],
  subjects = [],
  teachingAssignments = []
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'teachers' | 'audit'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  
  // Add / Edit Modal state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userPassword, setUserPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Reset Password Modal state
  const [passwordModalUser, setPasswordModalUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  const classMap = new Map(classrooms.map((c) => [c.id, c.name]));

  const handleOpenAdd = () => {
    setEditingUser({
      id: `usr-${Date.now()}`,
      username: '',
      name: '',
      role: 'guru',
      status: 'active',
      password: 'smpn1rangsang'
    });
    setUserPassword('smpn1rangsang');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser({ ...u });
    setUserPassword(u.password || '');
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const cleanUsername = editingUser.username.toLowerCase().replace(/\s+/g, '');
      const payload: User = {
        ...editingUser,
        username: cleanUsername,
        password: userPassword || editingUser.password || 'smpn1rangsang',
        status: editingUser.status || 'active'
      };
      onSaveUser(payload);
      setIsModalOpen(false);
      setEditingUser(null);
      setSavedToast(`Akun @${cleanUsername} (${payload.name}) berhasil disimpan dan disinkronkan ke Cloud Firestore.`);
      setTimeout(() => setSavedToast(null), 4000);
    }
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordModalUser && newPassword.trim()) {
      if (onResetPassword) {
        onResetPassword(passwordModalUser.id, newPassword.trim());
      } else {
        onSaveUser({ ...passwordModalUser, password: newPassword.trim() });
      }
      setPasswordSuccess(true);
      setTimeout(() => {
        setPasswordSuccess(false);
        setPasswordModalUser(null);
        setNewPassword('');
      }, 1500);
    }
  };

  const roleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return { label: 'Administrator', bg: 'bg-red-50 text-red-700 border-red-200' };
      case 'kepsek':
        return { label: 'Kepala Sekolah', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'walikelas':
        return { label: 'Wali Kelas', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'guru':
        return { label: 'Guru Mapel', bg: 'bg-blue-50 text-blue-800 border-blue-200' };
    }
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.nip && u.nip.includes(searchTerm));
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  // Filtered security logs
  const securityLogs = auditLogs.filter(
    (l) =>
      l.action.toLowerCase().includes('pengguna') ||
      l.action.toLowerCase().includes('user') ||
      l.action.toLowerCase().includes('password') ||
      l.action.toLowerCase().includes('login') ||
      l.action.toLowerCase().includes('wali') ||
      l.action.toLowerCase().includes('akses')
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Manajemen Pengguna &amp; Hak Akses
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengaturan kredensial akun login, kontrol otentikasi Firebase, dan penetapan peran resmi untuk Administrator, Kepala Sekolah, Wali Kelas, dan Guru Mapel.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Akun Pengguna</span>
        </button>
      </div>

      {/* Sync Success Alert */}
      {savedToast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in duration-200 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{savedToast}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Daftar Akun Pengguna ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('teachers')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'teachers'
              ? 'bg-blue-600 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Daftar Guru &amp; Pemetaan Akun ({teachers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-blue-600 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Log Jejak Keamanan Akun</span>
        </button>
      </div>

      {/* TAB 1: USERS LIST */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama, username, atau NIP..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-600"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 font-medium">Filter Peran:</span>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold text-slate-700 focus:outline-hidden focus:border-blue-600"
              >
                <option value="all">Semua Peran</option>
                <option value="admin">Administrator</option>
                <option value="kepsek">Kepala Sekolah</option>
                <option value="walikelas">Wali Kelas</option>
                <option value="guru">Guru Mata Pelajaran</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Nama Lengkap</th>
                    <th className="px-4 py-3">Username &amp; NIP</th>
                    <th className="px-4 py-3">Peran Resmi</th>
                    <th className="px-4 py-3">Tugas Khusus Rombel</th>
                    <th className="px-4 py-3">Status Akun</th>
                    <th className="px-4 py-3 text-right">Aksi Manajemen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        Tidak ada akun pengguna yang cocok dengan kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const b = roleBadge(u.role);
                      const isCurrent = u.id === currentUser.id;
                      const isActive = u.status !== 'inactive';

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-100 text-blue-800 font-bold border border-blue-200">
                                  Akun Anda
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">ID: {u.id}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-mono font-bold text-slate-800">@{u.username}</div>
                            {u.nip ? (
                              <div className="text-[10px] text-slate-400">NIP: {u.nip}</div>
                            ) : (
                              <div className="text-[10px] text-slate-400 italic">Non-NIP</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${b.bg}`}>
                              {b.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {u.classId ? (
                              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Wali {classMap.get(u.classId) || u.classId}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {onToggleUserStatus && !isCurrent ? (
                              <button
                                type="button"
                                onClick={() => onToggleUserStatus(u.id, isActive ? 'inactive' : 'active')}
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer transition ${
                                  isActive
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                                }`}
                                title={isActive ? 'Klik untuk menonaktifkan akun' : 'Klik untuk mengaktifkan akun'}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                <span>{isActive ? 'Aktif' : 'Nonaktif'}</span>
                              </button>
                            ) : (
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isActive ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                <span>{isActive ? 'Aktif' : 'Nonaktif'}</span>
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right space-x-1">
                            <button
                              type="button"
                              onClick={() => {
                                setPasswordModalUser(u);
                                setNewPassword('');
                              }}
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition cursor-pointer"
                              title="Reset Kata Sandi Akun"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(u)}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition cursor-pointer"
                              title="Edit Detail Akun"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {users.length > 1 && !isCurrent && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Yakin ingin menghapus akun pengguna @${u.username} (${u.name})?`)) {
                                    onDeleteUser(u.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                                title="Hapus Akun Pengguna"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEACHERS & ACCOUNT MAPPING */}
      {activeTab === 'teachers' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-bold text-slate-800 text-xs">
              Status Pemetaan Akun Login Guru &amp; Tenaga Kependidikan
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Daftar seluruh GTK SMP Negeri 1 Rangsang dan status akun login yang terhubung.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nama Guru &amp; Gelar</th>
                  <th className="px-4 py-3">NIP / NUPTK</th>
                  <th className="px-4 py-3">Jabatan &amp; Tugas</th>
                  <th className="px-4 py-3">Akun Login Terkait</th>
                  <th className="px-4 py-3 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.map((t) => {
                  const linkedUser = users.find(
                    (u) =>
                      u.teacherId === t.id ||
                      (u.nip && t.nip && u.nip === t.nip) ||
                      u.name.toLowerCase().trim() === t.name.toLowerCase().trim()
                  );

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{t.name}</div>
                        <div className="text-[10px] text-slate-500">{t.position}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">
                        <div>NIP: {t.nip || '-'}</div>
                        <div className="text-[10px] text-slate-400">NUPTK: {t.nuptk || '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                        {t.isHomeroom && t.homeroomClassId ? (
                          <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                            Wali {classMap.get(t.homeroomClassId) || t.homeroomClassId}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">Guru Mata Pelajaran</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {linkedUser ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="font-mono font-semibold text-slate-800">@{linkedUser.username}</span>
                            <span className="text-[10px] text-slate-400">({linkedUser.role})</span>
                          </div>
                        ) : (
                          <span className="text-amber-600 font-medium italic text-[11px]">
                            Belum Dibuatkan Akun
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {linkedUser ? (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(linkedUser)}
                            className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-[11px] transition"
                          >
                            Kelola Akun
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const cleanUName = (t.name.split(',')[0].split(' ')[1] || t.name.split(' ')[0]).toLowerCase().replace(/[^a-z0-9]/g, '');
                              setEditingUser({
                                id: `usr-${t.id}`,
                                username: cleanUName,
                                name: t.name,
                                nip: t.nip,
                                teacherId: t.id,
                                role: t.isHomeroom ? 'walikelas' : 'guru',
                                classId: t.homeroomClassId,
                                status: 'active',
                                password: 'smpn1rangsang'
                              });
                              setUserPassword('smpn1rangsang');
                              setIsModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] transition shadow-2xs"
                          >
                            + Buat Akun
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              <span>Log Jejak Audit Keamanan &amp; Perubahan Hak Akses</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Seluruh riwayat login, perubahan profil akun, reset kata sandi, dan mutasi peran dicatat secara permanen.
            </p>
          </div>

          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto text-xs">
            {securityLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400">Belum ada riwayat aktivitas keamanan tercatat.</div>
            ) : (
              securityLogs.map((log) => (
                <div key={log.id} className="p-3.5 hover:bg-slate-50/80 transition flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200">
                        {log.action}
                      </span>
                      <span>Oleh: {log.userName} ({log.role})</span>
                    </div>
                    <div className="text-slate-600 text-[11px]">{log.details}</div>
                  </div>
                  <div className="text-[10px] text-slate-400 shrink-0 font-mono">
                    {log.timestamp}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT USER */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <span>{editingUser.id.startsWith('usr-admin') ? 'Edit Akun Pengguna' : 'Kelola Akun Pengguna'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold focus:outline-hidden focus:border-blue-600"
                    placeholder="Contoh: Kamaruddin, S.Pd."
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Username Login</label>
                  <input
                    type="text"
                    value={editingUser.username}
                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold focus:outline-hidden focus:border-blue-600"
                    placeholder="contoh: zulkifli"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Peran / Hak Akses</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-800 focus:outline-hidden focus:border-blue-600"
                  >
                    <option value="admin">Administrator (Hak Penuh Sistem)</option>
                    <option value="kepsek">Kepala Sekolah (Monitoring &amp; Rapor)</option>
                    <option value="walikelas">Wali Kelas (Kelola Kelas Binaan)</option>
                    <option value="guru">Guru Mata Pelajaran (Input Nilai)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Akun</label>
                  <select
                    value={editingUser.status || 'active'}
                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-800 focus:outline-hidden focus:border-blue-600"
                  >
                    <option value="active">Aktif (Dapat Login)</option>
                    <option value="inactive">Nonaktif (Diblokir)</option>
                  </select>
                </div>
              </div>

              {/* Homeroom Assignment */}
              {(editingUser.role === 'walikelas' || editingUser.classId) && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Penugasan Wali Kelas</label>
                  <select
                    value={editingUser.classId || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, classId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold focus:outline-hidden focus:border-blue-600"
                  >
                    <option value="">Pilih Rombel Binaan...</option>
                    {sortClassrooms(classrooms).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Tingkat {c.gradeLevel})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Link with Teacher */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Hubungkan Profil Guru (GTK)</label>
                <select
                  value={editingUser.teacherId || ''}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const found = teachers.find((t) => t.id === selId);
                    setEditingUser({
                      ...editingUser,
                      teacherId: selId,
                      nip: found ? found.nip : editingUser.nip
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600"
                >
                  <option value="">Bukan Guru / Akun Admin Non-Guru</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (NIP: {t.nip || 'Non-NIP'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Initial / Updated Password */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Kata Sandi Akun</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-300 font-mono focus:outline-hidden focus:border-blue-600"
                    placeholder="Masukkan kata sandi (minimal 6 karakter)"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Kata sandi default untuk akun guru adalah: <code>smpn1rangsang</code>
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RESET PASSWORD MODAL */}
      {passwordModalUser && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 text-xs">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-600" />
              <span>Reset Kata Sandi Akun</span>
            </h3>
            <p className="text-xs text-slate-600">
              Atur ulang kata sandi login untuk pengguna <strong>{passwordModalUser.name}</strong> (@{passwordModalUser.username}):
            </p>

            {passwordSuccess ? (
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2 border border-emerald-200">
                <Check className="w-4 h-4" />
                <span>Kata sandi berhasil diperbarui!</span>
              </div>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kata Sandi Baru</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 font-mono"
                    placeholder="Masukkan sandi baru..."
                    required
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPasswordModalUser(null)}
                    className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition shadow-xs"
                  >
                    Simpan Sandi Baru
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
