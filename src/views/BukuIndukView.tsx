import React, { useState, useMemo } from 'react';
import {
  Student,
  Classroom,
  Subject,
  AssessmentScore,
  Attendance,
  Extracurricular,
  StudentExtracurricular,
  HomeroomNote,
  SchoolProfile,
  User,
  StudentMutation,
  StudentAchievement,
  KokurikulerProject
} from '../types/erapor';
import {
  BookOpen,
  Search,
  Printer,
  FileText,
  UserCheck,
  Calendar,
  GraduationCap,
  Award,
  Activity,
  History,
  CheckCircle2,
  ChevronRight,
  X,
  Filter,
  Download,
  Users
} from 'lucide-react';
import { sortClassrooms } from '../utils/classroomSort';
import { sortStudentsAlphabetically } from '../utils/studentSort';
import { sortSubjects } from '../utils/subjectSort';

interface BukuIndukViewProps {
  school: SchoolProfile;
  students: Student[];
  classrooms: Classroom[];
  subjects: Subject[];
  scores: AssessmentScore[];
  attendanceList: Attendance[];
  extracurriculars: Extracurricular[];
  studentExtracurriculars: StudentExtracurricular[];
  homeroomNotes: HomeroomNote[];
  studentMutations?: StudentMutation[];
  studentAchievements?: StudentAchievement[];
  kokurikulerProjects?: KokurikulerProject[];
  currentUser: User;
}

