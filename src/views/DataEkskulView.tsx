import React, { useState, useEffect, useMemo } from 'react';
import {
  Extracurricular,
  StudentExtracurricular,
  Classroom,
  Student,
  User
} from '../types/erapor';
import { Activity, Plus, Edit, Trash2, X, Check, Save, Info } from 'lucide-react';
import { SecurityAccessDenied } from '../components/SecurityAccessDenied';
import { sortClassrooms } from '../utils/classroomSort';
import { sortStudentsAlphabetically } from '../utils/studentSort';

interface DataEkskulViewProps {
  extracurriculars: Extracurricular[];
  studentExtracurriculars: StudentExtracurricular[];
  classrooms: Classroom[];
  students: Student[];
  onSaveExtracurricular: (ekskul: Extracurricular) => void;
  onDeleteExtracurricular: (id: string) => void;
  onSaveStudentEkskul: (record: StudentExtracurricular) => void;
  onSaveStudentEkskulBatch?: (
    recordsToSave: StudentExtracurricular[],
    recordIdsToDelete: string[]
  ) => void;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  currentUser: User;
}

interface StudentEkskulDraft {
  participating: boolean;
  predicate: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang';
  description: string;
  existingId?: string;
}

const DEFAULT_EKSKUL_DESC =
  'Aktif mengikuti kegiatan ekstrakurikuler dengan penuh kedisiplinan dan kerja sama yang baik.';

