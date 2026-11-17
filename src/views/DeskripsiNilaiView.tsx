import React, { useState, useEffect, useMemo } from 'react';
import {
  AssessmentDescriptionStatus,
  AssessmentPolicyConfig,
  AssessmentScore,
  Classroom,
  FormativeAssessment,
  KKTPConfig,
  LearningObjective,
  Student,
  Subject,
  SummativeAssessment,
  TPAttainmentSummary,
  Teacher,
  TeachingAssignment,
  User
} from '../types/erapor';
import {
  FileSignature,
  Sparkles,
  Save,
  Check,
  Info,
  CheckCircle2,
  BookOpen,
  Settings2,
  X,
  Eye,
  Edit3,
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Plus,
  Trash2,
  ListChecks,
  Wand2
} from 'lucide-react';
import { calculatePredicate } from '../services/storage';
import {
  SubjectDescriptionBank,
  SubjectTPDescriptionPattern,
  defaultDescriptionBank,
  mergeDescriptionBankWithDefaults
} from '../utils/descriptionBank';
import { SecurityAccessDenied } from '../components/SecurityAccessDenied';
import { sortClassrooms } from '../utils/classroomSort';
import { sortStudentsAlphabetically } from '../utils/studentSort';
import { sortSubjects } from '../utils/subjectSort';
import {
  DEFAULT_ASSESSMENT_POLICY,
  StudentTPAttainmentResult,
  analyzeStudentTPAttainment,
  composeDescriptionFromSelectedTPs,
  filterObjectivesForContext,
  getPeriodLockKey,
  getSuggestedChecklistFromAnalysis,
  isPeriodInputLocked,
  normalizeAssessmentPolicy
} from '../utils/tpAnalysisAndDescription';
import {
  isElectiveSubject,
  isStudentParticipatingInSubject
} from '../utils/electiveSubjectHelper';

interface DeskripsiNilaiViewProps {
  classrooms: Classroom[];
  subjects: Subject[];
  students: Student[];
  scores: AssessmentScore[];
  learningObjectives: LearningObjective[];
  formativeAssessments?: FormativeAssessment[];
  summativeAssessments?: SummativeAssessment[];
  kktpConfigs?: KKTPConfig[];
  descriptionBank?: SubjectDescriptionBank[];
  assessmentPolicy?: AssessmentPolicyConfig;
  teachers?: Teacher[];
  teachingAssignments?: TeachingAssignment[];
  onSaveScores: (updatedScores: AssessmentScore[]) => void;
  onSaveDescriptionBank: (bank: SubjectDescriptionBank[]) => void;
  onSaveAssessmentPolicy?: (policy: AssessmentPolicyConfig) => void;
  onBack?: () => void;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  currentUser: User;
}

const MANUAL_PROTECTED_STATUSES: AssessmentDescriptionStatus[] = [
  'Sudah diedit guru',
  'Sudah difinalisasi'
];

