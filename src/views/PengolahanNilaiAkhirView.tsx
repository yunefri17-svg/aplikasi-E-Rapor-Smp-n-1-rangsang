import React, { useState, useMemo, useEffect } from 'react';
import {
  AssessmentPolicyConfig,
  AssessmentScore,
  Classroom,
  FinalScoreMethod,
  FormativeAssessment,
  KKTPConfig,
  LearningChapter,
  LearningObjective,
  Student,
  Subject,
  SubjectFinalScoreConfig,
  SummativeAssessment,
  Teacher,
  TeachingAssignment,
  User,
  Curriculum
} from '../types/erapor';
import { ReportScoreExcelTab } from '../components/assessment/ReportScoreExcelTab';
import {
  resolveSchoolWeights,
  filterChaptersForContext,
  computeStudentReportScore,
  getEffectiveSasScore,
  aggregateChapterScoresFromSummatives,
  buildDeterministicScoreId
} from '../utils/assessmentCalculation';
import {
  Calculator,
  TrendingUp,
  CheckCircle2,
  Save,
  Info,
  Settings,
  Lock,
  ArrowRight,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { getAccessibleClassrooms, getAccessibleStudents, calculatePredicate } from '../services/storage';
import { SubjectDescriptionBank } from '../utils/descriptionBank';
import {
  analyzeStudentTPAttainment,
  composeAutomaticCompetenceDescription,
  filterObjectivesForContext,
  getSummativeTpIds,
  isPeriodInputLocked
} from '../utils/tpAnalysisAndDescription';
import { getVisibleSubjectsForUser } from '../utils/teacherAssignmentHelper';
import { sortClassrooms } from '../utils/classroomSort';
import { normalizeAcademicYearValue, normalizeSemesterValue } from '../utils/electiveSubjectHelper';

interface PengolahanNilaiAkhirViewProps {
  classrooms: Classroom[];
  students: Student[];
  subjects: Subject[];
  learningObjectives: LearningObjective[];
  learningChapters?: LearningChapter[];
  curricula?: Curriculum[];
  formativeAssessments?: FormativeAssessment[];
  summativeAssessments: SummativeAssessment[];
  kktpConfigs: KKTPConfig[];
  finalScoreConfigs: SubjectFinalScoreConfig[];
  scores: AssessmentScore[];
  descriptionBank?: SubjectDescriptionBank[];
  assessmentPolicy?: AssessmentPolicyConfig;
  onSaveScores: (scores: AssessmentScore[]) => void;
  onConfirmExcelImport?: (payload: {
    scoresToSave: AssessmentScore[];
    summativesToSave: SummativeAssessment[];
    notificationMessage: string;
  }) => void;
  onSaveConfig: (config: SubjectFinalScoreConfig) => void;
  onNavigateToDescriptions?: () => void;
  currentUser: User;
  teachingAssignments: TeachingAssignment[];
  teachers?: Teacher[];
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
}

export const PengolahanNilaiAkhirView: React.FC<PengolahanNilaiAkhirViewProps> = ({
  classrooms,
  students,
  subjects,
  learningObjectives,
  learningChapters = [],
  curricula = [],
  formativeAssessments = [],
  summativeAssessments,
  kktpConfigs,
  finalScoreConfigs,
  scores,
  descriptionBank,
  assessmentPolicy,
  onSaveScores,
  onConfirmExcelImport,
  onSaveConfig,
  onNavigateToDescriptions,
  currentUser,
  teachingAssignments,
  teachers = [],
  academicYear,
  semester
}) => {
  const isWaliKelasReadOnly = currentUser.role === 'walikelas';
  const isLocked =
    currentUser.role !== 'admin' && isPeriodInputLocked(assessmentPolicy, academicYear, semester);
  const isReadOnly = isLocked || isWaliKelasReadOnly;

  const [activeTab, setActiveTab] = useState<'calc' | 'excel'>('calc');

  // 1. Visible Classrooms & Subjects
  const visibleClassrooms = useMemo(
    () => sortClassrooms(getAccessibleClassrooms(currentUser, classrooms)),
    [currentUser, classrooms]
  );
  const visibleSubjects = useMemo(() => {
    return getVisibleSubjectsForUser({
      currentUser,
      subjects,
      teachingAssignments,
      teachers,
      includeAllForWaliKelas: true
    });
  }, [subjects, teachingAssignments, teachers, currentUser]);

  // 2. Selection State
  const [selectedClassId, setSelectedClassId] = useState(visibleClassrooms[0]?.id || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState(visibleSubjects[0]?.id || '');
  const [showConfig, setShowConfig] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (visibleClassrooms.length > 0 && !visibleClassrooms.some((c) => c.id === selectedClassId)) {
      setSelectedClassId(visibleClassrooms[0].id);
    }
  }, [visibleClassrooms, selectedClassId]);

  useEffect(() => {
    if (visibleSubjects.length > 0 && !visibleSubjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId(visibleSubjects[0].id);
    } else if (visibleSubjects.length === 0 && selectedSubjectId !== '') {
      setSelectedSubjectId('');
    }
  }, [visibleSubjects, selectedSubjectId]);

  const selectedClassroom = useMemo(
    () => classrooms.find((c) => c.id === selectedClassId),
    [classrooms, selectedClassId]
  );

  const filteredStudents = useMemo(() => {
    return getAccessibleStudents(currentUser, students, selectedClassId);
  }, [currentUser, students, selectedClassId]);

  const relevantObjectives = useMemo(() => {
    return filterObjectivesForContext(learningObjectives, {
      subjectId: selectedSubjectId,
      gradeLevel: selectedClassroom?.gradeLevel,
      semester,
      academicYear
    });
  }, [learningObjectives, selectedSubjectId, selectedClassroom?.gradeLevel, semester, academicYear]);

  const currentConfig = useMemo(() => {
    return (
      finalScoreConfigs.find((c) => c.subjectId === selectedSubjectId && c.classId === selectedClassId) || {
        subjectId: selectedSubjectId,
        classId: selectedClassId,
        method: 'rata-rata' as FinalScoreMethod,
        sasWeight: 0
      }
    );
  }, [finalScoreConfigs, selectedSubjectId, selectedClassId]);

  const contextChapters = useMemo(() => {
    return filterChaptersForContext(learningChapters || [], {
      subjectId: selectedSubjectId,
      classId: selectedClassId,
      academicYear,
      semester
    });
  }, [learningChapters, selectedSubjectId, selectedClassId, academicYear, semester]);

  // 3. Calculation Logic (preserving school formulas + multi-TP / chapter Lingkup Materi + automated TP description)
  const computedData = useMemo(() => {
    const subj = subjects.find((s) => s.id === selectedSubjectId);
    const targetNormYear = normalizeAcademicYearValue(academicYear);
    const targetNormSem = normalizeSemesterValue(semester);
    const weights = resolveSchoolWeights(curricula);
    const passingCriteria = subj?.kkm || weights.passingCriteria;

    return filteredStudents.map((std) => {
      const existing = scores.find(
        (s) =>
          s.studentId === std.id &&
          s.subjectId === selectedSubjectId &&
          (s.classId === selectedClassId || !s.classId) &&
          normalizeAcademicYearValue(s.academicYear) === targetNormYear &&
          normalizeSemesterValue(s.semester) === targetNormSem
      );

      const studentSummative = summativeAssessments.filter(
        (a) =>
          a.studentId === std.id &&
          a.subjectId === selectedSubjectId &&
          normalizeAcademicYearValue(a.academicYear) === targetNormYear &&
          normalizeSemesterValue(a.semester) === targetNormSem
      );

      // Group scores by all linked TPs
      const tpScores: Record<string, number[]> = {};
      studentSummative.forEach((a) => {
        getSummativeTpIds(a).forEach((tpId) => {
          if (!tpScores[tpId]) tpScores[tpId] = [];
          tpScores[tpId].push(a.score);
        });
      });

      // Calculate average per TP (never coerce missing to 0)
      const tpAverages: Record<string, number> = {};
      relevantObjectives.forEach((tp) => {
        const vals = tpScores[tp.id] || [];
        if (vals.length > 0) {
          tpAverages[tp.id] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
        } else if (typeof existing?.sumatifMateriScores?.[tp.id] === 'number') {
          tpAverages[tp.id] = existing.sumatifMateriScores[tp.id];
        }
      });

      const chapterScores =
        contextChapters.length > 0
          ? aggregateChapterScoresFromSummatives({
              studentId: std.id,
              subjectId: selectedSubjectId,
              classId: selectedClassId,
              academicYear,
              semester,
              chapters: contextChapters,
              summativeAssessments,
              existingChapterScores: existing?.chapterScores
            })
          : existing?.chapterScores || {};

      const hasTpScores = Object.keys(tpAverages).length > 0;
      const hasChapterScores = Object.keys(chapterScores).length > 0;
      const useChapters = contextChapters.length > 0 && (hasChapterScores || !hasTpScores);

      const effectiveChapters: LearningChapter[] = useChapters
        ? contextChapters
        : (relevantObjectives.map((tp, idx) => ({
            id: tp.id,
            code: tp.code || `TP ${idx + 1}`,
            orderIndex: idx + 1,
            title: tp.materi || tp.description,
            subjectId: selectedSubjectId,
            classId: selectedClassId,
            gradeLevel: selectedClassroom?.gradeLevel || '7',
            teacherId: '',
            academicYear,
            semester,
            createdAt: '',
            updatedAt: ''
          })) as LearningChapter[]);

      const sasVal = getEffectiveSasScore(existing);
      const calcResult = computeStudentReportScore({
        chapters: effectiveChapters,
        chapterScores: useChapters ? chapterScores : tpAverages,
        sasScore: sasVal,
        formatifScores: existing?.formatifScores,
        manualFinalScore: existing?.manualFinalScore,
        passingCriteria,
        legacyMateriScores: useChapters ? chapterScores : tpAverages
      });

      const effectiveFinalScore = calcResult.finalScore;

      const analysis = analyzeStudentTPAttainment({
        studentId: std.id,
        subjectId: selectedSubjectId,
        classId: selectedClassId,
        gradeLevel: selectedClassroom?.gradeLevel,
        academicYear,
        semester,
        learningObjectives,
        formativeAssessments,
        summativeAssessments,
        existingScore: existing
          ? {
              ...existing,
              chapterScores,
              sumatifMateriScores: { ...(existing.sumatifMateriScores || {}), ...chapterScores, ...tpAverages }
            }
          : Object.keys(tpAverages).length > 0 || Object.keys(chapterScores).length > 0
          ? ({
              chapterScores,
              sumatifMateriScores: { ...chapterScores, ...tpAverages },
              formatifScores: {}
            } as AssessmentScore)
          : undefined,
        kktpConfigs,
        policy: assessmentPolicy
      });

      const composed = composeAutomaticCompetenceDescription({
        student: std,
        subject: subj,
        subjectId: selectedSubjectId,
        classroom: selectedClassroom,
        academicYear,
        semester,
        finalScore: effectiveFinalScore,
        analysis,
        descriptionBank,
        policy: assessmentPolicy
      });

      return {
        student: std,
        existing,
        tpAverages,
        chapterScores,
        calcResult,
        hasAnyScore:
          Object.keys(tpAverages).length > 0 ||
          Object.keys(chapterScores).length > 0 ||
          sasVal !== undefined ||
          existing?.manualFinalScore !== undefined ||
          Boolean(existing),
        finalScore: effectiveFinalScore,
        analysis,
        composed,
        predicate: effectiveFinalScore !== undefined ? calculatePredicate(effectiveFinalScore, passingCriteria) : undefined
      };
    });
  }, [
    filteredStudents,
    subjects,
    curricula,
    selectedSubjectId,
    selectedClassId,
    selectedClassroom,
    academicYear,
    semester,
    scores,
    summativeAssessments,
    relevantObjectives,
    contextChapters,
    currentConfig,
    learningObjectives,
    formativeAssessments,
    kktpConfigs,
    assessmentPolicy,
    descriptionBank
  ]);

  const executeSaveAll = () => {
    if (isReadOnly) return;
    const nowIso = new Date().toISOString();

    const newScores: AssessmentScore[] = computedData
      .filter((item) => item.hasAnyScore)
      .map((item) => {
        const existing = item.existing;
        const isProtected =
          existing &&
          (existing.descriptionStatus === 'Sudah diedit guru' ||
            existing.descriptionStatus === 'Sudah disimpan' ||
            existing.descriptionStatus === 'Sudah difinalisasi');
        const keepExistingDesc = Boolean(
          existing &&
            (isProtected ||
              Boolean((existing.finalDescription || existing.highestCompetenceDesc || '').trim()))
        );

        const nextHighest = keepExistingDesc ? existing!.highestCompetenceDesc : '';
        const nextLowest = keepExistingDesc ? existing!.lowestCompetenceDesc : '';
        const nextGenDesc = keepExistingDesc
          ? existing!.generatedDescription || existing!.finalDescription || ''
          : '';
        const nextFinalDesc = keepExistingDesc
          ? existing!.finalDescription || nextGenDesc
          : '';
        const nextDescStatus = keepExistingDesc
          ? existing!.descriptionStatus
          : ('Belum dibuat' as const);

        const resolvedFinal =
          existing?.manualFinalScore !== undefined
            ? existing.manualFinalScore
            : item.finalScore ?? existing?.finalScore ?? 0;

        return {
          ...(existing || {}),
          id: existing?.id || buildDeterministicScoreId(item.student.id, selectedSubjectId, academicYear, semester),
          studentId: item.student.id,
          studentName: item.student.name,
          subjectId: selectedSubjectId,
          subjectName: subjects.find((s) => s.id === selectedSubjectId)?.name || '',
          classId: selectedClassId,
          className: selectedClassroom?.name || '',
          academicYear,
          semester,
          formatifScores: existing?.formatifScores || {},
          chapterScores: item.chapterScores,
          sumatifMateriScores: {
            ...(existing?.sumatifMateriScores || {}),
            ...item.chapterScores,
            ...item.tpAverages
          },
          sumatifAkhirSemester: existing?.sumatifAkhirSemester || 0,
          hasSasScore: getEffectiveSasScore(existing) !== undefined,
          babAverage: item.calcResult.babAverage,
          sumatifAverage: item.calcResult.sumatifAverage,
          rawFinalScore: item.calcResult.rawFinalScore,
          finalScoreBreakdown: item.calcResult.breakdownText,
          completenessStatus: item.calcResult.completenessStatus,
          hasMissingComponents: item.calcResult.hasMissingComponents,
          missingComponentNote: item.calcResult.missingComponentNote,
          finalScore: resolvedFinal,
          predicate: item.predicate || calculatePredicate(resolvedFinal),
          selectedOptimalTpIds: existing?.selectedOptimalTpIds || [],
          selectedImprovementTpIds: existing?.selectedImprovementTpIds || [],
          highestCompetenceDesc: nextHighest,
          lowestCompetenceDesc: nextLowest,
          learningObjectiveIds: item.analysis.matchedTpIds,
          formativeAssessmentIds: item.analysis.matchedFormativeIds,
          summativeAssessmentIds: item.analysis.matchedSummativeIds,
          achievedObjectives: existing?.achievedObjectives || [],
          objectivesForImprovement: existing?.objectivesForImprovement || [],
          tpAnalysis: item.analysis.tpSummaries,
          generatedDescription: nextGenDesc,
          finalDescription: nextFinalDesc,
          descriptionStatus: nextDescStatus,
          completenessWarning: keepExistingDesc
            ? existing?.completenessWarning
            : 'Silakan periksa dan centang checklist TP Optimal / Perlu Pendampingan di menu Deskripsi / Input Nilai.',
          updatedAt: nowIso,
          updatedBy: currentUser.name,
          updatedById: currentUser.id,
          status: existing?.status === 'TERKUNCI' ? 'TERKUNCI' : 'SELESAI'
        };
      });

    if (newScores.length > 0) {
      onSaveScores(newScores);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleSaveAllClick = () => {
    if (isReadOnly) return;
    executeSaveAll();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-600" />
            Pengolahan Nilai Akhir
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kalkulasi nilai akhir rapor berdasarkan asesmen sumatif, serta analisis ketercapaian TP formatif-sumatif untuk sinkronisasi deskripsi rapor.
          </p>
        </div>

        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('calc')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'calc' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" /> Kalkulasi Nilai
          </button>
          <button
            onClick={() => setActiveTab('excel')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'excel' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Pengisian Nilai (Excel)
          </button>
        </div>
      </div>

      {activeTab === 'excel' ? (
        <ReportScoreExcelTab
          schoolName={'SMP Negeri 1 Rangsang'}
          academicYear={academicYear}
          semester={semester}
          subject={subjects.find((s) => s.id === selectedSubjectId) || subjects[0]}
          classroom={selectedClassroom || classrooms[0]}
          students={filteredStudents}
          chapters={filterChaptersForContext(learningChapters || [], {
            subjectId: selectedSubjectId,
            classId: selectedClassId,
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
      ) : (
        <>
          {isLocked && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Periode Terkunci ({academicYear} {semester}):</strong> Perubahan metode atau posting nilai dikunci sementara oleh Administrator.
              </span>
            </div>
          )}

      {/* Filter & Config Bar */}
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Rombel</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 outline-none bg-white"
            >
              {visibleClassrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1 text-indigo-600">
              Mata Pelajaran
            </label>
            {visibleSubjects.length === 0 ? (
              <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-700">
                <Info className="w-3.5 h-3.5" />
                <span>
                  Anda belum memiliki penugasan mengajar aktif di menu <strong>9. Penugasan Guru Mengajar</strong>.
                </span>
              </div>
            ) : (
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 outline-none bg-white font-bold"
              >
                {visibleSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {showConfig && !isReadOnly && (
          <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white rounded-lg text-indigo-600 shadow-sm">
                <Settings className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-indigo-900 font-display">Konfigurasi Pengolahan Nilai</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-[11px] font-bold text-indigo-700 uppercase mb-2">Metode Kalkulasi</label>
                <div className="space-y-2">
                  {(['rata-rata', 'pembobotan', 'persentase-tp'] as FinalScoreMethod[]).map((m) => (
                    <label
                      key={m}
                      className="flex items-center gap-2 p-2 rounded-lg bg-white/50 border border-indigo-200 cursor-pointer hover:bg-white transition"
                    >
                      <input
                        type="radio"
                        name="method"
                        checked={currentConfig.method === m}
                        onChange={() => onSaveConfig({ ...currentConfig, method: m })}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-medium text-slate-700 capitalize">{m.replace('-', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                {currentConfig.method === 'pembobotan' ? (
                  <div className="p-4 bg-white/60 rounded-xl border border-indigo-200">
                    <h4 className="text-[11px] font-bold text-indigo-800 uppercase mb-3">
                      Atur Bobot Per Tujuan Pembelajaran
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {relevantObjectives.map((tp) => (
                        <div key={tp.id} className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500 w-16">{tp.code}:</span>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={currentConfig.tpWeights?.[tp.id] || 1}
                            onChange={(e) => {
                              const weights = { ...(currentConfig.tpWeights || {}) };
                              weights[tp.id] = parseInt(e.target.value) || 1;
                              onSaveConfig({ ...currentConfig, tpWeights: weights });
                            }}
                            className="w-16 px-2 py-1 text-xs rounded border border-slate-300 outline-none focus:border-indigo-500"
                          />
                          <span className="text-[9px] text-slate-400 truncate">{tp.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-white/40 rounded-xl border border-indigo-200">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-indigo-500 shrink-0" />
                      <div className="text-[11px] text-indigo-800 leading-relaxed">
                        <span className="font-bold block mb-1">Keterangan Metode Resmi:</span>
                        <ul className="list-disc ml-4 space-y-1">
                          <li>
                            <strong>Rata-rata:</strong> Nilai akhir dihitung dari rerata sumatif TP yang sudah memiliki nilai (data kosong tidak dianggap nol).
                          </li>
                          <li>
                            <strong>Pembobotan:</strong> Guru mengatur bobot tiap TP secara proporsional.
                          </li>
                          <li>
                            <strong>Asesmen Formatif:</strong> Digunakan untuk bukti ketercapaian TP dan penyusunan deskripsi rapor tanpa mengubah bobot nilai angka kecuali disetujui sekolah.
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Calculation Table */}
      {(() => {
        const anyTpScores = computedData.some((item) => Object.keys(item.tpAverages).length > 0);
        const anyChapScores = computedData.some((item) => Object.keys(item.chapterScores).length > 0);
        const useChapCols = contextChapters.length > 0 && (anyChapScores || !anyTpScores);
        const displayCols = useChapCols
          ? contextChapters.map((ch) => ({ id: ch.id, code: ch.code, label: 'Lingkup Materi' }))
          : relevantObjectives.map((tp) => ({ id: tp.id, code: tp.code, label: 'Sumatif TP' }));

        return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="px-4 py-3 text-[10px] font-bold w-10 text-center">NO</th>
                <th className="px-4 py-3 text-[10px] font-bold min-w-[180px]">NAMA SISWA</th>
                {displayCols.map((col) => (
                  <th key={col.id} className="px-3 py-3 text-[10px] font-bold text-center border-l border-slate-100">
                    <div className="flex flex-col items-center">
                      <span className="text-blue-600">{col.code}</span>
                      <span className="text-[9px] text-slate-400 font-normal">{col.label}</span>
                    </div>
                  </th>
                ))}
                <th className="px-3 py-3 text-[10px] font-bold text-center border-l border-slate-100 bg-indigo-50/30">
                  <div className="flex flex-col items-center">
                    <span className="text-indigo-700">SAS</span>
                    <span className="text-[9px] text-slate-400 font-normal">Opsional</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-center bg-indigo-50/50 border-l border-slate-200">
                  NILAI AKHIR
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-center bg-indigo-50/50">PREDIKAT</th>
                <th className="px-4 py-3 text-[10px] font-bold border-l border-slate-200 min-w-[220px]">
                  RINGKASAN KETERCAPAIAN TP
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {computedData.map((item, idx) => (
                <tr key={item.student.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 text-center text-xs font-medium text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800 text-xs uppercase">{item.student.name}</div>
                    <div className="text-[9px] text-slate-400 font-mono">NISN: {item.student.nisn}</div>
                  </td>
                  {displayCols.map((col) => {
                    const avg = useChapCols
                      ? item.chapterScores[col.id]
                      : item.tpAverages[col.id];
                    return (
                      <td key={col.id} className="px-3 py-3 text-center border-l border-slate-50">
                        {avg !== undefined ? (
                          <div className="text-xs font-bold text-slate-700">{avg}</div>
                        ) : (
                          <div className="text-[10px] text-slate-300 italic">Kosong</div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-center border-l border-slate-50 bg-indigo-50/10">
                    {item.calcResult.sasScore !== undefined ? (
                      <div className="text-xs font-bold text-indigo-700">{item.calcResult.sasScore}</div>
                    ) : (
                      <div className="text-[10px] text-slate-300 italic">-</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center bg-indigo-50/20 border-l border-slate-100">
                    {item.finalScore !== undefined ? (
                      <div className="text-sm font-black text-indigo-700">{item.finalScore}</div>
                    ) : (
                      <div className="text-[10px] text-slate-400 italic">Belum dinilai</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center bg-indigo-50/20">
                    {item.predicate ? (
                      <span
                        className={`inline-block w-8 py-1 rounded-lg text-[11px] font-black ${
                          item.predicate === 'A'
                            ? 'bg-emerald-100 text-emerald-700'
                            : item.predicate === 'B'
                            ? 'bg-blue-100 text-blue-700'
                            : item.predicate === 'C'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {item.predicate}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 border-l border-slate-100 text-[11px] space-y-1">
                    <div className="flex flex-wrap gap-1">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-[10px]">
                        Optimal: {item.analysis.optimalTPs.length}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[10px]">
                        Baik: {item.analysis.goodTPs.length}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold text-[10px]">
                        Penguatan: {item.analysis.improvementTPs.length}
                      </span>
                    </div>
                    {item.composed.canGenerate ? (
                      <p className="text-slate-600 line-clamp-2">{item.composed.generatedDescription}</p>
                    ) : (
                      <p className="text-amber-700 italic">Bukti TP belum lengkap untuk deskripsi.</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        );
      })()}

      {/* Action Footer */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-slate-800 rounded-2xl shadow-xl border border-slate-700">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-white font-bold text-sm">Siap Posting Nilai ke Rapor?</h4>
            <p className="text-slate-400 text-[11px] leading-relaxed max-w-lg">
              Nilai dihitung sesuai kebijakan sekolah dari Asesmen Sumatif, sekaligus menganalisis ketercapaian TP formatif-sumatif untuk menyusun draft deskripsi rapor tanpa menimpa deskripsi yang sudah Anda edit manual.
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveAllClick}
          disabled={isReadOnly || saveSuccess || computedData.filter((i) => i.hasAnyScore).length === 0}
          className={`w-full md:w-auto px-10 py-4 rounded-xl font-black text-sm flex items-center justify-center gap-3 transition-all shadow-2xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
            saveSuccess
              ? 'bg-emerald-500 text-white'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/20'
          }`}
        >
          {saveSuccess ? (
            <>
              <CheckCircle2 className="w-5 h-5" /> Berhasil Diposting
            </>
          ) : (
            <>
              <Save className="w-5 h-5" /> Posting Nilai ke Rapor
            </>
          )}
        </button>
      </div>
        </>
      )}
    </div>
  );
};
