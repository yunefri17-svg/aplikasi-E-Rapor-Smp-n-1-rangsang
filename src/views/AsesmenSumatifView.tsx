import React, { useState, useMemo, useEffect } from 'react';
import {
  AssessmentPolicyConfig,
  AssessmentScore,
  AuthSessionContext,
  Classroom,
  LearningChapter,
  LearningObjective,
  Subject,
  SummativeAssessment,
  SummativeAssessmentPlan,
  SummativeTechnique,
  Teacher,
  TeachingAssignment,
  User
} from '../types/erapor';
import {
  Layers,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  Lock,
  Info,
  CheckCircle2,
  AlertTriangle,
  Link2,
  ClipboardList,
  BookOpen,
  ShieldAlert,
  Network,
  Check
} from 'lucide-react';
import { sortClassrooms } from '../utils/classroomSort';
import { sortSubjects } from '../utils/subjectSort';
import { getAvailableAcademicYears } from '../utils/academicYear';
import { getVisibleSubjectsForUser } from '../utils/teacherAssignmentHelper';
import { filterObjectivesForContext } from '../utils/tpAnalysisAndDescription';
import {
  buildLearningChapterId,
  buildSummativePlanId,
  filterChaptersForContext,
  filterSummativePlansForContext,
  getNextChapterOrderAndCode,
  suggestNextTpCode
} from '../utils/assessmentCalculation';
import {
  authorizeSubjectAssessmentWrite,
  checkLearningChapterInUse,
  checkSummativePlanInUse,
  getAuthorizedSubjectClassIds
} from '../utils/authorizationGuard';

interface AsesmenSumatifViewProps {
  classrooms: Classroom[];
  subjects: Subject[];
  learningObjectives: LearningObjective[];
  learningChapters: LearningChapter[];
  summativePlans: SummativeAssessmentPlan[];
  summativeAssessments?: SummativeAssessment[];
  scores?: AssessmentScore[];
  onSaveLearningChapter: (chapter: LearningChapter) => { success?: boolean; error?: string } | void;
  onDeleteLearningChapter: (chapterId: string) => Promise<{ success?: boolean; error?: string } | void> | void;
  onSaveSummativePlan: (plan: SummativeAssessmentPlan) => { success?: boolean; error?: string } | void;
  onDeleteSummativePlan: (planId: string) => Promise<{ success?: boolean; error?: string } | void> | void;
  onSaveObjective: (obj: LearningObjective) => { success?: boolean; error?: string } | void;
  currentUser: User;
  teachingAssignments: TeachingAssignment[];
  teachers?: Teacher[];
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  assessmentPolicy?: AssessmentPolicyConfig;
  authContext?: AuthSessionContext | null;
}

type SumatifTab = 'bab' | 'tp-bab' | 'plans' | 'matrix';

