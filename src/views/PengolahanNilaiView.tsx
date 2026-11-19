import React, { useState, useEffect, useMemo } from 'react';
import {
  Classroom,
  Subject,
  Student,
  AssessmentScore,
  User,
  Teacher,
  TeachingAssignment,
  SchoolProfile
} from '../types/erapor';
import {
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Download,
  Loader2,
  UserCheck
} from 'lucide-react';
import { SecurityAccessDenied } from '../components/SecurityAccessDenied';
import { sortClassrooms } from '../utils/classroomSort';
import { sortStudentsAlphabetically } from '../utils/studentSort';
import { resolveTeacherForUser } from '../utils/teacherAssignmentHelper';
import {
  hasEnteredNumericScore,
  isStudentParticipatingInSubject,
  matchesAssignmentPeriod,
  normalizeAcademicYearValue,
  normalizeSemesterValue
} from '../utils/electiveSubjectHelper';
import { calculatePredicate } from '../services/storage';
import { generatePengolahanNilaiPDF } from '../services/pdfService';

interface PengolahanNilaiViewProps {
  school?: SchoolProfile;
  classrooms: Classroom[];
  subjects: Subject[];
  students: Student[];
  scores: AssessmentScore[];
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  currentUser: User;
  teachers?: Teacher[];
  teachingAssignments?: TeachingAssignment[];
}

