import React, { useState, useMemo } from 'react';
import {
  TeachingAssignment,
  Teacher,
  Subject,
  Classroom,
  User
} from '../types/erapor';
import {
  Award,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Edit,
  X,
  BookOpen,
  Users,
  Building,
  Calendar,
  AlertCircle,
  Sparkles,
  Layers,
  GraduationCap
} from 'lucide-react';
import { sortClassrooms } from '../utils/classroomSort';

interface PenugasanGuruViewProps {
  teachingAssignments: TeachingAssignment[];
  teachers: Teacher[];
  subjects: Subject[];
  classrooms: Classroom[];
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  currentUser: User;
  onSaveAssignments: (updated: TeachingAssignment[]) => void;
  onDeleteAssignment: (assignmentId: string) => void;
}

export const PenugasanGuruView: React.FC<PenugasanGuruViewProps> = ({
  teachingAssignments,
  teachers,
  subjects,
  classrooms,
  academicYear,
  semester,
  currentUser,
  onSaveAssignments,
  onDeleteAssignment
}) => {
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'kepsek';

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingTeacherId, setEditingTeacherId] = useState<string>(teachers[0]?.id || '');
  const [editingSubjectId, setEditingSubjectId] = useState<string>(subjects[0]?.id || '');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [assignmentSemester, setAssignmentSemester] = useState<'Semua' | 'Ganjil' | 'Genap'>('Semua');
  const [assignmentStatus, setAssignmentStatus] = useState<'active' | 'inactive'>('active');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);

  // Delete Confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const sortedClassrooms = useMemo(() => sortClassrooms(classrooms), [classrooms]);

  // Quick select helpers
  const handleSelectAllClasses = () => {
    setSelectedClassIds(sortedClassrooms.map((c) => c.id));
  };
  const handleSelectGrade = (grade: '7' | '8' | '9') => {
    const classIdsInGrade = sortedClassrooms.filter((c) => c.gradeLevel === grade).map((c) => c.id);
    setSelectedClassIds((prev) => {
      const set = new Set([...prev, ...classIdsInGrade]);
      return Array.from(set);
    });
  };
  const handleClearClasses = () => {
    setSelectedClassIds([]);
  };

  const handleOpenAdd = () => {
    setModalMode('create');
    setEditingAssignmentId(null);
    setEditingTeacherId(teachers[0]?.id || '');
    setEditingSubjectId(subjects[0]?.id || '');
    setSelectedClassIds([]);
    setAssignmentSemester('Semua');
    setAssignmentStatus('active');
    setAssignmentNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (assignment: TeachingAssignment) => {
    setModalMode('edit');
    setEditingAssignmentId(assignment.id);
    setEditingTeacherId(assignment.teacherId);
    setEditingSubjectId(assignment.subjectId);
    setSelectedClassIds([assignment.classId]);
    setAssignmentSemester(assignment.semester || 'Semua');
    setAssignmentStatus(assignment.status || 'active');
    setAssignmentNotes(assignment.notes || '');
    setIsModalOpen(true);
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacherId || !editingSubjectId || selectedClassIds.length === 0) {
      alert('Silakan pilih guru, mata pelajaran, dan minimal satu kelas.');
      return;
    }

    const teacher = teachers.find((t) => t.id === editingTeacherId);
    const subject = subjects.find((s) => s.id === editingSubjectId);

    if (modalMode === 'edit' && editingAssignmentId) {
      // Single edit
      const cls = classrooms.find((c) => c.id === selectedClassIds[0]);
      const updatedList = teachingAssignments.map((a) => {
        if (a.id === editingAssignmentId) {
          return {
            ...a,
            teacherId: editingTeacherId,
            teacherName: teacher?.name || a.teacherName,
            subjectId: editingSubjectId,
            subjectName: subject?.name || a.subjectName,
            classId: selectedClassIds[0],
            className: cls?.name || a.className,
            academicYear,
            semester: assignmentSemester,
            status: assignmentStatus,
            notes: assignmentNotes,
            updatedAt: new Date().toISOString()
          };
        }
        return a;
      });
      onSaveAssignments(updatedList);
    } else {
      let updatedList = [...teachingAssignments];
      selectedClassIds.forEach((cId) => {
        const cls = classrooms.find((c) => c.id === cId);
        const existingIdx = updatedList.findIndex(
          (a) => a.teacherId === editingTeacherId && a.subjectId === editingSubjectId && a.classId === cId
        );

        const item: TeachingAssignment = {
          id: existingIdx >= 0 ? updatedList[existingIdx].id : `ta-${editingTeacherId}-${editingSubjectId}-${cId}`,
          teacherId: editingTeacherId,
          teacherName: teacher?.name || '',
          subjectId: editingSubjectId,
          subjectName: subject?.name || '',
          classId: cId,
          className: cls?.name || '',
          academicYear,
          semester: assignmentSemester,
          status: assignmentStatus,
          notes: assignmentNotes,
          updatedAt: new Date().toISOString()
        };

        if (existingIdx >= 0) {
          updatedList[existingIdx] = item;
        } else {
          updatedList.push(item);
        }
      });

      onSaveAssignments(updatedList);
    }

    setIsModalOpen(false);
  };

  // Filtered List
  const filteredAssignments = useMemo(() => {
    return teachingAssignments.filter((a) => {
      if (selectedTeacherFilter !== 'all' && a.teacherId !== selectedTeacherFilter) return false;
      if (selectedSubjectFilter !== 'all' && a.subjectId !== selectedSubjectFilter) return false;
      if (selectedGradeFilter !== 'all') {
        const cls = classrooms.find((c) => c.id === a.classId);
        if (cls?.gradeLevel !== selectedGradeFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const tMatch = (a.teacherName || '').toLowerCase().includes(q);
        const sMatch = (a.subjectName || '').toLowerCase().includes(q);
        const cMatch = (a.className || '').toLowerCase().includes(q);
        if (!tMatch && !sMatch && !cMatch) return false;
      }
      return true;
    });
  }, [teachingAssignments, selectedTeacherFilter, selectedSubjectFilter, selectedGradeFilter, searchQuery, classrooms]);

  // Statistics
  const totalActive = teachingAssignments.filter((a) => a.status !== 'inactive').length;
  const uniqueTeachers = new Set(teachingAssignments.map((a) => a.teacherId)).size;
  const uniqueSubjects = new Set(teachingAssignments.map((a) => a.subjectId)).size;
  const uniqueClasses = new Set(teachingAssignments.map((a) => a.classId)).size;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            Penugasan Guru Mengajar (SK Pembagian Tugas)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola distribusi guru mata pelajaran dan kelas ajar (VII.1 - IX.3) untuk Tahun Pelajaran {academicYear} Semester {semester}.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Tambah Penugasan Mengajar
          </button>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Penugasan</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">{totalActive}</span>
            <span className="text-xs text-slate-400">jadwal aktif</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Guru Bertugas</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">{uniqueTeachers}</span>
            <span className="text-xs text-slate-400">dari {teachers.length} guru</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Mata Pelajaran</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">{uniqueSubjects}</span>
            <span className="text-xs text-slate-400">dari {subjects.length} mapel</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Kelas Terpetakan</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">{uniqueClasses}</span>
            <span className="text-xs text-slate-400">dari {classrooms.length} rombel</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search box */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari guru, mapel, atau kelas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Filter Guru */}
          <select
            value={selectedTeacherFilter}
            onChange={(e) => setSelectedTeacherFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 bg-white"
          >
            <option value="all">Semua Guru ({teachers.length})</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Filter Mapel */}
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 bg-white"
          >
            <option value="all">Semua Mata Pelajaran ({subjects.length})</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>

          {/* Filter Tingkat */}
          <select
            value={selectedGradeFilter}
            onChange={(e) => setSelectedGradeFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 bg-white"
          >
            <option value="all">Semua Tingkat (VII, VIII, IX)</option>
            <option value="7">Kelas VII</option>
            <option value="8">Kelas VIII</option>
            <option value="9">Kelas IX</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Menampilkan <strong>{filteredAssignments.length}</strong> penugasan
        </span>
      </div>

      {/* Assignments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Guru Pengampu</th>
                <th className="py-3 px-4">Mata Pelajaran</th>
                <th className="py-3 px-4">Kelas yang Diajar</th>
                <th className="py-3 px-4">Tahun Pelajaran</th>
                <th className="py-3 px-4 text-center">Status</th>
                {isAdmin && <th className="py-3 px-4 text-center w-24">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="py-10 text-center text-slate-400">
                    Tidak ada data penugasan mengajar yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((a, idx) => {
                  const teacher = teachers.find((t) => t.id === a.teacherId);
                  const subject = subjects.find((s) => s.id === a.subjectId);
                  const classroom = classrooms.find((c) => c.id === a.classId);

                  return (
                    <tr key={a.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 text-center text-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{a.teacherName || teacher?.name || a.teacherId}</div>
                        <div className="text-[11px] text-slate-500">NIP: {teacher?.nip || '-'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-blue-900">{a.subjectName || subject?.name || a.subjectId}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{subject?.code} &bull; Kelompok {subject?.category}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {a.className || classroom?.name || a.classId}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{a.academicYear || academicYear}</div>
                        <div className="text-[11px] text-slate-400">Semester: {a.semester || 'Semua'}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            a.status !== 'inactive'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {a.status !== 'inactive' ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(a)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                              title="Edit Penugasan"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(a.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Hapus Penugasan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Teaching Assignment */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" />
                {modalMode === 'create' ? 'Tambah Penugasan Mengajar Guru' : 'Edit Penugasan Mengajar'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="mt-4 space-y-4 text-xs">
              {/* Select Guru */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Guru Pengampu <span className="text-red-500">*</span>
                </label>
                <select
                  value={editingTeacherId}
                  onChange={(e) => setEditingTeacherId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (NIP: {t.nip || '-'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Mapel */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mata Pelajaran <span className="text-red-500">*</span>
                </label>
                <select
                  value={editingSubjectId}
                  onChange={(e) => setEditingSubjectId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code} - Kelompok {s.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Kelas (Checkboxes with quick selectors) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-700">
                    Kelas yang Diajar <span className="text-red-500">*</span>
                    <span className="ml-1 text-slate-400 font-normal">
                      ({selectedClassIds.length} kelas dipilih)
                    </span>
                  </label>
                  {modalMode === 'create' && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={handleSelectAllClasses}
                        className="text-blue-600 hover:text-blue-700 font-bold hover:underline"
                      >
                        Semua Kelas
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => handleSelectGrade('7')}
                        className="text-slate-600 hover:text-slate-800 font-medium"
                      >
                        Kls VII
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectGrade('8')}
                        className="text-slate-600 hover:text-slate-800 font-medium"
                      >
                        Kls VIII
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectGrade('9')}
                        className="text-slate-600 hover:text-slate-800 font-medium"
                      >
                        Kls IX
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={handleClearClasses}
                        className="text-rose-600 hover:text-rose-700 font-medium"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-48 overflow-y-auto">
                  {sortedClassrooms.map((cls) => {
                    const isChecked = selectedClassIds.includes(cls.id);
                    return (
                      <label
                        key={cls.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                          isChecked
                            ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type={modalMode === 'edit' ? 'radio' : 'checkbox'}
                          name="class_selection"
                          checked={isChecked}
                          onChange={(e) => {
                            if (modalMode === 'edit') {
                              setSelectedClassIds([cls.id]);
                            } else {
                              if (e.target.checked) {
                                setSelectedClassIds([...selectedClassIds, cls.id]);
                              } else {
                                setSelectedClassIds(selectedClassIds.filter((id) => id !== cls.id));
                              }
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>{cls.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Semester & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Berlaku Semester</label>
                  <select
                    value={assignmentSemester}
                    onChange={(e) => setAssignmentSemester(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold bg-white text-slate-800"
                  >
                    <option value="Semua">Semua (Ganjil & Genap)</option>
                    <option value="Ganjil">Semester Ganjil Saja</option>
                    <option value="Genap">Semester Genap Saja</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status Penugasan</label>
                  <select
                    value={assignmentStatus}
                    onChange={(e) => setAssignmentStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold bg-white text-slate-800"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Keterangan / Nomor SK (Opsional)</label>
                <input
                  type="text"
                  placeholder="Misal: SK Kepala Sekolah No. 421.3/SMPN1-R/SK/2026/012"
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs"
                >
                  {modalMode === 'create' ? 'Simpan Penugasan' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Hapus Penugasan Mengajar?</h3>
            <p className="text-xs text-slate-500 mb-5">
              Guru ini tidak akan lagi memiliki hak akses memasukkan nilai untuk mata pelajaran dan kelas tersebut.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onDeleteAssignment(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
