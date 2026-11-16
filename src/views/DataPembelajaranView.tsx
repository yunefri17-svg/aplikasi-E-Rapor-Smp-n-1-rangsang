import React, { useState, useMemo, useEffect } from 'react';
import {
  AssessmentPolicyConfig,
  Curriculum,
  LearningObjective,
  Subject,
  Teacher,
  TeachingAssignment,
  User
} from '../types/erapor';
import { ClipboardList, Plus, Edit, Trash2, X, Lock, Layers } from 'lucide-react';
import { sortSubjects } from '../utils/subjectSort';
import { isPeriodInputLocked } from '../utils/tpAnalysisAndDescription';

interface DataPembelajaranViewProps {
  learningObjectives: LearningObjective[];
  subjects: Subject[];
  curricula: Curriculum[];
  onSaveObjective: (obj: LearningObjective) => void;
  onDeleteObjective: (objId: string) => void;
  currentUser: User;
  academicYear?: string;
  semester?: 'Ganjil' | 'Genap';
  teachingAssignments?: TeachingAssignment[];
  teachers?: Teacher[];
  assessmentPolicy?: AssessmentPolicyConfig;
}

export const DataPembelajaranView: React.FC<DataPembelajaranViewProps> = ({
  learningObjectives,
  subjects,
  curricula: _curricula,
  onSaveObjective,
  onDeleteObjective,
  currentUser,
  academicYear = '2026/2027',
  semester = 'Ganjil',
  teachingAssignments = [],
  teachers = [],
  assessmentPolicy
}) => {
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'kepsek';
  const isWaliKelasOnly = currentUser.role === 'walikelas';
  const isLocked =
    currentUser.role !== 'admin' && isPeriodInputLocked(assessmentPolicy, academicYear, semester);
  const isReadOnly = isLocked || isWaliKelasOnly;

  const currentTeacher = useMemo(
    () =>
      teachers.find(
        (t) =>
          (currentUser.teacherId && t.id === currentUser.teacherId) ||
          (currentUser.nip && t.nip === currentUser.nip) ||
          t.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim()
      ),
    [teachers, currentUser]
  );

  const visibleSubjects = useMemo(() => {
    const sorted = sortSubjects(subjects);
    if (isAdmin || isWaliKelasOnly) return sorted;
    const teacherId = currentTeacher?.id || currentUser.teacherId;
    const assignedIds = teachingAssignments
      .filter((ta) => ta.teacherId === teacherId && ta.status !== 'inactive')
      .map((ta) => ta.subjectId);
    const combined = Array.from(
      new Set([...assignedIds, ...(currentTeacher?.subjectsTaught || [])])
    );
    if (combined.length > 0) {
      const filtered = sorted.filter((s) => combined.includes(s.id));
      if (filtered.length > 0) return filtered;
    }
    return sorted;
  }, [subjects, isAdmin, isWaliKelasOnly, currentTeacher, currentUser.teacherId, teachingAssignments]);

  const [selectedSubject, setSelectedSubject] = useState<string>(
    visibleSubjects[0]?.id || subjects[0]?.id || 'sub-bindo'
  );
  const [selectedGrade, setSelectedGrade] = useState<'7' | '8' | '9'>('7');
  const [selectedSemester, setSelectedSemester] = useState<'Semua' | 'Ganjil' | 'Genap'>(semester);
  const [editingObj, setEditingObj] = useState<LearningObjective | null>(null);
  const [isNewModal, setIsNewModal] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (visibleSubjects.length > 0 && !visibleSubjects.some((s) => s.id === selectedSubject)) {
      setSelectedSubject(visibleSubjects[0].id);
    }
  }, [visibleSubjects, selectedSubject]);

  const filteredObjectives = useMemo(() => {
    return learningObjectives.filter((tp) => {
      if (tp.subjectId !== selectedSubject) return false;
      if (tp.gradeLevel !== selectedGrade) return false;
      if (selectedSemester !== 'Semua' && tp.semester !== selectedSemester) return false;
      if (tp.academicYear && academicYear && tp.academicYear !== academicYear) return false;
      return true;
    });
  }, [learningObjectives, selectedSubject, selectedGrade, selectedSemester, academicYear]);

  const handleOpenAdd = () => {
    if (isReadOnly) return;
    const nextNum = filteredObjectives.length + 1;
    const defaultSem = selectedSemester === 'Semua' ? semester : selectedSemester;
    setEditingObj({
      id: `tp-${selectedSubject}-${selectedGrade}.${nextNum}-${Date.now()}`,
      curriculumId: 'cur-merdeka',
      subjectId: selectedSubject,
      gradeLevel: selectedGrade,
      code: `TP ${selectedGrade}.${nextNum}`,
      materi: '',
      description: '',
      semester: defaultSem,
      phase: 'Fase D',
      academicYear: '',
      createdByTeacherId: currentTeacher?.id || currentUser.teacherId || ''
    });
    setIsNewModal(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (obj: LearningObjective) => {
    if (isReadOnly) return;
    setEditingObj({
      phase: 'Fase D',
      materi: '',
      ...obj
    });
    setIsNewModal(false);
    setIsModalOpen(true);
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingObj || isReadOnly) return;
    onSaveObjective({
      ...editingObj,
      phase: editingObj.phase || 'Fase D',
      materi: (editingObj.materi || '').trim() || undefined,
      academicYear: editingObj.academicYear ? editingObj.academicYear.trim() : undefined,
      updatedAt: new Date().toISOString()
    });
    setIsModalOpen(false);
    setEditingObj(null);
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
            Kelola rumusan Tujuan Pembelajaran (TP) beserta lingkup materi, fase, semester, dan tahun ajaran sebagai acuan asesmen formatif, sumatif, dan deskripsi rapor.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          disabled={isReadOnly}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          Tambah Tujuan Pembelajaran (TP)
        </button>
      </div>

      {isLocked && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Periode Input Nilai Terkunci ({academicYear} {semester}):</strong> Perubahan Tujuan Pembelajaran dinonaktifkan sementara oleh Administrator.
          </span>
        </div>
      )}

      {/* Selectors */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700">Mata Pelajaran:</span>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 bg-white"
          >
            {visibleSubjects.map((s) => (
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
            onChange={(e) => setSelectedGrade(e.target.value as '7' | '8' | '9')}
            className="px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bold bg-white"
          >
            <option value="7">Kelas VII (Fase D)</option>
            <option value="8">Kelas VIII (Fase D)</option>
            <option value="9">Kelas IX (Fase D)</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700">Semester:</span>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value as 'Semua' | 'Ganjil' | 'Genap')}
            className="px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bold bg-white"
          >
            <option value="Ganjil">Ganjil</option>
            <option value="Genap">Genap</option>
            <option value="Semua">Semua Semester</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 font-medium ml-auto">
          Ditemukan: <strong>{filteredObjectives.length}</strong> TP aktif ({academicYear})
        </span>
      </div>

      {/* Objectives Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-center w-28">Kode TP</th>
                <th className="px-4 py-3 w-48">Lingkup Materi</th>
                <th className="px-4 py-3">Deskripsi Tujuan Pembelajaran (Kompetensi)</th>
                <th className="px-4 py-3 text-center w-36">Fase / Periode</th>
                <th className="px-4 py-3 text-right w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredObjectives.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Belum ada Tujuan Pembelajaran untuk mata pelajaran ini di Kelas {selectedGrade} ({selectedSemester}).
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
                    <td className="px-4 py-3 text-slate-700 font-semibold">
                      {tp.materi ? (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                          <Layers className="w-3 h-3 shrink-0" />
                          {tp.materi}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Umum / Lintas Materi</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-medium leading-relaxed max-w-xl">
                      {tp.description}
                    </td>
                    <td className="px-4 py-3 text-center space-y-1">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {tp.phase || 'Fase D'} • {tp.semester}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {tp.academicYear ? `TP ${tp.academicYear}` : 'Semua Tahun'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(tp)}
                        disabled={isReadOnly}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-40 transition"
                        title="Edit TP"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(tp.id)}
                        disabled={isReadOnly}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-40 transition"
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {isNewModal ? 'Tambah Tujuan Pembelajaran' : 'Edit Tujuan Pembelajaran'}
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
                    onChange={(e) =>
                      setEditingObj({ ...editingObj, semester: e.target.value as 'Ganjil' | 'Genap' })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Ganjil">Semester Ganjil</option>
                    <option value="Genap">Semester Genap</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fase</label>
                  <input
                    type="text"
                    value={editingObj.phase || 'Fase D'}
                    onChange={(e) => setEditingObj({ ...editingObj, phase: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    placeholder="Fase D"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tahun Ajaran</label>
                  <select
                    value={editingObj.academicYear || ''}
                    onChange={(e) => setEditingObj({ ...editingObj, academicYear: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Berlaku Lintas Tahun</option>
                    <option value={academicYear}>Khusus TP {academicYear}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Materi / Lingkup Kompetensi
                </label>
                <input
                  type="text"
                  value={editingObj.materi || ''}
                  onChange={(e) => setEditingObj({ ...editingObj, materi: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  placeholder="Contoh: Teks Deskripsi / Bilangan Bulat / Ekosistem"
                />
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
                  Rumusan ini digunakan sebagai acuan analisis formatif-sumatif dan kalimat deskripsi capaian otomatis di lembar rapor.
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
