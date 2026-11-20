import React, { useState, useMemo, useEffect } from 'react';
import {
  AssessmentPolicyConfig,
  AssessmentScore,
  AuthSessionContext,
  Classroom,
  Curriculum,
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
  Layers,
  Save,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ShieldAlert,
  BookOpen,
  Edit3,
  Trash2,
  Scale,
  Plus,
  ArrowRight,
  Info
} from 'lucide-react';
import { sortClassrooms } from '../utils/classroomSort';
import { sortSubjects } from '../utils/subjectSort';
import { getAvailableAcademicYears } from '../utils/academicYear';
import { getVisibleSubjectsForUser } from '../utils/teacherAssignmentHelper';
import {
  buildLearningChapterId,
  filterChaptersForContext,
  getNextChapterOrderAndCode,
  resolveSchoolWeights
} from '../utils/assessmentCalculation';
import {
  authorizeSubjectAssessmentWrite,
  checkLearningChapterInUse,
  getAuthorizedSubjectClassIds,
  InUseCheckResult
} from '../utils/authorizationGuard';

interface AsesmenSumatifViewProps {
  classrooms: Classroom[];
  subjects: Subject[];
  students?: unknown[];
  curricula?: Curriculum[];
  learningObjectives?: LearningObjective[];
  learningChapters: LearningChapter[];
  summativePlans: SummativeAssessmentPlan[];
  summativeAssessments?: SummativeAssessment[];
  scores?: AssessmentScore[];
  onSaveScores?: (...args: any[]) => void;
  onSaveLearningChapter: (chapter: LearningChapter) => { success: boolean; error?: string } | void;
  onDeleteLearningChapter: (
    chapterId: string,
    options?: { force?: boolean }
  ) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string } | void;
  onNavigateToSpreadsheet?: () => void;
  currentUser: User;
  teachingAssignments: TeachingAssignment[];
  teachers?: Teacher[];
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  assessmentPolicy?: AssessmentPolicyConfig;
  authContext?: AuthSessionContext | null;
}

