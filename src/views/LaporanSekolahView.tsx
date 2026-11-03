import React, { useState } from 'react';
import {
  SchoolProfile,
  Classroom,
  Student,
  Teacher,
  Subject,
  AssessmentScore,
  Attendance,
  User
} from '../types/erapor';
import { BarChart3, Printer, Users, BookOpen, CheckCircle2, AlertCircle, School, Download } from 'lucide-react';
import { sortClassrooms } from '../utils/classroomSort';

interface LaporanSekolahViewProps {
  school: SchoolProfile;
  classrooms: Classroom[];
  students: Student[];
  teachers: Teacher[];
  subjects: Subject[];
  scores: AssessmentScore[];
  attendanceList: Attendance[];
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  currentUser: User;
}

export const LaporanSekolahView: React.FC<LaporanSekolahViewProps> = ({
  school,
  classrooms,
  students,
  teachers,
  subjects,
  scores,
  attendanceList,
  academicYear,
  semester,
  currentUser
}) => {
  const [activeReportTab, setActiveReportTab] = useState<'kelengkapan' | 'demografi' | 'absensi'>('kelengkapan');
  const sortedClassrooms = sortClassrooms(classrooms);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Laporan Administrasi & Rekapitulasi Sekolah
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporan eksekutif untuk Kepala Sekolah, Pengawas Pembina, dan Dinas Pendidikan Kabupaten Kepulauan Meranti.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
        >
          <Printer className="w-4 h-4" />
          Cetak Dokumen Laporan
        </button>
      </div>

      {/* Tabs */}
      <div className="print:hidden flex border-b border-slate-200 gap-4 text-xs font-bold">
        <button
          onClick={() => setActiveReportTab('kelengkapan')}
          className={`pb-3 border-b-2 transition ${
            activeReportTab === 'kelengkapan'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          1. Laporan Kelengkapan Nilai Guru
        </button>
        <button
          onClick={() => setActiveReportTab('demografi')}
          className={`pb-3 border-b-2 transition ${
            activeReportTab === 'demografi'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          2. Statistik Demografi Siswa
        </button>
        <button
          onClick={() => setActiveReportTab('absensi')}
          className={`pb-3 border-b-2 transition ${
            activeReportTab === 'absensi'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          3. Rekapitulasi Absensi Sekolah
        </button>
      </div>

      {/* Document Report Sheet */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs">
        {/* Kop laporan */}
        <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            DINAS PENDIDIKAN DAN KEBUDAYAAN KABUPATEN KEPULAUAN MERANTI
          </h3>
          <h2 className="text-base font-black uppercase text-slate-900">
            {school.name}
          </h2>
          <p className="text-[11px] text-slate-600">
            LAPORAN REKAPITULASI EVALUASI BELAJAR SEMESTER {semester.toUpperCase()} TAHUN PELAJARAN {academicYear}
          </p>
        </div>

        {activeReportTab === 'kelengkapan' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Rekapitulasi Keterisian Nilai per Rombongan Belajar & Mata Pelajaran
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Rombel</th>
                    <th className="px-4 py-3">Wali Kelas</th>
                    <th className="px-4 py-3 text-center">Jml Siswa</th>
                    <th className="px-4 py-3 text-center">Nilai Terinput</th>
                    <th className="px-4 py-3 text-center">Kebutuhan Nilai</th>
                    <th className="px-4 py-3 text-center">Persentase</th>
                    <th className="px-4 py-3">Status Entri</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedClassrooms.map((cls) => {
                    const cStudents = students.filter((s) => s.classId === cls.id);
                    const teacher = teachers.find((t) => t.id === cls.homeroomTeacherId);
                    const classScores = scores.filter(
                      (sc) => sc.classId === cls.id && sc.academicYear === academicYear && sc.semester === semester
                    );
                    const totalRequired = cStudents.length * subjects.length;
                    const percent = totalRequired > 0 ? Math.round((classScores.length / totalRequired) * 100) : 0;

                    return (
                      <tr key={cls.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-bold text-slate-800">{cls.name}</td>
                        <td className="px-4 py-3 text-slate-700">{teacher?.name || '-'}</td>
                        <td className="px-4 py-3 text-center font-semibold">{cStudents.length}</td>
                        <td className="px-4 py-3 text-center font-bold text-blue-700">{classScores.length}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{totalRequired}</td>
                        <td className="px-4 py-3 text-center font-black">
                          <span className={percent >= 80 ? 'text-emerald-700' : 'text-amber-600'}>
                            {percent}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {percent === 100 ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Lengkap 100%
                            </span>
                          ) : percent > 0 ? (
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              Sedang Berjalan
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Belum Dimulai
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
        )}

        {activeReportTab === 'demografi' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Statistik Jumlah Peserta Didik per Tingkat & Jenis Kelamin
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Tingkat Kelas</th>
                    <th className="px-4 py-3">Nama Rombel</th>
                    <th className="px-4 py-3 text-center text-blue-700">Laki-Laki (L)</th>
                    <th className="px-4 py-3 text-center text-pink-700">Perempuan (P)</th>
                    <th className="px-4 py-3 text-center font-bold">Total Siswa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedClassrooms.map((cls) => {
                    const cStudents = students.filter((s) => s.classId === cls.id);
                    const lCount = cStudents.filter((s) => s.gender === 'L').length;
                    const pCount = cStudents.filter((s) => s.gender === 'P').length;

                    return (
                      <tr key={cls.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-semibold text-slate-600">
                          Kelas {cls.gradeLevel === '7' ? 'VII' : cls.gradeLevel === '8' ? 'VIII' : 'IX'}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">{cls.name}</td>
                        <td className="px-4 py-3 text-center font-semibold text-blue-700">{lCount}</td>
                        <td className="px-4 py-3 text-center font-semibold text-pink-700">{pCount}</td>
                        <td className="px-4 py-3 text-center font-black text-slate-900">{cStudents.length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeReportTab === 'absensi' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Rekapitulasi Akumulasi Absensi Siswa per Rombel
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Rombel</th>
                    <th className="px-4 py-3 text-center">Total Sakit</th>
                    <th className="px-4 py-3 text-center">Total Izin</th>
                    <th className="px-4 py-3 text-center text-rose-700">Total Alpa</th>
                    <th className="px-4 py-3 text-center font-bold">Total Ketidakhadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedClassrooms.map((cls) => {
                    const classAtt = attendanceList.filter(
                      (a) => a.classId === cls.id && a.academicYear === academicYear && a.semester === semester
                    );
                    const sSum = classAtt.reduce((sum, a) => sum + (a.sakit || 0), 0);
                    const iSum = classAtt.reduce((sum, a) => sum + (a.izin || 0), 0);
                    const aSum = classAtt.reduce((sum, a) => sum + (a.alpa || 0), 0);
                    const grandTotal = sSum + iSum + aSum;

                    return (
                      <tr key={cls.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-bold text-slate-800">{cls.name}</td>
                        <td className="px-4 py-3 text-center text-slate-700">{sSum} hari</td>
                        <td className="px-4 py-3 text-center text-slate-700">{iSum} hari</td>
                        <td className="px-4 py-3 text-center font-bold text-rose-700">{aSum} hari</td>
                        <td className="px-4 py-3 text-center font-black text-slate-900">{grandTotal} hari</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Legal Signatures footer */}
        <div className="pt-8 flex justify-between text-xs text-slate-800">
          <div></div>
          <div className="text-center w-64">
            <p>{school.reportPlace}, {school.reportDate}</p>
            <p className="font-semibold">Kepala Sekolah,</p>
            <div className="h-14"></div>
            <p className="font-bold border-b border-slate-900 inline-block px-4">
              {school.headmasterName}
            </p>
            <p className="text-[10px] text-slate-600 mt-0.5">
              NIP. {school.headmasterNip}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
