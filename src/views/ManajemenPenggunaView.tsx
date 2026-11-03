import React, { useState } from 'react';
import { User, UserRole, Teacher, Classroom } from '../types/erapor';
import { ShieldCheck, Plus, Edit, Trash2, KeyRound, UserCheck, Check, X, ShieldAlert } from 'lucide-react';
import { sortClassrooms } from '../utils/classroomSort';

interface ManajemenPenggunaViewProps {
  users: User[];
  teachers: Teacher[];
  classrooms: Classroom[];
  currentUser: User;
  onSaveUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onSwitchUser: (user: User) => void;
}

export const ManajemenPenggunaView: React.FC<ManajemenPenggunaViewProps> = ({
  users,
  teachers,
  classrooms,
  currentUser,
  onSaveUser,
  onDeleteUser,
  onSwitchUser
}) => {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [passwordModalUser, setPasswordModalUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const classMap = new Map(classrooms.map((c) => [c.id, c.name]));

  const handleOpenAdd = () => {
    setEditingUser({
      id: `usr-${Date.now()}`,
      username: '',
      name: '',
      role: 'guru'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser({ ...u });
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      onSaveUser(editingUser);
      setIsModalOpen(false);
      setEditingUser(null);
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(true);
    setTimeout(() => {
      setPasswordSuccess(false);
      setPasswordModalUser(null);
      setNewPassword('');
    }, 1500);
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Manajemen Pengguna & Hak Akses
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengaturan akun otentikasi login, kata sandi, dan perizinan sistem untuk Administrator, Kepala Sekolah, Wali Kelas, dan Guru Mata Pelajaran.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          Tambah Akun Pengguna
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Nama Lengkap</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Peran / Hak Akses</th>
                <th className="px-4 py-3">Penugasan Khusus</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const b = roleBadge(u.role);
                const isCurrent = u.id === currentUser.id;

                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      {u.nip && <div className="text-[10px] text-slate-400">NIP: {u.nip}</div>}
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-slate-700">
                      @{u.username}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${b.bg}`}>
                        {b.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {u.classId ? (
                        <span className="font-semibold text-emerald-700">
                          Wali {classMap.get(u.classId) || u.classId}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Aktif
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      {!isCurrent && (
                        <button
                          onClick={() => onSwitchUser(u)}
                          className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-semibold transition"
                          title="Beralih ke akun ini untuk simulasi"
                        >
                          Masuk
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setPasswordModalUser(u);
                          setNewPassword('');
                        }}
                        className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition"
                        title="Reset Kata Sandi"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                        title="Edit Pengguna"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {users.length > 1 && !isCurrent && (
                        <button
                          onClick={() => {
                            if (confirm(`Yakin ingin menghapus akun @${u.username}?`)) {
                              onDeleteUser(u.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                          title="Hapus Akun"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Add / Edit User Modal */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingUser.id.startsWith('usr-admin') ? 'Edit Akun Pengguna' : 'Kelola Akun Pengguna'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Username Login</label>
                <input
                  type="text"
                  value={editingUser.username}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hak Akses / Peran</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="admin">Administrator (Hak Penuh Sistem)</option>
                  <option value="kepsek">Kepala Sekolah (Monitoring & Pengesahan)</option>
                  <option value="walikelas">Wali Kelas (Kelola Rapor Rombel)</option>
                  <option value="guru">Guru Mata Pelajaran (Input Nilai & TP)</option>
                </select>
              </div>

              {editingUser.role === 'walikelas' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Penugasan Rombel</label>
                  <select
                    value={editingUser.classId || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, classId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Pilih Rombel...</option>
                    {sortClassrooms(classrooms).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">NIP (Opsional)</label>
                <input
                  type="text"
                  value={editingUser.nip || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, nip: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono focus:ring-2 focus:ring-blue-500"
                  placeholder="18 digit NIP"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {passwordModalUser && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-600" />
              Reset Kata Sandi
            </h3>
            <p className="text-xs text-slate-600">
              Ubah kata sandi login untuk pengguna <strong>@{passwordModalUser.username}</strong>:
            </p>

            {passwordSuccess ? (
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4" />
                Kata sandi berhasil diperbarui!
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kata Sandi Baru</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="Masukkan sandi baru..."
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPasswordModalUser(null)}
                    className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold"
                  >
                    Simpan Sandi
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