export const BukuIndukView: React.FC<BukuIndukViewProps> = ({
  school,
  students,
  classrooms,
  subjects,
  scores,
  attendanceList,
  extracurriculars,
  studentExtracurriculars,
  homeroomNotes,
  studentMutations = [],
  studentAchievements = [],
  kokurikulerProjects = [],
  currentUser
}) => {
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedYearJoined, setSelectedYearJoined] = useState<string>('all');
  const [activeStudentId, setActiveStudentId] = useState<string | null>(() => students[0]?.id || null);
  const [isBatchPrintMode, setIsBatchPrintMode] = useState(false);

  const sortedClassrooms = useMemo(() => sortClassrooms(classrooms), [classrooms]);
  const sortedSubjects = useMemo(() => sortSubjects(subjects), [subjects]);

  // Available admission years
  const availableYearsJoined = useMemo(() => {
    const setYears = new Set<string>();
    students.forEach((s) => {
      const year = s.acceptedDate ? s.acceptedDate.split('-')[0] : (s.dob ? `${parseInt(s.dob.split('-')[0]) + 12}` : '2024');
      setYears.add(year);
    });
    return Array.from(setYears).sort().reverse();
  }, [students]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return sortStudentsAlphabetically(
      students.filter((std) => {
        const matchesSearch =
          std.name.toLowerCase().includes(search.toLowerCase()) ||
          std.nisn.includes(search) ||
          std.nis.includes(search);

        const matchesClass = selectedClass === 'all' || std.classId === selectedClass;
        const matchesStatus = selectedStatus === 'all' || std.status === selectedStatus;
        
        const joinYear = std.acceptedDate ? std.acceptedDate.split('-')[0] : '';
        const matchesYear = selectedYearJoined === 'all' || joinYear === selectedYearJoined;

        return matchesSearch && matchesClass && matchesStatus && matchesYear;
      })
    );
  }, [students, search, selectedClass, selectedStatus, selectedYearJoined]);

  // Selected student for detail / print
  const activeStudent = useMemo(() => {
    return students.find((s) => s.id === activeStudentId) || null;
  }, [students, activeStudentId]);

  // Get full historical grades for a student (Semester 1 to 6)
  const getStudentGrades = (studentId: string) => {
    const studentScores = scores.filter((s) => s.studentId === studentId);
    return studentScores;
  };

  // Get student attendance across all semesters
  const getStudentAttendance = (studentId: string) => {
    return attendanceList.filter((a) => a.studentId === studentId);
  };

  // Get extracurriculars
  const getStudentEkskuls = (studentId: string) => {
    return studentExtracurriculars.filter((se) => se.studentId === studentId);
  };

  // Get student achievements
  const getStudentAchievementsList = (studentId: string) => {
    return studentAchievements.filter((sa) => sa.studentId === studentId);
  };

  // Get student mutation
  const getStudentMutationRecord = (studentId: string) => {
    return studentMutations.find((m) => m.studentId === studentId);
  };

  // Get homeroom notes / promotion history
  const getStudentNotes = (studentId: string) => {
    return homeroomNotes.filter((hn) => hn.studentId === studentId);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Buku Induk Register Peserta Didik
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dokumen arsip permanen riwayat pendidikan siswa SMP NEGERI 1 RANGSANG dari kelas VII sampai IX dan kelulusan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeStudent && (
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
            >
              <Printer className="w-4 h-4" />
              Cetak Buku Induk Siswa (PDF)
            </button>
          )}

          <button
            onClick={() => {
              setIsBatchPrintMode(!isBatchPrintMode);
              if (!isBatchPrintMode) setActiveStudentId(null);
            }}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition ${
              isBatchPrintMode
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            {isBatchPrintMode ? 'Kembali ke Tampilan Biasa' : 'Mode Cetak Rombel / Angkatan'}
          </button>
        </div>
      </div>

      {/* Filter Toolbar (Hidden on print) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between print:hidden">
        <div className="flex flex-wrap items-center gap-3 text-xs flex-1">
          {/* Search */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari Nama / NISN / NIS..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Rombel Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600">Rombel:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold bg-white text-slate-800"
            >
              <option value="all">Semua Rombel ({students.length})</option>
              {sortedClassrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold bg-white text-slate-800"
            >
              <option value="all">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Lulus">Lulus / Alumni</option>
              <option value="Mutasi">Mutasi Pindah</option>
              <option value="Keluar">Keluar</option>
            </select>
          </div>

          {/* Tahun Masuk Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600">Tahun Masuk:</span>
            <select
              value={selectedYearJoined}
              onChange={(e) => setSelectedYearJoined(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold bg-white text-slate-800"
            >
              <option value="all">Semua Angkatan</option>
              {availableYearsJoined.map((y) => (
                <option key={y} value={y}>
                  Tahun {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          Ditemukan <span className="text-blue-600 font-bold">{filteredStudents.length}</span> Siswa
        </div>
      </div>

      {/* Main Content Area */}
      {!isBatchPrintMode ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
          {/* Left Student Table (Hidden on print) */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden print:hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex items-center justify-between">
              <span>Daftar Peserta Didik</span>
              <span className="text-[10px] text-slate-500">Klik untuk melihat Buku Induk</span>
            </div>

            <div className="max-h-[680px] overflow-y-auto divide-y divide-slate-100">
              {filteredStudents.map((std, idx) => {
                const cls = classrooms.find((c) => c.id === std.classId);
                const isSelected = activeStudentId === std.id;

                return (
                  <div
                    key={std.id}
                    onClick={() => setActiveStudentId(std.id)}
                    className={`p-3.5 flex items-center justify-between cursor-pointer transition ${
                      isSelected
                        ? 'bg-blue-50/80 border-l-4 border-blue-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-800 text-xs uppercase flex items-center gap-1.5">
                          {std.name}
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            std.status === 'Aktif'
                              ? 'bg-emerald-100 text-emerald-700'
                              : std.status === 'Lulus'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {std.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          NISN: {std.nisn} • NIS: {std.nis} • {cls?.name || 'Rombel -'}
                        </div>
                      </div>
                    </div>

                    <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-300'}`} />
                  </div>
                );
              })}

              {filteredStudents.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                  Tidak ada data peserta didik yang cocok dengan kriteria pencarian.
                </div>
              )}
            </div>
          </div>

          {/* Right Sheet: Formal Buku Induk View */}
          <div className="lg:col-span-7 print:w-full">
            {activeStudent ? (
              <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0">
                {/* Official Letterhead Header */}
                <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1 relative">
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    PEMERINTAH KABUPATEN KEPULAUAN MERANTI
                  </div>
                  <div className="text-xs font-bold text-slate-800 uppercase">
                    DINAS PENDIDIKAN DAN KEBUDAYAAN
                  </div>
                  <div className="text-base md:text-lg font-black text-slate-900 uppercase tracking-tight">
                    {school.name}
                  </div>
                  <div className="text-[10px] text-slate-600">
                    NPSN: {school.npsn} {school.nss ? `• NSS: ${school.nss}` : ''} • Alamat: {school.address}, Kec. {school.kecamatan}, Kab. {school.kabupaten} - {school.provinsi}
                  </div>
                </div>

                <div className="text-center pt-2">
                  <h2 className="text-sm md:text-base font-black text-slate-900 uppercase tracking-wide inline-block border-b-2 border-slate-800 pb-0.5">
                    LEMBAR BUKU INDUK REGISTER PESERTA DIDIK
                  </h2>
                  <div className="text-[11px] text-slate-600 mt-1">
                    Nomor Induk Siswa Nasional (NISN): <span className="font-mono font-bold text-slate-900">{activeStudent.nisn}</span> • NIS: <span className="font-mono font-bold text-slate-900">{activeStudent.nis}</span>
                  </div>
                </div>

                {/* Section A: Data Pribadi Siswa */}
                <div className="space-y-2 text-xs">
                  <div className="bg-slate-100 px-3 py-1.5 rounded font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">
                    A. Keterangan Tentang Diri Peserta Didik
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-slate-700 pt-1">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">1. Nama Lengkap:</span>
                      <span className="font-bold uppercase text-slate-900">{activeStudent.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">2. Jenis Kelamin:</span>
                      <span className="font-semibold">{activeStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">3. Tempat, Tgl Lahir:</span>
                      <span className="font-semibold">{activeStudent.pob}, {activeStudent.dob}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">4. Agama:</span>
                      <span className="font-semibold">{activeStudent.religion}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">5. Status dlm Keluarga:</span>
                      <span className="font-semibold">{activeStudent.familyStatus || 'Anak Kandung'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">6. Anak Ke:</span>
                      <span className="font-semibold">{activeStudent.childOrder || '1'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 md:col-span-2">
                      <span className="text-slate-500">7. Alamat Tempat Tinggal:</span>
                      <span className="font-medium text-right">{activeStudent.address}</span>
                    </div>
                  </div>
                </div>

                {/* Section B: Data Orang Tua & Wali */}
                <div className="space-y-2 text-xs">
                  <div className="bg-slate-100 px-3 py-1.5 rounded font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">
                    B. Keterangan Orang Tua / Wali Peserta Didik
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-slate-700 pt-1">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">1. Nama Ayah Kandung:</span>
                      <span className="font-bold text-slate-900">{activeStudent.fatherName || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">2. Pekerjaan Ayah:</span>
                      <span className="font-semibold">{activeStudent.fatherJob || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">3. Nama Ibu Kandung:</span>
                      <span className="font-bold text-slate-900">{activeStudent.motherName || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">4. Pekerjaan Ibu:</span>
                      <span className="font-semibold">{activeStudent.motherJob || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">5. Nama Wali (jika ada):</span>
                      <span className="font-semibold">{activeStudent.guardianName || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">6. Nomor Telepon / HP:</span>
                      <span className="font-mono">{activeStudent.parentPhone || activeStudent.guardianPhone || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Section C: Riwayat Penerimaan / Masuk */}
                <div className="space-y-2 text-xs">
                  <div className="bg-slate-100 px-3 py-1.5 rounded font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">
                    C. Keterangan Masuk Sekolah
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-slate-700 pt-1">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">1. Sekolah Asal (SD/MI):</span>
                      <span className="font-semibold">{activeStudent.previousSchool || 'SD Negeri di Kab. Kepulauan Meranti'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">2. Diterima di Kelas:</span>
                      <span className="font-bold text-blue-700">{activeStudent.acceptedClass || 'VII (Tujuh)'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">3. Tanggal Masuk:</span>
                      <span className="font-semibold">{activeStudent.acceptedDate || '15 Juli 2024'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">4. Status Saat Ini:</span>
                      <span className="font-bold text-emerald-700 uppercase">{activeStudent.status}</span>
                    </div>
                  </div>
                </div>

                {/* Section D: Riwayat Nilai Rapor Multi-Semester */}
                <div className="space-y-2 text-xs">
                  <div className="bg-slate-100 px-3 py-1.5 rounded font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center justify-between">
                    <span>D. Riwayat Capaian Nilai Rapor (Semester 1 s/d 6)</span>
                    <span className="text-[10px] font-normal text-slate-500 lowercase">berdasarkan data asli database</span>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-2 py-2 text-center w-8 border-r border-slate-200">No</th>
                          <th className="px-3 py-2 border-r border-slate-200">Mata Pelajaran</th>
                          <th className="px-2 py-2 text-center w-12 border-r border-slate-200">K-7 (1)</th>
                          <th className="px-2 py-2 text-center w-12 border-r border-slate-200">K-7 (2)</th>
                          <th className="px-2 py-2 text-center w-12 border-r border-slate-200">K-8 (1)</th>
                          <th className="px-2 py-2 text-center w-12 border-r border-slate-200">K-8 (2)</th>
                          <th className="px-2 py-2 text-center w-12 border-r border-slate-200">K-9 (1)</th>
                          <th className="px-2 py-2 text-center w-12 border-r border-slate-200">K-9 (2)</th>
                          <th className="px-2 py-2 text-center w-14 bg-blue-50/60 font-black">Rerata</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sortedSubjects.map((sub, idx) => {
                          const studentScores = getStudentGrades(activeStudent.id).filter(
                            (sc) => sc.subjectId === sub.id
                          );

                          // Helper to find score by grade level and semester
                          const getScoreByGradeAndSem = (gradeLvl: string, sem: 'Ganjil' | 'Genap') => {
                            return studentScores.find((sc) => {
                              if (sc.semester !== sem) return false;
                              const cls = classrooms.find((c) => c.id === sc.classId);
                              if (cls?.gradeLevel === gradeLvl) return true;
                              const activeCls = classrooms.find((c) => c.id === activeStudent.classId);
                              if (activeCls?.gradeLevel === gradeLvl && sc.academicYear === school.activeAcademicYear) {
                                return true;
                              }
                              return false;
                            })?.finalScore;
                          };

                          const s1 = getScoreByGradeAndSem('7', 'Ganjil');
                          const s2 = getScoreByGradeAndSem('7', 'Genap');
                          const s3 = getScoreByGradeAndSem('8', 'Ganjil');
                          const s4 = getScoreByGradeAndSem('8', 'Genap');
                          const s5 = getScoreByGradeAndSem('9', 'Ganjil');
                          const s6 = getScoreByGradeAndSem('9', 'Genap');

                          const availableScores = [s1, s2, s3, s4, s5, s6].filter((v): v is number => v !== undefined);
                          const avg = availableScores.length > 0 ? Math.round(availableScores.reduce((a, b) => a + b, 0) / availableScores.length) : '-';

                          return (
                            <tr key={sub.id} className="hover:bg-slate-50">
                              <td className="px-2 py-1.5 text-center text-slate-400 border-r border-slate-100">{idx + 1}</td>
                              <td className="px-3 py-1.5 font-medium text-slate-800 border-r border-slate-100">{sub.name}</td>
                              <td className="px-2 py-1.5 text-center font-bold text-slate-700 border-r border-slate-100">{s1 ?? '-'}</td>
                              <td className="px-2 py-1.5 text-center font-bold text-slate-700 border-r border-slate-100">{s2 ?? '-'}</td>
                              <td className="px-2 py-1.5 text-center font-bold text-slate-700 border-r border-slate-100">{s3 ?? '-'}</td>
                              <td className="px-2 py-1.5 text-center font-bold text-slate-700 border-r border-slate-100">{s4 ?? '-'}</td>
                              <td className="px-2 py-1.5 text-center font-bold text-slate-700 border-r border-slate-100">{s5 ?? '-'}</td>
                              <td className="px-2 py-1.5 text-center font-bold text-slate-700 border-r border-slate-100">{s6 ?? '-'}</td>
                              <td className="px-2 py-1.5 text-center font-black text-blue-700 bg-blue-50/40">{avg}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section E & F: Presensi & Ekstrakurikuler */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Presensi */}
                  <div className="space-y-2">
                    <div className="bg-slate-100 px-3 py-1.5 rounded font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">
                      E. Riwayat Kehadiran Siswa
                    </div>
                    <div className="border border-slate-200 rounded-lg p-3 space-y-1.5">
                      {getStudentAttendance(activeStudent.id).map((att) => (
                        <div key={att.id} className="flex justify-between py-1 border-b border-slate-100 last:border-none text-[11px]">
                          <span className="font-semibold text-slate-700">T.P {att.academicYear} ({att.semester})</span>
                          <span className="text-slate-600">
                            Sakit: <strong className="text-slate-800">{att.sakit}</strong> • Izin: <strong className="text-slate-800">{att.izin}</strong> • Alpa: <strong className="text-slate-800">{att.alpa}</strong> hari
                          </span>
                        </div>
                      ))}
                      {getStudentAttendance(activeStudent.id).length === 0 && (
                        <div className="text-slate-400 italic text-[11px]">Nihil catatan ketidakhadiran (Hadir 100%).</div>
                      )}
                    </div>
                  </div>

                  {/* Prestasi & Ekskul */}
                  <div className="space-y-2">
                    <div className="bg-slate-100 px-3 py-1.5 rounded font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">
                      F. Prestasi & Ekstrakurikuler
                    </div>
                    <div className="border border-slate-200 rounded-lg p-3 space-y-1.5 text-[11px]">
                      {getStudentAchievementsList(activeStudent.id).map((ach) => (
                        <div key={ach.id} className="py-1 border-b border-slate-100 last:border-none">
                          <div className="font-bold text-blue-800">🏆 {ach.title} ({ach.rank})</div>
                          <div className="text-slate-500 text-[10px]">Tingkat {ach.level} • {ach.organizer} ({ach.year})</div>
                        </div>
                      ))}
                      {getStudentEkskuls(activeStudent.id).map((se) => {
                        const ek = extracurriculars.find((e) => e.id === se.extracurricularId);
                        return (
                          <div key={se.id} className="py-1 border-b border-slate-100 last:border-none flex justify-between">
                            <span className="font-medium text-slate-700">{ek?.name || 'Ekstrakurikuler'}</span>
                            <span className="font-bold text-emerald-700">Predikat: {se.predicate}</span>
                          </div>
                        );
                      })}
                      {getStudentAchievementsList(activeStudent.id).length === 0 && getStudentEkskuls(activeStudent.id).length === 0 && (
                        <div className="text-slate-400 italic">Belum ada catatan kegiatan khusus.</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section G: Keputusan Kenaikan / Kelulusan */}
                <div className="space-y-2 text-xs">
                  <div className="bg-slate-100 px-3 py-1.5 rounded font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">
                    G. Keterangan Kenaikan Kelas / Mutasi / Kelulusan
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3 space-y-2 text-[11px]">
                    {getStudentNotes(activeStudent.id).map((n) => (
                      <div key={n.id} className="flex justify-between py-1 border-b border-slate-100 last:border-none">
                        <span className="font-semibold text-slate-700">Tahun Ajaran {n.academicYear} ({n.semester}):</span>
                        <span className="font-bold text-blue-800">{n.promotionDecision || 'Naik Kelas'}</span>
                      </div>
                    ))}
                    {getStudentMutationRecord(activeStudent.id) && (
                      <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900">
                        <strong>Riwayat Mutasi:</strong> {getStudentMutationRecord(activeStudent.id)?.type === 'masuk' ? 'Pindah Masuk' : 'Pindah Keluar'} pada tanggal {getStudentMutationRecord(activeStudent.id)?.date}. {getStudentMutationRecord(activeStudent.id)?.reason} (No. Surat: {getStudentMutationRecord(activeStudent.id)?.letterNumber || '-'})
                      </div>
                    )}
                  </div>
                </div>

                {/* Signature Box */}
                <div className="pt-6 border-t border-slate-200 flex items-end justify-between text-xs text-slate-800">
                  <div className="w-24 h-32 border border-slate-300 rounded flex flex-col items-center justify-center text-slate-400 text-[10px] text-center p-2 bg-slate-50">
                    <span>Pas Foto Siswa 3 x 4 cm</span>
                  </div>

                  <div className="text-right space-y-1">
                    <div>{school.reportPlace || 'Tanjung Samak'}, {school.reportDate}</div>
                    <div className="font-bold">Kepala SMP NEGERI 1 RANGSANG</div>
                    <div className="h-16"></div>
                    <div className="font-black text-sm underline">{school.headmasterName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">NIP. {school.headmasterNip}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <BookOpen className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Pilih Peserta Didik</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Pilih salah satu siswa dari daftar di sebelah kiri untuk melihat rincian riwayat Buku Induk lengkap dan mencetaknya.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Mode Cetak Massal Rombel / Angkatan */
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between text-xs text-amber-900 print:hidden">
            <div>
              <strong>Mode Cetak Massal Buku Induk:</strong> Menampilkan {filteredStudents.length} berkas buku induk siswa dalam format siap cetak dinas.
            </div>
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-4 h-4" />
              Cetak Seluruhnya ({filteredStudents.length} Siswa)
            </button>
          </div>

          <div className="space-y-12">
            {filteredStudents.map((std, sIdx) => (
              <div key={std.id} className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0 print:break-after-page">
                {/* Official Letterhead Header */}
                <div className="border-b-2 border-slate-900 pb-3 text-center space-y-1">
                  <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    PEMERINTAH KABUPATEN KEPULAUAN MERANTI • DINAS PENDIDIKAN DAN KEBUDAYAAN
                  </div>
                  <div className="text-base font-black text-slate-900 uppercase">
                    {school.name}
                  </div>
                  <div className="text-[9px] text-slate-600">
                    NPSN: {school.npsn} • Alamat: {school.address}, Tanjung Samak, Kec. Rangsang, Kab. Kepulauan Meranti
                  </div>
                </div>

                <div className="text-center pt-1">
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide inline-block border-b border-slate-800 pb-0.5">
                    LEMBAR BUKU INDUK REGISTER SISWA ({sIdx + 1}/{filteredStudents.length})
                  </h2>
                  <div className="text-[10px] text-slate-600 mt-0.5">
                    NISN: <span className="font-mono font-bold text-slate-900">{std.nisn}</span> • NIS: <span className="font-mono font-bold text-slate-900">{std.nis}</span>
                  </div>
                </div>

                {/* Section A */}
                <div className="space-y-1 text-xs">
                  <div className="bg-slate-100 px-2.5 py-1 rounded font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">
                    A. Data Pribadi Peserta Didik
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-700 text-[11px] pt-1">
                    <div className="flex justify-between border-b border-slate-100 py-0.5">
                      <span className="text-slate-500">Nama:</span>
                      <span className="font-bold uppercase text-slate-900">{std.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 py-0.5">
                      <span className="text-slate-500">Jenis Kelamin:</span>
                      <span>{std.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 py-0.5">
                      <span className="text-slate-500">Tempat, Tgl Lahir:</span>
                      <span>{std.pob}, {std.dob}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 py-0.5">
                      <span className="text-slate-500">Agama:</span>
                      <span>{std.religion}</span>
                    </div>
                  </div>
                </div>

                {/* Section B */}
                <div className="space-y-1 text-xs">
                  <div className="bg-slate-100 px-2.5 py-1 rounded font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">
                    B. Keterangan Orang Tua / Wali
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-700 text-[11px] pt-1">
                    <div className="flex justify-between border-b border-slate-100 py-0.5">
                      <span className="text-slate-500">Ayah Kandung:</span>
                      <span className="font-bold">{std.fatherName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 py-0.5">
                      <span className="text-slate-500">Pekerjaan Ayah:</span>
                      <span>{std.fatherJob}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 py-0.5">
                      <span className="text-slate-500">Ibu Kandung:</span>
                      <span className="font-bold">{std.motherName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 py-0.5">
                      <span className="text-slate-500">Kontak Telepon:</span>
                      <span className="font-mono">{std.parentPhone}</span>
                    </div>
                  </div>
                </div>

                {/* Section D: Nilai Rerata Singkat */}
                <div className="space-y-1 text-xs">
                  <div className="bg-slate-100 px-2.5 py-1 rounded font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">
                    C. Capaian Rapor Siswa
                  </div>
                  <div className="overflow-x-auto border border-slate-200 rounded">
                    <table className="w-full text-[10px] text-left">
                      <thead className="bg-slate-50 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-2 py-1">No</th>
                          <th className="px-2 py-1">Mata Pelajaran</th>
                          <th className="px-2 py-1 text-center">Nilai Rapor Terakhir</th>
                          <th className="px-2 py-1 text-center">Predikat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sortedSubjects.map((sub, sIdx2) => {
                          const sc = scores.find((s) => s.studentId === std.id && s.subjectId === sub.id);
                          return (
                            <tr key={sub.id}>
                              <td className="px-2 py-1 text-slate-400">{sIdx2 + 1}</td>
                              <td className="px-2 py-1 font-medium">{sub.name}</td>
                              <td className="px-2 py-1 text-center font-bold text-blue-700">{sc?.finalScore || '-'}</td>
                              <td className="px-2 py-1 text-center font-bold">{sc?.predicate || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Signature */}
                <div className="pt-4 border-t border-slate-200 flex justify-between items-end text-[11px]">
                  <div className="w-20 h-24 border border-slate-300 rounded flex items-center justify-center text-slate-400 text-[9px] text-center bg-slate-50">
                    Foto 3x4
                  </div>

                  <div className="text-right">
                    <div>{school.reportPlace || 'Tanjung Samak'}, {school.reportDate}</div>
                    <div className="font-bold">Kepala SMP NEGERI 1 RANGSANG</div>
                    <div className="h-12"></div>
                    <div className="font-black underline">{school.headmasterName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">NIP. {school.headmasterNip}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
