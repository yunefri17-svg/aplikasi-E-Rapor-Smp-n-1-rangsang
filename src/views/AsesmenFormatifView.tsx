import React, { useState, useMemo, useEffect } from 'react';
import {
  AssessmentPolicyConfig,
  AssessmentScore,
  AuthSessionContext,
  Classroom,
  LearningObjective,
  Student,
  Subject,
  Teacher,
  TeachingAssignment,
  User,
  AppNotification
} from '../types/erapor';
import {
  Target,
  Save,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Lock
} from 'lucide-react';
import { sortClassrooms } from '../utils/classroomSort';
import { sortSubjects } from '../utils/subjectSort';
import { sortStudentsAlphabetically } from '../utils/studentSort';
import { getAvailableAcademicYears } from '../utils/academicYear';
import { getVisibleSubjectsForUser } from '../utils/teacherAssignmentHelper';
import { filterObjectivesForContext } from '../utils/tpAnalysisAndDescription';
import { buildDeterministicScoreId } from '../utils/assessmentCalculation';
import {
  isStudentParticipatingInSubject,
  normalizeAcademicYearValue,
  normalizeSemesterValue
} from '../utils/electiveSubjectHelper';
import {
  authorizeSubjectAssessmentWrite,
  getAuthorizedSubjectClassIds
} from '../utils/authorizationGuard';