export const AsesmenSumatifView: React.FC<AsesmenSumatifViewProps> = ({
  classrooms,
  subjects,
  curricula = [],
  learningChapters = [],
  summativePlans = [],
  summativeAssessments = [],
  scores = [],
  onSaveLearningChapter,
  onDeleteLearningChapter,
  onNavigateToSpreadsheet,
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

  const weights = useMemo(
    () => resolveSchoolWeights(curricula, assessmentPolicy),
    [curricula, assessmentPolicy]
  );

  const yearOptions = useMemo(() => {
    const baseYears = getAvailableAcademicYears(2023, 6);
    const existingYears = [
      ...learningChapters.map((c) => c.academicYear),
      ...summativePlans.map((p) => p.academicYear)
    ].filter((y): y is string => Boolean(y));
    return Array.from(new Set([academicYear, ...baseYears, ...existingYears]))
      .sort()
      .reverse();
  }, [academicYear, learningChapters, summativePlans]);

  const visibleSubjects = useMemo(() => {
    if (
      currentUser.role === 'admin' ||
      currentUser.role === 'kepsek' ||
      currentUser.role === 'walikelas'
    ) {
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
  }, [
    classrooms,
    currentUser,
    teachers,
    teachingAssignments,
    selectedSubjectId,
    selectedYear,
    selectedSemester
  ]);

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

  const contextChapters = useMemo(() => {
    if (!selectedSubjectId || !selectedClassroom) return [];
    return filterChaptersForContext(learningChapters, {
      subjectId: selectedSubjectId,
      classId: selectedClassroom.id,
      academicYear: selectedYear,
      semester: selectedSemester
    });
  }, [learningChapters, selectedSubjectId, selectedClassroom, selectedYear, selectedSemester]);

  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [chapterTitleInput, setChapterTitleInput] = useState('');
  const [chapterFormError, setChapterFormError] = useState<string | null>(null);
  const [pendingDeleteChapter, setPendingDeleteChapter] = useState<{
    chapter: LearningChapter;
    usage: InUseCheckResult;
  } | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);

  const handleStartEditChapter = (ch: LearningChapter) => {
    setEditingChapterId(ch.id);
    setChapterTitleInput(ch.title || '');
    setChapterFormError(null);
    setPendingDeleteChapter(null);
  };

  const handleCancelEditChapter = () => {
    setEditingChapterId(null);
    setChapterTitleInput('');
    setChapterFormError(null);
  };

  const handleSaveChapterForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!writeAuth.allowed || !selectedClassroom || !selectedSubjectId) return;

    const titleClean = chapterTitleInput.trim();
    if (!titleClean) {
      setChapterFormError('Judul BAB wajib diisi.');
      return;
    }

    const existingCh = editingChapterId
      ? contextChapters.find((c) => c.id === editingChapterId)
      : undefined;

    const { orderIndex, code } = existingCh
      ? { orderIndex: existingCh.orderIndex, code: existingCh.code }
      : getNextChapterOrderAndCode(contextChapters);

    const resolvedTeacherId =
      writeAuth.resolvedTeacherId ||
      existingCh?.teacherId ||
      currentUser.teacherId ||
      currentUser.id ||
      'admin';

    const payload: LearningChapter = {
      id:
        existingCh?.id ||
        buildLearningChapterId(
          selectedSubjectId,
          selectedClassroom.id,
          selectedYear,
          selectedSemester,
          orderIndex
        ),
      code,
      orderIndex,
      title: titleClean,
      description: existingCh?.description || '',
      subjectId: selectedSubjectId,
      classId: selectedClassroom.id,
      gradeLevel: selectedClassroom.gradeLevel,
      teacherId: resolvedTeacherId,
      academicYear: selectedYear,
      semester: selectedSemester,
      linkedTpIds: existingCh?.linkedTpIds,
      isLocked: existingCh?.isLocked,
      createdAt: existingCh?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const res = onSaveLearningChapter(payload);
    if (res && typeof res === 'object' && 'success' in res && !res.success) {
      setChapterFormError(res.error || 'Gagal menyimpan BAB.');
      return;
    }

    setEditingChapterId(null);
    setChapterTitleInput('');
    setChapterFormError(null);
    setFeedbackBanner({
      type: 'success',
      text: existingCh
        ? `Judul BAB "${titleClean}" berhasil diperbarui.`
        : `BAB baru "${titleClean}" berhasil ditambahkan.`
    });
  };

  const handleRequestDeleteChapter = (ch: LearningChapter) => {
    const usage = checkLearningChapterInUse({
      chapterId: ch.id,
      summativePlans,
      summativeAssessments,
      scores
    });
    setPendingDeleteChapter({ chapter: ch, usage });
  };

  const handleConfirmDeleteChapter = async () => {
    if (!pendingDeleteChapter) return;
    const { chapter } = pendingDeleteChapter;
    const res = await onDeleteLearningChapter(chapter.id, { force: true });
    setPendingDeleteChapter(null);

    if (res && typeof res === 'object' && 'success' in res && !res.success) {
      setFeedbackBanner({
        type: 'error',
        text: res.error || 'Gagal menghapus BAB.'
      });
      return;
    }

    if (editingChapterId === chapter.id) {
      handleCancelEditChapter();
    }
    setFeedbackBanner({
      type: 'success',
      text: `Master BAB "${chapter.title}" dihapus. Nilai dan arsip rapor lama tetap aman tersimpan.`
    });
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-amber-300 border-b-2 border-amber-400 py-3 px-6 rounded-xl text-center shadow-xs">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-wide uppercase">
          ASESMEN SUMATIF — PENGELOLAAN JUDUL BAB
        </h1>
      </div>

      {/* Info & Active Weight Policy Callout */}
      <div className="bg-sky-50 rounded-2xl border border-sky-200 p-4 sm:p-5 text-slate-900 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start gap-3 text-xs sm:text-sm">
            <Info className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-extrabold text-sky-950">
                Menu ini khusus untuk menambahkan, mengubah, dan menghapus Judul BAB Sumatif
              </div>
              <p className="text-slate-700 leading-relaxed">
                Cukup masukkan judul BAB (misal: <strong>BAB 1</strong>, <strong>BAB 2</strong>,{' '}
                <strong>BAB 3</strong>, atau judul materi BAB) <strong>tanpa kode BAB</strong> dan{' '}
                <strong>tanpa input nilai</strong>. Seluruh pengisian nilai BAB 0–100,{' '}
                <strong>SAS Non Tes</strong>, <strong>SAS Tes</strong>,{' '}
                <strong>Nilai Akhir SAS</strong>, dan <strong>Nilai Rapor</strong> dilakukan di menu{' '}
                <strong>15. Pengolahan Nilai (Tabel)</strong>.
              </p>
            </div>
          </div>

          {onNavigateToSpreadsheet && (
            <button
              type="button"
              onClick={onNavigateToSpreadsheet}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shrink-0 shadow-xs transition cursor-pointer"
            >
              <span>Buka Pengolahan Nilai (Tabel)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="pt-2 border-t border-sky-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-900 text-white font-bold shadow-xs">
            <Scale className="w-3.5 h-3.5 text-amber-300" />
            <span>
              Bobot Aktif: Lingkup Materi {weights.lingkupMateriWeightPercent}% • SAS{' '}
              {weights.sasWeightPercent}%
              {!weights.sasConducted && ' (SAS Tidak Dilaksanakan)'}
            </span>
          </span>
          <span className="text-slate-600 font-semibold">
            Rumus Nilai Rapor: {weights.formulaLabel}
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block font-bold text-slate-600 mb-1">Tahun Ajaran</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800"
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
            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800"
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
            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800"
          >
            {visibleSubjects.length === 0 ? (
              <option value="">Tidak ada mapel</option>
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
            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800"
          >
            {visibleClassrooms.length === 0 ? (
              <option value="">Tidak ada kelas</option>
            ) : (
              visibleClassrooms.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  Kelas {cls.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {!writeAuth.allowed && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          {currentUser.role === 'kepsek' || currentUser.role === 'walikelas' ? (
            <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-bold block">Informasi Hak Akses (Mode Baca Saja):</span>
            <span>{writeAuth.reason}</span>
          </div>
        </div>
      )}

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
            ✕
          </button>
        </div>
      )}

      {/* Form Input Judul BAB (Tanpa kode BAB & tanpa input nilai) */}
      {writeAuth.allowed && (
        <form
          onSubmit={handleSaveChapterForm}
          className="bg-white rounded-2xl border border-indigo-200 p-5 shadow-xs space-y-4 text-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                {editingChapterId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  {editingChapterId ? 'Ubah Judul BAB Sumatif' : 'Tambah Judul BAB Sumatif Baru'}
                </h2>
                <p className="text-[11px] text-slate-500">
                  {selectedSubject?.name || '-'} • Kelas {selectedClassroom?.name || '-'} (
                  {selectedYear} / {selectedSemester})
                </p>
              </div>
            </div>
            {editingChapterId && (
              <button
                type="button"
                onClick={handleCancelEditChapter}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                Batal Ubah
              </button>
            )}
          </div>

          {chapterFormError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
              {chapterFormError}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Judul BAB <span className="text-rose-600">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                required
                value={chapterTitleInput}
                onChange={(e) => setChapterTitleInput(e.target.value)}
                placeholder={`Contoh: BAB ${contextChapters.length + 1} - Bilangan Bulat`}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer shrink-0"
              >
                <Save className="w-4 h-4" />
                <span>{editingChapterId ? 'Simpan Perubahan Judul' : 'Tambah BAB'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Non-destructive delete confirmation */}
      {pendingDeleteChapter && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-2.5 text-xs shadow-xs">
          <div className="flex items-start gap-2.5 text-amber-950 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="block text-sm">Konfirmasi Penghapusan BAB</span>
              <p className="font-normal text-amber-900 mt-1">
                {pendingDeleteChapter.usage.inUse
                  ? `Peringatan: ${pendingDeleteChapter.usage.reason} Menghapus master BAB ini tidak akan menghapus nilai atau arsip rapor lama.`
                  : `Apakah Anda yakin ingin menghapus "${pendingDeleteChapter.chapter.title}"? Data nilai dan arsip rapor lama tetap aman terjaga.`}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPendingDeleteChapter(null)}
              className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteChapter}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
            >
              Ya, Hapus BAB
            </button>
          </div>
        </div>
      )}

      {/* Daftar Judul BAB (Tanpa kode BAB & tanpa tabel nilai) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>
              Daftar BAB Sumatif — {selectedSubject?.name || '-'} • Kelas{' '}
              {selectedClassroom?.name || '-'} ({selectedYear} / {selectedSemester})
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-bold">
            Total: {contextChapters.length} BAB
          </span>
        </div>

        {contextChapters.length === 0 ? (
          <div className="p-10 text-center space-y-2 text-xs">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">
              Belum ada Judul BAB pada mata pelajaran dan kelas ini
            </p>
            <p className="text-slate-500 max-w-md mx-auto">
              Tambahkan judul BAB (misal: BAB 1, BAB 2, BAB 3) menggunakan formulir di atas.
              Kolom penilaian tiap BAB akan otomatis muncul di menu{' '}
              <strong>15. Pengolahan Nilai (Tabel)</strong>.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {contextChapters.map((ch, idx) => (
              <div
                key={ch.id}
                className="p-4 sm:px-5 hover:bg-slate-50/70 transition flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-lg bg-indigo-100 text-indigo-900 font-extrabold text-[11px] shrink-0">
                    BAB {idx + 1}
                  </span>
                  <div className="font-bold text-slate-900 text-sm">{ch.title}</div>
                </div>

                {writeAuth.allowed && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEditChapter(ch)}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Ubah Judul</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRequestDeleteChapter(ch)}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
