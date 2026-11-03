import React, { useState, useMemo, useEffect } from 'react';
import { 
  SummativeAssessment, 
  KKTPConfig,
  Student, 
  Subject, 
  LearningObjective, 
  Classroom,
  User,
  TeachingAssignment,
  AssessmentScore,
  FinalScoreMethod,
  SubjectFinalScoreConfig
} from '../types/erapor';
import { 
  Calculator, 
  TrendingUp, 
  CheckCircle2, 
  Save, 
  Check, 
  Info, 
  AlertTriangle,
  Settings,
  ChevronRight,
  BookOpen,
  Users
} from 'lucide-react';
import { getAccessibleClassrooms, getAccessibleStudents, calculatePredicate } from '../services/storage';

interface PengolahanNilaiAkhirViewProps {
  classrooms: Classroom[];
  students: Student[];
  subjects: Subject[];
  learningObjectives: LearningObjective[];
  summativeAssessments: SummativeAssessment[];
  kktpConfigs: KKTPConfig[];
  finalScoreConfigs: SubjectFinalScoreConfig[];
  scores: AssessmentScore[];
  onSaveScores: (scores: AssessmentScore[]) => void;
  onSaveConfig: (config: SubjectFinalScoreConfig) => void;
  currentUser: User;
  teachingAssignments: TeachingAssignment[];
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
}