interface AsesmenFormatifViewProps {
  classrooms: Classroom[];
  subjects: Subject[];
  students: Student[];
  learningObjectives: LearningObjective[];
  scores?: AssessmentScore[];
  onSaveScores: (scores: AssessmentScore[], notification?: AppNotification) => void;
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
  students,
  learningObjectives,
  scores = [],
  onSaveScores,
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
    const existingYears = learningObjectives
      .map((tp) => tp.academicYear)
      .filter((y): y is string => Boolean(y));
    return Array.from(new Set([academicYear, ...baseYears, ...existingYears])).sort().reverse();
  }, [academicYear, learningObjectives]);

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
    const participating = selectedSubject
      ? list.filter((st) =>
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
      : list;
    return sortStudentsAlphabetically(participating);
  }, [
    students,
    selectedClassId,
    selectedSubject,
    selectedYear,
    selectedSemester,
    teachingAssignments,
    scores
  ]);

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

  const [localKktp, setLocalKktp] = useState<Record<string, Record<string, number>>>({});
  const [localShow, setLocalShow] = useState<Record<string, Record<string, number>>>({});
  const [localHighestDesc, setLocalHighestDesc] = useState<Record<string, string>>({});
  const [localLowestDesc, setLocalLowestDesc] = useState<Record<string, string>>({});

  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const kktpMap: Record<string, Record<string, number>> = {};
    const showMap: Record<string, Record<string, number>> = {};
    const highMap: Record<string, string> = {};
    const lowMap: Record<string, string> = {};

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
      kktpMap[std.id] = existing?.formatifKktpScores ? { ...existing.formatifKktpScores } : {};
      showMap[std.id] = existing?.formatifShowScores ? { ...existing.formatifShowScores } : {};
      highMap[std.id] = existing?.highestCompetenceDesc || '';
      lowMap[std.id] = existing?.lowestCompetenceDesc || '';
    });

    setLocalKktp(kktpMap);
    setLocalShow(showMap);
    setLocalHighestDesc(highMap);
    setLocalLowestDesc(lowMap);
  }, [classStudents, scores, selectedSubjectId, selectedYear, selectedSemester]);

  const handleCellChange = (studentId: string, tpId: string, field: 'kktp' | 'show', val: number) => {
    if (!writeAuth.allowed) return;
    if (field === 'kktp') {
      setLocalKktp((prev) => ({
        ...prev,
        [studentId]: {
          ...(prev[studentId] || {}),
          [tpId]: val
        }
      }));
    } else {
      setLocalShow((prev) => ({
        ...prev,
        [studentId]: {
          ...(prev[studentId] || {}),
          [tpId]: val
        }
      }));
    }
  };

  const handleAutoGenerateDescriptions = (studentId: string) => {
    const studentKktp = localKktp[studentId] || {};
    const studentShow = localShow[studentId] || {};

    const achievedTpTexts: string[] = [];
    const needImprovementTpTexts: string[] = [];

    contextObjectives.forEach((tp) => {
      const isShow = (studentShow[tp.id] ?? 1) === 1;
      if (!isShow) return;
      const kktpVal = studentKktp[tp.id] ?? 1;
      if (kktpVal === 1) {
        achievedTpTexts.push(tp.description || tp.code);
      } else if (kktpVal === 0) {
        needImprovementTpTexts.push(tp.description || tp.code);
      }
    });

    const highText =
      achievedTpTexts.length > 0
        ? `Menunjukkan penguasaan yang sangat baik dalam hal ${achievedTpTexts.join('; ')}.`
        : 'Menunjukkan pencapaian kompetensi yang baik pada materi pembelajaran.';
    const lowText =
      needImprovementTpTexts.length > 0
        ? `Perlu peningkatan dalam hal ${needImprovementTpTexts.join('; ')}.`
        : 'Sudah menunjukkan ketuntasan yang optimal pada seluruh tujuan pembelajaran.';

    setLocalHighestDesc((prev) => ({ ...prev, [studentId]: highText }));
    setLocalLowestDesc((prev) => ({ ...prev, [studentId]: lowText }));

    setFeedbackBanner({
      type: 'success',
      text: 'Deskripsi capaian rapor berhasil disusun otomatis berdasarkan pilihan Tampil (ceklis) dan KKTP.'
    });
  };

  const handleSaveAll = () => {
    if (!writeAuth.allowed || !selectedSubjectId || !selectedClassId) {
      setFeedbackBanner({
        type: 'error',
        text: writeAuth.reason || 'Hak akses tulis ditolak.'
      });
      return;
    }

    setIsSaving(true);
    try {
      const targetYear = normalizeAcademicYearValue(selectedYear);
      const targetSem = normalizeSemesterValue(selectedSemester);

      const scoresToSave: AssessmentScore[] = [];
      let skippedLockedCount = 0;

      classStudents.forEach((std) => {
        const existing = scores.find(
          (sc) =>
            sc.studentId === std.id &&
            sc.subjectId === selectedSubjectId &&
            normalizeAcademicYearValue(sc.academicYear) === targetYear &&
            normalizeSemesterValue(sc.semester) === targetSem
        );

        if (existing?.status === 'TERKUNCI') {
          skippedLockedCount++;
          return;
        }

        const studentKktp: Record<string, number> = { ...(existing?.formatifKktpScores || {}) };
        const studentShow: Record<string, number> = { ...(existing?.formatifShowScores || {}) };
        contextObjectives.forEach((tp) => {
          studentKktp[tp.id] = localKktp[std.id]?.[tp.id] ?? studentKktp[tp.id] ?? 1;
          studentShow[tp.id] = localShow[std.id]?.[tp.id] ?? studentShow[tp.id] ?? 1;
        });

        const highDesc = (localHighestDesc[std.id] ?? existing?.highestCompetenceDesc ?? '').trim();
        const lowDesc = (localLowestDesc[std.id] ?? existing?.lowestCompetenceDesc ?? '').trim();
        const combinedDesc = [highDesc, lowDesc].filter(Boolean).join(' ') || existing?.finalDescription || '';

        const id = existing?.id || buildDeterministicScoreId(std.id, selectedSubjectId, selectedYear, selectedSemester);

        scoresToSave.push({
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
          formatifKktpScores: studentKktp,
          formatifShowScores: studentShow,
          sumatifMateriScores: existing?.sumatifMateriScores || {},
          sumatifAkhirSemester: existing?.sumatifAkhirSemester ?? 0,
          highestCompetenceDesc: highDesc,
          lowestCompetenceDesc: lowDesc,
          finalDescription: combinedDesc,
          descriptionStatus:
            highDesc || lowDesc
              ? 'Sudah disimpan'
              : existing?.descriptionStatus || 'Belum dibuat',
          finalScore: existing?.finalScore ?? 0,
          rawFinalScore: existing?.rawFinalScore,
          predicate: existing?.predicate ?? 'D',
          status: existing?.status || 'DALAM PROSES',
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.name,
          updatedById: currentUser.id
        } as AssessmentScore);
      });

      if (scoresToSave.length === 0) {
        setFeedbackBanner({
          type: 'warning',
          text:
            skippedLockedCount > 0
              ? `Semua nilai siswa (${skippedLockedCount}) berstatus TERKUNCI dan dilindungi.`
              : 'Tidak ada data asesmen formatif yang dapat disimpan.'
        });
        return;
      }

      onSaveScores(scoresToSave, {
        id: `notif-${Date.now()}`,
        title: 'Asesmen Formatif Disimpan',
        message: `Nilai formatif KKTP & Tampil untuk ${scoresToSave.length} siswa berhasil disimpan.`,
        createdAt: new Date().toISOString(),
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        type: 'completed'
      });

      setFeedbackBanner({
        type: skippedLockedCount > 0 ? 'warning' : 'success',
        text: `Berhasil menyimpan asesmen formatif untuk ${scoresToSave.length} siswa.${
          skippedLockedCount > 0 ? ` (${skippedLockedCount} siswa terkunci dilewati).` : ''
        }`
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
          INPUT ASESMEN FORMATIF
        </h1>
      </div>

      {/* Subject & Instructions with Checkbox Update */}
      <div className="bg-sky-100/80 rounded-xl border border-sky-200 p-4 sm:p-5 text-slate-900 shadow-xs space-y-3">
        <div className="text-center font-extrabold text-sm sm:text-base text-sky-950 uppercase">
          MATA PELAJARAN : {selectedSubject?.name || 'Pendidikan Agama dan Budi Pekerti'}
        </div>

        <div className="text-xs sm:text-sm font-semibold space-y-1 text-slate-800">
          <div className="font-bold underline mb-1">Petunjuk Pengisian :</div>
          <div>1. Rapor ini berasumsi bahwa guru telah melakukan penilaian formatif dan direkap dalam lembar tersendiri</div>
          <div>2. Pada Kolom KKTP, pilih '0' jika siswa tidak memenuhi KKTP, pilih '1' jika siswa memenuhi KKTP. Bisa juga diketikkan langsung angka 1 atau 0</div>
          <div>3. Pada Kolom Tampil/Tidak, beri <strong>ceklis (centang)</strong> jika TP tersebut ingin ditampilkan dalam deskripsi rapor, dan <strong>kosongkan (hilangkan ceklis)</strong> jika tidak ingin ditampilkan.</div>
        </div>

        {/* Example Box */}
        <div className="bg-rose-600 text-white p-2.5 rounded-lg text-xs font-semibold shadow-xs">
          <span className="font-bold underline">Contoh :</span>{' '}
          <span>Pada TP 1, siswa mencapai KKTP tapi tidak ingin ditampilkan dalam rapor. Pilih KKTP = 1, dan kotak Tampil <strong>dikosongkan (tanpa ceklis)</strong>.</span>
          <br />
          <span className="ml-14">Pada TP 2, siswa tidak mencapai KKTP tapi ingin ditampilkan dalam rapor. Pilih KKTP = 0, dan kotak Tampil <strong>diberi ceklis (dicentang)</strong>.</span>
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
          {writeAuth.allowed ? (
            <button
              type="button"
              disabled={isSaving || classStudents.length === 0 || contextObjectives.length === 0}
              onClick={handleSaveAll}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Asesmen Formatif'}</span>
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

      {/* Main Table with Checkboxes for Tampil */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-300 bg-slate-100 flex items-center justify-between">
          <div className="text-xs font-extrabold text-slate-800">
            Tabel Input Formatif — Kelas {selectedClassroom?.name || '-'} ({selectedYear} / {selectedSemester})
          </div>
          <div className="text-xs text-slate-600">
            Total Siswa: <strong>{classStudents.length}</strong> • Total TP: <strong>{contextObjectives.length}</strong>
          </div>
        </div>

        {classStudents.length === 0 || contextObjectives.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Target className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Data Siswa atau Tujuan Pembelajaran Belum Lengkap</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Pastikan kelas yang dipilih memiliki peserta didik aktif dan sudah diinput Tujuan Pembelajaran (TP) pada menu Asesmen Formatif/Kurikulum.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-[#2e7d32] text-white font-bold text-[11px] border border-slate-300">
                  <th className="py-3 px-2 w-12 text-center border border-slate-300 align-middle" rowSpan={2}>No</th>
                  <th className="py-3 px-3 w-48 border border-slate-300 align-middle" rowSpan={2}>Nama Siswa</th>
                  <th className="py-2 px-2 text-center border border-slate-300" colSpan={contextObjectives.length * 2}>
                    Tujuan Pembelajaran
                  </th>
                  <th className="py-3 px-3 w-64 border border-slate-300 align-middle text-center" rowSpan={2}>Deskripsi Capaian Tertinggi dalam Rapor</th>
                  <th className="py-3 px-3 w-64 border border-slate-300 align-middle text-center" rowSpan={2}>Deskripsi Capaian Terendah dalam Rapor</th>
                  <th className="py-3 px-2 w-24 border border-slate-300 align-middle text-center" rowSpan={2}>Aksi</th>
                </tr>
                <tr className="bg-[#388e3c] text-white font-bold text-[10px] border border-slate-300 text-center">
                  {contextObjectives.map((tp, idx) => (
                    <th key={tp.id} className="py-1.5 px-1 border border-slate-300" colSpan={2}>
                      <div>TP {idx + 1} ({tp.code})</div>
                      <div className="text-[9px] font-normal truncate max-w-[120px] mx-auto" title={tp.description}>
                        {tp.description}
                      </div>
                      <div className="grid grid-cols-2 gap-0.5 mt-1 border-t border-emerald-600 pt-0.5 text-[9px]">
                        <span className="border-r border-emerald-600" title="KKTP (0/1)">KKTP</span>
                        <span title="Ceklis jika Tampil di Rapor">Tampil</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {classStudents.map((std, idx) => {
                  const studentKktp = localKktp[std.id] || {};
                  const studentShow = localShow[std.id] || {};

                  return (
                    <tr key={std.id} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-2 text-center font-semibold text-slate-700 border border-slate-300 bg-slate-50">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900 border border-slate-300">
                        <div>{std.name}</div>
                        <div className="text-[10px] text-slate-500 font-normal">NIS: {std.nis || '-'}</div>
                      </td>
                      {contextObjectives.map((tp) => {
                        const kktpval = studentKktp[tp.id] ?? 1;
                        const showval = studentShow[tp.id] ?? 1;
                        return (
                          <React.Fragment key={tp.id}>
                            <td className="py-1 px-1 text-center border border-slate-300 w-12 bg-amber-50/40">
                              <input
                                type="number"
                                min={0}
                                max={1}
                                value={kktpval}
                                disabled={!writeAuth.allowed}
                                onChange={(e) =>
                                  handleCellChange(std.id, tp.id, 'kktp', Number(e.target.value) ? 1 : 0)
                                }
                                className="w-10 text-center py-1 rounded border border-slate-300 font-bold text-slate-900 bg-white focus:ring-1 focus:ring-teal-500 mx-auto block text-xs"
                                title="KKTP: 1 = Tercapai, 0 = Belum"
                              />
                            </td>
                            <td className="py-1 px-1 text-center border border-slate-300 w-12 bg-sky-50/40 align-middle">
                              <input
                                type="checkbox"
                                checked={showval === 1}
                                disabled={!writeAuth.allowed}
                                onChange={(e) =>
                                  handleCellChange(std.id, tp.id, 'show', e.target.checked ? 1 : 0)
                                }
                                className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 mx-auto block cursor-pointer"
                                title="Ceklis jika TP ini ingin ditampilkan dalam deskripsi rapor"
                              />
                            </td>
                          </React.Fragment>
                        );
                      })}
                      <td className="py-1.5 px-2 border border-slate-300">
                        <textarea
                          rows={2}
                          disabled={!writeAuth.allowed}
                          value={localHighestDesc[std.id] || ''}
                          onChange={(e) =>
                            setLocalHighestDesc((prev) => ({ ...prev, [std.id]: e.target.value }))
                          }
                          className="w-full p-1 rounded border border-slate-300 text-slate-900 bg-white text-[11px]"
                          placeholder="Deskripsi tertinggi..."
                        />
                      </td>
                      <td className="py-1.5 px-2 border border-slate-300">
                        <textarea
                          rows={2}
                          disabled={!writeAuth.allowed}
                          value={localLowestDesc[std.id] || ''}
                          onChange={(e) =>
                            setLocalLowestDesc((prev) => ({ ...prev, [std.id]: e.target.value }))
                          }
                          className="w-full p-1 rounded border border-slate-300 text-slate-900 bg-white text-[11px]"
                          placeholder="Deskripsi perlu peningkatan..."
                        />
                      </td>
                      <td className="py-1.5 px-2 text-center border border-slate-300">
                        <button
                          type="button"
                          disabled={!writeAuth.allowed}
                          onClick={() => handleAutoGenerateDescriptions(std.id)}
                          className="px-2 py-1 rounded bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] shadow-xs cursor-pointer"
                          title="Susun deskripsi otomatis dari KKTP & Ceklis Tampil"
                        >
                          Auto Teks
                        </button>
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
  );
};
