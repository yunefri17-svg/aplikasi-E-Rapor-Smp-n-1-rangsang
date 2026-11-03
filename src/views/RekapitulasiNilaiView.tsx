import React, { useState } from 'react';
import { Classroom, Subject, Student, AssessmentScore, User } from '../types/erapor';
import { Table, CheckCircle2, AlertTriangle, FileSpreadsheet, Download, Printer, Lock } from 'lucide-react';
import { SecurityAccessDenied } from '../components/SecurityAccessDenied';
import { sortClassrooms } from '../utils/classroomSort';

interface RekapitulasiNilaiViewProps {
  classrooms: Classroom[];
  subjects: Subject[];
  students: Student[];
  scores: AssessmentScore[];
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  currentUser: User;
}

export const RekapitulasiNilaiView: React.FC<RekapitulasiNilaiViewProps> = ({
  classrooms,
  subjects,
  students,
  scores,
  academicYear,
  semester,
  currentUser
}) => {
  const isWaliKelas = currentUser.role === 'walikelas';
  const authorizedClass = classrooms.find((c) => c.id === currentUser.classId);

  const [selectedClass, setSelectedClass] = useState<string>(
    isWaliKelas && currentUser.classId ? currentUser.classId : classrooms[0]?.id || 'cls-vii-1'
  );

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

  const classStudents = students.filter((s) => s.classId === selectedClass);
  const classScores = scores.filter(
    (sc) => sc.classId === selectedClass && sc.academicYear === academicYear && sc.semester === semester
  );

  // Map studentId -> subjectId -> AssessmentScore
  const scoreMap = new Map<string, Map<string, AssessmentScore>>();
  classScores.forEach((sc) => {
    if (!scoreMap.has(sc.studentId)) scoreMap.set(sc.studentId, new Map());
    scoreMap.get(sc.studentId)!.set(sc.subjectId, sc);
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Table className="w-5 h-5 text-blue-600" />
            Rekapitulasi Nilai Seluruh Mata Pelajaran
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tabel rekapitulasi nilai akhir peserta didik per kelas untuk memantau ketuntasan seluruh mata pelajaran.
          </p>
        </div>
      </div>

      {/* Selector */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
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

        <div className="text-xs text-slate-600 font-medium">
          Tahun Pelajaran: <strong>{academicYear}</strong> &bull; Semester: <strong>{semester}</strong>
        </div>
      </div>

      {/* Rekap Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 text-center border-r border-slate-200">No</th>
                <th className="px-3 py-3 border-r border-slate-200">NISN</th>
                <th className="px-3 py-3 min-w-[150px] border-r border-slate-200">Nama Siswa</th>
                {subjects.map((sub) => (
                  <th
                    key={sub.id}
                    className="px-2 py-3 text-center font-mono border-r border-slate-200"
                    title={sub.name}
                  >
                    {sub.code}
                  </th>
                ))}
                <th className="px-3 py-3 text-center bg-blue-50 text-blue-900 border-r border-slate-200">
                  Rata-Rata
                </th>
                <th className="px-3 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classStudents.map((std, idx) => {
                const stdMap = scoreMap.get(std.id) || new Map();
                let sum = 0;
                let count = 0;
                let hasRemedial = false;

                subjects.forEach((s) => {
                  const sc = stdMap.get(s.id);
                  if (sc && typeof sc.finalScore === 'number') {
                    sum += sc.finalScore;
                    count++;
                    if (sc.finalScore < s.kkm) hasRemedial = true;
                  }
                });

                const avg = count > 0 ? (sum / count).toFixed(1) : '-';

                return (
                  <tr key={std.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-3 py-2.5 text-center text-slate-500 font-medium border-r border-slate-100">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-600 border-r border-slate-100">
                      {std.nisn}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-slate-800 border-r border-slate-100">
                      {std.name}
                    </td>
                    {subjects.map((s) => {
                      const sc = stdMap.get(s.id);
                      const val = sc?.finalScore;
                      return (
                        <td
                          key={s.id}
                          className={`px-2 py-2 text-center font-semibold border-r border-slate-100 ${
                            val === undefined
                              ? 'text-slate-300'
                              : val < s.kkm
                              ? 'text-rose-600 bg-rose-50/40 font-bold'
                              : 'text-slate-800'
                          }`}
                        >
                          {val ?? '-'}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-center font-black text-blue-700 bg-blue-50/30 border-r border-slate-100">
                      {avg}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {count < subjects.length ? (
                        <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Belum Lengkap ({count}/{subjects.length})
                        </span>
                      ) : hasRemedial ? (
                        <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          Ada Remidial
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Tuntas Seluruhnya
                        </span>
                      )}
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
