import React, { useState } from 'react';
import { Subject, User } from '../types/erapor';
import { BookMarked, Plus, Edit, Trash2, X, Check, Layers, Award } from 'lucide-react';

import { sortSubjects } from '../utils/subjectSort';

interface DataMapelViewProps {
  subjects: Subject[];
  onSaveSubject: (subject: Subject) => void;
  onDeleteSubject: (subjectId: string) => void;
  currentUser: User;
}

export const DataMapelView: React.FC<DataMapelViewProps> = ({
  subjects,
  onSaveSubject,
  onDeleteSubject,
  currentUser
}) => {
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setEditingSubject({
      id: `sub-${Date.now()}`,
      code: 'MULOK',
      name: '',
      category: 'Muatan Lokal',
      orderIndex: subjects.length + 1,
      kkm: 75
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Subject) => {
    setEditingSubject({ ...s });
    setIsModalOpen(true);
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSubject) {
      onSaveSubject(editingSubject);
      setIsModalOpen(false);
      setEditingSubject(null);
    }
  };

  const sortedSubjects = sortSubjects(subjects);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-blue-600" />
            Data Mata Pelajaran Resmi SMP
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar muatan kurikulum, pengelompokan mata pelajaran (A, B, Muatan Lokal), KKM/KKTP acuan, dan urutan cetak rapor.
          </p>
        </div>

        {currentUser.role === 'admin' && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Tambah Mata Pelajaran
          </button>
        )}
      </div>

      {/* Table of subjects */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-center">Urutan</th>
                <th className="px-4 py-3">Kode Mapel</th>
                <th className="px-4 py-3">Nama Mata Pelajaran</th>
                <th className="px-4 py-3">Kelompok Kurikulum</th>
                <th className="px-4 py-3 text-center">KKM / KKTP Acuan</th>
                {currentUser.role === 'admin' && (
                  <th className="px-4 py-3 text-right">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedSubjects.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-4 py-3 text-center font-bold text-slate-600 font-mono">
                    {sub.orderIndex}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-blue-700">
                    {sub.code}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-800 text-[13px]">
                    {sub.name}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                        sub.category === 'A'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : sub.category === 'B'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      Kelompok {sub.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-slate-800">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      {sub.kkm}
                    </span>
                  </td>
                  {currentUser.role === 'admin' && (
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(sub)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                        title="Edit Mapel"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(sub.id)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                        title="Hapus Mapel"
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
            <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus Mapel</h3>
            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin menghapus mata pelajaran ini? Seluruh nilai dan TP yang terkait juga akan dihapus.
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
                  onDeleteSubject(deleteConfirmId);
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

      {/* Add / Edit Subject Modal */}
      {isModalOpen && editingSubject && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingSubject.id.startsWith('sub-') ? 'Edit Data Mata Pelajaran' : 'Tambah Mapel Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Mata Pelajaran</label>
                <input
                  type="text"
                  value={editingSubject.name}
                  onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bold"
                  placeholder="Contoh: Matematika"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode Singkat</label>
                  <input
                    type="text"
                    value={editingSubject.code}
                    onChange={(e) => setEditingSubject({ ...editingSubject, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                    placeholder="Contoh: MTK"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor Urut Rapor</label>
                  <input
                    type="number"
                    value={editingSubject.orderIndex}
                    onChange={(e) => setEditingSubject({ ...editingSubject, orderIndex: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                    min={1}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kelompok Kurikulum</label>
                <select
                  value={editingSubject.category}
                  onChange={(e) => setEditingSubject({ ...editingSubject, category: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-semibold"
                >
                  <option value="A">Kelompok A (Wajib Inti)</option>
                  <option value="B">Kelompok B (Pengembangan Diri / Keterampilan)</option>
                  <option value="Muatan Lokal">Muatan Lokal (BMR / Khas Daerah)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nilai KKM / Kriteria Minimal</label>
                <input
                  type="number"
                  value={editingSubject.kkm}
                  onChange={(e) => setEditingSubject({ ...editingSubject, kkm: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bold"
                  min={50}
                  max={100}
                  required
                />
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
                  Simpan Mapel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
