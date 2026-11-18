import React, { useState, useMemo, useEffect } from 'react';
import {
  AssessmentPolicyConfig,
  Classroom,
  LearningChapter,
  LearningObjective,
  Student,
  Subject,
  SummativeAssessment,
  SummativeTechnique,
  Teacher,
  TeachingAssignment,
  User
} from '../types/erapor';
import {
  Trophy,
  Plus,
  Save,
  Check,
  History,
  Search,
  Info,
  Trash2,
  Lock,
  Edit3,
  Layers,
  X,
  Copy,
  BookOpen
} from 'lucide-react';
import { getAccessibleClassrooms, getAccessibleStudents } from '../services/storage';
import {
  filterObjectivesForContext,
  getSummativeTpIds,
  isPeriodInputLocked
} from '../utils/tpAnalysisAndDescription';
import { getVisibleSubjectsForUser } from '../utils/teacherAssignmentHelper';
import { sortClassrooms } from '../utils/classroomSort';
import {
  buildDeterministicChapterSummativeId,
  buildLearningChapterId,
  filterChaptersForContext,
  getNextChapterOrderAndCode
} from '../utils/assessmentCalculation';

interface AsesmenSumatifViewProps {
  classrooms: Classroom[];
  students: Student[];
  subjects: Subject[];
  learningObjectives: LearningObjective[];
  learningChapters?: LearningChapter[];
  summativeAssessments: SummativeAssessment[];
  onSaveAssessment: (assessment: SummativeAssessment) => void;
  onSaveAssessmentsBatch?: (assessments: SummativeAssessment[]) => void;
  onDeleteAssessment: (id: string) => void;
  onSaveLearningChapter?: (chapter: LearningChapter) => void;
  onDeleteLearningChapter?: (chapterId: string) => void;
  currentUser: User;
  teachingAssignments: TeachingAssignment[];
  teachers?: Teacher[];
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  assessmentPolicy?: AssessmentPolicyConfig;
}

