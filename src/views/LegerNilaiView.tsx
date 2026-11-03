import React, { useState } from 'react';
import { Classroom, Subject, Student, AssessmentScore, SchoolProfile, User } from '../types/erapor';
import { Files, Download, Printer, Award, FileSpreadsheet, Lock } from 'lucide-react';
import { exportLegerToExcel } from '../services/excelService';
import { generateLegerPDF } from '../services/pdfService';
import { SecurityAccessDenied } from '../components/SecurityAccessDenied';
import { sortClassrooms } from '../utils/classroomSort';
import { sortSubjects } from '../utils/subjectSort';

interface LegerNilaiViewProps {
  school: SchoolProfile;
  classrooms: Classroom[];
  subjects: Subject[];
  students: Student[];
  scores: AssessmentScore[];
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  currentUser: User;
}

export const LegerNilaiView: React.FC<LegerNilaiViewProps> = ({
  school,
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
  const sortedSubjects = sortSubjects(subjects);

  const visibleClassrooms = isWaliKelas
    ? sortedAllClassrooms.filter((c) => c.id === currentUser.classId)
    : sortedAllClassrooms;

  const classroom = classrooms.find((c) => c.id === selectedClass) || classrooms[0];
  const classStudents = students.filter((s) => s.classId === selectedClass);

  // Score matrix lookup: studentId -> subjectId -> finalScore
  const scoreMap = new Map<string, Map<string, number>>();
  scores.forEach((sc) => {
    if (sc.classId === selectedClass && sc.semester === semester && sc.academicYear === academicYear) {
      if (!scoreMap.has(sc.studentId)) scoreMap.set(sc.studentId, new Map());
      scoreMap.get(sc.studentId)!.set(sc.subjectId, sc.finalScore);
    }
  });

  // Calculate totals, averages, and ranks
  const computedList = classStudents.map((std, idx) => {
    const sMap = scoreMap.get(std.id) || new Map();
    let total = 0;
    let count = 0;

    sortedSubjects.forEach((s) => {
      const val = sMap.get(s.id);
      if (typeof val === 'number') {
        total += val;
        count++;
      }
    });

    const average = count > 0 ? Number((total / count).toFixed(1)) : 0;
    return {
      std,
      idx: idx + 1,
      total,
      average,
      count
    };
  });

  // Sort to get ranking
  const sorted = [...computedList].sort((a, b) => b.average - a.average);
  const rankMap = new Map<string, number>();
  sorted.forEach((item, rIdx) => {
    rankMap.set(item.std.id, rIdx + 1);
  });

  const handleExportExcel = () => {
    exportLegerToExcel(classroom, classStudents, sortedSubjects, scores, academicYear, semester);
  };

  const handleExportPDF = () => {
    generateLegerPDF(classroom, classStudents, sortedSubjects, scores, school, academicYear, semester);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Files className="w-5 h-5 text-blue-600" />
            Leger Nilai Hasil Belajar Peserta Didik
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dokumen resmi rekapan nilai seluruh mata pelajaran, akumulasi total nilai, rata-rata kelas, dan pemeringkatan siswa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Ekspor Excel (.xlsx)
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
          >
            <Printer className="w-4 h-4" />
            Unduh Leger PDF
          </button>
        </div>
      </div>

      {/* Control bar */}
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
          SMP Negeri 1 Rangsang &bull; TP {academicYear} Semester {semester}
        </div>
      </div>

      {/* Leger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 text-center border-r border-slate-200 w-10">No</th>
                <th className="px-3 py-3 border-r border-slate-200 w-28">NISN</th>
                <th className="px-3 py-3 min-w-[160px] border-r border-slate-200">Nama Siswa</th>
                <th className="px-2 py-3 text-center border-r border-slate-200 w-10">JK</th>
                {sortedSubjects.map((sub) => (
                  <th
                    key={sub.id}
                    className="px-2 py-3 text-center font-mono text-[11px] border-r border-slate-200"
                    title={sub.name}
                  >
                    {sub.code}
                  </th>
                ))}
                <th className="px-3 py-3 text-center bg-blue-50 text-blue-900 border-r border-slate-200 w-16">
                  Jumlah
                </th>
                <th className="px-3 py-3 text-center bg-indigo-50 text-indigo-900 border-r border-slate-200 w-16">
                  Rata-rata
                </th>
                <th className="px-3 py-3 text-center bg-amber-50 text-amber-900 w-14">
                  Peringkat
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {computedList.map((item) => {
                const sMap = scoreMap.get(item.std.id) || new Map();
                const rank = rankMap.get(item.std.id) || 1;

                return (
                  <tr key={item.std.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-3 py-2.5 text-center text-slate-500 font-medium border-r border-slate-100">
                      {item.idx}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-600 border-r border-slate-100">
                      {item.std.nisn}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-slate-800 border-r border-slate-100">
                      {item.std.name}
                    </td>
                    <td className="px-2 py-2.5 text-center font-semibold text-slate-600 border-r border-slate-100">
                      {item.std.gender}
                    </td>

                    {/* Subject scores */}
                    {sortedSubjects.map((sub) => {
                      const val = sMap.get(sub.id);
                      return (
                        <td
                          key={sub.id}
                          className={`px-2 py-2.5 text-center font-semibold border-r border-slate-100 ${
                            val === undefined
                              ? 'text-slate-300'
                              : val < sub.kkm
                              ? 'text-rose-600 font-bold bg-rose-50/30'
                              : 'text-slate-800'
                          }`}
                        >
                          {val ?? '-'}
                        </td>
                      );
                    })}

                    <td className="px-3 py-2.5 text-center font-bold text-blue-800 bg-blue-50/30 border-r border-slate-100">
                      {item.total > 0 ? item.total : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-center font-black text-indigo-800 bg-indigo-50/30 border-r border-slate-100">
                      {item.average > 0 ? item.average : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-center font-black bg-amber-50/30">
                      <span
                        className={`inline-block w-6 h-6 leading-6 rounded-full text-[11px] ${
                          rank === 1
                            ? 'bg-amber-400 text-amber-950 shadow-xs'
                            : rank === 2
                            ? 'bg-slate-300 text-slate-800'
                            : rank === 3
                            ? 'bg-amber-200 text-amber-900'
                            : 'text-slate-600'
                        }`}
                      >
                        {rank}
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
  );
};
