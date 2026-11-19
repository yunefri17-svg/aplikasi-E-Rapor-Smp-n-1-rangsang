import React, { useState, useMemo, useEffect } from 'react';
import {
  AssessmentPolicyConfig,
  AssessmentScore,
  AuthSessionContext,
  Classroom,
  LearningChapter,
  LearningObjective,
  Student,
  Subject,
  SummativeAssessment,
  SummativeAssessmentPlan,
  Teacher,
  TeachingAssignment,
  User,
  AppNotification
} from '../types/erapor';
import {
  Layers,
  Save,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ShieldAlert,
  Plus,
  BookOpen
} from 'lucide-react';
import { sortClassrooms } from '../utils/classroomSort';
import { sortSubjects } from '../utils/subjectSort';
import { sortStudentsAlphabetically } from '../utils/studentSort';
import { getAvailableAcademicYears } from '../utils/academicYear';
import { getVisibleSubjectsForUser } from '../utils/teacherAssignmentHelper';
import {
  buildDeterministicScoreId,
  computeStudentReportScore,
  filterChaptersForContext,
  getNextChapterOrderAndCode,
  buildLearningChapterId,
  clampScore0To100
} from '../utils/assessmentCalculation';
import {
  authorizeSubjectAssessmentWrite,
  getAuthorizedSubjectClassIds
} from '../utils/authorizationGuard';
import { normalizeAcademicYearValue, normalizeSemesterValue } from '../utils/electiveSubjectHelper';