export const PengolahanNilaiAkhirView: React.FC<PengolahanNilaiAkhirViewProps> = ({
  classrooms,
  students,
  subjects,
  learningObjectives,
  summativeAssessments,
  kktpConfigs,
  finalScoreConfigs,
  scores,
  onSaveScores,
  onSaveConfig,
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
  const [showConfig, setShowConfig] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const filteredStudents = useMemo(() => {
    return getAccessibleStudents(currentUser, students, selectedClassId);
  }, [currentUser, students, selectedClassId]);

  const relevantObjectives = useMemo(() => {
    return learningObjectives.filter(tp => 
      tp.subjectId === selectedSubjectId && tp.semester === semester
    );
  }, [learningObjectives, selectedSubjectId, semester]);

  const currentConfig = useMemo(() => {
    return finalScoreConfigs.find(c => c.subjectId === selectedSubjectId && c.classId === selectedClassId) || {
      subjectId: selectedSubjectId,
      classId: selectedClassId,
      method: 'rata-rata' as FinalScoreMethod,
      sasWeight: 0
    };
  }, [finalScoreConfigs, selectedSubjectId, selectedClassId]);

  // 3. Calculation Logic
  const computedData = useMemo(() => {
    return filteredStudents.map(std => {
      const studentSummative = summativeAssessments.filter(a => 
        a.studentId === std.id && 
        a.subjectId === selectedSubjectId && 
        a.academicYear === academicYear && 
        a.semester === semester
      );

      // Group scores by TP
      const tpScores: Record<string, number[]> = {};
      studentSummative.forEach(a => {
        if (!tpScores[a.tpId]) tpScores[a.tpId] = [];
        tpScores[a.tpId].push(a.score);
      });

      // Calculate average per TP
      const tpAverages: Record<string, number> = {};
      relevantObjectives.forEach(tp => {
        const vals = tpScores[tp.id] || [];
        if (vals.length > 0) {
          tpAverages[tp.id] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
        }
      });

      // Calculate Final Score based on method
      let finalScore = 0;
      const avgs = Object.values(tpAverages);
      
      if (avgs.length > 0) {
        if (currentConfig.method === 'rata-rata') {
          finalScore = Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length);
        } else if (currentConfig.method === 'pembobotan' && currentConfig.tpWeights) {
          let weightedSum = 0;
          let totalWeight = 0;
          relevantObjectives.forEach(tp => {
            if (tpAverages[tp.id] !== undefined) {
              const weight = currentConfig.tpWeights?.[tp.id] || 1;
              weightedSum += tpAverages[tp.id] * weight;
              totalWeight += weight;
            }
          });
          finalScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
        } else if (currentConfig.method === 'persentase-tp') {
          // Simplistic implementation: % of TPs that reached KKTP
          const kktps = kktpConfigs.filter(k => k.subjectId === selectedSubjectId);
          let reachedCount = 0;
          relevantObjectives.forEach(tp => {
            const avg = tpAverages[tp.id];
            if (avg !== undefined) {
              const kktp = kktps.find(k => k.tpId === tp.id);
              const minPass = kktp?.criteria.find(c => c.category === 'Cukup')?.minScore || 65;
              if (avg >= minPass) reachedCount++;
            }
          });
          // This method usually maps % reached to a score scale or just uses average if reached.
          // For now, fallback to average for calculation, but flag status.
          finalScore = Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length);
        }
      }

      // Determine Descriptions based on KKTP
      let highestDesc = '';
      let lowestDesc = '';
      
      if (avgs.length > 0) {
        const sortedAvgs = relevantObjectives
          .filter(tp => tpAverages[tp.id] !== undefined)
          .map(tp => ({ tp, avg: tpAverages[tp.id] }))
          .sort((a, b) => b.avg - a.avg);

        const high = sortedAvgs[0];
        const low = sortedAvgs[sortedAvgs.length - 1];

        const getDesc = (tpId: string, score: number) => {
          const config = kktpConfigs.find(k => k.tpId === tpId);
          if (!config) return score >= 75 ? 'Menunjukkan penguasaan materi dengan baik.' : 'Perlu bimbingan lebih lanjut.';
          const criterion = [...config.criteria].sort((a, b) => b.minScore - a.minScore).find(c => score >= c.minScore);
          return criterion ? criterion.description : config.criteria[0].description;
        };

        highestDesc = `Menunjukkan penguasaan yang baik dalam ${high.tp.description.toLowerCase()}. ${getDesc(high.tp.id, high.avg)}`;
        lowestDesc = low.avg < 75 
          ? `Perlu bimbingan dalam ${low.tp.description.toLowerCase()}. ${getDesc(low.tp.id, low.avg)}`
          : `Sudah mencapai kriteria dalam ${low.tp.description.toLowerCase()}, namun disarankan untuk terus berlatih.`;
      }

      return {
        student: std,
        tpAverages,
        finalScore,
        highestDesc,
        lowestDesc,
        predicate: calculatePredicate(finalScore)
      };
    });
  }, [filteredStudents, summativeAssessments, relevantObjectives, currentConfig, kktpConfigs, selectedSubjectId, academicYear, semester]);

  const handleSaveAll = () => {
    const newScores: AssessmentScore[] = computedData.map(item => {
      const existing = scores.find(s => 
        s.studentId === item.student.id && 
        s.subjectId === selectedSubjectId && 
        s.academicYear === academicYear && 
        s.semester === semester
      );

      return {
        id: existing?.id || `sc-${Date.now()}-${item.student.id}`,
        studentId: item.student.id,
        subjectId: selectedSubjectId,
        classId: selectedClassId,
        academicYear,
        semester,
        formatifScores: {}, // We use separate collection now
        sumatifMateriScores: item.tpAverages,
        sumatifAkhirSemester: existing?.sumatifAkhirSemester || 0,
        finalScore: item.finalScore,
        predicate: item.predicate,
        highestCompetenceDesc: item.highestDesc,
        lowestCompetenceDesc: item.lowestDesc,
        updatedAt: new Date().toISOString(),
        status: 'SELESAI'
      };
    });

    onSaveScores(newScores);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
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
            Kalkulasi nilai rapor berdasarkan akumulasi asesmen sumatif dan konfigurasi KKTP.
          </p>
        </div>

        <button
          onClick={() => setShowConfig(!showConfig)}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 transition"
        >
          <Settings className="w-3.5 h-3.5" />
          Metode Perhitungan
        </button>
      </div>

      {/* Filter & Config Bar */}
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Rombel</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 outline-none bg-white"
            >
              {visibleClassrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1 text-indigo-600">Mata Pelajaran</label>
            {visibleSubjects.length === 0 ? (
              <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-700">
                <Info className="w-3.5 h-3.5" />
                <span>Anda belum memiliki penugasan mengajar aktif di menu <strong>9. Penugasan Guru Mengajar</strong>.</span>
              </div>
            ) : (
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 outline-none bg-white font-bold"
              >
                {visibleSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>
        </div>

        {showConfig && (
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
                  {(['rata-rata', 'pembobotan', 'persentase-tp'] as FinalScoreMethod[]).map(m => (
                    <label key={m} className="flex items-center gap-2 p-2 rounded-lg bg-white/50 border border-indigo-200 cursor-pointer hover:bg-white transition">
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
                    <h4 className="text-[11px] font-bold text-indigo-800 uppercase mb-3">Atur Bobot Per Tujuan Pembelajaran</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {relevantObjectives.map(tp => (
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
                        <span className="font-bold block mb-1">Keterangan Metode:</span>
                        <ul className="list-disc ml-4 space-y-1">
                          <li><strong>Rata-rata:</strong> Nilai akhir diambil dari rerata seluruh nilai sumatif TP.</li>
                          <li><strong>Pembobotan:</strong> Guru memberikan bobot berbeda untuk setiap TP (misal: TP yang lebih sulit memiliki bobot lebih tinggi).</li>
                          <li><strong>Persentase TP:</strong> Berfokus pada jumlah TP yang tuntas mencapai KKTP.</li>
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="px-4 py-3 text-[10px] font-bold w-10 text-center">NO</th>
                <th className="px-4 py-3 text-[10px] font-bold min-w-[200px]">NAMA SISWA</th>
                {relevantObjectives.map(tp => (
                  <th key={tp.id} className="px-3 py-3 text-[10px] font-bold text-center border-l border-slate-100">
                    <div className="flex flex-col items-center">
                      <span className="text-blue-600">{tp.code}</span>
                      <span className="text-[9px] text-slate-400 font-normal">Sumatif</span>
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-[10px] font-bold text-center bg-indigo-50/50 border-l border-slate-200">NILAI AKHIR</th>
                <th className="px-4 py-3 text-[10px] font-bold text-center bg-indigo-50/50">PREDIKAT</th>
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
                  {relevantObjectives.map(tp => {
                    const avg = item.tpAverages[tp.id];
                    return (
                      <td key={tp.id} className="px-3 py-3 text-center border-l border-slate-50">
                        {avg !== undefined ? (
                          <div className="text-xs font-bold text-slate-700">{avg}</div>
                        ) : (
                          <div className="text-[10px] text-slate-300 italic">Kosong</div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center bg-indigo-50/20 border-l border-slate-100">
                    <div className="text-sm font-black text-indigo-700">{item.finalScore}</div>
                  </td>
                  <td className="px-4 py-3 text-center bg-indigo-50/20">
                    <span className={`inline-block w-8 py-1 rounded-lg text-[11px] font-black ${
                      item.predicate === 'A' ? 'bg-emerald-100 text-emerald-700' :
                      item.predicate === 'B' ? 'bg-blue-100 text-blue-700' :
                      item.predicate === 'C' ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      {item.predicate}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-slate-800 rounded-2xl shadow-xl border border-slate-700">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-white font-bold text-sm">Siap Posting Nilai?</h4>
            <p className="text-slate-400 text-[11px] leading-relaxed max-w-md">
              Sistem akan menghitung nilai akhir dan menghasilkan deskripsi otomatis berdasarkan KKTP yang telah dikonfigurasi. Anda tetap bisa mengedit deskripsi di menu Deskripsi Nilai.
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={saveSuccess || computedData.length === 0}
          className={`w-full md:w-auto px-10 py-4 rounded-xl font-black text-sm flex items-center justify-center gap-3 transition-all shadow-2xl active:scale-95 ${
            saveSuccess 
              ? 'bg-emerald-500 text-white' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/20'
          }`}
        >
          {saveSuccess ? (
            <><CheckCircle2 className="w-5 h-5" /> Berhasil Diposting</>
          ) : (
            <><Save className="w-5 h-5" /> Posting Nilai ke Rapor</>
          )}
        </button>
      </div>
    </div>
  );
};
