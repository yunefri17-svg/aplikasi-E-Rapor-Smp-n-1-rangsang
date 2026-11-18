import React, { useState, useMemo, useEffect } from 'react';
import {
  AssessmentPolicyConfig,
  AssessmentScore,
  AuthSessionContext,
  Classroom,
  FormativeAssessment,
  LearningChapter,
  LearningObjective,
  Subject,
  SummativeAssessment,
  SummativeAssessmentPlan,
  Teacher,
  TeachingAssignment,
  User
} from '../types/erapor';
import {
  Target,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  Search,
  Lock,
  Info,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  ShieldAlert
} from 'lucide-react';
import { sortClassrooms } from '../utils/classroomSort';
import { sortSubjects } from '../utils/subjectSort';
import { getAvailableAcademicYears } from '../utils/academicYear';
import { getVisibleSubjectsForUser } from '../utils/teacherAssignmentHelper';
import { filterObjectivesForContext } from '../utils/tpAnalysisAndDescription';
import { suggestNextTpCode } from '../utils/assessmentCalculation';
import {
  authorizeSubjectAssessmentWrite,
  checkLearningObjectiveInUse,
  getAuthorizedSubjectClassIds
} from '../utils/authorizationGuard';

interface AsesmenFormatifViewProps {
  classrooms: Classroom[];
  subjects: Subject[];
  learningObjectives: LearningObjective[];
  learningChapters?: LearningChapter[];
  summativePlans?: SummativeAssessmentPlan[];
  formativeAssessments?: FormativeAssessment[];
  summativeAssessments?: SummativeAssessment[];
  scores?: AssessmentScore[];
  onSaveObjective: (obj: LearningObjective) => { success?: boolean; error?: string } | void;
  onDeleteObjective: (id: string) => Promise<{ success?: boolean; error?: string } | void> | void;
  currentUser: User;
  teachingAssignments: TeachingAssignment[];
  teachers?: Teacher[];
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  assessmentPolicy?: AssessmentPolicyConfig;
  authContext?: AuthSessionContext | null;
}

