import React, { useState, useEffect, useMemo } from 'react';
import {
  Classroom,
  Subject,
  Student,
  LearningObjective,
  AssessmentScore,
  Curriculum,
  User,
  Teacher,
  AppNotification,
  TeachingAssignment
} from '../types/erapor';
import {
  FileSpreadsheet,
  Save,
  Check,
  Sparkles,
  ClipboardPaste,
  Calculator,
  AlertCircle,
  TrendingUp,
  Download,
  Info,
  CheckCircle2,
  Lock,
  AlertTriangle,
  UserCheck,
  BookOpen
} from 'lucide-react';
import { calculatePredicate, generateCompetenceDescriptions } from '../services/storage';
import { SecurityAccessDenied } from '../components/SecurityAccessDenied';
import { sortClassrooms } from '../utils/classroomSort';
import { sortStudentsAlphabetically } from '../utils/studentSort';

interface InputNilaiViewProps {
  classrooms: Classroom[];
  subjects: Subject[];
  students: Student[];
  learningObjectives: LearningObjective[];
  scores: AssessmentScore[];
  curricula: Curriculum[];
  teachers?: Teacher[];
  teachingAssignments?: TeachingAssignment[];
  onSaveScores: (scores: AssessmentScore[], notification?: AppNotification) => void;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  currentUser: User;
}

