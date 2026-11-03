import React, { useState, useMemo, useEffect } from 'react';
import { 
  SummativeAssessment, 
  SummativeTechnique, 
  Student, 
  Subject, 
  LearningObjective, 
  Classroom,
  User,
  TeachingAssignment
} from '../types/erapor';
import { 
  Trophy, 
  Plus, 
  Save, 
  Check, 
  History, 
  Target, 
  Calculator, 
  TrendingUp, 
  Search,
  Calendar,
  Filter,
  Info,
  Trash2,
  Edit,
  ClipboardList
} from 'lucide-react';
import { getAccessibleClassrooms, getAccessibleStudents } from '../services/storage';

interface AsesmenSumatifViewProps {
  classrooms: Classroom[];
  students: Student[];
  subjects: Subject[];
  learningObjectives: LearningObjective[];
  summativeAssessments: SummativeAssessment[];
  onSaveAssessment: (assessment: SummativeAssessment) => void;
  onDeleteAssessment: (id: string) => void;
  currentUser: User;
  teachingAssignments: TeachingAssignment[];
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
}

export const AsesmenSumatifView: React.FC<AsesmenSumatifViewProps> = ({
  classrooms,
  students,
  subjects,
  learningObjectives,
  summativeAssessments,
  onSaveAssessment,
  onDeleteAssessment,
  currentUser,
  teachingAssignments,
  academicYear,
  semester
}) => {
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'kepsek';

  // 1. Visible Classrooms & Subjects
  const visibleClassrooms = useMemo(() => getAccessibleClassrooms(currentUser, classrooms), [currentUser, classrooms]);
  const visibleSubjects = useMemo(() => {
    if (isAdmin) return subjects;
    const assignedIds = teachingAssignments
      .filter(ta => ta.teacherId === currentUser.teacherId && ta.status === 'active')
      .map(ta => ta.subjectId);
    return subjects.filter(s => assignedIds.includes(s.id));
  }, [subjects, teachingAssignments, currentUser, isAdmin]);

  // 2. Selection State
  const [selectedClassId, setSelectedClassId] = useState(visibleClassrooms[0]?.id || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState(visibleSubjects[0]?.id || '');
  const [viewMode, setViewMode] = useState<'input' | 'history'>('input');
  const [search, setSearch] = useState('');

  const filteredStudents = useMemo(() => {
    const res = getAccessibleStudents(currentUser, students, selectedClassId);
    if (!search) return res;
    return res.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  }, [currentUser, students, selectedClassId, search]);

  const relevantObjectives = useMemo(() => {
    return learningObjectives.filter(tp => 
      tp.subjectId === selectedSubjectId && tp.semester === semester
    );
  }, [learningObjectives, selectedSubjectId, semester]);

  // 3. Input State
  const [selectedTpId, setSelectedTpId] = useState('');
  const [assessmentDate, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [technique, setTechnique] = useState<SummativeTechnique>('tes tertulis');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    // Reset inputs when switching filters
    setScores({});
    setSaveSuccess(false);
  }, [selectedClassId, selectedSubjectId, selectedTpId]);

  const handleSaveAll = () => {
    if (!selectedTpId) {
      alert('Pilih Tujuan Pembelajaran terlebih dahulu.');
      return;
    }

    filteredStudents.forEach(std => {
      const val = scores[std.id];
      if (val !== undefined && val !== null) {
        const assessment: SummativeAssessment = {
          id: `sa-${Date.now()}-${std.id}`,
          studentId: std.id,
          teacherId: currentUser.teacherId || 'admin',
          subjectId: selectedSubjectId,
          classId: selectedClassId,
          tpId: selectedTpId,
          date: assessmentDate,
          technique,
          score: val,
          academicYear,
          semester,
          updatedAt: new Date().toISOString()
        };
        onSaveAssessment(assessment);
      }
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    setScores({}); // Clear after save to avoid double sync
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
      .filter(a => a.classId === selectedClassId && a.subjectId === selectedSubjectId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [summativeAssessments, selectedClassId, selectedSubjectId]);

  // Calculate some basic stats for the current view
  const stats = useMemo(() => {
    const vals = Object.values(scores);
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
            Asesmen Sumatif (Lingkup Materi)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Input nilai sumatif per Tujuan Pembelajaran untuk pengolahan nilai akhir rapor.
          </p>
        </div>

        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setViewMode('input')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              viewMode === 'input' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Input Nilai
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              viewMode === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Riwayat Nilai
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Rombel</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            {visibleClassrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1 text-amber-600">Mata Pelajaran</label>
          {visibleSubjects.length === 0 ? (
            <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-700">
              <Info className="w-3.5 h-3.5" />
              <span>Anda belum memiliki penugasan mengajar aktif di menu <strong>9. Penugasan Guru Mengajar</strong>.</span>
            </div>
          ) : (
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-bold"
            >
              {visibleSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>
        {viewMode === 'input' && (
          <>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Tujuan Pembelajaran</label>
              <select
                value={selectedTpId}
                onChange={(e) => setSelectedTpId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-bold text-blue-700"
              >
                <option value="">-- Pilih Materi / TP --</option>
                {relevantObjectives.map(tp => (
                  <option key={tp.id} value={tp.id}>[{tp.code}] {tp.description}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Tanggal & Teknik</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={assessmentDate}
                  onChange={(e) => setDate(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <select
                  value={technique}
                  onChange={(e) => setTechnique(e.target.value as SummativeTechnique)}
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  {techniques.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
          </>
        )}
      </div>

      {viewMode === 'input' ? (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 bg-slate-50/50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama siswa..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Terisi:</div>
                  <div className="text-xs font-bold text-slate-700">{stats.count} / {filteredStudents.length}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Rerata:</div>
                  <div className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-bold">{stats.avg}</div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="px-4 py-3 text-[11px] font-bold w-12 text-center">NO</th>
                    <th className="px-4 py-3 text-[11px] font-bold">NAMA LENGKAP SISWA</th>
                    <th className="px-4 py-3 text-[11px] font-bold">JENIS KELAMIN</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-center w-32">NILAI (0-100)</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-center w-40">KRITERIA</th>
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
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800 text-xs uppercase">{std.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{std.nisn}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{std.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="--"
                                value={val === undefined ? '' : val}
                                onChange={(e) => {
                                  const v = e.target.value === '' ? undefined : Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                  setScores({ ...scores, [std.id]: v as number });
                                }}
                                className="w-20 px-3 py-2 text-center text-sm font-bold rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {val !== undefined && val !== null ? (
                              <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                val >= 90 ? 'bg-emerald-100 text-emerald-700' :
                                val >= 75 ? 'bg-blue-100 text-blue-700' :
                                val >= 65 ? 'bg-amber-100 text-amber-700' :
                                'bg-rose-100 text-rose-700'
                              }`}>
                                {val >= 90 ? 'Sangat Baik' : val >= 75 ? 'Baik' : val >= 65 ? 'Cukup' : 'Perlu Bimbingan'}
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

          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-[11px] text-blue-800 leading-relaxed max-w-xl">
                <span className="font-bold block mb-0.5">Konfirmasi Penyimpanan:</span>
                Pastikan seluruh nilai sudah benar sesuai hasil asesmen. Nilai yang dikosongkan tidak akan disimpan dan tidak akan memengaruhi perhitungan rata-rata (tidak dianggap nol).
              </div>
            </div>
            <button
              onClick={handleSaveAll}
              disabled={saveSuccess || !selectedTpId || stats.count === 0}
              className={`px-8 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg active:scale-95 ${
                saveSuccess 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {saveSuccess ? (
                <><Check className="w-5 h-5" /> Berhasil Disimpan</>
              ) : (
                <><Save className="w-5 h-5" /> Simpan Nilai Sumatif</>
              )}
            </button>
          </div>
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
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-600">MATERI / TP</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-600">TEKNIK</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-600 text-center">NILAI</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-600 text-right">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-xs italic">
                      Belum ada riwayat asesmen sumatif untuk kelas ini.
                    </td>
                  </tr>
                ) : (
                  historyData.map((item) => {
                    const std = students.find(s => s.id === item.studentId);
                    const tp = learningObjectives.find(t => t.id === item.tpId);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-xs font-medium text-slate-500 font-mono uppercase">{item.date}</td>
                        <td className="px-4 py-3">
                          <div className="text-[11px] font-bold text-slate-700">{std?.name || 'Siswa'}</div>
                          <div className="text-[10px] text-slate-400">{std?.nisn}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[9px] font-bold shrink-0">{tp?.code}</span>
                            <span className="text-[10px] text-slate-600 truncate max-w-[200px]">{tp?.description}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{item.technique}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border ${
                            item.score >= 75 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {item.score}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => onDeleteAssessment(item.id)}
                            className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
    </div>
  );
};
