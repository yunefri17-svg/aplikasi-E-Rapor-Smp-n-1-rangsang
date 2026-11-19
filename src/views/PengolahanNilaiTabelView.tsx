import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AcademicYearPeriod,
  AppNotification,
  AssessmentPolicyConfig,
  AssessmentScore,
  AuthSessionContext,
  Classroom,
  Curriculum,
  FormativeAssessment,
  LearningChapter,
  SaveOperationResult,
  Student,
  Subject,
  SummativeAssessment,
  SummativeAssessmentPlan,
  Teacher,
  TeachingAssignment,
  User
} from '../types/erapor';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardPaste,
  Download,
  FileSpreadsheet,
  FileText,
  Info,
  Lock,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Upload,
  X
} from 'lucide-react';
import { sortClassrooms } from '../utils/classroomSort';
import { sortStudentsAlphabetically } from '../utils/studentSort';
import { getVisibleSubjectsForUser } from '../utils/teacherAssignmentHelper';
import {
  authorizeSubjectAssessmentWrite,
  getAuthorizedSubjectClassIds
} from '../utils/authorizationGuard';
import {
  calculateFormativeAverage,
  filterChaptersForContext,
  filterSummativePlansForContext,
  formatScoreDecimal,
  resolveSchoolWeights
} from '../utils/assessmentCalculation';
import {
  isStudentParticipatingInSubject,
  normalizeAcademicYearValue,
  normalizeSemesterValue
} from '../utils/electiveSubjectHelper';
import {
  buildGuardedSpreadsheetSavePayloads,
  buildSpreadsheetColumns,
  ComputedSpreadsheetRow,
  computeSpreadsheetRowSummary,
  extractStudentInitialEditState,
  parseNumericScoreInput,
  parseSpreadsheetPasteGrid,
  parseSpreadsheetTableExcelBuffer,
  parseQuickTextColumnScores,
  ExcelTableImportResult,
  QuickTextImportResult,
  StudentSpreadsheetEditState
} from '../utils/spreadsheetScoreHelper';
import { ReportScoreExcelTab } from '../components/assessment/ReportScoreExcelTab';

interface PengolahanNilaiTabelViewProps {
  schoolName: string;
  classrooms: Classroom[];
  students: Student[];
  subjects: Subject[];
  curricula: Curriculum[];
  teachers: Teacher[];
  teachingAssignments: TeachingAssignment[];
  learningChapters: LearningChapter[];
  summativePlans: SummativeAssessmentPlan[];
  summativeAssessments: SummativeAssessment[];
  formativeAssessments?: FormativeAssessment[];
  scores: AssessmentScore[];
  academicYears?: AcademicYearPeriod[];
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  currentUser: User;
  assessmentPolicy?: AssessmentPolicyConfig;
  authContext?: AuthSessionContext | null;
  lastSaveStatus?: SaveOperationResult | null;
  onSaveSpreadsheetBatch: (payload: {
    scoresToSave: AssessmentScore[];
    summativesToSave: SummativeAssessment[];
    notification?: AppNotification;
  }) => void;
  onConfirmExcelImport: (payload: {
    scoresToSave: AssessmentScore[];
    summativesToSave: SummativeAssessment[];
    notificationMessage: string;
  }) => void;
}

