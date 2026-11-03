import React, { useState, useMemo } from 'react';
import { AppDatabase } from '../services/storage';
import {
  User,
  AssessmentScore,
  Student,
  Subject,
  Teacher,
  Classroom,
  AppNotification
} from '../types/erapor';
import { sortClassrooms } from '../utils/classroomSort';
import { sortStudentsAlphabetically } from '../utils/studentSort';
import { sortSubjects } from '../utils/subjectSort';
import {
  Table,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Eye,
  MessageSquare,
  Search,
  Filter,
  Check,
  Send,
  BookOpen,
  UserCheck,
  Award,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface RekapNilaiMapelViewProps {
  db: AppDatabase;
  currentUser: User;
  onSaveScores: (updatedScores: AssessmentScore[], notification?: AppNotification) => void;
}

export const RekapNilaiMapelView: React.FC<RekapNilaiMapelViewProps> = ({
  db,
  currentUser,
  onSaveScores
}) => {
  // Determine homeroom class if user is Wali Kelas
  const teacher = db.teachers.find((t) => t.id === currentUser.teacherId || t.nip === currentUser.nip);
  const homeroomClassId = currentUser.classId || teacher?.homeroomClassId || db.classrooms[0]?.id || '';

  const [selectedClassId, setSelectedClassId] = useState<string>(
    currentUser.role === 'walikelas' && homeroomClassId ? homeroomClassId : db.classrooms[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // Modals state
  const [detailSubject, setDetailSubject] = useState<Subject | null>(null);
  const [revisionSubject, setRevisionSubject] = useState<Subject | null>(null);
  const [revisionNoteText, setRevisionNoteText] = useState('');
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);
  const [revisionSuccessMsg, setRevisionSuccessMsg] = useState('');

  // Selected Classroom object
  const selectedClassroom = useMemo(() => {
    return db.classrooms.find((c: Classroom) => c.id === selectedClassId) || db.classrooms[0];
  }, [db.classrooms, selectedClassId]);

  // Students in selected class (sorted alphabetically A-Z)
  const classStudents = useMemo(() => {
    if (!selectedClassroom) return [];
    return sortStudentsAlphabetically(db.students.filter((s: Student) => s.classId === selectedClassroom.id && s.status === 'Aktif'));
  }, [db.students, selectedClassroom]);

  // Calculate status per subject for the selected classroom
  const subjectSummaries = useMemo(() => {
    if (!selectedClassroom || classStudents.length === 0) return [];

    return sortSubjects(db.subjects).map((sub: Subject) => {
      // Find teacher who teaches this subject in this class
      const assignedTeacher = db.teachers.find(
        (t: Teacher) => t.subjectsTaught.includes(sub.id)
      );

      // Find scores for this subject & class in current academic year & semester
      const subjectScores = db.scores.filter(
        (s: AssessmentScore) =>
          s.subjectId === sub.id &&
          s.academicYear === db.schoolProfile.activeAcademicYear &&
          s.semester === db.schoolProfile.activeSemester &&
          classStudents.some((st: Student) => st.id === s.studentId)
      );

      const enteredCount = subjectScores.filter((s: AssessmentScore) => s.finalScore !== undefined && s.finalScore > 0).length;
      const totalStudents = classStudents.length;

      // Determine overall status
      let status: 'BELUM' | 'DALAM PROSES' | 'SELESAI' | 'REVISI' = 'BELUM';
      
      // Check if any score has explicitly set status
      const revisionScore = subjectScores.find((s: AssessmentScore) => s.status === 'REVISI');
      if (revisionScore) {
        status = 'REVISI';
      } else if (enteredCount === 0) {
        status = 'BELUM';
      } else if (enteredCount < totalStudents) {
        status = 'DALAM PROSES';
      } else {
        status = 'SELESAI';
      }

      // Calculate average score if scores exist
      const validScores = subjectScores.map((s: AssessmentScore) => s.finalScore).filter((v: number) => v !== undefined && v > 0);
      const average = validScores.length > 0
        ? Math.round(validScores.reduce((acc: number, curr: number) => acc + curr, 0) / validScores.length)
        : 0;

      // Find last updated time
      const lastUpdated = subjectScores.reduce((latest: string, current: AssessmentScore) => {
        if (!latest) return current.updatedAt;
        return current.updatedAt > latest ? current.updatedAt : latest;
      }, '');

      const revisionNote = revisionScore?.revisionNote || '';

      return {
        subject: sub,
        teacher: assignedTeacher,
        status,
        enteredCount,
        totalStudents,
        average,
        lastUpdated,
        revisionNote,
        scores: subjectScores
      };
    });
  }, [db.subjects, db.teachers, db.scores, db.schoolProfile, selectedClassroom, classStudents]);

  // Statistics
  const stats = useMemo(() => {
    const total = subjectSummaries.length;
    const selesai = subjectSummaries.filter((s) => s.status === 'SELESAI').length;
    const proses = subjectSummaries.filter((s) => s.status === 'DALAM PROSES').length;
    const belum = subjectSummaries.filter((s) => s.status === 'BELUM').length;
    const revisi = subjectSummaries.filter((s) => s.status === 'REVISI').length;
    const percentage = total > 0 ? Math.round((selesai / total) * 100) : 0;

    return { total, selesai, proses, belum, revisi, percentage };
  }, [subjectSummaries]);

  // Filtered summaries
  const filteredSummaries = useMemo(() => {
    return subjectSummaries.filter((item) => {
      const matchSearch =
        item.subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subject.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.teacher?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [subjectSummaries, searchQuery, statusFilter]);

  // Handle request for revision
  const handleSendRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionSubject || !selectedClassroom) return;
    setIsSubmittingRevision(true);

    const targetSummary = subjectSummaries.find((s) => s.subject.id === revisionSubject.id);
    const teacherId = targetSummary?.teacher?.id;

    // Map existing scores or create score entries with REVISI status
    const updatedScores: AssessmentScore[] = classStudents.map((st) => {
      const existing = targetSummary?.scores.find((s) => s.studentId === st.id);
      return {
        id: existing?.id || `sc-26-${st.id}-${revisionSubject.id}`,
        studentId: st.id,
        studentName: st.name,
        subjectId: revisionSubject.id,
        subjectName: revisionSubject.name,
        classId: selectedClassroom.id,
        className: selectedClassroom.name,
        teacherId: teacherId || '',
        teacherName: targetSummary?.teacher?.name || '',
        academicYear: db.schoolProfile.activeAcademicYear,
        semester: db.schoolProfile.activeSemester,
        formatifScores: existing?.formatifScores || {},
        sumatifMateriScores: existing?.sumatifMateriScores || {},
        sumatifAkhirSemester: existing?.sumatifAkhirSemester || 0,
        finalScore: existing?.finalScore || 0,
        predicate: existing?.predicate || 'B',
        highestCompetenceDesc: existing?.highestCompetenceDesc || '',
        lowestCompetenceDesc: existing?.lowestCompetenceDesc || '',
        status: 'REVISI',
        revisionNote: revisionNoteText.trim(),
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        updatedBy: currentUser.name
      };
    });

    // Create Notification object for the subject teacher
    const notification: AppNotification = {
      id: `notif-${Date.now()}`,
      recipientUserId: teacherId ? `usr-${teacherId}` : '',
      recipientRole: 'guru',
      title: `Perbaikan Nilai Mata Pelajaran ${revisionSubject.name}`,
      message: `Wali Kelas ${selectedClassroom.name} (${currentUser.name}) meminta perbaikan nilai ${revisionSubject.name}. Catatan: "${revisionNoteText.trim()}"`,
      type: 'revision_requested',
      subjectId: revisionSubject.id,
      classId: selectedClassroom.id,
      academicYear: db.schoolProfile.activeAcademicYear,
      semester: db.schoolProfile.activeSemester,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    onSaveScores(updatedScores, notification);

    setRevisionSuccessMsg(`Catatan perbaikan berhasil dikirim ke Guru ${revisionSubject.name}`);
    setIsSubmittingRevision(false);
    setTimeout(() => {
      setRevisionSubject(null);
      setRevisionNoteText('');
      setRevisionSuccessMsg('');
    }, 1500);
  };

  const getStatusBadge = (status: 'BELUM' | 'DALAM PROSES' | 'SELESAI' | 'REVISI') => {
    switch (status) {
      case 'SELESAI':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            SELESAI
          </span>
        );
      case 'DALAM PROSES':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 mr-1" />
            DALAM PROSES
          </span>
        );
      case 'REVISI':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 mr-1" />
            MINTA PERBAIKAN
          </span>
        );
      case 'BELUM':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
            <XCircle className="w-3.5 h-3.5 mr-1" />
            BELUM INPUT
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-blue-500/20 px-3 py-1 rounded-full text-blue-200 text-xs font-medium mb-3 backdrop-blur-sm border border-blue-400/30">
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              <span>Sinkronisasi Otomatis Cloud Firestore</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              15. Rekap Nilai Mata Pelajaran
            </h1>
            <p className="text-blue-200 text-sm mt-1 max-w-2xl">
              Pantau status pengisian nilai mata pelajaran oleh Guru Pengampu secara real-time untuk kelas binaan Wali Kelas.
            </p>
          </div>

          {/* Classroom Selector */}
          <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20 min-w-[240px]">
            <label className="block text-xs font-medium text-blue-200 mb-1">
              Pilih Rombongan Belajar / Kelas
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              disabled={currentUser.role === 'walikelas' && Boolean(homeroomClassId)}
              className="w-full bg-slate-800 text-white font-semibold text-sm rounded-lg px-3 py-2 border border-blue-400/40 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-85"
            >
              {sortClassrooms(db.classrooms).map((cls: Classroom) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name.startsWith('Kelas') ? cls.name : `Kelas ${cls.name}`} (Wali: {db.teachers.find((t: Teacher) => t.homeroomClassId === cls.id)?.name || 'Belum Ditentukan'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card Total */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Mapel</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-800">{stats.total}</span>
            <span className="text-xs text-slate-500">Kategori Mapel</span>
          </div>
        </div>

        {/* Card Selesai */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-emerald-200 hover:shadow-md transition bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Nilai Lengkap</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-700">{stats.selesai}</span>
            <span className="text-xs font-semibold text-emerald-600">{stats.percentage}% Tuntas</span>
          </div>
        </div>

        {/* Card Dalam Proses */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-200 hover:shadow-md transition bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Dalam Proses</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-700">{stats.proses}</span>
            <span className="text-xs text-amber-600">Sebagian Diisi</span>
          </div>
        </div>

        {/* Card Minta Perbaikan */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-red-200 hover:shadow-md transition bg-red-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">Minta Perbaikan</span>
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-red-700">{stats.revisi}</span>
            <span className="text-xs text-red-600">Revisi Catatan</span>
          </div>
        </div>

        {/* Card Belum Input */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Belum Input</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-700">{stats.belum}</span>
            <span className="text-xs text-slate-500">Belum Ada Nilai</span>
          </div>
        </div>
      </div>

      {/* Progress Bar overall */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-2">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
          <span>Progres Kelengkapan Nilai Rapor Kelas {selectedClassroom.name}</span>
          <span className="text-blue-600 font-bold">{stats.selesai} dari {stats.total} Mata Pelajaran Selesai ({stats.percentage}%)</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${(stats.selesai / (stats.total || 1)) * 100}%` }}
            title="Selesai"
          />
          <div
            className="bg-amber-400 h-full transition-all duration-500"
            style={{ width: `${(stats.proses / (stats.total || 1)) * 100}%` }}
            title="Dalam Proses"
          />
          <div
            className="bg-red-400 h-full transition-all duration-500"
            style={{ width: `${(stats.revisi / (stats.total || 1)) * 100}%` }}
            title="Minta Perbaikan"
          />
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari mata pelajaran atau nama guru pengampu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-600">Filter Status:</span>
            {['ALL', 'SELESAI', 'DALAM PROSES', 'REVISI', 'BELUM'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {st === 'ALL' ? 'Semua Status' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <th className="py-3.5 px-4 text-center w-12">No</th>
                <th className="py-3.5 px-4">Mata Pelajaran</th>
                <th className="py-3.5 px-4">Guru Pengampu</th>
                <th className="py-3.5 px-4 text-center">Status Input</th>
                <th className="py-3.5 px-4 text-center">Siswa Dinilai</th>
                <th className="py-3.5 px-4 text-center">Rata-Rata Kelas</th>
                <th className="py-3.5 px-4 text-center">Terakhir Diperbarui</th>
                <th className="py-3.5 px-4 text-center">Aksi & Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Tidak ada mata pelajaran yang sesuai dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((item, idx) => (
                  <tr key={item.subject.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 text-center font-medium text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{item.subject.name}</div>
                      <div className="text-xs text-slate-500">Kode: {item.subject.code} • Kelompok: {item.subject.category}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {item.teacher ? (
                        <div>
                          <div className="font-medium text-slate-800">{item.teacher.name}</div>
                          <div className="text-xs text-slate-500">NIP: {item.teacher.nip || '-'}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Belum Ditentukan
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                      <span className={item.enteredCount === item.totalStudents ? 'text-emerald-700 font-bold' : 'text-slate-700'}>
                        {item.enteredCount} / {item.totalStudents} Siswa
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      {item.average > 0 ? (
                        <span className="bg-blue-50 text-blue-800 px-2.5 py-1 rounded-md border border-blue-200">
                          {item.average}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs text-slate-500">
                      {item.lastUpdated ? item.lastUpdated : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => setDetailSubject(item.subject)}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition border border-blue-200"
                          title="Lihat rincian nilai siswa"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>

                        {(currentUser.role === 'walikelas' || currentUser.role === 'admin') && (
                          <button
                            onClick={() => {
                              setRevisionSubject(item.subject);
                              setRevisionNoteText(item.revisionNote || '');
                            }}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold transition border border-amber-300"
                            title="Minta perbaikan nilai dari guru pengampu"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Revisi</span>
                          </button>
                        )}
                      </div>
                      {item.revisionNote && (
                        <div className="mt-1 text-left text-[11px] text-red-600 bg-red-50 p-1.5 rounded border border-red-200 italic max-w-xs truncate" title={item.revisionNote}>
                          Catatan: {item.revisionNote}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Nilai Siswa */}
      {detailSubject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">Rincian Nilai: {detailSubject.name}</h3>
                <p className="text-xs text-slate-300">
                  Kelas {selectedClassroom.name} • TP {db.schoolProfile.activeAcademicYear} Semester {db.schoolProfile.activeSemester}
                </p>
              </div>
              <button
                onClick={() => setDetailSubject(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <th className="p-3 text-center w-10">No</th>
                      <th className="p-3">NISN / NIS</th>
                      <th className="p-3">Nama Siswa</th>
                      <th className="p-3 text-center">Nilai Akhir</th>
                      <th className="p-3 text-center">Predikat</th>
                      <th className="p-3">Capaian Kompetensi / Deskripsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {classStudents.map((st: Student, idx: number) => {
                      const scoreObj = db.scores.find(
                        (s: AssessmentScore) =>
                          s.studentId === st.id &&
                          s.subjectId === detailSubject.id &&
                          s.academicYear === db.schoolProfile.activeAcademicYear &&
                          s.semester === db.schoolProfile.activeSemester
                      );

                      const finalVal = scoreObj?.finalScore;
                      let predikat = '-';
                      let predikatColor = 'text-slate-400';
                      if (finalVal !== undefined && finalVal > 0) {
                        if (finalVal >= 90) { predikat = 'A'; predikatColor = 'text-emerald-700 font-bold'; }
                        else if (finalVal >= 80) { predikat = 'B'; predikatColor = 'text-blue-700 font-bold'; }
                        else if (finalVal >= 70) { predikat = 'C'; predikatColor = 'text-amber-700 font-bold'; }
                        else { predikat = 'D'; predikatColor = 'text-red-700 font-bold'; }
                      }

                      return (
                        <tr key={st.id} className="hover:bg-slate-50">
                          <td className="p-3 text-center font-medium text-slate-500">{idx + 1}</td>
                          <td className="p-3 text-xs font-mono">{st.nisn} / {st.nis}</td>
                          <td className="p-3 font-semibold text-slate-800">{st.name}</td>
                          <td className="p-3 text-center font-bold">
                            {finalVal !== undefined && finalVal > 0 ? (
                              <span className="bg-slate-100 px-2.5 py-1 rounded text-slate-800">
                                {finalVal}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal italic">Belum diisi</span>
                            )}
                          </td>
                          <td className={`p-3 text-center ${predikatColor}`}>{predikat}</td>
                          <td className="p-3 text-xs text-slate-600">
                            {scoreObj?.highestCompetenceDesc ? (
                              <div>
                                <span className="font-semibold text-emerald-700">Tuntas: </span>
                                {scoreObj.highestCompetenceDesc}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Deskripsi otomatis belum tersedia</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setDetailSubject(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg text-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Minta Perbaikan Nilai */}
      {revisionSubject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-amber-600 text-white p-5 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-200" />
                <h3 className="text-lg font-bold">Minta Perbaikan Nilai</h3>
              </div>
              <button
                onClick={() => setRevisionSubject(null)}
                className="text-amber-100 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendRevision} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Mata Pelajaran & Kelas
                </label>
                <div className="font-bold text-slate-800 text-base">
                  {revisionSubject.name} — Kelas {selectedClassroom.name}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Perbaikan dari Wali Kelas <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={revisionNoteText}
                  onChange={(e) => setRevisionNoteText(e.target.value)}
                  placeholder="Tuliskan alasan perbaikan (misal: Nilai Ahmad belum diisi lengkap, atau deskripsi kompetensi perlu diperbaiki)..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {revisionSuccessMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200 flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{revisionSuccessMsg}</span>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRevisionSubject(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRevision || !revisionNoteText.trim()}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-sm flex items-center space-x-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Permintaan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
