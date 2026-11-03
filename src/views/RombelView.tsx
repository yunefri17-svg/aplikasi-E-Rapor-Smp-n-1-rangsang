import React, { useState } from 'react';
import { Classroom, Teacher, Curriculum, Student, User } from '../types/erapor';
import { Users, Plus, Edit, Trash2, X, Check, School, GraduationCap } from 'lucide-react';
import { sortClassrooms } from '../utils/classroomSort';

interface RombelViewProps {
  classrooms: Classroom[];
  teachers: Teacher[];
  curricula: Curriculum[];
  students: Student[];
  onSaveClassroom: (classroom: Classroom) => void;
  onDeleteClassroom: (classroomId: string) => void;
  currentUser: User;
}

export const RombelView: React.FC<RombelViewProps> = ({
  classrooms,
  teachers,
  curricula,
  students,
  onSaveClassroom,
  onDeleteClassroom,
  currentUser
}) => {
  const [editingClass, setEditingClass] = useState<Classroom | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const teacherMap = new Map(teachers.map((t) => [t.id, t.name]));
  const curMap = new Map(curricula.map((c) => [c.id, c.name]));

  const handleOpenAdd = () => {
    setEditingClass({
      id: `cls-${Date.now()}`,
      name: 'Kelas VII.4',
      gradeLevel: '7',
      curriculumId: curricula[0]?.id || 'cur-merdeka',
      homeroomTeacherId: teachers[0]?.id || '',
      roomNumber: 'R. 104',
      capacity: 32
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Classroom) => {
    setEditingClass({ ...c });
    setIsModalOpen(true);
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClass) {
      onSaveClassroom(editingClass);
      setIsModalOpen(false);
      setEditingClass(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Rombongan Belajar (Rombel VII.1 - IX.3)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar pembagian kelas VII.1 hingga IX.3, tingkat pendidikan, kurikulum yang digunakan, serta wali kelas penanggung jawab.
          </p>
        </div>

        {currentUser.role === 'admin' && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Tambah Rombel Baru
          </button>
        )}
      </div>

      {/* Rombel Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sortClassrooms(classrooms).map((cls) => {
          const classStudents = students.filter((s) => s.classId === cls.id);
          const maleCount = classStudents.filter((s) => s.gender === 'L').length;
          const femaleCount = classStudents.filter((s) => s.gender === 'P').length;
          const teacherName = teacherMap.get(cls.homeroomTeacherId) || 'Belum Ditentukan';
          const curName = curMap.get(cls.curriculumId) || 'Kurikulum Merdeka';
          const romanGrade = cls.gradeLevel === '7' ? 'VII' : cls.gradeLevel === '8' ? 'VIII' : 'IX';

          return (
            <div
              key={cls.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-blue-300 transition-all space-y-4 relative"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    Tingkat Kelas {romanGrade}
                  </span>
                  <h3 className="text-lg font-black text-slate-800 mt-1">{cls.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">Ruang: {cls.roomNumber}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-bold flex items-center justify-center">
                  <School className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-2 text-xs border-y border-slate-100 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Wali Kelas:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[170px]" title={teacherName}>
                    {teacherName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Kurikulum:</span>
                  <span className="font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                    {curName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Kapasitas Maksimal:</span>
                  <span className="text-slate-700 font-semibold">{cls.capacity} Siswa</span>
                </div>
              </div>

              {/* Student demographic badge */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  {classStudents.length} Siswa Terdaftar
                </span>
                <div className="flex items-center gap-2 text-[11px] font-medium">
                  <span className="text-blue-600 font-semibold">L: {maleCount}</span>
                  <span className="text-slate-300">&bull;</span>
                  <span className="text-pink-600 font-semibold">P: {femaleCount}</span>
                </div>
              </div>

              {/* Action buttons */}
              {currentUser.role === 'admin' && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenEdit(cls)}
                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(cls.id)}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus Rombel</h3>
            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin menghapus rombongan belajar ini? Siswa yang ada di kelas ini harus dipindahkan ke rombel lain.
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
                  onDeleteClassroom(deleteConfirmId);
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

      {/* Add / Edit Classroom Modal */}
      {isModalOpen && editingClass && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingClass.id.startsWith('cls-7') || editingClass.id.startsWith('cls-8') || editingClass.id.startsWith('cls-9')
                  ? 'Edit Data Rombongan Belajar'
                  : 'Tambah Rombel Baru'}
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
                <label className="block font-semibold text-slate-700 mb-1">Nama Rombel</label>
                <input
                  type="text"
                  value={editingClass.name}
                  onChange={(e) => setEditingClass({ ...editingClass, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bold"
                  placeholder="Contoh: Kelas VII.1"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tingkat Kelas</label>
                  <select
                    value={editingClass.gradeLevel}
                    onChange={(e) => setEditingClass({ ...editingClass, gradeLevel: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="7">Kelas VII (Fase D)</option>
                    <option value="8">Kelas VIII (Fase D)</option>
                    <option value="9">Kelas IX (Fase D)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kapasitas (Siswa)</label>
                  <input
                    type="number"
                    value={editingClass.capacity}
                    onChange={(e) => setEditingClass({ ...editingClass, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    min={1}
                    max={50}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Wali Kelas</label>
                <select
                  value={editingClass.homeroomTeacherId}
                  onChange={(e) => setEditingClass({ ...editingClass, homeroomTeacherId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="">Pilih Guru Pengampu Wali Kelas...</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.employmentStatus})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kurikulum</label>
                <select
                  value={editingClass.curriculumId}
                  onChange={(e) => setEditingClass({ ...editingClass, curriculumId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  {curricula.map((cur) => (
                    <option key={cur.id} value={cur.id}>{cur.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nomor / Nama Ruangan</label>
                <input
                  type="text"
                  value={editingClass.roomNumber}
                  onChange={(e) => setEditingClass({ ...editingClass, roomNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  placeholder="Contoh: R. 101"
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
                  Simpan Rombel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