export const PengolahanNilaiView: React.FC<PengolahanNilaiViewProps> = ({
  school,
  classrooms,
  subjects,
  students,
  scores,
  academicYear,
  semester,
  currentUser,
  teachers = [],
  teachingAssignments = []
}) => {
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'kepsek';

  // Find teacher profile for current user
  const currentTeacher = useMemo(
    () => resolveTeacherForUser(currentUser, teachers),
    [teachers, currentUser]
  );

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

  const [selectedSubject, setSelectedSubject] = useState<string>(
    visibleSubjects[0]?.id || subjects[0]?.id || 'sub-mat'
  );

  useEffect(() => {
    if (visibleSubjects.length > 0 && !visibleSubjects.some((s) => s.id === selectedSubject)) {
      setSelectedSubject(visibleSubjects[0].id);
    }
  }, [visibleSubjects, selectedSubject]);

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

    if (currentTeacher.isHomeroom && currentTeacher.homeroomClassId) {
      return sortedAll.filter((c) => c.id === currentTeacher.homeroomClassId);
    }

    return sortedAll;
  }, [isAdmin, currentTeacher, teachingAssignments, selectedSubject, classrooms]);

  const [selectedClass, setSelectedClass] = useState<string>(
    visibleClassrooms[0]?.id || classrooms[0]?.id || 'cls-vii-1'
  );

  useEffect(() => {
    if (visibleClassrooms.length > 0 && !visibleClassrooms.some((c) => c.id === selectedClass)) {
      setSelectedClass(visibleClassrooms[0].id);
    }
  }, [visibleClassrooms, selectedClass]);

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

  const subjectObj = subjects.find((s) => s.id === selectedSubject);
  const selectedClassroomObj = classrooms.find((c) => c.id === selectedClass);
  const kkm = subjectObj?.kkm || 75;

  const classStudents = useMemo(() => {
    const activeInClass = sortStudentsAlphabetically(
      students.filter((s) => s.classId === selectedClass && s.status === 'Aktif')
    );
    if (!subjectObj) return activeInClass;
    return activeInClass.filter((std) =>
      isStudentParticipatingInSubject({
        subject: subjectObj,
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
    subjectObj,
    academicYear,
    semester,
    teachingAssignments,
    scores
  ]);

  const classStudentIdSet = useMemo(() => new Set(classStudents.map((s) => s.id)), [classStudents]);

  const normYear = normalizeAcademicYearValue(academicYear);
  const normSem = normalizeSemesterValue(semester);
  const relevantScores = scores.filter(
    (sc) =>
      (sc.classId === selectedClass || classStudentIdSet.has(sc.studentId)) &&
      sc.subjectId === selectedSubject &&
      normalizeAcademicYearValue(sc.academicYear) === normYear &&
      normalizeSemesterValue(sc.semester) === normSem
  );

  const scoreMap = new Map(relevantScores.map((s) => [s.studentId, s]));

  // Resolve Subject Teacher Name & NIP for header and PDF signature
  const subjectTeacherInfo = useMemo(() => {
    const periodMatch = teachingAssignments.find(
      (ta) =>
        ta.subjectId === selectedSubject &&
        ta.classId === selectedClass &&
        matchesAssignmentPeriod(ta, academicYear, semester)
    );
    const anyTaMatch =
      periodMatch ||
      teachingAssignments.find(
        (ta) =>
          ta.subjectId === selectedSubject &&
          ta.classId === selectedClass &&
          ta.status !== 'inactive'
      );

    if (anyTaMatch) {
      const matchedTeacher =
        teachers.find((t) => t.id === anyTaMatch.teacherId) ||
        teachers.find(
          (t) =>
            t.name.trim().toLowerCase() === (anyTaMatch.teacherName || '').trim().toLowerCase()
        );
      if (matchedTeacher) {
        return { name: matchedTeacher.name, nip: matchedTeacher.nip };
      }
      if (anyTaMatch.teacherName) {
        return { name: anyTaMatch.teacherName, nip: undefined };
      }
    }

    const scoreTeacher = relevantScores.find((sc) => sc.teacherId || sc.teacherName);
    if (scoreTeacher) {
      const matched = scoreTeacher.teacherId
        ? teachers.find((t) => t.id === scoreTeacher.teacherId)
        : undefined;
      if (matched) return { name: matched.name, nip: matched.nip };
      if (scoreTeacher.teacherName) return { name: scoreTeacher.teacherName, nip: undefined };
    }

    if (currentTeacher && currentUser.role === 'guru') {
      return { name: currentTeacher.name, nip: currentTeacher.nip };
    }

    const bySubjectTaught = teachers.find((t) =>
      (t.subjectsTaught || []).includes(selectedSubject)
    );
    if (bySubjectTaught) {
      return { name: bySubjectTaught.name, nip: bySubjectTaught.nip };
    }

    return { name: currentTeacher?.name || currentUser.name || '-', nip: currentTeacher?.nip };
  }, [
    teachingAssignments,
    teachers,
    selectedSubject,
    selectedClass,
    academicYear,
    semester,
    relevantScores,
    currentTeacher,
    currentUser.name,
    currentUser.role
  ]);

  const homeroomTeacherName = useMemo(() => {
    if (!selectedClassroomObj?.homeroomTeacherId) return '-';
    return (
      teachers.find((t) => t.id === selectedClassroomObj.homeroomTeacherId)?.name || '-'
    );
  }, [selectedClassroomObj, teachers]);

  // Statistical calculations (only genuine numeric grades; exclude Formatif-only 0 placeholders)
  const numericScores = classStudents
    .map((std) => {
      const sc = scoreMap.get(std.id);
      if (!hasEnteredNumericScore(sc)) return undefined;
      return sc!.manualFinalScore ?? sc!.finalScore;
    })
    .filter((n): n is number => typeof n === 'number' && Number.isFinite(n));

  const totalEntries = numericScores.length;
  const averageScore = totalEntries > 0 ? Math.round(numericScores.reduce((a, b) => a + b, 0) / totalEntries) : 0;
  const maxScore = totalEntries > 0 ? Math.max(...numericScores) : 0;
  const minScore = totalEntries > 0 ? Math.min(...numericScores) : 0;

  const passedCount = numericScores.filter((s) => s >= kkm).length;
  const remedialCount = totalEntries - passedCount;
  const passingRate = totalEntries > 0 ? Math.round((passedCount / totalEntries) * 100) : 0;

  // Predicate distribution
  const predA = numericScores.filter((s) => s >= 90).length;
  const predB = numericScores.filter((s) => s >= 80 && s < 90).length;
  const predC = numericScores.filter((s) => s >= kkm && s < 80).length;
  const predD = numericScores.filter((s) => s < kkm).length;

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportPDF = async () => {
    if (!selectedClassroomObj || !subjectObj) return;
    setIsExportingPdf(true);
    try {
      const pdfRows = classStudents.map((std, idx) => {
        const sc = scoreMap.get(std.id);
        const hasScore = hasEnteredNumericScore(sc);
        const scoreVal = hasScore ? sc!.manualFinalScore ?? sc!.finalScore : undefined;
        const isPassed = scoreVal !== undefined ? scoreVal >= kkm : undefined;
        return {
          no: idx + 1,
          nisn: std.nisn || std.nis || '-',
          name: std.name,
          score: scoreVal,
          predicate: scoreVal !== undefined ? calculatePredicate(scoreVal, kkm) : '-',
          statusLabel:
            scoreVal === undefined
              ? 'Nilai belum diinput'
              : isPassed
              ? 'Tuntas (Mencapai KKTP)'
              : 'Belum Tuntas (Perlu Remidial)',
          isPassed
        };
      });

      await generatePengolahanNilaiPDF({
        school,
        classroom: selectedClassroomObj,
        subject: subjectObj,
        academicYear,
        semester,
        subjectTeacherName: subjectTeacherInfo.name,
        subjectTeacherNip: subjectTeacherInfo.nip,
        homeroomTeacherName,
        kkm,
        stats: {
          totalStudents: classStudents.length,
          totalEntries,
          averageScore,
          maxScore,
          minScore,
          passedCount,
          remedialCount,
          passingRate,
          predA,
          predB,
          predC,
          predD
        },
        rows: pdfRows
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            Pengolahan & Analisis Hasil Penilaian
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Analisis ketuntasan kompetensi, distribusi predikat (A, B, C, D), dan daya serap pembelajaran per mata pelajaran.
          </p>
        </div>

        <button
          onClick={handleExportPDF}
          disabled={isExportingPdf || !selectedClassroomObj || !subjectObj}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition self-start sm:self-auto"
        >
          {isExportingPdf ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {isExportingPdf ? 'Menyiapkan PDF...' : 'Unduh PDF'}
        </button>
      </div>

      {/* Selectors */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Rombel:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
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
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 font-bold bg-white text-slate-800"
            >
              {visibleSubjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Guru Mapel:</span>
            <span className="text-slate-900 font-bold">{subjectTeacherInfo.name}</span>
          </div>
          <div>
            KKTP Satuan Pendidikan: <span className="text-blue-700 font-bold">{kkm}</span>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-semibold">Rata-Rata Kelas</p>
          <p className="text-2xl font-black text-blue-700 mt-1">{averageScore}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Dari {totalEntries} nilai siswa</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-semibold">Tingkat Ketuntasan</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{passingRate}%</p>
          <p className="text-[11px] text-emerald-700 font-medium mt-0.5">{passedCount} Tuntas &bull; {remedialCount} Remedial</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-semibold">Nilai Tertinggi</p>
          <p className="text-2xl font-black text-indigo-700 mt-1">{maxScore}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Pencapaian Maksimal</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-semibold">Nilai Terendah</p>
          <p className="text-2xl font-black text-rose-600 mt-1">{minScore}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Batas Bawah Kelas</p>
        </div>
      </div>

      {/* Predicate distribution bars */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Distribusi Predikat Capaian Siswa (A, B, C, D)
        </h3>

        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
            <span className="text-xs font-bold text-blue-800">Predikat A (&ge; 90)</span>
            <p className="text-xl font-black text-blue-700 mt-1">{predA}</p>
            <span className="text-[10px] text-blue-600 font-medium">Sangat Baik</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="text-xs font-bold text-emerald-800">Predikat B (80 - 89)</span>
            <p className="text-xl font-black text-emerald-700 mt-1">{predB}</p>
            <span className="text-[10px] text-emerald-600 font-medium">Baik</span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
            <span className="text-xs font-bold text-amber-800">Predikat C ({kkm} - 79)</span>
            <p className="text-xl font-black text-amber-700 mt-1">{predC}</p>
            <span className="text-[10px] text-amber-600 font-medium">Cukup</span>
          </div>

          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
            <span className="text-xs font-bold text-rose-800">Predikat D (&lt; {kkm})</span>
            <p className="text-xl font-black text-rose-700 mt-1">{predD}</p>
            <span className="text-[10px] text-rose-600 font-medium">Perlu Bimbingan</span>
          </div>
        </div>
      </div>

      {/* Student List & Status */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">No</th>
                <th className="px-4 py-3">NISN</th>
                <th className="px-4 py-3">Nama Siswa</th>
                <th className="px-4 py-3 text-center">Nilai Akhir</th>
                <th className="px-4 py-3 text-center">Predikat</th>
                <th className="px-4 py-3">Status Ketercapaian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classStudents.map((std, idx) => {
                const sc = scoreMap.get(std.id);
                const hasScore = hasEnteredNumericScore(sc);
                const scoreVal = sc?.manualFinalScore ?? sc?.finalScore ?? 0;
                const isPassed = scoreVal >= kkm;
                const displayPred = hasScore ? calculatePredicate(scoreVal, kkm) : '-';

                return (
                  <tr key={std.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-slate-500 font-medium">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{std.nisn}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{std.name}</td>
                    <td className="px-4 py-3 text-center font-black text-sm">
                      {hasScore ? (
                        <span className={isPassed ? 'text-emerald-700' : 'text-rose-600'}>
                          {scoreVal}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-bold">
                      {hasScore ? (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                          {displayPred}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!hasScore ? (
                        <span className="text-slate-400 text-[11px]">Nilai belum diinput</span>
                      ) : isPassed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Tuntas (Mencapai KKTP)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Belum Tuntas (Perlu Remidial)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