export const InputNilaiView: React.FC<InputNilaiViewProps> = ({
  classrooms,
  subjects,
  students,
  learningObjectives,
  scores,
  curricula,
  teachers = [],
  teachingAssignments = [],
  onSaveScores,
  academicYear,
  semester,
  currentUser
}) => {
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'kepsek';
  const isGuruMapel = currentUser.role === 'guru';

  // Find teacher profile for current user
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

  // 1. Available subjects for current user based on teaching assignments
  const visibleSubjects = useMemo(() => {
    if (isAdmin) return subjects;
    if (!currentTeacher) return subjects;

    const assignedSubIds = teachingAssignments
      .filter((ta) => ta.teacherId === currentTeacher.id && ta.status !== 'inactive')
      .map((ta) => ta.subjectId);

    const combinedIds = Array.from(new Set([...assignedSubIds, ...(currentTeacher.subjectsTaught || [])]));
    if (combinedIds.length > 0) {
      const filtered = subjects.filter((s) => combinedIds.includes(s.id));
      if (filtered.length > 0) return filtered;
    }
    return subjects;
  }, [isAdmin, currentTeacher, teachingAssignments, subjects]);

  const [selectedSubject, setSelectedSubject] = useState<string>(() => {
    try {
      const savedSubj = sessionStorage.getItem('erapor_input_selected_subject');
      if (savedSubj && visibleSubjects.some((s) => s.id === savedSubj)) return savedSubj;
    } catch {}
    return visibleSubjects[0]?.id || subjects[0]?.id || 'sub-mat';
  });

  // Sync selected subject if visibleSubjects changes
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

  // 2. Available classrooms for the selected subject based on teaching assignments
  const visibleClassrooms = useMemo(() => {
    const sortedAll = sortClassrooms(classrooms);
    if (isAdmin) return sortedAll;
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

    // Fallback: if no specific assignment exists yet but teacher has homeroom class
    if (currentTeacher.isHomeroom && currentTeacher.homeroomClassId) {
      return sortedAll.filter((c) => c.id === currentTeacher.homeroomClassId);
    }

    return sortedAll;
  }, [isAdmin, currentTeacher, teachingAssignments, selectedSubject, classrooms]);

  const [selectedClass, setSelectedClass] = useState<string>(() => {
    try {
      const savedClass = sessionStorage.getItem('erapor_input_selected_class');
      if (savedClass && visibleClassrooms.some((c) => c.id === savedClass)) return savedClass;
    } catch {}
    return visibleClassrooms[0]?.id || classrooms[0]?.id || 'cls-vii-1';
  });

  // Sync selected class when visible classrooms change
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

  // Security check: if teacher attempts to access a classroom not in their teaching assignments
  const isUnauthorized = !isAdmin && currentTeacher && visibleClassrooms.length > 0 && !visibleClassrooms.some((c) => c.id === selectedClass);
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
  const currentGrade = currentClass?.gradeLevel || '7';
  const curMerdeka = curricula.find((c) => c.id === 'cur-merdeka') || curricula[0];
  const formatifWeight = (curMerdeka?.formatifWeight || 50) / 100;
  const sumatifWeight = (curMerdeka?.sumatifWeight || 50) / 100;

  // Filter students in the selected class (sorted alphabetically A-Z)
  const classStudents = useMemo(
    () => sortStudentsAlphabetically(students.filter((s) => s.classId === selectedClass)),
    [students, selectedClass]
  );

  // Objectives for this subject & grade
  const relevantTPs = learningObjectives.filter(
    (tp) => tp.subjectId === selectedSubject && tp.gradeLevel === currentGrade
  );

  // Local state for table editing
  const [localScores, setLocalScores] = useState<Record<string, AssessmentScore>>({});

  // Sync from props when class/subject changes
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

      if (existing) {
        map[std.id] = { ...existing };
      } else {
        // Default clean state
        const defaultFormatif: Record<string, number> = {};
        const defaultSumatifMateri: Record<string, number> = {};
        relevantTPs.forEach((tp) => {
          defaultFormatif[tp.id] = 80;
          defaultSumatifMateri[tp.id] = 80;
        });

        const descs = generateCompetenceDescriptions(relevantTPs, defaultFormatif, defaultSumatifMateri);

        map[std.id] = {
          id: `sc-${std.id}-${selectedSubject}-${sanitizedYear}-${semester}`,
          studentId: std.id,
          studentName: std.name,
          subjectId: selectedSubject,
          subjectName: subjects.find((s) => s.id === selectedSubject)?.name || '',
          classId: selectedClass,
          className: currentClass?.name || '',
          teacherId: currentTeacher?.id || '',
          teacherName: currentTeacher?.name || currentUser.name,
          academicYear,
          semester,
          formatifScores: defaultFormatif,
          sumatifMateriScores: defaultSumatifMateri,
          sumatifAkhirSemester: 80,
          finalScore: 80,
          predicate: 'B',
          highestCompetenceDesc: descs.highest,
          lowestCompetenceDesc: descs.lowest,
          status: 'DALAM PROSES',
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          updatedBy: currentUser.name
        };
      }
    });

    setLocalScores(map);
  }, [selectedClass, selectedSubject, academicYear, semester, students, scores, currentTeacher]);

  // Check for revision requests from Wali Kelas
  const revisionEntry = useMemo(() => {
    return Object.values(localScores).find((s) => s.status === 'REVISI' && Boolean(s.revisionNote));
  }, [localScores]);

  // Handle cell edit with automatic recalculation of Final Score & Predicate
  const handleScoreChange = (
    studentId: string,
    type: 'formatif' | 'sumatifMateri' | 'sas',
    tpId: string | null,
    value: number
  ) => {
    const clampedVal = Math.min(100, Math.max(0, isNaN(value) ? 0 : value));
    const current = localScores[studentId];
    if (!current) return;

    let updatedFormatif = { ...current.formatifScores };
    let updatedSumatifMateri = { ...current.sumatifMateriScores };
    let updatedSAS = current.sumatifAkhirSemester;

    if (type === 'formatif' && tpId) {
      updatedFormatif[tpId] = clampedVal;
    } else if (type === 'sumatifMateri' && tpId) {
      updatedSumatifMateri[tpId] = clampedVal;
    } else if (type === 'sas') {
      updatedSAS = clampedVal;
    }

    const materiVals = Object.values(updatedSumatifMateri);
    const avgMateri = materiVals.length > 0 ? materiVals.reduce((a, b) => a + b, 0) / materiVals.length : updatedSAS;

    const finalCalculated = Math.round(avgMateri * formatifWeight + updatedSAS * sumatifWeight);
    const pred = calculatePredicate(finalCalculated, 75);

    const descs = generateCompetenceDescriptions(relevantTPs, updatedFormatif, updatedSumatifMateri);

    setLocalScores({
      ...localScores,
      [studentId]: {
        ...current,
        formatifScores: updatedFormatif,
        sumatifMateriScores: updatedSumatifMateri,
        sumatifAkhirSemester: updatedSAS,
        finalScore: finalCalculated,
        predicate: pred,
        highestCompetenceDesc: descs.highest,
        lowestCompetenceDesc: descs.lowest,
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        updatedBy: currentUser.name
      }
    });
  };

  // Generate All Competence Descriptions
  const handleAutoGenerateAllDescriptions = () => {
    const updated = { ...localScores };
    Object.keys(updated).forEach((stdId) => {
      const item = updated[stdId];
      const descs = generateCompetenceDescriptions(relevantTPs, item.formatifScores, item.sumatifMateriScores);
      updated[stdId] = {
        ...item,
        highestCompetenceDesc: descs.highest,
        lowestCompetenceDesc: descs.lowest
      };
    });
    setLocalScores(updated);
  };

  // Save All Scores & Notify Wali Kelas
  const handleSaveAll = () => {
    const activeSubj = subjects.find((s) => s.id === selectedSubject);
    const scoreArray: AssessmentScore[] = Object.values(localScores).map((sc) => ({
      ...sc,
      status: 'SELESAI', // Mark status as complete
      revisionNote: '', // Clear revision note once updated
      teacherId: currentTeacher?.id || sc.teacherId || '',
      teacherName: currentTeacher?.name || sc.teacherName || currentUser.name,
      studentName: students.find((st) => st.id === sc.studentId)?.name || sc.studentName,
      subjectName: activeSubj?.name || sc.subjectName,
      className: currentClass?.name || sc.className,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      updatedBy: currentUser.name
    }));

    // Find homeroom teacher user account for selected class
    const homeroomTeacherObj = teachers.find((t) => t.homeroomClassId === selectedClass);
    
    const notification: AppNotification = {
      id: `notif-${Date.now()}`,
      recipientUserId: homeroomTeacherObj ? `usr-${homeroomTeacherObj.id}` : '',
      recipientRole: 'walikelas',
      title: `Nilai ${activeSubj?.name || ''} Kelas ${currentClass?.name || ''} Diperbarui`,
      message: `Guru Mata Pelajaran (${currentUser.name}) telah memasukkan & menyimpan nilai ${activeSubj?.name} secara lengkap untuk Kelas ${currentClass?.name}.`,
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
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Bulk Paste from Excel handler
  const handleApplyPaste = () => {
    if (!pasteData.trim()) return;

    const lines = pasteData.trim().split('\n');
    const updated = { ...localScores };

    lines.forEach((line, idx) => {
      if (idx >= classStudents.length) return;
      const std = classStudents[idx];
      const tokens = line.split('\t').map((t) => parseFloat(t.trim())).filter((t) => !isNaN(t));

      if (tokens.length > 0) {
        const item = updated[std.id];
        if (!item) return;

        // Last token is SAS, earlier tokens are materi
        const sasVal = tokens[tokens.length - 1];
        const updatedMateri = { ...item.sumatifMateriScores };
        relevantTPs.forEach((tp, tpIdx) => {
          if (tokens[tpIdx] !== undefined) {
            updatedMateri[tp.id] = Math.min(100, Math.max(0, tokens[tpIdx]));
          }
        });

        const materiVals = Object.values(updatedMateri);
        const avgMateri = materiVals.reduce((a, b) => a + b, 0) / materiVals.length;
        const finalCalculated = Math.round(avgMateri * formatifWeight + sasVal * sumatifWeight);

        const descs = generateCompetenceDescriptions(relevantTPs, item.formatifScores, updatedMateri);

        updated[std.id] = {
          ...item,
          sumatifMateriScores: updatedMateri,
          sumatifAkhirSemester: sasVal,
          finalScore: finalCalculated,
          predicate: calculatePredicate(finalCalculated, 75),
          highestCompetenceDesc: descs.highest,
          lowestCompetenceDesc: descs.lowest
        };
      }
    });

    setLocalScores(updated);
    setIsBulkPasteOpen(false);
    setPasteData('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Entri & Pengolahan Nilai Mata Pelajaran
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Input nilai Sumatif Lingkup Materi (TP), Sumatif Akhir Semester (SAS), perhitungan otomatis nilai akhir dan predikat standar Kemendikbud.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {saveSuccess && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold animate-in fade-in">
              <Check className="w-4 h-4" />
              Nilai Berhasil Disimpan!
            </div>
          )}

          <button
            onClick={() => setIsBulkPasteOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition"
            title="Salin dan tempel kolom nilai dari spreadsheet Excel"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-blue-600" />
            Tempel dari Excel
          </button>

          <button
            onClick={handleAutoGenerateAllDescriptions}
            className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1.5 transition"
            title="Hitung ulang otomatis rumusan kalimat capaian tertinggi dan terendah"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Generate Deskripsi
          </button>

          <button
            onClick={handleSaveAll}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
          >
            <Save className="w-4 h-4" />
            Simpan Seluruh Nilai
          </button>
        </div>
      </div>

      {/* Teacher Profile & Assignment Banner */}
      {isGuruMapel && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-slate-800 text-sm">
                Guru Mata Pelajaran: {currentUser.name} {currentTeacher?.nip ? `(NIP: ${currentTeacher.nip})` : ''}
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

      {/* Revision Request Alert Banner */}
      {revisionEntry && (
        <div className="bg-amber-50 border-2 border-amber-400 p-4 rounded-xl flex items-start space-x-3 text-amber-900 shadow-md animate-pulse">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="font-bold text-sm text-amber-900">
              Permintaan Perbaikan Nilai dari Wali Kelas
            </div>
            <div className="mt-1 font-medium bg-amber-100/70 p-2.5 rounded-lg border border-amber-300 text-slate-800">
              "{revisionEntry.revisionNote}"
            </div>
            <div className="mt-1 text-slate-600">
              Silakan lakukan penyesuaian nilai atau deskripsi di bawah ini, lalu klik <span className="font-bold text-blue-700">"Simpan Seluruh Nilai"</span> untuk menyelesaikan perbaikan.
            </div>
          </div>
        </div>
      )}

      {/* Selector Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Rombel:</span>
            <select
              value={selectedClass}
              onChange={(e) => handleSelectClass(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 font-bold bg-white text-slate-800"
            >
              {visibleClassrooms.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
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
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-medium">
            Bobot: {curMerdeka.formatifWeight}% Sumatif Materi + {curMerdeka.sumatifWeight}% SAS
          </div>
          <div className="text-slate-500 font-semibold">
            {classStudents.length} Siswa Terdaftar
          </div>
        </div>
      </div>

      {/* Main Interactive Scoring Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 text-center w-10 border-r border-slate-200" rowSpan={2}>No</th>
                <th className="px-3 py-3 w-28 border-r border-slate-200" rowSpan={2}>NISN</th>
                <th className="px-3 py-3 min-w-[160px] border-r border-slate-200" rowSpan={2}>Nama Peserta Didik</th>
                
                {/* Sumatif Materi Columns */}
                <th
                  className="px-3 py-2 text-center bg-blue-50/70 text-blue-800 border-r border-slate-200"
                  colSpan={Math.max(1, relevantTPs.length)}
                >
                  Sumatif Lingkup Materi (Tujuan Pembelajaran)
                </th>

                {/* SAS Column */}
                <th className="px-3 py-3 text-center w-20 bg-indigo-50/70 text-indigo-900 border-r border-slate-200" rowSpan={2}>
                  Nilai SAS
                  <span className="block text-[10px] font-normal text-indigo-600">Akhir Sem.</span>
                </th>

                {/* NA & Predicate */}
                <th className="px-3 py-3 text-center w-16 bg-emerald-50 text-emerald-900 border-r border-slate-200" rowSpan={2}>
                  Nilai Akhir
                </th>
                <th className="px-3 py-3 text-center w-14 bg-emerald-50 text-emerald-900 border-r border-slate-200" rowSpan={2}>
                  Predikat
                </th>

                {/* Capaian Kompetensi */}
                <th className="px-3 py-3 min-w-[240px]" rowSpan={2}>
                  Ringkasan Deskripsi Capaian Kompetensi
                </th>
              </tr>
              <tr className="bg-slate-100/60 border-t border-slate-200">
                {relevantTPs.length === 0 ? (
                  <th className="px-2 py-1 text-center text-slate-400 font-normal border-r border-slate-200">
                    Belum ada TP
                  </th>
                ) : (
                  relevantTPs.map((tp) => (
                    <th
                      key={tp.id}
                      className="px-2 py-1 text-center font-mono text-[11px] border-r border-slate-200 text-blue-900"
                      title={tp.description}
                    >
                      {tp.code}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classStudents.map((std, idx) => {
                const item = localScores[std.id];
                if (!item) return null;

                return (
                  <tr key={std.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-3 py-2.5 text-center text-slate-500 font-medium border-r border-slate-100">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-600 border-r border-slate-100">
                      {std.nisn}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-slate-800 border-r border-slate-100">
                      {std.name}
                    </td>

                    {/* TP Materi inputs */}
                    {relevantTPs.length === 0 ? (
                      <td className="px-2 py-2 text-center text-slate-400 border-r border-slate-100">-</td>
                    ) : (
                      relevantTPs.map((tp) => {
                        const val = item.sumatifMateriScores[tp.id] ?? 80;
                        return (
                          <td key={tp.id} className="px-1.5 py-1.5 text-center border-r border-slate-100">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={val}
                              onChange={(e) =>
                                handleScoreChange(std.id, 'sumatifMateri', tp.id, parseInt(e.target.value) || 0)
                              }
                              className={`w-14 px-1.5 py-1 text-center rounded border font-semibold text-xs focus:ring-1 focus:ring-blue-500 ${
                                val < 75 ? 'border-rose-300 bg-rose-50/40 text-rose-700' : 'border-slate-300 bg-white'
                              }`}
                            />
                          </td>
                        );
                      })
                    )}

                    {/* SAS Input */}
                    <td className="px-1.5 py-1.5 text-center border-r border-slate-100 bg-indigo-50/20">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={item.sumatifAkhirSemester}
                        onChange={(e) =>
                          handleScoreChange(std.id, 'sas', null, parseInt(e.target.value) || 0)
                        }
                        className="w-14 px-1.5 py-1 text-center rounded border border-indigo-300 font-bold text-xs text-indigo-900 bg-white focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>

                    {/* Final Score */}
                    <td className="px-2 py-2 text-center font-black text-sm text-slate-800 border-r border-slate-100 bg-emerald-50/30">
                      <span className={item.finalScore < 75 ? 'text-rose-600' : 'text-emerald-700'}>
                        {item.finalScore}
                      </span>
                    </td>

                    {/* Predicate */}
                    <td className="px-2 py-2 text-center font-bold text-xs border-r border-slate-100 bg-emerald-50/30">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          item.predicate === 'A'
                            ? 'bg-blue-100 text-blue-800'
                            : item.predicate === 'B'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.predicate === 'C'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.predicate}
                      </span>
                    </td>

                    {/* Competence Description */}
                    <td className="px-3 py-2 text-[11px] text-slate-600">
                      <div className="line-clamp-2" title={`${item.highestCompetenceDesc} ${item.lowestCompetenceDesc}`}>
                        <strong className="text-emerald-700 font-semibold">Capaian: </strong>
                        {item.highestCompetenceDesc}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Paste Modal */}
      {isBulkPasteOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-blue-600" />
                Salin & Tempel Nilai dari Excel
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Salin rentang kolom nilai dari spreadsheet Excel Anda (misal nilai TP1, TP2, TP3, dan SAS) lalu tempelkan ke kotak di bawah.
              Sistem akan memetakan baris per baris secara berurutan sesuai daftar siswa.
            </p>

            <textarea
              rows={8}
              value={pasteData}
              onChange={(e) => setPasteData(e.target.value)}
              placeholder="Contoh format paste:&#10;85	88	82	85&#10;90	92	88	90&#10;78	80	76	80"
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
    </div>
  );
};
