import React, { useState } from 'react';
import { Teacher, Subject, Classroom, User } from '../types/erapor';
import { UserCheck, Plus, Search, Filter, Edit, Trash2, X, Check, Mail, Phone, BookOpen, GraduationCap } from 'lucide-react';

interface DataGuruViewProps {
  teachers: Teacher[];
  subjects: Subject[];
  classrooms: Classroom[];
  onSaveTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (teacherId: string) => void;
  currentUser: User;
}

export const DataGuruView: React.FC<DataGuruViewProps> = ({
  teachers,
  subjects,
  classrooms,
  onSaveTeacher,
  onDeleteTeacher,
  currentUser
}) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));
  const classMap = new Map(classrooms.map((c) => [c.id, c.name]));

  const filteredTeachers = teachers.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.nip.includes(search) ||
      t.position.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || t.employmentStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleOpenAdd = () => {
    setEditingTeacher({
      id: `tch-${Date.now()}`,
      nip: '',
      nuptk: '',
      name: '',
      degree: 'S.Pd.',
      gender: 'L',
      education: 'S1 Pendidikan',
      employmentStatus: 'PNS',
      position: 'Guru Mata Pelajaran',
      phone: '',
      email: '',
      subjectsTaught: [subjects[0]?.id || 'sub-bindo'],
      isHomeroom: false
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Teacher) => {
    setEditingTeacher({ ...t });
    setIsModalOpen(true);
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTeacher) {
      onSaveTeacher(editingTeacher);
      setIsModalOpen(false);
      setEditingTeacher(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            Data Guru & Tenaga Kependidikan (GTK)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar pendidik, staf kependidikan, NIP/NUPTK, mata pelajaran yang diampu, serta penugasan wali kelas.
          </p>
        </div>

        {currentUser.role === 'admin' && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Tambah Guru Baru
          </button>
        )}
      </div>

      {/* Filter and search bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari guru, NIP, atau jabatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">Semua Status Kepegawaian</option>
            <option value="PNS">PNS</option>
            <option value="PPPK">PPPK</option>
            <option value="Guru Honor Sekolah">Guru Honor Sekolah</option>
          </select>
        </div>
      </div>

      {/* Teacher Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">No</th>
                <th className="px-4 py-3">Nama & Gelar</th>
                <th className="px-4 py-3">NIP / NUPTK</th>
                <th className="px-4 py-3">Status & Jabatan</th>
                <th className="px-4 py-3">Pendidikan</th>
                <th className="px-4 py-3">Mapel Diampu</th>
                <th className="px-4 py-3">Wali Kelas</th>
                {currentUser.role === 'admin' && (
                  <th className="px-4 py-3 text-right">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeachers.map((t, idx) => (
                <tr key={t.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-4 py-3 text-slate-500 font-medium">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800 text-[13px]">{t.name}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      {t.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {t.email}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-mono">
                    <div>{t.nip || '-'}</div>
                    <div className="text-[10px] text-slate-400">NUPTK: {t.nuptk || '-'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                        t.employmentStatus === 'PNS'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : t.employmentStatus === 'PPPK'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {t.employmentStatus}
                    </span>
                    <div className="text-slate-600 text-[11px] mt-1 font-medium">{t.position}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{t.education}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="flex flex-wrap gap-1">
                      {t.subjectsTaught.map((sId) => (
                        <span key={sId} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200">
                          {subjectMap.get(sId) || sId}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {t.isHomeroom && t.homeroomClassId ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-300">
                        {classMap.get(t.homeroomClassId) || 'Wali Kelas'}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">-</span>
                    )}
                  </td>
                  {currentUser.role === 'admin' && (
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(t)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                        title="Edit Guru"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(t.id)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                        title="Hapus Guru"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus Guru</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data guru ini? Tindakan ini akan <strong>menghapus data guru sekaligus akun hak akses pengguna terkait</strong> secara permanen dari sistem dan Cloud Firebase agar tidak muncul kembali.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onDeleteTeacher(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Teacher Modal */}
      {isModalOpen && editingTeacher && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingTeacher.id.startsWith('tch-') ? 'Edit Data Guru & GTK' : 'Tambah Guru Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap (beserta Gelar)</label>
                  <input
                    type="text"
                    value={editingTeacher.name}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bold"
                    placeholder="Contoh: Drs. Zulkifli, M.Pd."
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NIP (Nomor Induk Pegawai)</label>
                  <input
                    type="text"
                    value={editingTeacher.nip}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, nip: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    placeholder="18 digit atau kosong jika honor"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NUPTK</label>
                  <input
                    type="text"
                    value={editingTeacher.nuptk}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, nuptk: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    placeholder="16 digit NUPTK"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={editingTeacher.gender}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, gender: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="L">Laki-Laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status Kepegawaian</label>
                  <select
                    value={editingTeacher.employmentStatus}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, employmentStatus: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PNS">PNS</option>
                    <option value="PPPK">PPPK</option>
                    <option value="PPPK paruh waktu">PPPK paruh waktu</option>
                    <option value="Guru Honor Sekolah">Guru Honor Sekolah</option>
                    <option value="GTT">GTT</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jabatan / Tugas</label>
                  <input
                    type="text"
                    value={editingTeacher.position}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, position: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    placeholder="Contoh: Guru Matematika"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Pendidikan Terakhir</label>
                  <input
                    type="text"
                    value={editingTeacher.education}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, education: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    placeholder="Contoh: S1 Pendidikan Fisika - Universitas Riau"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editingTeacher.email}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor Telepon / WhatsApp</label>
                  <input
                    type="text"
                    value={editingTeacher.phone}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2 border-t border-slate-100 pt-3">
                  <label className="block font-semibold text-slate-700 mb-2">Mata Pelajaran Diampu <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-40 overflow-y-auto">
                    {subjects.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded transition">
                        <input
                          type="checkbox"
                          checked={editingTeacher.subjectsTaught.includes(s.id)}
                          onChange={(e) => {
                            const current = [...editingTeacher.subjectsTaught];
                            if (e.target.checked) {
                              setEditingTeacher({ ...editingTeacher, subjectsTaught: [...current, s.id] });
                            } else {
                              setEditingTeacher({ ...editingTeacher, subjectsTaught: current.filter(id => id !== s.id) });
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <span className="text-[11px] font-medium text-slate-700">{s.name}</span>
                      </label>
                    ))}
                  </div>
                  {editingTeacher.subjectsTaught.length === 0 && (
                    <p className="text-[10px] text-rose-500 mt-1 font-bold italic">Minimal pilih satu mata pelajaran.</p>
                  )}
                </div>

                <div className="sm:col-span-2 border-t border-slate-100 pt-3">
                  <label className="block font-semibold text-slate-700 mb-1">Penugasan Wali Kelas</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={editingTeacher.isHomeroom}
                        onChange={(e) => setEditingTeacher({ ...editingTeacher, isHomeroom: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      Bertugas sebagai Wali Kelas
                    </label>

                    {editingTeacher.isHomeroom && (
                      <select
                        value={editingTeacher.homeroomClassId || ''}
                        onChange={(e) => setEditingTeacher({ ...editingTeacher, homeroomClassId: e.target.value })}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Pilih Rombel...</option>
                        {classrooms.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs"
                >
                  Simpan Data Guru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
