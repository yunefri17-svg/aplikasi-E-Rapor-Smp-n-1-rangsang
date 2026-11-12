import React, { useState, useMemo, useEffect } from 'react';
import {
  Student,
  Classroom,
  Subject,
  AssessmentScore,
  SchoolProfile,
  User,
  HomeroomNote
} from '../types/erapor';
import {
  FileSpreadsheet,
  Printer,
  Search,
  TrendingUp,
  Award,
  CheckCircle2,
  Calendar,
  ChevronRight,
  BarChart3,
  LineChart,
  UserCheck,
  BookOpen,
  Info,
  Edit3,
  Save,
  Wand2,
  RotateCcw,
  Check,
  Sparkles
} from 'lucide-react';
import { sortClassrooms } from '../utils/classroomSort';
import { sortStudentsAlphabetically } from '../utils/studentSort';
import { sortSubjects } from '../utils/subjectSort';

interface TranskripNilaiViewProps {
  school: SchoolProfile;
  students: Student[];
  classrooms: Classroom[];
  subjects: Subject[];
  scores: AssessmentScore[];
  homeroomNotes: HomeroomNote[];
  currentUser: User;
  onSaveScores?: (newScores: AssessmentScore[]) => void;
}

export const TranskripNilaiView: React.FC<TranskripNilaiViewProps> = ({
  school,
  students,
  classrooms,
  subjects,
  scores,
  homeroomNotes,
  currentUser,
  onSaveScores
}) => {
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [activeStudentId, setActiveStudentId] = useState<string>(students[0]?.id || '');
  const [selectedSubjectForChart, setSelectedSubjectForChart] = useState<string>('all');
  
  // Edit mode & manual score override states
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [manualScores, setManualScores] = useState<Record<string, (number | null)[]>>({});
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);
  const [autoFillModalOpen, setAutoFillModalOpen] = useState(false);
  const [autoFillTargetScore, setAutoFillTargetScore] = useState<number>(80);

  const sortedClassrooms = useMemo(() => sortClassrooms(classrooms), [classrooms]);
  const sortedSubjectsList = useMemo(() => sortSubjects(subjects), [subjects]);

  // Filter students list
  const filteredStudents = useMemo(() => {
    return sortStudentsAlphabetically(
      students.filter((std) => {
        const matchesSearch =
          std.name.toLowerCase().includes(search.toLowerCase()) ||
          std.nisn.includes(search) ||
          std.nis.includes(search);
        const matchesClass = selectedClass === 'all' || std.classId === selectedClass;
        return matchesSearch && matchesClass;
      })
    );
  }, [students, search, selectedClass]);

  // Active student
  const currentStudent = useMemo(() => {
    return students.find((s) => s.id === activeStudentId) || filteredStudents[0] || students[0];
  }, [students, activeStudentId, filteredStudents]);

  const currentClass = useMemo(() => {
    return classrooms.find((c) => c.id === currentStudent?.classId);
  }, [classrooms, currentStudent]);

  // Current grade level of student (e.g. '7', '8', or '9')
  const currentGradeNum = useMemo(() => {
    return parseInt(currentClass?.gradeLevel || '7');
  }, [currentClass]);

  // Dynamic semester definitions based on student's current grade
  // If student is in Kelas VII in 2026/2027:
  // Sm 1 = Kelas VII Ganjil (2026/2027)
  // Sm 2 = Kelas VII Genap (2026/2027)
  // Sm 3 = Kelas VIII Ganjil (2027/2028)
  // Sm 4 = Kelas VIII Genap (2027/2028)
  // Sm 5 = Kelas IX Ganjil (2028/2029)
  // Sm 6 = Kelas IX Genap (2028/2029)
  const semesterDefinitions = useMemo(() => {
    const activeStartYear = parseInt(school.activeAcademicYear.split('/')[0]) || 2026;
    const grade7Year = activeStartYear - (currentGradeNum - 7);
    const grade8Year = grade7Year + 1;
    const grade9Year = grade7Year + 2;

    return [
      { semNum: 1, label: 'Sm 1', classLabel: 'Kelas VII', gradeLevel: '7', semester: 'Ganjil' as const, academicYear: `${grade7Year}/${grade7Year + 1}` },
      { semNum: 2, label: 'Sm 2', classLabel: 'Kelas VII', gradeLevel: '7', semester: 'Genap' as const, academicYear: `${grade7Year}/${grade7Year + 1}` },
      { semNum: 3, label: 'Sm 3', classLabel: 'Kelas VIII', gradeLevel: '8', semester: 'Ganjil' as const, academicYear: `${grade8Year}/${grade8Year + 1}` },
      { semNum: 4, label: 'Sm 4', classLabel: 'Kelas VIII', gradeLevel: '8', semester: 'Genap' as const, academicYear: `${grade8Year}/${grade8Year + 1}` },
      { semNum: 5, label: 'Sm 5', classLabel: 'Kelas IX', gradeLevel: '9', semester: 'Ganjil' as const, academicYear: `${grade9Year}/${grade9Year + 1}` },
      { semNum: 6, label: 'Sm 6', classLabel: 'Kelas IX', gradeLevel: '9', semester: 'Genap' as const, academicYear: `${grade9Year}/${grade9Year + 1}` }
    ];
  }, [currentGradeNum, school.activeAcademicYear]);

  // Helper function to extract exact semester index (0 to 5) for a score
  const getSemesterIndexForScore = (sc: AssessmentScore): number | null => {
    // 1. Determine grade level of the score's classroom
    const scoreClass = classrooms.find((c) => c.id === sc.classId);
    let grade = scoreClass?.gradeLevel;

    // Fallback if class not found: check if current student is in this grade
    if (!grade) {
      if (sc.classId.includes('vii') || sc.classId.includes('7')) grade = '7';
      else if (sc.classId.includes('viii') || sc.classId.includes('8')) grade = '8';
      else if (sc.classId.includes('ix') || sc.classId.includes('9')) grade = '9';
      else grade = currentClass?.gradeLevel || '7';
    }

    if (grade === '7') {
      return sc.semester === 'Ganjil' ? 0 : 1;
    } else if (grade === '8') {
      return sc.semester === 'Ganjil' ? 2 : 3;
    } else if (grade === '9') {
      return sc.semester === 'Ganjil' ? 4 : 5;
    }

    return null;
  };

  // Synchronize manual edit state whenever active student changes
  useEffect(() => {
    if (!currentStudent) return;

    const studentScores = scores.filter((s) => s.studentId === currentStudent.id);
    const initialMap: Record<string, (number | null)[]> = {};

    sortedSubjectsList.forEach((sub) => {
      const subjectScores = studentScores.filter((s) => s.subjectId === sub.id);
      const semArr: (number | null)[] = [null, null, null, null, null, null];

      subjectScores.forEach((sc) => {
        const idx = getSemesterIndexForScore(sc);
        if (idx !== null && sc.finalScore !== undefined && sc.finalScore !== null) {
          semArr[idx] = sc.finalScore;
        }
      });

      initialMap[sub.id] = semArr;
    });

    setManualScores(initialMap);
  }, [currentStudent?.id, scores, sortedSubjectsList, classrooms, currentClass]);

  // Compute student grades matrix
  const transcriptMatrix = useMemo(() => {
    if (!currentStudent) return [];

    return sortedSubjectsList.map((sub, idx) => {
      const semScores = manualScores[sub.id] || [null, null, null, null, null, null];
      const validValues = semScores.filter((v): v is number => v !== null && v > 0);
      const avg = validValues.length > 0 ? Math.round(validValues.reduce((a, b) => a + b, 0) / validValues.length) : null;

      return {
        number: idx + 1,
        subjectId: sub.id,
        subjectName: sub.name,
        category: sub.category,
        semScores,
        average: avg
      };
    });
  }, [currentStudent, manualScores, sortedSubjectsList]);

  // Overall Cumulative Average
  const cumulativeStats = useMemo(() => {
    const validAverages = transcriptMatrix.map((r) => r.average).filter((v): v is number => v !== null);
    if (validAverages.length === 0) return { overallAvg: 0, totalSubjects: 0 };
    const sum = validAverages.reduce((a, b) => a + b, 0);
    return {
      overallAvg: Math.round(sum / validAverages.length),
      totalSubjects: validAverages.length
    };
  }, [transcriptMatrix]);

  // Chart data points across semesters
  const semesterAverages = useMemo(() => {
    return semesterDefinitions.map((sem, sIdx) => {
      let values: number[] = [];
      if (selectedSubjectForChart === 'all') {
        values = transcriptMatrix
          .map((r) => r.semScores[sIdx])
          .filter((v): v is number => v !== null && v > 0);
      } else {
        const row = transcriptMatrix.find((r) => r.subjectId === selectedSubjectForChart);
        const val = row?.semScores[sIdx];
        if (val !== null && val !== undefined && val > 0) values.push(val);
      }

      const avg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
      return {
        label: `${sem.classLabel} ${sem.label}`,
        avg
      };
    });
  }, [transcriptMatrix, semesterDefinitions, selectedSubjectForChart]);

  // Handle cell value change in Edit Mode
  const handleScoreChange = (subjectId: string, semIndex: number, valStr: string) => {
    const val = valStr === '' ? null : Math.min(100, Math.max(0, parseInt(valStr) || 0));
    setManualScores((prev) => {
      const currentArr = prev[subjectId] ? [...prev[subjectId]] : [null, null, null, null, null, null];
      currentArr[semIndex] = val;
      return {
        ...prev,
        [subjectId]: currentArr
      };
    });
  };

  // Auto-fill feature: copy current grades or fill missing semesters
  const handleAutoFillRemainingSemesters = (mode: 'copy-current' | 'target-kktp') => {
    if (!currentStudent) return;

    setManualScores((prev) => {
      const nextMap = { ...prev };

      sortedSubjectsList.forEach((sub) => {
        const arr = nextMap[sub.id] ? [...nextMap[sub.id]] : [null, null, null, null, null, null];
        
        // Find existing value in array
        const existingVal = arr.find((v) => v !== null && v > 0) || autoFillTargetScore;

        for (let i = 0; i < 6; i++) {
          if (arr[i] === null || arr[i] === undefined || arr[i] === 0) {
            if (mode === 'copy-current') {
              // Copy existing value with slight natural variation (+- 1 or 2)
              const variation = (i % 2 === 0 ? 1 : -1) * (i > 0 ? 1 : 0);
              arr[i] = Math.min(98, Math.max(75, existingVal + variation));
            } else {
              // Target KKTP with variation
              arr[i] = Math.min(95, Math.max(75, autoFillTargetScore + ((i % 3) - 1)));
            }
          }
        }
        nextMap[sub.id] = arr;
      });

      return nextMap;
    });

    setAutoFillModalOpen(false);
  };

  // Save changes to database and Cloud Firestore
  const handleSaveAllScores = () => {
    if (!currentStudent || !onSaveScores) return;

    const newScoresToSave: AssessmentScore[] = [];

    sortedSubjectsList.forEach((sub) => {
      const arr = manualScores[sub.id] || [];

      arr.forEach((scoreVal, sIdx) => {
        if (scoreVal !== null && scoreVal > 0) {
          const semDef = semesterDefinitions[sIdx];
          
          // Find classroom for this grade level
          const targetClass = classrooms.find((c) => c.gradeLevel === semDef.gradeLevel) || currentClass || classrooms[0];
          
          // Existing score if any
          const existingScore = scores.find(
            (s) =>
              s.studentId === currentStudent.id &&
              s.subjectId === sub.id &&
              s.semester === semDef.semester &&
              (s.academicYear === semDef.academicYear || classrooms.find((c) => c.id === s.classId)?.gradeLevel === semDef.gradeLevel)
          );

          const predicate = scoreVal >= 90 ? 'A' : scoreVal >= 80 ? 'B' : scoreVal >= 70 ? 'C' : 'D';

          const scoreRecord: AssessmentScore = {
            id: existingScore?.id || `sc-${currentStudent.id}-${sub.id}-${semDef.academicYear.replace(/\//g, '-')}-${semDef.semester}`,
            studentId: currentStudent.id,
            studentName: currentStudent.name,
            subjectId: sub.id,
            subjectName: sub.name,
            classId: targetClass.id,
            className: targetClass.name,
            academicYear: semDef.academicYear,
            semester: semDef.semester,
            finalScore: scoreVal,
            sumatifAkhirSemester: scoreVal,
            predicate,
            formatifScores: existingScore?.formatifScores || {},
            sumatifMateriScores: existingScore?.sumatifMateriScores || {},
            highestCompetenceDesc: existingScore?.highestCompetenceDesc || 'Menunjukkan pemahaman yang sangat baik dalam capaian materi pembelajaran.',
            lowestCompetenceDesc: existingScore?.lowestCompetenceDesc || '',
            updatedAt: existingScore?.updatedAt || new Date().toISOString()
          };

          newScoresToSave.push(scoreRecord);
        }
      });
    });

    onSaveScores(newScoresToSave);
    setSaveSuccessToast(true);
    setIsEditMode(false);
    setTimeout(() => setSaveSuccessToast(false), 4000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Transkrip Nilai Rapor & Riwayat Perkembangan Siswa
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Rekapitulasi resmi pencapaian nilai rapor peserta didik semester 1 s/d 6 (Kelas VII, VIII, dan IX) SMP NEGERI 1 RANGSANG.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {saveSuccessToast && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold animate-in fade-in">
              <Check className="w-4 h-4" />
              Nilai Transkrip Berhasil Disimpan & Tersinkron!
            </div>
          )}

          {/* Toggle Edit Mode button */}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              isEditMode
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            {isEditMode ? 'Mode Pratinjau Cetak' : 'Edit / Input Nilai S1 - S6'}
          </button>

          {isEditMode && (
            <>
              <button
                onClick={() => setAutoFillModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
              >
                <Wand2 className="w-4 h-4" />
                Isi Otomatis S1 - S6
              </button>

              <button
                onClick={handleSaveAllScores}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
              >
                <Save className="w-4 h-4" />
                Simpan Nilai Transkrip
              </button>
            </>
          )}

          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
          >
            <Printer className="w-4 h-4" />
            Cetak Transkrip Resmi (PDF)
          </button>
        </div>
      </div>

      {/* Selectors Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center justify-between print:hidden">
        <div className="flex flex-wrap items-center gap-3 text-xs flex-1">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari Siswa..."
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
              <option value="all">Semua Rombel</option>
              {sortedClassrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Student Select dropdown */}
          <div className="flex items-center gap-1.5 flex-1 min-w-[240px]">
            <span className="font-semibold text-slate-600">Pilih Siswa:</span>
            <select
              value={activeStudentId}
              onChange={(e) => setActiveStudentId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold bg-white text-slate-900 focus:ring-2 focus:ring-blue-500"
            >
              {filteredStudents.map((std) => {
                const cls = classrooms.find((c) => c.id === std.classId);
                return (
                  <option key={std.id} value={std.id}>
                    {std.name} ({std.nisn}) - {cls?.name}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Information Banner for Edit Mode */}
      {isEditMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <strong>Mode Edit Nilai Transkrip Aktif:</strong> Anda dapat mengedit langsung nilai angka (0 - 100) di setiap kolom semester Sm 1 sampai Sm 6, atau menggunakan tombol <em>"Isi Otomatis S1 - S6"</em>.
            </div>
          </div>
          <button
            onClick={() => handleAutoFillRemainingSemesters('copy-current')}
            className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 shrink-0 transition"
          >
            ⚡ Salin Nilai Semester Berjalan ke S1-S6
          </button>
        </div>
      )}

      {currentStudent && (
        <div className="space-y-6">
          {/* Visual Trend Chart Card (Hidden on print) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">
                    Grafik Perkembangan Capaian Belajar per Semester ({currentStudent.name})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Tren hasil belajar dari semester 1 (Kelas VII) sampai semester 6 (Kelas IX)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Filter Mapel:</span>
                <select
                  value={selectedSubjectForChart}
                  onChange={(e) => setSelectedSubjectForChart(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 font-semibold bg-white text-slate-800 text-xs"
                >
                  <option value="all">Rerata Seluruh Mapel</option>
                  {sortedSubjectsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Visual Bars / Chart representation */}
            <div className="grid grid-cols-6 gap-3 pt-2">
              {semesterAverages.map((pt, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <div className="h-28 w-full bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-end p-2 relative group hover:bg-slate-100/70 transition">
                    {pt.avg !== null ? (
                      <div
                        className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-lg transition-all flex items-center justify-center text-white text-[10px] font-bold shadow-xs"
                        style={{ height: `${Math.min(100, Math.max(18, pt.avg))}%` }}
                      >
                        {pt.avg}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-[10px] text-slate-300 italic">
                        -
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 text-center leading-tight">
                    {pt.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Official Printable Transcript Sheet */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
            {/* Kop Surat Resmi */}
            <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1 relative">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                PEMERINTAH KABUPATEN KEPULAUAN MERANTI
              </div>
              <div className="text-xs font-bold text-slate-800 uppercase">
                DINAS PENDIDIKAN DAN KEBUDAYAAN
              </div>
              <div className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight">
                {school.name}
              </div>
              <div className="text-[10px] text-slate-600">
                NPSN: {school.npsn} {school.nss ? `• NSS: ${school.nss}` : ''} • Alamat: {school.address}, Kec. {school.kecamatan}, Kab. {school.kabupaten} - {school.provinsi}
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center pt-2">
              <h2 className="text-base font-black text-slate-900 uppercase tracking-wider inline-block border-b-2 border-slate-900 pb-1">
                TRANSKRIP NILAI HASIL BELAJAR PESERTA DIDIK
              </h2>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                Nomor Dokumen: {school.npsn}/TR-SMP/{currentStudent.nisn}/{school.activeAcademicYear.replace('/', '')}
              </div>
            </div>

            {/* Student Metadata Box */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs text-slate-800 pt-1 pb-2 border-b border-slate-200">
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Nama Peserta Didik:</span>
                <span className="font-extrabold uppercase text-slate-900">{currentStudent.name}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Nomor Induk Siswa (NIS):</span>
                <span className="font-mono font-bold">{currentStudent.nis}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">NISN:</span>
                <span className="font-mono font-bold">{currentStudent.nisn}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Rombongan Belajar:</span>
                <span className="font-semibold text-blue-700">{currentClass?.name || 'Kelas VII.1'}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Tempat, Tanggal Lahir:</span>
                <span className="font-medium">{currentStudent.pob}, {currentStudent.dob}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Sekolah Asal:</span>
                <span className="font-medium">{currentStudent.previousSchool || 'SD Negeri di Riau'}</span>
              </div>
            </div>

            {/* Transcript Matrix Table */}
            <div className="overflow-x-auto border border-slate-300 rounded-lg">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-800 font-extrabold border-b-2 border-slate-300">
                  <tr>
                    <th className="px-2.5 py-2.5 text-center w-10 border-r border-slate-300" rowSpan={2}>No</th>
                    <th className="px-3 py-2.5 border-r border-slate-300" rowSpan={2}>Mata Pelajaran (Kurikulum Merdeka)</th>
                    <th className="px-2 py-1.5 text-center border-r border-slate-300 bg-slate-50" colSpan={2}>Kelas VII</th>
                    <th className="px-2 py-1.5 text-center border-r border-slate-300 bg-slate-50" colSpan={2}>Kelas VIII</th>
                    <th className="px-2 py-1.5 text-center border-r border-slate-300 bg-slate-50" colSpan={2}>Kelas IX</th>
                    <th className="px-3 py-2.5 text-center w-16 bg-blue-50/70 text-blue-900 font-black border-l border-slate-300" rowSpan={2}>
                      Rata-Rata
                    </th>
                  </tr>
                  <tr className="border-t border-slate-200 text-[11px] font-bold text-slate-600 bg-slate-50">
                    <th className="px-2 py-1.5 text-center w-14 border-r border-slate-200">Sm 1</th>
                    <th className="px-2 py-1.5 text-center w-14 border-r border-slate-300">Sm 2</th>
                    <th className="px-2 py-1.5 text-center w-14 border-r border-slate-200">Sm 3</th>
                    <th className="px-2 py-1.5 text-center w-14 border-r border-slate-300">Sm 4</th>
                    <th className="px-2 py-1.5 text-center w-14 border-r border-slate-200">Sm 5</th>
                    <th className="px-2 py-1.5 text-center w-14 border-r border-slate-300">Sm 6</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {transcriptMatrix.map((row) => (
                    <tr key={row.subjectId} className="hover:bg-slate-50 transition">
                      <td className="px-2.5 py-2 text-center text-slate-400 font-semibold border-r border-slate-200">{row.number}</td>
                      <td className="px-3 py-2 font-medium text-slate-800 border-r border-slate-200">
                        {row.subjectName}
                      </td>
                      {row.semScores.map((sc, sIdx) => (
                        <td
                          key={sIdx}
                          className="px-2 py-1.5 text-center font-bold text-slate-800 border-r border-slate-200"
                        >
                          {isEditMode ? (
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={sc !== null ? sc : ''}
                              onChange={(e) => handleScoreChange(row.subjectId, sIdx, e.target.value)}
                              placeholder="-"
                              className="w-12 px-1 py-1 rounded border border-blue-300 text-center font-mono text-xs bg-white focus:ring-1 focus:ring-blue-500"
                            />
                          ) : (
                            sc !== null && sc > 0 ? sc : <span className="text-slate-300 font-normal">-</span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center font-black text-blue-700 bg-blue-50/30 border-l border-slate-200">
                        {row.average !== null ? row.average : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-black border-t-2 border-slate-300 text-xs text-slate-900">
                  <tr>
                    <td colSpan={8} className="px-4 py-2.5 text-right uppercase tracking-wider">
                      Rata-Rata Nilai Kumulatif Seluruh Mata Pelajaran:
                    </td>
                    <td className="px-3 py-2.5 text-center text-sm font-black text-blue-700 bg-blue-100/70 border-l border-slate-300">
                      {cumulativeStats.overallAvg || '-'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Note & Authenticity Box */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
              <strong>Keterangan:</strong> Transkrip nilai ini merupakan dokumen resmi yang sah diterbitkan oleh SMP NEGERI 1 RANGSANG untuk keperluan administrasi akademik, pemantauan riwayat belajar, dan kelanjutan pendidikan ke jenjang SMA/SMK/sederajat.
            </div>

            {/* Signatures */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-800">
              <div>
                <div className="font-semibold text-slate-500 mb-1">Mengetahui,</div>
                <div className="font-bold">Wali Kelas / Guru Pembimbing</div>
                <div className="h-16"></div>
                <div className="font-black underline">{currentUser.name}</div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {currentUser.nip ? `NIP. ${currentUser.nip}` : 'Tenaga Pendidik SMPN 1 Rangsang'}
                </div>
              </div>

              <div className="text-right">
                <div className="text-slate-500 mb-1">{school.reportPlace || 'Tanjung Samak'}, {school.reportDate}</div>
                <div className="font-bold">Kepala SMP NEGERI 1 RANGSANG</div>
                <div className="h-16"></div>
                <div className="font-black underline text-sm">{school.headmasterName}</div>
                <div className="text-[11px] text-slate-500 font-mono">NIP. {school.headmasterNip}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Fill Modal Dialog */}
      {autoFillModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-purple-600" />
                Isi Otomatis Nilai S1 sampai S6
              </h3>
              <button
                onClick={() => setAutoFillModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Pilih metode pengisian otomatis nilai transkrip untuk melengkapi seluruh semester (Sm 1 s/d Sm 6) siswa <strong>{currentStudent?.name}</strong>:
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleAutoFillRemainingSemesters('copy-current')}
                className="w-full text-left p-3 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 transition space-y-1"
              >
                <div className="font-bold text-xs text-blue-900 flex items-center justify-between">
                  <span>1. Salin dari Capaian Semester Saat Ini</span>
                  <span className="text-[10px] bg-blue-200 text-blue-800 px-2 py-0.5 rounded font-black">Direkomendasikan</span>
                </div>
                <div className="text-[11px] text-blue-700">
                  Menggunakan nilai mata pelajaran yang sudah ada (misal PAI: 90, B.Indo: 83) untuk mengisi semester yang masih kosong.
                </div>
              </button>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="font-bold text-xs text-slate-800">
                  2. Isi Standar KKTP Rata-rata
                </div>
                <div className="text-[11px] text-slate-500">
                  Tentukan target nilai tuntas untuk seluruh semester yang kosong:
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="number"
                    min={75}
                    max={100}
                    value={autoFillTargetScore}
                    onChange={(e) => setAutoFillTargetScore(parseInt(e.target.value) || 75)}
                    className="w-20 px-2 py-1 rounded border border-slate-300 font-bold text-xs text-center"
                  />
                  <button
                    type="button"
                    onClick={() => handleAutoFillRemainingSemesters('target-kktp')}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition"
                  >
                    Terapkan Nilai Standar
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setAutoFillModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