export const AsesmenSumatifView: React.FC<AsesmenSumatifViewProps> = ({
  classrooms,
  subjects,
  learningObjectives,
  learningChapters = [],
  summativePlans = [],
  summativeAssessments = [],
  scores = [],
  onSaveLearningChapter,
  onDeleteLearningChapter,
  onSaveSummativePlan,
  onDeleteSummativePlan,
  onSaveObjective,
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
  const [activeTab, setActiveTab] = useState<SumatifTab>('bab');

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
    if (!selectedSubjectId || !selectedClassId) return [];
    return filterChaptersForContext(learningChapters, {
      subjectId: selectedSubjectId,
      classId: selectedClassId,
      academicYear: selectedYear,
      semester: selectedSemester
    });
  }, [learningChapters, selectedSubjectId, selectedClassId, selectedYear, selectedSemester]);

  const contextPlans = useMemo(() => {
    if (!selectedSubjectId || !selectedClassId) return [];
    return filterSummativePlansForContext(summativePlans, {
      subjectId: selectedSubjectId,
      classId: selectedClassId,
      academicYear: selectedYear,
      semester: selectedSemester
    });
  }, [summativePlans, selectedSubjectId, selectedClassId, selectedYear, selectedSemester]);

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

  const objectiveMap = useMemo(() => {
    return new Map(learningObjectives.map((tp) => [tp.id, tp]));
  }, [learningObjectives]);

  const chapterMap = useMemo(() => {
    return new Map(learningChapters.map((ch) => [ch.id, ch]));
  }, [learningChapters]);

  const historicalSummativeCount = useMemo(() => {
    if (!selectedSubjectId || !selectedClassId) return 0;
    return summativeAssessments.filter(
      (sa) =>
        sa.subjectId === selectedSubjectId &&
        sa.classId === selectedClassId &&
        sa.semester === selectedSemester &&
        (!sa.academicYear || sa.academicYear === selectedYear)
    ).length;
  }, [summativeAssessments, selectedSubjectId, selectedClassId, selectedSemester, selectedYear]);

  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);

  // =========================
  // SECTION 1: BAB CRUD STATE
  // =========================
  const [isBabFormOpen, setIsBabFormOpen] = useState(false);
  const [editingBab, setEditingBab] = useState<LearningChapter | null>(null);
  const [babCode, setBabCode] = useState('');
  const [babTitle, setBabTitle] = useState('');
  const [babDesc, setBabDesc] = useState('');
  const [babOrder, setBabOrder] = useState<number>(1);
  const [confirmDeleteBab, setConfirmDeleteBab] = useState<LearningChapter | null>(null);

  const openCreateBab = () => {
    if (!writeAuth.allowed) {
      setFeedbackBanner({ type: 'warning', text: writeAuth.reason || 'Mode Baca Saja aktif.' });
      return;
    }
    const next = getNextChapterOrderAndCode(contextChapters);
    setEditingBab(null);
    setBabOrder(next.orderIndex);
    setBabCode(next.code);
    setBabTitle('');
    setBabDesc('');
    setIsBabFormOpen(true);
    setActiveTab('bab');
  };

  const openEditBab = (ch: LearningChapter) => {
    if (!writeAuth.allowed) {
      setFeedbackBanner({ type: 'warning', text: writeAuth.reason || 'Mode Baca Saja aktif.' });
      return;
    }
    setEditingBab(ch);
    setBabOrder(ch.orderIndex || 1);
    setBabCode(ch.code || '');
    setBabTitle(ch.title || '');
    setBabDesc(ch.description || '');
    setIsBabFormOpen(true);
  };

  const handleSubmitBab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!writeAuth.allowed || !selectedSubjectId || !selectedClassId) return;
    const cleanCode = babCode.trim();
    const cleanTitle = babTitle.trim();
    if (!cleanCode || !cleanTitle) {
      setFeedbackBanner({ type: 'error', text: 'Kode BAB dan Nama/Judul BAB wajib diisi.' });
      return;
    }

    const chapter: LearningChapter = {
      id:
        editingBab?.id ||
        buildLearningChapterId(selectedSubjectId, selectedClassId, selectedYear, selectedSemester, babOrder),
      subjectId: selectedSubjectId,
      classId: selectedClassId,
      gradeLevel: selectedClassroom?.gradeLevel || editingBab?.gradeLevel || '7',
      teacherId: writeAuth.resolvedTeacherId || currentUser.teacherId || editingBab?.teacherId || currentUser.id || 'guru',
      academicYear: selectedYear,
      semester: selectedSemester,
      code: cleanCode,
      title: cleanTitle,
      description: babDesc.trim() || undefined,
      orderIndex: Number(babOrder) || 1,
      linkedTpIds: editingBab?.linkedTpIds || [],
      createdAt: editingBab?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const res = onSaveLearningChapter(chapter);
    if (res && res.success === false) {
      setFeedbackBanner({ type: 'error', text: res.error || 'Gagal menyimpan BAB.' });
      return;
    }

    setIsBabFormOpen(false);
    setEditingBab(null);
    setFeedbackBanner({
      type: 'success',
      text: `${chapter.code} (${chapter.title}) berhasil disimpan.`
    });
  };

  const handleRequestDeleteBab = (ch: LearningChapter) => {
    if (!writeAuth.allowed) {
      setFeedbackBanner({ type: 'warning', text: writeAuth.reason || 'Mode Baca Saja aktif.' });
      return;
    }
    const usage = checkLearningChapterInUse({
      chapterId: ch.id,
      summativePlans,
      summativeAssessments,
      scores
    });
    if (usage.inUse) {
      setFeedbackBanner({
        type: 'error',
        text: usage.reason || `BAB "${ch.code}" masih digunakan.`
      });
      return;
    }
    setConfirmDeleteBab(ch);
  };

  const handleConfirmDeleteBab = async () => {
    if (!confirmDeleteBab) return;
    const target = confirmDeleteBab;
    setConfirmDeleteBab(null);
    const res = await onDeleteLearningChapter(target.id);
    if (res && res.success === false) {
      setFeedbackBanner({ type: 'error', text: res.error || `Gagal menghapus ${target.code}.` });
    } else {
      setFeedbackBanner({ type: 'success', text: `${target.code} berhasil dihapus.` });
    }
  };

  // =====================================
  // SECTION 2: LINK EXISTING TP <-> BAB
  // =====================================
  const [selectedBabIdForTp, setSelectedBabIdForTp] = useState<string>(contextChapters[0]?.id || '');
  const [isQuickTpOpen, setIsQuickTpOpen] = useState(false);
  const [quickTpCode, setQuickTpCode] = useState('');
  const [quickTpMateri, setQuickTpMateri] = useState('');
  const [quickTpDesc, setQuickTpDesc] = useState('');

  useEffect(() => {
    if (contextChapters.length > 0 && !contextChapters.some((c) => c.id === selectedBabIdForTp)) {
      setSelectedBabIdForTp(contextChapters[0].id);
    } else if (contextChapters.length === 0) {
      setSelectedBabIdForTp('');
    }
  }, [contextChapters, selectedBabIdForTp]);

  const activeBabForTp = useMemo(
    () => contextChapters.find((c) => c.id === selectedBabIdForTp),
    [contextChapters, selectedBabIdForTp]
  );

  const handleToggleTpOnBab = (chapter: LearningChapter, tpId: string) => {
    if (!writeAuth.allowed) {
      setFeedbackBanner({ type: 'warning', text: writeAuth.reason || 'Mode Baca Saja aktif.' });
      return;
    }
    const currentLinked = chapter.linkedTpIds || [];
    const isLinked = currentLinked.includes(tpId);

    if (isLinked) {
      // Warn/block unlink if an existing Summative Plan on this BAB relies on this TP exclusively
      const dependentPlans = contextPlans.filter(
        (pl) => pl.chapterId === chapter.id && (pl.tpIds || []).includes(tpId)
      );
      if (dependentPlans.length > 0) {
        setFeedbackBanner({
          type: 'warning',
          text: `TP masih dipakai pada rencana sumatif (${dependentPlans
            .map((p) => p.title)
            .join(', ')}). Perbarui daftar TP pada rencana sumatif tersebut terlebih dahulu bila ingin melepas tautan.`
        });
        return;
      }
    }

    const updatedLinked = isLinked
      ? currentLinked.filter((id) => id !== tpId)
      : [...currentLinked, tpId];

    onSaveLearningChapter({
      ...chapter,
      linkedTpIds: updatedLinked,
      updatedAt: new Date().toISOString()
    });
    setFeedbackBanner({
      type: 'success',
      text: isLinked
        ? `Tautan TP dilepaskan dari ${chapter.code}.`
        : `TP berhasil ditautkan ke ${chapter.code} (tanpa duplikasi data TP).`
    });
  };

  const handleOpenQuickTp = () => {
    if (!writeAuth.allowed || !selectedClassroom) return;
    setQuickTpCode(suggestNextTpCode(contextObjectives, selectedClassroom.gradeLevel));
    setQuickTpMateri(activeBabForTp?.title || '');
    setQuickTpDesc('');
    setIsQuickTpOpen(true);
  };

  const handleCreateQuickTpAndLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!writeAuth.allowed || !selectedClassroom || !selectedSubjectId || !activeBabForTp) return;

    const cleanCode = quickTpCode.trim();
    const cleanDesc = quickTpDesc.trim();
    if (!cleanCode || !cleanDesc) {
      setFeedbackBanner({ type: 'error', text: 'Kode TP dan Deskripsi TP wajib diisi.' });
      return;
    }

    const dup = contextObjectives.find(
      (tp) => tp.code.trim().toLowerCase() === cleanCode.toLowerCase()
    );
    if (dup) {
      setFeedbackBanner({
        type: 'error',
        text: `TP dengan kode "${cleanCode}" sudah tersedia di Daftar TP. Cukup centang TP tersebut untuk menautkannya ke ${activeBabForTp.code}.`
      });
      return;
    }

    const newTp: LearningObjective = {
      id: `tp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      subjectId: selectedSubjectId,
      gradeLevel: selectedClassroom.gradeLevel,
      semester: selectedSemester,
      academicYear: selectedYear,
      code: cleanCode,
      ...(quickTpMateri.trim() ? { materi: quickTpMateri.trim() } : {}),
      description: cleanDesc,
      curriculumId: 'cur-merdeka',
      teacherId: writeAuth.resolvedTeacherId || currentUser.teacherId,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.name
    };

    const tpRes = onSaveObjective(newTp);
    if (tpRes && tpRes.success === false) {
      setFeedbackBanner({ type: 'error', text: tpRes.error || 'Gagal menambah TP.' });
      return;
    }

    onSaveLearningChapter({
      ...activeBabForTp,
      linkedTpIds: Array.from(new Set([...(activeBabForTp.linkedTpIds || []), newTp.id])),
      updatedAt: new Date().toISOString()
    });

    setIsQuickTpOpen(false);
    setFeedbackBanner({
      type: 'success',
      text: `TP baru "${cleanCode}" tersimpan di referensi bersama & langsung tertaut ke ${activeBabForTp.code}.`
    });
  };

  // =====================================
  // SECTION 3: SUMMATIVE ASSESSMENT PLANS
  // =====================================
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SummativeAssessmentPlan | null>(null);
  const [planChapterId, setPlanChapterId] = useState('');
  const [planTitle, setPlanTitle] = useState('');
  const [planTechnique, setPlanTechnique] = useState<SummativeTechnique>('tes tertulis');
  const [planTpIds, setPlanTpIds] = useState<string[]>([]);
  const [planDesc, setPlanDesc] = useState('');
  const [confirmDeletePlan, setConfirmDeletePlan] = useState<SummativeAssessmentPlan | null>(null);

  const openCreatePlan = (preselectedChapter?: LearningChapter) => {
    if (!writeAuth.allowed) {
      setFeedbackBanner({ type: 'warning', text: writeAuth.reason || 'Mode Baca Saja aktif.' });
      return;
    }
    const targetChapter = preselectedChapter || contextChapters[0];
    setEditingPlan(null);
    setPlanChapterId(targetChapter?.id || '');
    setPlanTitle(targetChapter ? `Sumatif ${targetChapter.code}` : '');
    setPlanTechnique('tes tertulis');
    setPlanTpIds(targetChapter?.linkedTpIds ? [...targetChapter.linkedTpIds] : []);
    setPlanDesc('');
    setIsPlanFormOpen(true);
    setActiveTab('plans');
  };

  const openEditPlan = (pl: SummativeAssessmentPlan) => {
    if (!writeAuth.allowed) {
      setFeedbackBanner({ type: 'warning', text: writeAuth.reason || 'Mode Baca Saja aktif.' });
      return;
    }
    setEditingPlan(pl);
    setPlanChapterId(pl.chapterId);
    setPlanTitle(pl.title);
    setPlanTechnique(pl.technique || 'tes tertulis');
    setPlanTpIds([...(pl.tpIds || [])]);
    setPlanDesc(pl.description || '');
    setIsPlanFormOpen(true);
  };

  const handlePlanChapterChange = (newChapterId: string) => {
    setPlanChapterId(newChapterId);
    const ch = contextChapters.find((c) => c.id === newChapterId);
    if (!editingPlan && ch) {
      setPlanTitle(`Sumatif ${ch.code}`);
      if (ch.linkedTpIds && ch.linkedTpIds.length > 0) {
        setPlanTpIds([...ch.linkedTpIds]);
      }
    }
  };

  const togglePlanTp = (tpId: string) => {
    setPlanTpIds((prev) =>
      prev.includes(tpId) ? prev.filter((id) => id !== tpId) : [...prev, tpId]
    );
  };

  const handleSubmitPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!writeAuth.allowed || !selectedSubjectId || !selectedClassId) return;
    if (!planChapterId) {
      setFeedbackBanner({ type: 'error', text: 'Pilih BAB Materi induk terlebih dahulu.' });
      return;
    }
    if (!planTitle.trim()) {
      setFeedbackBanner({ type: 'error', text: 'Judul Asesmen Sumatif wajib diisi.' });
      return;
    }
    if (planTpIds.length === 0) {
      setFeedbackBanner({
        type: 'error',
        text: 'Pilih minimal 1 Tujuan Pembelajaran (TP) yang diukur dalam asesmen sumatif ini.'
      });
      return;
    }

    const selectedChapter = contextChapters.find((c) => c.id === planChapterId);
    const plan: SummativeAssessmentPlan = {
      id:
        editingPlan?.id ||
        buildSummativePlanId(
          selectedSubjectId,
          selectedClassId,
          selectedYear,
          selectedSemester,
          contextPlans.length + 1
        ),
      subjectId: selectedSubjectId,
      classId: selectedClassId,
      gradeLevel: selectedClassroom?.gradeLevel || editingPlan?.gradeLevel || '7',
      teacherId: writeAuth.resolvedTeacherId || currentUser.teacherId || editingPlan?.teacherId || currentUser.id || 'guru',
      academicYear: selectedYear,
      semester: selectedSemester,
      chapterId: planChapterId,
      chapterCode: selectedChapter?.code,
      chapterTitle: selectedChapter?.title,
      title: planTitle.trim(),
      technique: planTechnique,
      tpIds: Array.from(new Set(planTpIds)),
      description: planDesc.trim() || undefined,
      createdAt: editingPlan?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.name
    };

    const res = onSaveSummativePlan(plan);
    if (res && res.success === false) {
      setFeedbackBanner({ type: 'error', text: res.error || 'Gagal menyimpan rencana asesmen sumatif.' });
      return;
    }

    setIsPlanFormOpen(false);
    setEditingPlan(null);
    setFeedbackBanner({
      type: 'success',
      text: `Rencana "${plan.title}" (${plan.tpIds.length} TP pada ${selectedChapter?.code || 'BAB'}) berhasil disimpan.`
    });
  };

  const handleRequestDeletePlan = (pl: SummativeAssessmentPlan) => {
    if (!writeAuth.allowed) {
      setFeedbackBanner({ type: 'warning', text: writeAuth.reason || 'Mode Baca Saja aktif.' });
      return;
    }
    const usage = checkSummativePlanInUse({ planId: pl.id, summativeAssessments });
    if (usage.inUse) {
      setFeedbackBanner({
        type: 'error',
        text: usage.reason || `Asesmen "${pl.title}" sudah dipakai pada nilai siswa.`
      });
      return;
    }
    setConfirmDeletePlan(pl);
  };

  const handleConfirmDeletePlan = async () => {
    if (!confirmDeletePlan) return;
    const target = confirmDeletePlan;
    setConfirmDeletePlan(null);
    const res = await onDeleteSummativePlan(target.id);
    if (res && res.success === false) {
      setFeedbackBanner({ type: 'error', text: res.error || 'Gagal menghapus rencana asesmen sumatif.' });
    } else {
      setFeedbackBanner({ type: 'success', text: `Rencana "${target.title}" berhasil dihapus.` });
    }
  };

  const selectedPlanChapter = contextChapters.find((c) => c.id === planChapterId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Asesmen Sumatif — Perencanaan BAB, Tautan TP & Daftar Sumatif
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5 leading-relaxed">
              Kelola struktur <strong>BAB Materi</strong>, hubungkan <strong>TP</strong> ke setiap BAB tanpa duplikasi,
              dan susun daftar <strong>Asesmen Sumatif</strong> (misal: Sumatif BAB 1, Sumatif BAB 2). Pengisian angka
              nilai siswa dilakukan terpusat di menu <strong>Pengolahan Nilai / Input Nilai</strong>.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {writeAuth.allowed ? (
            <>
              <button
                type="button"
                onClick={openCreateBab}
                className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah BAB</span>
              </button>
              <button
                type="button"
                disabled={contextChapters.length === 0}
                onClick={() => openCreatePlan()}
                className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:cursor-not-allowed"
                title={
                  contextChapters.length === 0
                    ? 'Buat minimal 1 BAB Materi terlebih dahulu'
                    : 'Buat rencana Asesmen Sumatif baru'
                }
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Sumatif</span>
              </button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
              <Lock className="w-3.5 h-3.5" />
              <span>Mode Baca Saja</span>
            </span>
          )}
        </div>
      </div>

      {/* RBAC Notice */}
      {!writeAuth.allowed && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Informasi Hak Akses:</span>
            <span>{writeAuth.reason}</span>
          </div>
        </div>
      )}

      {/* Historical Summative Data Notice */}
      {historicalSummativeCount > 0 && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            Terdapat <strong>{historicalSummativeCount}</strong> data nilai sumatif siswa tersimpan pada periode ini.
            Seluruh data nilai lama dipertahankan aman; BAB atau rencana sumatif yang sudah memiliki nilai tidak akan
            terhapus secara tidak sengaja.
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
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block font-bold text-slate-600 mb-1">Tahun Ajaran</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
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
            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
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
            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
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
            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
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
      </div>

      {/* Summary Cards & Section Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('bab')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'bab'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>1. Daftar BAB ({contextChapters.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tp-bab')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'tp-bab'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Link2 className="w-4 h-4" />
          <span>2. Tautan TP per BAB ({contextObjectives.length} TP)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('plans')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'plans'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>3. Daftar Asesmen Sumatif ({contextPlans.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'matrix'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Network className="w-4 h-4" />
          <span>4. Informasi Keterhubungan Sumatif</span>
        </button>
      </div>

      {/* ================================================================= */}
      {/* TAB 1: DAFTAR BAB MATERI                                          */}
      {/* ================================================================= */}
      {activeTab === 'bab' && (
        <div className="space-y-4">
          {isBabFormOpen && (
            <form
              onSubmit={handleSubmitBab}
              className="bg-indigo-50/50 rounded-2xl border border-indigo-200 p-5 space-y-4 shadow-xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-indigo-200/80">
                <h3 className="text-sm font-extrabold text-indigo-950">
                  {editingBab ? `Edit ${editingBab.code}` : 'Tambah BAB Materi Baru'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsBabFormOpen(false);
                    setEditingBab(null);
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Urutan</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={babOrder}
                    onChange={(e) => setBabOrder(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kode BAB *</label>
                  <input
                    type="text"
                    required
                    value={babCode}
                    onChange={(e) => setBabCode(e.target.value)}
                    placeholder="Contoh: BAB 1"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Nama / Judul BAB *</label>
                  <input
                    type="text"
                    required
                    value={babTitle}
                    onChange={(e) => setBabTitle(e.target.value)}
                    placeholder="Contoh: Bilangan Bulat dan Pecahan"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-bold text-slate-700 mb-1">Ringkasan Materi (Opsional)</label>
                <textarea
                  rows={2}
                  value={babDesc}
                  onChange={(e) => setBabDesc(e.target.value)}
                  placeholder="Catatan cakupan lingkup materi pada BAB ini..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsBabFormOpen(false);
                    setEditingBab(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan BAB</span>
                </button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-800">
                Daftar BAB Materi — {selectedSubject?.name || '-'} • Kelas {selectedClassroom?.name || '-'}
              </span>
              <span className="text-slate-500">
                {selectedYear} • Semester {selectedSemester}
              </span>
            </div>

            {contextChapters.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">Belum ada BAB Materi terdaftar</p>
                <p className="text-xs text-slate-500">
                  Klik &ldquo;Tambah BAB&rdquo; untuk menambahkan lingkup materi (BAB 1, BAB 2, dst.).
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-bold">
                      <th className="py-3 px-4 w-16 text-center">Urut</th>
                      <th className="py-3 px-4 w-28">Kode</th>
                      <th className="py-3 px-4">Judul BAB Materi</th>
                      <th className="py-3 px-4 w-36 text-center">TP Tertaut</th>
                      <th className="py-3 px-4 w-40 text-center">Rencana Sumatif</th>
                      <th className="py-3 px-4 w-36 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {contextChapters.map((ch) => {
                      const linkedTps = (ch.linkedTpIds || [])
                        .map((id) => objectiveMap.get(id))
                        .filter((tp): tp is LearningObjective => Boolean(tp));
                      const chPlans = contextPlans.filter((pl) => pl.chapterId === ch.id);
                      const usage = checkLearningChapterInUse({
                        chapterId: ch.id,
                        summativePlans,
                        summativeAssessments,
                        scores
                      });
                      return (
                        <tr key={ch.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 text-center font-bold text-slate-500">{ch.orderIndex}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 font-extrabold">
                              {ch.code}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{ch.title}</div>
                            {ch.description && <div className="text-[11px] text-slate-500 mt-0.5">{ch.description}</div>}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBabIdForTp(ch.id);
                                setActiveTab('tp-bab');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 font-bold hover:bg-teal-100 cursor-pointer"
                            >
                              {linkedTps.length} TP
                            </button>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => openCreatePlan(ch)}
                              disabled={!writeAuth.allowed}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold hover:bg-emerald-100 disabled:opacity-60 cursor-pointer"
                            >
                              {chPlans.length} Sumatif
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                disabled={!writeAuth.allowed}
                                onClick={() => openEditBab(ch)}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-700 hover:bg-blue-50 disabled:opacity-40 cursor-pointer"
                                title="Edit BAB"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={!writeAuth.allowed}
                                onClick={() => handleRequestDeleteBab(ch)}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-40 cursor-pointer"
                                title={usage.inUse ? usage.reason : 'Hapus BAB'}
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
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: HUBUNGAN TP DENGAN BAB (TANPA DUPLIKASI TP)                */}
      {/* ================================================================= */}
      {activeTab === 'tp-bab' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Select BAB */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Pilih BAB Materi
            </div>
            {contextChapters.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 text-xs text-slate-500 text-center">
                Belum ada BAB Materi. Tambahkan BAB di Tab 1 terlebih dahulu.
              </div>
            ) : (
              <div className="space-y-2">
                {contextChapters.map((ch) => {
                  const isActive = ch.id === selectedBabIdForTp;
                  const count = (ch.linkedTpIds || []).filter((id) => objectiveMap.has(id)).length;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setSelectedBabIdForTp(ch.id)}
                      className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-xs">{ch.code}</span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isActive ? 'bg-white/20 text-white' : 'bg-white text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {count} TP
                        </span>
                      </div>
                      <div className={`text-xs mt-1 font-medium ${isActive ? 'text-indigo-50' : 'text-slate-600'}`}>
                        {ch.title}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Link / Quick-Create TPs */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            {!activeBabForTp ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Pilih BAB di sebelah kiri untuk menautkan Tujuan Pembelajaran (TP).
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Tautan TP untuk {activeBabForTp.code} — {activeBabForTp.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Centang TP dari daftar Asesmen Formatif untuk menautkannya ke BAB ini tanpa menduplikasi data TP.
                    </p>
                  </div>
                  {writeAuth.allowed && (
                    <button
                      type="button"
                      onClick={handleOpenQuickTp}
                      className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Buat & Tautkan TP Baru</span>
                    </button>
                  )}
                </div>

                {isQuickTpOpen && (
                  <form
                    onSubmit={handleCreateQuickTpAndLink}
                    className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-teal-950">
                        Tambah TP ke Daftar Bersama & Tautkan ke {activeBabForTp.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsQuickTpOpen(false)}
                        className="p-1 text-slate-500 hover:bg-white rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        required
                        value={quickTpCode}
                        onChange={(e) => setQuickTpCode(e.target.value)}
                        placeholder="Kode TP (misal: TP 7.4)"
                        className="px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold"
                      />
                      <input
                        type="text"
                        value={quickTpMateri}
                        onChange={(e) => setQuickTpMateri(e.target.value)}
                        placeholder="Materi/Topik (Opsional)"
                        className="px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <textarea
                      required
                      rows={2}
                      value={quickTpDesc}
                      onChange={(e) => setQuickTpDesc(e.target.value)}
                      placeholder="Deskripsi Tujuan Pembelajaran..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsQuickTpOpen(false)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-bold text-slate-700 cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-teal-600 text-white font-bold cursor-pointer"
                      >
                        Simpan & Tautkan
                      </button>
                    </div>
                  </form>
                )}

                {contextObjectives.length === 0 ? (
                  <div className="p-6 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-600">
                    Belum ada TP di menu Asesmen Formatif untuk mata pelajaran & kelas ini.
                    {writeAuth.allowed && ' Gunakan tombol "Buat & Tautkan TP Baru" di atas.'}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-105 overflow-y-auto pr-1">
                    {contextObjectives.map((tp) => {
                      const isLinkedHere = (activeBabForTp.linkedTpIds || []).includes(tp.id);
                      const otherChapters = contextChapters.filter(
                        (c) => c.id !== activeBabForTp.id && (c.linkedTpIds || []).includes(tp.id)
                      );
                      return (
                        <label
                          key={tp.id}
                          className={`flex items-start gap-3 p-3 rounded-xl border transition ${
                            isLinkedHere
                              ? 'bg-indigo-50/70 border-indigo-300'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          } ${writeAuth.allowed ? 'cursor-pointer' : 'cursor-default'}`}
                        >
                          <input
                            type="checkbox"
                            disabled={!writeAuth.allowed}
                            checked={isLinkedHere}
                            onChange={() => handleToggleTpOnBab(activeBabForTp, tp.id)}
                            className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="flex-1 text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-900 font-extrabold">
                                {tp.code}
                              </span>
                              {tp.materi && <span className="font-semibold text-indigo-700">{tp.materi}</span>}
                              {otherChapters.length > 0 && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                  Juga di {otherChapters.map((c) => c.code).join(', ')}
                                </span>
                              )}
                            </div>
                            <p className="text-slate-700 mt-1 leading-relaxed">{tp.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: DAFTAR ASESMEN SUMATIF (PLANS)                             */}
      {/* ================================================================= */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          {isPlanFormOpen && (
            <form
              onSubmit={handleSubmitPlan}
              className="bg-emerald-50/50 rounded-2xl border border-emerald-200 p-5 space-y-4 shadow-xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200/80">
                <h3 className="text-sm font-extrabold text-emerald-950">
                  {editingPlan ? `Edit Rencana: ${editingPlan.title}` : 'Tambah Rencana Asesmen Sumatif'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlanFormOpen(false);
                    setEditingPlan(null);
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">BAB Materi Induk *</label>
                  <select
                    required
                    value={planChapterId}
                    onChange={(e) => handlePlanChapterChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                  >
                    <option value="">-- Pilih BAB --</option>
                    {contextChapters.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {ch.code} — {ch.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Asesmen Sumatif *</label>
                  <input
                    type="text"
                    required
                    value={planTitle}
                    onChange={(e) => setPlanTitle(e.target.value)}
                    placeholder="Contoh: Sumatif BAB 1"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teknik Asesmen</label>
                  <select
                    value={planTechnique}
                    onChange={(e) => setPlanTechnique(e.target.value as SummativeTechnique)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold"
                  >
                    <option value="tes tertulis">Tes Tertulis</option>
                    <option value="praktik">Praktik</option>
                    <option value="proyek">Proyek</option>
                    <option value="produk">Produk</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              <div className="text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">
                    Pilih TP yang Diukur pada Asesmen Sumatif Ini * ({planTpIds.length} dipilih)
                  </label>
                  {selectedPlanChapter && (selectedPlanChapter.linkedTpIds || []).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPlanTpIds([...(selectedPlanChapter.linkedTpIds || [])])}
                      className="text-[11px] font-bold text-indigo-700 hover:underline cursor-pointer"
                    >
                      Pilih Semua TP dari {selectedPlanChapter.code}
                    </button>
                  )}
                </div>

                {contextObjectives.length === 0 ? (
                  <div className="p-3 rounded-xl bg-white border border-slate-200 text-slate-500">
                    Belum ada TP tersedia pada konteks mapel & kelas ini.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
                    {contextObjectives.map((tp) => {
                      const checked = planTpIds.includes(tp.id);
                      const isInChapter = (selectedPlanChapter?.linkedTpIds || []).includes(tp.id);
                      return (
                        <button
                          key={tp.id}
                          type="button"
                          onClick={() => togglePlanTp(tp.id)}
                          className={`text-left p-2.5 rounded-xl border text-xs flex items-start gap-2 transition cursor-pointer ${
                            checked
                              ? 'bg-emerald-100/70 border-emerald-400 text-emerald-950'
                              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center shrink-0 border ${
                              checked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {checked && <Check className="w-3 h-3" />}
                          </div>
                          <div>
                            <div className="font-extrabold flex items-center gap-1.5">
                              <span>{tp.code}</span>
                              {isInChapter && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800">
                                  TP {selectedPlanChapter?.code}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] opacity-90 line-clamp-2">{tp.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="text-xs">
                <label className="block font-bold text-slate-700 mb-1">Keterangan (Opsional)</label>
                <input
                  type="text"
                  value={planDesc}
                  onChange={(e) => setPlanDesc(e.target.value)}
                  placeholder="Contoh: Ulangan harian terpadu materi bilangan bulat & pecahan"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPlanFormOpen(false);
                    setEditingPlan(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Rencana Sumatif</span>
                </button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                Daftar Rencana Asesmen Sumatif — {selectedSubject?.name || '-'} • Kelas {selectedClassroom?.name || '-'}
              </span>
              <span className="text-slate-500">1 TP dapat digunakan pada 1 atau beberapa asesmen sumatif</span>
            </div>

            {contextPlans.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">Belum ada Rencana Asesmen Sumatif</p>
                <p className="text-xs text-slate-500">
                  Klik &ldquo;Tambah Sumatif&rdquo; untuk membuat instrumen sumatif (misal: Sumatif BAB 1) dan
                  memilih TP yang diukur.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-bold">
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4 w-48">Nama Sumatif</th>
                      <th className="py-3 px-4 w-44">BAB Induk</th>
                      <th className="py-3 px-4">Daftar TP yang Diukur</th>
                      <th className="py-3 px-4 w-28 text-center">Teknik</th>
                      <th className="py-3 px-4 w-28 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {contextPlans.map((pl, idx) => {
                      const ch = chapterMap.get(pl.chapterId);
                      const tps = (pl.tpIds || [])
                        .map((id) => objectiveMap.get(id))
                        .filter((tp): tp is LearningObjective => Boolean(tp));
                      const usage = checkSummativePlanInUse({ planId: pl.id, summativeAssessments });
                      return (
                        <tr key={pl.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 text-center font-semibold text-slate-500">{idx + 1}</td>
                          <td className="py-3 px-4">
                            <div className="font-extrabold text-slate-900">{pl.title}</div>
                            {pl.description && <div className="text-[11px] text-slate-500 mt-0.5">{pl.description}</div>}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold">
                              {ch?.code || pl.chapterCode || 'BAB'}
                            </span>
                            <div className="text-[11px] text-slate-600 mt-0.5">{ch?.title || pl.chapterTitle || '-'}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1.5">
                              {tps.map((tp) => (
                                <span
                                  key={tp.id}
                                  className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 font-bold text-[11px]"
                                  title={tp.description}
                                >
                                  {tp.code}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center capitalize font-semibold text-slate-700">
                            {pl.technique}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                disabled={!writeAuth.allowed}
                                onClick={() => openEditPlan(pl)}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-700 hover:bg-blue-50 disabled:opacity-40 cursor-pointer"
                                title="Edit Rencana Sumatif"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={!writeAuth.allowed}
                                onClick={() => handleRequestDeletePlan(pl)}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-40 cursor-pointer"
                                title={usage.inUse ? usage.reason : 'Hapus Rencana Sumatif'}
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
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 4: INFORMASI KETERHUBUNGAN SUMATIF - BAB - TP                 */}
      {/* ================================================================= */}
      {activeTab === 'matrix' && (
        <div className="space-y-5">
          {/* Matrix per Asesmen Sumatif */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Peta Keterhubungan: Asesmen Sumatif → BAB Materi → Tujuan Pembelajaran (TP)
              </h3>
            </div>
            {contextPlans.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Belum ada Asesmen Sumatif untuk dipetakan pada konteks ini.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {contextPlans.map((pl) => {
                  const ch = chapterMap.get(pl.chapterId);
                  const tps = (pl.tpIds || [])
                    .map((id) => objectiveMap.get(id))
                    .filter((tp): tp is LearningObjective => Boolean(tp));
                  return (
                    <div key={pl.id} className="p-4 flex flex-col md:flex-row md:items-start gap-3 text-xs">
                      <div className="md:w-56 shrink-0">
                        <div className="font-extrabold text-slate-900">{pl.title}</div>
                        <div className="text-[11px] text-indigo-700 font-bold mt-0.5">
                          {ch ? `${ch.code} — ${ch.title}` : pl.chapterCode || '-'}
                        </div>
                        <div className="text-[10px] text-slate-500 capitalize mt-0.5">Teknik: {pl.technique}</div>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {tps.map((tp) => (
                          <div
                            key={tp.id}
                            className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2"
                          >
                            <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-900 font-extrabold shrink-0">
                              {tp.code}
                            </span>
                            <span className="text-slate-700">{tp.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Inverse lookup: per TP used across BABs and Summatives */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Ringkasan Penggunaan TP pada BAB & Asesmen Sumatif
              </h3>
            </div>
            {contextObjectives.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">Belum ada TP pada konteks ini.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-bold">
                      <th className="py-2.5 px-4 w-28">Kode TP</th>
                      <th className="py-2.5 px-4">Deskripsi TP</th>
                      <th className="py-2.5 px-4 w-48">Tertaut di BAB</th>
                      <th className="py-2.5 px-4 w-56">Diukur pada Asesmen Sumatif</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {contextObjectives.map((tp) => {
                      const babs = contextChapters.filter((ch) => (ch.linkedTpIds || []).includes(tp.id));
                      const plans = contextPlans.filter((pl) => (pl.tpIds || []).includes(tp.id));
                      return (
                        <tr key={tp.id}>
                          <td className="py-2.5 px-4">
                            <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-extrabold">
                              {tp.code}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-700">{tp.description}</td>
                          <td className="py-2.5 px-4">
                            {babs.length === 0 ? (
                              <span className="text-slate-400 italic">Belum ditautkan</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {babs.map((b) => (
                                  <span
                                    key={b.id}
                                    className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 font-bold text-[11px]"
                                  >
                                    {b.code}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-4">
                            {plans.length === 0 ? (
                              <span className="text-slate-400 italic">Belum masuk sumatif</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {plans.map((p) => (
                                  <span
                                    key={p.id}
                                    className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[11px]"
                                  >
                                    {p.title}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete BAB Confirmation Modal */}
      {confirmDeleteBab && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">Hapus {confirmDeleteBab.code}?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Anda akan menghapus <strong>{confirmDeleteBab.code} — {confirmDeleteBab.title}</strong>. Data TP bersama
              tetap aman dan tidak ikut terhapus.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDeleteBab(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBab}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer"
              >
                Ya, Hapus BAB
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Plan Confirmation Modal */}
      {confirmDeletePlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">Hapus Rencana Sumatif?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Anda akan menghapus rencana <strong>{confirmDeletePlan.title}</strong>. Data BAB dan TP terkait tetap
              tersimpan aman.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDeletePlan(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePlan}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer"
              >
                Ya, Hapus Rencana
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
