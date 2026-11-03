import React, { useState } from 'react';
import {
  Extracurricular,
  StudentExtracurricular,
  Classroom,
  Student,
  User
} from '../types/erapor';
import { Activity, Plus, Edit, Trash2, X, Check, Award, Save, Lock } from 'lucide-react';
import { SecurityAccessDenied } from '../components/SecurityAccessDenied';

interface DataEkskulViewProps {
  extracurriculars: Extracurricular[];
  studentExtracurriculars: StudentExtracurricular[];
  classrooms: Classroom[];
  students: Student[];
  onSaveExtracurricular: (ekskul: Extracurricular) => void;
  onDeleteExtracurricular: (id: string) => void;
  onSaveStudentEkskul: (record: StudentExtracurricular) => void;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  currentUser: User;
}

export const DataEkskulView: React.FC<DataEkskulViewProps> = ({
  extracurriculars,
  studentExtracurriculars,
  classrooms,
  students,
  onSaveExtracurricular,
  onDeleteExtracurricular,
  onSaveStudentEkskul,
  academicYear,
  semester,
  currentUser
}) => {
  const isWaliKelas = currentUser.role === 'walikelas';
  const authorizedClass = classrooms.find((c) => c.id === currentUser.classId);

  const [activeTab, setActiveTab] = useState<'kegiatan' | 'penilaian'>(
    isWaliKelas ? 'penilaian' : 'kegiatan'
  );
  const [selectedClass, setSelectedClass] = useState<string>(
    isWaliKelas && currentUser.classId ? currentUser.classId : classrooms[0]?.id || 'cls-vii-1'
  );
  const [selectedEkskul, setSelectedEkskul] = useState<string>(extracurriculars[0]?.id || 'ekskul-1');

  // Security check: if Wali Kelas attempts to access another class
  const isUnauthorized = isWaliKelas && currentUser.classId && selectedClass !== currentUser.classId;
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

  const sortedAllClassrooms = [...classrooms].sort((a, b) => {
    const gradeA = parseInt(a.gradeLevel) || 0;
    const gradeB = parseInt(b.gradeLevel) || 0;
    if (gradeA !== gradeB) return gradeA - gradeB;
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });

  const visibleClassrooms = isWaliKelas
    ? sortedAllClassrooms.filter((c) => c.id === currentUser.classId)
    : sortedAllClassrooms;

  // Master modal
  const [editingEkskul, setEditingEkskul] = useState<Extracurricular | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Student assessment inputs state
  const classStudents = students.filter((s) => s.classId === selectedClass);

  const [studentGrades, setStudentGrades] = useState<Record<string, { predicate: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang'; description: string }>>(() => {
    const map: Record<string, any> = {};
    studentExtracurriculars.forEach((se) => {
      if (se.extracurricularId === selectedEkskul && se.academicYear === academicYear && se.semester === semester) {
        map[se.studentId] = { predicate: se.predicate, description: se.description };
      }
    });
    return map;
  });

  const [saveToast, setSaveToast] = useState(false);

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
    classStudents.forEach((std) => {
      const g = studentGrades[std.id] || {
        predicate: 'Baik',
        description: 'Aktif mengikuti kegiatan ekstrakurikuler dengan penuh kedisiplinan dan kerja sama yang baik.'
      };

      const cleanYear = (academicYear || '').replace(/\//g, '_');
      onSaveStudentEkskul({
        id: `se-${std.id}-${selectedEkskul}-${cleanYear}-${semester}`,
        studentId: std.id,
        extracurricularId: selectedEkskul,
        classId: selectedClass,
        academicYear,
        semester,
        predicate: g.predicate,
        description: g.description
      });
    });

    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Data & Penilaian Ekstrakurikuler
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar kegiatan pengembangan minat, bakat, kepemimpinan, dan nilai predikat ekstrakurikuler peserta didik untuk lembar rapor.
          </p>
        </div>

        {saveToast && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold animate-in fade-in">
            <Check className="w-4 h-4" />
            Nilai Ekstrakurikuler Berhasil Disimpan!
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
                    <option key={c.id} value={c.id}>{c.name}</option>
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
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
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
                    <th className="px-4 py-3">No</th>
                    <th className="px-4 py-3">NISN</th>
                    <th className="px-4 py-3">Nama Siswa</th>
                    <th className="px-4 py-3 text-center">Predikat</th>
                    <th className="px-4 py-3">Deskripsi Capaian / Catatan Kegiatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classStudents.map((std, idx) => {
                    const grade = studentGrades[std.id] || {
                      predicate: 'Baik',
                      description: 'Aktif mengikuti kegiatan dan menunjukkan kedisiplinan serta kerja sama yang baik.'
                    };

                    return (
                      <tr key={std.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 text-slate-500 font-medium">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{std.nisn}</td>
                        <td className="px-4 py-3 font-bold text-slate-800">{std.name}</td>
                        <td className="px-4 py-3 text-center">
                          <select
                            value={grade.predicate}
                            onChange={(e) => {
                              const p = e.target.value as any;
                              setStudentGrades({
                                ...studentGrades,
                                [std.id]: { ...grade, predicate: p }
                              });
                            }}
                            className="px-2 py-1 rounded border border-slate-300 font-bold text-xs bg-white"
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
                            value={grade.description}
                            onChange={(e) => {
                              setStudentGrades({
                                ...studentGrades,
                                [std.id]: { ...grade, description: e.target.value }
                              });
                            }}
                            className="w-full px-3 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                            placeholder="Deskripsi aktivitas & pencapaian siswa..."
                          />
                        </td>
                      </tr>
                    );
                  })}
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
                {editingEkskul.id.startsWith('ekskul-1') ? 'Edit Ekstrakurikuler' : 'Tambah Ekstrakurikuler Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaster} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Kegiatan</label>
                <input
                  type="text"
                  value={editingEkskul.name}
                  onChange={(e) => setEditingEkskul({ ...editingEkskul, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 font-bold"
                  placeholder="Contoh: Pramuka Gudep SMPN 1 Rangsang"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Pembina / Pelatih</label>
                <input
                  type="text"
                  value={editingEkskul.coachName}
                  onChange={(e) => setEditingEkskul({ ...editingEkskul, coachName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                  placeholder="Contoh: Rahmat Hidayat, S.Pd."
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jadwal & Waktu Latihan</label>
                <input
                  type="text"
                  value={editingEkskul.dayAndTime}
                  onChange={(e) => setEditingEkskul({ ...editingEkskul, dayAndTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                  placeholder="Contoh: Jumat, 15:30 - 17:00 WIB"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi Kegiatan</label>
                <textarea
                  value={editingEkskul.description}
                  onChange={(e) => setEditingEkskul({ ...editingEkskul, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Tujuan dan gambaran aktivitas..."
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
                  Simpan Kegiatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
