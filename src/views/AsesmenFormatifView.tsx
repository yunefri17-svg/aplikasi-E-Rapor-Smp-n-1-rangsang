import React, { useState, useMemo, useEffect } from 'react';
import {
  AssessmentPolicyConfig,
  Classroom,
  FormativeAssessment,
  FormativeMasteryStatus,
  FormativeTechnique,
  LearningObjective,
  Student,
  Subject,
  TeachingAssignment,
  User
} from '../types/erapor';
import {
  ClipboardCheck,
  Plus,
  Calendar,
  MessageSquare,
  UserCheck,
  Check,
  Save,
  Info,
  Clock,
  History,
  Target,
  Lock
} from 'lucide-react';
import { getAccessibleClassrooms, getAccessibleStudents } from '../services/storage';
import {
  filterObjectivesForContext,
  getFormativeTpIds,
  isPeriodInputLocked
} from '../utils/tpAnalysisAndDescription';

interface AsesmenFormatifViewProps {
  classrooms: Classroom[];
  students: Student[];
  subjects: Subject[];
  learningObjectives: LearningObjective[];
  formativeAssessments: FormativeAssessment[];
  onSaveAssessment: (assessment: FormativeAssessment) => void;
  currentUser: User;
  teachingAssignments: TeachingAssignment[];
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  assessmentPolicy?: AssessmentPolicyConfig;
}