export const AsesmenFormatifView: React.FC<AsesmenFormatifViewProps> = ({
  classrooms,
  subjects,
  learningObjectives,
  learningChapters = [],
  summativePlans = [],
  formativeAssessments = [],
  summativeAssessments = [],
  scores = [],
  onSaveObjective,
  onDeleteObjective,
  currentUser,
  teachingAssignments,
  teachers = [],
  academicYear,
  semester,
  assessmentPolicy,
  authContext
}) => {
  const [selectedYear, setSelectedYear] = useState<string>(academicYear);
  const [selectedSemester, setSelectedSemester] = useState<'Ganjil' | 'Genap'>(semester);

  useEffect(() => {
    setSelectedYear(academicYear);
  }, [academicYear]);

  useEffect(() => {
    setSelectedSemester(semester);
  }, [semester]);

  const yearOptions = useMemo(() => {
    const baseYears = getAvailableAcademicYears(2023, 6);
    const existingYears = learningObjectives
      .map((tp) => tp.academicYear)
      .filter((y): y is string => Boolean(y));
    return Array.from(new Set([academicYear, ...baseYears, ...existingYears])).sort().reverse();
  }, [academicYear, learningObjectives]);

  const visibleSubjects = useMemo(() => {
    if (currentUser.role === 'admin' || currentUser.role === 'kepsek') {
      return sortSubjects(subjects);
    }
    if (currentUser.role === 'walikelas') {
      return sortSubjects(subjects);
    }
    return getVisibleSubjectsForUser({
      currentUser,
      subjects,
      teachingAssignments,
      teachers,
      includeAllForWaliKelas: false
    });
  }, [currentUser, subjects, teachingAssignments, teachers]);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(visibleSubjects[0]?.id || '');

  useEffect(() => {
    if (visibleSubjects.length > 0 && !visibleSubjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId(visibleSubjects[0].id);
    } else if (visibleSubjects.length === 0) {
      setSelectedSubjectId('');
    }
  }, [visibleSubjects, selectedSubjectId]);

  const visibleClassrooms = useMemo(() => {
    const sorted = sortClassrooms(classrooms);
    const authScope = getAuthorizedSubjectClassIds({
      user: currentUser,
      teachers,
      teachingAssignments,
      subjectId: selectedSubjectId || undefined,
      academicYear: selectedYear,
      semester: selectedSemester
    });
    if (authScope.allowAll) return sorted;
    if (authScope.classIds.length > 0) {
      return sorted.filter((c) => authScope.classIds.includes(c.id));
    }
    if (currentUser.role === 'walikelas' && currentUser.classId) {
      return sorted.filter((c) => c.id === currentUser.classId);
    }
    return [];
  }, [classrooms, currentUser, teachers, teachingAssignments, selectedSubjectId, selectedYear, selectedSemester]);

  const [selectedClassId, setSelectedClassId] = useState<string>(visibleClassrooms[0]?.id || '');

  useEffect(() => {
    if (visibleClassrooms.length > 0 && !visibleClassrooms.some((c) => c.id === selectedClassId)) {
      setSelectedClassId(visibleClassrooms[0].id);
    } else if (visibleClassrooms.length === 0) {
      setSelectedClassId('');
    }
  }, [visibleClassrooms, selectedClassId]);

  const selectedClassroom = useMemo(
    () => classrooms.find((c) => c.id === selectedClassId),
    [classrooms, selectedClassId]
  );
  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === selectedSubjectId),
    [subjects, selectedSubjectId]
  );

  const writeAuth = useMemo(() => {
    if (!selectedSubjectId || !selectedClassId) {
      return {
        allowed: false,
        readOnly: true,
        reason: 'Pilih Mata Pelajaran dan Kelas terlebih dahulu.'
      };
    }
    return authorizeSubjectAssessmentWrite({
      user: currentUser,
      subjectId: selectedSubjectId,
      classId: selectedClassId,
      academicYear: selectedYear,
      semester: selectedSemester,
      teachers,
      teachingAssignments,
      assessmentPolicy,
      authContext
    });
  }, [
    currentUser,
    selectedSubjectId,
    selectedClassId,
    selectedYear,
    selectedSemester,
    teachers,
    teachingAssignments,
    assessmentPolicy,
    authContext
  ]);

  const contextObjectives = useMemo(() => {
    if (!selectedSubjectId || !selectedClassroom) return [];
    return filterObjectivesForContext(learningObjectives, {
      subjectId: selectedSubjectId,
      gradeLevel: selectedClassroom.gradeLevel,
      classId: selectedClassroom.id,
      semester: selectedSemester,
      academicYear: selectedYear
    });
  }, [learningObjectives, selectedSubjectId, selectedClassroom, selectedSemester, selectedYear]);

  const [searchTerm, setSearchTerm] = useState('');
  const displayedObjectives = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return contextObjectives;
    return contextObjectives.filter(
      (tp) =>
        (tp.code || '').toLowerCase().includes(q) ||
        (tp.description || '').toLowerCase().includes(q) ||
        (tp.materi || '').toLowerCase().includes(q)
    );
  }, [contextObjectives, searchTerm]);

  const historicalFormativeCount = useMemo(() => {
    if (!selectedSubjectId || !selectedClassId) return 0;
    return formativeAssessments.filter(
      (fa) =>
        fa.subjectId === selectedSubjectId &&
        fa.classId === selectedClassId &&
        fa.semester === selectedSemester &&
        (!fa.academicYear || fa.academicYear === selectedYear)
    ).length;
  }, [formativeAssessments, selectedSubjectId, selectedClassId, selectedSemester, selectedYear]);

  // Add / Edit Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTp, setEditingTp] = useState<LearningObjective | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formMateri, setFormMateri] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formScope, setFormScope] = useState<'grade' | 'class'>('grade');
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);
  const [confirmDeleteTp, setConfirmDeleteTp] = useState<LearningObjective | null>(null);

  const openCreateForm = () => {
    if (!writeAuth.allowed) {
      setFeedbackBanner({
        type: 'warning',
        text: writeAuth.reason || 'Anda tidak memiliki hak akses mengubah TP pada konteks ini.'
      });
      return;
    }
    const grade = selectedClassroom?.gradeLevel || '7';
    setEditingTp(null);
    setFormCode(suggestNextTpCode(contextObjectives, grade));
    setFormMateri('');
    setFormDescription('');
    setFormScope('grade');
    setFeedbackBanner(null);
    setIsFormOpen(true);
  };

  const openEditForm = (tp: LearningObjective) => {
    if (!writeAuth.allowed) {
      setFeedbackBanner({
        type: 'warning',
        text: writeAuth.reason || 'Mode Baca Saja aktif.'
      });
      return;
    }
    setEditingTp(tp);
    setFormCode(tp.code || '');
    setFormMateri(tp.materi || '');
    setFormDescription(tp.description || '');
    setFormScope(tp.classId ? 'class' : 'grade');
    setFeedbackBanner(null);
    setIsFormOpen(true);
  };

  const handleSubmitTp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!writeAuth.allowed || !selectedClassroom || !selectedSubjectId) {
      setFeedbackBanner({
        type: 'error',
        text: writeAuth.reason || 'Hak akses tulis ditolak.'
      });
      return;
    }

    const cleanCode = formCode.trim();
    const cleanDesc = formDescription.trim();
    const cleanMateri = formMateri.trim();

    if (!cleanCode || !cleanDesc) {
      setFeedbackBanner({
        type: 'error',
        text: 'Kode TP dan Deskripsi Tujuan Pembelajaran wajib diisi.'
      });
      return;
    }

    const duplicate = contextObjectives.find(
      (tp) =>
        tp.id !== editingTp?.id &&
        tp.code.trim().toLowerCase() === cleanCode.toLowerCase()
    );
    if (duplicate) {
      setFeedbackBanner({
        type: 'error',
        text: `Kode "${cleanCode}" sudah terdaftar pada mata pelajaran dan periode ini. Gunakan kode unik (misal: ${suggestNextTpCode(
          contextObjectives,
          selectedClassroom.gradeLevel
        )}).`
      });
      return;
    }

    const newTp: LearningObjective = {
      id: editingTp?.id || `tp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      subjectId: selectedSubjectId,
      gradeLevel: selectedClassroom.gradeLevel,
      ...(formScope === 'class' ? { classId: selectedClassroom.id } : {}),
      semester: selectedSemester,
      academicYear: selectedYear,
      code: cleanCode,
      ...(cleanMateri ? { materi: cleanMateri } : {}),
      description: cleanDesc,
      curriculumId: editingTp?.curriculumId || 'cur-merdeka',
      teacherId: writeAuth.resolvedTeacherId || currentUser.teacherId || editingTp?.teacherId,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.name
    };

    const res = onSaveObjective(newTp);
    if (res && res.success === false) {
      setFeedbackBanner({
        type: 'error',
        text: res.error || 'Gagal menyimpan Tujuan Pembelajaran.'
      });
      return;
    }

    setIsFormOpen(false);
    setEditingTp(null);
    setFeedbackBanner({
      type: 'success',
      text: `Tujuan Pembelajaran "${cleanCode}" berhasil disimpan untuk ${selectedSubject?.name || 'Mapel'} (${selectedClassroom.name}).`
    });
  };

  const handleRequestDeleteTp = (tp: LearningObjective) => {
    if (!writeAuth.allowed) {
      setFeedbackBanner({
        type: 'warning',
        text: writeAuth.reason || 'Mode Baca Saja aktif.'
      });
      return;
    }
    const usage = checkLearningObjectiveInUse({
      tpId: tp.id,
      learningChapters,
      summativePlans,
      formativeAssessments,
      summativeAssessments,
      scores
    });
    if (usage.inUse) {
      setFeedbackBanner({
        type: 'error',
        text: usage.reason || `TP "${tp.code}" sedang digunakan dan tidak dapat dihapus.`
      });
      return;
    }
    setConfirmDeleteTp(tp);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteTp) return;
    const target = confirmDeleteTp;
    setConfirmDeleteTp(null);
    const res = await onDeleteObjective(target.id);
    if (res && res.success === false) {
      setFeedbackBanner({
        type: 'error',
        text: res.error || `Gagal menghapus TP "${target.code}".`
      });
    } else {
      setFeedbackBanner({
        type: 'success',
        text: `Tujuan Pembelajaran "${target.code}" berhasil dihapus.`
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Asesmen Formatif — Daftar Tujuan Pembelajaran (TP)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5 leading-relaxed">
              Menu ini khusus untuk mengelola daftar <strong>Tujuan Pembelajaran (TP)</strong> per tahun ajaran,
              semester, kelas, dan mata pelajaran (tanpa input nilai peserta didik). TP yang dibuat di sini otomatis
              tersedia di modul <strong>Asesmen Sumatif</strong>, <strong>Pengolahan Nilai Excel</strong>, dan{' '}
              <strong>Deskripsi Rapor</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {writeAuth.allowed ? (
            <button
              type="button"
              onClick={openCreateForm}
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah TP Baru</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
              <Lock className="w-3.5 h-3.5" />
              <span>Mode Baca Saja</span>
            </span>
          )}
        </div>
      </div>

      {/* RBAC / Read-Only Notice */}
      {!writeAuth.allowed && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Informasi Hak Akses:</span>
            <span>{writeAuth.reason}</span>
          </div>
        </div>
      )}

      {/* Historical Formative Preservation Info */}
      {historicalFormativeCount > 0 && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            Terdapat <strong>{historicalFormativeCount}</strong> catatan asesmen formatif historis untuk kelas &
            mapel ini yang tetap dipertahankan aman di database sebagai referensi arsip & modul deskripsi rapor.
          </div>
        </div>
      )}

      {/* Feedback Banner */}
      {feedbackBanner && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            feedbackBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : feedbackBanner.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            {feedbackBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackBanner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Context Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        <div>
          <label className="block font-bold text-slate-600 mb-1">Tahun Ajaran</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500"
          >
            {yearOptions.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-600 mb-1">Semester</label>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value as 'Ganjil' | 'Genap')}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500"
          >
            <option value="Ganjil">Semester Ganjil</option>
            <option value="Genap">Semester Genap</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-600 mb-1">Mata Pelajaran</label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500"
          >
            {visibleSubjects.length === 0 ? (
              <option value="">Tidak ada mapel ditugaskan</option>
            ) : (
              visibleSubjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-600 mb-1">Kelas / Rombel</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500"
          >
            {visibleClassrooms.length === 0 ? (
              <option value="">Tidak ada kelas ditugaskan</option>
            ) : (
              visibleClassrooms.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  Kelas {cls.name} (Tingkat {cls.gradeLevel})
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-600 mb-1">Cari Kode / Deskripsi TP</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Contoh: TP 7.1 atau Bilangan..."
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Add / Edit TP Inline Panel */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmitTp}
          className="bg-teal-50/50 rounded-2xl border border-teal-200 p-5 space-y-4 shadow-xs animate-in fade-in"
        >
          <div className="flex items-center justify-between pb-2 border-b border-teal-200/80">
            <h3 className="text-sm font-extrabold text-teal-950 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-teal-700" />
              <span>
                {editingTp ? `Edit Tujuan Pembelajaran (${editingTp.code})` : 'Tambah Tujuan Pembelajaran (TP) Baru'}
              </span>
            </h3>
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setEditingTp(null);
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Kode TP <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="Contoh: TP 7.1"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Lingkup Kelas</label>
              <select
                value={formScope}
                onChange={(e) => setFormScope(e.target.value as 'grade' | 'class')}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500"
              >
                <option value="grade">
                  Semua Kelas Tingkat {selectedClassroom?.gradeLevel || '-'} (Standar)
                </option>
                <option value="class">Khusus Kelas {selectedClassroom?.name || '-'}</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Materi / Topik (Opsional)</label>
              <input
                type="text"
                value={formMateri}
                onChange={(e) => setFormMateri(e.target.value)}
                placeholder="Contoh: Bilangan Bulat & Pecahan"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-bold text-slate-700 mb-1">
              Deskripsi Tujuan Pembelajaran <span className="text-rose-600">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Tuliskan rumusan kompetensi yang dicapai peserta didik pada TP ini..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setEditingTp(null);
              }}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan TP</span>
            </button>
          </div>
        </form>
      )}

      {/* TP List Table (No Student List, No Scores, No Mastery Columns) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold text-slate-700">
            Menampilkan <span className="text-teal-700">{displayedObjectives.length}</span> Tujuan Pembelajaran —{' '}
            <span className="text-slate-900">{selectedSubject?.name || '-'}</span> •{' '}
            <span>Kelas {selectedClassroom?.name || '-'}</span> ({selectedYear} / {selectedSemester})
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Total TP pada konteks aktif: <strong>{contextObjectives.length}</strong>
          </div>
        </div>

        {displayedObjectives.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Target className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Belum ada Tujuan Pembelajaran (TP)</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Belum ditemukan TP untuk mata pelajaran dan kelas ini pada {selectedYear} Semester {selectedSemester}.
              {writeAuth.allowed && ' Klik tombol "Tambah TP Baru" di kanan atas untuk mulai menyusun daftar TP.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-bold">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4 w-32">Kode TP</th>
                  <th className="py-3 px-4">Deskripsi Tujuan Pembelajaran</th>
                  <th className="py-3 px-4 w-44">Lingkup & Periode</th>
                  <th className="py-3 px-4 w-36 text-center">Keterhubungan</th>
                  <th className="py-3 px-4 w-28 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedObjectives.map((tp, idx) => {
                  const usage = checkLearningObjectiveInUse({
                    tpId: tp.id,
                    learningChapters,
                    summativePlans,
                    formativeAssessments,
                    summativeAssessments,
                    scores
                  });
                  return (
                    <tr key={tp.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 text-center font-semibold text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 font-extrabold">
                          {tp.code}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {tp.materi && (
                          <div className="text-[11px] font-bold text-indigo-700 mb-0.5">Materi: {tp.materi}</div>
                        )}
                        <p className="text-slate-800 leading-relaxed">{tp.description}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-700">
                          {tp.classId
                            ? `Kelas ${classrooms.find((c) => c.id === tp.classId)?.name || tp.classId}`
                            : `Semua Tingkat ${tp.gradeLevel}`}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {tp.academicYear || 'Semua TA'} • Sm. {tp.semester}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {usage.inUse ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold"
                            title={usage.references.join('; ')}
                          >
                            Terhubung ({usage.references.length})
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Belum ditautkan</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            disabled={!writeAuth.allowed}
                            onClick={() => openEditForm(tp)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-700 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                            title="Edit TP"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={!writeAuth.allowed}
                            onClick={() => handleRequestDeleteTp(tp)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                            title={usage.inUse ? usage.reason : 'Hapus TP'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteTp && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Hapus Tujuan Pembelajaran?</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Anda akan menghapus <strong>{confirmDeleteTp.code}</strong>: &ldquo;{confirmDeleteTp.description}
                  &rdquo;. Tindakan ini hanya diizinkan karena TP belum terhubung ke BAB, Sumatif, maupun nilai rapor.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDeleteTp(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Ya, Hapus TP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
