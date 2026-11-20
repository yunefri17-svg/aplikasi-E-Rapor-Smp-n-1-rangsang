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
  BookOpen,
  Plus,
  Edit3,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Lock,
  ArrowRight,
  Info
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
  getAuthorizedSubjectClassIds,
  InUseCheckResult
} from '../utils/authorizationGuard';

interface AsesmenFormatifViewProps {
  classrooms: Classroom[];
  subjects: Subject[];
  students?: unknown[];
  learningObjectives: LearningObjective[];
  learningChapters?: LearningChapter[];
  summativePlans?: SummativeAssessmentPlan[];
  formativeAssessments?: FormativeAssessment[];
  summativeAssessments?: SummativeAssessment[];
  scores?: AssessmentScore[];
  onSaveScores?: (...args: any[]) => void;
  onSaveObjective?: (obj: LearningObjective) => { success: boolean; error?: string } | void;
  onDeleteObjective?: (
    objId: string,
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

  const yearOptions = useMemo(() => {
    const baseYears = getAvailableAcademicYears(2023, 6);
    const existingYears = learningObjectives
      .map((tp) => tp.academicYear)
      .filter((y): y is string => Boolean(y));
    return Array.from(new Set([academicYear, ...baseYears, ...existingYears]))
      .sort()
      .reverse();
  }, [academicYear, learningObjectives]);

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

  const authScope = useMemo(
    () =>
      getAuthorizedSubjectClassIds({
        user: currentUser,
        teachers,
        teachingAssignments,
        subjectId: selectedSubjectId || undefined,
        academicYear: selectedYear,
        semester: selectedSemester
      }),
    [currentUser, teachers, teachingAssignments, selectedSubjectId, selectedYear, selectedSemester]
  );

  const visibleClassrooms = useMemo(() => {
    const sorted = sortClassrooms(classrooms);
    if (authScope.allowAll) return sorted;
    if (authScope.classIds.length > 0) {
      return sorted.filter((c) => authScope.classIds.includes(c.id));
    }
    if (currentUser.role === 'walikelas' && currentUser.classId) {
      return sorted.filter((c) => c.id === currentUser.classId);
    }
    return sorted;
  }, [classrooms, authScope, currentUser]);

  const availableGrades = useMemo(() => {
    const grades = Array.from(
      new Set(visibleClassrooms.map((c) => String(c.gradeLevel)).filter(Boolean))
    ).sort();
    return grades.length > 0 ? grades : ['7', '8', '9'];
  }, [visibleClassrooms]);

  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>(availableGrades[0] || '7');

  useEffect(() => {
    if (availableGrades.length > 0 && !availableGrades.includes(selectedGradeLevel)) {
      setSelectedGradeLevel(availableGrades[0]);
    }
  }, [availableGrades, selectedGradeLevel]);

  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === selectedSubjectId),
    [subjects, selectedSubjectId]
  );

  const representativeClassId = useMemo(() => {
    const writableSet = new Set(authScope.writableClassIds);
    const writableInGrade = visibleClassrooms.find(
      (c) => String(c.gradeLevel) === String(selectedGradeLevel) && writableSet.has(c.id)
    );
    if (writableInGrade) return writableInGrade.id;
    const anyInGrade = visibleClassrooms.find(
      (c) => String(c.gradeLevel) === String(selectedGradeLevel)
    );
    return anyInGrade?.id;
  }, [authScope.writableClassIds, visibleClassrooms, selectedGradeLevel]);

  const writeAuth = useMemo(() => {
    if (!selectedSubjectId) {
      return {
        allowed: false,
        readOnly: true,
        reason: 'Pilih Mata Pelajaran terlebih dahulu.'
      };
    }
    return authorizeSubjectAssessmentWrite({
      user: currentUser,
      subjectId: selectedSubjectId,
      classId: representativeClassId,
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
    representativeClassId,
    selectedYear,
    selectedSemester,
    teachers,
    teachingAssignments,
    assessmentPolicy,
    authContext
  ]);

  const subjectYearObjectives = useMemo(() => {
    if (!selectedSubjectId) return [];
    return filterObjectivesForContext(learningObjectives, {
      subjectId: selectedSubjectId,
      gradeLevel: selectedGradeLevel,
      semester: selectedSemester,
      academicYear: selectedYear
    });
  }, [learningObjectives, selectedSubjectId, selectedGradeLevel, selectedSemester, selectedYear]);

  const [editingTpId, setEditingTpId] = useState<string | null>(null);
  const [tpMateriInput, setTpMateriInput] = useState('');
  const [tpDescInput, setTpDescInput] = useState('');
  const [tpFormError, setTpFormError] = useState<string | null>(null);
  const [pendingDeleteTp, setPendingDeleteTp] = useState<{
    tp: LearningObjective;
    usage: InUseCheckResult;
  } | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);

  const handleStartEditTp = (tp: LearningObjective) => {
    setEditingTpId(tp.id);
    setTpMateriInput(tp.materi || '');
    setTpDescInput(tp.description || '');
    setTpFormError(null);
    setPendingDeleteTp(null);
  };

  const handleCancelEditTp = () => {
    setEditingTpId(null);
    setTpMateriInput('');
    setTpDescInput('');
    setTpFormError(null);
  };

  const handleSaveTpForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveObjective || !writeAuth.allowed || !selectedSubjectId) return;

    const cleanDesc = tpDescInput.trim();
    if (!cleanDesc) {
      setTpFormError('Uraian Tujuan Pembelajaran wajib diisi.');
      return;
    }

    const gradeLevel = (selectedGradeLevel as '7' | '8' | '9') || '7';
    const existingObj = editingTpId
      ? learningObjectives.find((o) => o.id === editingTpId)
      : undefined;

    // Auto-generate internal code silently (tidak ditampilkan / tidak diinput guru)
    const internalCode =
      existingObj?.code || suggestNextTpCode(subjectYearObjectives, gradeLevel);

    const payload: LearningObjective = {
      id:
        existingObj?.id ||
        `tp-${selectedSubjectId}-${gradeLevel}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      curriculumId: existingObj?.curriculumId || 'cur-merdeka',
      subjectId: selectedSubjectId,
      classId: existingObj?.classId,
      gradeLevel: existingObj?.gradeLevel || gradeLevel,
      code: internalCode,
      materi: tpMateriInput.trim() || undefined,
      description: cleanDesc,
      semester: existingObj?.semester || selectedSemester,
      academicYear: existingObj?.academicYear || selectedYear,
      phase: existingObj?.phase || 'Fase D',
      createdByTeacherId:
        existingObj?.createdByTeacherId ||
        writeAuth.resolvedTeacherId ||
        currentUser.teacherId ||
        currentUser.id ||
        'admin',
      teacherId:
        writeAuth.resolvedTeacherId ||
        existingObj?.teacherId ||
        currentUser.teacherId ||
        currentUser.id ||
        'admin',
      updatedBy: currentUser.name,
      updatedAt: new Date().toISOString()
    };

    const res = onSaveObjective(payload);
    if (res && typeof res === 'object' && 'success' in res && !res.success) {
      setTpFormError(res.error || 'Gagal menyimpan Tujuan Pembelajaran.');
      return;
    }

    setEditingTpId(null);
    setTpMateriInput('');
    setTpDescInput('');
    setTpFormError(null);
    setFeedbackBanner({
      type: 'success',
      text: existingObj
        ? 'Tujuan Pembelajaran berhasil diperbarui.'
        : 'Tujuan Pembelajaran baru berhasil ditambahkan.'
    });
  };

  const handleRequestDeleteTp = (tp: LearningObjective) => {
    const usage = checkLearningObjectiveInUse({
      tpId: tp.id,
      learningChapters,
      summativePlans,
      formativeAssessments,
      summativeAssessments,
      scores
    });
    setPendingDeleteTp({ tp, usage });
  };

  const handleConfirmDeleteTp = async () => {
    if (!pendingDeleteTp || !onDeleteObjective) return;
    const { tp } = pendingDeleteTp;
    const res = await onDeleteObjective(tp.id, { force: true });
    setPendingDeleteTp(null);

    if (res && typeof res === 'object' && 'success' in res && !res.success) {
      setFeedbackBanner({
        type: 'error',
        text: res.error || 'Gagal menghapus Tujuan Pembelajaran.'
      });
      return;
    }

    if (editingTpId === tp.id) {
      handleCancelEditTp();
    }
    setFeedbackBanner({
      type: 'success',
      text: 'Master Tujuan Pembelajaran dihapus. Data nilai dan arsip rapor lama tetap aman tersimpan.'
    });
  };

  const gradeRomawi = (g: string) => (g === '7' ? 'VII' : g === '8' ? 'VIII' : g === '9' ? 'IX' : g);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-amber-300 border-b-2 border-amber-400 py-3 px-6 rounded-xl text-center shadow-xs">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-wide uppercase">
          ASESMEN FORMATIF — PENGELOLAAN TUJUAN PEMBELAJARAN (TP)
        </h1>
      </div>

      {/* Info Callout */}
      <div className="bg-sky-50 rounded-2xl border border-sky-200 p-4 sm:p-5 text-slate-900 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3 text-xs sm:text-sm">
          <Info className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-extrabold text-sky-950">
              Menu ini khusus untuk menambahkan, mengubah, dan menghapus Tujuan Pembelajaran (TP)
            </div>
            <p className="text-slate-700 leading-relaxed">
              TP diisi berdasarkan Mata Pelajaran &amp; Tahun Ajaran <strong>tanpa kode TP</strong> dan{' '}
              <strong>tanpa input nilai angka 0–100</strong>. Pengisian ketercapaian{' '}
              <strong>KKTP (0/1)</strong>, <strong>Tampil/Tidak (0/1)</strong>, serta{' '}
              <strong>Deskripsi Capaian Rapor</strong> dilakukan langsung di tabel pada menu{' '}
              <strong>15. Pengolahan Nilai (Tabel)</strong>.
            </p>
          </div>
        </div>
        {onNavigateToSpreadsheet && (
          <button
            type="button"
            onClick={onNavigateToSpreadsheet}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-2 shrink-0 shadow-xs transition cursor-pointer"
          >
            <span>Buka Pengolahan Nilai (Tabel)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
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
          <label className="block font-bold text-slate-600 mb-1">Tingkat Kelas</label>
          <select
            value={selectedGradeLevel}
            onChange={(e) => setSelectedGradeLevel(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800"
          >
            {availableGrades.map((g) => (
              <option key={g} value={g}>
                Kelas {gradeRomawi(g)}
              </option>
            ))}
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

      {/* Form Input TP */}
      {writeAuth.allowed && onSaveObjective && (
        <form
          onSubmit={handleSaveTpForm}
          className="bg-white rounded-2xl border border-indigo-200 p-5 shadow-xs space-y-4 text-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                {editingTpId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  {editingTpId
                    ? 'Ubah Nama / Uraian Tujuan Pembelajaran'
                    : 'Tambah Tujuan Pembelajaran (TP) Baru'}
                </h2>
                <p className="text-[11px] text-slate-500">
                  {selectedSubject?.name || '-'} • Kelas {gradeRomawi(selectedGradeLevel)} •{' '}
                  {selectedYear} Semester {selectedSemester}
                </p>
              </div>
            </div>
            {editingTpId && (
              <button
                type="button"
                onClick={handleCancelEditTp}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                Batal Ubah
              </button>
            )}
          </div>

          {tpFormError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
              {tpFormError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Nama / Topik Singkat TP (Opsional)
              </label>
              <input
                type="text"
                value={tpMateriInput}
                onChange={(e) => setTpMateriInput(e.target.value)}
                placeholder="Contoh: Operasi Hitung Bilangan Bulat"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Uraian Tujuan Pembelajaran <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={tpDescInput}
                onChange={(e) => setTpDescInput(e.target.value)}
                placeholder="Contoh: Peserta didik mampu memahami dan menyelesaikan masalah operasi hitung bilangan bulat dalam kehidupan sehari-hari."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{editingTpId ? 'Simpan Perubahan TP' : 'Tambah TP'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Non-destructive delete warning */}
      {pendingDeleteTp && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-2.5 text-xs shadow-xs">
          <div className="flex items-start gap-2.5 text-amber-950 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="block text-sm">Konfirmasi Penghapusan Tujuan Pembelajaran</span>
              <p className="font-normal text-amber-900 mt-1">
                {pendingDeleteTp.usage.inUse
                  ? `Peringatan: ${pendingDeleteTp.usage.reason} Menghapus master TP ini tidak akan menghapus data nilai atau arsip rapor lama.`
                  : 'Apakah Anda yakin ingin menghapus Tujuan Pembelajaran ini? Data nilai dan arsip rapor lama tetap aman tersimpan.'}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPendingDeleteTp(null)}
              className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteTp}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
            >
              Ya, Hapus TP
            </button>
          </div>
        </div>
      )}

      {/* Daftar TP (Tanpa kode TP & tanpa kolom nilai) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>
              Daftar Tujuan Pembelajaran — {selectedSubject?.name || '-'} (Kelas{' '}
              {gradeRomawi(selectedGradeLevel)} • {selectedYear} {selectedSemester})
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-bold">
            Total: {subjectYearObjectives.length} TP
          </span>
        </div>

        {subjectYearObjectives.length === 0 ? (
          <div className="p-10 text-center space-y-2 text-xs">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">
              Belum ada Tujuan Pembelajaran (TP) pada mata pelajaran dan periode ini
            </p>
            <p className="text-slate-500 max-w-md mx-auto">
              Gunakan formulir di atas untuk menambahkan TP baru. Setelah TP ditambahkan, kolom{' '}
              <strong>KKTP (0/1)</strong> &amp; <strong>Tampil/Tidak (0/1)</strong> akan muncul
              otomatis di menu <strong>15. Pengolahan Nilai (Tabel)</strong>.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {subjectYearObjectives.map((tp, idx) => (
              <div
                key={tp.id}
                className="p-4 sm:px-5 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3 flex-1">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-extrabold text-[11px] shrink-0">
                    TP {idx + 1}
                  </span>
                  <div className="space-y-1 flex-1">
                    {tp.materi && (
                      <div className="font-extrabold text-slate-900 text-sm">{tp.materi}</div>
                    )}
                    <div className="text-slate-700 leading-relaxed text-xs sm:text-sm">
                      {tp.description}
                    </div>
                  </div>
                </div>

                {writeAuth.allowed && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {onSaveObjective && (
                      <button
                        type="button"
                        onClick={() => handleStartEditTp(tp)}
                        className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Ubah</span>
                      </button>
                    )}
                    {onDeleteObjective && (
                      <button
                        type="button"
                        onClick={() => handleRequestDeleteTp(tp)}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    )}
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
