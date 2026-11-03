import React, { useState } from 'react';
import {
  Classroom,
  Student,
  Subject,
  AssessmentScore,
  Attendance,
  HomeroomNote,
  User
} from '../types/erapor';
import { TrendingUp, CheckCircle2, AlertTriangle, ShieldCheck, Save, Check, ArrowRight, Lock } from 'lucide-react';
import { SecurityAccessDenied } from '../components/SecurityAccessDenied';
import { sortClassrooms } from '../utils/classroomSort';

interface KenaikanKelasViewProps {
  classrooms: Classroom[];
  students: Student[];
  subjects: Subject[];
  scores: AssessmentScore[];
  attendanceList: Attendance[];
  homeroomNotes: HomeroomNote[];
  onSaveDecisions: (notes: HomeroomNote[]) => void;
  onPromoteStudents: (studentIds: string[], targetClassId: string) => void;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  currentUser: User;
}

export const KenaikanKelasView: React.FC<KenaikanKelasViewProps> = ({
  classrooms,
  students,
  subjects,
  scores,
  attendanceList,
  homeroomNotes,
  onSaveDecisions,
  onPromoteStudents,
  academicYear,
  semester,
  currentUser
}) => {
  const isWaliKelas = currentUser.role === 'walikelas';
  const authorizedClass = classrooms.find((c) => c.id === currentUser.classId);

  const [selectedClass, setSelectedClass] = useState<string>(
    isWaliKelas && currentUser.classId ? currentUser.classId : classrooms[0]?.id || 'cls-vii-1'
  );
  const [saveToast, setSaveToast] = useState(false);
  const [promoteSuccess, setPromoteSuccess] = useState(false);

  // Security check: if Wali Kelas attempts to access another class
  const isUnauthorized = isWaliKelas && currentUser.classId && selectedClass !== currentUser.classId;
  const attemptedClass = isUnauthorized ? classrooms.find((c) => c.id === selectedClass) : null;

  if (isUnauthorized) {
    return (
      <SecurityAccessDenied
        currentUser={currentUser}
        authorizedClassroom={authorizedClass}
        targetClassroom={attemptedClass}
        onResetToAuthorizedClass={() => setSelectedClass(currentUser.classId || '')}
      />
    );
  }

  const sortedAllClassrooms = sortClassrooms(classrooms);

  const visibleClassrooms = isWaliKelas
    ? sortedAllClassrooms.filter((c) => c.id === currentUser.classId)
    : sortedAllClassrooms;

  const classroom = classrooms.find((c) => c.id === selectedClass) || classrooms[0];
  const classStudents = students.filter((s) => s.classId === selectedClass);
  const gradeLevel = classroom.gradeLevel;

  // Next grade target options
  const defaultTargetDecision =
    gradeLevel === '7'
      ? 'Naik ke Kelas VIII'
      : gradeLevel === '8'
      ? 'Naik ke Kelas IX'
      : 'Lulus';

  // Local state for decisions
  const [decisions, setDecisions] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    classStudents.forEach((std) => {
      const hn = homeroomNotes.find((n) => n.studentId === std.id && n.semester === semester);
      map[std.id] = hn?.promotionDecision && hn.promotionDecision !== 'Belum Ditentukan'
        ? hn.promotionDecision
        : defaultTargetDecision;
    });
    return map;
  });

  const handleDecisionChange = (studentId: string, val: string) => {
    setDecisions({
      ...decisions,
      [studentId]: val
    });
  };

  const handleSaveDecisions = () => {
    const updatedNotes: HomeroomNote[] = classStudents.map((std) => {
      const existing = homeroomNotes.find((n) => n.studentId === std.id && n.semester === semester);
      return {
        id: existing?.id || `hn-${std.id}-${academicYear}-${semester}`,
        studentId: std.id,
        classId: selectedClass,
        academicYear,
        semester,
        growthNote: existing?.growthNote || 'Menunjukkan perkembangan karakter yang baik.',
        achievementNote: existing?.achievementNote || '-',
        suggestions: existing?.suggestions || 'Tingkatkan motivasi belajar.',
        promotionDecision: (decisions[std.id] || defaultTargetDecision) as any
      };
    });

    onSaveDecisions(updatedNotes);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  const handleExecutePromotion = () => {
    // Find candidate target classroom
    const targetGrade = gradeLevel === '7' ? '8' : gradeLevel === '8' ? '9' : null;
    if (!targetGrade) {
      alert('Untuk siswa Kelas 9 yang lulus, status akan diubah menjadi Alumni/Lulus.');
      return;
    }

    const candidateClass = classrooms.find((c) => c.gradeLevel === targetGrade);
    if (!candidateClass) {
      alert(`Belum tersedia rombel untuk Kelas ${targetGrade}. Buat rombel terlebih dahulu di menu Rombongan Belajar.`);
      return;
    }

    const passedStudentIds = classStudents
      .filter((std) => decisions[std.id]?.startsWith('Naik'))
      .map((std) => std.id);

    onPromoteStudents(passedStudentIds, candidateClass.id);
    setPromoteSuccess(true);
    setTimeout(() => setPromoteSuccess(false), 4000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Penetapan Kenaikan Kelas & Kelulusan Siswa
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Keputusan resmi dewan guru dan kepala sekolah mengenai kenaikan kelas (Kelas 7 ke 8, Kelas 8 ke 9) atau kelulusan siswa Kelas 9.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {saveToast && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold animate-in fade-in">
              <Check className="w-4 h-4" />
              Keputusan Berhasil Disimpan!
            </div>
          )}

          {promoteSuccess && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold animate-in fade-in">
              <Check className="w-4 h-4" />
              Siswa Berhasil Dipromosikan ke Rombel Berikutnya!
            </div>
          )}

          <button
            onClick={handleSaveDecisions}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
          >
            <Save className="w-4 h-4" />
            Simpan Keputusan Rapat
          </button>

          {currentUser.role === 'admin' && (
            <button
              onClick={handleExecutePromotion}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
              title="Pindahkan siswa yang naik kelas ke rombel tahun ajaran baru"
            >
              <ShieldCheck className="w-4 h-4" />
              Proses Naikkan Siswa
            </button>
          )}
        </div>
      </div>

      {/* Selectors */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <span className="font-semibold text-slate-700">Pilih Rombel:</span>
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

        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <span>Kriteria: Nilai tuntas KKTP &bull; Kehadiran &ge; 85% &bull; Sikap Baik</span>
        </div>
      </div>

      {/* Decision Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-center">No</th>
                <th className="px-4 py-3">NISN</th>
                <th className="px-4 py-3">Nama Lengkap Siswa</th>
                <th className="px-4 py-3 text-center">Rata-rata Nilai</th>
                <th className="px-4 py-3 text-center">Alpa (Hari)</th>
                <th className="px-4 py-3">Rekomendasi Sistem</th>
                <th className="px-4 py-3">Keputusan Resmi Sekolah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classStudents.map((std, idx) => {
                const stdScores = scores.filter(
                  (sc) => sc.studentId === std.id && sc.academicYear === academicYear && sc.semester === semester
                );
                const att = attendanceList.find(
                  (a) => a.studentId === std.id && a.academicYear === academicYear && a.semester === semester
                );

                const avg =
                  stdScores.length > 0
                    ? Math.round(
                        stdScores.reduce((a, b) => a + b.finalScore, 0) / stdScores.length
                      )
                    : 0;

                const alpaCount = att?.alpa ?? 0;
                const isRecommended = avg >= 75 && alpaCount <= 5;
                const decisionVal = decisions[std.id] || defaultTargetDecision;

                return (
                  <tr key={std.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{std.nisn}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{std.name}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">
                      {avg > 0 ? avg : '-'}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">
                      <span className={alpaCount > 3 ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                        {alpaCount} hari
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isRecommended ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Direkomendasikan {defaultTargetDecision}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Perlu Pertimbangan Rapat
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={decisionVal}
                        onChange={(e) => handleDecisionChange(std.id, e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-xs bg-white text-slate-800 focus:ring-1 focus:ring-blue-500"
                      >
                        {gradeLevel === '7' && (
                          <>
                            <option value="Naik ke Kelas VIII">Naik ke Kelas VIII</option>
                            <option value="Tinggal di Kelas VII">Tinggal di Kelas VII</option>
                          </>
                        )}
                        {gradeLevel === '8' && (
                          <>
                            <option value="Naik ke Kelas IX">Naik ke Kelas IX</option>
                            <option value="Tinggal di Kelas VIII">Tinggal di Kelas VIII</option>
                          </>
                        )}
                        {gradeLevel === '9' && (
                          <>
                            <option value="Lulus">Lulus</option>
                            <option value="Tidak Lulus">Tidak Lulus</option>
                          </>
                        )}
                      </select>
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
