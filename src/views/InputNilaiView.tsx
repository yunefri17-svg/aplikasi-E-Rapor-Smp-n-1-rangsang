import React, { useState, useEffect, useMemo } from 'react';
import {
  AssessmentDescriptionStatus,
  AssessmentPolicyConfig,
  AssessmentScore,
  AppNotification,
  Classroom,
  Curriculum,
  FormativeAssessment,
  KKTPConfig,
  LearningChapter,
  LearningObjective,
  Student,
  Subject,
  SummativeAssessment,
  Teacher,
  TeachingAssignment,
  User
} from '../types/erapor';
import { ReportScoreExcelTab } from '../components/assessment/ReportScoreExcelTab';
import { resolveSchoolWeights, filterChaptersForContext } from '../utils/assessmentCalculation';
import {
  FileSpreadsheet,
  Save,
  Check,
  Sparkles,
  ClipboardPaste,
  AlertTriangle,
  UserCheck,
  RefreshCw,
  CheckCircle2,
  Lock,
  Eye,
  Edit3,
  X,
  ListChecks,
  BookOpen,
  Wand2
} from 'lucide-react';
import { calculatePredicate } from '../services/storage';
import { SecurityAccessDenied } from '../components/SecurityAccessDenied';
import { sortClassrooms } from '../utils/classroomSort';
import { sortStudentsAlphabetically } from '../utils/studentSort';
import { sortSubjects } from '../utils/subjectSort';
import { SubjectDescriptionBank } from '../utils/descriptionBank';
import {
  StudentTPAttainmentResult,
  analyzeStudentTPAttainment,
  composeDescriptionFromSelectedTPs,
  filterObjectivesForContext,
  getSuggestedChecklistFromAnalysis,
  getSummativeTpIds,
  isPeriodInputLocked
} from '../utils/tpAnalysisAndDescription';
import {
  isElectiveSubject,
  isStudentParticipatingInSubject
} from '../utils/electiveSubjectHelper';

interface InputNilaiViewProps {
  schoolName?: string;
  classrooms: Classroom[];
  subjects: Subject[];
  students: Student[];
  learningObjectives: LearningObjective[];
  learningChapters?: LearningChapter[];
  scores: AssessmentScore[];
  curricula: Curriculum[];
  teachers?: Teacher[];
  teachingAssignments?: TeachingAssignment[];
  onSaveScores: (scores: AssessmentScore[], notification?: AppNotification) => void;
  onConfirmExcelImport?: (payload: {
    scoresToSave: AssessmentScore[];
    summativesToSave: SummativeAssessment[];
    notificationMessage: string;
  }) => void;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  currentUser: User;
  summativeAssessments?: SummativeAssessment[];
  formativeAssessments?: FormativeAssessment[];
  kktpConfigs?: KKTPConfig[];
  descriptionBank?: SubjectDescriptionBank[];
  assessmentPolicy?: AssessmentPolicyConfig;
}

const EMPTY_TEACHERS: Teacher[] = [];
const EMPTY_ASSIGNMENTS: TeachingAssignment[] = [];
const EMPTY_SUMMATIVE: SummativeAssessment[] = [];
const EMPTY_FORMATIVE: FormativeAssessment[] = [];
const EMPTY_KKTP: KKTPConfig[] = [];

const MANUAL_PROTECTED_STATUSES: AssessmentDescriptionStatus[] = [
  'Sudah diedit guru',
  'Sudah difinalisasi'
];

