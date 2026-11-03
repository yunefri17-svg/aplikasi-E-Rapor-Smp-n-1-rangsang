import React, { useState } from 'react';
import { Attendance, Classroom, Student, User } from '../types/erapor';
import { CalendarCheck2, Save, Check, Users, Search, AlertCircle, FileSpreadsheet, Lock } from 'lucide-react';
import { SecurityAccessDenied } from '../components/SecurityAccessDenied';
import { sortClassrooms } from '../utils/classroomSort';

interface DataAbsensiViewProps {
  attendanceList: Attendance[];
  classrooms: Classroom[];
  students: Student[];
  onSaveAttendance: (records: Attendance[]) => void;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  currentUser: User;
}

export const DataAbsensiView: React.FC<DataAbsensiViewProps> = ({
  attendanceList,
  classrooms,
  students,
  onSaveAttendance,
  academicYear,
  semester,
  currentUser
}) => {
  const isWaliKelas = currentUser.role === 'walikelas';
  const authorizedClass = classrooms.find((c) => c.id === currentUser.classId);

  const [selectedClass, setSelectedClass] = useState<string>(
    isWaliKelas && currentUser.classId ? currentUser.classId : classrooms[0]?.id || 'cls-vii-1'
  );
  const [search, setSearch] = useState('');
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

  const sortedAllClassrooms = sortClassrooms(classrooms);

  const visibleClassrooms = isWaliKelas
    ? sortedAllClassrooms.filter((c) => c.id === currentUser.classId)
    : sortedAllClassrooms;

  // Filter students in selected class
  const classStudents = students.filter((s) => s.classId === selectedClass);

  // Map studentId -> { sakit, izin, alpa }
  const [records, setRecords] = useState<Record<string, { sakit: number; izin: number; alpa: number }>>(() => {
    const map: Record<string, any> = {};
    attendanceList.forEach((att) => {
      if (att.academicYear === academicYear && att.semester === semester) {
        map[att.studentId] = { sakit: att.sakit, izin: att.izin, alpa: att.alpa };
      }
    });
    return map;
  });

  const handleUpdate = (studentId: string, field: 'sakit' | 'izin' | 'alpa', val: number) => {
    const current = records[studentId] || { sakit: 0, izin: 0, alpa: 0 };
    setRecords({
      ...records,
      [studentId]: {
        ...current,
        [field]: Math.max(0, val)
      }
    });
  };

  const handleSave = () => {
    const toSave: Attendance[] = classStudents.map((std) => {
      const rec = records[std.id] || { sakit: 0, izin: 0, alpa: 0 };
      const cleanYear = (academicYear || '').replace(/\//g, '_');
      return {
        id: `att-${std.id}-${cleanYear}-${semester}`,
        studentId: std.id,
        classId: selectedClass,
        academicYear,
        semester,
        sakit: rec.sakit,
        izin: rec.izin,
        alpa: rec.alpa
      };
    });

    onSaveAttendance(toSave);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  const filteredStudents = classStudents.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.nisn.includes(search)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-blue-600" />
            Rekapitulasi Absensi & Ketidakhadiran Siswa
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola jumlah hari ketidakhadiran (Sakit, Izin, Tanpa Keterangan) per semester yang ditampilkan pada lembar rapor resmi.
          </p>
        </div>

        {saveToast && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold animate-in fade-in">
            <Check className="w-4 h-4" />
            Rekap Absensi Berhasil Disimpan ke Rapor!
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
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

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-medium">
            <span>Tahun Pelajaran: {academicYear} &bull; Semester {semester}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Cari siswa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
          >
            <Save className="w-4 h-4" />
            Simpan Absensi
          </button>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-center">No</th>
                <th className="px-4 py-3">NISN</th>
                <th className="px-4 py-3">Nama Lengkap Siswa</th>
                <th className="px-4 py-3 text-center">Sakit (S)</th>
                <th className="px-4 py-3 text-center">Izin (I)</th>
                <th className="px-4 py-3 text-center">Tanpa Keterangan (A)</th>
                <th className="px-4 py-3 text-center">Total Absen</th>
                <th className="px-4 py-3">Status Kehadiran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Tidak ada data siswa pada rombel ini.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((std, idx) => {
                  const rec = records[std.id] || { sakit: 0, izin: 0, alpa: 0 };
                  const total = (rec.sakit || 0) + (rec.izin || 0) + (rec.alpa || 0);

                  return (
                    <tr key={std.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{std.nisn}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{std.name}</td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min={0}
                          max={90}
                          value={rec.sakit}
                          onChange={(e) => handleUpdate(std.id, 'sakit', parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1 text-center rounded border border-slate-300 font-semibold text-slate-800 focus:ring-1 focus:ring-blue-500 bg-white"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min={0}
                          max={90}
                          value={rec.izin}
                          onChange={(e) => handleUpdate(std.id, 'izin', parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1 text-center rounded border border-slate-300 font-semibold text-slate-800 focus:ring-1 focus:ring-blue-500 bg-white"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min={0}
                          max={90}
                          value={rec.alpa}
                          onChange={(e) => handleUpdate(std.id, 'alpa', parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1 text-center rounded border border-rose-300 font-bold text-rose-700 focus:ring-1 focus:ring-rose-500 bg-rose-50/30"
                        />
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-800">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${total === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                          {total} hari
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {total === 0 ? (
                          <span className="text-emerald-700 font-semibold text-[11px]">Sangat Rajin (Nihil Absen)</span>
                        ) : rec.alpa > 3 ? (
                          <span className="text-rose-600 font-bold text-[11px]">Perlu Perhatian Khusus</span>
                        ) : (
                          <span className="text-slate-600 text-[11px]">Kehadiran Terpantau Baik</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
