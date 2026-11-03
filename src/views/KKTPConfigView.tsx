import React, { useState, useMemo } from 'react';
import { 
  KKTPConfig, 
  KKTPCriterion, 
  Subject, 
  LearningObjective, 
  User,
  TeachingAssignment
} from '../types/erapor';
import { 
  Settings2, 
  Save, 
  Check, 
  Plus, 
  Trash2, 
  BookOpen, 
  Target,
  Info,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

interface KKTPConfigViewProps {
  subjects: Subject[];
  learningObjectives: LearningObjective[];
  kktpConfigs: KKTPConfig[];
  onSaveKKTP: (config: KKTPConfig) => void;
  currentUser: User;
  teachingAssignments: TeachingAssignment[];
}

export const KKTPConfigView: React.FC<KKTPConfigViewProps> = ({
  subjects,
  learningObjectives,
  kktpConfigs,
  onSaveKKTP,
  currentUser,
  teachingAssignments
}) => {
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'kepsek';

  // Filter subjects based on teaching assignments if not admin
  const visibleSubjects = useMemo(() => {
    if (isAdmin) return subjects;
    const assignedIds = teachingAssignments
      .filter(ta => ta.teacherId === currentUser.teacherId && ta.status === 'active')
      .map(ta => ta.subjectId);
    return subjects.filter(s => assignedIds.includes(s.id));
  }, [subjects, teachingAssignments, currentUser, isAdmin]);

  const [selectedSubject, setSelectedSubject] = useState(visibleSubjects[0]?.id || '');
  const [selectedGrade, setSelectedGrade] = useState<'7' | '8' | '9'>('7');

  const relevantObjectives = useMemo(() => {
    return learningObjectives.filter(tp => 
      tp.subjectId === selectedSubject && tp.gradeLevel === selectedGrade
    );
  }, [learningObjectives, selectedSubject, selectedGrade]);

  const [activeTpId, setActiveTpId] = useState<string>('');

  const currentConfig = useMemo(() => {
    return kktpConfigs.find(c => c.tpId === activeTpId) || null;
  }, [kktpConfigs, activeTpId]);

  const [editingCriteria, setEditingCriteria] = useState<KKTPCriterion[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync editing state when active TP changes
  React.useEffect(() => {
    if (currentConfig) {
      setEditingCriteria([...currentConfig.criteria]);
    } else {
      // Default criteria if none exists
      setEditingCriteria([
        { category: 'Perlu Bimbingan', minScore: 0, description: 'Belum mencapai kriteria, perlu pendampingan intensif.' },
        { category: 'Cukup', minScore: 65, description: 'Mencapai kriteria minimum, perlu penguatan pada beberapa bagian.' },
        { category: 'Baik', minScore: 75, description: 'Mencapai kriteria dengan baik, menguasai sebagian besar materi.' },
        { category: 'Sangat Baik', minScore: 90, description: 'Mencapai kriteria dengan sangat baik, menguasai seluruh materi.' }
      ]);
    }
    setSaveSuccess(false);
  }, [currentConfig, activeTpId]);

  const handleUpdateCriterion = (index: number, field: keyof KKTPCriterion, value: any) => {
    const updated = [...editingCriteria];
    updated[index] = { ...updated[index], [field]: value };
    setEditingCriteria(updated);
  };

  const handleSave = () => {
    if (!activeTpId) return;

    const config: KKTPConfig = {
      id: currentConfig?.id || `kktp-${activeTpId}`,
      subjectId: selectedSubject,
      gradeLevel: selectedGrade,
      tpId: activeTpId,
      criteria: [...editingCriteria].sort((a, b) => a.minScore - b.minScore),
      updatedAt: new Date().toISOString()
    };

    onSaveKKTP(config);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-blue-600" />
            Konfigurasi KKTP
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kriteria Ketercapaian Tujuan Pembelajaran sesuai Panduan Asesmen 2025.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Selection Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5 text-blue-600">Mata Pelajaran</label>
              {visibleSubjects.length === 0 ? (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-700">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Anda belum memiliki penugasan mengajar aktif di menu <strong>9. Penugasan Guru Mengajar</strong>. Silakan hubungi Admin.</span>
                </div>
              ) : (
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                >
                  {visibleSubjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Tingkatan Kelas</label>
              <div className="flex gap-2">
                {(['7', '8', '9'] as const).map(g => (
                  <button
                    key={g}
                    onClick={() => setSelectedGrade(g)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition ${
                      selectedGrade === g 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Kelas {g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-500" />
                Pilih Tujuan Pembelajaran
              </h3>
            </div>
            <div className="max-h-[400px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {relevantObjectives.length === 0 ? (
                <p className="text-[11px] text-slate-400 p-4 text-center">Belum ada data TP untuk filter ini.</p>
              ) : (
                relevantObjectives.map(tp => (
                  <button
                    key={tp.id}
                    onClick={() => setActiveTpId(tp.id)}
                    className={`w-full text-left p-3 rounded-lg border transition flex items-center gap-3 ${
                      activeTpId === tp.id
                        ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200'
                        : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-[10px] ${
                      activeTpId === tp.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {tp.code}
                    </div>
                    <div className="min-w-0">
                      <div className={`text-[11px] font-bold truncate ${activeTpId === tp.id ? 'text-blue-700' : 'text-slate-700'}`}>
                        {tp.description}
                      </div>
                      <div className="text-[10px] text-slate-400">Semester {tp.semester}</div>
                    </div>
                    <ChevronRight className={`w-4 h-4 ml-auto shrink-0 ${activeTpId === tp.id ? 'text-blue-400' : 'text-slate-300'}`} />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Configuration Area */}
        <div className="lg:col-span-8">
          {!activeTpId ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl h-full flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                <Target className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-slate-700 font-bold text-sm">Pilih Tujuan Pembelajaran</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-xs">
                Pilih salah satu TP dari panel kiri untuk mulai mengatur kriteria ketercapaian dan deskripsi kompetensi.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider">
                        {relevantObjectives.find(t => t.id === activeTpId)?.code}
                      </span>
                      <h2 className="text-sm font-bold text-slate-800">
                        Detail Kriteria Ketercapaian
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 italic">
                      "{relevantObjectives.find(t => t.id === activeTpId)?.description}"
                    </p>
                  </div>
                  
                  <button
                    onClick={handleSave}
                    disabled={saveSuccess}
                    className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-sm ${
                      saveSuccess 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                    }`}
                  >
                    {saveSuccess ? (
                      <>
                        <Check className="w-4 h-4" />
                        Tersimpan
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Simpan KKTP
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 gap-4">
                  {editingCriteria.map((item, idx) => (
                    <div 
                      key={idx} 
                      className={`p-4 rounded-xl border transition-all ${
                        item.category === 'Sangat Baik' ? 'bg-emerald-50/30 border-emerald-100' :
                        item.category === 'Baik' ? 'bg-blue-50/30 border-blue-100' :
                        item.category === 'Cukup' ? 'bg-amber-50/30 border-amber-100' :
                        'bg-rose-50/30 border-rose-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${
                            item.category === 'Sangat Baik' ? 'bg-emerald-500' :
                            item.category === 'Baik' ? 'bg-blue-500' :
                            item.category === 'Cukup' ? 'bg-amber-500' :
                            'bg-rose-500'
                          }`} />
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                            Interval: {item.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">
                          <span className="text-[10px] font-bold text-slate-400">MIN. SKOR:</span>
                          <input
                            type="number"
                            value={item.minScore}
                            onChange={(e) => handleUpdateCriterion(idx, 'minScore', parseInt(e.target.value) || 0)}
                            className="w-12 text-center text-xs font-bold text-slate-700 focus:outline-none"
                            min="0"
                            max="100"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Deskripsi Capaian Kompetensi</label>
                        <textarea
                          value={item.description}
                          onChange={(e) => handleUpdateCriterion(idx, 'description', e.target.value)}
                          placeholder="Masukkan deskripsi untuk rentang nilai ini..."
                          rows={2}
                          className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none transition resize-none leading-relaxed text-slate-700"
                        />
                        <p className="text-[10px] text-slate-400 italic px-1">
                          *Deskripsi ini akan muncul di Rapor jika nilai sumatif siswa masuk ke rentang ini.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-800 block mb-1">Panduan Pengaturan KKTP:</span>
                    Pastikan rentang nilai tidak tumpang tindih. Sistem akan mengambil deskripsi berdasarkan nilai sumatif tertinggi dan terendah untuk dicantumkan di deskripsi rapor. Gunakan bahasa yang objektif dan konstruktif.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