export const InputNilaiView: React.FC<InputNilaiViewProps> = ({
  schoolName,
  classrooms,
  subjects,
  students,
  learningObjectives,
  learningChapters = [],
  scores,
  curricula,
  teachers = EMPTY_TEACHERS,
  teachingAssignments = EMPTY_ASSIGNMENTS,
  onSaveScores,
  onConfirmExcelImport,
  academicYear,
  semester,
  currentUser,
  summativeAssessments = EMPTY_SUMMATIVE,
  formativeAssessments = EMPTY_FORMATIVE,
  kktpConfigs = EMPTY_KKTP,
  descriptionBank,
  assessmentPolicy
}) => {
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'kepsek';
  const isGuruMapel = currentUser.role === 'guru';
  const isWaliKelasReadOnly = currentUser.role === 'walikelas';
  const isLocked =
    currentUser.role !== 'admin' && isPeriodInputLocked(assessmentPolicy, academicYear, semester);
  const isReadOnly = isLocked || isWaliKelasReadOnly;

  const [activeInputTab, setActiveInputTab] = useState<'input' | 'excel'>('input');

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
    if (isAdmin || isWaliKelasReadOnly) return sortSubjects(subjects);
    if (!currentTeacher) return sortSubjects(subjects);

    const assignedSubIds = teachingAssignments
      .filter((ta) => ta.teacherId === currentTeacher.id && ta.status !== 'inactive')
      .map((ta) => ta.subjectId);

    const combinedIds = Array.from(new Set([...assignedSubIds, ...(currentTeacher.subjectsTaught || [])]));
    if (combinedIds.length > 0) {
      const filtered = subjects.filter((s) => combinedIds.includes(s.id));
      if (filtered.length > 0) return sortSubjects(filtered);
    }
    return sortSubjects(subjects);
  }, [isAdmin, isWaliKelasReadOnly, currentTeacher, teachingAssignments, subjects]);

  const [selectedSubject, setSelectedSubject] = useState<string>(() => {
    try {
      const savedSubj = sessionStorage.getItem('erapor_input_selected_subject');
      if (savedSubj && visibleSubjects.some((s) => s.id === savedSubj)) return savedSubj;
    } catch {}
    return visibleSubjects[0]?.id || subjects[0]?.id || 'sub-mat';
  });

  useEffect(() => {
    if (visibleSubjects.length > 0 && !visibleSubjects.some((s) => s.id === selectedSubject)) {
      setSelectedSubject(visibleSubjects[0].id);
    }
  }, [visibleSubjects, selectedSubject]);

  const handleSelectSubject = (id: string) => {
    setSelectedSubject(id);
    try {
      sessionStorage.setItem('erapor_input_selected_subject', id);
    } catch {}
  };

  const visibleClassrooms = useMemo(() => {
    const sortedAll = sortClassrooms(classrooms);
    if (isAdmin) return sortedAll;
    if (isWaliKelasReadOnly && currentUser.classId) {
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
  }, [
    isAdmin,
    isWaliKelasReadOnly,
    currentUser.classId,
    currentTeacher,
    teachingAssignments,
    selectedSubject,
    classrooms
  ]);

  const [selectedClass, setSelectedClass] = useState<string>(() => {
    try {
      const savedClass = sessionStorage.getItem('erapor_input_selected_class');
      if (savedClass && visibleClassrooms.some((c) => c.id === savedClass)) return savedClass;
    } catch {}
    return visibleClassrooms[0]?.id || classrooms[0]?.id || 'cls-vii-1';
  });

  useEffect(() => {
    if (visibleClassrooms.length > 0 && !visibleClassrooms.some((c) => c.id === selectedClass)) {
      setSelectedClass(visibleClassrooms[0].id);
    }
  }, [visibleClassrooms, selectedClass]);

  const handleSelectClass = (id: string) => {
    setSelectedClass(id);
    try {
      sessionStorage.setItem('erapor_input_selected_class', id);
    } catch {}
  };

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isBulkPasteOpen, setIsBulkPasteOpen] = useState(false);
  const [pasteData, setPasteData] = useState('');
  const [overwriteConfirmOpen, setOverwriteConfirmOpen] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [checklistDirtyIds, setChecklistDirtyIds] = useState<Record<string, boolean>>({});
  const [showTpListPanel, setShowTpListPanel] = useState(false);

  const [viewModalStudentId, setViewModalStudentId] = useState<string | null>(null);
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

  const isUnauthorized =
    !isAdmin &&
    !isWaliKelasReadOnly &&
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
  const currentGrade = currentClass?.gradeLevel || '7';
  const curMerdeka = curricula.find((c) => c.id === 'cur-merdeka') || curricula[0];
  const formatifWeight = (curMerdeka?.formatifWeight || 50) / 100;
  const sumatifWeight = (curMerdeka?.sumatifWeight || 50) / 100;

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
        gradeLevel: currentGrade,
        semester,
        academicYear
      }),
    [learningObjectives, selectedSubject, currentGrade, semester, academicYear]
  );

  // Per-student formative/summative attainment analysis (strictly supportive reference, NEVER auto-assigns checklists)
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
        gradeLevel: currentGrade,
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
    currentGrade,
    academicYear,
    semester,
    learningObjectives,
    formativeAssessments,
    summativeAssessments,
    kktpConfigs,
    assessmentPolicy
  ]);

  const [localScores, setLocalScores] = useState<Record<string, AssessmentScore>>({});

  // Hydrate from stored scores cleanly WITHOUT fabricating descriptions or forcing checklists from formatif/sumatif
  useEffect(() => {
    const map: Record<string, AssessmentScore> = {};
    const sanitizedYear = (academicYear || '').replace(/\//g, '_');

    classStudents.forEach((std) => {
      const existing = scores.find(
        (sc) =>
          sc.studentId === std.id &&
          sc.subjectId === selectedSubject &&
          (sc.classId === selectedClass || !sc.classId) &&
          ((sc.academicYear || '').replace(/\//g, '_') === sanitizedYear || sc.academicYear === academicYear) &&
          sc.semester === semester
      );

      const studentSummative = summativeAssessments.filter(
        (a) =>
          a.studentId === std.id &&
          a.subjectId === selectedSubject &&
          (a.academicYear === academicYear || (a.academicYear || '').replace(/\//g, '_') === sanitizedYear) &&
          a.semester === semester
      );

      const tpScores: Record<string, number[]> = {};
      studentSummative.forEach((a) => {
        getSummativeTpIds(a).forEach((tpId) => {
          if (!tpScores[tpId]) tpScores[tpId] = [];
          tpScores[tpId].push(a.score);
        });
      });

      const tpAveragesFromSummative: Record<string, number> = {};
      relevantTPs.forEach((tp) => {
        const vals = tpScores[tp.id] || [];
        if (vals.length > 0) {
          tpAveragesFromSummative[tp.id] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
        }
      });

      const hasSummativeData = Object.keys(tpAveragesFromSummative).length > 0;
      const validTpIdSet = new Set(relevantTPs.map((t) => t.id));

      if (existing) {
        const mergedSumatifMateri = {
          ...(existing.sumatifMateriScores || {}),
          ...tpAveragesFromSummative
        };

        let calculatedFinal = existing.finalScore;
        let calculatedPred = existing.predicate;

        if (existing.manualFinalScore !== undefined) {
          calculatedFinal = existing.manualFinalScore;
          calculatedPred = calculatePredicate(calculatedFinal, 75);
        } else if (hasSummativeData) {
          const materiVals = relevantTPs
            .map((tp) => mergedSumatifMateri[tp.id])
            .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));

          const avgMateri =
            materiVals.length > 0
              ? Math.round(materiVals.reduce((a, b) => a + b, 0) / materiVals.length)
              : existing.finalScore;

          const sas = existing.sumatifAkhirSemester ?? 0;
          calculatedFinal = sas > 0 ? Math.round(avgMateri * formatifWeight + sas * sumatifWeight) : avgMateri;
          calculatedPred = calculatePredicate(calculatedFinal, 75);
        }

        const optIds = Array.isArray(existing.selectedOptimalTpIds)
          ? existing.selectedOptimalTpIds.filter((id) => validTpIdSet.has(id))
          : [];
        const impIds = Array.isArray(existing.selectedImprovementTpIds)
          ? existing.selectedImprovementTpIds.filter((id) => validTpIdSet.has(id) && !optIds.includes(id))
          : [];

        map[std.id] = {
          ...existing,
          sumatifMateriScores: mergedSumatifMateri,
          finalScore: calculatedFinal,
          predicate: calculatedPred,
          selectedOptimalTpIds: optIds,
          selectedImprovementTpIds: impIds
        };
      } else {
        const initialSumatifMateri: Record<string, number> = { ...tpAveragesFromSummative };
        const materiVals = Object.values(initialSumatifMateri).filter(
          (v): v is number => typeof v === 'number' && !Number.isNaN(v)
        );
        const avgMateri =
          materiVals.length > 0 ? Math.round(materiVals.reduce((a, b) => a + b, 0) / materiVals.length) : 0;

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
          sumatifMateriScores: initialSumatifMateri,
          sumatifAkhirSemester: 0,
          finalScore: avgMateri,
          predicate: calculatePredicate(avgMateri, 75),
          selectedOptimalTpIds: [],
          selectedImprovementTpIds: [],
          highestCompetenceDesc: '',
          lowestCompetenceDesc: '',
          generatedDescription: '',
          finalDescription: '',
          descriptionStatus: 'Belum dibuat',
          status: 'DALAM PROSES',
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          updatedBy: currentUser.name
        };
      }
    });

    setLocalScores(map);
    setChecklistDirtyIds({});
  }, [
    selectedClass,
    selectedSubject,
    academicYear,
    semester,
    students,
    scores,
    summativeAssessments,
    relevantTPs,
    currentTeacher?.id,
    currentTeacher?.name,
    currentSubjectObj?.name,
    currentClass?.name,
    currentUser.name,
    formatifWeight,
    sumatifWeight
  ]);

  const handleSyncFromSummative = () => {
    if (isReadOnly) return;
    const map = { ...localScores };
    const sanitizedYear = (academicYear || '').replace(/\//g, '_');
    let matchedCount = 0;

    classStudents.forEach((std) => {
      const studentSummative = summativeAssessments.filter(
        (a) =>
          a.studentId === std.id &&
          a.subjectId === selectedSubject &&
          (a.academicYear === academicYear || (a.academicYear || '').replace(/\//g, '_') === sanitizedYear) &&
          a.semester === semester
      );

      if (studentSummative.length === 0) return;

      const tpScores: Record<string, number[]> = {};
      studentSummative.forEach((a) => {
        getSummativeTpIds(a).forEach((tpId) => {
          if (!tpScores[tpId]) tpScores[tpId] = [];
          tpScores[tpId].push(a.score);
        });
      });

      const tpAveragesFromSummative: Record<string, number> = {};
      relevantTPs.forEach((tp) => {
        const vals = tpScores[tp.id] || [];
        if (vals.length > 0) {
          tpAveragesFromSummative[tp.id] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
        }
      });

      if (Object.keys(tpAveragesFromSummative).length > 0) {
        matchedCount++;
        const current = map[std.id];
        if (!current) return;
        const mergedMateri = {
          ...(current.sumatifMateriScores || {}),
          ...tpAveragesFromSummative
        };

        const materiVals = relevantTPs
          .map((tp) => mergedMateri[tp.id])
          .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));

        const avgMateri =
          materiVals.length > 0
            ? Math.round(materiVals.reduce((a, b) => a + b, 0) / materiVals.length)
            : current.finalScore || 0;

        const sas = current.sumatifAkhirSemester ?? 0;
        const finalCalculated = sas > 0 ? Math.round(avgMateri * formatifWeight + sas * sumatifWeight) : avgMateri;
        const pred = calculatePredicate(finalCalculated, 75);

        map[std.id] = {
          ...current,
          sumatifMateriScores: mergedMateri,
          manualFinalScore: undefined,
          finalScore: finalCalculated,
          predicate: pred,
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          updatedBy: currentUser.name
        };
      }
    });

    setLocalScores(map);
    setSyncSuccessMessage(
      matchedCount > 0
        ? `${matchedCount} nilai angka disinkronkan dari Asesmen Sumatif. Silakan periksa checklist TP siswa lalu tekan "Simpan Data Nilai".`
        : 'Seluruh nilai sudah tersinkron dengan Asesmen Sumatif.'
    );
    setTimeout(() => setSyncSuccessMessage(null), 5000);
  };

  const revisionEntry = useMemo(() => {
    return Object.values(localScores).find((s) => s.status === 'REVISI' && Boolean(s.revisionNote));
  }, [localScores]);

  const handleScoreChange = (
    studentId: string,
    type: 'formatif' | 'sumatifMateri' | 'sas',
    tpId: string | null,
    rawValue: string
  ) => {
    if (isReadOnly) return;
    const current = localScores[studentId];
    if (!current) return;

    const updatedFormatif = { ...current.formatifScores };
    const updatedSumatifMateri = { ...current.sumatifMateriScores };
    let updatedSAS = current.sumatifAkhirSemester;

    if (rawValue === '') {
      if (type === 'formatif' && tpId) delete updatedFormatif[tpId];
      else if (type === 'sumatifMateri' && tpId) delete updatedSumatifMateri[tpId];
      else if (type === 'sas') updatedSAS = 0;
    } else {
      const clampedVal = Math.min(100, Math.max(0, Number(rawValue) || 0));
      if (type === 'formatif' && tpId) updatedFormatif[tpId] = clampedVal;
      else if (type === 'sumatifMateri' && tpId) updatedSumatifMateri[tpId] = clampedVal;
      else if (type === 'sas') updatedSAS = clampedVal;
    }

    const materiVals = Object.values(updatedSumatifMateri).filter(
      (v): v is number => typeof v === 'number' && !Number.isNaN(v)
    );
    const avgMateri =
      materiVals.length > 0 ? materiVals.reduce((a, b) => a + b, 0) / materiVals.length : updatedSAS;

    const finalCalculated =
      updatedSAS > 0 ? Math.round(avgMateri * formatifWeight + updatedSAS * sumatifWeight) : Math.round(avgMateri);
    const pred = calculatePredicate(finalCalculated, 75);

    setLocalScores({
      ...localScores,
      [studentId]: {
        ...current,
        formatifScores: updatedFormatif,
        sumatifMateriScores: updatedSumatifMateri,
        sumatifAkhirSemester: updatedSAS,
        manualFinalScore: undefined,
        finalScore: finalCalculated,
        predicate: pred,
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        updatedBy: currentUser.name
      }
    });
  };

  // Direct e-Rapor 2025.2 Final Score (0-100) input per student
  const handleDirectFinalScoreChange = (studentId: string, rawValue: string) => {
    if (isReadOnly) return;
    const current = localScores[studentId];
    if (!current) return;

    if (rawValue.trim() === '') {
      const materiVals = Object.values(current.sumatifMateriScores || {}).filter(
        (v): v is number => typeof v === 'number' && !Number.isNaN(v)
      );
      const fallbackCalc =
        materiVals.length > 0
          ? current.sumatifAkhirSemester > 0
            ? Math.round(
                (materiVals.reduce((a, b) => a + b, 0) / materiVals.length) * formatifWeight +
                  current.sumatifAkhirSemester * sumatifWeight
              )
            : Math.round(materiVals.reduce((a, b) => a + b, 0) / materiVals.length)
          : current.sumatifAkhirSemester || 0;
      setLocalScores({
        ...localScores,
        [studentId]: {
          ...current,
          manualFinalScore: undefined,
          finalScore: fallbackCalc,
          predicate: calculatePredicate(fallbackCalc, 75),
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          updatedBy: currentUser.name
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
        ...current,
        manualFinalScore: clamped,
        finalScore: clamped,
        predicate: calculatePredicate(clamped, 75),
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        updatedBy: currentUser.name
      }
    });
  };

  // Strictly per-student checklist toggle (Optimal vs Perlu Pendampingan)
  const handleToggleTpChecklist = (
    studentId: string,
    tpId: string,
    bucket: 'optimal' | 'improvement'
  ) => {
    if (isReadOnly) return;
    const current = localScores[studentId];
    if (!current) return;

    const currentOpt = Array.isArray(current.selectedOptimalTpIds) ? current.selectedOptimalTpIds : [];
    const currentImp = Array.isArray(current.selectedImprovementTpIds)
      ? current.selectedImprovementTpIds
      : [];

    let nextOpt = [...currentOpt];
    let nextImp = [...currentImp];

    if (bucket === 'optimal') {
      if (nextOpt.includes(tpId)) {
        nextOpt = nextOpt.filter((id) => id !== tpId);
      } else {
        nextOpt.push(tpId);
        nextImp = nextImp.filter((id) => id !== tpId);
      }
    } else {
      if (nextImp.includes(tpId)) {
        nextImp = nextImp.filter((id) => id !== tpId);
      } else {
        nextImp.push(tpId);
        nextOpt = nextOpt.filter((id) => id !== tpId);
      }
    }

    setLocalScores({
      ...localScores,
      [studentId]: {
        ...current,
        selectedOptimalTpIds: nextOpt,
        selectedImprovementTpIds: nextImp
      }
    });
    setChecklistDirtyIds((prev) => ({ ...prev, [studentId]: true }));
  };

  // Optional teacher-triggered helper: populate suggested checklist from formative/summative evidence for review
  const handleApplySuggestedChecklistForStudent = (studentId: string) => {
    if (isReadOnly) return;
    const current = localScores[studentId];
    const analysis = analysisByStudent[studentId];
    if (!current || !analysis) return;

    const suggested = getSuggestedChecklistFromAnalysis(analysis);
    if (suggested.optimalTpIds.length === 0 && suggested.improvementTpIds.length === 0) {
      setSyncSuccessMessage('Belum ada bukti nilai formatif/sumatif untuk siswa ini. Centang TP secara manual.');
      setTimeout(() => setSyncSuccessMessage(null), 3500);
      return;
    }

    setLocalScores({
      ...localScores,
      [studentId]: {
        ...current,
        selectedOptimalTpIds: suggested.optimalTpIds,
        selectedImprovementTpIds: suggested.improvementTpIds
      }
    });
    setChecklistDirtyIds((prev) => ({ ...prev, [studentId]: true }));
  };

  const handleApplySuggestedChecklistForEmptyStudents = () => {
    if (isReadOnly) return;
    const next = { ...localScores };
    const nextDirty = { ...checklistDirtyIds };
    let applied = 0;

    classStudents.forEach((std) => {
      const cur = next[std.id];
      if (!cur) return;
      const hasChecked =
        (cur.selectedOptimalTpIds?.length || 0) > 0 ||
        (cur.selectedImprovementTpIds?.length || 0) > 0;
      if (hasChecked) return;

      const suggested = getSuggestedChecklistFromAnalysis(analysisByStudent[std.id]);
      if (suggested.optimalTpIds.length === 0 && suggested.improvementTpIds.length === 0) return;

      next[std.id] = {
        ...cur,
        selectedOptimalTpIds: suggested.optimalTpIds,
        selectedImprovementTpIds: suggested.improvementTpIds
      };
      nextDirty[std.id] = true;
      applied++;
    });

    setLocalScores(next);
    setChecklistDirtyIds(nextDirty);
    setSyncSuccessMessage(
      applied > 0
        ? `Saran checklist TP dari Formatif/Sumatif diisi untuk ${applied} siswa. Periksa kembali tiap siswa lalu klik "Simpan Data Nilai".`
        : 'Tidak ada siswa kosong yang memiliki bukti Formatif/Sumatif untuk disarankan.'
    );
    setTimeout(() => setSyncSuccessMessage(null), 4500);
  };

  const composeStudentRecordFromChecklist = (
    std: Student,
    sc: AssessmentScore,
    forceRecompose: boolean
  ): AssessmentScore => {
    const analysis = analysisByStudent[std.id];
    const optIds = Array.isArray(sc.selectedOptimalTpIds) ? sc.selectedOptimalTpIds : [];
    const impIds = Array.isArray(sc.selectedImprovementTpIds) ? sc.selectedImprovementTpIds : [];
    const selectedOptimalTPs = relevantTPs.filter((tp) => optIds.includes(tp.id));
    const selectedImprovementTPs = relevantTPs.filter((tp) => impIds.includes(tp.id));

    const isManualProtected = Boolean(
      sc.descriptionStatus && MANUAL_PROTECTED_STATUSES.includes(sc.descriptionStatus)
    );

    if (isManualProtected && !forceRecompose) {
      return {
        ...sc,
        learningObjectiveIds: relevantTPs.map((t) => t.id),
        formativeAssessmentIds: analysis?.matchedFormativeIds || sc.formativeAssessmentIds,
        summativeAssessmentIds: analysis?.matchedSummativeIds || sc.summativeAssessmentIds,
        tpAnalysis: analysis?.tpSummaries || sc.tpAnalysis
      };
    }

    if (selectedOptimalTPs.length === 0 && selectedImprovementTPs.length === 0) {
      return {
        ...sc,
        learningObjectiveIds: relevantTPs.map((t) => t.id),
        formativeAssessmentIds: analysis?.matchedFormativeIds || sc.formativeAssessmentIds,
        summativeAssessmentIds: analysis?.matchedSummativeIds || sc.summativeAssessmentIds,
        tpAnalysis: analysis?.tpSummaries || sc.tpAnalysis,
        descriptionStatus:
          sc.highestCompetenceDesc || sc.lowestCompetenceDesc || sc.finalDescription
            ? 'Sudah disimpan'
            : 'Belum dibuat',
        completenessWarning:
          sc.highestCompetenceDesc || sc.lowestCompetenceDesc
            ? undefined
            : 'Checklist TP Optimal / Perlu Pendampingan belum dipilih oleh guru untuk siswa ini.'
      };
    }

    const composed = composeDescriptionFromSelectedTPs({
      student: std,
      subject: currentSubjectObj,
      subjectId: selectedSubject,
      classroom: currentClass,
      academicYear,
      semester,
      finalScore: sc.finalScore,
      selectedOptimalTPs,
      selectedImprovementTPs,
      descriptionBank,
      policy: assessmentPolicy
    });

    const achievedSummaries = analysis
      ? analysis.tpSummaries.filter((t) => optIds.includes(t.tpId))
      : [];
    const improvementSummaries = analysis
      ? analysis.tpSummaries.filter((t) => impIds.includes(t.tpId))
      : [];

    return {
      ...sc,
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
      descriptionStatus: composed.canGenerate ? 'Sudah disimpan' : 'Belum dibuat',
      completenessWarning: composed.completenessWarning
    };
  };

  const executeSaveAll = (recomposeManualProtected: boolean) => {
    if (isReadOnly) return;
    const activeSubj = subjects.find((s) => s.id === selectedSubject);
    const nowStamp = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const updatedLocal = { ...localScores };
    const scoreArray: AssessmentScore[] = [];

    classStudents.forEach((std) => {
      const sc = updatedLocal[std.id];
      if (!sc) return;

      const hasCheckedTP =
        (sc.selectedOptimalTpIds?.length || 0) > 0 ||
        (sc.selectedImprovementTpIds?.length || 0) > 0;
      const hasScoreInput =
        sc.manualFinalScore !== undefined ||
        Object.keys(sc.sumatifMateriScores || {}).length > 0 ||
        sc.sumatifAkhirSemester > 0 ||
        scores.some((ex) => ex.id === sc.id);

      if (!hasScoreInput && !hasCheckedTP) return;

      const shouldForceRecompose =
        recomposeManualProtected && Boolean(checklistDirtyIds[std.id]);

      const composedRecord = composeStudentRecordFromChecklist(std, sc, shouldForceRecompose);

      const finalRecord: AssessmentScore = {
        ...composedRecord,
        status: 'SELESAI',
        revisionNote: '',
        teacherId: currentTeacher?.id || composedRecord.teacherId || '',
        teacherName: currentTeacher?.name || composedRecord.teacherName || currentUser.name,
        studentName: std.name,
        subjectName: activeSubj?.name || composedRecord.subjectName,
        className: currentClass?.name || composedRecord.className,
        updatedAt: nowStamp,
        updatedBy: currentUser.name,
        updatedById: currentUser.id
      };

      updatedLocal[std.id] = finalRecord;
      scoreArray.push(finalRecord);
    });

    if (scoreArray.length === 0) {
      setSyncSuccessMessage('Belum ada nilai atau checklist TP siswa yang diisi untuk disimpan.');
      setTimeout(() => setSyncSuccessMessage(null), 3500);
      setOverwriteConfirmOpen(false);
      return;
    }

    setLocalScores(updatedLocal);
    setChecklistDirtyIds({});
    setOverwriteConfirmOpen(false);

    const homeroomTeacherObj = teachers.find((t) => t.homeroomClassId === selectedClass);
    const notification: AppNotification = {
      id: `notif-${Date.now()}`,
      recipientUserId: homeroomTeacherObj ? `usr-${homeroomTeacherObj.id}` : '',
      recipientRole: 'walikelas',
      title: `Nilai & Deskripsi ${activeSubj?.name || ''} Kelas ${currentClass?.name || ''} Diperbarui`,
      message: `Guru Mata Pelajaran (${currentUser.name}) telah menyimpan nilai akhir dan menyusun deskripsi TP ${activeSubj?.name} untuk Kelas ${currentClass?.name}.`,
      type: 'score_submitted',
      subjectId: selectedSubject,
      classId: selectedClass,
      academicYear,
      semester,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    onSaveScores(scoreArray, notification);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const handleSaveDataNilaiClick = () => {
    if (isReadOnly) return;
    const hasModifiedProtected = classStudents.some((std) => {
      const sc = localScores[std.id];
      if (!sc || !checklistDirtyIds[std.id]) return false;
      return Boolean(sc.descriptionStatus && MANUAL_PROTECTED_STATUSES.includes(sc.descriptionStatus));
    });

    if (hasModifiedProtected) {
      setOverwriteConfirmOpen(true);
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
      if (nextOpt.includes(tpId)) nextOpt = nextOpt.filter((i) => i !== tpId);
      else {
        nextOpt.push(tpId);
        nextImp = nextImp.filter((i) => i !== tpId);
      }
    } else {
      if (nextImp.includes(tpId)) nextImp = nextImp.filter((i) => i !== tpId);
      else {
        nextImp.push(tpId);
        nextOpt = nextOpt.filter((i) => i !== tpId);
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
      descriptionBank,
      policy: assessmentPolicy
    });

    if (!composed.canGenerate) {
      setSyncSuccessMessage(
        composed.completenessWarning || 'Pilih minimal 1 TP Optimal atau TP Perlu Pendampingan.'
      );
      setTimeout(() => setSyncSuccessMessage(null), 3500);
      return;
    }

    setEditForm({
      ...editForm,
      highestCompetenceDesc: composed.highestCompetenceDesc,
      lowestCompetenceDesc: composed.lowestCompetenceDesc,
      finalDescription: composed.generatedDescription
    });
  };

  const handleSaveManualEditModal = (finalize: boolean) => {
    if (!editModalStudentId || isReadOnly) return;
    const std = classStudents.find((s) => s.id === editModalStudentId);
    const cur = localScores[editModalStudentId];
    if (!std || !cur) return;

    const high = editForm.highestCompetenceDesc.trim();
    const low = editForm.lowestCompetenceDesc.trim();
    const combined = editForm.finalDescription.trim() || [high, low].filter(Boolean).join(' ');
    const nowStamp = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const updatedRecord: AssessmentScore = {
      ...cur,
      selectedOptimalTpIds: editForm.selectedOptimalTpIds,
      selectedImprovementTpIds: editForm.selectedImprovementTpIds,
      highestCompetenceDesc: high,
      lowestCompetenceDesc: low,
      finalDescription: combined,
      descriptionStatus: finalize ? 'Sudah difinalisasi' : 'Sudah diedit guru',
      completenessWarning: undefined,
      status: cur.status === 'BELUM' ? 'SELESAI' : cur.status || 'SELESAI',
      teacherId: currentTeacher?.id || cur.teacherId || '',
      teacherName: currentTeacher?.name || cur.teacherName || currentUser.name,
      studentName: std.name,
      subjectName: currentSubjectObj?.name || cur.subjectName,
      className: currentClass?.name || cur.className,
      updatedAt: nowStamp,
      updatedBy: currentUser.name,
      updatedById: currentUser.id
    };

    setLocalScores({
      ...localScores,
      [editModalStudentId]: updatedRecord
    });
    setChecklistDirtyIds((prev) => {
      const next = { ...prev };
      delete next[editModalStudentId];
      return next;
    });
    setEditModalStudentId(null);

    onSaveScores([updatedRecord]);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleApplyPaste = () => {
    if (!pasteData.trim() || isReadOnly) return;

    const lines = pasteData.trim().split('\n');
    const updated = { ...localScores };

    lines.forEach((line, idx) => {
      if (idx >= classStudents.length) return;
      const std = classStudents[idx];
      const tokens = line
        .split('\t')
        .map((t) => parseFloat(t.trim()))
        .filter((t) => !isNaN(t));

      if (tokens.length > 0) {
        const item = updated[std.id];
        if (!item) return;

        // If user pastes just 1 column, treat as direct Nilai Akhir Rapor; otherwise map TP Sumatif + SAS
        if (tokens.length === 1) {
          const directFinal = Math.min(100, Math.max(0, Math.round(tokens[0])));
          updated[std.id] = {
            ...item,
            manualFinalScore: directFinal,
            finalScore: directFinal,
            predicate: calculatePredicate(directFinal, 75)
          };
        } else {
          const sasVal = Math.min(100, Math.max(0, tokens[tokens.length - 1]));
          const updatedMateri = { ...item.sumatifMateriScores };
          relevantTPs.forEach((tp, tpIdx) => {
            if (tokens[tpIdx] !== undefined && tpIdx < tokens.length - 1) {
              updatedMateri[tp.id] = Math.min(100, Math.max(0, tokens[tpIdx]));
            }
          });

          const materiVals = Object.values(updatedMateri);
          const avgMateri =
            materiVals.length > 0 ? materiVals.reduce((a, b) => a + b, 0) / materiVals.length : sasVal;
          const finalCalculated = Math.round(avgMateri * formatifWeight + sasVal * sumatifWeight);

          updated[std.id] = {
            ...item,
            sumatifMateriScores: updatedMateri,
            sumatifAkhirSemester: sasVal,
            manualFinalScore: undefined,
            finalScore: finalCalculated,
            predicate: calculatePredicate(finalCalculated, 75)
          };
        }
      }
    });

    setLocalScores(updated);
    setIsBulkPasteOpen(false);
    setPasteData('');
  };

  const viewStudent = viewModalStudentId
    ? classStudents.find((s) => s.id === viewModalStudentId)
    : undefined;
  const viewScore = viewModalStudentId ? localScores[viewModalStudentId] : undefined;
  const viewAnalysis = viewModalStudentId ? analysisByStudent[viewModalStudentId] : undefined;

  const editStudent = editModalStudentId
    ? classStudents.find((s) => s.id === editModalStudentId)
    : undefined;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Input Nilai Akhir &amp; Pemetaan Checklist TP (e-Rapor 2025.2)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Input Nilai Akhir Rapor (0–100), tentukan checklist TP Optimal &amp; TP Perlu Pendampingan per siswa, lalu tekan Simpan Data Nilai untuk menyusun deskripsi tertinggi &amp; terendah otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveInputTab('input')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeInputTab === 'input' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Input Nilai Rapor
          </button>
          <button
            onClick={() => setActiveInputTab('excel')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeInputTab === 'excel' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Pengisian Nilai (Excel)
          </button>
        </div>
      </div>

      {activeInputTab === 'excel' && (
        <ReportScoreExcelTab
          schoolName={schoolName || 'SMP Negeri 1 Rangsang'}
          academicYear={academicYear}
          semester={semester}
          subject={currentSubjectObj || subjects[0]}
          classroom={currentClass || classrooms[0]}
          students={classStudents}
          chapters={filterChaptersForContext(learningChapters || [], {
            subjectId: selectedSubject,
            classId: selectedClass,
            academicYear,
            semester
          })}
          scores={scores}
          summativeAssessments={summativeAssessments}
          weights={resolveSchoolWeights(curricula)}
          currentUser={currentUser}
          isReadOnly={isReadOnly}
          onConfirmImport={(payload) => {
            if (onConfirmExcelImport) {
              onConfirmExcelImport(payload);
            } else {
              onSaveScores(payload.scoresToSave);
            }
          }}
        />
      )}

      {activeInputTab === 'input' && (
        <>
        <div className="space-y-6">
          {saveSuccess && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold animate-in fade-in">
              <Check className="w-4 h-4" />
              Data Nilai &amp; Deskripsi Tersimpan!
            </div>
          )}

          <button
            onClick={handleSyncFromSummative}
            disabled={isReadOnly}
            className="px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
            Sinkronkan Nilai Sumatif
          </button>

          <button
            onClick={handleApplySuggestedChecklistForEmptyStudents}
            disabled={isReadOnly || relevantTPs.length === 0}
            title="Opsional: isi awal checklist TP dari bukti formatif/sumatif untuk siswa yang belum dicentang agar mudah diperiksa guru"
            className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Wand2 className="w-3.5 h-3.5 text-indigo-600" />
            Saran Checklist (Formatif/Sumatif)
          </button>

          <button
            onClick={() => setIsBulkPasteOpen(true)}
            disabled={isReadOnly}
            className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-blue-600" />
            Tempel Excel
          </button>

          <button
            onClick={handleSaveDataNilaiClick}
            disabled={isReadOnly}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
          >
            <Save className="w-4 h-4" />
            Simpan Data Nilai
          </button>
        </div>

      {isLocked && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Periode Input Nilai Terkunci ({academicYear} {semester}):</strong> Seluruh kolom entri nilai dan checklist TP dinonaktifkan sementara oleh Administrator.
          </span>
        </div>
      )}

      {syncSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncSuccessMessage}</span>
        </div>
      )}

      {isGuruMapel && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-slate-800 text-sm">
                Guru Mata Pelajaran: {currentUser.name}{' '}
                {currentTeacher?.nip ? `(NIP: ${currentTeacher.nip})` : ''}
              </div>
              <div className="text-slate-600 mt-0.5">
                Mata Pelajaran Diampu:{' '}
                <span className="font-semibold text-blue-700">
                  {visibleSubjects.map((s) => s.name).join(', ') || 'Semua Mata Pelajaran'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-white text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 font-semibold shadow-2xs">
              Tahun Pelajaran: {academicYear} ({semester})
            </span>
          </div>
        </div>
      )}

      {revisionEntry && (
        <div className="bg-amber-50 border-2 border-amber-400 p-4 rounded-xl flex items-start space-x-3 text-amber-900 shadow-md">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="font-bold text-sm text-amber-900">Permintaan Perbaikan Nilai dari Wali Kelas</div>
            <div className="mt-1 font-medium bg-amber-100/70 p-2.5 rounded-lg border border-amber-300 text-slate-800">
              "{revisionEntry.revisionNote}"
            </div>
          </div>
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
              <strong>{currentClass?.name}</strong> yang terdaftar mengikuti mata pelajaran ini. Siswa yang tidak mengikuti tidak akan mendapat baris/nilai pada Rapor.
            </span>
          ) : (
            <span>
              <strong>Mata Pelajaran Pilihan ({currentSubjectObj?.name}):</strong> Kelas{' '}
              <strong>{currentClass?.name}</strong> belum ditugaskan di menu{' '}
              <strong>Penugasan Guru Mengajar</strong> untuk periode {academicYear} ({semester}). Hanya siswa/kelas yang ditugaskan (atau memiliki nilai tersimpan) yang akan muncul di Rapor.
            </span>
          )}
        </div>
      )}

      {/* Selector Filters + Daftar TP Drawer Toggle */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Rombel:</span>
              <select
                value={selectedClass}
                onChange={(e) => handleSelectClass(e.target.value)}
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
                onChange={(e) => handleSelectSubject(e.target.value)}
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

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setShowTpListPanel((v) => !v)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1.5 transition"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              Daftar TP Mapel ({relevantTPs.length})
            </button>
            <div className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-medium">
              Bobot Hitung: {curMerdeka.formatifWeight}% Materi + {curMerdeka.sumatifWeight}% SAS
            </div>
            <div className="text-slate-500 font-semibold">{classStudents.length} Siswa</div>
          </div>
        </div>

        {relevantTPs.length === 0 ? (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Belum ada Tujuan Pembelajaran (TP) yang diinput untuk <strong>{currentSubjectObj?.name}</strong> Kelas <strong>{currentGrade}</strong> Semester <strong>{semester}</strong>. Tambahkan TP di menu <strong>Data Pembelajaran (CP/TP)</strong> agar checklist TP dan penyusunan deskripsi otomatis tersedia.
            </span>
          </div>
        ) : (
          showTpListPanel && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="font-bold text-slate-800 mb-1">
                Tujuan Pembelajaran Terdaftar ({currentSubjectObj?.name} — Kelas {currentGrade} {semester}):
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {relevantTPs.map((tp) => (
                  <div key={tp.id} className="p-2 rounded-lg bg-white border border-slate-200 flex gap-2">
                    <span className="font-mono font-bold text-blue-700 shrink-0">{tp.code}</span>
                    <div className="text-slate-700">
                      {tp.materi && <span className="font-semibold text-slate-900">{tp.materi}: </span>}
                      <span>{tp.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>

      {/* Main Interactive Scoring & Per-Student Checklist Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-2.5 py-3 text-center w-9 border-r border-slate-200" rowSpan={2}>
                  No
                </th>
                <th className="px-3 py-3 min-w-[165px] border-r border-slate-200" rowSpan={2}>
                  Peserta Didik
                </th>

                {relevantTPs.length > 0 && (
                  <th
                    className="px-2 py-2 text-center bg-blue-50/70 text-blue-800 border-r border-slate-200"
                    colSpan={relevantTPs.length}
                  >
                    Sumatif Lingkup Materi (Opsional Hitung)
                  </th>
                )}

                <th
                  className="px-2 py-3 text-center w-16 bg-indigo-50/70 text-indigo-900 border-r border-slate-200"
                  rowSpan={2}
                >
                  SAS
                </th>

                <th
                  className="px-2.5 py-3 text-center w-24 bg-emerald-50 text-emerald-900 border-r border-slate-200"
                  rowSpan={2}
                >
                  Nilai Akhir
                  <span className="block text-[10px] font-normal text-emerald-700">Skala 0–100</span>
                </th>

                <th
                  className="px-3 py-3 min-w-[200px] bg-emerald-50/40 text-emerald-900 border-r border-slate-200"
                  rowSpan={2}
                >
                  <div className="flex items-center gap-1">
                    <ListChecks className="w-3.5 h-3.5 text-emerald-700" />
                    <span>TP Dicapai Optimal</span>
                  </div>
                  <span className="block text-[10px] font-normal text-slate-500">
                    Centang TP tertinggi siswa ini
                  </span>
                </th>

                <th
                  className="px-3 py-3 min-w-[200px] bg-amber-50/50 text-amber-900 border-r border-slate-200"
                  rowSpan={2}
                >
                  <div className="flex items-center gap-1">
                    <ListChecks className="w-3.5 h-3.5 text-amber-700" />
                    <span>TP Perlu Pendampingan</span>
                  </div>
                  <span className="block text-[10px] font-normal text-slate-500">
                    Centang TP terendah siswa ini
                  </span>
                </th>

                <th className="px-3 py-3 min-w-[240px] border-r border-slate-200" rowSpan={2}>
                  Deskripsi Capaian Kompetensi (Tertinggi &amp; Terendah)
                </th>

                <th className="px-2.5 py-3 text-center w-24" rowSpan={2}>
                  Aksi
                </th>
              </tr>
              {relevantTPs.length > 0 && (
                <tr className="bg-slate-100/60 border-t border-slate-200">
                  {relevantTPs.map((tp) => (
                    <th
                      key={tp.id}
                      className="px-2 py-1 text-center font-mono text-[11px] border-r border-slate-200 text-blue-900"
                      title={`${tp.code}: ${tp.description}`}
                    >
                      {tp.code}
                    </th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classStudents.map((std, idx) => {
                const item = localScores[std.id];
                if (!item) return null;

                const optIds = item.selectedOptimalTpIds || [];
                const impIds = item.selectedImprovementTpIds || [];
                const hasManualFinal = item.manualFinalScore !== undefined;
                const hasAnyEntered =
                  hasManualFinal ||
                  Object.keys(item.sumatifMateriScores || {}).length > 0 ||
                  item.sumatifAkhirSemester > 0 ||
                  scores.some((ex) => ex.id === item.id);

                const isDirty = Boolean(checklistDirtyIds[std.id]);

                return (
                  <tr key={std.id} className="hover:bg-slate-50/60 transition align-top">
                    <td className="px-2.5 py-2.5 text-center text-slate-500 font-medium border-r border-slate-100">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2.5 border-r border-slate-100">
                      <div className="font-bold text-slate-800">{std.name}</div>
                      <div className="font-mono text-[10px] text-slate-500">{std.nisn || std.nis}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            item.descriptionStatus === 'Sudah difinalisasi'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : item.descriptionStatus === 'Sudah disimpan'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : item.descriptionStatus === 'Sudah diedit guru'
                              ? 'bg-purple-100 text-purple-800 border-purple-300'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {item.descriptionStatus || 'Belum dibuat'}
                        </span>
                        {isDirty && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                            Checklist diubah
                          </span>
                        )}
                      </div>
                    </td>

                    {relevantTPs.length > 0 &&
                      relevantTPs.map((tp) => {
                        const val = item.sumatifMateriScores?.[tp.id];
                        return (
                          <td key={tp.id} className="px-1.5 py-2 text-center border-r border-slate-100">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              disabled={isReadOnly}
                              placeholder="--"
                              value={val === undefined ? '' : val}
                              onChange={(e) =>
                                handleScoreChange(std.id, 'sumatifMateri', tp.id, e.target.value)
                              }
                              className={`w-12 px-1 py-1 text-center rounded border font-semibold text-xs focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 ${
                                typeof val === 'number' && val < 75
                                  ? 'border-rose-300 bg-rose-50/40 text-rose-700'
                                  : 'border-slate-300 bg-white'
                              }`}
                            />
                          </td>
                        );
                      })}

                    <td className="px-1.5 py-2 text-center border-r border-slate-100 bg-indigo-50/20">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        disabled={isReadOnly}
                        placeholder="--"
                        value={item.sumatifAkhirSemester > 0 ? item.sumatifAkhirSemester : ''}
                        onChange={(e) => handleScoreChange(std.id, 'sas', null, e.target.value)}
                        className="w-12 px-1 py-1 text-center rounded border border-indigo-300 font-bold text-xs text-indigo-900 bg-white focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100"
                      />
                    </td>

                    {/* Editable Nilai Akhir Rapor 0-100 */}
                    <td className="px-2 py-2 text-center border-r border-slate-100 bg-emerald-50/30">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        disabled={isReadOnly}
                        placeholder="0-100"
                        value={hasAnyEntered ? item.finalScore : ''}
                        onChange={(e) => handleDirectFinalScoreChange(std.id, e.target.value)}
                        className={`w-16 px-1.5 py-1 text-center rounded-lg border font-black text-sm focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 ${
                          hasAnyEntered && item.finalScore < 75
                            ? 'border-rose-300 text-rose-700 bg-rose-50/50'
                            : 'border-emerald-300 text-emerald-800 bg-white'
                        }`}
                      />
                      {hasAnyEntered && (
                        <div className="mt-1">
                          <span
                            className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              item.predicate === 'A'
                                ? 'bg-blue-100 text-blue-800'
                                : item.predicate === 'B'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.predicate === 'C'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            Pred. {item.predicate}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Per-Student Checklist TP Optimal */}
                    <td className="px-2.5 py-2 border-r border-slate-100 bg-emerald-50/10">
                      {relevantTPs.length === 0 ? (
                        <span className="text-[11px] text-slate-400 italic">Belum ada TP</span>
                      ) : (
                        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
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
                                  onChange={() => handleToggleTpChecklist(std.id, tp.id, 'optimal')}
                                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
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
                    <td className="px-2.5 py-2 border-r border-slate-100 bg-amber-50/10">
                      {relevantTPs.length === 0 ? (
                        <span className="text-[11px] text-slate-400 italic">Belum ada TP</span>
                      ) : (
                        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
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
                                  onChange={() =>
                                    handleToggleTpChecklist(std.id, tp.id, 'improvement')
                                  }
                                  className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
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
                              onClick={() => handleApplySuggestedChecklistForStudent(std.id)}
                              className="mt-1 text-[10px] font-semibold text-indigo-700 hover:underline flex items-center gap-1"
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              Saran nilai siswa ini
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Composed Highest & Lowest Description */}
                    <td className="px-3 py-2 text-[11px] text-slate-700 border-r border-slate-100 space-y-1">
                      {item.highestCompetenceDesc || item.lowestCompetenceDesc || item.finalDescription ? (
                        <div className="space-y-1">
                          {item.highestCompetenceDesc && (
                            <div className="line-clamp-2">
                              <span className="font-bold text-emerald-700">Tertinggi: </span>
                              {item.highestCompetenceDesc}
                            </div>
                          )}
                          {item.lowestCompetenceDesc && (
                            <div className="line-clamp-2">
                              <span className="font-bold text-amber-700">Terendah: </span>
                              {item.lowestCompetenceDesc}
                            </div>
                          )}
                          {!item.highestCompetenceDesc &&
                            !item.lowestCompetenceDesc &&
                            item.finalDescription && (
                              <div className="line-clamp-3">{item.finalDescription}</div>
                            )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">
                          Centang TP Optimal / Perlu Pendampingan lalu tekan{' '}
                          <strong>Simpan Data Nilai</strong>.
                        </span>
                      )}
                    </td>

                    {/* Per-Student View & Edit Buttons */}
                    <td className="px-2 py-2 text-center">
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewModalStudentId(std.id)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1 transition"
                        >
                          <Eye className="w-3 h-3 text-blue-600" />
                          Lihat
                        </button>
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(std.id)}
                            className="px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold flex items-center justify-center gap-1 transition"
                          >
                            <Edit3 className="w-3 h-3" />
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW MODAL ("Lihat Deskripsi") */}
      {viewModalStudentId && viewStudent && viewScore && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div>
                <h2 className="font-bold text-base">Detail Nilai &amp; Deskripsi — {viewStudent.name}</h2>
                <p className="text-[11px] text-slate-300">
                  {currentSubjectObj?.name} • {currentClass?.name} • Nilai Akhir: {viewScore.finalScore} (Predikat {viewScore.predicate})
                </p>
              </div>
              <button
                onClick={() => setViewModalStudentId(null)}
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
                <p className="text-slate-800 leading-relaxed">
                  {viewScore.highestCompetenceDesc || 'Belum disusun.'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
                <div className="font-bold text-amber-900">
                  2. Deskripsi Capaian Kompetensi Terendah (Perlu Pendampingan)
                </div>
                <p className="text-slate-800 leading-relaxed">
                  {viewScore.lowestCompetenceDesc || 'Belum disusun.'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 space-y-1">
                <div className="font-bold text-blue-900">
                  Pratinjau Gabungan pada Rapor ({viewScore.descriptionStatus || 'Belum dibuat'})
                </div>
                <p className="text-slate-800 leading-relaxed">
                  {viewScore.finalDescription ||
                    [viewScore.highestCompetenceDesc, viewScore.lowestCompetenceDesc]
                      .filter(Boolean)
                      .join(' ') ||
                    'Belum ada deskripsi tersimpan.'}
                </p>
              </div>

              {viewAnalysis && viewAnalysis.tpSummaries.length > 0 && (
                <div>
                  <div className="font-bold text-slate-800 mb-2">
                    Referensi Bukti Nilai Formatif &amp; Sumatif per TP:
                  </div>
                  <div className="space-y-1.5">
                    {viewAnalysis.tpSummaries.map((tp) => (
                      <div key={tp.tpId} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span>
                            {tp.code}
                            {tp.materi ? ` — ${tp.materi}` : ''}
                          </span>
                          <span className="text-[11px] font-semibold text-blue-700">
                            {tp.evidenceSummary}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              {!isReadOnly && (
                <button
                  onClick={() => {
                    const id = viewModalStudentId;
                    setViewModalStudentId(null);
                    handleOpenEditModal(id);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Deskripsi
                </button>
              )}
              <button
                onClick={() => setViewModalStudentId(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL ("Edit Deskripsi & Checklist TP") */}
      {editModalStudentId && editStudent && !isReadOnly && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in zoom-in-95 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Edit Deskripsi &amp; Checklist TP — {editStudent.name}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Sesuaikan checklist TP atau perbaiki kalimat deskripsi capaian kompetensi tertinggi dan terendah, lalu simpan ke Firebase.
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
                    <div className="font-bold text-amber-800 mb-1.5">
                      Checklist TP Perlu Pendampingan:
                    </div>
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
                      finalDescription: [nextHigh, editForm.lowestCompetenceDesc]
                        .filter(Boolean)
                        .join(' ')
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
                      finalDescription: [editForm.highestCompetenceDesc, nextLow]
                        .filter(Boolean)
                        .join(' ')
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
                onClick={() => handleSaveManualEditModal(false)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Simpan Edit ke Firebase
              </button>
              <button
                onClick={() => handleSaveManualEditModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Finalisasi Rapor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overwrite Protected Manual Descriptions Confirm Modal on Save */}
      {overwriteConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900">
              Konfirmasi Pembaruan Deskripsi yang Sudah Diedit Guru
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ada siswa yang checklist TP-nya baru diubah tetapi memiliki deskripsi berstatus{' '}
              <strong>Sudah diedit guru / Sudah difinalisasi</strong>. Apakah Anda ingin menyusun ulang deskripsinya mengikuti checklist terbaru atau mempertahankan kalimat editan guru?
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                onClick={() => setOverwriteConfirmOpen(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold"
              >
                Batal
              </button>
              <button
                onClick={() => executeSaveAll(false)}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold"
              >
                Pertahankan Editan Guru
              </button>
              <button
                onClick={() => executeSaveAll(true)}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold"
              >
                Susun Ulang dari Checklist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Paste Modal */}
      {isBulkPasteOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-blue-600" />
                Salin &amp; Tempel Nilai dari Excel
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tempelkan 1 kolom angka untuk langsung mengisi <strong>Nilai Akhir Rapor (0–100)</strong>, atau tempel beberapa kolom nilai TP dan SAS dipisahkan Tab dari Excel secara berurutan sesuai daftar siswa.
            </p>

            <textarea
              rows={8}
              value={pasteData}
              onChange={(e) => setPasteData(e.target.value)}
              placeholder="Contoh 1 kolom (Nilai Akhir):&#10;88&#10;92&#10;79&#10;&#10;Atau beberapa kolom (TP1 TP2 SAS):&#10;85	88	85&#10;90	92	90"
              className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBulkPasteOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyPaste}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
              >
                Terapkan Nilai
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