export const AsesmenSumatifView: React.FC<AsesmenSumatifViewProps> = ({
  classrooms,
  students,
  subjects,
  learningObjectives,
  learningChapters = [],
  summativeAssessments,
  onSaveAssessment,
  onSaveAssessmentsBatch,
  onDeleteAssessment,
  onSaveLearningChapter,
  onDeleteLearningChapter,
  currentUser,
  teachingAssignments,
  teachers = [],
  academicYear,
  semester,
  assessmentPolicy
}) => {
  const isWaliKelasReadOnly = currentUser.role === 'walikelas';
  const isLocked =
    currentUser.role !== 'admin' && isPeriodInputLocked(assessmentPolicy, academicYear, semester);
  const isReadOnly = isLocked || isWaliKelasReadOnly;

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

  const [selectedClassId, setSelectedClassId] = useState(visibleClassrooms[0]?.id || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState(visibleSubjects[0]?.id || '');
  const [viewMode, setViewMode] = useState<'input' | 'chapters' | 'history'>('input');
  const [search, setSearch] = useState('');

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
    const res = getAccessibleStudents(currentUser, students, selectedClassId);
    if (!search) return res;
    return res.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
  }, [currentUser, students, selectedClassId, search]);

  const relevantObjectives = useMemo(() => {
    return filterObjectivesForContext(learningObjectives, {
      subjectId: selectedSubjectId,
      gradeLevel: selectedClassroom?.gradeLevel,
      semester,
      academicYear
    });
  }, [learningObjectives, selectedSubjectId, selectedClassroom?.gradeLevel, semester, academicYear]);

  // Active Chapters for this subject & class context
  const activeChapters = useMemo(() => {
    return filterChaptersForContext(learningChapters, {
      subjectId: selectedSubjectId,
      classId: selectedClassId,
      academicYear,
      semester
    });
  }, [learningChapters, selectedSubjectId, selectedClassId, academicYear, semester]);

  const [selectedChapterId, setSelectedChapterId] = useState<string>('');

  useEffect(() => {
    if (activeChapters.length > 0) {
      if (!activeChapters.some((ch) => ch.id === selectedChapterId)) {
        setSelectedChapterId(activeChapters[0].id);
      }
    } else {
      setSelectedChapterId('');
    }
  }, [activeChapters, selectedChapterId]);

  const activeChapter = useMemo(
    () => activeChapters.find((ch) => ch.id === selectedChapterId),
    [activeChapters, selectedChapterId]
  );

  // Input State for Chapter Scores
  const [assessmentDate, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [technique, setTechnique] = useState<SummativeTechnique>('tes tertulis');
  const [scores, setScores] = useState<Record<string, number | undefined>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Hydrate scores from existing summative assessments when chapter changes
  useEffect(() => {
    const nextScores: Record<string, number | undefined> = {};
    if (selectedChapterId) {
      filteredStudents.forEach((std) => {
        const found = summativeAssessments.find(
          (sa) =>
            sa.studentId === std.id &&
            sa.chapterId === selectedChapterId &&
            sa.subjectId === selectedSubjectId &&
            sa.classId === selectedClassId &&
            sa.academicYear === academicYear &&
            sa.semester === semester
        );
        if (found && typeof found.score === 'number') {
          nextScores[std.id] = found.score;
        }
      });
    }
    setScores(nextScores);
    setSaveSuccess(false);
  }, [selectedChapterId, filteredStudents, summativeAssessments, selectedSubjectId, selectedClassId, academicYear, semester]);

  // Chapter CRUD Modal State
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<LearningChapter | null>(null);
  const [chapterTitleInput, setChapterTitleInput] = useState('');
  const [chapterLinkedTpIds, setChapterLinkedTpIds] = useState<string[]>([]);

  const handleOpenAddChapter = () => {
    const suggestion = getNextChapterOrderAndCode(activeChapters);
    setEditingChapter(null);
    setChapterTitleInput('');
    setChapterLinkedTpIds([]);
    setIsChapterModalOpen(true);
  };

  const handleOpenEditChapter = (ch: LearningChapter) => {
    setEditingChapter(ch);
    setChapterTitleInput(ch.title);
    setChapterLinkedTpIds(ch.linkedTpIds || []);
    setIsChapterModalOpen(true);
  };

  const handleSaveChapterModal = () => {
    if (!onSaveLearningChapter || isReadOnly) return;
    const trimmedTitle = chapterTitleInput.trim();
    if (!trimmedTitle) return;

    const suggestion = getNextChapterOrderAndCode(activeChapters);
    const chapterToSave: LearningChapter = editingChapter
      ? {
          ...editingChapter,
          title: trimmedTitle,
          linkedTpIds: chapterLinkedTpIds,
          updatedAt: new Date().toISOString()
        }
      : {
          id: buildLearningChapterId(selectedSubjectId, selectedClassId, academicYear, semester, suggestion.orderIndex),
          code: suggestion.code,
          orderIndex: suggestion.orderIndex,
          title: trimmedTitle,
          subjectId: selectedSubjectId,
          classId: selectedClassId,
          gradeLevel: selectedClassroom?.gradeLevel || '7',
          teacherId: currentUser.teacherId || 'admin',
          academicYear,
          semester,
          linkedTpIds: chapterLinkedTpIds,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

    onSaveLearningChapter(chapterToSave);
    setIsChapterModalOpen(false);
    if (!selectedChapterId) {
      setSelectedChapterId(chapterToSave.id);
    }
  };

  const handleSaveAllScores = () => {
    if (isReadOnly || !activeChapter) return;

    const batchList: SummativeAssessment[] = [];
    filteredStudents.forEach((std) => {
      const val = scores[std.id];
      if (val !== undefined && val !== null && !Number.isNaN(val)) {
        const assessmentId = buildDeterministicChapterSummativeId(activeChapter.id, std.id);
        const assessment: SummativeAssessment = {
          id: assessmentId,
          studentId: std.id,
          teacherId: currentUser.teacherId || 'admin',
          subjectId: selectedSubjectId,
          classId: selectedClassId,
          chapterId: activeChapter.id,
          chapterCode: activeChapter.code,
          chapterTitle: activeChapter.title,
          tpId: activeChapter.linkedTpIds?.[0] || relevantObjectives[0]?.id || 'tp-general',
          tpIds: activeChapter.linkedTpIds?.length ? activeChapter.linkedTpIds : relevantObjectives.map(t => t.id),
          assessmentTitle: `${activeChapter.code}: ${activeChapter.title}`,
          date: assessmentDate,
          technique,
          score: val,
          academicYear,
          semester,
          updatedAt: new Date().toISOString()
        };
        batchList.push(assessment);
      }
    });

    if (batchList.length > 0) {
      if (onSaveAssessmentsBatch) {
        onSaveAssessmentsBatch(batchList);
      } else {
        batchList.forEach((a) => onSaveAssessment(a));
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const techniques: { value: SummativeTechnique; label: string }[] = [
    { value: 'tes tertulis', label: 'Tes Tertulis' },
    { value: 'praktik', label: 'Praktik' },
    { value: 'proyek', label: 'Proyek' },
    { value: 'produk', label: 'Produk' },
    { value: 'lainnya', label: 'Lainnya' }
  ];

  const historyData = useMemo(() => {
    return summativeAssessments
      .filter(
        (a) =>
          a.classId === selectedClassId &&
          a.subjectId === selectedSubjectId &&
          a.academicYear === academicYear &&
          a.semester === semester
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [summativeAssessments, selectedClassId, selectedSubjectId, academicYear, semester]);

  const stats = useMemo(() => {
    const vals = Object.values(scores).filter((v): v is number => typeof v === 'number');
    if (vals.length === 0) return { avg: 0, count: 0 };
    const sum = vals.reduce((a, b) => a + b, 0);
    return { avg: Math.round(sum / vals.length), count: vals.length };
  }, [scores]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Asesmen Sumatif (Berbasis BAB Materi)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola daftar BAB materi pelajaran dan input nilai sumatif per BAB yang terhubung otomatis ke modul pengolahan nilai rapor.
          </p>
        </div>

        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setViewMode('input')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              viewMode === 'input' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Input Nilai BAB
          </button>
          <button
            onClick={() => setViewMode('chapters')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              viewMode === 'chapters' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Manajemen BAB ({activeChapters.length})
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              viewMode === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Riwayat ({historyData.length})
          </button>
        </div>
      </div>

      {isLocked && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Periode Terkunci ({academicYear} {semester}):</strong> Input atau perubahan nilai sumatif dikunci sementara oleh Administrator.
          </span>
        </div>
      )}

      {isWaliKelasReadOnly && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2.5">
          <Info className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            Mode pantau Wali Kelas: Anda dapat melihat riwayat nilai sumatif peserta didik di rombel Anda secara read-only.
          </span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Rombel</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-bold"
            >
              {visibleClassrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1 text-amber-600">
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
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-bold"
              >
                {visibleSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          {viewMode === 'input' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">
                Tanggal &amp; Teknik
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={assessmentDate}
                  onChange={(e) => setDate(e.target.value)}
                  className="flex-1 px-2.5 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <select
                  value={technique}
                  onChange={(e) => setTechnique(e.target.value as SummativeTechnique)}
                  className="flex-1 px-2.5 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  {techniques.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {viewMode === 'input' && (
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <label className="text-xs font-bold text-slate-700 shrink-0">Pilih BAB Materi:</label>
              {activeChapters.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>Belum ada BAB materi. Klik tab <strong>Manajemen BAB</strong> di atas untuk menambahkan BAB 1, BAB 2, dst.</span>
                </div>
              ) : (
                <select
                  value={selectedChapterId}
                  onChange={(e) => setSelectedChapterId(e.target.value)}
                  className="flex-1 max-w-md px-3 py-2 text-xs rounded-lg border border-amber-300 font-bold text-amber-900 bg-amber-50/50 outline-none"
                >
                  {activeChapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.code}: {ch.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {activeChapters.length === 0 && !isReadOnly && (
              <button
                onClick={handleOpenAddChapter}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Tambah BAB Pertama
              </button>
            )}
          </div>
        )}
      </div>

      {viewMode === 'chapters' ? (
        /* Manajemen BAB Tab */
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Daftar BAB Materi Lingkup Sumatif ({activeChapters.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Jumlah BAB tidak dibatasi hanya 4. Anda dapat menambah sebanyak kebutuhan semester ini.
              </p>
            </div>
            {!isReadOnly && (
              <button
                onClick={handleOpenAddChapter}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
              >
                <Plus className="w-4 h-4" /> Tambah BAB Materi Baru
              </button>
            )}
          </div>

          {activeChapters.length === 0 ? (
            <div className="text-center py-12 space-y-3 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-700 text-sm">Belum Ada BAB Materi</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Tambahkan BAB materi (misal: BAB 1 Teks Deskripsi, BAB 2 Puisi Rakyat) agar guru dapat menginput nilai sumatif per BAB.
              </p>
              {!isReadOnly && (
                <button
                  onClick={handleOpenAddChapter}
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs inline-flex items-center gap-1.5 mt-2"
                >
                  <Plus className="w-3.5 h-3.5" /> Buat BAB 1 Sekarang
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeChapters.map((ch, idx) => {
                const linkedTps = (ch.linkedTpIds || [])
                  .map((id) => learningObjectives.find((tp) => tp.id === id))
                  .filter(Boolean) as LearningObjective[];

                return (
                  <div
                    key={ch.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                          {ch.code}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">Urutan #{idx + 1}</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm">{ch.title}</h3>
                      {linkedTps.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {linkedTps.map((tp) => (
                            <span
                              key={tp.id}
                              className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold"
                              title={tp.description}
                            >
                              {tp.code}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {!isReadOnly && (
                      <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-slate-200/60">
                        <button
                          onClick={() => handleOpenEditChapter(ch)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <Edit3 className="w-3 h-3 text-blue-600" /> Edit
                        </button>
                        {onDeleteLearningChapter && (
                          <button
                            onClick={() => onDeleteLearningChapter(ch.id)}
                            className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1 transition"
                          >
                            <Trash2 className="w-3 h-3" /> Hapus
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : viewMode === 'input' ? (
        /* Input Nilai BAB Tab */
        <div className="space-y-4">
          {!activeChapter ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
              <Layers className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-700 text-sm">Pilih BAB Materi Terlebih Dahulu</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Silakan buat atau pilih salah satu BAB materi di atas untuk mulai memasukkan nilai sumatif siswa.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-3 bg-amber-50/40 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 text-xs font-black">
                    {activeChapter.code}
                  </span>
                  <span className="font-bold text-slate-800 text-xs">{activeChapter.title}</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Terisi:</span>
                    <span className="font-bold text-slate-700">{stats.count} / {filteredStudents.length}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Rerata:</span>
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-black">{stats.avg}</span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <th className="px-4 py-3 text-[11px] font-bold w-12 text-center">NO</th>
                      <th className="px-4 py-3 text-[11px] font-bold">NAMA LENGKAP SISWA</th>
                      <th className="px-4 py-3 text-[11px] font-bold">NIS / NISN</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-center w-36">NILAI BAB (0–100)</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-center w-40">PREDIKAT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-xs italic">
                          Tidak ada data siswa ditemukan.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((std, idx) => {
                        const val = scores[std.id];
                        return (
                          <tr key={std.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-3 text-center text-xs font-medium text-slate-400">{idx + 1}</td>
                            <td className="px-4 py-3 font-bold text-slate-800 text-xs uppercase">{std.name}</td>
                            <td className="px-4 py-3 text-xs font-mono text-slate-500">{std.nisn || std.nis || '-'}</td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                disabled={isReadOnly}
                                placeholder="--"
                                value={val === undefined ? '' : val}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const v =
                                    raw === '' ? undefined : Math.min(100, Math.max(0, Number(raw)));
                                  setScores({ ...scores, [std.id]: v });
                                }}
                                className="w-20 px-3 py-2 text-center text-sm font-black rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all disabled:bg-slate-100 text-amber-900 bg-white"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              {val !== undefined && val !== null ? (
                                <span
                                  className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    val >= 88
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : val >= 75
                                      ? 'bg-blue-100 text-blue-700'
                                      : val >= 65
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-rose-100 text-rose-700'
                                  }`}
                                >
                                  {val >= 88
                                    ? 'Tercapai Optimal'
                                    : val >= 75
                                    ? 'Tercapai Baik'
                                    : 'Perlu Penguatan'}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-300 italic">Belum Dinilai</span>
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
          )}

          {activeChapter && (
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-900 leading-relaxed max-w-xl">
                  <span className="font-bold block mb-0.5">Ketentuan Nilai Sumatif BAB:</span>
                  Nilai yang diinput akan otomatis masuk ke kolom BAB yang bersangkutan pada modul pengisian nilai rapor. Kosongkan nilai jika siswa belum mengikuti ujian.
                </div>
              </div>
              <button
                onClick={handleSaveAllScores}
                disabled={isReadOnly || saveSuccess || stats.count === 0}
                className={`px-8 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg active:scale-95 ${
                  saveSuccess
                    ? 'bg-emerald-500 text-white'
                    : 'bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-5 h-5" /> Berhasil Disimpan
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" /> Simpan Nilai {activeChapter.code}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* History View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-600">TANGGAL</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-600">SISWA</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-600">BAB MATERI</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-600 text-center">NILAI</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-600 text-right">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-xs italic">
                      Belum ada riwayat asesmen sumatif untuk kelas ini.
                    </td>
                  </tr>
                ) : (
                  historyData.map((item) => {
                    const std = students.find((s) => s.id === item.studentId);
                    const ch = learningChapters.find((c) => c.id === item.chapterId);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-xs font-medium text-slate-500 font-mono uppercase">
                          {item.date}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-[11px] font-bold text-slate-700">{std?.name || 'Siswa'}</div>
                          <div className="text-[10px] text-slate-400">{std?.nisn || std?.nis}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-amber-800 text-xs">
                            {ch?.code || item.chapterCode || 'BAB'} — {ch?.title || item.chapterTitle || item.assessmentTitle || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div
                            className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black border ${
                              item.score >= 75
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {item.score}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => onDeleteAssessment(item.id)}
                            disabled={isReadOnly}
                            className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 rounded-lg transition-colors"
                            title="Hapus Nilai"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chapter Add/Edit Modal */}
      {isChapterModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingChapter ? 'Edit BAB Materi' : 'Tambah BAB Materi Baru'}
              </h3>
              <button
                onClick={() => setIsChapterModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Judul Materi BAB</label>
                <input
                  type="text"
                  value={chapterTitleInput}
                  onChange={(e) => setChapterTitleInput(e.target.value)}
                  placeholder="Contoh: Teks Deskripsi & Struktur Kalimat"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tautkan Tujuan Pembelajaran (Opsional)</label>
                {relevantObjectives.length === 0 ? (
                  <p className="text-slate-400 italic">Belum ada TP terdaftar untuk kelas ini.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                    {relevantObjectives.map((tp) => {
                      const checked = chapterLinkedTpIds.includes(tp.id);
                      return (
                        <label key={tp.id} className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              if (checked) {
                                setChapterLinkedTpIds(chapterLinkedTpIds.filter((id) => id !== tp.id));
                              } else {
                                setChapterLinkedTpIds([...chapterLinkedTpIds, tp.id]);
                              }
                            }}
                            className="mt-0.5 rounded text-amber-600"
                          />
                          <span>
                            <strong className="font-mono text-amber-800">{tp.code}</strong>: {tp.description}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 text-xs">
              <button
                onClick={() => setIsChapterModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleSaveChapterModal}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                Simpan BAB
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
