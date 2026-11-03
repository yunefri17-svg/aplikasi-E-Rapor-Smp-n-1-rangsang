import React, { useState, useMemo } from 'react';
import { Student, Classroom, User } from '../types/erapor';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  X,
  Printer,
  FileSpreadsheet,
  Check,
  Lock
} from 'lucide-react';
import { exportStudentsToExcel } from '../services/excelService';
import { SecurityAccessDenied } from '../components/SecurityAccessDenied';
import { sortClassrooms, parseClassroomRank } from '../utils/classroomSort';
import { sortStudentsAlphabetically } from '../utils/studentSort';

interface DataSiswaViewProps {
  students: Student[];
  classrooms: Classroom[];
  onSaveStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onNavigateToImport: () => void;
  currentUser: User;
}

export const DataSiswaView: React.FC<DataSiswaViewProps> = ({
  students,
  classrooms,
  onSaveStudent,
  onDeleteStudent,
  onNavigateToImport,
  currentUser
}) => {
  const isWaliKelas = currentUser.role === 'walikelas';
  const authorizedClass = classrooms.find((c) => c.id === currentUser.classId);

  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState<string>(
    isWaliKelas && currentUser.classId ? currentUser.classId : 'all'
  );
  const [filterGender, setFilterGender] = useState<string>('all');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Security check: if Wali Kelas attempts to access another class
  const isUnauthorized = isWaliKelas && filterClass !== 'all' && filterClass !== currentUser.classId;
  const attemptedClass = isUnauthorized ? classrooms.find((c) => c.id === filterClass) : null;

  if (isUnauthorized) {
    return (
      <SecurityAccessDenied
        currentUser={currentUser}
        authorizedClassroom={authorizedClass}
        targetClassroom={attemptedClass}
        onResetToAuthorizedClass={() => setFilterClass(currentUser.classId || 'all')}
      />
    );
  }

  // Accessible classrooms dropdown list
  const sortedAllClassrooms = sortClassrooms(classrooms);

  const visibleClassrooms = isWaliKelas
    ? sortedAllClassrooms.filter((c) => c.id === currentUser.classId)
    : sortedAllClassrooms;

  const classMap = new Map(classrooms.map((c) => [c.id, c.name]));

  const filteredStudents = useMemo(() => {
    const raw = students.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.nisn.includes(search) ||
        s.nis.includes(search);
      const matchesClass = filterClass === 'all' || s.classId === filterClass;
      const matchesGender = filterGender === 'all' || s.gender === filterGender;
      return matchesSearch && matchesClass && matchesGender;
    });

    return [...raw].sort((a, b) => {
      // 1. Sort by Class
      const clsA = classrooms.find((c) => c.id === a.classId);
      const clsB = classrooms.find((c) => c.id === b.classId);
      
      const rankA = parseClassroomRank(clsA);
      const rankB = parseClassroomRank(clsB);
      
      if (rankA.grade !== rankB.grade) return rankA.grade - rankB.grade;
      if (rankA.section !== rankB.section) return rankA.section - rankB.section;
      
      // 2. Sort by Name
      return (a.name || '').trim().localeCompare((b.name || '').trim(), 'id', { sensitivity: 'base' });
    });
  }, [students, search, filterClass, filterGender, classrooms]);

  const handleOpenAdd = () => {
    setEditingStudent({
      id: `std-${Date.now()}`,
      nis: String(Math.floor(24000 + Math.random() * 900)),
      nisn: String(Math.floor(1000000000 + Math.random() * 900000000)),
      name: '',
      gender: 'L',
      pob: 'Tanjung Samak',
      dob: '2011-01-01',
      religion: 'Islam',
      address: 'Kecamatan Rangsang, Kab. Kepulauan Meranti',
      fatherName: '',
      motherName: '',
      fatherJob: 'Nelayan',
      motherJob: 'Ibu Rumah Tangga',
      parentPhone: '',
      classId: classrooms[0]?.id || 'cls-vii-1',
      status: 'Aktif'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Student) => {
    setEditingStudent({ ...s });
    setIsModalOpen(true);
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudent) {
      onSaveStudent(editingStudent);
      setIsModalOpen(false);
      setEditingStudent(null);
    }
  };

  const handleExportExcel = () => {
    exportStudentsToExcel(filteredStudents, classrooms);
  };

  const handlePrintList = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            Data Peserta Didik (Siswa)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen data induk siswa resmi Dapodik SMP Negeri 1 Rangsang, NISN, rombel, dan biodata keluarga.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition"
            title="Ekspor ke Excel"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            Ekspor Excel
          </button>

          {currentUser.role === 'admin' && (
            <button
              onClick={onNavigateToImport}
              className="px-3 py-2 rounded-xl border border-blue-200 bg-blue-50/70 text-blue-700 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1.5 transition"
              title="Impor Data dari Excel Dapodik"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              Impor Dapodik
            </button>
          )}

          {currentUser.role === 'admin' && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              Tambah Siswa
            </button>
          )}
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari siswa, NISN, atau NIS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-4 h-4 text-slate-400" />
            <span>Filter:</span>
          </div>

          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-800"
          >
            {!isWaliKelas && <option value="all">Semua Rombel</option>}
            {visibleClassrooms.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">Semua JK</option>
            <option value="L">Laki-Laki (L)</option>
            <option value="P">Perempuan (P)</option>
          </select>

          <span className="text-xs font-semibold text-slate-500 ml-2">
            Total: {filteredStudents.length} siswa
          </span>
        </div>
      </div>

      {/* Student Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">No</th>
                <th className="px-4 py-3">NISN / NIS</th>
                <th className="px-4 py-3">Nama Lengkap Siswa</th>
                <th className="px-4 py-3 text-center">JK</th>
                <th className="px-4 py-3">Tempat, Tgl Lahir</th>
                <th className="px-4 py-3">Kelas / Rombel</th>
                <th className="px-4 py-3">Nama Orang Tua</th>
                <th className="px-4 py-3 text-center">Status</th>
                {currentUser.role === 'admin' && (
                  <th className="px-4 py-3 text-right">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    Tidak ada data peserta didik yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((std, idx) => (
                  <tr key={std.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 text-slate-500 font-medium">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono">
                      <div className="font-bold text-slate-800">{std.nisn}</div>
                      <div className="text-[10px] text-slate-400">NIS: {std.nis}</div>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800 text-[13px]">
                      {std.name}
                      <div className="text-[10px] text-slate-400 font-normal truncate max-w-xs">
                        {std.address}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block w-6 h-6 leading-6 text-center rounded-full text-[10px] font-bold ${
                          std.gender === 'L'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-pink-100 text-pink-700'
                        }`}
                      >
                        {std.gender}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{std.pob}</div>
                      <div className="text-[10px] text-slate-400">{std.dob}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">
                        {classMap.get(std.classId) || std.classId}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>Ayah: {std.fatherName || '-'}</div>
                      <div className="text-[10px] text-slate-400">Ibu: {std.motherName || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {std.status}
                      </span>
                    </td>
                    {currentUser.role === 'admin' && (
                      <td className="px-4 py-3 text-right space-x-1">
                        <button
                          onClick={() => handleOpenEdit(std)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                          title="Edit Siswa"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(std.id)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                          title="Hapus Siswa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus Siswa</h3>
            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin menghapus data siswa ini beserta riwayat penilaiannya?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onDeleteStudent(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {isModalOpen && editingStudent && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingStudent.id.startsWith('std-7') || editingStudent.id.startsWith('std-8') || editingStudent.id.startsWith('std-9')
                  ? 'Edit Data Peserta Didik'
                  : 'Tambah Peserta Didik Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap Siswa</label>
                  <input
                    type="text"
                    value={editingStudent.name}
                    onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                    placeholder="Nama sesuai akta lahir / ijazah SD"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NISN (10 Digit)</label>
                  <input
                    type="text"
                    value={editingStudent.nisn}
                    onChange={(e) => setEditingStudent({ ...editingStudent, nisn: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="Contoh: 0115432901"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NIS Sekolah</label>
                  <input
                    type="text"
                    value={editingStudent.nis}
                    onChange={(e) => setEditingStudent({ ...editingStudent, nis: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="Contoh: 24701"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={editingStudent.gender}
                    onChange={(e) => setEditingStudent({ ...editingStudent, gender: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="L">Laki-Laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Agama</label>
                  <select
                    value={editingStudent.religion}
                    onChange={(e) => setEditingStudent({ ...editingStudent, religion: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Islam">Islam</option>
                    <option value="Kristen">Kristen</option>
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
                    value={editingStudent.pob}
                    onChange={(e) => setEditingStudent({ ...editingStudent, pob: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    placeholder="Contoh: Tanjung Samak"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={editingStudent.dob}
                    onChange={(e) => setEditingStudent({ ...editingStudent, dob: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rombel / Kelas</label>
                  <select
                    value={editingStudent.classId}
                    onChange={(e) => setEditingStudent({ ...editingStudent, classId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    {sortedAllClassrooms.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status Keaktifan</label>
                  <select
                    value={editingStudent.status}
                    onChange={(e) => setEditingStudent({ ...editingStudent, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Mutasi">Mutasi Keluar</option>
                    <option value="Lulus">Lulus</option>
                    <option value="Keluar">Keluar</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Alamat Tempat Tinggal</label>
                  <input
                    type="text"
                    value={editingStudent.address}
                    onChange={(e) => setEditingStudent({ ...editingStudent, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    placeholder="Nama jalan, RT/RW, Dusun, Desa"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Ayah</label>
                  <input
                    type="text"
                    value={editingStudent.fatherName}
                    onChange={(e) => setEditingStudent({ ...editingStudent, fatherName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pekerjaan Ayah</label>
                  <input
                    type="text"
                    value={editingStudent.fatherJob}
                    onChange={(e) => setEditingStudent({ ...editingStudent, fatherJob: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Ibu</label>
                  <input
                    type="text"
                    value={editingStudent.motherName}
                    onChange={(e) => setEditingStudent({ ...editingStudent, motherName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">No. HP Orang Tua / WhatsApp</label>
                  <input
                    type="text"
                    value={editingStudent.parentPhone}
                    onChange={(e) => setEditingStudent({ ...editingStudent, parentPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Data Tambahan Buku Induk & Halaman Identitas Rapor */}
                <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                  <p className="font-bold text-slate-800 text-xs mb-2">
                    Informasi Buku Induk & Lembar Identitas Rapor (Opsional)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Status dlm Keluarga</label>
                      <input
                        type="text"
                        value={editingStudent.familyStatus || ''}
                        placeholder="Anak Kandung"
                        onChange={(e) => setEditingStudent({ ...editingStudent, familyStatus: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Anak Ke-</label>
                      <input
                        type="text"
                        value={editingStudent.childOrder || ''}
                        placeholder="1"
                        onChange={(e) => setEditingStudent({ ...editingStudent, childOrder: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Sekolah Asal</label>
                      <input
                        type="text"
                        value={editingStudent.previousSchool || ''}
                        placeholder="SD Negeri 01 Tanjung Samak"
                        onChange={(e) => setEditingStudent({ ...editingStudent, previousSchool: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Diterima di Kelas</label>
                      <input
                        type="text"
                        value={editingStudent.acceptedClass || ''}
                        placeholder="VII"
                        onChange={(e) => setEditingStudent({ ...editingStudent, acceptedClass: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Tanggal Diterima</label>
                      <input
                        type="text"
                        value={editingStudent.acceptedDate || ''}
                        placeholder="15 Juli 2024"
                        onChange={(e) => setEditingStudent({ ...editingStudent, acceptedDate: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Nama Wali (Jika Ada)</label>
                      <input
                        type="text"
                        value={editingStudent.guardianName || ''}
                        placeholder="Nama wali peserta didik"
                        onChange={(e) => setEditingStudent({ ...editingStudent, guardianName: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs"
                >
                  Simpan Data Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
