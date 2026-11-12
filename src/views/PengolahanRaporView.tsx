import React, { useState } from 'react';
import {
  Classroom,
  Student,
  Subject,
  AssessmentScore,
  Attendance,
  StudentExtracurricular,
  HomeroomNote,
  User
} from '../types/erapor';
import { FileCheck, CheckCircle2, AlertCircle, Edit3, Save, Check, Printer, ArrowRight, Lock, TrendingUp } from 'lucide-react';
import { MenuId } from '../components/layout/Sidebar';
import { SecurityAccessDenied } from '../components/SecurityAccessDenied';
import { sortClassrooms } from '../utils/classroomSort';

interface PengolahanRaporViewProps {
  classrooms: Classroom[];
  students: Student[];
  subjects: Subject[];
  scores: AssessmentScore[];
  attendanceList: Attendance[];
  studentExtracurriculars: StudentExtracurricular[];
  homeroomNotes: HomeroomNote[];
  onSaveHomeroomNotes: (notes: HomeroomNote[]) => void;
  onNavigateToPrint: (studentId?: string) => void;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  currentUser: User;
}

export const PengolahanRaporView: React.FC<PengolahanRaporViewProps> = ({
  classrooms,
  students,
  subjects,
  scores,
  attendanceList,
  studentExtracurriculars,
  homeroomNotes,
  onSaveHomeroomNotes,
  onNavigateToPrint,
  academicYear,
  semester,
  currentUser
}) => {
  const isWaliKelas = currentUser.role === 'walikelas';
  const authorizedClass = classrooms.find((c) => c.id === currentUser.classId);

  const sortedClassrooms = sortClassrooms(classrooms);

  const visibleClassrooms = isWaliKelas
    ? sortedClassrooms.filter((c) => c.id === currentUser.classId)
    : sortedClassrooms;

  const [selectedClass, setSelectedClass] = useState<string>(
    isWaliKelas && currentUser.classId ? currentUser.classId : sortedClassrooms[0]?.id || 'cls-vii-1'
  );
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState(false);

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

  const classStudents = students.filter((s) => s.classId === selectedClass);
  const currentClassObj = classrooms.find((c) => c.id === selectedClass);
  const gradeLevel = currentClassObj?.gradeLevel || '7';
  const defaultTargetDecision =
    gradeLevel === '7'
      ? 'Naik ke Kelas VIII'
      : gradeLevel === '8'
      ? 'Naik ke Kelas IX'
      : 'Lulus';

  // Local state for homeroom notes
  const [notesState, setNotesState] = useState<Record<string, HomeroomNote>>(() => {
    const map: Record<string, HomeroomNote> = {};
    homeroomNotes.forEach((hn) => {
      if (hn.academicYear === academicYear && hn.semester === semester) {
        map[hn.studentId] = { ...hn };
      }
    });
    return map;
  });

  const getOrInitNote = (studentId: string): HomeroomNote => {
    if (notesState[studentId]) return notesState[studentId];
    const cleanYear = (academicYear || '').replace(/\//g, '_');
    return {
      id: `hn-${studentId}-${cleanYear}-${semester}`,
      studentId,
      classId: selectedClass,
      academicYear,
      semester,
      growthNote: 'Menunjukkan perkembangan karakter dan kedisiplinan yang baik selama proses pembelajaran.',
      achievementNote: '-',
      suggestions: 'Tingkatkan konsistensi belajar mandiri di rumah dan perluas membaca buku referensi.',
      promotionDecision: defaultTargetDecision as any
    };
  };

  const handleUpdateNote = (studentId: string, field: keyof HomeroomNote, val: any) => {
    const cur = getOrInitNote(studentId);
    setNotesState({
      ...notesState,
      [studentId]: {
        ...cur,
        [field]: val
      }
    });
  };

  const handleSaveAllNotes = () => {
    const allNotes: HomeroomNote[] = classStudents.map((std) => getOrInitNote(std.id));
    onSaveHomeroomNotes(allNotes);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-blue-600" />
            Pengolahan & Verifikasi Kelengkapan Rapor
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pemeriksaan kelengkapan nilai mata pelajaran, absensi, ekskul, dan pengisian catatan wali kelas sebelum penerbitan rapor.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saveToast && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold animate-in fade-in">
              <Check className="w-4 h-4" />
              Catatan Wali Kelas Berhasil Disimpan!
            </div>
          )}

          <button
            onClick={handleSaveAllNotes}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
          >
            <Save className="w-4 h-4" />
            Simpan Catatan Wali Kelas
          </button>
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

        <div className="text-xs font-medium text-slate-600">
          Semester Aktif: <strong>{semester}</strong> &bull; TP: <strong>{academicYear}</strong>
        </div>
      </div>

      {/* Verification Matrix & Homeroom Notes list */}
      <div className="space-y-4">
        {classStudents.map((std, idx) => {
          const stdScores = scores.filter(
            (sc) =>
              sc.studentId === std.id &&
              sc.academicYear === academicYear &&
              sc.semester === semester
          );
          const stdAttendance = attendanceList.find(
            (a) => a.studentId === std.id && a.academicYear === academicYear && a.semester === semester
          );
          const stdEkskul = studentExtracurriculars.filter(
            (e) => e.studentId === std.id && e.academicYear === academicYear && e.semester === semester
          );

          const isMapelComplete = stdScores.length >= subjects.length;
          const isAttComplete = stdAttendance !== undefined;
          const isEkskulComplete = stdEkskul.length > 0;
          const isReady = isMapelComplete && isAttComplete;

          const note = getOrInitNote(std.id);

          return (
            <div
              key={std.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 hover:border-blue-300 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{std.name}</h3>
                    <p className="text-[11px] font-mono text-slate-500">
                      NISN: {std.nisn} &bull; NIS: {std.nis}
                    </p>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      isMapelComplete
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    Nilai Mapel: {stdScores.length}/{subjects.length}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      isAttComplete
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    Absensi: {isAttComplete ? 'Terisi' : 'Belum'}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      isReady
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {isReady ? 'Siap Cetak' : 'Menunggu Entri'}
                  </span>

                  <button
                    onClick={() => onNavigateToPrint(std.id)}
                    className="ml-2 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Cetak Rapor
                  </button>
                </div>
              </div>

              {/* Homeroom Notes Form */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Catatan Perkembangan Karakter & Sikap:
                  </label>
                  <textarea
                    rows={3}
                    value={note.growthNote}
                    onChange={(e) => handleUpdateNote(std.id, 'growthNote', e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                    placeholder="Catatan perkembangan..."
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Prestasi / Penghargaan yang Diraih:
                  </label>
                  <textarea
                    rows={3}
                    value={note.achievementNote}
                    onChange={(e) => handleUpdateNote(std.id, 'achievementNote', e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                    placeholder="Prestasi akademik / non-akademik..."
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Saran & Pesan Pembinaan Wali Kelas:
                  </label>
                  <textarea
                    rows={3}
                    value={note.suggestions}
                    onChange={(e) => handleUpdateNote(std.id, 'suggestions', e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                    placeholder="Saran untuk siswa & orang tua..."
                  />
                </div>
              </div>

              {/* Keputusan Kenaikan Kelas / Kelulusan (Semester 2 / Genap) */}
              {semester === 'Genap' && (
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                  <div>
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      Keputusan Kenaikan Kelas / Kelulusan (Semester 2 / Genap):
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Otomatis dicetak resmi pada bagian E. Keputusan Kenaikan Kelas lembar rapor siswa.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={note.promotionDecision && note.promotionDecision !== 'Belum Ditentukan' ? note.promotionDecision : defaultTargetDecision}
                      onChange={(e) => handleUpdateNote(std.id, 'promotionDecision', e.target.value)}
                      className={`px-3 py-1.5 rounded-lg border font-bold text-xs bg-white shadow-xs focus:ring-2 focus:ring-blue-500 ${
                        (note.promotionDecision || '').startsWith('Tinggal') || (note.promotionDecision || '').startsWith('Tidak')
                          ? 'border-rose-300 text-rose-700 bg-rose-50/50'
                          : 'border-emerald-300 text-emerald-800 bg-emerald-50/50'
                      }`}
                    >
                      {gradeLevel === '7' ? (
                        <>
                          <option value="Naik ke Kelas VIII">Naik ke Kelas VIII (Rekomendasi Otomatis)</option>
                          <option value="Tinggal di Kelas VII">Tinggal di Kelas VII</option>
                        </>
                      ) : gradeLevel === '8' ? (
                        <>
                          <option value="Naik ke Kelas IX">Naik ke Kelas IX (Rekomendasi Otomatis)</option>
                          <option value="Tinggal di Kelas VIII">Tinggal di Kelas VIII</option>
                        </>
                      ) : (
                        <>
                          <option value="Lulus">Lulus dari Satuan Pendidikan (Rekomendasi Otomatis)</option>
                          <option value="Tidak Lulus">Tidak Lulus</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