interface AsesmenSumatifViewProps {
  classrooms: Classroom[];
  subjects: Subject[];
  students: Student[];
  learningObjectives: LearningObjective[];
  learningChapters: LearningChapter[];
  summativePlans: SummativeAssessmentPlan[];
  summativeAssessments?: SummativeAssessment[];
  scores?: AssessmentScore[];
  onSaveScores: (scores: AssessmentScore[], notification?: AppNotification) => void;
  onSaveLearningChapter: (chapter: LearningChapter) => void;
  onDeleteLearningChapter: (chapterId: string) => void;
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
  students,
  learningChapters = [],
  summativePlans = [],
  scores = [],
  onSaveScores,
  onSaveLearningChapter,
  currentUser,
  teachingAssignments,
  teachers = [],
  academicYear,
  semester,
  assessmentPolicy
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
    const existingYears = [
      ...learningChapters.map((c) => c.academicYear),
      ...summativePlans.map((p) => p.academicYear)
    ].filter((y): y is string => Boolean(y));
    return Array.from(new Set([academicYear, ...baseYears, ...existingYears])).sort().reverse();
  }, [academicYear, learningChapters, summativePlans]);

  const visibleSubjects = useMemo(() => {
    if (currentUser.role === 'admin' || currentUser.role === 'kepsek' || currentUser.role === 'walikelas') {
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
      assessmentPolicy
    });
  }, [
    currentUser,
    selectedSubjectId,
    selectedClassId,
    selectedYear,
    selectedSemester,
    teachers,
    teachingAssignments,
    assessmentPolicy
  ]);

  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    const list = students.filter((s) => s.classId === selectedClassId && s.status === 'Aktif');
    return sortStudentsAlphabetically(list);
  }, [students, selectedClassId]);

  const contextChapters = useMemo(() => {
    if (!selectedSubjectId || !selectedClassroom) return [];
    return filterChaptersForContext(learningChapters, {
      subjectId: selectedSubjectId,
      classId: selectedClassroom.id,
      academicYear: selectedYear,
      semester: selectedSemester
    });
  }, [learningChapters, selectedSubjectId, selectedClassroom, selectedYear, selectedSemester]);

  const [localScopeScores, setLocalScopeScores] = useState<Record<string, Record<string, string>>>({});
  const [localSasNonTes, setLocalSasNonTes] = useState<Record<string, string>>({});
  const [localSasTes, setLocalSasTes] = useState<Record<string, string>>({});

  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterDesc, setNewChapterDesc] = useState('');

  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const scopeMap: Record<string, Record<string, string>> = {};
    const nonTesMap: Record<string, string> = {};
    const tesMap: Record<string, string> = {};
    const targetYear = normalizeAcademicYearValue(selectedYear);
    const targetSem = normalizeSemesterValue(selectedSemester);

    classStudents.forEach((std) => {
      const existing = scores.find(
        (sc) =>
          sc.studentId === std.id &&
          sc.subjectId === selectedSubjectId &&
          normalizeAcademicYearValue(sc.academicYear) === targetYear &&
          normalizeSemesterValue(sc.semester) === targetSem
      );
      const sScores: Record<string, string> = {};
      const mergedSource = {
        ...(existing?.sumatifMateriScores || {}),
        ...(existing?.chapterScores || {})
      };
      Object.entries(mergedSource).forEach(([k, v]) => {
        sScores[k] = v !== undefined && v !== null ? String(v) : '';
      });
      scopeMap[std.id] = sScores;
      nonTesMap[std.id] = existing?.sasNonTes !== undefined ? String(existing.sasNonTes) : '';
      tesMap[std.id] = existing?.sasTes !== undefined ? String(existing.sasTes) : '';
    });

    setLocalScopeScores(scopeMap);
    setLocalSasNonTes(nonTesMap);
    setLocalSasTes(tesMap);
  }, [classStudents, scores, selectedSubjectId, selectedYear, selectedSemester]);

  const handleScopeChange = (studentId: string, chapterId: string, val: string) => {
    if (!writeAuth.allowed) return;
    setLocalScopeScores((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [chapterId]: val
      }
    }));
  };

  const handleSasChange = (studentId: string, type: 'nontes' | 'tes', val: string) => {
    if (!writeAuth.allowed) return;
    if (type === 'nontes') {
      setLocalSasNonTes((prev) => ({ ...prev, [studentId]: val }));
    } else {
      setLocalSasTes((prev) => ({ ...prev, [studentId]: val }));
    }
  };

  const handleAddChapter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!writeAuth.allowed || !selectedClassroom || !selectedSubjectId) return;

    const titleClean = newChapterTitle.trim();
    if (!titleClean) {
      setFeedbackBanner({ type: 'error', text: 'Judul lingkup materi wajib diisi.' });
      return;
    }

    const { orderIndex, code } = getNextChapterOrderAndCode(contextChapters);
    const newCh: LearningChapter = {
      id: buildLearningChapterId(selectedSubjectId, selectedClassroom.id, selectedYear, selectedSemester, orderIndex),
      code,
      orderIndex,
      title: titleClean,
      description: newChapterDesc.trim(),
      subjectId: selectedSubjectId,
      classId: selectedClassroom.id,
      gradeLevel: selectedClassroom.gradeLevel,
      teacherId: currentUser.teacherId || '',
      academicYear: selectedYear,
      semester: selectedSemester,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveLearningChapter(newCh);
    setNewChapterTitle('');
    setNewChapterDesc('');
    setIsChapterModalOpen(false);
    setFeedbackBanner({
      type: 'success',
      text: `Lingkup materi "${code}: ${titleClean}" berhasil ditambahkan.`
    });
  };

  const handleSaveAll = () => {
    if (!writeAuth.allowed || !selectedSubjectId || !selectedClassId) {
      setFeedbackBanner({ type: 'error', text: writeAuth.reason || 'Hak akses tulis ditolak.' });
      return;
    }

    setIsSaving(true);
    try {
      const targetYear = normalizeAcademicYearValue(selectedYear);
      const targetSem = normalizeSemesterValue(selectedSemester);

      const scoresToSave: AssessmentScore[] = classStudents.map((std) => {
        const existing = scores.find(
          (sc) =>
            sc.studentId === std.id &&
            sc.subjectId === selectedSubjectId &&
            normalizeAcademicYearValue(sc.academicYear) === targetYear &&
            normalizeSemesterValue(sc.semester) === targetSem
        );

        const studentScopes = localScopeScores[std.id] || {};
        const parsedScopeScores: Record<string, number> = {};
        const mergedMateriScores: Record<string, number> = {
          ...(existing?.sumatifMateriScores || {})
        };
        const mergedChapterScores: Record<string, number> = {
          ...(existing?.chapterScores || {})
        };

        contextChapters.forEach((ch) => {
          const raw = studentScopes[ch.id];
          const trimmed = String(raw ?? '').trim();
          if (trimmed !== '') {
            const num = Number(trimmed.replace(',', '.'));
            if (Number.isFinite(num)) {
              const clamped = clampScore0To100(num);
              parsedScopeScores[ch.id] = clamped;
              mergedChapterScores[ch.id] = clamped;
              mergedMateriScores[ch.id] = clamped;
            }
          } else {
            delete mergedChapterScores[ch.id];
            delete mergedMateriScores[ch.id];
          }
        });

        const rawNonTes = String(localSasNonTes[std.id] ?? '').trim();
        const rawTes = String(localSasTes[std.id] ?? '').trim();
        const parsedNonTes = rawNonTes !== '' ? Number(rawNonTes.replace(',', '.')) : NaN;
        const parsedTes = rawTes !== '' ? Number(rawTes.replace(',', '.')) : NaN;
        const nonTesNum = Number.isFinite(parsedNonTes) ? clampScore0To100(parsedNonTes) : undefined;
        const tesNum = Number.isFinite(parsedTes) ? clampScore0To100(parsedTes) : undefined;

        let naSasNum: number | undefined = undefined;
        if (nonTesNum !== undefined && tesNum !== undefined) {
          naSasNum = Math.round(((nonTesNum + tesNum) / 2) * 100) / 100;
        } else if (nonTesNum !== undefined) {
          naSasNum = nonTesNum;
        } else if (tesNum !== undefined) {
          naSasNum = tesNum;
        }

        const calc = computeStudentReportScore({
          chapters: contextChapters,
          chapterScores: parsedScopeScores,
          sasScore: naSasNum,
          formatifScores: existing?.formatifScores || {},
          manualFinalScore: existing?.manualFinalScore,
          passingCriteria: selectedSubject?.kkm || 75
        });

        const id = existing?.id || buildDeterministicScoreId(std.id, selectedSubjectId, selectedYear, selectedSemester);

        return {
          ...(existing || {}),
          id,
          studentId: std.id,
          studentName: std.name,
          subjectId: selectedSubjectId,
          subjectName: selectedSubject?.name || existing?.subjectName,
          classId: selectedClassId,
          className: selectedClassroom?.name || existing?.className,
          academicYear: selectedYear,
          semester: selectedSemester,
          formatifScores: existing?.formatifScores || {},
          chapterScores: mergedChapterScores,
          sumatifMateriScores: mergedMateriScores,
          babAverage: calc.babAverage,
          sumatifAverage: calc.sumatifAverage,
          sumatifAkhirSemester: naSasNum ?? 0,
          hasSasScore: naSasNum !== undefined,
          sasNonTes: nonTesNum,
          sasTes: tesNum,
          naSas: naSasNum,
          finalScore: calc.finalScore ?? existing?.finalScore ?? 0,
          rawFinalScore: calc.rawFinalScore ?? existing?.rawFinalScore,
          predicate: calc.predicate ?? existing?.predicate ?? 'D',
          completenessStatus: calc.completenessStatus,
          hasMissingComponents: calc.hasMissingComponents,
          missingComponentNote: calc.missingComponentNote,
          finalScoreBreakdown: calc.breakdownText,
          status: existing?.status === 'TERKUNCI' ? 'TERKUNCI' : 'SELESAI',
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.name,
          updatedById: currentUser.id
        } as AssessmentScore;
      });

      onSaveScores(scoresToSave, {
        id: `notif-${Date.now()}`,
        title: 'Asesmen Sumatif Disimpan',
        message: `Nilai sumatif & SAS untuk ${classStudents.length} siswa berhasil disimpan.`,
        createdAt: new Date().toISOString(),
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        type: 'completed'
      });

      setFeedbackBanner({
        type: 'success',
        text: `Berhasil menyimpan asesmen sumatif untuk ${classStudents.length} siswa.`
      });
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        text: `Gagal menyimpan: ${err.message || 'Kesalahan sistem'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Yellow Title Banner matching reference image */}
      <div className="bg-amber-300 border-b-2 border-amber-400 py-3 px-6 rounded-xl text-center shadow-xs">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-wide uppercase">
          ASESMEN SUMATIF
        </h1>
      </div>

      {/* Subject & Instructions matching reference image */}
      <div className="bg-sky-100/80 rounded-xl border border-sky-200 p-4 sm:p-5 text-slate-900 shadow-xs space-y-3">
        <div className="text-center font-extrabold text-sm sm:text-base text-sky-950 uppercase">
          MATA PELAJARAN : {selectedSubject?.name || 'Pendidikan Agama dan Budi Pekerti'}
        </div>

        <div className="text-xs sm:text-sm font-semibold space-y-1 text-slate-800">
          <div className="font-bold underline mb-1">Petunjuk Pengisian :</div>
          <div>1. Asesmen Sumatif dilaksanakan tiap akhir lingkup materi dan/atau akhir semester.</div>
          <div>2. Asesmen Sumatif Akhir Semester tidak wajib untuk dilakukan, kewenangan diserahkan pada sekolah.</div>
          <div>3. Isilah dengan nilai kuantitatif sejumlah asesmen sumatif yang sudah dilakukan (tidak harus diisi semua)</div>
          <div>4. Bentuk asesmen sumatif tidak hanya tes tulis saja bisa beragam (proyek, unjuk kerja, observasi, dll.)</div>
        </div>
      </div>

      {/* Context Filter Bar & Save */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs w-full lg:w-3/4">
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

        <div className="flex items-center gap-2 shrink-0">
          {writeAuth.allowed && (
            <button
              type="button"
              onClick={() => setIsChapterModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>Tambah Lingkup Materi</span>
            </button>
          )}
          {writeAuth.allowed ? (
            <button
              type="button"
              disabled={isSaving || classStudents.length === 0}
              onClick={handleSaveAll}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Asesmen Sumatif'}</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
              <Lock className="w-3.5 h-3.5" />
              <span>Mode Baca Saja</span>
            </span>
          )}
        </div>
      </div>

      {!writeAuth.allowed && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Informasi Hak Akses:</span>
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

      {/* Main Excel-like Table matching reference image */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-300 bg-slate-100 flex items-center justify-between">
          <div className="text-xs font-extrabold text-slate-800">
            Tabel Asesmen Sumatif — Kelas {selectedClassroom?.name || '-'} ({selectedYear} / {selectedSemester})
          </div>
          <div className="text-xs text-slate-600">
            Jumlah Lingkup Materi: <strong>{contextChapters.length}</strong>
          </div>
        </div>

        {classStudents.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Layers className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Tidak ada peserta didik aktif di kelas ini</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-[#2e7d32] text-white font-bold text-[11px] border border-slate-300">
                  <th className="py-3 px-2 w-12 text-center border border-slate-300 align-middle" rowSpan={2}>No</th>
                  <th className="py-3 px-3 w-48 border border-slate-300 align-middle" rowSpan={2}>Nama Siswa</th>
                  <th className="py-2 px-2 text-center border border-slate-300" colSpan={Math.max(1, contextChapters.length)}>
                    Sumatif Akhir Lingkup Materi (Wajib)
                  </th>
                  <th className="py-3 px-2 w-24 border border-slate-300 align-middle text-center bg-[#1b5e20]" rowSpan={2}>
                    NA Sumatif Lingkup Materi
                  </th>
                  <th className="py-2 px-2 text-center border border-slate-300" colSpan={3}>
                    Sumatif Akhir Semester (Tidak Wajib)
                  </th>
                  <th className="py-3 px-3 w-24 border border-slate-300 align-middle text-center bg-[#1b5e20]" rowSpan={2}>
                    Nilai Rapor
                  </th>
                </tr>
                <tr className="bg-[#388e3c] text-white font-bold text-[10px] border border-slate-300 text-center">
                  {contextChapters.length === 0 ? (
                    <th className="py-2 px-2 border border-slate-300">Belum ada lingkup materi</th>
                  ) : (
                    contextChapters.map((ch, idx) => (
                      <th key={ch.id} className="py-2 px-1 border border-slate-300 min-w-[120px]">
                        <div>Sumatif {idx + 1}</div>
                        <div className="text-[9px] font-normal truncate max-w-[140px] mx-auto" title={ch.title}>
                          {ch.title}
                        </div>
                      </th>
                    ))
                  )}
                  <th className="py-2 px-2 border border-slate-300 w-20">Non Tes</th>
                  <th className="py-2 px-2 border border-slate-300 w-20">Tes</th>
                  <th className="py-2 px-2 border border-slate-300 w-24">NA Sumatif Akhir Semester</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {classStudents.map((std, idx) => {
                  const studentScopes = localScopeScores[std.id] || {};
                  const scopeValues = contextChapters
                    .map((ch) => String(studentScopes[ch.id] ?? '').trim())
                    .filter((raw) => raw !== '')
                    .map((raw) => Number(raw.replace(',', '.')))
                    .filter((v) => Number.isFinite(v))
                    .map((v) => clampScore0To100(v));

                  const naLingkup =
                    scopeValues.length > 0
                      ? Math.round((scopeValues.reduce((a, b) => a + b, 0) / scopeValues.length) * 1000) / 1000
                      : undefined;

                  const rawNonTes = localSasNonTes[std.id] || '';
                  const rawTes = localSasTes[std.id] || '';
                  const trimNonTes = rawNonTes.trim();
                  const trimTes = rawTes.trim();
                  const parsedNonTes = trimNonTes !== '' ? Number(trimNonTes.replace(',', '.')) : NaN;
                  const parsedTes = trimTes !== '' ? Number(trimTes.replace(',', '.')) : NaN;
                  const nonTesNum = Number.isFinite(parsedNonTes) ? clampScore0To100(parsedNonTes) : undefined;
                  const tesNum = Number.isFinite(parsedTes) ? clampScore0To100(parsedTes) : undefined;

                  let naSas: number | undefined = undefined;
                  if (nonTesNum !== undefined && tesNum !== undefined) {
                    naSas = Math.round(((nonTesNum + tesNum) / 2) * 1000) / 1000;
                  } else if (nonTesNum !== undefined) {
                    naSas = nonTesNum;
                  } else if (tesNum !== undefined) {
                    naSas = tesNum;
                  }

                  const parsedScopeScores: Record<string, number> = {};
                  contextChapters.forEach((ch) => {
                    const trimmed = String(studentScopes[ch.id] ?? '').trim();
                    if (trimmed !== '') {
                      const num = Number(trimmed.replace(',', '.'));
                      if (Number.isFinite(num)) parsedScopeScores[ch.id] = clampScore0To100(num);
                    }
                  });

                  const calc = computeStudentReportScore({
                    chapters: contextChapters,
                    chapterScores: parsedScopeScores,
                    sasScore: naSas,
                    passingCriteria: selectedSubject?.kkm || 75
                  });

                  return (
                    <tr key={std.id} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-2 text-center font-semibold text-slate-700 border border-slate-300 bg-slate-50">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900 border border-slate-300">
                        <div>{std.name}</div>
                        <div className="text-[10px] text-slate-500 font-normal">NIS: {std.nis || '-'}</div>
                      </td>
                      {contextChapters.length === 0 ? (
                        <td className="py-2 px-3 text-center text-slate-400 border border-slate-300">-</td>
                      ) : (
                        contextChapters.map((ch) => (
                          <td key={ch.id} className="py-1.5 px-2 text-center border border-slate-300 bg-amber-50/30">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={studentScopes[ch.id] ?? ''}
                              disabled={!writeAuth.allowed}
                              onChange={(e) => handleScopeChange(std.id, ch.id, e.target.value)}
                              className="w-16 text-center py-1 rounded border border-slate-300 font-bold text-slate-900 bg-white focus:ring-1 focus:ring-indigo-500 mx-auto block text-xs"
                              placeholder="-"
                            />
                          </td>
                        ))
                      )}
                      <td className="py-2 px-2 text-center font-extrabold text-emerald-900 bg-emerald-50/60 border border-slate-300">
                        {naLingkup !== undefined ? naLingkup.toLocaleString('id-ID', { maximumFractionDigits: 3 }) : '-'}
                      </td>
                      <td className="py-1.5 px-2 text-center border border-slate-300 bg-sky-50/30">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={rawNonTes}
                          disabled={!writeAuth.allowed}
                          onChange={(e) => handleSasChange(std.id, 'nontes', e.target.value)}
                          className="w-16 text-center py-1 rounded border border-slate-300 font-bold text-slate-900 bg-white mx-auto block text-xs"
                          placeholder="-"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-center border border-slate-300 bg-sky-50/30">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={rawTes}
                          disabled={!writeAuth.allowed}
                          onChange={(e) => handleSasChange(std.id, 'tes', e.target.value)}
                          className="w-16 text-center py-1 rounded border border-slate-300 font-bold text-slate-900 bg-white mx-auto block text-xs"
                          placeholder="-"
                        />
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-slate-700 bg-slate-50 border border-slate-300">
                        {naSas !== undefined ? naSas.toLocaleString('id-ID', { maximumFractionDigits: 3 }) : '-'}
                      </td>
                      <td className="py-2 px-2 text-center font-black text-emerald-950 bg-emerald-100/70 border border-slate-300">
                        {calc.finalScore !== undefined ? calc.finalScore : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isChapterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddChapter}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Tambah Lingkup Materi Sumatif Baru</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsChapterModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Judul Lingkup Materi <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  placeholder="Contoh: Alam semesta sebagai tanda kekuasaan"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Keterangan / Materi (Opsional)</label>
                <textarea
                  rows={2}
                  value={newChapterDesc}
                  onChange={(e) => setNewChapterDesc(e.target.value)}
                  placeholder="Deskripsi singkat lingkup materi..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsChapterModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
              >
                Simpan Lingkup Materi
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