export const DeskripsiNilaiView: React.FC<DeskripsiNilaiViewProps> = ({
  classrooms,
  subjects,
  students,
  scores,
  learningObjectives,
  formativeAssessments = [],
  summativeAssessments = [],
  kktpConfigs = [],
  descriptionBank = defaultDescriptionBank,
  assessmentPolicy = DEFAULT_ASSESSMENT_POLICY,
  teachers = [],
  teachingAssignments = [],
  onSaveScores,
  onSaveDescriptionBank,
  onSaveAssessmentPolicy,
  onBack,
  academicYear,
  semester,
  currentUser
}) => {
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'kepsek';
  const isSuperAdmin = currentUser.role === 'admin';
  const isWaliKelas = currentUser.role === 'walikelas';
  const isPeriodLocked =
    currentUser.role !== 'admin' && isPeriodInputLocked(assessmentPolicy, academicYear, semester);
  const isReadOnly = isWaliKelas || isPeriodLocked;

  const currentTeacher = useMemo(() => {
    return teachers.find(
      (t) =>
        (currentUser.teacherId && t.id === currentUser.teacherId) ||
        (currentUser.nip && t.nip === currentUser.nip) ||
        (t.name.toLowerCase().includes('fauzi') && currentUser.name.toLowerCase().includes('fauzi')) ||
        (t.name.toLowerCase().includes('nikmatul') && currentUser.name.toLowerCase().includes('nikmatul')) ||
        t.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim()
    );
  }, [teachers, currentUser]);

  const visibleSubjects = useMemo(() => {
    const sorted = sortSubjects(subjects);
    if (isAdmin || isWaliKelas) return sorted;
    if (!currentTeacher) return sorted;

    const assignedSubIds = teachingAssignments
      .filter((ta) => ta.teacherId === currentTeacher.id && ta.status !== 'inactive')
      .map((ta) => ta.subjectId);

    const combinedIds = Array.from(new Set([...assignedSubIds, ...(currentTeacher.subjectsTaught || [])]));
    if (combinedIds.length > 0) {
      const filtered = sorted.filter((s) => combinedIds.includes(s.id));
      if (filtered.length > 0) return filtered;
    }
    return sorted;
  }, [isAdmin, isWaliKelas, currentTeacher, teachingAssignments, subjects]);

  const [selectedSubject, setSelectedSubject] = useState<string>(
    visibleSubjects[0]?.id || subjects[0]?.id || 'sub-mat'
  );

  useEffect(() => {
    if (visibleSubjects.length > 0 && !visibleSubjects.some((s) => s.id === selectedSubject)) {
      setSelectedSubject(visibleSubjects[0].id);
    }
  }, [visibleSubjects, selectedSubject]);

  const visibleClassrooms = useMemo(() => {
    const sortedAll = sortClassrooms(classrooms);
    if (isAdmin) return sortedAll;
    if (isWaliKelas && currentUser.classId) {
      return sortedAll.filter((c) => c.id === currentUser.classId);
    }
    if (!currentTeacher) return sortedAll;

    const assignedClassIds = teachingAssignments
      .filter(
        (ta) =>
          ta.teacherId === currentTeacher.id &&
          ta.subjectId === selectedSubject &&
          ta.status !== 'inactive'
      )
      .map((ta) => ta.classId);

    if (assignedClassIds.length > 0) {
      return sortedAll.filter((c) => assignedClassIds.includes(c.id));
    }

    if (currentTeacher.isHomeroom && currentTeacher.homeroomClassId) {
      return sortedAll.filter((c) => c.id === currentTeacher.homeroomClassId);
    }

    return sortedAll;
  }, [isAdmin, isWaliKelas, currentUser.classId, currentTeacher, teachingAssignments, selectedSubject, classrooms]);

  const [selectedClass, setSelectedClass] = useState<string>(
    visibleClassrooms[0]?.id || classrooms[0]?.id || 'cls-vii-1'
  );

  useEffect(() => {
    if (visibleClassrooms.length > 0 && !visibleClassrooms.some((c) => c.id === selectedClass)) {
      setSelectedClass(visibleClassrooms[0].id);
    }
  }, [visibleClassrooms, selectedClass]);

  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankTab, setBankTab] = useState<'tp' | 'ranges'>('tp');
  const [editableBank, setEditableBank] = useState<SubjectDescriptionBank[]>(() =>
    mergeDescriptionBankWithDefaults(descriptionBank)
  );
  const [bankSubId, setBankSubId] = useState<string>(selectedSubject || subjects[0]?.id || 'sub-bindo');

  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [editablePolicy, setEditablePolicy] = useState<AssessmentPolicyConfig>(() =>
    normalizeAssessmentPolicy(assessmentPolicy)
  );

  const [detailModalStudentId, setDetailModalStudentId] = useState<string | null>(null);
  const [editModalStudentId, setEditModalStudentId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    highestCompetenceDesc: string;
    lowestCompetenceDesc: string;
    finalDescription: string;
    selectedOptimalTpIds: string[];
    selectedImprovementTpIds: string[];
  }>({
    highestCompetenceDesc: '',
    lowestCompetenceDesc: '',
    finalDescription: '',
    selectedOptimalTpIds: [],
    selectedImprovementTpIds: []
  });

  const [checklistDirtyIds, setChecklistDirtyIds] = useState<Record<string, boolean>>({});
  const [showTpSummary, setShowTpSummary] = useState(false);

  const [confirmOverwriteModal, setConfirmOverwriteModal] = useState<{
    mode: 'save' | 'compose' | 'single';
    studentId?: string;
    protectedCount: number;
  } | null>(null);

  useEffect(() => {
    setEditableBank(mergeDescriptionBankWithDefaults(descriptionBank));
  }, [descriptionBank]);

  useEffect(() => {
    setEditablePolicy(normalizeAssessmentPolicy(assessmentPolicy));
  }, [assessmentPolicy]);

  const isUnauthorized =
    !isAdmin &&
    !isWaliKelas &&
    currentTeacher &&
    visibleClassrooms.length > 0 &&
    !visibleClassrooms.some((c) => c.id === selectedClass);
  const attemptedClass = isUnauthorized ? classrooms.find((c) => c.id === selectedClass) : null;
  const authorizedClass = visibleClassrooms[0] || classrooms.find((c) => c.id === currentUser.classId);

  if (isUnauthorized) {
    return (
      <SecurityAccessDenied
        currentUser={currentUser}
        authorizedClassroom={authorizedClass}
        targetClassroom={attemptedClass}
        customMessage="AKSES DITOLAK: Anda tidak memiliki penugasan mengajar mata pelajaran ini di kelas tersebut."
        onResetToAuthorizedClass={() => setSelectedClass(visibleClassrooms[0]?.id || '')}
      />
    );
  }

  const currentClass = classrooms.find((c) => c.id === selectedClass);
  const currentSubjectObj = subjects.find((s) => s.id === selectedSubject);
  const isElectiveActiveSubject = isElectiveSubject(currentSubjectObj);

  const matchingElectiveAssignments = useMemo(() => {
    if (!isElectiveActiveSubject) return [];
    return teachingAssignments.filter(
      (ta) =>
        ta.subjectId === selectedSubject &&
        ta.classId === selectedClass &&
        ta.status !== 'inactive' &&
        (!ta.academicYear || ta.academicYear === academicYear) &&
        (!ta.semester || ta.semester === 'Semua' || ta.semester === semester)
    );
  }, [isElectiveActiveSubject, teachingAssignments, selectedSubject, selectedClass, academicYear, semester]);

  const rawClassStudentsCount = useMemo(
    () => students.filter((s) => s.classId === selectedClass).length,
    [students, selectedClass]
  );

  const classStudents = useMemo(() => {
    const sorted = sortStudentsAlphabetically(students.filter((s) => s.classId === selectedClass));
    if (!isElectiveActiveSubject || !currentSubjectObj || matchingElectiveAssignments.length === 0) {
      return sorted;
    }
    return sorted.filter((std) =>
      isStudentParticipatingInSubject({
        subject: currentSubjectObj,
        studentId: std.id,
        classId: selectedClass,
        academicYear,
        semester,
        teachingAssignments,
        scores
      })
    );
  }, [
    students,
    selectedClass,
    isElectiveActiveSubject,
    currentSubjectObj,
    matchingElectiveAssignments.length,
    academicYear,
    semester,
    teachingAssignments,
    scores
  ]);

  const relevantTPs = useMemo(
    () =>
      filterObjectivesForContext(learningObjectives, {
        subjectId: selectedSubject,
        gradeLevel: currentClass?.gradeLevel,
        semester,
        academicYear
      }),
    [learningObjectives, selectedSubject, currentClass?.gradeLevel, semester, academicYear]
  );

  // Per-student formative/summative attainment analysis (supporting evidence & suggestions only)
  const analysisByStudent = useMemo(() => {
    const map: Record<string, StudentTPAttainmentResult> = {};
    classStudents.forEach((std) => {
      const existing = scores.find(
        (sc) =>
          sc.studentId === std.id &&
          sc.subjectId === selectedSubject &&
          (sc.classId === selectedClass || !sc.classId) &&
          sc.academicYear === academicYear &&
          sc.semester === semester
      );
      map[std.id] = analyzeStudentTPAttainment({
        studentId: std.id,
        subjectId: selectedSubject,
        classId: selectedClass,
        gradeLevel: currentClass?.gradeLevel,
        academicYear,
        semester,
        learningObjectives,
        formativeAssessments,
        summativeAssessments,
        existingScore: existing,
        kktpConfigs,
        policy: assessmentPolicy
      });
    });
    return map;
  }, [
    classStudents,
    scores,
    selectedSubject,
    selectedClass,
    currentClass?.gradeLevel,
    academicYear,
    semester,
    learningObjectives,
    formativeAssessments,
    summativeAssessments,
    kktpConfigs,
    assessmentPolicy
  ]);

  const [localScores, setLocalScores] = useState<Record<string, AssessmentScore>>({});

  useEffect(() => {
    const sanitizedYear = (academicYear || '').replace(/\//g, '_');
    const validTpSet = new Set(relevantTPs.map((t) => t.id));
    const map: Record<string, AssessmentScore> = {};

    classStudents.forEach((std) => {
      const existing = scores.find(
        (sc) =>
          sc.studentId === std.id &&
          sc.subjectId === selectedSubject &&
          (sc.classId === selectedClass || !sc.classId) &&
          ((sc.academicYear || '').replace(/\//g, '_') === sanitizedYear || sc.academicYear === academicYear) &&
          sc.semester === semester
      );
      const analysis = analysisByStudent[std.id];

      if (existing) {
        const hasDesc = Boolean(
          (existing.finalDescription || '').trim() ||
            (existing.highestCompetenceDesc || '').trim() ||
            (existing.lowestCompetenceDesc || '').trim()
        );
        const derivedStatus: AssessmentDescriptionStatus =
          existing.descriptionStatus || (hasDesc ? 'Sudah disimpan' : 'Belum dibuat');

        const optIds = Array.isArray(existing.selectedOptimalTpIds)
          ? existing.selectedOptimalTpIds.filter((id) => validTpSet.has(id))
          : [];
        const impIds = Array.isArray(existing.selectedImprovementTpIds)
          ? existing.selectedImprovementTpIds.filter((id) => validTpSet.has(id) && !optIds.includes(id))
          : [];

        map[std.id] = {
          ...existing,
          studentName: std.name,
          subjectName: currentSubjectObj?.name || existing.subjectName,
          className: currentClass?.name || existing.className,
          selectedOptimalTpIds: optIds,
          selectedImprovementTpIds: impIds,
          tpAnalysis: existing.tpAnalysis || analysis?.tpSummaries,
          completenessWarning: existing.completenessWarning,
          descriptionStatus: derivedStatus
        };
      } else {
        map[std.id] = {
          id: `sc-${std.id}-${selectedSubject}-${sanitizedYear}-${semester}`,
          studentId: std.id,
          studentName: std.name,
          subjectId: selectedSubject,
          subjectName: currentSubjectObj?.name || '',
          classId: selectedClass,
          className: currentClass?.name || '',
          teacherId: currentTeacher?.id || '',
          teacherName: currentTeacher?.name || currentUser.name,
          academicYear,
          semester,
          formatifScores: {},
          sumatifMateriScores: {},
          sumatifAkhirSemester: 0,
          finalScore: 0,
          predicate: 'D',
          selectedOptimalTpIds: [],
          selectedImprovementTpIds: [],
          highestCompetenceDesc: '',
          lowestCompetenceDesc: '',
          generatedDescription: '',
          finalDescription: '',
          descriptionStatus: 'Belum dibuat',
          tpAnalysis: analysis?.tpSummaries,
          achievedObjectives: [],
          objectivesForImprovement: [],
          status: 'BELUM',
          updatedAt: ''
        };
      }
    });

    setLocalScores(map);
    setChecklistDirtyIds({});
  }, [
    classStudents,
    scores,
    selectedSubject,
    selectedClass,
    academicYear,
    semester,
    relevantTPs,
    analysisByStudent,
    currentSubjectObj?.name,
    currentClass?.name,
    currentTeacher?.id,
    currentTeacher?.name,
    currentUser.name
  ]);

  // Editable Nilai Akhir Rapor 0-100 per student
  const handleFinalScoreChange = (studentId: string, rawValue: string) => {
    if (isReadOnly) return;
    const cur = localScores[studentId];
    if (!cur) return;

    if (rawValue.trim() === '') {
      setLocalScores({
        ...localScores,
        [studentId]: {
          ...cur,
          manualFinalScore: undefined,
          finalScore: 0,
          predicate: 'D'
        }
      });
      return;
    }

    const parsed = Number(rawValue);
    if (Number.isNaN(parsed)) return;
    const clamped = Math.min(100, Math.max(0, Math.round(parsed)));

    setLocalScores({
      ...localScores,
      [studentId]: {
        ...cur,
        manualFinalScore: clamped,
        finalScore: clamped,
        predicate: calculatePredicate(clamped, 75),
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        updatedBy: currentUser.name,
        updatedById: currentUser.id
      }
    });
  };

  // Per-student individual TP checklist toggle
  const handleToggleChecklist = (
    studentId: string,
    tpId: string,
    bucket: 'optimal' | 'improvement'
  ) => {
    if (isReadOnly) return;
    const cur = localScores[studentId];
    if (!cur) return;

    let nextOpt = [...(cur.selectedOptimalTpIds || [])];
    let nextImp = [...(cur.selectedImprovementTpIds || [])];

    if (bucket === 'optimal') {
      if (nextOpt.includes(tpId)) nextOpt = nextOpt.filter((id) => id !== tpId);
      else {
        nextOpt.push(tpId);
        nextImp = nextImp.filter((id) => id !== tpId);
      }
    } else {
      if (nextImp.includes(tpId)) nextImp = nextImp.filter((id) => id !== tpId);
      else {
        nextImp.push(tpId);
        nextOpt = nextOpt.filter((id) => id !== tpId);
      }
    }

    setLocalScores({
      ...localScores,
      [studentId]: {
        ...cur,
        selectedOptimalTpIds: nextOpt,
        selectedImprovementTpIds: nextImp
      }
    });
    setChecklistDirtyIds((prev) => ({ ...prev, [studentId]: true }));
  };

  // Optional teacher-triggered helper: prefill checklists from Formative/Summative analysis
  const handleFillSuggestedChecklistForStudent = (studentId: string) => {
    if (isReadOnly) return;
    const cur = localScores[studentId];
    const analysis = analysisByStudent[studentId];
    if (!cur || !analysis) return;

    const suggested = getSuggestedChecklistFromAnalysis(analysis);
    if (suggested.optimalTpIds.length === 0 && suggested.improvementTpIds.length === 0) {
      setSaveToast('Siswa ini belum memiliki data formatif/sumatif pada TP. Centang TP secara manual.');
      setTimeout(() => setSaveToast(null), 3500);
      return;
    }

    setLocalScores({
      ...localScores,
      [studentId]: {
        ...cur,
        selectedOptimalTpIds: suggested.optimalTpIds,
        selectedImprovementTpIds: suggested.improvementTpIds
      }
    });
    setChecklistDirtyIds((prev) => ({ ...prev, [studentId]: true }));
  };

  const handleFillSuggestedChecklistForEmptyStudents = () => {
    if (isReadOnly) return;
    const updated = { ...localScores };
    const nextDirty = { ...checklistDirtyIds };
    let count = 0;

    classStudents.forEach((std) => {
      const cur = updated[std.id];
      if (!cur) return;
      const hasChecked =
        (cur.selectedOptimalTpIds?.length || 0) > 0 ||
        (cur.selectedImprovementTpIds?.length || 0) > 0;
      if (hasChecked) return;

      const suggested = getSuggestedChecklistFromAnalysis(analysisByStudent[std.id]);
      if (suggested.optimalTpIds.length === 0 && suggested.improvementTpIds.length === 0) return;

      updated[std.id] = {
        ...cur,
        selectedOptimalTpIds: suggested.optimalTpIds,
        selectedImprovementTpIds: suggested.improvementTpIds
      };
      nextDirty[std.id] = true;
      count++;
    });

    setLocalScores(updated);
    setChecklistDirtyIds(nextDirty);
    setSaveToast(
      count > 0
        ? `Saran checklist TP dari Formatif/Sumatif diisi untuk ${count} siswa. Silakan periksa tiap siswa lalu klik "Simpan Data Nilai".`
        : 'Tidak ada siswa kosong yang memiliki bukti Formatif/Sumatif.'
    );
    setTimeout(() => setSaveToast(null), 4000);
  };

  const applyChecklistCompositionToStudent = (
    std: Student,
    cur: AssessmentScore,
    overrideStatus?: AssessmentDescriptionStatus
  ): AssessmentScore => {
    const analysis = analysisByStudent[std.id];
    const optIds = Array.isArray(cur.selectedOptimalTpIds) ? cur.selectedOptimalTpIds : [];
    const impIds = Array.isArray(cur.selectedImprovementTpIds) ? cur.selectedImprovementTpIds : [];

    const selectedOptimalTPs = relevantTPs.filter((tp) => optIds.includes(tp.id));
    const selectedImprovementTPs = relevantTPs.filter((tp) => impIds.includes(tp.id));

    const composed = composeDescriptionFromSelectedTPs({
      student: std,
      subject: currentSubjectObj,
      subjectId: selectedSubject,
      classroom: currentClass,
      academicYear,
      semester,
      finalScore: cur.finalScore,
      selectedOptimalTPs,
      selectedImprovementTPs,
      descriptionBank: editableBank,
      policy: assessmentPolicy
    });

    const achievedSummaries = analysis
      ? analysis.tpSummaries.filter((t) => optIds.includes(t.tpId))
      : [];
    const improvementSummaries = analysis
      ? analysis.tpSummaries.filter((t) => impIds.includes(t.tpId))
      : [];

    if (!composed.canGenerate) {
      return {
        ...cur,
        learningObjectiveIds: relevantTPs.map((t) => t.id),
        formativeAssessmentIds: analysis?.matchedFormativeIds || [],
        summativeAssessmentIds: analysis?.matchedSummativeIds || [],
        achievedObjectives: [],
        objectivesForImprovement: [],
        tpAnalysis: analysis?.tpSummaries || [],
        completenessWarning: composed.completenessWarning
      };
    }

    return {
      ...cur,
      learningObjectiveIds: relevantTPs.map((t) => t.id),
      formativeAssessmentIds: analysis?.matchedFormativeIds || [],
      summativeAssessmentIds: analysis?.matchedSummativeIds || [],
      achievedObjectives: achievedSummaries,
      objectivesForImprovement: improvementSummaries,
      tpAnalysis: analysis?.tpSummaries || [],
      highestCompetenceDesc: composed.highestCompetenceDesc,
      lowestCompetenceDesc: composed.lowestCompetenceDesc,
      generatedDescription: composed.generatedDescription,
      finalDescription: composed.generatedDescription,
      descriptionStatus: overrideStatus || 'Draft otomatis',
      completenessWarning: undefined,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      updatedBy: currentUser.name,
      updatedById: currentUser.id
    };
  };

  const executeBulkComposeFromChecklists = (overwriteManualProtected: boolean) => {
    if (isReadOnly) return;
    const updated = { ...localScores };
    let generatedCount = 0;

    classStudents.forEach((std) => {
      const cur = updated[std.id];
      if (!cur) return;
      const hasChecked =
        (cur.selectedOptimalTpIds?.length || 0) > 0 ||
        (cur.selectedImprovementTpIds?.length || 0) > 0;
      if (!hasChecked) return;

      const isProtected = Boolean(
        cur.descriptionStatus && MANUAL_PROTECTED_STATUSES.includes(cur.descriptionStatus)
      );
      if (isProtected && !overwriteManualProtected) return;

      const next = applyChecklistCompositionToStudent(std, cur);
      updated[std.id] = next;
      if (next.descriptionStatus === 'Draft otomatis') generatedCount++;
    });

    setLocalScores(updated);
    setConfirmOverwriteModal(null);
    setSaveToast(
      generatedCount > 0
        ? `${generatedCount} deskripsi disusun dari checklist TP siswa (Draft otomatis). Klik "Simpan Data Nilai" untuk menyimpan ke Firebase.`
        : 'Belum ada siswa dengan checklist TP yang dipilih. Centang TP Optimal / Perlu Pendampingan per siswa terlebih dahulu.'
    );
    setTimeout(() => setSaveToast(null), 4000);
  };

  const handleBulkComposeClick = () => {
    if (isReadOnly) return;
    const protectedCount = classStudents.filter((std) => {
      const cur = localScores[std.id];
      const hasChecked =
        (cur?.selectedOptimalTpIds?.length || 0) > 0 ||
        (cur?.selectedImprovementTpIds?.length || 0) > 0;
      return Boolean(
        hasChecked && cur?.descriptionStatus && MANUAL_PROTECTED_STATUSES.includes(cur.descriptionStatus)
      );
    }).length;

    if (protectedCount > 0) {
      setConfirmOverwriteModal({ mode: 'compose', protectedCount });
      return;
    }
    executeBulkComposeFromChecklists(false);
  };

  const handleComposeSingleClick = (studentId: string) => {
    if (isReadOnly) return;
    const cur = localScores[studentId];
    const hasChecked =
      (cur?.selectedOptimalTpIds?.length || 0) > 0 ||
      (cur?.selectedImprovementTpIds?.length || 0) > 0;
    if (!hasChecked) {
      setSaveToast('Centang minimal 1 TP Optimal atau TP Perlu Pendampingan untuk siswa ini.');
      setTimeout(() => setSaveToast(null), 3500);
      return;
    }

    const st = cur?.descriptionStatus;
    if (st && MANUAL_PROTECTED_STATUSES.includes(st)) {
      setConfirmOverwriteModal({ mode: 'single', studentId, protectedCount: 1 });
      return;
    }
    const std = classStudents.find((s) => s.id === studentId);
    if (!std || !cur) return;
    setLocalScores({
      ...localScores,
      [studentId]: applyChecklistCompositionToStudent(std, cur)
    });
  };

  const handleConfirmSingleOverwrite = () => {
    if (!confirmOverwriteModal?.studentId) return;
    const std = classStudents.find((s) => s.id === confirmOverwriteModal.studentId);
    const cur = localScores[confirmOverwriteModal.studentId];
    if (std && cur) {
      setLocalScores({
        ...localScores,
        [std.id]: applyChecklistCompositionToStudent(std, cur)
      });
    }
    setConfirmOverwriteModal(null);
  };

  const executeSaveAll = (recomposeManualProtected: boolean) => {
    if (isReadOnly) return;
    const nowTime = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const toSave: AssessmentScore[] = [];
    const nextLocal = { ...localScores };

    classStudents.forEach((std) => {
      const cur = nextLocal[std.id];
      if (!cur) return;

      const hasChecked =
        (cur.selectedOptimalTpIds?.length || 0) > 0 ||
        (cur.selectedImprovementTpIds?.length || 0) > 0;
      const hasScoreOrRecord =
        cur.manualFinalScore !== undefined ||
        scores.some((s) => s.id === cur.id) ||
        Object.keys(cur.sumatifMateriScores || {}).length > 0 ||
        cur.sumatifAkhirSemester > 0 ||
        Boolean((cur.finalDescription || cur.highestCompetenceDesc || '').trim());

      if (!hasScoreOrRecord && !hasChecked) return;

      const isManualProtected = Boolean(
        cur.descriptionStatus && MANUAL_PROTECTED_STATUSES.includes(cur.descriptionStatus)
      );
      const shouldRecomposeFromChecklist =
        hasChecked && (!isManualProtected || (recomposeManualProtected && Boolean(checklistDirtyIds[std.id])));

      let prepared = cur;
      if (shouldRecomposeFromChecklist) {
        prepared = applyChecklistCompositionToStudent(std, cur, 'Sudah disimpan');
      }

      const combinedDesc =
        prepared.finalDescription ||
        [prepared.highestCompetenceDesc, prepared.lowestCompetenceDesc].filter(Boolean).join(' ');

      const nextStatus: AssessmentDescriptionStatus =
        prepared.descriptionStatus === 'Sudah difinalisasi'
          ? 'Sudah difinalisasi'
          : prepared.descriptionStatus === 'Sudah diedit guru' && !shouldRecomposeFromChecklist
          ? 'Sudah diedit guru'
          : combinedDesc
          ? 'Sudah disimpan'
          : 'Belum dibuat';

      const finalRec: AssessmentScore = {
        ...prepared,
        finalDescription: combinedDesc,
        descriptionStatus: nextStatus,
        status:
          prepared.status === 'BELUM' && (prepared.finalScore > 0 || prepared.manualFinalScore !== undefined)
            ? 'SELESAI'
            : prepared.status || 'SELESAI',
        updatedAt: nowTime,
        updatedBy: currentUser.name,
        updatedById: currentUser.id
      };

      nextLocal[std.id] = finalRec;
      toSave.push(finalRec);
    });

    setConfirmOverwriteModal(null);
    if (toSave.length === 0) {
      setSaveToast('Belum ada nilai atau checklist TP siswa yang diisi untuk disimpan.');
      setTimeout(() => setSaveToast(null), 3500);
      return;
    }

    setLocalScores(nextLocal);
    setChecklistDirtyIds({});
    onSaveScores(toSave);
    setSaveToast(
      `${toSave.length} data nilai & deskripsi capaian kompetensi berhasil disusun dari checklist TP dan disimpan ke Firebase!`
    );
    setTimeout(() => setSaveToast(null), 4000);
  };

  const handleSaveAllClick = () => {
    if (isReadOnly) return;
    const dirtyProtectedCount = classStudents.filter((std) => {
      const cur = localScores[std.id];
      return Boolean(
        cur &&
          checklistDirtyIds[std.id] &&
          cur.descriptionStatus &&
          MANUAL_PROTECTED_STATUSES.includes(cur.descriptionStatus)
      );
    }).length;

    if (dirtyProtectedCount > 0) {
      setConfirmOverwriteModal({ mode: 'save', protectedCount: dirtyProtectedCount });
      return;
    }
    executeSaveAll(false);
  };

  const handleOpenEditModal = (studentId: string) => {
    const cur = localScores[studentId];
    if (!cur) return;
    setEditForm({
      highestCompetenceDesc: cur.highestCompetenceDesc || '',
      lowestCompetenceDesc: cur.lowestCompetenceDesc || '',
      finalDescription:
        cur.finalDescription ||
        [cur.highestCompetenceDesc, cur.lowestCompetenceDesc].filter(Boolean).join(' '),
      selectedOptimalTpIds: [...(cur.selectedOptimalTpIds || [])],
      selectedImprovementTpIds: [...(cur.selectedImprovementTpIds || [])]
    });
    setEditModalStudentId(studentId);
  };

  const handleToggleEditModalTp = (tpId: string, bucket: 'optimal' | 'improvement') => {
    let nextOpt = [...editForm.selectedOptimalTpIds];
    let nextImp = [...editForm.selectedImprovementTpIds];
    if (bucket === 'optimal') {
      if (nextOpt.includes(tpId)) nextOpt = nextOpt.filter((id) => id !== tpId);
      else {
        nextOpt.push(tpId);
        nextImp = nextImp.filter((id) => id !== tpId);
      }
    } else {
      if (nextImp.includes(tpId)) nextImp = nextImp.filter((id) => id !== tpId);
      else {
        nextImp.push(tpId);
        nextOpt = nextOpt.filter((id) => id !== tpId);
      }
    }
    setEditForm({
      ...editForm,
      selectedOptimalTpIds: nextOpt,
      selectedImprovementTpIds: nextImp
    });
  };

  const handleRecomposeInEditModal = () => {
    if (!editModalStudentId) return;
    const std = classStudents.find((s) => s.id === editModalStudentId);
    const cur = localScores[editModalStudentId];
    if (!std || !cur) return;

    const selectedOptimalTPs = relevantTPs.filter((tp) =>
      editForm.selectedOptimalTpIds.includes(tp.id)
    );
    const selectedImprovementTPs = relevantTPs.filter((tp) =>
      editForm.selectedImprovementTpIds.includes(tp.id)
    );

    const composed = composeDescriptionFromSelectedTPs({
      student: std,
      subject: currentSubjectObj,
      subjectId: selectedSubject,
      classroom: currentClass,
      academicYear,
      semester,
      finalScore: cur.finalScore,
      selectedOptimalTPs,
      selectedImprovementTPs,
      descriptionBank: editableBank,
      policy: assessmentPolicy
    });

    if (!composed.canGenerate) {
      setSaveToast(
        composed.completenessWarning || 'Centang minimal 1 TP Optimal atau TP Perlu Pendampingan.'
      );
      setTimeout(() => setSaveToast(null), 3500);
      return;
    }

    setEditForm({
      ...editForm,
      highestCompetenceDesc: composed.highestCompetenceDesc,
      lowestCompetenceDesc: composed.lowestCompetenceDesc,
      finalDescription: composed.generatedDescription
    });
  };

  const handleSaveManualEdit = (finalize: boolean) => {
    if (!editModalStudentId || isReadOnly) return;
    const cur = localScores[editModalStudentId];
    if (!cur) return;

    const high = editForm.highestCompetenceDesc.trim();
    const low = editForm.lowestCompetenceDesc.trim();
    const combined = editForm.finalDescription.trim() || [high, low].filter(Boolean).join(' ');

    const nextStatus: AssessmentDescriptionStatus = finalize
      ? 'Sudah difinalisasi'
      : 'Sudah diedit guru';

    const updatedRecord: AssessmentScore = {
      ...cur,
      selectedOptimalTpIds: editForm.selectedOptimalTpIds,
      selectedImprovementTpIds: editForm.selectedImprovementTpIds,
      highestCompetenceDesc: high,
      lowestCompetenceDesc: low,
      finalDescription: combined,
      descriptionStatus: nextStatus,
      completenessWarning: undefined,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      updatedBy: currentUser.name,
      updatedById: currentUser.id
    };

    const nextMap = { ...localScores, [editModalStudentId]: updatedRecord };
    setLocalScores(nextMap);
    setChecklistDirtyIds((prev) => {
      const next = { ...prev };
      delete next[editModalStudentId];
      return next;
    });
    setEditModalStudentId(null);

    onSaveScores([updatedRecord]);
    setSaveToast(
      finalize
        ? 'Deskripsi berhasil difinalisasi dan disinkronkan ke Rapor!'
        : 'Perubahan deskripsi guru berhasil disimpan ke Firebase!'
    );
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleSaveBankChanges = () => {
    onSaveDescriptionBank(editableBank);
    setBankModalOpen(false);
    setSaveToast('Bank Deskripsi & Pola TP referensi berhasil diperbarui.');
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleSavePolicyChanges = () => {
    if (!onSaveAssessmentPolicy) return;
    onSaveAssessmentPolicy(editablePolicy);
    setPolicyModalOpen(false);
    setSaveToast('Kebijakan penilaian & status kunci periode berhasil diperbarui.');
    setTimeout(() => setSaveToast(null), 3000);
  };

  const currentBankItem =
    editableBank.find((b) => b.subjectId === bankSubId) || editableBank[0];

  const updateCurrentBankItem = (updater: (item: SubjectDescriptionBank) => SubjectDescriptionBank) => {
    setEditableBank((prev) =>
      prev.map((b) => (b.subjectId === bankSubId ? updater(b) : b))
    );
  };

  const addTpPattern = () => {
    updateCurrentBankItem((item) => ({
      ...item,
      tpPatterns: [
        ...(item.tpPatterns || []),
        {
          id: `pat-${Date.now()}`,
          tpCode: '',
          competenceScope: '',
          optimalPattern: '',
          improvementPattern: ''
        }
      ]
    }));
  };

  const updateTpPattern = (
    patId: string,
    patch: Partial<SubjectTPDescriptionPattern>
  ) => {
    updateCurrentBankItem((item) => ({
      ...item,
      tpPatterns: (item.tpPatterns || []).map((p) => (p.id === patId ? { ...p, ...patch } : p))
    }));
  };

  const removeTpPattern = (patId: string) => {
    updateCurrentBankItem((item) => ({
      ...item,
      tpPatterns: (item.tpPatterns || []).filter((p) => p.id !== patId)
    }));
  };

  const getStatusBadgeStyle = (st?: AssessmentDescriptionStatus) => {
    switch (st) {
      case 'Sudah difinalisasi':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Sudah disimpan':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Sudah diedit guru':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Draft otomatis':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-300';
    }
  };

  const detailStudent = detailModalStudentId
    ? classStudents.find((s) => s.id === detailModalStudentId)
    : undefined;
  const detailAnalysis = detailModalStudentId ? analysisByStudent[detailModalStudentId] : undefined;
  const detailScore = detailModalStudentId ? localScores[detailModalStudentId] : undefined;
  const editStudent = editModalStudentId
    ? classStudents.find((s) => s.id === editModalStudentId)
    : undefined;

  const periodKey = getPeriodLockKey(academicYear, semester);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-blue-600" />
            Input Nilai Akhir, Checklist TP &amp; Deskripsi Rapor (e-Rapor 2025.2)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Input Nilai Akhir Rapor (0–100), tentukan checklist TP Optimal &amp; Perlu Pendampingan per siswa, lalu tekan Simpan Data Nilai untuk menyusun deskripsi tertinggi &amp; terendah otomatis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali
            </button>
          )}

          {isSuperAdmin && onSaveAssessmentPolicy && (
            <button
              onClick={() => setPolicyModalOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              Kebijakan &amp; Kunci Input
            </button>
          )}

          <button
            onClick={() => {
              setBankSubId(selectedSubject);
              setBankModalOpen(true);
            }}
            disabled={isReadOnly}
            title="Referensi tambahan pola kalimat deskripsi per mata pelajaran"
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
          >
            <Settings2 className="w-4 h-4 text-blue-600" />
            Referensi Bank Deskripsi
          </button>

          <button
            onClick={handleFillSuggestedChecklistForEmptyStudents}
            disabled={isReadOnly || relevantTPs.length === 0}
            title="Opsional: bantu isi awal checklist TP dari bukti formatif/sumatif untuk diperiksa guru"
            className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Saran Checklist
          </button>

          <button
            onClick={handleBulkComposeClick}
            disabled={isReadOnly || relevantTPs.length === 0}
            className="px-4 py-2 rounded-xl border border-indigo-300 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Susun Draft dari Checklist
          </button>

          <button
            onClick={handleSaveAllClick}
            disabled={isReadOnly}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
          >
            <Save className="w-4 h-4" />
            Simpan Data Nilai
          </button>
        </div>
      </div>

      {saveToast && (
        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold animate-in fade-in w-full">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      {isWaliKelas && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2.5">
          <Info className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            <strong>Mode Pantau Wali Kelas (Read-Only):</strong> Anda dapat melihat kesiapan nilai, pemetaan TP, dan deskripsi kompetensi peserta didik di kelas Anda sebelum pencetakan rapor.
          </span>
        </div>
      )}

      {isPeriodLocked && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Periode Input Terkunci ({academicYear} {semester}):</strong> Perubahan nilai dan deskripsi dinonaktifkan sementara oleh Administrator.
          </span>
        </div>
      )}

      {isElectiveActiveSubject && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
            matchingElectiveAssignments.length > 0
              ? 'bg-cyan-50 border-cyan-200 text-cyan-950'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          {matchingElectiveAssignments.length > 0 ? (
            <span>
              <strong>Mata Pelajaran Pilihan ({currentSubjectObj?.name}):</strong> Menampilkan{' '}
              <strong>{classStudents.length}</strong> dari {rawClassStudentsCount} siswa di{' '}
              <strong>{currentClass?.name}</strong> yang terdaftar mengikuti mata pelajaran ini.
            </span>
          ) : (
            <span>
              <strong>Mata Pelajaran Pilihan ({currentSubjectObj?.name}):</strong> Kelas{' '}
              <strong>{currentClass?.name}</strong> belum ditugaskan pada menu{' '}
              <strong>Penugasan Guru Mengajar</strong> untuk periode {academicYear} ({semester}).
            </span>
          )}
        </div>
      )}

      {/* Selectors + Registered TP List Summary */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Rombel:</span>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 font-bold bg-white text-slate-800"
              >
                {visibleClassrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Mata Pelajaran:</span>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 font-bold bg-white text-slate-800"
              >
                {visibleSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-[11px] text-slate-600 font-medium flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTpSummary((v) => !v)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold flex items-center gap-1.5 transition"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              Daftar TP Mapel ({relevantTPs.length})
            </button>
            <span className="text-slate-500">
              Formatif/Sumatif tersedia sebagai pendukung pemeriksaan guru.
            </span>
          </div>
        </div>

        {relevantTPs.length === 0 ? (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Belum ada Tujuan Pembelajaran (TP) untuk <strong>{currentSubjectObj?.name}</strong> Kelas <strong>{currentClass?.gradeLevel}</strong> Semester <strong>{semester}</strong>. Input TP terlebih dahulu di menu <strong>Data Pembelajaran (CP/TP)</strong>.
            </span>
          </div>
        ) : (
          showTpSummary && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="font-bold text-slate-800">
                Seluruh Tujuan Pembelajaran ({currentSubjectObj?.name} — Kelas {currentClass?.gradeLevel} {semester}):
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {relevantTPs.map((tp) => (
                  <div key={tp.id} className="p-2 rounded-lg bg-white border border-slate-200 flex gap-2">
                    <span className="font-mono font-bold text-blue-700 shrink-0">{tp.code}</span>
                    <div>
                      {tp.materi && <span className="font-semibold text-slate-900">{tp.materi}: </span>}
                      <span className="text-slate-700">{tp.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>

      {/* Main Structured Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-2.5 py-3 text-center w-9 border-r border-slate-200">No</th>
                <th className="px-3 py-3 min-w-[165px] border-r border-slate-200">Nama Siswa</th>
                <th className="px-2.5 py-3 text-center w-24 border-r border-slate-200 bg-emerald-50/60 text-emerald-900">
                  Nilai Akhir
                  <span className="block text-[10px] font-normal text-emerald-700">0–100</span>
                </th>
                <th className="px-3 py-3 min-w-[215px] border-r border-slate-200 bg-emerald-50/30 text-emerald-900">
                  <div className="flex items-center gap-1">
                    <ListChecks className="w-3.5 h-3.5 text-emerald-700" />
                    <span>TP Dicapai Paling Optimal</span>
                  </div>
                </th>
                <th className="px-3 py-3 min-w-[215px] border-r border-slate-200 bg-amber-50/40 text-amber-900">
                  <div className="flex items-center gap-1">
                    <ListChecks className="w-3.5 h-3.5 text-amber-700" />
                    <span>TP Perlu Pendampingan</span>
                  </div>
                </th>
                <th className="px-3 py-3 min-w-[270px] border-r border-slate-200">
                  Deskripsi Capaian Kompetensi (Tertinggi &amp; Terendah)
                </th>
                <th className="px-3 py-3 text-right w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400 italic">
                    Tidak ada peserta didik terdaftar pada rombel ini.
                  </td>
                </tr>
              ) : (
                classStudents.map((std, idx) => {
                  const item = localScores[std.id];
                  const analysis = analysisByStudent[std.id];
                  if (!item || !analysis) return null;

                  const optIds = item.selectedOptimalTpIds || [];
                  const impIds = item.selectedImprovementTpIds || [];

                  const hasStoredScore =
                    item.manualFinalScore !== undefined ||
                    scores.some((s) => s.id === item.id) ||
                    Object.keys(item.sumatifMateriScores || {}).length > 0 ||
                    item.sumatifAkhirSemester > 0;

                  const previewHigh = (item.highestCompetenceDesc || '').trim();
                  const previewLow = (item.lowestCompetenceDesc || '').trim();
                  const previewFull = (item.finalDescription || '').trim();

                  return (
                    <tr key={std.id} className="hover:bg-slate-50/70 transition align-top">
                      <td className="px-2.5 py-3 text-center text-slate-500 font-medium border-r border-slate-100">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-3 border-r border-slate-100">
                        <div className="font-bold text-slate-800">{std.name}</div>
                        <div className="font-mono text-[10px] text-slate-500">
                          {std.nis || '-'} • {std.nisn || '-'}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold ${getStatusBadgeStyle(
                              item.descriptionStatus
                            )}`}
                          >
                            {item.descriptionStatus || 'Belum dibuat'}
                          </span>
                          {checklistDirtyIds[std.id] && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                              Checklist diubah
                            </span>
                          )}
                        </div>
                        {item.updatedAt && (
                          <div className="text-[10px] text-slate-400 mt-1">
                            {item.updatedBy || 'Guru'} • {item.updatedAt}
                          </div>
                        )}
                      </td>

                      {/* Editable Nilai Akhir Rapor 0-100 */}
                      <td className="px-2 py-3 text-center border-r border-slate-100 bg-emerald-50/20">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          disabled={isReadOnly}
                          placeholder="0-100"
                          value={hasStoredScore ? item.finalScore : ''}
                          onChange={(e) => handleFinalScoreChange(std.id, e.target.value)}
                          className={`w-16 px-1.5 py-1 text-center rounded-lg border font-black text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 ${
                            hasStoredScore && item.finalScore < 75
                              ? 'border-rose-300 text-rose-700 bg-rose-50/50'
                              : 'border-emerald-300 text-blue-800 bg-white'
                          }`}
                        />
                        {hasStoredScore && (
                          <div className="mt-1 text-[10px] font-bold text-slate-500">
                            Predikat {item.predicate}
                          </div>
                        )}
                      </td>

                      {/* Per-Student Checklist TP Optimal */}
                      <td className="px-2.5 py-2.5 border-r border-slate-100">
                        {relevantTPs.length === 0 ? (
                          <span className="text-[10px] text-slate-400 italic">Belum ada TP</span>
                        ) : (
                          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                            {relevantTPs.map((tp) => {
                              const checked = optIds.includes(tp.id);
                              return (
                                <label
                                  key={tp.id}
                                  title={`${tp.code}: ${tp.description}`}
                                  className={`flex items-start gap-1.5 px-1.5 py-1 rounded border text-[11px] cursor-pointer transition ${
                                    checked
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                  } ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                  <input
                                    type="checkbox"
                                    disabled={isReadOnly}
                                    checked={checked}
                                    onChange={() => handleToggleChecklist(std.id, tp.id, 'optimal')}
                                    className="mt-0.5 rounded text-emerald-600"
                                  />
                                  <span className="leading-tight">
                                    <strong className="font-mono text-emerald-800">{tp.code}</strong>{' '}
                                    <span className="line-clamp-1">{tp.materi || tp.description}</span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* Per-Student Checklist TP Perlu Pendampingan */}
                      <td className="px-2.5 py-2.5 border-r border-slate-100">
                        {relevantTPs.length === 0 ? (
                          <span className="text-[10px] text-slate-400 italic">Belum ada TP</span>
                        ) : (
                          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                            {relevantTPs.map((tp) => {
                              const checked = impIds.includes(tp.id);
                              return (
                                <label
                                  key={tp.id}
                                  title={`${tp.code}: ${tp.description}`}
                                  className={`flex items-start gap-1.5 px-1.5 py-1 rounded border text-[11px] cursor-pointer transition ${
                                    checked
                                      ? 'bg-amber-50 border-amber-300 text-amber-950 font-semibold'
                                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                  } ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                  <input
                                    type="checkbox"
                                    disabled={isReadOnly}
                                    checked={checked}
                                    onChange={() => handleToggleChecklist(std.id, tp.id, 'improvement')}
                                    className="mt-0.5 rounded text-amber-600"
                                  />
                                  <span className="leading-tight">
                                    <strong className="font-mono text-amber-800">{tp.code}</strong>{' '}
                                    <span className="line-clamp-1">{tp.materi || tp.description}</span>
                                  </span>
                                </label>
                              );
                            })}
                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() => handleFillSuggestedChecklistForStudent(std.id)}
                                className="mt-1 text-[10px] font-semibold text-indigo-700 hover:underline flex items-center gap-1"
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                Saran Formatif/Sumatif siswa ini
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-3 space-y-1.5 border-r border-slate-100">
                        {previewHigh || previewLow || previewFull ? (
                          <div className="space-y-1 text-[11px] leading-relaxed">
                            {previewHigh && (
                              <div className="line-clamp-2">
                                <span className="font-bold text-emerald-700">Tertinggi: </span>
                                <span className="text-slate-700">{previewHigh}</span>
                              </div>
                            )}
                            {previewLow && (
                              <div className="line-clamp-2">
                                <span className="font-bold text-amber-700">Terendah: </span>
                                <span className="text-slate-700">{previewLow}</span>
                              </div>
                            )}
                            {!previewHigh && !previewLow && previewFull && (
                              <p className="text-slate-700 line-clamp-3">{previewFull}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">
                            Centang TP Optimal / Perlu Pendampingan per siswa, lalu klik <strong>Simpan Data Nilai</strong>.
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <button
                            onClick={() => setDetailModalStudentId(std.id)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold flex items-center gap-1 transition"
                          >
                            <Eye className="w-3 h-3 text-blue-600" />
                            Lihat Deskripsi
                          </button>
                          {!isReadOnly && (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(std.id)}
                                className="px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold flex items-center gap-1 transition"
                              >
                                <Edit3 className="w-3 h-3" />
                                Edit Deskripsi
                              </button>
                              <button
                                onClick={() => handleComposeSingleClick(std.id)}
                                className="px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold flex items-center gap-1 transition"
                              >
                                <RefreshCw className="w-3 h-3" />
                                Susun Ulang
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL / EVIDENCE INSPECTION MODAL ("Lihat Deskripsi") */}
      {detailModalStudentId && detailStudent && detailAnalysis && detailScore && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div>
                <h2 className="font-bold text-sm sm:text-base">{detailStudent.name}</h2>
                <p className="text-[11px] text-slate-300">
                  {currentSubjectObj?.name} • {currentClass?.name} • Nilai Akhir: {detailScore.finalScore} (Predikat {detailScore.predicate})
                </p>
              </div>
              <button
                onClick={() => setDetailModalStudentId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                <div className="font-bold text-emerald-900">
                  1. Deskripsi Capaian Kompetensi Tertinggi
                </div>
                <p className="text-slate-800 leading-relaxed bg-white p-2.5 rounded-lg border border-emerald-100">
                  {detailScore.highestCompetenceDesc || 'Belum disusun.'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
                <div className="font-bold text-amber-900">
                  2. Deskripsi Capaian Kompetensi Terendah (Perlu Pendampingan)
                </div>
                <p className="text-slate-800 leading-relaxed bg-white p-2.5 rounded-lg border border-amber-100">
                  {detailScore.lowestCompetenceDesc || 'Belum disusun.'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900">
                    Pratinjau Gabungan pada Rapor ({detailScore.descriptionStatus || 'Belum dibuat'})
                  </span>
                  {detailScore.updatedAt && (
                    <span className="text-[10px] text-blue-700">
                      Diperbarui: {detailScore.updatedBy || 'Guru'} ({detailScore.updatedAt})
                    </span>
                  )}
                </div>
                <p className="text-slate-800 leading-relaxed bg-white p-3 rounded-lg border border-blue-100">
                  {detailScore.finalDescription ||
                    [detailScore.highestCompetenceDesc, detailScore.lowestCompetenceDesc]
                      .filter(Boolean)
                      .join(' ') ||
                    'Belum ada deskripsi tersusun.'}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2">
                  Referensi Bukti Nilai Formatif &amp; Sumatif per TP (Pendukung Pemeriksaan Guru)
                </h4>
                <div className="space-y-2">
                  {detailAnalysis.tpSummaries.length === 0 ? (
                    <div className="text-slate-400 italic p-4 border rounded-xl text-center">
                      Belum ada TP terdaftar untuk mapel dan kelas ini.
                    </div>
                  ) : (
                    detailAnalysis.tpSummaries.map((tp: TPAttainmentSummary) => (
                      <div key={tp.tpId} className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900">
                            {tp.code}
                            {tp.materi ? ` — ${tp.materi}` : ''}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {(detailScore.selectedOptimalTpIds || []).includes(tp.tpId) && (
                              <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold">
                                Dicentang Optimal
                              </span>
                            )}
                            {(detailScore.selectedImprovementTpIds || []).includes(tp.tpId) && (
                              <span className="px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] font-bold">
                                Dicentang Perlu Pendampingan
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-slate-600">{tp.description}</p>
                        <div className="text-[11px] text-slate-500 font-medium pt-1">
                          Bukti nilai: {tp.evidenceSummary}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              {!isReadOnly && (
                <button
                  onClick={() => {
                    const id = detailModalStudentId;
                    setDetailModalStudentId(null);
                    handleOpenEditModal(id);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Deskripsi
                </button>
              )}
              <button
                onClick={() => setDetailModalStudentId(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT DESCRIPTION MODAL ("Edit Deskripsi") */}
      {editModalStudentId && editStudent && !isReadOnly && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in zoom-in-95 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-base text-slate-900">Edit Deskripsi Rapor — {editStudent.name}</h3>
                <p className="text-[11px] text-slate-500">
                  Perubahan manual akan ditandai sebagai "Sudah diedit guru", dilindungi dari timpa otomatis, dan tersimpan di Firebase.
                </p>
              </div>
              <button
                onClick={() => setEditModalStudentId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {relevantTPs.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <div className="font-bold text-emerald-800 mb-1.5">Checklist TP Dicapai Optimal:</div>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {relevantTPs.map((tp) => (
                        <label key={tp.id} className="flex items-start gap-2 cursor-pointer text-[11px]">
                          <input
                            type="checkbox"
                            checked={editForm.selectedOptimalTpIds.includes(tp.id)}
                            onChange={() => handleToggleEditModalTp(tp.id, 'optimal')}
                            className="mt-0.5 rounded text-emerald-600"
                          />
                          <span>
                            <strong className="font-mono">{tp.code}</strong>: {tp.description}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-amber-800 mb-1.5">Checklist TP Perlu Pendampingan:</div>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {relevantTPs.map((tp) => (
                        <label key={tp.id} className="flex items-start gap-2 cursor-pointer text-[11px]">
                          <input
                            type="checkbox"
                            checked={editForm.selectedImprovementTpIds.includes(tp.id)}
                            onChange={() => handleToggleEditModalTp(tp.id, 'improvement')}
                            className="mt-0.5 rounded text-amber-600"
                          />
                          <span>
                            <strong className="font-mono">{tp.code}</strong>: {tp.description}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2 flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleRecomposeInEditModal}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Susun Ulang Kalimat dari Checklist TP
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-emerald-800 mb-1">
                  1. Deskripsi Capaian Kompetensi Tertinggi
                </label>
                <textarea
                  rows={3}
                  value={editForm.highestCompetenceDesc}
                  onChange={(e) => {
                    const nextHigh = e.target.value;
                    setEditForm({
                      ...editForm,
                      highestCompetenceDesc: nextHigh,
                      finalDescription: [nextHigh, editForm.lowestCompetenceDesc].filter(Boolean).join(' ')
                    });
                  }}
                  className="w-full p-2.5 rounded-xl border border-emerald-300 focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-bold text-amber-800 mb-1">
                  2. Deskripsi Capaian Kompetensi Terendah (Perlu Pendampingan)
                </label>
                <textarea
                  rows={3}
                  value={editForm.lowestCompetenceDesc}
                  onChange={(e) => {
                    const nextLow = e.target.value;
                    setEditForm({
                      ...editForm,
                      lowestCompetenceDesc: nextLow,
                      finalDescription: [editForm.highestCompetenceDesc, nextLow].filter(Boolean).join(' ')
                    });
                  }}
                  className="w-full p-2.5 rounded-xl border border-amber-300 focus:ring-2 focus:ring-amber-500 outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Pratinjau Narasi Final Rapor
                </label>
                <textarea
                  rows={3}
                  value={editForm.finalDescription}
                  onChange={(e) => setEditForm({ ...editForm, finalDescription: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
                />
              </div>
            </div>

            <div className="p-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 text-xs">
              <button
                onClick={() => setEditModalStudentId(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold"
              >
                Batal
              </button>
              <button
                onClick={() => handleSaveManualEdit(false)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Simpan Edit ke Firebase
              </button>
              <button
                onClick={() => handleSaveManualEdit(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Finalisasi Rapor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERWRITE CONFIRMATION MODAL */}
      {confirmOverwriteModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Konfirmasi Pembaruan Deskripsi yang Sudah Diedit Guru
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {confirmOverwriteModal.mode === 'single'
                    ? 'Deskripsi siswa ini sudah berstatus "Sudah diedit guru / Difinalisasi". Apakah Anda yakin ingin menyusunnya ulang dari checklist TP?'
                    : `Terdapat ${confirmOverwriteModal.protectedCount} siswa dengan deskripsi berstatus "Sudah diedit guru / Difinalisasi". Pilih cara melanjutkan:`}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                onClick={() => setConfirmOverwriteModal(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold"
              >
                Batal
              </button>
              {confirmOverwriteModal.mode === 'save' ? (
                <>
                  <button
                    onClick={() => executeSaveAll(false)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    Pertahankan Editan Guru
                  </button>
                  <button
                    onClick={() => executeSaveAll(true)}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
                  >
                    Susun Ulang dari Checklist
                  </button>
                </>
              ) : confirmOverwriteModal.mode === 'compose' ? (
                <>
                  <button
                    onClick={() => executeBulkComposeFromChecklists(false)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    Lewati yang Sudah Diedit
                  </button>
                  <button
                    onClick={() => executeBulkComposeFromChecklists(true)}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
                  >
                    Timpa Semua dari Checklist
                  </button>
                </>
              ) : (
                <button
                  onClick={handleConfirmSingleOverwrite}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  Ya, Susun Ulang
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ASSESSMENT POLICY & LOCK MODAL (Admin) */}
      {policyModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                Kebijakan Ketercapaian TP &amp; Kunci Periode
              </h3>
              <button onClick={() => setPolicyModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Optimal (&ge;)</label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={editablePolicy.optimalMinScore}
                    onChange={(e) =>
                      setEditablePolicy({
                        ...editablePolicy,
                        optimalMinScore: Number(e.target.value) || 88
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Baik (&ge;)</label>
                  <input
                    type="number"
                    min={40}
                    max={100}
                    value={editablePolicy.goodMinScore}
                    onChange={(e) =>
                      setEditablePolicy({
                        ...editablePolicy,
                        goodMinScore: Number(e.target.value) || 75
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Penguatan (&lt;)</label>
                  <input
                    type="number"
                    min={40}
                    max={100}
                    value={editablePolicy.needStrengtheningBelow}
                    onChange={(e) =>
                      setEditablePolicy({
                        ...editablePolicy,
                        needStrengtheningBelow: Number(e.target.value) || 75
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min. Bukti TP</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={editablePolicy.minimumTpEvidenceCount}
                    onChange={(e) =>
                      setEditablePolicy({
                        ...editablePolicy,
                        minimumTpEvidenceCount: Math.max(1, Number(e.target.value) || 1)
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editablePolicy.usePerTpKktpIfConfigured}
                  onChange={(e) =>
                    setEditablePolicy({
                      ...editablePolicy,
                      usePerTpKktpIfConfigured: e.target.checked
                    })
                  }
                  className="rounded text-blue-600"
                />
                <span className="font-semibold text-slate-800">
                  Prioritaskan kriteria KKTP khusus per-TP apabila guru telah mengaturnya di menu KKTP
                </span>
              </label>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 space-y-1">
                <div className="font-bold">Kebijakan Rumus Nilai Akhir (Aktif &amp; Terkonfirmasi Sekolah):</div>
                <p className="text-[11px] leading-relaxed">{editablePolicy.confirmedFormulaNote}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer font-bold text-amber-950">
                  <input
                    type="checkbox"
                    checked={Boolean(editablePolicy.lockedPeriods?.[periodKey] || editablePolicy.isInputLocked)}
                    onChange={(e) => {
                      const nextLocked = e.target.checked;
                      setEditablePolicy({
                        ...editablePolicy,
                        isInputLocked: nextLocked,
                        lockedPeriods: {
                          ...(editablePolicy.lockedPeriods || {}),
                          [periodKey]: nextLocked
                        }
                      });
                    }}
                    className="rounded text-amber-600"
                  />
                  <span>Kunci Input Nilai &amp; Deskripsi Periode {academicYear} ({semester})</span>
                </label>
                <p className="text-[11px] text-amber-800">
                  Jika dikunci, Guru Mapel tidak dapat mengubah nilai formatif, sumatif, atau deskripsi rapor untuk periode ini (hanya Administrator yang tetap dapat mengelola).
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 text-xs">
              <button
                onClick={() => setPolicyModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleSavePolicyChanges}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Simpan Kebijakan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BANK DESKRIPSI MANAGER MODAL */}
      {bankModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-blue-400" />
                <h2 className="font-bold text-sm sm:text-base">
                  Kelola Bank Deskripsi Nilai &amp; Pola Kalimat TP (11 Mata Pelajaran)
                </h2>
              </div>
              <button
                onClick={() => setBankModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-700">Mata Pelajaran:</span>
                <select
                  value={bankSubId}
                  onChange={(e) => setBankSubId(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold bg-white text-slate-900"
                >
                  {sortSubjects(subjects).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl text-xs">
                <button
                  onClick={() => setBankTab('tp')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    bankTab === 'tp' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Template &amp; Pola TP Otomatis
                </button>
                <button
                  onClick={() => setBankTab('ranges')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    bankTab === 'ranges' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Rentang Nilai (75-100)
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {!currentBankItem ? (
                <div>Data bank tidak ditemukan.</div>
              ) : bankTab === 'tp' ? (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3">
                    <div className="font-bold text-blue-900">
                      Template Kalimat Otomatis Mapel ({currentBankItem.subjectName}) — gunakan placeholder <code>{'{tps}'}</code> untuk daftar kompetensi TP:
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Template Capaian Optimal:</label>
                        <textarea
                          rows={2}
                          value={currentBankItem.optimalTemplate || ''}
                          onChange={(e) =>
                            updateCurrentBankItem((b) => ({ ...b, optimalTemplate: e.target.value }))
                          }
                          className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Template Capaian Baik:</label>
                        <textarea
                          rows={2}
                          value={currentBankItem.goodTemplate || ''}
                          onChange={(e) =>
                            updateCurrentBankItem((b) => ({ ...b, goodTemplate: e.target.value }))
                          }
                          className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Template Perlu Penguatan:</label>
                        <textarea
                          rows={2}
                          value={currentBankItem.improvementTemplate || ''}
                          onChange={(e) =>
                            updateCurrentBankItem((b) => ({ ...b, improvementTemplate: e.target.value }))
                          }
                          className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Template Tindak Lanjut Jika Seluruh TP Tuntas:
                        </label>
                        <textarea
                          rows={2}
                          value={currentBankItem.allOptimalFollowUpTemplate || ''}
                          onChange={(e) =>
                            updateCurrentBankItem((b) => ({
                              ...b,
                              allOptimalFollowUpTemplate: e.target.value
                            }))
                          }
                          className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-800">Pola Deskripsi Khusus Per-TP / Lingkup Kompetensi (Opsional)</h4>
                        <p className="text-[11px] text-slate-500">
                          Jika kode TP atau kata kunci lingkup materi cocok, generator otomatis memakai pola kalimat ini.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addTpPattern}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Pola TP
                      </button>
                    </div>

                    {(currentBankItem.tpPatterns || []).length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-slate-400">
                        Belum ada pola khusus per-TP untuk mapel ini; sistem akan memakai rumusan resmi Tujuan Pembelajaran + Template Mapel.
                      </div>
                    ) : (
                      (currentBankItem.tpPatterns || []).map((pat) => (
                        <div key={pat.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              placeholder="Kode TP (mis. TP 7.1)"
                              value={pat.tpCode || ''}
                              onChange={(e) => updateTpPattern(pat.id, { tpCode: e.target.value })}
                              className="w-36 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
                            />
                            <input
                              type="text"
                              placeholder="Kata kunci lingkup materi (mis. Teks Deskripsi)"
                              value={pat.competenceScope}
                              onChange={(e) => updateTpPattern(pat.id, { competenceScope: e.target.value })}
                              className="flex-1 min-w-[200px] px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => removeTpPattern(pat.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                              title="Hapus Pola"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input
                              type="text"
                              placeholder="Frasa saat TP tercapai optimal/baik..."
                              value={pat.optimalPattern}
                              onChange={(e) => updateTpPattern(pat.id, { optimalPattern: e.target.value })}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white"
                            />
                            <input
                              type="text"
                              placeholder="Frasa saat TP perlu penguatan..."
                              value={pat.improvementPattern}
                              onChange={(e) => updateTpPattern(pat.id, { improvementPattern: e.target.value })}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white"
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                currentBankItem.ranges.map((rItem, rIdx) => (
                  <div key={rItem.range} className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                    <div className="flex items-center justify-between font-bold text-slate-800 border-b border-slate-100 pb-2">
                      <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 text-xs border border-blue-200">
                        Kategori Nilai: {rItem.range === 'below-75' ? '< 75 (Belum Tuntas)' : rItem.range}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Kalimat Capaian Tertinggi:</label>
                        <textarea
                          rows={2}
                          value={rItem.highestDesc}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateCurrentBankItem((b) => {
                              const newRanges = [...b.ranges];
                              newRanges[rIdx] = { ...newRanges[rIdx], highestDesc: val };
                              return { ...b, ranges: newRanges };
                            });
                          }}
                          className="w-full p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Kalimat Capaian Terendah / Perlu Peningkatan:
                        </label>
                        <textarea
                          rows={2}
                          value={rItem.lowestDesc}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateCurrentBankItem((b) => {
                              const newRanges = [...b.ranges];
                              newRanges[rIdx] = { ...newRanges[rIdx], lowestDesc: val };
                              return { ...b, ranges: newRanges };
                            });
                          }}
                          className="w-full p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setBankModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleSaveBankChanges}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs"
              >
                Simpan Perubahan Bank Deskripsi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
