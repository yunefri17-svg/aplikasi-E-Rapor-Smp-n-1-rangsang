import React, { useState, useMemo } from 'react';
import { 
  FormativeAssessment, 
  FormativeTechnique, 
  Student, 
  Subject, 
  LearningObjective, 
  Classroom,
  User,
  TeachingAssignment
} from '../types/erapor';
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  Calendar, 
  MessageSquare, 
  UserCheck, 
  Check, 
  Save, 
  Filter, 
  BookOpen,
  Info,
  Clock,
  History,
  Target
} from 'lucide-react';
import { getAccessibleClassrooms, getAccessibleStudents } from '../services/storage';

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
  const [selectedTpId, setSelectedTpId] = useState('');
  const [viewMode, setViewMode] = useState<'input' | 'history'>('input');

  const filteredStudents = useMemo(() => {
    return getAccessibleStudents(currentUser, students, selectedClassId);
  }, [currentUser, students, selectedClassId]);

  const relevantObjectives = useMemo(() => {
    return learningObjectives.filter(tp => 
      tp.subjectId === selectedSubjectId && tp.semester === semester
    );
  }, [learningObjectives, selectedSubjectId, semester]);

  // 3. Input State
  const [assessmentDate, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [technique, setTechnique] = useState<FormativeTechnique>('observasi');
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveAll = () => {
    if (!selectedTpId) {
      alert('Pilih Tujuan Pembelajaran terlebih dahulu.');
      return;
    }

    filteredStudents.forEach(std => {
      if (observations[std.id] || feedbacks[std.id]) {
        const assessment: FormativeAssessment = {
          id: `fa-${Date.now()}-${std.id}`,
          studentId: std.id,
          teacherId: currentUser.teacherId || 'admin',
          subjectId: selectedSubjectId,
          classId: selectedClassId,
          tpId: selectedTpId,
          date: assessmentDate,
          technique,
          observation: observations[std.id] || '',
          feedback: feedbacks[std.id] || '',
          academicYear,
          semester,
          updatedAt: new Date().toISOString()
        };
        onSaveAssessment(assessment);
      }
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
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
      .filter(a => a.classId === selectedClassId && a.subjectId === selectedSubjectId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [formativeAssessments, selectedClassId, selectedSubjectId]);

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
            Pantau perkembangan belajar siswa secara berkala tanpa memengaruhi nilai akhir rapor.
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
            <History className="w-3.5 h-3.5" /> Riwayat
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
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1 text-emerald-600">Mata Pelajaran</label>
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
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="">-- Pilih TP --</option>
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
                  onChange={(e) => setTechnique(e.target.value as FormativeTechnique)}
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
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-600 w-12 text-center">NO</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-600">NAMA PESERTA DIDIK</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-600">HASIL PENGAMATAN</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-600">UMPAN BALIK PERBAIKAN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-xs italic">
                      Pilih rombel untuk menampilkan daftar siswa.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((std, idx) => (
                    <tr key={std.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-center text-xs font-medium text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-700 text-xs">{std.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{std.nisn}</div>
                      </td>
                      <td className="px-4 py-3">
                        <textarea
                          placeholder="Catat kemajuan atau kendala belajar..."
                          value={observations[std.id] || ''}
                          onChange={(e) => setObservations({ ...observations, [std.id]: e.target.value })}
                          className="w-full p-2 text-xs rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none resize-none transition-all h-16"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <textarea
                          placeholder="Berikan saran perbaikan..."
                          value={feedbacks[std.id] || ''}
                          onChange={(e) => setFeedbacks({ ...feedbacks, [std.id]: e.target.value })}
                          className="w-full p-2 text-xs rounded-lg border border-slate-200 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none resize-none transition-all h-16"
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
              <Info className="w-4 h-4 text-blue-500" />
              <span>Satu baris data akan tersimpan jika hasil pengamatan atau umpan balik diisi.</span>
            </div>
            <button
              onClick={handleSaveAll}
              disabled={saveSuccess || !selectedTpId || filteredStudents.length === 0}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 ${
                saveSuccess 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {saveSuccess ? (
                <><Check className="w-4 h-4" /> Tersimpan</>
              ) : (
                <><Save className="w-4 h-4" /> Simpan Jurnal Formatif</>
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
                const std = students.find(s => s.id === item.studentId);
                const tp = learningObjectives.find(t => t.id === item.tpId);
                return (
                  <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                          <Calendar className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{item.date}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[9px] font-bold uppercase tracking-wider border border-blue-100">
                        {item.technique}
                      </span>
                    </div>
                    
                    <div className="mb-3">
                      <div className="text-[11px] font-bold text-slate-800">{std?.name || 'Siswa'}</div>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500">
                        <Target className="w-3 h-3 text-blue-500 shrink-0" />
                        <span className="truncate">{tp?.code}: {tp?.description}</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-100">
                      <div className="space-y-1">
                        <div className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                          <UserCheck className="w-3 h-3" /> Hasil Pengamatan
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed italic">"{item.observation}"</p>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[9px] font-bold text-emerald-500 uppercase flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> Umpan Balik
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">{item.feedback}</p>
                      </div>
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
