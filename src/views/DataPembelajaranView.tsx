import React, { useState } from 'react';
import { LearningObjective, Subject, Curriculum, User } from '../types/erapor';
import { ClipboardList, Plus, Edit, Trash2, X, Filter, Sparkles, Check } from 'lucide-react';

interface DataPembelajaranViewProps {
  learningObjectives: LearningObjective[];
  subjects: Subject[];
  curricula: Curriculum[];
  onSaveObjective: (obj: LearningObjective) => void;
  onDeleteObjective: (objId: string) => void;
  currentUser: User;
}

export const DataPembelajaranView: React.FC<DataPembelajaranViewProps> = ({
  learningObjectives,
  subjects,
  curricula,
  onSaveObjective,
  onDeleteObjective,
  currentUser
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>(subjects[0]?.id || 'sub-bindo');
  const [selectedGrade, setSelectedGrade] = useState<'7' | '8' | '9'>('7');
  const [editingObj, setEditingObj] = useState<LearningObjective | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

  const filteredObjectives = learningObjectives.filter(
    (tp) => tp.subjectId === selectedSubject && tp.gradeLevel === selectedGrade
  );

  const handleOpenAdd = () => {
    const nextNum = filteredObjectives.length + 1;
    setEditingObj({
      id: `tp-${selectedSubject}-${selectedGrade}.${nextNum}-${Date.now()}`,
      curriculumId: 'cur-merdeka',
      subjectId: selectedSubject,
      gradeLevel: selectedGrade,
      code: `TP ${selectedGrade}.${nextNum}`,
      description: '',
      semester: 'Ganjil'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (obj: LearningObjective) => {
    setEditingObj({ ...obj });
    setIsModalOpen(true);
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingObj) {
      onSaveObjective(editingObj);
      setIsModalOpen(false);
      setEditingObj(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            Capaian & Tujuan Pembelajaran (CP / TP)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola rumusan Tujuan Pembelajaran (TP) per mata pelajaran dan tingkat kelas sebagai dasar penilaian formatif-sumatif dan deskripsi rapor.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          Tambah Tujuan Pembelajaran (TP)
        </button>
      </div>

      {/* Selectors */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700">Mata Pelajaran:</span>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 bg-white"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700">Tingkat Kelas:</span>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value as any)}
            className="px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bold bg-white"
          >
            <option value="7">Kelas VII (Fase D)</option>
            <option value="8">Kelas VIII (Fase D)</option>
            <option value="9">Kelas IX (Fase D)</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 font-medium ml-auto">
          Ditemukan: <strong>{filteredObjectives.length}</strong> Tujuan Pembelajaran aktif
        </span>
      </div>

      {/* Objectives Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-center">Kode TP</th>
                <th className="px-4 py-3">Deskripsi Tujuan Pembelajaran (Kompetensi)</th>
                <th className="px-4 py-3 text-center">Semester</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredObjectives.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    Belum ada Tujuan Pembelajaran yang ditambahkan untuk mata pelajaran ini di Kelas {selectedGrade}.
                  </td>
                </tr>
              ) : (
                filteredObjectives.map((tp) => (
                  <tr key={tp.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 text-center font-mono font-bold text-blue-700">
                      <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                        {tp.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-medium leading-relaxed max-w-xl">
                      {tp.description}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {tp.semester}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(tp)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                        title="Edit TP"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(tp.id)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                        title="Hapus TP"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus TP</h3>
            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin menghapus Tujuan Pembelajaran ini?
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
                  onDeleteObjective(deleteConfirmId);
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

      {/* Add / Edit TP Modal */}
      {isModalOpen && editingObj && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingObj.id.includes('tp-') ? 'Edit Tujuan Pembelajaran' : 'Tambah Tujuan Pembelajaran'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode TP</label>
                  <input
                    type="text"
                    value={editingObj.code}
                    onChange={(e) => setEditingObj({ ...editingObj, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                    placeholder="Contoh: TP 7.1"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Semester</label>
                  <select
                    value={editingObj.semester}
                    onChange={(e) => setEditingObj({ ...editingObj, semester: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Ganjil">Semester Ganjil</option>
                    <option value="Genap">Semester Genap</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Deskripsi Tujuan Pembelajaran (Kata Kerja Operasional / Kompetensi)
                </label>
                <textarea
                  value={editingObj.description}
                  onChange={(e) => setEditingObj({ ...editingObj, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 leading-relaxed"
                  rows={4}
                  placeholder="Contoh: Memahami dan menganalisis teks deskripsi objek alam, budaya, dan kearifan lokal Melayu Riau secara kritis..."
                  required
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Rumusan ini digunakan sebagai acuan kalimat deskripsi capaian otomatis di lembar rapor.
                </span>
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
                  Simpan TP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
