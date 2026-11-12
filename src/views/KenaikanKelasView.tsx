import React, { useState, useMemo } from 'react';
import {
  Classroom,
  Student,
  Subject,
  AssessmentScore,
  Attendance,
  HomeroomNote,
  User,
  StudentMutation
} from '../types/erapor';
import {
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Save,
  Check,
  GraduationCap,
  UserPlus,
  ArrowRightLeft,
  Award,
  Search,
  Printer,
  Info,
  X,
  Plus
} from 'lucide-react';
import { SecurityAccessDenied } from '../components/SecurityAccessDenied';
import { sortClassrooms } from '../utils/classroomSort';

interface KenaikanKelasViewProps {
  classrooms: Classroom[];
  students: Student[];
  subjects: Subject[];
  scores: AssessmentScore[];
  attendanceList: Attendance[];
  homeroomNotes: HomeroomNote[];
  mutations?: StudentMutation[];
  onSaveDecisions: (notes: HomeroomNote[]) => void;
  onPromoteStudents: (studentIds: string[], targetClassId: string) => void;
  onSaveMutations?: (mutations: StudentMutation[]) => void;
  onAddStudent?: (student: Student) => void;
  onUpdateStudent?: (student: Student) => void;
  onBatchGraduation?: (graduations: { studentId: string; diplomaNumber: string; graduationDate: string }[]) => void;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  currentUser: User;
}

type TabType = 'kenaikan' | 'kelulusan' | 'siswa-baru' | 'mutasi' | 'alumni';

