import React, { useState, useEffect, useMemo } from 'react';
import { Classroom, Subject, Student, AssessmentScore, LearningObjective, User, Teacher, TeachingAssignment } from '../types/erapor';
import { FileSignature, Sparkles, Save, Check, Info, CheckCircle2, BookOpen, Settings2, X } from 'lucide-react';
import { SubjectDescriptionBank, getAutomaticDescription, defaultDescriptionBank } from '../utils/descriptionBank';
import { SecurityAccessDenied } from '../components/SecurityAccessDenied';
import { sortClassrooms } from '../utils/classroomSort';
import { sortStudentsAlphabetically } from '../utils/studentSort';

interface DeskripsiNilaiViewProps {
  classrooms: Classroom[];
  subjects: Subject[];
  students: Student[];
  scores: AssessmentScore[];
  learningObjectives: LearningObjective[];
  descriptionBank?: SubjectDescriptionBank[];
  teachers?: Teacher[];
  teachingAssignments?: TeachingAssignment[];
  onSaveScores: (updatedScores: AssessmentScore[]) => void;
  onSaveDescriptionBank: (bank: SubjectDescriptionBank[]) => void;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  currentUser: User;
}

export const DeskripsiNilaiView: React.FC<DeskripsiNilaiViewProps> = ({
  classrooms,
  subjects,
  students,
  scores,
  learningObjectives,
  descriptionBank = defaultDescriptionBank,
  teachers = [],
  teachingAssignments = [],
  onSaveScores,
  onSaveDescriptionBank,
  academicYear,
  semester,
  currentUser
}) => {
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'kepsek';

  // Find teacher profile for current user
  const currentTeacher = useMemo(() => {
    return teachers.find(
      (t) =>
        (currentUser.teacherId && t.id === currentUser.teacherId) ||
        (currentUser.nip && t.nip === currentUser.nip) ||
        (t.name.toLowerCase().includes('fauzi') && currentUser.name.toLowerCase().includes('fauzi')) ||
        (t.name.toLowerCase().includes('nikmatul') && currentUser.name.toLowerCase().includes('nikmatul')) ||
        t.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim()
    );
  }, [teachers, currentUser]);

  // 1. Available subjects for current user based on teaching assignments
  const visibleSubjects = useMemo(() => {
    if (isAdmin) return subjects;
    if (!currentTeacher) return subjects;

    const assignedSubIds = teachingAssignments
      .filter((ta) => ta.teacherId === currentTeacher.id && ta.status !== 'inactive')
      .map((ta) => ta.subjectId);

    const combinedIds = Array.from(new Set([...assignedSubIds, ...(currentTeacher.subjectsTaught || [])]));
    if (combinedIds.length > 0) {
      const filtered = subjects.filter((s) => combinedIds.includes(s.id));
      if (filtered.length > 0) return filtered;
    }
    return subjects;
  }, [isAdmin, currentTeacher, teachingAssignments, subjects]);

  const [selectedSubject, setSelectedSubject] = useState<string>(
    visibleSubjects[0]?.id || subjects[0]?.id || 'sub-mat'
  );

  // Sync selected subject if visibleSubjects changes
  useEffect(() => {
    if (visibleSubjects.length > 0 && !visibleSubjects.some((s) => s.id === selectedSubject)) {
      setSelectedSubject(visibleSubjects[0].id);
    }
  }, [visibleSubjects, selectedSubject]);

  // 2. Available classrooms for the selected subject based on teaching assignments
  const visibleClassrooms = useMemo(() => {
    const sortedAll = sortClassrooms(classrooms);
    if (isAdmin) return sortedAll;
    if (!currentTeacher) return sortedAll;

    const assignedClassIds = teachingAssignments
      .filter(
        (ta) =>
          ta.teacherId === currentTeacher.id &&
          ta.subjectId === selectedSubject &&
          ta.status !== 'inactive'
      )
      .map((ta) => ta.classId);

    if (assignedClassIds.length > 0) {
      return sortedAll.filter((c) => assignedClassIds.includes(c.id));
    }

    if (currentTeacher.isHomeroom && currentTeacher.homeroomClassId) {
      return sortedAll.filter((c) => c.id === currentTeacher.homeroomClassId);
    }

    return sortedAll;
  }, [isAdmin, currentTeacher, teachingAssignments, selectedSubject, classrooms]);

  const [selectedClass, setSelectedClass] = useState<string>(
    visibleClassrooms[0]?.id || classrooms[0]?.id || 'cls-vii-1'
  );

  // Sync selected class when visible classrooms change
  useEffect(() => {
    if (visibleClassrooms.length > 0 && !visibleClassrooms.some((c) => c.id === selectedClass)) {
      setSelectedClass(visibleClassrooms[0].id);
    }
  }, [visibleClassrooms, selectedClass]);

  const [saveToast, setSaveToast] = useState(false);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editableBank, setEditableBank] = useState<SubjectDescriptionBank[]>(descriptionBank);
  const [bankSubId, setBankSubId] = useState<string>(subjects[0]?.id || 'sub-bindo');

  useEffect(() => {
    setEditableBank(descriptionBank);
  }, [descriptionBank]);

  // Security check: if teacher attempts to access a classroom not in their teaching assignments
  const isUnauthorized = !isAdmin && currentTeacher && visibleClassrooms.length > 0 && !visibleClassrooms.some((c) => c.id === selectedClass);
  const attemptedClass = isUnauthorized ? classrooms.find((c) => c.id === selectedClass) : null;
  const authorizedClass = visibleClassrooms[0] || classrooms.find((c) => c.id === currentUser.classId);

  if (isUnauthorized) {
    return (
      <SecurityAccessDenied
        currentUser={currentUser}
        authorizedClassroom={authorizedClass}
        targetClassroom={attemptedClass}
        customMessage="AKSES DITOLAK: Anda tidak memiliki penugasan mengajar mata pelajaran ini di kelas tersebut."
        onResetToAuthorizedClass={() => setSelectedClass(visibleClassrooms[0]?.id || '')}
      />
    );
  }

  const currentClass = classrooms.find((c) => c.id === selectedClass);
  const classStudents = useMemo(
    () => sortStudentsAlphabetically(students.filter((s) => s.classId === selectedClass)),
    [students, selectedClass]
  );

  // Local editing copy of scores
  const [localScores, setLocalScores] = useState<Record<string, AssessmentScore>>({});

  useEffect(() => {
    const map: Record<string, AssessmentScore> = {};
    classStudents.forEach((std) => {
      const existing = scores.find(
        (sc) =>
          sc.studentId === std.id &&
          sc.subjectId === selectedSubject &&
          sc.classId === selectedClass &&
          sc.academicYear === academicYear &&
          sc.semester === semester
      );

      const finalScore = existing?.finalScore ?? 80;
      const autoDesc = getAutomaticDescription(selectedSubject, finalScore, descriptionBank);

      if (existing) {
        map[std.id] = {
          ...existing,
          highestCompetenceDesc: existing.highestCompetenceDesc || autoDesc.highest,
          lowestCompetenceDesc: existing.lowestCompetenceDesc || autoDesc.lowest
        };
      } else {
        map[std.id] = {
          id: `sc-${std.id}-${selectedSubject}-${academicYear}-${semester}`,
          studentId: std.id,
          subjectId: selectedSubject,
          classId: selectedClass,
          academicYear,
          semester,
          formatifScores: {},
          sumatifMateriScores: {},
          sumatifAkhirSemester: 80,
          finalScore: 80,
          predicate: 'B',
          highestCompetenceDesc: autoDesc.highest,
          lowestCompetenceDesc: autoDesc.lowest,
          updatedAt: new Date().toISOString()
        };
      }
    });
    setLocalScores(map);
  }, [selectedClass, selectedSubject, academicYear, semester, students, scores, descriptionBank]);

  const handleTextChange = (studentId: string, field: 'highest' | 'lowest', text: string) => {
    const cur = localScores[studentId];
    if (!cur) return;
    setLocalScores({
      ...localScores,
      [studentId]: {
        ...cur,
        [field === 'highest' ? 'highestCompetenceDesc' : 'lowestCompetenceDesc']: text
      }
    });
  };

  const handleRegenerateOne = (studentId: string) => {
    const cur = localScores[studentId];
    if (!cur) return;
    const descs = getAutomaticDescription(selectedSubject, cur.finalScore, descriptionBank);
    setLocalScores({
      ...localScores,
      [studentId]: {
        ...cur,
        highestCompetenceDesc: descs.highest,
        lowestCompetenceDesc: descs.lowest
      }
    });
  };

  const handleRegenerateAll = () => {
    const updated = { ...localScores };
    classStudents.forEach((std) => {
      const cur = updated[std.id];
      if (cur) {
        const descs = getAutomaticDescription(selectedSubject, cur.finalScore, descriptionBank);
        updated[std.id] = {
          ...cur,
          highestCompetenceDesc: descs.highest,
          lowestCompetenceDesc: descs.lowest
        };
      }
    });
    setLocalScores(updated);
  };

  const handleSave = () => {
    onSaveScores(Object.values(localScores));
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  const handleSaveBankChanges = () => {
    onSaveDescriptionBank(editableBank);
    setBankModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-blue-600" />
            Bank Deskripsi Nilai Otomatis (11 Mata Pelajaran)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kalimat capaian kompetensi dirumuskan otomatis berdasarkan rentang nilai akhir siswa (75-100) dan dapat disesuaikan sebelum cetak rapor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {saveToast && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold animate-in fade-in">
              <Check className="w-4 h-4" />
              Deskripsi Berhasil Disimpan!
            </div>
          )}

          <button
            onClick={() => setBankModalOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            title="Kelola Bank Kalimat Deskripsi untuk 11 Mapel"
          >
            <Settings2 className="w-4 h-4 text-blue-600" />
            Kelola Bank Deskripsi
          </button>

          <button
            onClick={handleRegenerateAll}
            className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1.5 transition"
            title="Bangkitkan ulang kalimat deskripsi dari bank untuk seluruh siswa"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Generate Ulang Otomatis
          </button>

          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
          >
            <Save className="w-4 h-4" />
            Simpan Deskripsi
          </button>
        </div>
      </div>

      {/* Selectors */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Rombel:</span>
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

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Mata Pelajaran (11 Mapel):</span>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 font-bold bg-white text-slate-800"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-blue-600" />
          Kategori Nilai: 75-79, 80-84, 85-89, 90-94, 95-100
        </div>
      </div>

      {/* Description editing cards list */}
      <div className="space-y-4">
        {classStudents.map((std, idx) => {
          const item = localScores[std.id];
          if (!item) return null;

          return (
            <div
              key={std.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 hover:border-blue-300 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{std.name}</h3>
                    <p className="text-[11px] font-mono text-slate-500">NISN: {std.nisn || '-'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-xs font-semibold text-slate-700">
                    Nilai Akhir: <strong className="text-blue-700 text-sm font-black">{item.finalScore}</strong> ({item.predicate})
                  </div>
                  <button
                    onClick={() => handleRegenerateOne(std.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 text-xs font-medium flex items-center gap-1 transition"
                    title="Generate ulang deskripsi siswa ini dari bank"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    Reset Otomatis
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Capaian Tertinggi */}
                <div className="space-y-1.5 p-3 rounded-xl bg-emerald-50/50 border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      1. Capaian Tertinggi (Penguasaan Optimal)
                    </label>
                  </div>
                  <textarea
                    rows={3}
                    value={item.highestCompetenceDesc}
                    onChange={(e) => handleTextChange(std.id, 'highest', e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-emerald-300 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-white leading-relaxed text-slate-800 font-medium"
                    placeholder="Kalimat capaian tertinggi..."
                  />
                </div>

                {/* Capaian Terendah / Perlu Bimbingan */}
                <div className="space-y-1.5 p-3 rounded-xl bg-amber-50/50 border border-amber-200">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-amber-800 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-amber-600" />
                      2. Capaian Terendah (Perlu Peningkatan / Bimbingan)
                    </label>
                  </div>
                  <textarea
                    rows={3}
                    value={item.lowestCompetenceDesc}
                    onChange={(e) => handleTextChange(std.id, 'lowest', e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-amber-300 focus:outline-hidden focus:ring-1 focus:ring-amber-500 bg-white leading-relaxed text-slate-800 font-medium"
                    placeholder="Kalimat perlu peningkatan..."
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* BANK DESKRIPSI MANAGER MODAL */}
      {bankModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-blue-400" />
                <h2 className="font-bold text-sm sm:text-base">Kelola Bank Deskripsi Nilai (11 Mata Pelajaran)</h2>
              </div>
              <button
                onClick={() => setBankModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-700">Pilih Mata Pelajaran:</span>
              <select
                value={bankSubId}
                onChange={(e) => setBankSubId(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold bg-white text-slate-900"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {(() => {
                const currentBankItem = editableBank.find((b) => b.subjectId === bankSubId) || editableBank[0];
                if (!currentBankItem) return <div>Data bank tidak ditemukan.</div>;

                return currentBankItem.ranges.map((rItem, rIdx) => (
                  <div key={rItem.range} className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                    <div className="flex items-center justify-between font-bold text-slate-800 border-b border-slate-100 pb-2">
                      <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 text-xs border border-blue-200">
                        Kategori Nilai: {rItem.range === 'below-75' ? '< 75 (Belum Tuntas)' : rItem.range}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Kalimat Capaian Tertinggi:</label>
                        <textarea
                          rows={2}
                          value={rItem.highestDesc}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditableBank(
                              editableBank.map((b) => {
                                if (b.subjectId !== bankSubId) return b;
                                const newRanges = [...b.ranges];
                                newRanges[rIdx] = { ...newRanges[rIdx], highestDesc: val };
                                return { ...b, ranges: newRanges };
                              })
                            );
                          }}
                          className="w-full p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Kalimat Capaian Terendah / Perlu Peningkatan:</label>
                        <textarea
                          rows={2}
                          value={rItem.lowestDesc}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditableBank(
                              editableBank.map((b) => {
                                if (b.subjectId !== bankSubId) return b;
                                const newRanges = [...b.ranges];
                                newRanges[rIdx] = { ...newRanges[rIdx], lowestDesc: val };
                                return { ...b, ranges: newRanges };
                              })
                            );
                          }}
                          className="w-full p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setBankModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleSaveBankChanges}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs"
              >
                Simpan Perubahan Bank Deskripsi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