export const PengolahanNilaiTabelView: React.FC<PengolahanNilaiTabelViewProps> = ({
  schoolName,
  classrooms,
  students,
  subjects,
  curricula,
  teachers,
  teachingAssignments,
  learningChapters,
  summativePlans,
  summativeAssessments,
  formativeAssessments = [],
  scores,
  academicYears = [],
  academicYear,
  semester,
  currentUser,
  assessmentPolicy,
  authContext,
  lastSaveStatus,
  onSaveSpreadsheetBatch,
  onConfirmExcelImport
}) => {
  const [selectedYear, setSelectedYear] = useState(academicYear);
  const [selectedSemester, setSelectedSemester] = useState<'Ganjil' | 'Genap'>(semester);

  const yearOptions = useMemo(() => {
    const set = new Set<string>([academicYear]);
    academicYears.forEach((ay) => {
      if (ay?.name) set.add(ay.name);
    });
    return Array.from(set).filter(Boolean);
  }, [academicYear, academicYears]);

  const visibleSubjects = useMemo(
    () =>
      getVisibleSubjectsForUser({
        currentUser,
        subjects,
        teachingAssignments,
        teachers,
        includeAllForWaliKelas: currentUser.role === 'walikelas' || currentUser.role === 'kepsek'
      }),
    [currentUser, subjects, teachingAssignments, teachers]
  );

  const [selectedSubjectId, setSelectedSubjectId] = useState(visibleSubjects[0]?.id || '');

  useEffect(() => {
    if (visibleSubjects.length > 0 && !visibleSubjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId(visibleSubjects[0].id);
    } else if (visibleSubjects.length === 0 && selectedSubjectId !== '') {
      setSelectedSubjectId('');
    }
  }, [visibleSubjects, selectedSubjectId]);

  const classScope = useMemo(
    () =>
      getAuthorizedSubjectClassIds({
        user: currentUser,
        teachers,
        teachingAssignments,
        subjectId: selectedSubjectId,
        academicYear: selectedYear,
        semester: selectedSemester
      }),
    [currentUser, teachers, teachingAssignments, selectedSubjectId, selectedYear, selectedSemester]
  );

  const visibleClassrooms = useMemo(() => {
    const sorted = sortClassrooms(classrooms);
    if (classScope.allowAll) return sorted;
    const allowedSet = new Set(classScope.classIds);
    return sorted.filter((c) => allowedSet.has(c.id));
  }, [classrooms, classScope]);

  const [selectedClassId, setSelectedClassId] = useState(visibleClassrooms[0]?.id || '');

  useEffect(() => {
    if (visibleClassrooms.length > 0 && !visibleClassrooms.some((c) => c.id === selectedClassId)) {
      setSelectedClassId(visibleClassrooms[0].id);
    } else if (visibleClassrooms.length === 0 && selectedClassId !== '') {
      setSelectedClassId('');
    }
  }, [visibleClassrooms, selectedClassId]);

  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === selectedSubjectId),
    [subjects, selectedSubjectId]
  );
  const selectedClassroom = useMemo(
    () => classrooms.find((c) => c.id === selectedClassId),
    [classrooms, selectedClassId]
  );

  const writeAuth = useMemo(
    () =>
      authorizeSubjectAssessmentWrite({
        user: currentUser,
        subjectId: selectedSubjectId,
        classId: selectedClassId,
        academicYear: selectedYear,
        semester: selectedSemester,
        teachers,
        teachingAssignments,
        assessmentPolicy,
        authContext
      }),
    [
      currentUser,
      selectedSubjectId,
      selectedClassId,
      selectedYear,
      selectedSemester,
      teachers,
      teachingAssignments,
      assessmentPolicy,
      authContext
    ]
  );

  const isReadOnly = !writeAuth.allowed;

  const contextStudents = useMemo(() => {
    if (!selectedClassId) return [];
    const inClass = students.filter((st) => st.classId === selectedClassId && st.status === 'Aktif');
    const participating = selectedSubject
      ? inClass.filter((st) =>
          isStudentParticipatingInSubject({
            studentId: st.id,
            subject: selectedSubject,
            classId: selectedClassId,
            academicYear: selectedYear,
            semester: selectedSemester,
            teachingAssignments,
            scores
          })
        )
      : inClass;
    return sortStudentsAlphabetically(participating);
  }, [
    students,
    selectedClassId,
    selectedSubject,
    selectedYear,
    selectedSemester,
    teachingAssignments
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

  const columns = useMemo(
    () => buildSpreadsheetColumns({ chapters: contextChapters, plans: contextPlans }),
    [contextChapters, contextPlans]
  );

  const weights = useMemo(() => resolveSchoolWeights(curricula), [curricula]);
  const passingCriteria = selectedSubject?.kkm || weights.passingCriteria;

  const targetNormYear = normalizeAcademicYearValue(selectedYear);
  const targetNormSem = normalizeSemesterValue(selectedSemester);

  const existingScoreByStudentId = useMemo(() => {
    const map: Record<string, AssessmentScore> = {};
    scores.forEach((sc) => {
      if (
        sc.subjectId === selectedSubjectId &&
        normalizeAcademicYearValue(sc.academicYear) === targetNormYear &&
        normalizeSemesterValue(sc.semester) === targetNormSem
      ) {
        map[sc.studentId] = sc;
      }
    });
    return map;
  }, [scores, selectedSubjectId, targetNormYear, targetNormSem]);

  const [editsByStudentId, setEditsByStudentId] = useState<
    Record<string, StudentSpreadsheetEditState>
  >({});
  const [dirtyStudentIds, setDirtyStudentIds] = useState<Set<string>>(new Set());
  const [showManualColumn, setShowManualColumn] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeImportTab, setActiveImportTab] = useState<'excel_file' | 'quick_text' | 'legacy_template'>('excel_file');
  const [excelFileName, setExcelFileName] = useState('');
  const [isParsingExcelFile, setIsParsingExcelFile] = useState(false);
  const [excelParseResult, setExcelParseResult] = useState<ExcelTableImportResult | null>(null);
  const [quickTextInput, setQuickTextInput] = useState('');
  const [quickTextTargetKey, setQuickTextTargetKey] = useState<string>('sas');
  const [quickTextMatchMode, setQuickTextMatchMode] = useState<'order' | 'auto_detect'>('order');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [allowAdminOverrideLocked, setAllowAdminOverrideLocked] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'warning' | 'error' | 'info';
    text: string;
  } | null>(null);

  const tableContainerRef = useRef<HTMLDivElement | null>(null);

  // Re-initialize grid cleanly when context changes or underlying saved records change (preserving non-reset context cleanly)
  const contextSignature = `${selectedSubjectId}__${selectedClassId}__${selectedYear}__${selectedSemester}`;
  const prevContextRef = useRef<string>('');

  useEffect(() => {
    const isContextSwitch = prevContextRef.current !== contextSignature;
    prevContextRef.current = contextSignature;

    setEditsByStudentId((prevEdits) => {
      const next: Record<string, StudentSpreadsheetEditState> = {};
      contextStudents.forEach((std) => {
        if (!isContextSwitch && dirtyStudentIds.has(std.id) && prevEdits[std.id]) {
          next[std.id] = prevEdits[std.id];
          return;
        }
        const initialEdit = extractStudentInitialEditState({
          studentId: std.id,
          subjectId: selectedSubjectId,
          classId: selectedClassId,
          academicYear: selectedYear,
          semester: selectedSemester,
          columns,
          existingScore: existingScoreByStudentId[std.id],
          summativeAssessments
        });

        next[std.id] = initialEdit;
      });
      return next;
    });

    if (isContextSwitch) {
      setDirtyStudentIds(new Set());
      setFeedbackBanner(null);
    }
  }, [
    contextSignature,
    contextStudents,
    selectedSubjectId,
    selectedClassId,
    selectedYear,
    selectedSemester,
    columns,
    existingScoreByStudentId,
    summativeAssessments,
    formativeAssessments,
    targetNormYear,
    targetNormSem
  ]);

  const computedRows: ComputedSpreadsheetRow[] = useMemo(() => {
    return contextStudents.map((std) => {
      const editState = editsByStudentId[std.id] || {
        cellValues: {},
        sasValue: '',
        manualFinalValue: '',
        formatifValue: ''
      };
      return computeSpreadsheetRowSummary({
        student: std,
        editState,
        columns,
        chapters: contextChapters,
        existingScore: existingScoreByStudentId[std.id],
        weights,
        passingCriteria,
        academicYears,
        assessmentPolicy,
        currentUser
      });
    });
  }, [
    contextStudents,
    editsByStudentId,
    columns,
    contextChapters,
    existingScoreByStudentId,
    weights,
    passingCriteria,
    academicYears,
    assessmentPolicy,
    currentUser
  ]);

  const totalColCount = columns.length + 1 + (showManualColumn ? 1 : 0);

  const updateStudentCell = (
    studentId: string,
    field: { kind: 'col'; colKey: string } | { kind: 'formatif' } | { kind: 'sas' } | { kind: 'manual' },
    value: string
  ) => {
    setEditsByStudentId((prev) => {
      const cur = prev[studentId] || { cellValues: {}, sasValue: '', manualFinalValue: '', formatifValue: '' };
      if (field.kind === 'col') {
        return {
          ...prev,
          [studentId]: {
            ...cur,
            cellValues: { ...cur.cellValues, [field.colKey]: value }
          }
        };
      }
      if (field.kind === 'formatif') {
        return { ...prev, [studentId]: { ...cur, formatifValue: value } };
      }
      if (field.kind === 'sas') {
        return { ...prev, [studentId]: { ...cur, sasValue: value } };
      }
      return { ...prev, [studentId]: { ...cur, manualFinalValue: value } };
    });
    setDirtyStudentIds((prev) => {
      const next = new Set(prev);
      next.add(studentId);
      return next;
    });
  };

  const focusCell = (rowIdx: number, colIdx: number) => {
    if (rowIdx < 0 || rowIdx >= computedRows.length || colIdx < 0 || colIdx >= totalColCount) {
      return;
    }
    const target = tableContainerRef.current?.querySelector<HTMLInputElement>(
      `input[data-cell="${rowIdx}:${colIdx}"]`
    );
    if (target && !target.disabled) {
      target.focus();
      target.select();
    }
  };

  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIdx: number,
    colIdx: number
  ) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      focusCell(rowIdx + 1, colIdx);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusCell(rowIdx - 1, colIdx);
    } else if (e.key === 'ArrowRight' && e.currentTarget.selectionStart === e.currentTarget.value.length) {
      e.preventDefault();
      focusCell(rowIdx, colIdx + 1);
    } else if (e.key === 'ArrowLeft' && e.currentTarget.selectionStart === 0) {
      e.preventDefault();
      focusCell(rowIdx, colIdx - 1);
    }
  };

  const handleCellPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startRowIdx: number,
    startColIdx: number
  ) => {
    const text = e.clipboardData.getData('text');
    // Only intercept multi-line or tab-delimited spreadsheet paste; single scalar stays natural browser input
    if (!text.includes('\t') && !text.includes('\n') && !text.includes('\r')) {
      return;
    }
    e.preventDefault();
    const parsed = parseSpreadsheetPasteGrid(text);
    if (parsed.errors.length > 0) {
      setFeedbackBanner({
        type: 'error',
        text: `Sebagian data tempel dari Excel tidak valid: ${parsed.errors
          .slice(0, 3)
          .map((er) => er.error)
          .join(' | ')}`
      });
      return;
    }

    const updatedStudents = new Set(dirtyStudentIds);
    let appliedCells = 0;

    setEditsByStudentId((prev) => {
      const next = { ...prev };
      parsed.grid.forEach((pRow, rOffset) => {
        const targetRow = computedRows[startRowIdx + rOffset];
        if (!targetRow) return;
        const canEditRow =
          !isReadOnly &&
          (!targetRow.isProtected || (currentUser.role === 'admin' && allowAdminOverrideLocked));
        if (!canEditRow) return;

        const stdId = targetRow.student.id;
        const cur = next[stdId] || { cellValues: {}, sasValue: '', manualFinalValue: '', formatifValue: '' };
        const updatedCellValues = { ...cur.cellValues };
        let updatedFormatif = cur.formatifValue ?? '';
        let updatedSas = cur.sasValue;
        let updatedManual = cur.manualFinalValue;

        pRow.forEach((numVal, cOffset) => {
          const targetColIdx = startColIdx + cOffset;
          const strVal = numVal !== undefined ? String(numVal) : '';
          if (targetColIdx >= 0 && targetColIdx < columns.length) {
            updatedCellValues[columns[targetColIdx].key] = strVal;
            appliedCells++;
          } else if (targetColIdx === columns.length) {
            updatedSas = strVal;
            appliedCells++;
          } else if (showManualColumn && targetColIdx === columns.length + 1) {
            updatedManual = strVal;
            appliedCells++;
          }
        });

        next[stdId] = {
          cellValues: updatedCellValues,
          formatifValue: updatedFormatif,
          sasValue: updatedSas,
          manualFinalValue: updatedManual
        };
        updatedStudents.add(stdId);
      });
      return next;
    });

    setDirtyStudentIds(updatedStudents);
    setFeedbackBanner({
      type: 'info',
      text: `Berhasil menempelkan ${appliedCells} sel nilai dari clipboard ke tabel. Klik "Simpan Perubahan ke Server" untuk menyimpan permanen.`
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingExcelFile(true);
    setExcelFileName(file.name);
    setExcelParseResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const res = parseSpreadsheetTableExcelBuffer(buffer, {
        students: contextStudents,
        columns
      });
      setExcelParseResult(res);
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        text: `Gagal membaca file Excel: ${err?.message || 'Format tidak valid'}`
      });
    } finally {
      setIsParsingExcelFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApplyExcelFileToGrid = () => {
    if (!excelParseResult) return;
    const { previewRows } = excelParseResult;
    let appliedCount = 0;
    let skippedProtected = 0;

    setEditsByStudentId((prev) => {
      const next = { ...prev };
      const newDirty = new Set(dirtyStudentIds);

      previewRows.forEach((pr) => {
        if (pr.matchedBy === 'none') return;
        const rowSummary = computedRows.find((r) => r.student.id === pr.studentId);
        if (rowSummary?.isProtected && !allowAdminOverrideLocked) {
          skippedProtected++;
          return;
        }

        const currentEdit = next[pr.studentId] || {
          cellValues: {},
          sasValue: '',
          manualFinalValue: ''
        };

        const updatedCellValues = { ...currentEdit.cellValues };
        let hasChange = false;

        Object.entries(pr.importedScores).forEach(([k, val]) => {
          if (val !== undefined) {
            updatedCellValues[k] = String(val);
            hasChange = true;
          }
        });

        let updatedFormatif = currentEdit.formatifValue;
        if (pr.importedFormatif !== undefined) {
          updatedFormatif = String(pr.importedFormatif);
          hasChange = true;
        }

        let updatedSas = currentEdit.sasValue;
        if (pr.importedSas !== undefined) {
          updatedSas = String(pr.importedSas);
          hasChange = true;
        }

        let updatedManual = currentEdit.manualFinalValue;
        if (pr.importedManualFinal !== undefined) {
          updatedManual = String(pr.importedManualFinal);
          hasChange = true;
        }

        if (hasChange) {
          next[pr.studentId] = {
            cellValues: updatedCellValues,
            formatifValue: updatedFormatif,
            sasValue: updatedSas,
            manualFinalValue: updatedManual
          };
          newDirty.add(pr.studentId);
          appliedCount++;
        }
      });

      setDirtyStudentIds(newDirty);
      return next;
    });

    setShowImportModal(false);
    setExcelParseResult(null);
    setExcelFileName('');
    setFeedbackBanner({
      type: 'success',
      text: `Berhasil menerapkan nilai dari Excel untuk ${appliedCount} siswa ke tabel.${
        skippedProtected > 0 ? ` (${skippedProtected} siswa terkunci dilewati).` : ''
      } Periksa tabel dan klik "Simpan Perubahan ke Server".`
    });
  };

  const quickTextResult = useMemo(() => {
    if (!quickTextInput.trim()) return null;
    const targetCol = columns.find((c) => c.key === quickTextTargetKey);
    const targetLabel =
      quickTextTargetKey === 'sas'
        ? 'Nilai SAS'
        : quickTextTargetKey === 'manual'
        ? 'Manual Override'
        : targetCol?.label || 'Nilai';

    return parseQuickTextColumnScores({
      text: quickTextInput,
      students: contextStudents,
      targetKey: quickTextTargetKey,
      targetLabel,
      matchMode: quickTextMatchMode
    });
  }, [quickTextInput, quickTextTargetKey, quickTextMatchMode, contextStudents, columns]);

  const handleApplyQuickTextToGrid = () => {
    if (!quickTextResult || quickTextResult.appliedCount === 0) return;
    const { previewRows } = quickTextResult;
    let appliedCount = 0;
    let skippedProtected = 0;

    setEditsByStudentId((prev) => {
      const next = { ...prev };
      const newDirty = new Set(dirtyStudentIds);

      previewRows.forEach((pr) => {
        if (pr.matchedBy === 'none') return;
        const rowSummary = computedRows.find((r) => r.student.id === pr.studentId);
        if (rowSummary?.isProtected && !allowAdminOverrideLocked) {
          skippedProtected++;
          return;
        }

        const currentEdit = next[pr.studentId] || {
          cellValues: {},
          sasValue: '',
          manualFinalValue: ''
        };

        const updatedCellValues = { ...currentEdit.cellValues };
        let hasChange = false;

        Object.entries(pr.importedScores).forEach(([k, val]) => {
          if (val !== undefined) {
            updatedCellValues[k] = String(val);
            hasChange = true;
          }
        });

        let updatedSas = currentEdit.sasValue;
        if (pr.importedSas !== undefined) {
          updatedSas = String(pr.importedSas);
          hasChange = true;
        }

        let updatedManual = currentEdit.manualFinalValue;
        if (pr.importedManualFinal !== undefined) {
          updatedManual = String(pr.importedManualFinal);
          hasChange = true;
        }

        if (hasChange) {
          next[pr.studentId] = {
            cellValues: updatedCellValues,
            sasValue: updatedSas,
            manualFinalValue: updatedManual
          };
          newDirty.add(pr.studentId);
          appliedCount++;
        }
      });

      setDirtyStudentIds(newDirty);
      return next;
    });

    setShowImportModal(false);
    setQuickTextInput('');
    setFeedbackBanner({
      type: 'success',
      text: `Berhasil menerapkan nilai teks untuk ${appliedCount} siswa ke tabel.${
        skippedProtected > 0 ? ` (${skippedProtected} siswa terkunci dilewati).` : ''
      } Periksa tabel dan klik "Simpan Perubahan ke Server".`
    });
  };

  const handleResetEdits = () => {
    const resetMap: Record<string, StudentSpreadsheetEditState> = {};
    contextStudents.forEach((std) => {
      resetMap[std.id] = extractStudentInitialEditState({
        studentId: std.id,
        subjectId: selectedSubjectId,
        classId: selectedClassId,
        academicYear: selectedYear,
        semester: selectedSemester,
        columns,
        existingScore: existingScoreByStudentId[std.id],
        summativeAssessments
      });
    });
    setEditsByStudentId(resetMap);
    setDirtyStudentIds(new Set());
    setFeedbackBanner({
      type: 'info',
      text: 'Perubahan lokal yang belum disimpan telah dikembalikan ke data tersimpan terakhir.'
    });
  };

  const handleSaveDirtyRows = () => {
    if (isReadOnly || !selectedSubject || !selectedClassroom) {
      setFeedbackBanner({
        type: 'error',
        text: writeAuth.reason || 'Anda tidak memiliki izin tulis pada mata pelajaran & kelas ini.'
      });
      return;
    }

    if (dirtyStudentIds.size === 0) {
      setFeedbackBanner({
        type: 'info',
        text: 'Belum ada sel nilai yang diubah.'
      });
      return;
    }

    const payload = buildGuardedSpreadsheetSavePayloads({
      dirtyStudentIds,
      rows: computedRows,
      editsByStudentId,
      columns,
      chapters: contextChapters,
      subject: selectedSubject,
      classId: selectedClassroom.id,
      className: selectedClassroom.name,
      academicYear: selectedYear,
      semester: selectedSemester,
      weights,
      currentUser,
      resolvedTeacherId: writeAuth.resolvedTeacherId,
      allowAdminOverrideLocked
    });

    if (payload.invalidStudents.length > 0) {
      setFeedbackBanner({
        type: 'error',
        text: `Periksa nilai di luar rentang 0–100 atau bukan angka pada siswa: ${payload.invalidStudents.join(', ')}.`
      });
      return;
    }

    if (payload.scoresToSave.length === 0 && payload.summativesToSave.length === 0) {
      const reasons: string[] = [];
      if (payload.skippedProtectedStudents.length > 0) {
        reasons.push(`${payload.skippedProtectedStudents.length} siswa dilindungi/terkunci`);
      }
      if (payload.skippedNullScoreStudents.length > 0) {
        reasons.push(
          `${payload.skippedNullScoreStudents.length} siswa belum memiliki angka nilai akhir (0–100) yang valid untuk dokumen assessment_scores`
        );
      }
      setFeedbackBanner({
        type: 'warning',
        text: reasons.length
          ? `Tidak ada data yang disimpan ke server: ${reasons.join('; ')}.`
          : 'Tidak ada baris valid untuk disimpan.'
      });
      return;
    }

    const notif: AppNotification | undefined =
      payload.scoresToSave.length > 0
        ? {
            id: `notif-tbl-${Date.now()}`,
            recipientRole: 'walikelas',
            classId: selectedClassroom.id,
            className: selectedClassroom.name,
            subjectId: selectedSubject.id,
            subjectName: selectedSubject.name,
            academicYear: selectedYear,
            semester: selectedSemester,
            title: `Update Nilai Tabel: ${selectedSubject.name}`,
            message: `${currentUser.name} memperbarui ${payload.scoresToSave.length} nilai rapor siswa kelas ${selectedClassroom.name} (${selectedYear} ${selectedSemester}).`,
            createdAt: new Date().toISOString(),
            isRead: false
          }
        : undefined;

    onSaveSpreadsheetBatch({
      scoresToSave: payload.scoresToSave,
      summativesToSave: payload.summativesToSave,
      notification: notif
    });

    const savedStudentIdSet = new Set([
      ...payload.scoresToSave.map((s) => s.studentId),
      ...payload.summativesToSave.map((s) => s.studentId)
    ]);
    setDirtyStudentIds((prev) => {
      const next = new Set(prev);
      savedStudentIdSet.forEach((id) => next.delete(id));
      return next;
    });

    const infoParts: string[] = [];
    if (payload.scoresToSave.length > 0) {
      infoParts.push(`${payload.scoresToSave.length} nilai rapor`);
    }
    if (payload.summativesToSave.length > 0) {
      infoParts.push(`${payload.summativesToSave.length} komponen sumatif`);
    }
    if (payload.skippedNullScoreStudents.length > 0) {
      infoParts.push(
        `${payload.skippedNullScoreStudents.length} baris hanya komponen sumatif (nilai akhir rapor belum terbentuk sehingga belum dibuat dokumen assessment_scores)`
      );
    }
    if (payload.skippedProtectedStudents.length > 0) {
      infoParts.push(`${payload.skippedProtectedStudents.length} baris terkunci/arsip dilewati`);
    }

    setFeedbackBanner({
      type:
        payload.skippedNullScoreStudents.length > 0 || payload.skippedProtectedStudents.length > 0
          ? 'warning'
          : 'success',
      text: `Mengirim ${infoParts.join(' • ')}. Pantau status penyimpanan server pada header atas.`
    });
  };

  const handleExportCurrentGridExcel = () => {
    if (!selectedSubject || !selectedClassroom) return;

    const header = [
      'NO',
      'NIS',
      'NISN',
      'NAMA_SISWA',
      'REKAP_FORMATIF_KKTP',
      ...columns.map((c) => (c.subLabel ? `${c.label} (${c.subLabel})` : c.label)),
      'NILAI_SAS',
      'RATA_SUMATIF',
      'NILAI_AKHIR',
      'PREDIKAT',
      'STATUS_KELENGKAPAN',
      'KETERANGAN'
    ];

    const aoa: any[][] = [
      [`PENGOLAHAN NILAI SISWA - ${schoolName.toUpperCase()}`],
      ['MAPEL', selectedSubject.name, 'ROMBEL', selectedClassroom.name],
      ['TAHUN_AJARAN', selectedYear, 'SEMESTER', selectedSemester],
      ['MODEL_PENILAIAN', weights.formulaLabel, 'KKM', passingCriteria],
      [],
      header
    ];

    computedRows.forEach((row, idx) => {
      const edit = editsByStudentId[row.student.id] || {
        cellValues: {},
        sasValue: '',
        manualFinalValue: '',
        formatifValue: ''
      };
      const kktpMap = row.existingScore?.formatifKktpScores || {};
      const kktpKeys = Object.keys(kktpMap);
      const kktpSummary =
        kktpKeys.length > 0
          ? `${kktpKeys.filter((k) => kktpMap[k] === 1).length}/${kktpKeys.length} TP`
          : '-';
      aoa.push([
        idx + 1,
        row.student.nis || '',
        row.student.nisn || '',
        row.student.name,
        kktpSummary,
        ...columns.map((c) => {
          const parsed = parseNumericScoreInput(edit.cellValues[c.key] ?? '');
          return parsed.value !== undefined ? parsed.value : '';
        }),
        row.sasScore !== undefined ? row.sasScore : '',
        row.sumatifAverage !== undefined ? row.sumatifAverage : '',
        row.finalScore !== undefined ? row.finalScore : '',
        row.predicate || '',
        row.completenessStatus === 'LENGKAP' ? 'Lengkap' : 'Belum Lengkap',
        row.isProtected ? 'Terkunci/Arsip' : row.missingComponentNote || row.breakdownText || 'Lengkap'
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pengolahan_Nilai');
    const safeSubj = (selectedSubject.code || selectedSubject.name).replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeCls = selectedClassroom.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeYr = selectedYear.replace(/[\/\s]/g, '-');
    XLSX.writeFile(wb, `Pengolahan_Nilai_${safeSubj}_${safeCls}_${safeYr}_${selectedSemester}.xlsx`);
  };

  const invalidCellCount = computedRows.filter((r) => r.hasInvalidCells).length;
  const protectedRowCount = computedRows.filter((r) => r.isProtected).length;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900">
                Pengolahan Nilai Siswa (Tabel Excel)
              </h1>
              <p className="text-xs text-slate-500">
                Input &amp; olah nilai Sumatif / BAB serta SAS langsung dalam tabel bergaya Excel — mendukung salin-tempel dari Excel &amp; navigasi tombol panah/Enter.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700">
            Rumus Aktif: {weights.formulaLabel}
          </span>
          {lastSaveStatus && lastSaveStatus.status !== 'IDLE' && (
            <span
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border ${
                lastSaveStatus.status === 'SAVED_SERVER'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : lastSaveStatus.status === 'SAVING'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {lastSaveStatus.message || lastSaveStatus.status}
            </span>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
            Tahun Ajaran
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
          >
            {yearOptions.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
            Semester
          </label>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value as 'Ganjil' | 'Genap')}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
          >
            <option value="Ganjil">Ganjil</option>
            <option value="Genap">Genap</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
            Mata Pelajaran
          </label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
          >
            {visibleSubjects.length === 0 ? (
              <option value="">Tidak ada mapel ditugaskan</option>
            ) : (
              visibleSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
            Rombongan Belajar
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
          >
            {visibleClassrooms.length === 0 ? (
              <option value="">Tidak ada rombel dapat diakses</option>
            ) : (
              visibleClassrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* RBAC / Read-Only / Column Info Notices */}
      {isReadOnly && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Mode Baca Saja (Read-Only):</strong>{' '}
            {writeAuth.reason || 'Anda hanya dapat melihat rekap nilai tanpa izin mengubah nilai pada kombinasi mapel/kelas ini.'}
          </span>
        </div>
      )}

      {columns.length === 0 && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong>Belum ada BAB Materi / Rencana Sumatif</strong> untuk {selectedSubject?.name || 'mapel ini'} di{' '}
            {selectedClassroom?.name || 'kelas ini'} ({selectedYear} {selectedSemester}). Anda tetap dapat mengisi <strong>Nilai SAS</strong> atau <strong>Nilai Akhir Manual</strong>, atau tambahkan BAB / Rencana Sumatif terlebih dahulu pada menu <strong>14. Asesmen Sumatif</strong> agar kolom penilaian muncul otomatis di sini.
          </div>
        </div>
      )}

      {protectedRowCount > 0 && (
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-600 shrink-0" />
            <span>
              Terdapat <strong>{protectedRowCount} siswa</strong> dengan nilai berstatus{' '}
              <strong>TERKUNCI / Finalisasi / Arsip</strong> yang dilindungi dari perubahan otomatis.
            </span>
          </div>
          {currentUser.role === 'admin' && (
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-rose-700">
              <input
                type="checkbox"
                checked={allowAdminOverrideLocked}
                onChange={(e) => setAllowAdminOverrideLocked(e.target.checked)}
                className="rounded border-rose-300"
              />
              Izinkan Admin ubah nilai terkunci
            </label>
          )}
        </div>
      )}

      {feedbackBanner && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            feedbackBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : feedbackBanner.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : feedbackBanner.type === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            {feedbackBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : feedbackBanner.type === 'info' ? (
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedbackBanner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-xs font-bold underline shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Spreadsheet Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-medium">
            <ClipboardPaste className="w-3.5 h-3.5 text-emerald-600" />
            Bisa langsung <strong>Copy-Paste (Ctrl+V)</strong> nilai dari Excel ke sel tabel
          </span>
          <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={showManualColumn}
              onChange={(e) => setShowManualColumn(e.target.checked)}
              className="rounded border-slate-300"
            />
            Tampilkan Kolom Override Manual
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCurrentGridExcel}
            disabled={computedRows.length === 0}
            className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-bold text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Ekspor .xlsx
          </button>

          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
            >
              <Upload className="w-3.5 h-3.5" />
              Pusat Impor Nilai (3 Mode)
            </button>
          )}

          {dirtyStudentIds.size > 0 && (
            <button
              type="button"
              onClick={handleResetEdits}
              className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Batalkan Edit ({dirtyStudentIds.size})
            </button>
          )}

          {!isReadOnly && (
            <button
              type="button"
              disabled={dirtyStudentIds.size === 0 || invalidCellCount > 0}
              onClick={handleSaveDirtyRows}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition"
            >
              <Save className="w-4 h-4" />
              Simpan Perubahan ({dirtyStudentIds.size} Siswa)
            </button>
          )}
        </div>
      </div>

      {/* Modal Pusat Impor Nilai Multi-Mode */}
      {showImportModal && selectedSubject && selectedClassroom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Pusat Impor Nilai Siswa
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedSubject.name} • {selectedClassroom.name} ({selectedYear} {selectedSemester})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Tab Switcher */}
            <div className="px-5 pt-3 border-b border-slate-200 bg-white flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveImportTab('excel_file')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                  activeImportTab === 'excel_file'
                    ? 'border-emerald-600 text-emerald-800 bg-emerald-50/60'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Mode 1: File Excel / CSV Tabel
              </button>
              <button
                type="button"
                onClick={() => setActiveImportTab('quick_text')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                  activeImportTab === 'quick_text'
                    ? 'border-emerald-600 text-emerald-800 bg-emerald-50/60'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <ClipboardPaste className="w-4 h-4" />
                Mode 2: Kotak Salin-Tempel Teks (Quick Paste)
              </button>
              <button
                type="button"
                onClick={() => setActiveImportTab('legacy_template')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                  activeImportTab === 'legacy_template'
                    ? 'border-emerald-600 text-emerald-800 bg-emerald-50/60'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                Mode 3: Template Resmi BAB (Multi-sheet)
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* TAB 1: FILE EXCEL / CSV TABEL */}
              {activeImportTab === 'excel_file' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Petunjuk Mode 1:</strong> Unggah file spreadsheet (<strong>.xlsx</strong>, <strong>.xls</strong>, atau <strong>.csv</strong>) seperti file hasil tombol <em>"Ekspor .xlsx"</em> dari tabel ini atau template buatan sendiri. Sistem otomatis mencocokkan kolom Sumatif/SAS dan siswa berdasarkan <strong>NISN</strong>, <strong>NIS</strong>, atau <strong>Nama Siswa</strong>.
                    </div>
                  </div>

                  {/* Upload Box */}
                  <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center bg-slate-50 hover:bg-emerald-50/20 transition cursor-pointer flex flex-col items-center justify-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="excel-file-input"
                    />
                    <label htmlFor="excel-file-input" className="cursor-pointer flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-slate-800 text-sm">
                        {excelFileName ? `File terpilih: ${excelFileName}` : 'Klik untuk memilih file Excel / CSV'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Mendukung format .xlsx, .xls, atau .csv (Maks. 10MB)
                      </span>
                    </label>
                  </div>

                  {isParsingExcelFile && (
                    <div className="p-4 text-center text-slate-600 font-semibold">
                      Membaca dan memvalidasi lembar kerja Excel...
                    </div>
                  )}

                  {/* Parsing Results & Preview */}
                  {excelParseResult && (
                    <div className="space-y-3">
                      {/* Summary Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold">
                          ✓ {excelParseResult.matchedStudentsCount} dari {excelParseResult.totalStudentsCount} siswa cocok
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-bold">
                          {excelParseResult.mappedColumns.length} kolom nilai terdeteksi
                        </span>
                        {excelParseResult.sheetName && (
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
                            Sheet: {excelParseResult.sheetName}
                          </span>
                        )}
                      </div>

                      {/* Warnings / Errors */}
                      {excelParseResult.generalErrors.length > 0 && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
                          {excelParseResult.generalErrors.map((err, i) => (
                            <div key={i}>• {err}</div>
                          ))}
                        </div>
                      )}
                      {excelParseResult.generalWarnings.length > 0 && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                          {excelParseResult.generalWarnings.map((w, i) => (
                            <div key={i}>• {w}</div>
                          ))}
                        </div>
                      )}

                      {/* Mapped Columns Pills */}
                      {excelParseResult.mappedColumns.length > 0 && (
                        <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 space-y-1.5">
                          <span className="font-bold text-slate-700 text-[11px]">Kolom yang dipetakan:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {excelParseResult.mappedColumns.map((mc) => (
                              <span
                                key={mc.key}
                                className="px-2 py-0.5 rounded-md bg-white border border-slate-300 text-slate-800 text-[11px] font-semibold"
                              >
                                {mc.label} &larr; <span className="text-slate-500 italic">"{mc.fileHeader}"</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Preview Table */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead className="bg-slate-100 sticky top-0 text-slate-700">
                            <tr>
                              <th className="border-b px-2 py-1.5 text-center w-8">No</th>
                              <th className="border-b px-3 py-1.5 text-left">Nama Siswa</th>
                              <th className="border-b px-2 py-1.5 text-center">Status Cocok</th>
                              {excelParseResult.mappedColumns.map((mc) => (
                                <th key={mc.key} className="border-b px-2 py-1.5 text-center">
                                  {mc.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {excelParseResult.previewRows.map((pr, idx) => (
                              <tr key={pr.studentId} className="border-b hover:bg-slate-50">
                                <td className="px-2 py-1.5 text-center text-slate-500">{idx + 1}</td>
                                <td className="px-3 py-1.5 font-medium text-slate-900">{pr.studentName}</td>
                                <td className="px-2 py-1.5 text-center">
                                  {pr.matchedBy !== 'none' ? (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                                      Cocok ({pr.matchedBy.toUpperCase()})
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px]">
                                      Tidak ada di file
                                    </span>
                                  )}
                                </td>
                                {excelParseResult.mappedColumns.map((mc) => {
                                  const val =
                                    mc.key === 'sas'
                                      ? pr.importedSas
                                      : mc.key === 'manual'
                                      ? pr.importedManualFinal
                                      : pr.importedScores[mc.key];
                                  return (
                                    <td key={mc.key} className="px-2 py-1.5 text-center font-bold text-slate-800">
                                      {val !== undefined ? val : '-'}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Apply Button */}
                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={handleApplyExcelFileToGrid}
                          disabled={excelParseResult.matchedStudentsCount === 0}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
                        >
                          <Check className="w-4 h-4" />
                          Terapkan ke Tabel Nilai ({excelParseResult.matchedStudentsCount} Siswa)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: KOTAK SALIN-TEMPEL TEKS (QUICK PASTE) */}
              {activeImportTab === 'quick_text' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Petunjuk Mode 2:</strong> Salin (Copy) daftar nilai dari pesan WhatsApp, berkas Word, atau satu kolom Excel, lalu tempelkan (Paste) di kotak teks di bawah. Anda bisa memilih apakah nilai tersebut ditujukan untuk <strong>Nilai SAS</strong> atau salah satu <strong>Sumatif tertentu</strong>.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Target Kolom Nilai
                      </label>
                      <select
                        value={quickTextTargetKey}
                        onChange={(e) => setQuickTextTargetKey(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                      >
                        <option value="sas">Nilai SAS (Sumatif Akhir Semester)</option>
                        {showManualColumn && <option value="manual">Manual Override</option>}
                        {columns.map((col) => (
                          <option key={col.key} value={col.key}>
                            {col.label} {col.subLabel ? `(${col.subLabel})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Metode Pencocokan
                      </label>
                      <div className="flex items-center gap-3 mt-1.5">
                        <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                          <input
                            type="radio"
                            name="matchMode"
                            checked={quickTextMatchMode === 'order'}
                            onChange={() => setQuickTextMatchMode('order')}
                          />
                          Urutan Absen Siswa
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                          <input
                            type="radio"
                            name="matchMode"
                            checked={quickTextMatchMode === 'auto_detect'}
                            onChange={() => setQuickTextMatchMode('auto_detect')}
                          />
                          Deteksi Nama / Baris
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tempelkan Teks Nilai di Sini:
                    </label>
                    <textarea
                      rows={6}
                      value={quickTextInput}
                      onChange={(e) => setQuickTextInput(e.target.value)}
                      placeholder={
                        quickTextMatchMode === 'order'
                          ? `Contoh (satu nilai per baris sesuai urutan absen siswa):\n85\n90\n78\n82,5\n...`
                          : `Contoh (bisa nama siswa diikuti nilai):\nAisyah 85\nBudi 90\nCitra 78\n...`
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Live Quick Text Preview */}
                  {quickTextResult && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold">
                          ✓ {quickTextResult.appliedCount} nilai berhasil diekstrak
                        </span>
                        {quickTextResult.unmatchedLines.length > 0 && (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-semibold">
                            {quickTextResult.unmatchedLines.length} baris dilewati
                          </span>
                        )}
                      </div>

                      <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead className="bg-slate-100 sticky top-0 text-slate-700">
                            <tr>
                              <th className="border-b px-2 py-1 text-center w-8">No</th>
                              <th className="border-b px-3 py-1 text-left">Nama Siswa</th>
                              <th className="border-b px-2 py-1 text-center">Nilai Diekstrak</th>
                            </tr>
                          </thead>
                          <tbody>
                            {quickTextResult.previewRows.map((pr, idx) => {
                              const val =
                                quickTextTargetKey === 'sas'
                                  ? pr.importedSas
                                  : quickTextTargetKey === 'manual'
                                  ? pr.importedManualFinal
                                  : pr.importedScores[quickTextTargetKey];
                              return (
                                <tr key={pr.studentId} className="border-b hover:bg-slate-50">
                                  <td className="px-2 py-1 text-center text-slate-500">{idx + 1}</td>
                                  <td className="px-3 py-1 font-medium text-slate-900">{pr.studentName}</td>
                                  <td className="px-2 py-1 text-center font-bold text-emerald-700">
                                    {val !== undefined ? val : <span className="text-slate-400 font-normal">-</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={handleApplyQuickTextToGrid}
                          disabled={quickTextResult.appliedCount === 0}
                          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
                        >
                          <Check className="w-4 h-4" />
                          Terapkan ke Tabel Nilai ({quickTextResult.appliedCount} Siswa)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: TEMPLATE RESMI BAB */}
              {activeImportTab === 'legacy_template' && (
                <div className="space-y-3">
                  <ReportScoreExcelTab
                    schoolName={schoolName}
                    academicYear={selectedYear}
                    semester={selectedSemester}
                    subject={selectedSubject}
                    classroom={selectedClassroom}
                    students={contextStudents}
                    chapters={contextChapters}
                    scores={scores}
                    summativeAssessments={summativeAssessments}
                    weights={weights}
                    currentUser={currentUser}
                    isReadOnly={isReadOnly}
                    onConfirmImport={(p) => {
                      onConfirmExcelImport(p);
                      setShowImportModal(false);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500">
                Semua nilai yang diimpor akan masuk ke tabel lokal terlebih dahulu untuk ditinjau sebelum disimpan permanen ke server.
              </span>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-white text-slate-700 font-bold text-xs transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spreadsheet Table */}
      <div
        ref={tableContainerRef}
        className="bg-white rounded-2xl border border-slate-300 shadow-xs overflow-hidden"
      >
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-800 sticky top-0 z-20">
              <tr>
                <th className="border border-slate-300 px-2.5 py-2.5 text-center w-10 bg-slate-100 sticky left-0 z-30">
                  No
                </th>
                <th className="border border-slate-300 px-3 py-2.5 text-left min-w-[210px] bg-slate-100 sticky left-10 z-30">
                  Nama Peserta Didik
                </th>
                <th className="border border-slate-300 px-2 py-2 text-center min-w-[105px] bg-teal-50 text-teal-900">
                  Rekap Formatif
                  <div className="text-[10px] font-normal text-teal-700">
                    KKTP (0/1) &amp; Tampil
                  </div>
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="border border-slate-300 px-2 py-2 text-center min-w-[105px] bg-slate-50"
                  >
                    <div className="font-bold text-slate-900">{col.label}</div>
                    {col.subLabel && (
                      <div className="text-[10px] font-medium text-slate-500 truncate max-w-[130px] mx-auto">
                        {col.subLabel}
                      </div>
                    )}
                  </th>
                ))}
                <th className="border border-slate-300 px-2 py-2 text-center min-w-[90px] bg-indigo-50 text-indigo-900">
                  Nilai SAS
                  <div className="text-[10px] font-normal text-indigo-700">
                    Tidak Wajib
                  </div>
                </th>
                <th className="border border-slate-300 px-2.5 py-2 text-center min-w-[105px] bg-sky-50 text-sky-900">
                  Rata-rata Sumatif
                  <div className="text-[10px] font-normal text-sky-700">
                    Materi + SAS
                  </div>
                </th>
                {showManualColumn && (
                  <th className="border border-slate-300 px-2 py-2 text-center min-w-[95px] bg-amber-50 text-amber-900">
                    Manual
                    <div className="text-[10px] font-normal text-amber-700">Override</div>
                  </th>
                )}
                <th className="border border-slate-300 px-3 py-2 text-center min-w-[95px] bg-emerald-50 text-emerald-900 font-extrabold">
                  Nilai Akhir
                </th>
                <th className="border border-slate-300 px-2.5 py-2 text-center w-16 bg-emerald-50 text-emerald-900">
                  Pred
                </th>
                <th className="border border-slate-300 px-3 py-2 text-left min-w-[200px] bg-slate-100">
                  Status &amp; Rincian
                </th>
              </tr>
            </thead>
            <tbody>
              {computedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8 + columns.length + (showManualColumn ? 1 : 0)}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    Belum ada peserta didik aktif pada rombel dan mata pelajaran ini.
                  </td>
                </tr>
              ) : (
                computedRows.map((row, rowIdx) => {
                  const std = row.student;
                  const edit = editsByStudentId[std.id] || {
                    cellValues: {},
                    sasValue: '',
                    manualFinalValue: '',
                    formatifValue: ''
                  };
                  const isDirty = dirtyStudentIds.has(std.id);
                  const rowLocked =
                    isReadOnly ||
                    (row.isProtected && !(currentUser.role === 'admin' && allowAdminOverrideLocked));

                  return (
                    <tr
                      key={std.id}
                      className={
                        row.hasInvalidCells
                          ? 'bg-rose-50/70'
                          : isDirty
                          ? 'bg-amber-50/60'
                          : rowIdx % 2 === 0
                          ? 'bg-white hover:bg-slate-50/70'
                          : 'bg-slate-50/30 hover:bg-slate-50/80'
                      }
                    >
                      <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-500 font-mono sticky left-0 bg-inherit z-10">
                        {rowIdx + 1}
                      </td>
                      <td className="border border-slate-300 px-3 py-1.5 sticky left-10 bg-inherit z-10">
                        <div className="font-bold text-slate-900 leading-tight">{std.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          NISN: {std.nisn || '-'}
                        </div>
                      </td>

                      {/* Rekap Formatif (KKTP 0/1 & Tampil, tidak masuk pembobotan angka) */}
                      <td className="border border-slate-300 px-2 py-1.5 text-center bg-teal-50/20">
                        {(() => {
                          const kktpMap = row.existingScore?.formatifKktpScores || {};
                          const showMap = row.existingScore?.formatifShowScores || {};
                          const kktpKeys = Object.keys(kktpMap);
                          if (kktpKeys.length === 0) {
                            return <span className="text-[10px] text-slate-400">Belum diisi</span>;
                          }
                          const tercapai = kktpKeys.filter((k) => kktpMap[k] === 1).length;
                          const tampil = kktpKeys.filter((k) => (showMap[k] ?? 1) === 1).length;
                          return (
                            <div className="leading-tight">
                              <div className="font-bold text-[11px] text-teal-900">
                                {tercapai}/{kktpKeys.length} TP
                              </div>
                              <div className="text-[10px] text-teal-700">{tampil} tampil</div>
                            </div>
                          );
                        })()}
                      </td>

                      {columns.map((col, colIdx) => {
                        const rawVal = edit.cellValues[col.key] ?? '';
                        const check = parseNumericScoreInput(rawVal);
                        const cellColIdx = colIdx;
                        return (
                          <td key={col.key} className="border border-slate-300 p-0">
                            <input
                              type="text"
                              inputMode="decimal"
                              data-cell={`${rowIdx}:${cellColIdx}`}
                              disabled={rowLocked}
                              value={rawVal}
                              placeholder="-"
                              onChange={(e) =>
                                updateStudentCell(std.id, { kind: 'col', colKey: col.key }, e.target.value)
                              }
                              onKeyDown={(e) => handleCellKeyDown(e, rowIdx, cellColIdx)}
                              onPaste={(e) => handleCellPaste(e, rowIdx, cellColIdx)}
                              className={`w-full h-9 px-2 text-center font-semibold tabular-nums bg-transparent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 ${
                                check.error ? 'bg-rose-100 text-rose-800 ring-2 ring-inset ring-rose-500' : ''
                              }`}
                            />
                          </td>
                        );
                      })}

                      <td className="border border-slate-300 p-0 bg-indigo-50/20">
                        {(() => {
                          const sasColIdx = columns.length;
                          const sasCheck = parseNumericScoreInput(edit.sasValue);
                          return (
                            <input
                              type="text"
                              inputMode="decimal"
                              data-cell={`${rowIdx}:${sasColIdx}`}
                              disabled={rowLocked}
                              value={edit.sasValue}
                              placeholder="-"
                              onChange={(e) =>
                                updateStudentCell(std.id, { kind: 'sas' }, e.target.value)
                              }
                              onKeyDown={(e) => handleCellKeyDown(e, rowIdx, sasColIdx)}
                              onPaste={(e) => handleCellPaste(e, rowIdx, sasColIdx)}
                              className={`w-full h-9 px-2 text-center font-bold tabular-nums bg-transparent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500 ${
                                sasCheck.error ? 'bg-rose-100 text-rose-800 ring-2 ring-inset ring-rose-500' : ''
                              }`}
                            />
                          );
                        })()}
                      </td>

                      {/* Rata-rata Sumatif (Lingkup Materi + SAS) */}
                      <td className="border border-slate-300 px-2 py-1.5 text-center font-bold tabular-nums bg-sky-50/30 text-sky-900">
                        {row.sumatifAverage !== undefined ? formatScoreDecimal(row.sumatifAverage) : '--'}
                      </td>

                      {showManualColumn && (
                        <td className="border border-slate-300 p-0 bg-amber-50/20">
                          {(() => {
                            const manualColIdx = columns.length + 1;
                            const manualCheck = parseNumericScoreInput(edit.manualFinalValue);
                            return (
                              <input
                                type="text"
                                inputMode="decimal"
                                data-cell={`${rowIdx}:${manualColIdx}`}
                                disabled={rowLocked}
                                value={edit.manualFinalValue}
                                placeholder="-"
                                onChange={(e) =>
                                  updateStudentCell(std.id, { kind: 'manual' }, e.target.value)
                                }
                                onKeyDown={(e) => handleCellKeyDown(e, rowIdx, manualColIdx)}
                                onPaste={(e) => handleCellPaste(e, rowIdx, manualColIdx)}
                                className={`w-full h-9 px-2 text-center font-bold tabular-nums bg-transparent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500 disabled:bg-slate-100 disabled:text-slate-500 ${
                                  manualCheck.error ? 'bg-rose-100 text-rose-800 ring-2 ring-inset ring-rose-500' : ''
                                }`}
                              />
                            );
                          })()}
                        </td>
                      )}

                      <td className="border border-slate-300 px-2.5 py-1.5 text-center font-black text-sm tabular-nums bg-emerald-50/35 text-emerald-900">
                        {row.finalScore !== undefined ? row.finalScore : '--'}
                        {row.rawFinalScore !== undefined && row.rawFinalScore !== row.finalScore && (
                          <div className="text-[10px] font-normal text-slate-500">
                            ({formatScoreDecimal(row.rawFinalScore)})
                          </div>
                        )}
                      </td>

                      <td className="border border-slate-300 px-2 py-1.5 text-center font-bold">
                        {row.predicate ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-extrabold ${
                              row.predicate === 'A'
                                ? 'bg-emerald-100 text-emerald-800'
                                : row.predicate === 'B'
                                ? 'bg-blue-100 text-blue-800'
                                : row.predicate === 'C'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {row.predicate}
                          </span>
                        ) : (
                          '--'
                        )}
                      </td>

                      <td className="border border-slate-300 px-2.5 py-1.5 text-[11px] leading-snug">
                        {row.hasInvalidCells ? (
                          <span className="text-rose-700 font-semibold">
                            {row.invalidMessages[0]}
                          </span>
                        ) : row.isProtected ? (
                          <span className="inline-flex items-center gap-1 text-slate-700 font-semibold">
                            <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                            Terkunci / Arsip
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            {isDirty && (
                              <div className="text-amber-800 font-semibold">
                                Diubah (belum disimpan)
                              </div>
                            )}
                            {row.missingComponentNote ? (
                              <div className="text-amber-700">
                                <span className="font-bold">Belum Lengkap:</span> {row.missingComponentNote}
                              </div>
                            ) : (
                              <div className="text-emerald-700 font-bold">Lengkap</div>
                            )}
                            {row.breakdownText && (
                              <div className="text-slate-600">{row.breakdownText}</div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
