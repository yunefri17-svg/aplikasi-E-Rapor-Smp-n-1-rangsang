import React, { useState } from 'react';
import { User, Teacher, Classroom } from '../types/erapor';
import {
  ShieldCheck,
  UserCheck,
  Plus,
  Edit,
  Trash2,
  KeyRound,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lock,
  Search,
  LogIn,
  Layers,
  Users
} from 'lucide-react';
import { sortClassrooms } from '../utils/classroomSort';

interface ManajemenWaliKelasViewProps {
  users: User[];
  teachers: Teacher[];
  classrooms: Classroom[];
  currentUser: User;
  onSaveWaliKelas: (user: User, teacherId: string, classId: string) => void;
  onDeleteUser: (userId: string) => void;
  onToggleStatus: (userId: string, newStatus: 'active' | 'inactive') => void;
  onResetPassword: (userId: string, newPass: string) => void;
  onSwitchUser: (user: User) => void;
}

export const ManajemenWaliKelasView: React.FC<ManajemenWaliKelasViewProps> = ({
  users,
  teachers,
  classrooms,
  currentUser,
  onSaveWaliKelas,
  onDeleteUser,
  onToggleStatus,
  onResetPassword,
  onSwitchUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  // Form fields
  const [formTeacherId, setFormTeacherId] = useState('');
  const [formClassId, setFormClassId] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formName, setFormName] = useState('');
  const [formPassword, setFormPassword] = useState('walikelas123');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');

  // Password reset modal
  const [passwordModalUser, setPasswordModalUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Filter users to only Wali Kelas
  const waliKelasUsers = users.filter((u) => u.role === 'walikelas');

  const sortedClassrooms = sortClassrooms(classrooms);

  // Mapping lookup
  const classMap = new Map(classrooms.map((c) => [c.id, c.name]));
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));

  // Filtered list
  const filteredList = waliKelasUsers.filter((u) => {
    const q = searchTerm.toLowerCase();
    const clsName = u.classId ? classMap.get(u.classId) || '' : '';
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      clsName.toLowerCase().includes(q)
    );
  });

  const handleOpenAdd = () => {
    setEditingUserId(null);
    setFormTeacherId(teachers[0]?.id || '');
    setFormClassId(classrooms[0]?.id || '');
    setFormUsername('walikelas_baru');
    setFormName(teachers[0]?.name || 'Wali Kelas');
    setFormPassword('walikelas123');
    setFormStatus('active');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUserId(user.id);
    setFormTeacherId(user.teacherId || '');
    setFormClassId(user.classId || '');
    setFormUsername(user.username);
    setFormName(user.name);
    setFormPassword(user.password || 'walikelas123');
    setFormStatus(user.status || 'active');
    setIsModalOpen(true);
  };

  const handleTeacherChange = (tId: string) => {
    setFormTeacherId(tId);
    const t = teacherMap.get(tId);
    if (t) {
      setFormName(t.name);
      if (!editingUserId) {
        // Auto-generate username suggestion
        const cleanName = t.name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 10);
        setFormUsername(`wali_${cleanName}`);
      }
      if (t.homeroomClassId) {
        setFormClassId(t.homeroomClassId);
      }
    }
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTeacherId || !formClassId || !formUsername) {
      alert('Mohon lengkapi seluruh isian data akun wali kelas.');
      return;
    }

    const targetUser: User = {
      id: editingUserId || `usr-wk-${Date.now()}`,
      username: formUsername.trim().toLowerCase(),
      name: formName.trim(),
      role: 'walikelas',
      teacherId: formTeacherId,
      classId: formClassId,
      status: formStatus,
      password: formPassword
    };

    onSaveWaliKelas(targetUser, formTeacherId, formClassId);
    setIsModalOpen(false);
  };

  const handleExecutePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || !newPassword.trim()) return;

    onResetPassword(passwordModalUser.id, newPassword.trim());
    setPasswordSuccess(true);
    setTimeout(() => {
      setPasswordSuccess(false);
      setPasswordModalUser(null);
      setNewPassword('');
    }, 1200);
  };

  // Find if class already has assigned user (for warning)
  const existingHolder = formClassId
    ? waliKelasUsers.find((u) => u.classId === formClassId && u.id !== editingUserId)
    : null;

  return (
    <div className="space-y-6">
      {/* Header & Overview */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Administrator Keamanan
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              RBAC Aktif
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            Manajemen Akun Wali Kelas
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Pengaturan hak akses ketat wali kelas VII.1 s/d IX.3. Setiap akun dibatasi secara otomatis hanya dapat mengelola 1 rombongan belajar.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-medium transition shadow-sm text-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Akun Wali Kelas
        </button>
      </div>

      {/* Security Info Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
          <Lock className="w-5 h-5" />
        </div>
        <div className="flex-1 text-sm text-blue-900">
          <p className="font-semibold text-blue-950 mb-1">
            Aturan Hak Akses Wali Kelas (Role-Based Access Control)
          </p>
          <p className="text-blue-800 leading-relaxed text-xs">
            1. Wali kelas hanya dapat melihat, menginput nilai, mencatat kehadiran, dan mencetak rapor untuk kelas binaannya.
            <br />
            2. Akses ke rombongan belajar lain diblokir total pada level database dan sistem validasi dengan pesan penolakan resmi.
            <br />
            3. Penugasan guru ke rombel akan otomatis menyinkronkan data rombongan belajar, data guru, dan akun pengguna.
          </p>
        </div>
        <div className="hidden lg:flex items-center gap-3 pl-4 border-l border-blue-200 shrink-0">
          <div className="text-center">
            <span className="block text-2xl font-bold text-blue-800">{waliKelasUsers.length}</span>
            <span className="text-xs text-blue-600 font-medium">Akun Terdaftar</span>
          </div>
          <div className="text-center">
            <span className="block text-2xl font-bold text-emerald-700">
              {waliKelasUsers.filter((u) => u.status !== 'inactive').length}
            </span>
            <span className="text-xs text-emerald-600 font-medium">Akun Aktif</span>
          </div>
          <div className="text-center">
            <span className="block text-2xl font-bold text-purple-700">{classrooms.length}</span>
            <span className="text-xs text-purple-600 font-medium">Rombel</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari guru, username, kelas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-xs text-gray-500">
            Menampilkan <span className="font-semibold text-gray-700">{filteredList.length}</span> dari{' '}
            <span className="font-semibold text-gray-700">{waliKelasUsers.length}</span> akun wali kelas
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-600 border-b border-gray-100">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Guru & NIP</th>
                <th className="py-3 px-4">Username Akun</th>
                <th className="py-3 px-4">Kelas Binaan (Rombel)</th>
                <th className="py-3 px-4">Hak Akses Sistem</th>
                <th className="py-3 px-4 text-center">Status Akun</th>
                <th className="py-3 px-4 text-center">Aksi & Uji Akses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredList.map((user, idx) => {
                const teacher = user.teacherId ? teacherMap.get(user.teacherId) : null;
                const className = user.classId ? classMap.get(user.classId) || 'Tidak Terhubung' : 'Belum Ditugaskan';
                const isActive = user.status !== 'inactive';

                return (
                  <tr key={user.id} className="hover:bg-blue-50/40 transition">
                    <td className="py-3.5 px-4 text-center font-medium text-gray-400">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {user.name.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500 font-mono">
                            NIP: {teacher?.nip || '-'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded border border-gray-200">
                        @{user.username}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        <Layers className="w-3.5 h-3.5" />
                        {className}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-xs">
                        <span className="font-medium text-emerald-700">Khusus {className}</span>
                        <p className="text-[11px] text-gray-400">Blokir kelas lainnya</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => onToggleStatus(user.id, isActive ? 'inactive' : 'active')}
                        title={isActive ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {isActive ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Aktif
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" /> Nonaktif
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Test login switch */}
                        <button
                          onClick={() => onSwitchUser(user)}
                          title={`Uji Akses: Masuk sebagai ${user.name}`}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                        >
                          <LogIn className="w-4 h-4" />
                        </button>
                        {/* Reset password */}
                        <button
                          onClick={() => {
                            setPasswordModalUser(user);
                            setNewPassword('');
                          }}
                          title="Reset Password"
                          className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-lg transition"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        {/* Edit */}
                        <button
                          onClick={() => handleOpenEdit(user)}
                          title="Edit Akun & Penugasan Kelas"
                          className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => {
                            if (confirm(`Yakin ingin menghapus akun wali kelas ${user.name}?`)) {
                              onDeleteUser(user.id);
                            }
                          }}
                          title="Hapus Akun"
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Wali Kelas */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-700" />
                <h3 className="text-lg font-bold text-gray-800">
                  {editingUserId ? 'Edit Akun & Penugasan Wali Kelas' : 'Tambah Akun Wali Kelas Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Pilih Guru yang Ditugaskan <span className="text-red-500">*</span>
                </label>
                <select
                  value={formTeacherId}
                  onChange={(e) => handleTeacherChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                >
                  <option value="">-- Pilih Guru --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (NIP: {t.nip})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Rombongan Belajar Tanggung Jawab (VII 1 - IX 3) <span className="text-red-500">*</span>
                </label>
                <select
                  value={formClassId}
                  onChange={(e) => setFormClassId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-blue-800"
                  required
                >
                  <option value="">-- Pilih Rombel --</option>
                  {sortedClassrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Tingkat {c.gradeLevel === '7' ? 'VII' : c.gradeLevel === '8' ? 'VIII' : 'IX'})
                    </option>
                  ))}
                </select>
                {existingHolder && (
                  <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Catatan: Rombel ini saat ini ditugaskan ke {existingHolder.name}. Menyimpan akan mengalihkan kelas ke guru baru.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Username Login <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="contoh: walikelas_vii1"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Status Akun <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="active">Aktif (Dapat Login)</option>
                    <option value="inactive">Nonaktif (Akses Diblokir)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nama Tampilan Akun
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              {!editingUserId && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Password Awal
                  </label>
                  <input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Default password disarankan: walikelas123
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg transition shadow-sm"
                >
                  Simpan Penugasan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold text-gray-800">
                Reset Password Akun
              </h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Atur ulang password untuk akun{' '}
              <span className="font-semibold text-gray-700">{passwordModalUser.name}</span> (@{passwordModalUser.username}).
            </p>

            <form onSubmit={handleExecutePasswordReset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Password Baru
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan password baru..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  required
                />
              </div>

              {passwordSuccess && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Password berhasil diperbarui!
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg"
                >
                  Simpan Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