export const KenaikanKelasView: React.FC<KenaikanKelasViewProps> = ({
  classrooms,
  students,
  subjects,
  scores,
  attendanceList,
  homeroomNotes,
  mutations = [],
  onSaveDecisions,
  onPromoteStudents,
  onSaveMutations,
  onAddStudent,
  onUpdateStudent,
  onBatchGraduation,
  academicYear,
  semester,
  currentUser
}) => {
  const isWaliKelas = currentUser.role === 'walikelas';
  const authorizedClass = classrooms.find((c) => c.id === currentUser.classId);

  const [activeTab, setActiveTab] = useState<TabType>('kenaikan');
  const [selectedClass, setSelectedClass] = useState<string>(
    isWaliKelas && currentUser.classId ? currentUser.classId : classrooms[0]?.id || 'cls-vii-1'
  );
  const [targetClassId, setTargetClassId] = useState<string>('');
  const [saveToast, setSaveToast] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [promoteSuccessMessage, setPromoteSuccessMessage] = useState<string | null>(null);

  // Filter classrooms according to security role
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

  const currentClassroom = classrooms.find((c) => c.id === selectedClass) || classrooms[0];
  const gradeLevel = currentClassroom?.gradeLevel || '7';

  // Active students for selected class
  const classStudents = students.filter((s) => s.classId === selectedClass && s.status !== 'Lulus' && s.status !== 'Mutasi');

  // Next grade candidate classrooms
  const nextGradeLevel = gradeLevel === '7' ? '8' : gradeLevel === '8' ? '9' : null;
  const targetClassCandidates = useMemo(() => {
    if (!nextGradeLevel) return [];
    return sortedAllClassrooms.filter((c) => c.gradeLevel === nextGradeLevel);
  }, [nextGradeLevel, sortedAllClassrooms]);

  // Default target decision string
  const defaultTargetDecision =
    gradeLevel === '7'
      ? 'Naik ke Kelas VIII'
      : gradeLevel === '8'
      ? 'Naik ke Kelas IX'
      : 'Lulus';

  // State for decisions
  const [decisions, setDecisions] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    classStudents.forEach((std) => {
      const hn = homeroomNotes.find((n) => n.studentId === std.id && n.semester === semester);
      map[std.id] =
        hn?.promotionDecision && hn.promotionDecision !== 'Belum Ditentukan'
          ? hn.promotionDecision
          : defaultTargetDecision;
    });
    return map;
  });

  // State for Graduation inputs (Grade 9)
  const [diplomaNumbers, setDiplomaNumbers] = useState<Record<string, string>>({});
  const [graduationDate, setGraduationDate] = useState('2027-06-19');

  // State for New Student Registration
  const [newStudent, setNewStudent] = useState({
    nisn: '',
    nis: '',
    name: '',
    gender: 'L' as 'L' | 'P',
    birthPlace: 'Rangsang',
    birthDate: '2014-07-15',
    religion: 'Islam',
    classId: visibleClassrooms[0]?.id || 'cls-vii-1',
    parentName: '',
    parentPhone: '',
    address: 'Kec. Rangsang, Kab. Kepulauan Meranti'
  });
  const [studentSavedNotice, setStudentSavedNotice] = useState(false);

  // State for Mutation Registration
  const [mutationForm, setMutationForm] = useState({
    type: 'Keluar' as 'Masuk' | 'Keluar',
    studentId: '',
    studentName: '',
    nisn: '',
    schoolName: '',
    letterNumber: '421.3/SMPN1-RGS/2027/',
    date: new Date().toISOString().split('T')[0],
    reason: 'Ikut kepindahan orang tua'
  });
  const [mutationSuccessToast, setMutationSuccessToast] = useState(false);

  // Alumni Search state
  const [alumniSearch, setAlumniSearch] = useState('');

  // Handle single decision change
  const handleDecisionChange = (studentId: string, val: string) => {
    setDecisions((prev) => ({ ...prev, [studentId]: val }));
  };

  // Save homeroom notes & decisions
  const handleSaveDecisions = () => {
    const updatedNotes: HomeroomNote[] = classStudents.map((std) => {
      const existing = homeroomNotes.find((n) => n.studentId === std.id && n.semester === semester);
      return {
        id: existing?.id || `hn-${std.id}-${academicYear}-${semester}`,
        studentId: std.id,
        classId: selectedClass,
        academicYear,
        semester,
        growthNote: existing?.growthNote || 'Menunjukkan kemandirian belajar dan berakhlak mulia.',
        achievementNote: existing?.achievementNote || '-',
        suggestions: existing?.suggestions || 'Pertahankan ketekunan dan terus tingkatkan prestasi belajar.',
        promotionDecision: (decisions[std.id] || defaultTargetDecision) as any
      };
    });

    onSaveDecisions(updatedNotes);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  // Summary counts for confirmation modal
  const promotionSummary = useMemo(() => {
    let naik = 0;
    let tinggal = 0;
    let lulus = 0;
    let tidakLulus = 0;

    classStudents.forEach((std) => {
      const dec = decisions[std.id] || defaultTargetDecision;
      if (dec.startsWith('Naik')) naik++;
      else if (dec.startsWith('Tinggal')) tinggal++;
      else if (dec === 'Lulus') lulus++;
      else if (dec === 'Tidak Lulus') tidakLulus++;
    });

    return { naik, tinggal, lulus, tidakLulus, total: classStudents.length };
  }, [classStudents, decisions, defaultTargetDecision]);

  // Execute promotion
  const handleConfirmExecutePromotion = () => {
    setShowConfirmModal(false);

    if (gradeLevel === '9') {
      // Graduation handling
      const graduatedStudents = classStudents.filter(
        (std) => (decisions[std.id] || 'Lulus') === 'Lulus'
      );

      if (onBatchGraduation) {
        const payload = graduatedStudents.map((std) => ({
          studentId: std.id,
          diplomaNumber: diplomaNumbers[std.id] || `DN-09/SMP/2027/${std.nisn.slice(-6)}`,
          graduationDate
        }));
        onBatchGraduation(payload);
      } else {
        // Fallback update student status
        graduatedStudents.forEach((std) => {
          if (onUpdateStudent) {
            onUpdateStudent({
              ...std,
              status: 'Lulus'
            });
          }
        });
      }

      setPromoteSuccessMessage(
        `Sukses! ${graduatedStudents.length} siswa Kelas IX resmi ditetapkan LULUS dan tercatat ke Riwayat Alumni.`
      );
    } else {
      // Promotion to next grade
      const targetClass = targetClassId || targetClassCandidates[0]?.id;
      if (!targetClass) {
        alert('Silakan pilih rombel tujuan terlebih dahulu.');
        return;
      }

      const passedStudentIds = classStudents
        .filter((std) => (decisions[std.id] || defaultTargetDecision).startsWith('Naik'))
        .map((std) => std.id);

      onPromoteStudents(passedStudentIds, targetClass);
      const targetClassObj = classrooms.find((c) => c.id === targetClass);
      setPromoteSuccessMessage(
        `Sukses! ${passedStudentIds.length} siswa berhasil dinaikkan ke rombel ${targetClassObj?.name || 'tujuan'}. Siswa yang tinggal kelas tetap berada di rombel saat ini.`
      );
    }

    setTimeout(() => setPromoteSuccessMessage(null), 5000);
  };

  // Submit New Student Form
  const handleRegisterNewStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.nisn) {
      alert('Nama dan NISN siswa wajib diisi.');
      return;
    }

    const newStd: Student = {
      id: `std-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      nisn: newStudent.nisn.trim(),
      nis: newStudent.nis.trim() || newStudent.nisn.trim().slice(-5),
      name: newStudent.name.trim().toUpperCase(),
      gender: newStudent.gender,
      pob: newStudent.birthPlace.trim(),
      dob: newStudent.birthDate,
      religion: newStudent.religion as 'Islam' | 'Kristen' | 'Katolik' | 'Hindu' | 'Buddha' | 'Konghucu',
      classId: newStudent.classId,
      fatherName: newStudent.parentName.trim() || 'Orang Tua / Wali',
      motherName: '-',
      fatherJob: 'Wiraswasta',
      motherJob: 'Ibu Rumah Tangga',
      parentPhone: newStudent.parentPhone.trim() || '-',
      address: newStudent.address.trim(),
      status: 'Aktif'
    };

    if (onAddStudent) {
      onAddStudent(newStd);
    }

    setStudentSavedNotice(true);
    setNewStudent({
      nisn: '',
      nis: '',
      name: '',
      gender: 'L',
      birthPlace: 'Rangsang',
      birthDate: '2014-07-15',
      religion: 'Islam',
      classId: visibleClassrooms[0]?.id || 'cls-vii-1',
      parentName: '',
      parentPhone: '',
      address: 'Kec. Rangsang, Kab. Kepulauan Meranti'
    });
    setTimeout(() => setStudentSavedNotice(false), 4000);
  };

  // Submit Mutation Form
  const handleRegisterMutation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mutationForm.studentName || !mutationForm.schoolName) {
      alert('Nama siswa dan nama sekolah wajib diisi.');
      return;
    }

    const mutType = mutationForm.type === 'Masuk' ? 'masuk' : 'keluar';
    const activeCls = classrooms.find((c) => c.id === selectedClass);
    const newMut: StudentMutation = {
      id: `mut-${Date.now()}`,
      studentId: mutationForm.studentId || `std-mut-${Date.now()}`,
      studentName: mutationForm.studentName.trim().toUpperCase(),
      nisn: mutationForm.nisn.trim(),
      type: mutType,
      date: mutationForm.date,
      previousSchool: mutType === 'masuk' ? mutationForm.schoolName.trim() : undefined,
      targetSchool: mutType === 'keluar' ? mutationForm.schoolName.trim() : undefined,
      classId: activeCls?.id || 'cls-vii-1',
      className: activeCls?.name || 'Kelas VII.1',
      letterNumber: mutationForm.letterNumber.trim(),
      reason: mutationForm.reason.trim(),
      academicYear,
      semester,
      notes: `Dicatat oleh ${currentUser.name}`
    };

    const updated = [newMut, ...mutations];
    if (onSaveMutations) {
      onSaveMutations(updated);
    }

    // If mutasi keluar, set student status to 'Mutasi'
    if (mutationForm.type === 'Keluar' && mutationForm.studentId) {
      const found = students.find((s) => s.id === mutationForm.studentId);
      if (found && onUpdateStudent) {
        onUpdateStudent({ ...found, status: 'Mutasi' });
      }
    }

    setMutationSuccessToast(true);
    setMutationForm({
      type: 'Keluar',
      studentId: '',
      studentName: '',
      nisn: '',
      schoolName: '',
      letterNumber: '421.3/SMPN1-RGS/2027/',
      date: new Date().toISOString().split('T')[0],
      reason: 'Ikut kepindahan orang tua'
    });
    setTimeout(() => setMutationSuccessToast(false), 4000);
  };

  // Filtered Alumni list
  const alumniList = useMemo(() => {
    return students.filter((s) => {
      const isAlumni = s.status === 'Lulus' || s.classId === 'cls-alumni';
      if (!isAlumni) return false;
      if (!alumniSearch) return true;
      const q = alumniSearch.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.nisn.toLowerCase().includes(q) ||
        (s.nis && s.nis.toLowerCase().includes(q))
      );
    });
  }, [students, alumniSearch]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Kenaikan Kelas, Kelulusan & Mutasi Siswa
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengelolaan kenaikan jenjang (VII &rarr; VIII &rarr; IX), kelulusan peserta didik Kelas IX, pendaftaran siswa baru, dan mutasi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {saveToast && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold animate-in fade-in">
              <Check className="w-4 h-4" />
              Keputusan Rapat Berhasil Disimpan!
            </div>
          )}

          {promoteSuccessMessage && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold animate-in fade-in">
              <Check className="w-4 h-4" />
              {promoteSuccessMessage}
            </div>
          )}

          {activeTab === 'kenaikan' && (
            <>
              <button
                onClick={handleSaveDecisions}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
              >
                <Save className="w-4 h-4" />
                Simpan Keputusan Rapat
              </button>

              {currentUser.role === 'admin' && (
                <button
                  onClick={() => setShowConfirmModal(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
                  title="Eksekusi kenaikan kelas ke rombel tujuan"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Eksekusi Promosi Rombel
                </button>
              )}
            </>
          )}

          {activeTab === 'kelulusan' && currentUser.role === 'admin' && (
            <button
              onClick={() => setShowConfirmModal(true)}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
            >
              <Award className="w-4 h-4" />
              Tetapkan Kelulusan Kelas IX
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-semibold gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('kenaikan')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition ${
            activeTab === 'kenaikan'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Kenaikan Kelas (VII & VIII)
        </button>

        <button
          onClick={() => setActiveTab('kelulusan')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition ${
            activeTab === 'kelulusan'
              ? 'border-purple-600 text-purple-600 bg-purple-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          Kelulusan Siswa (Kelas IX)
        </button>

        <button
          onClick={() => setActiveTab('siswa-baru')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition ${
            activeTab === 'siswa-baru'
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Pendaftaran Siswa Baru
        </button>

        <button
          onClick={() => setActiveTab('mutasi')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition ${
            activeTab === 'mutasi'
              ? 'border-amber-600 text-amber-600 bg-amber-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          Mutasi Masuk & Keluar
        </button>

        <button
          onClick={() => setActiveTab('alumni')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition ${
            activeTab === 'alumni'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Data & Riwayat Alumni
        </button>
      </div>

      {/* TAB 1: KENAIKAN KELAS */}
      {activeTab === 'kenaikan' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Pilih Rombel:</span>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-300 font-bold bg-white text-slate-800"
                >
                  {visibleClassrooms
                    .filter((c) => c.gradeLevel === '7' || c.gradeLevel === '8')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Tingkat {c.gradeLevel})
                      </option>
                    ))}
                </select>
              </div>

              {currentUser.role === 'admin' && targetClassCandidates.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">&rarr; Rombel Tujuan:</span>
                  <select
                    value={targetClassId || targetClassCandidates[0]?.id}
                    onChange={(e) => setTargetClassId(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-emerald-300 font-bold bg-emerald-50 text-emerald-900"
                  >
                    {targetClassCandidates.map((tc) => (
                      <option key={tc.id} value={tc.id}>
                        {tc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Kriteria: Rata-rata &ge; KKTP (75) &bull; Alpa &le; 5 Hari &bull; Sikap Baik
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-center">No</th>
                    <th className="px-4 py-3">NISN</th>
                    <th className="px-4 py-3">Nama Lengkap Siswa</th>
                    <th className="px-4 py-3 text-center">Rata-rata Nilai</th>
                    <th className="px-4 py-3 text-center">Alpa</th>
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
                        ? Math.round(stdScores.reduce((a, b) => a + b.finalScore, 0) / stdScores.length)
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
                              Memenuhi Syarat Naik Kelas
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Perlu Pertimbangan Khusus
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={decisionVal}
                            onChange={(e) => handleDecisionChange(std.id, e.target.value)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-xs bg-white text-slate-800 focus:ring-1 focus:ring-blue-500"
                          >
                            {gradeLevel === '7' ? (
                              <>
                                <option value="Naik ke Kelas VIII">Naik ke Kelas VIII</option>
                                <option value="Tinggal di Kelas VII">Tinggal di Kelas VII</option>
                              </>
                            ) : (
                              <>
                                <option value="Naik ke Kelas IX">Naik ke Kelas IX</option>
                                <option value="Tinggal di Kelas VIII">Tinggal di Kelas VIII</option>
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
      )}

      {/* TAB 2: KELULUSAN KELAS IX */}
      {activeTab === 'kelulusan' && (
        <div className="space-y-4">
          <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 flex flex-wrap gap-4 items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-purple-900">Rombel Kelas IX:</span>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-2 rounded-lg border border-purple-300 font-bold bg-white text-slate-800"
              >
                {sortedAllClassrooms
                  .filter((c) => c.gradeLevel === '9')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-semibold text-purple-900">Tanggal Kelulusan Resmi:</span>
              <input
                type="date"
                value={graduationDate}
                onChange={(e) => setGraduationDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-purple-300 bg-white font-semibold text-slate-800"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-center">No</th>
                    <th className="px-4 py-3">NISN</th>
                    <th className="px-4 py-3">Nama Siswa</th>
                    <th className="px-4 py-3 text-center">Status Kelulusan</th>
                    <th className="px-4 py-3">Nomor Ijazah / SKL</th>
                    <th className="px-4 py-3 text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students
                    .filter((s) => s.classId === selectedClass && s.status !== 'Mutasi')
                    .map((std, idx) => {
                      const dec = decisions[std.id] || 'Lulus';
                      const defaultDip = `DN-09/SMP/2027/${std.nisn.slice(-6)}`;
                      const dipVal = diplomaNumbers[std.id] ?? defaultDip;

                      return (
                        <tr key={std.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-4 py-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                          <td className="px-4 py-3 font-mono text-slate-600">{std.nisn}</td>
                          <td className="px-4 py-3 font-bold text-slate-800">{std.name}</td>
                          <td className="px-4 py-3 text-center">
                            <select
                              value={dec}
                              onChange={(e) => handleDecisionChange(std.id, e.target.value)}
                              className={`px-3 py-1 rounded-lg border font-bold text-xs ${
                                dec === 'Lulus'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : 'bg-rose-50 text-rose-800 border-rose-300'
                              }`}
                            >
                              <option value="Lulus">LULUS</option>
                              <option value="Tidak Lulus">TIDAK LULUS</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={dipVal}
                              onChange={(e) =>
                                setDiplomaNumbers((prev) => ({ ...prev, [std.id]: e.target.value }))
                              }
                              placeholder="DN-09/SMP/..."
                              className="px-2.5 py-1 w-52 rounded border border-slate-300 font-mono text-xs"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              Siap Alumni
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PENDAFTARAN SISWA BARU */}
      {activeTab === 'siswa-baru' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs max-w-4xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                Formulir Pendaftaran Siswa Baru (Kelas VII)
              </h2>
              <p className="text-xs text-slate-500">
                Pencatatan data induk siswa baru tingkat VII untuk tahun ajaran aktif secara terpusat.
              </p>
            </div>
            {studentSavedNotice && (
              <div className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold animate-in fade-in flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                Siswa Berhasil Ditambahkan ke Database!
              </div>
            )}
          </div>

          <form onSubmit={handleRegisterNewStudent} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  NISN (10 Digit) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={newStudent.nisn}
                  onChange={(e) => setNewStudent({ ...newStudent, nisn: e.target.value })}
                  placeholder="Contoh: 0134567890"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">NIS Lokal Sekolah</label>
                <input
                  type="text"
                  value={newStudent.nis}
                  onChange={(e) => setNewStudent({ ...newStudent, nis: e.target.value })}
                  placeholder="Contoh: 2601"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Lengkap Siswa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  placeholder="Nama lengkap sesuai akta kelahiran..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                <select
                  value={newStudent.gender}
                  onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value as 'L' | 'P' })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                >
                  <option value="L">Laki-laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Agama</label>
                <select
                  value={newStudent.religion}
                  onChange={(e) => setNewStudent({ ...newStudent, religion: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                >
                  <option value="Islam">Islam</option>
                  <option value="Kristen Protestan">Kristen Protestan</option>
                  <option value="Katolik">Katolik</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Buddha">Buddha</option>
                  <option value="Konghucu">Konghucu</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tempat Lahir</label>
                <input
                  type="text"
                  value={newStudent.birthPlace}
                  onChange={(e) => setNewStudent({ ...newStudent, birthPlace: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Lahir</label>
                <input
                  type="date"
                  value={newStudent.birthDate}
                  onChange={(e) => setNewStudent({ ...newStudent, birthDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rombel Penempatan</label>
                <select
                  value={newStudent.classId}
                  onChange={(e) => setNewStudent({ ...newStudent, classId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold bg-white"
                >
                  {sortedAllClassrooms
                    .filter((c) => c.gradeLevel === '7')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Orang Tua / Wali</label>
                <input
                  type="text"
                  value={newStudent.parentName}
                  onChange={(e) => setNewStudent({ ...newStudent, parentName: e.target.value })}
                  placeholder="Nama ayah / ibu..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Alamat Tinggal Siswa</label>
                <textarea
                  rows={2}
                  value={newStudent.address}
                  onChange={(e) => setNewStudent({ ...newStudent, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                Daftarkan Siswa Baru
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: MUTASI MASUK & KELUAR */}
      {activeTab === 'mutasi' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Pendaftaran Mutasi */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-amber-600" />
                  Catat Mutasi Siswa
                </h3>
              </div>

              {mutationSuccessToast && (
                <div className="p-2 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  Data mutasi berhasil disimpan!
                </div>
              )}

              <form onSubmit={handleRegisterMutation} className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jenis Mutasi</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMutationForm({ ...mutationForm, type: 'Keluar' })}
                      className={`py-1.5 rounded-lg font-bold border text-center ${
                        mutationForm.type === 'Keluar'
                          ? 'bg-rose-50 text-rose-700 border-rose-300'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      Pindah Keluar
                    </button>
                    <button
                      type="button"
                      onClick={() => setMutationForm({ ...mutationForm, type: 'Masuk' })}
                      className={`py-1.5 rounded-lg font-bold border text-center ${
                        mutationForm.type === 'Masuk'
                          ? 'bg-blue-50 text-blue-700 border-blue-300'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      Pindah Masuk
                    </button>
                  </div>
                </div>

                {mutationForm.type === 'Keluar' ? (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Pilih Siswa Terdaftar</label>
                    <select
                      value={mutationForm.studentId}
                      onChange={(e) => {
                        const s = students.find((std) => std.id === e.target.value);
                        setMutationForm({
                          ...mutationForm,
                          studentId: e.target.value,
                          studentName: s?.name || '',
                          nisn: s?.nisn || ''
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold bg-white"
                    >
                      <option value="">-- Pilih Siswa yang Pindah --</option>
                      {students
                        .filter((s) => s.status !== 'Mutasi' && s.status !== 'Lulus')
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.nisn})
                          </option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Nama Siswa Baru Masuk</label>
                      <input
                        type="text"
                        value={mutationForm.studentName}
                        onChange={(e) => setMutationForm({ ...mutationForm, studentName: e.target.value })}
                        placeholder="Nama siswa..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold uppercase"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">NISN Siswa</label>
                      <input
                        type="text"
                        value={mutationForm.nisn}
                        onChange={(e) => setMutationForm({ ...mutationForm, nisn: e.target.value })}
                        placeholder="NISN..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {mutationForm.type === 'Keluar' ? 'Sekolah Tujuan Pindah' : 'Sekolah Asal'}
                  </label>
                  <input
                    type="text"
                    required
                    value={mutationForm.schoolName}
                    onChange={(e) => setMutationForm({ ...mutationForm, schoolName: e.target.value })}
                    placeholder="Contoh: SMPN 2 Selatpanjang..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor Surat Mutasi</label>
                  <input
                    type="text"
                    value={mutationForm.letterNumber}
                    onChange={(e) => setMutationForm({ ...mutationForm, letterNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Surat / Mutasi</label>
                  <input
                    type="date"
                    value={mutationForm.date}
                    onChange={(e) => setMutationForm({ ...mutationForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Alasan Kepindahan</label>
                  <input
                    type="text"
                    value={mutationForm.reason}
                    onChange={(e) => setMutationForm({ ...mutationForm, reason: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition shadow-xs"
                >
                  Simpan Catatan Mutasi
                </button>
              </form>
            </div>

            {/* Riwayat Mutasi Siswa */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-slate-600" />
                  Buku Catatan Mutasi Siswa ({mutations.length} Transaksi)
                </h3>
              </div>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5 text-center">No</th>
                      <th className="px-3 py-2.5">Tanggal</th>
                      <th className="px-3 py-2.5 text-center">Tipe</th>
                      <th className="px-3 py-2.5">Nama Siswa</th>
                      <th className="px-3 py-2.5">Sekolah Terkait</th>
                      <th className="px-3 py-2.5">No. Surat</th>
                      <th className="px-3 py-2.5">Alasan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mutations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                          Belum ada catatan mutasi siswa.
                        </td>
                      </tr>
                    ) : (
                      mutations.map((mut, idx) => (
                        <tr key={mut.id} className="hover:bg-slate-50 transition">
                          <td className="px-3 py-2.5 text-center text-slate-500">{idx + 1}</td>
                          <td className="px-3 py-2.5 font-medium text-slate-700">{mut.date}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                mut.type === 'masuk'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {mut.type}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-bold text-slate-800">{mut.studentName}</td>
                          <td className="px-3 py-2.5 text-slate-600">
                            {mut.targetSchool || mut.previousSchool || '-'}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">
                            {mut.letterNumber}
                          </td>
                          <td className="px-3 py-2.5 text-slate-500">{mut.reason}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DATA ALUMNI */}
      {activeTab === 'alumni' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center justify-between text-xs">
            <div className="relative w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={alumniSearch}
                onChange={(e) => setAlumniSearch(e.target.value)}
                placeholder="Cari nama alumni atau NISN..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 font-medium"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Total Alumni Tercatat:</span>
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-black border border-indigo-200">
                {alumniList.length} Siswa
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-center">No</th>
                    <th className="px-4 py-3">NISN</th>
                    <th className="px-4 py-3">Nama Alumni</th>
                    <th className="px-4 py-3">Tempat, Tanggal Lahir</th>
                    <th className="px-4 py-3">Orang Tua / Wali</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {alumniList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        Belum ada data alumni yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    alumniList.map((std, idx) => (
                      <tr key={std.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 text-center text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{std.nisn}</td>
                        <td className="px-4 py-3 font-bold text-slate-800">{std.name}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {std.pob}, {std.dob}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{std.fatherName || std.motherName || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Lulus (Alumni)
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL PRE-EXECUTION */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Konfirmasi Eksekusi {gradeLevel === '9' ? 'Kelulusan' : 'Kenaikan Kelas'}
              </h3>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Anda akan memproses status resmi untuk peserta didik pada rombel{' '}
              <strong>{currentClassroom?.name}</strong>. Silakan periksa ringkasan keputusan berikut sebelum melanjutkan:
            </p>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-600">Total Siswa Terdaftar:</span>
                <span className="font-bold text-slate-900">{promotionSummary.total} Siswa</span>
              </div>
              {gradeLevel === '9' ? (
                <>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-emerald-700 font-semibold">Ditetapkan Lulus:</span>
                    <span className="font-bold text-emerald-700">{promotionSummary.lulus} Siswa</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-rose-700 font-semibold">Tidak Lulus:</span>
                    <span className="font-bold text-rose-700">{promotionSummary.tidakLulus} Siswa</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-emerald-700 font-semibold">Naik ke Jenjang Berikutnya:</span>
                    <span className="font-bold text-emerald-700">{promotionSummary.naik} Siswa</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-amber-700 font-semibold">Tinggal di Tingkat Ini:</span>
                    <span className="font-bold text-amber-700">{promotionSummary.tinggal} Siswa</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-slate-200/60">
                    <span className="text-slate-600">Rombel Penempatan Tujuan:</span>
                    <span className="font-bold text-blue-700">
                      {classrooms.find((c) => c.id === (targetClassId || targetClassCandidates[0]?.id))?.name || '-'}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                Data riwayat akademik di tahun ajaran sebelumnya tetap tersimpan utuh dan tidak akan hilang atau terhapus.
              </span>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-semibold text-xs text-slate-700 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmExecutePromotion}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                Lanjutkan & Eksekusi Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