export const AsesmenFormatifView: React.FC<AsesmenFormatifViewProps> = ({
  classrooms,
  students,
  subjects,
  learningObjectives,
  formativeAssessments,
  onSaveAssessment,
  currentUser,
  teachingAssignments,
  academicYear,
  semester,
  assessmentPolicy
}) => {
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'kepsek';
  const isWaliKelasReadOnly = currentUser.role === 'walikelas';
  const isLocked =
    currentUser.role !== 'admin' && isPeriodInputLocked(assessmentPolicy, academicYear, semester);
  const isReadOnly = isLocked || isWaliKelasReadOnly;

  // 1. Visible Classrooms & Subjects
  const visibleClassrooms = useMemo(
    () => getAccessibleClassrooms(currentUser, classrooms),
    [currentUser, classrooms]
  );
  const visibleSubjects = useMemo(() => {
    if (isAdmin || isWaliKelasReadOnly) return subjects;
    const assignedIds = teachingAssignments
      .filter((ta) => ta.teacherId === currentUser.teacherId && ta.status === 'active')
      .map((ta) => ta.subjectId);
    return subjects.filter((s) => assignedIds.includes(s.id));
  }, [subjects, teachingAssignments, currentUser, isAdmin, isWaliKelasReadOnly]);

  // 2. Selection State
  const [selectedClassId, setSelectedClassId] = useState(visibleClassrooms[0]?.id || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState(visibleSubjects[0]?.id || '');
  const [selectedTpIds, setSelectedTpIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'input' | 'history'>('input');

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

  useEffect(() => {
    setSelectedTpIds((prev) => {
      const stillValid = prev.filter((id) => relevantObjectives.some((tp) => tp.id === id));
      if (stillValid.length > 0) return stillValid;
      return relevantObjectives[0]?.id ? [relevantObjectives[0].id] : [];
    });
  }, [relevantObjectives]);

  // 3. Input State
  const [assessmentDate, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [technique, setTechnique] = useState<FormativeTechnique>('observasi');
  const [masteryStatuses, setMasteryStatuses] = useState<Record<string, FormativeMasteryStatus | ''>>({});
  const [diagnosticScores, setDiagnosticScores] = useState<Record<string, number | undefined>>({});
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  const toggleTpSelection = (tpId: string) => {
    setSelectedTpIds((prev) =>
      prev.includes(tpId) ? prev.filter((id) => id !== tpId) : [...prev, tpId]
    );
  };

  const handleSaveAll = () => {
    if (isReadOnly) return;
    if (selectedTpIds.length === 0) {
      return;
    }

    let savedCount = 0;
    filteredStudents.forEach((std) => {
      const mStatus = masteryStatuses[std.id];
      const diagScore = diagnosticScores[std.id];
      const obs = (observations[std.id] || '').trim();
      const fb = (feedbacks[std.id] || '').trim();

      if (obs || fb || mStatus || diagScore !== undefined) {
        const assessment: FormativeAssessment = {
          id: `fa-${Date.now()}-${std.id}`,
          studentId: std.id,
          teacherId: currentUser.teacherId || 'admin',
          subjectId: selectedSubjectId,
          classId: selectedClassId,
          tpId: selectedTpIds[0],
          tpIds: selectedTpIds,
          date: assessmentDate,
          technique,
          masteryStatus: mStatus || undefined,
          score: diagScore,
          observation: obs,
          feedback: fb,
          academicYear,
          semester,
          updatedAt: new Date().toISOString()
        };
        onSaveAssessment(assessment);
        savedCount++;
      }
    });

    if (savedCount > 0) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const techniques: { value: FormativeTechnique; label: string }[] = [
    { value: 'observasi', label: 'Observasi' },
    { value: 'tanya jawab', label: 'Tanya Jawab' },
    { value: 'diskusi', label: 'Diskusi' },
    { value: 'kuis', label: 'Kuis' },
    { value: 'latihan', label: 'Latihan' },
    { value: 'praktik', label: 'Praktik' },
    { value: 'tugas', label: 'Tugas' }
  ];

  const historyData = useMemo(() => {
    return formativeAssessments
      .filter(
        (a) =>
          a.classId === selectedClassId &&
          a.subjectId === selectedSubjectId &&
          a.academicYear === academicYear &&
          a.semester === semester
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [formativeAssessments, selectedClassId, selectedSubjectId, academicYear, semester]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-emerald-600" />
            Asesmen Formatif
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pantau perkembangan belajar siswa per Tujuan Pembelajaran sebagai bukti penyusunan deskripsi rapor tanpa mengubah bobot nilai angka.
          </p>
        </div>

        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setViewMode('input')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              viewMode === 'input' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Input Baru
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
            <strong>Periode Terkunci ({academicYear} {semester}):</strong> Input asesmen formatif dikunci sementara oleh Administrator.
          </span>
        </div>
      )}

      {isWaliKelasReadOnly && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2.5">
          <Info className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            Mode pantau Wali Kelas: Anda dapat memantau riwayat formatif peserta didik di rombel Anda secara read-only.
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
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              {visibleClassrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1 text-emerald-600">
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
                Tanggal & Teknik
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
                  onChange={(e) => setTechnique(e.target.value as FormativeTechnique)}
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
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-2">
              Tautkan Tujuan Pembelajaran (TP) yang Benar-Benar Dinilai ({selectedTpIds.length} dipilih):
            </label>
            {relevantObjectives.length === 0 ? (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                Belum ada Tujuan Pembelajaran untuk kelas {selectedClassroom?.gradeLevel || '-'} semester {semester}. Tambahkan terlebih dahulu di menu <strong>Data Pembelajaran (CP/TP)</strong>.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {relevantObjectives.map((tp) => {
                  const checked = selectedTpIds.includes(tp.id);
                  return (
                    <label
                      key={tp.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                        checked
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTpSelection(tp.id)}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-emerald-800">
                          {tp.code}
                          {tp.materi ? ` • ${tp.materi}` : ''}
                        </div>
                        <div className="text-[11px] text-slate-600 line-clamp-2">{tp.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {viewMode === 'input' ? (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-3 text-[11px] font-bold text-slate-600 w-10 text-center">NO</th>
                  <th className="px-3 py-3 text-[11px] font-bold text-slate-600 min-w-[180px]">NAMA PESERTA DIDIK</th>
                  <th className="px-3 py-3 text-[11px] font-bold text-slate-600 w-44">STATUS KETERCAPAIAN TP</th>
                  <th className="px-3 py-3 text-[11px] font-bold text-slate-600 w-24 text-center">SKOR OPSIONAL</th>
                  <th className="px-3 py-3 text-[11px] font-bold text-slate-600 min-w-[200px]">HASIL PENGAMATAN</th>
                  <th className="px-3 py-3 text-[11px] font-bold text-slate-600 min-w-[200px]">UMPAN BALIK PERBAIKAN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs italic">
                      Pilih rombel untuk menampilkan daftar siswa.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((std, idx) => (
                    <tr key={std.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-3 text-center text-xs font-medium text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-3">
                        <div className="font-bold text-slate-700 text-xs">{std.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{std.nisn}</div>
                      </td>
                      <td className="px-3 py-3">
                        <select
                          disabled={isReadOnly}
                          value={masteryStatuses[std.id] || ''}
                          onChange={(e) =>
                            setMasteryStatuses({
                              ...masteryStatuses,
                              [std.id]: e.target.value as FormativeMasteryStatus | ''
                            })
                          }
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-500 outline-none disabled:bg-slate-100"
                        >
                          <option value="">-- Status TP --</option>
                          <option value="Tercapai Optimal">Tercapai Optimal</option>
                          <option value="Tercapai Baik">Tercapai Baik</option>
                          <option value="Perlu Penguatan">Perlu Penguatan</option>
                        </select>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          disabled={isReadOnly}
                          placeholder="--"
                          value={diagnosticScores[std.id] ?? ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const parsed =
                              raw === '' ? undefined : Math.min(100, Math.max(0, Number(raw)));
                            setDiagnosticScores({ ...diagnosticScores, [std.id]: parsed });
                          }}
                          className="w-16 px-2 py-1.5 text-center text-xs font-bold rounded-lg border border-slate-300 focus:border-emerald-500 outline-none disabled:bg-slate-100"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <textarea
                          disabled={isReadOnly}
                          placeholder="Catat kemajuan atau kendala belajar..."
                          value={observations[std.id] || ''}
                          onChange={(e) => setObservations({ ...observations, [std.id]: e.target.value })}
                          className="w-full p-2 text-xs rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none resize-none transition-all h-14 disabled:bg-slate-100"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <textarea
                          disabled={isReadOnly}
                          placeholder="Berikan saran perbaikan..."
                          value={feedbacks[std.id] || ''}
                          onChange={(e) => setFeedbacks({ ...feedbacks, [std.id]: e.target.value })}
                          className="w-full p-2 text-xs rounded-lg border border-slate-200 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none resize-none transition-all h-14 disabled:bg-slate-100"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <Info className="w-4 h-4 text-blue-500 shrink-0" />
              <span>
                Data kosong tidak dianggap nol. Baris akan tersimpan jika status TP, skor diagnostik, pengamatan, atau umpan balik diisi.
              </span>
            </div>
            <button
              onClick={handleSaveAll}
              disabled={isReadOnly || saveSuccess || selectedTpIds.length === 0 || filteredStudents.length === 0}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 ${
                saveSuccess
                  ? 'bg-emerald-500 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4" /> Tersimpan
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Simpan Jurnal Formatif
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* History View */
        <div className="space-y-4">
          {historyData.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-slate-700 font-bold text-sm">Belum Ada Riwayat Formatif</h3>
              <p className="text-slate-400 text-xs max-w-xs mx-auto">
                Mulailah mencatat asesmen formatif untuk melihat perkembangan belajar siswa di kelas ini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {historyData.map((item) => {
                const std = students.find((s) => s.id === item.studentId);
                const linkedTps = getFormativeTpIds(item)
                  .map((id) => learningObjectives.find((t) => t.id === id))
                  .filter(Boolean) as LearningObjective[];

                return (
                  <div
                    key={item.id}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                          <Calendar className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{item.date}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {item.masteryStatus && (
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                              item.masteryStatus === 'Tercapai Optimal'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : item.masteryStatus === 'Tercapai Baik'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {item.masteryStatus}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-bold uppercase tracking-wider border border-slate-200">
                          {item.technique}
                        </span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-bold text-slate-800">{std?.name || 'Siswa'}</div>
                        {typeof item.score === 'number' && (
                          <span className="text-[10px] font-mono font-bold text-emerald-700">
                            Skor: {item.score}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1 mt-1.5">
                        <Target className="w-3 h-3 text-blue-500 shrink-0" />
                        {linkedTps.length > 0 ? (
                          linkedTps.map((tp) => (
                            <span
                              key={tp.id}
                              className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-bold"
                              title={tp.description}
                            >
                              {tp.code}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400">TP: {item.tpId}</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-100">
                      {item.observation && (
                        <div className="space-y-1">
                          <div className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <UserCheck className="w-3 h-3" /> Hasil Pengamatan
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed italic">"{item.observation}"</p>
                        </div>
                      )}
                      {item.feedback && (
                        <div className="space-y-1">
                          <div className="text-[9px] font-bold text-emerald-500 uppercase flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> Umpan Balik
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium">{item.feedback}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