export const DataEkskulView: React.FC<DataEkskulViewProps> = ({
  extracurriculars,
  studentExtracurriculars,
  classrooms,
  students,
  onSaveExtracurricular,
  onDeleteExtracurricular,
  onSaveStudentEkskul,
  onSaveStudentEkskulBatch,
  academicYear,
  semester,
  currentUser
}) => {
  const isWaliKelas = currentUser.role === 'walikelas';
  const authorizedClass = classrooms.find((c) => c.id === currentUser.classId);

  const sortedAllClassrooms = useMemo(() => sortClassrooms(classrooms), [classrooms]);

  const [activeTab, setActiveTab] = useState<'kegiatan' | 'penilaian'>(
    isWaliKelas ? 'penilaian' : 'kegiatan'
  );
  const [selectedClass, setSelectedClass] = useState<string>(
    isWaliKelas && currentUser.classId
      ? currentUser.classId
      : sortedAllClassrooms[0]?.id || 'cls-vii-1'
  );
  const [selectedEkskul, setSelectedEkskul] = useState<string>(
    extracurriculars[0]?.id || 'ekskul-1'
  );

  // Security check: if Wali Kelas attempts to access another class
  const isUnauthorized =
    isWaliKelas && currentUser.classId && selectedClass !== currentUser.classId;
  const attemptedClass = isUnauthorized ? classrooms.find((c) => c.id === selectedClass) : null;

  if (isUnauthorized) {
    return (
      <SecurityAccessDenied
        currentUser={currentUser}
        authorizedClassroom={authorizedClass}
        targetClassroom={attemptedClass}
        onResetToAuthorizedClass={() => setSelectedClass(currentUser.classId || '')}
      />
    );
  }

  const visibleClassrooms = isWaliKelas
    ? sortedAllClassrooms.filter((c) => c.id === currentUser.classId)
    : sortedAllClassrooms;

  // Keep selectedEkskul valid if master list changes
  useEffect(() => {
    if (
      extracurriculars.length > 0 &&
      !extracurriculars.some((e) => e.id === selectedEkskul)
    ) {
      setSelectedEkskul(extracurriculars[0].id);
    }
  }, [extracurriculars, selectedEkskul]);

  // Master modal
  const [editingEkskul, setEditingEkskul] = useState<Extracurricular | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const classStudents = useMemo(
    () => sortStudentsAlphabetically(students.filter((s) => s.classId === selectedClass)),
    [students, selectedClass]
  );

  const [studentDrafts, setStudentDrafts] = useState<Record<string, StudentEkskulDraft>>({});
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Sync draft state whenever class, extracurricular, period, or saved records change
  useEffect(() => {
    const nextDrafts: Record<string, StudentEkskulDraft> = {};
    const existingByStudent = new Map<string, StudentExtracurricular>();

    studentExtracurriculars.forEach((se) => {
      if (
        se.extracurricularId === selectedEkskul &&
        se.academicYear === academicYear &&
        se.semester === semester
      ) {
        existingByStudent.set(se.studentId, se);
      }
    });

    classStudents.forEach((std) => {
      const existing = existingByStudent.get(std.id);
      if (existing) {
        nextDrafts[std.id] = {
          participating: true,
          predicate: existing.predicate || 'Baik',
          description: existing.description || DEFAULT_EKSKUL_DESC,
          existingId: existing.id
        };
      } else {
        nextDrafts[std.id] = {
          participating: false,
          predicate: 'Baik',
          description: DEFAULT_EKSKUL_DESC
        };
      }
    });

    setStudentDrafts(nextDrafts);
  }, [classStudents, studentExtracurriculars, selectedEkskul, academicYear, semester]);

  const participantCount = useMemo(
    () =>
      classStudents.filter((std) => Boolean(studentDrafts[std.id]?.participating)).length,
    [classStudents, studentDrafts]
  );

  const allSelected = classStudents.length > 0 && participantCount === classStudents.length;

  const handleToggleAllParticipants = (checked: boolean) => {
    setStudentDrafts((prev) => {
      const next = { ...prev };
      classStudents.forEach((std) => {
        const cur = next[std.id] || {
          participating: false,
          predicate: 'Baik' as const,
          description: DEFAULT_EKSKUL_DESC
        };
        next[std.id] = { ...cur, participating: checked };
      });
      return next;
    });
  };

  const handleToggleStudentParticipation = (studentId: string, checked: boolean) => {
    setStudentDrafts((prev) => {
      const cur = prev[studentId] || {
        participating: false,
        predicate: 'Baik' as const,
        description: DEFAULT_EKSKUL_DESC
      };
      return {
        ...prev,
        [studentId]: { ...cur, participating: checked }
      };
    });
  };

  const handleOpenAddMaster = () => {
    setEditingEkskul({
      id: `ekskul-${Date.now()}`,
      name: '',
      coachName: '',
      dayAndTime: 'Jumat, 15:30 WIB',
      description: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditMaster = (e: Extracurricular) => {
    setEditingEkskul({ ...e });
    setIsModalOpen(true);
  };

  const handleSaveMaster = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEkskul) {
      onSaveExtracurricular(editingEkskul);
      setIsModalOpen(false);
      setEditingEkskul(null);
    }
  };

  const handleSaveAllGrades = () => {
    const cleanYear = (academicYear || '').replace(/\//g, '_');
    const toSave: StudentExtracurricular[] = [];
    const toDeleteIds: string[] = [];

    // Also inspect all stored records matching current class students + selectedEkskul + period
    const existingRecordsByStudent = new Map<string, StudentExtracurricular[]>();
    studentExtracurriculars.forEach((se) => {
      if (
        se.extracurricularId === selectedEkskul &&
        se.academicYear === academicYear &&
        se.semester === semester
      ) {
        const arr = existingRecordsByStudent.get(se.studentId) || [];
        arr.push(se);
        existingRecordsByStudent.set(se.studentId, arr);
      }
    });

    classStudents.forEach((std) => {
      const draft = studentDrafts[std.id];
      const existingList = existingRecordsByStudent.get(std.id) || [];

      if (draft?.participating) {
        toSave.push({
          id:
            draft.existingId ||
            existingList[0]?.id ||
            `se-${std.id}-${selectedEkskul}-${cleanYear}-${semester}`,
          studentId: std.id,
          extracurricularId: selectedEkskul,
          classId: selectedClass,
          academicYear,
          semester,
          predicate: draft.predicate,
          description: (draft.description || '').trim() || DEFAULT_EKSKUL_DESC
        });
      } else {
        existingList.forEach((rec) => {
          if (rec.id) toDeleteIds.push(rec.id);
        });
      }
    });

    if (onSaveStudentEkskulBatch) {
      onSaveStudentEkskulBatch(toSave, toDeleteIds);
    } else {
      toSave.forEach((rec) => onSaveStudentEkskul(rec));
    }

    const activeEkskulName =
      extracurriculars.find((e) => e.id === selectedEkskul)?.name || 'Ekstrakurikuler';
    setSaveToast(
      `Tersimpan untuk ${activeEkskulName}: ${toSave.length} siswa mengikuti (${classStudents.length - toSave.length} siswa tidak mengikuti).`
    );
    setTimeout(() => setSaveToast(null), 4000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Data &amp; Penilaian Ekstrakurikuler
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Centang hanya peserta didik yang benar-benar mengikuti kegiatan ekstrakurikuler agar tampil tepat di rapor.
          </p>
        </div>

        {saveToast && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold animate-in fade-in">
            <Check className="w-4 h-4 shrink-0" />
            <span>{saveToast}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab('kegiatan')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'kegiatan'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Daftar Kegiatan Ekstrakurikuler
        </button>
        <button
          onClick={() => setActiveTab('penilaian')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'penilaian'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Input Nilai Ekstrakurikuler Siswa
        </button>
      </div>

      {activeTab === 'kegiatan' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={handleOpenAddMaster}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              Tambah Kegiatan Ekstrakurikuler
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {extracurriculars.map((ekskul) => (
              <div
                key={ekskul.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-blue-300 transition space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">{ekskul.name}</h3>
                    <p className="text-xs text-blue-600 font-semibold mt-0.5">
                      Pembina: {ekskul.coachName}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Activity className="w-5 h-5" />
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <div>
                    <span className="font-semibold text-slate-700">Waktu Latihan: </span>
                    {ekskul.dayAndTime}
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed pt-1">
                    {ekskul.description}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenEditMaster(ekskul)}
                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 text-xs font-semibold flex items-center gap-1"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(ekskul.id)}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Penilaian Tab */
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <span>
              <strong>Aturan Keikutsertaan:</strong> Centang kolom <strong>Ikut</strong> hanya untuk siswa yang benar-benar mengikuti kegiatan ini. Siswa yang tidak dicentang tidak akan ditampilkan pada daftar ekskul di rapor (tabel tetap ada dan kosong jika siswa tidak mengikuti kegiatan apa pun).
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Rombel / Kelas:</span>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-300 font-bold bg-white"
                >
                  {visibleClassrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Ekstrakurikuler:</span>
                <select
                  value={selectedEkskul}
                  onChange={(e) => setSelectedEkskul(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-300 font-bold bg-white"
                >
                  {extracurriculars.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>

              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">
                Peserta Ikut: <strong>{participantCount}</strong> / {classStudents.length} siswa
              </span>
            </div>

            <button
              onClick={handleSaveAllGrades}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
            >
              <Save className="w-4 h-4" />
              Simpan Nilai Ekstrakurikuler
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 w-10 text-center">No</th>
                    <th className="px-3 py-3 text-center w-24">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={(e) => handleToggleAllParticipants(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                          title="Centang / kosongkan semua siswa di rombel ini"
                        />
                        <span>Ikut</span>
                      </label>
                    </th>
                    <th className="px-4 py-3 w-28">NISN</th>
                    <th className="px-4 py-3 min-w-[180px]">Nama Siswa</th>
                    <th className="px-4 py-3 text-center w-36">Predikat</th>
                    <th className="px-4 py-3">Deskripsi Capaian / Catatan Kegiatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                        Tidak ada siswa di rombel ini.
                      </td>
                    </tr>
                  ) : (
                    classStudents.map((std, idx) => {
                      const draft = studentDrafts[std.id] || {
                        participating: false,
                        predicate: 'Baik' as const,
                        description: DEFAULT_EKSKUL_DESC
                      };
                      const isActive = draft.participating;

                      return (
                        <tr
                          key={std.id}
                          className={`transition ${
                            isActive ? 'bg-blue-50/20 hover:bg-blue-50/40' : 'hover:bg-slate-50/70'
                          }`}
                        >
                          <td className="px-4 py-3 text-center text-slate-500 font-medium">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={(e) =>
                                handleToggleStudentParticipation(std.id, e.target.checked)
                              }
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600">{std.nisn}</td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800">{std.name}</div>
                            <span
                              className={`inline-block mt-0.5 text-[10px] font-semibold ${
                                isActive ? 'text-emerald-700' : 'text-slate-400'
                              }`}
                            >
                              {isActive ? 'Terdaftar mengikuti' : 'Tidak mengikuti'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <select
                              disabled={!isActive}
                              value={draft.predicate}
                              onChange={(e) => {
                                const p = e.target.value as StudentEkskulDraft['predicate'];
                                setStudentDrafts((prev) => ({
                                  ...prev,
                                  [std.id]: { ...draft, predicate: p }
                                }));
                              }}
                              className="px-2 py-1 rounded border border-slate-300 font-bold text-xs bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                            >
                              <option value="Sangat Baik">Sangat Baik</option>
                              <option value="Baik">Baik</option>
                              <option value="Cukup">Cukup</option>
                              <option value="Kurang">Kurang</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              disabled={!isActive}
                              value={isActive ? draft.description : ''}
                              onChange={(e) => {
                                setStudentDrafts((prev) => ({
                                  ...prev,
                                  [std.id]: { ...draft, description: e.target.value }
                                }));
                              }}
                              className="w-full px-3 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                              placeholder={
                                isActive
                                  ? 'Deskripsi aktivitas & pencapaian siswa...'
                                  : 'Centang kolom Ikut jika siswa mengikuti kegiatan ini'
                              }
                            />
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

      {/* Add / Edit Master Ekskul Modal */}
      {isModalOpen && editingEkskul && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {extracurriculars.some((e) => e.id === editingEkskul.id)
                  ? 'Edit Ekstrakurikuler'
                  : 'Tambah Ekstrakurikuler Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaster} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Kegiatan Ekstrakurikuler
                </label>
                <input
                  type="text"
                  value={editingEkskul.name}
                  onChange={(e) => setEditingEkskul({ ...editingEkskul, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bold"
                  placeholder="Contoh: Pramuka Gudep SMPN 1 Rangsang / Drumband"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Pembina / Pelatih
                </label>
                <input
                  type="text"
                  value={editingEkskul.coachName}
                  onChange={(e) =>
                    setEditingEkskul({ ...editingEkskul, coachName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  placeholder="Contoh: Rahmat Hidayat, S.Pd."
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Jadwal / Waktu Latihan
                </label>
                <input
                  type="text"
                  value={editingEkskul.dayAndTime}
                  onChange={(e) =>
                    setEditingEkskul({ ...editingEkskul, dayAndTime: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi Singkat</label>
                <textarea
                  rows={2}
                  value={editingEkskul.description}
                  onChange={(e) =>
                    setEditingEkskul({ ...editingEkskul, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
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
                  Simpan Kegiatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Hapus Ekstrakurikuler?</h3>
            <p className="text-xs text-slate-600">
              Yakin ingin menghapus kegiatan ekstrakurikuler ini dari daftar?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onDeleteExtracurricular(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
