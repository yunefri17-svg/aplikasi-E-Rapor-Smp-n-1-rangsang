import React, { useState, useMemo } from 'react';
import {
  Classroom,
  KokurikulerActivity,
  KokurikulerDescription,
  KokurikulerDimensionMaster,
  KokurikulerGroup,
  KokurikulerScore,
  SchoolProfile,
  Student,
  User
} from '../../types/erapor';
import { OFFICIAL_KOKURIKULER_DIMENSIONS } from '../../data/kokurikulerMaster';
import { canUserViewGroup, getSubdimensionMap } from '../../utils/kokurikulerHelper';
import { sortClassrooms } from '../../utils/classroomSort';
import { exportKokurikulerReportToExcel } from '../../services/excelService';
import { generateKokurikulerReportPDF } from '../../services/pdfService';
import {
  BarChart3,
  Users,
  Printer,
  FileSpreadsheet,
  Download,
  Calendar,
  Search,
  CheckCircle2,
  Compass,
  Layers
} from 'lucide-react';

export type KokurikulerLaporanTab = 'rekap-siswa' | 'rekap-kelompok' | 'cetak-laporan';

interface KokurikulerLaporanViewProps {
  activeTab: KokurikulerLaporanTab;
  onChangeTab: (tab: KokurikulerLaporanTab) => void;
  school: SchoolProfile;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  currentUser: User;
  students: Student[];
  classrooms: Classroom[];
  dimensions: KokurikulerDimensionMaster[];
  groups: KokurikulerGroup[];
  activities: KokurikulerActivity[];
  scores: KokurikulerScore[];
  descriptions: KokurikulerDescription[];
}

export const KokurikulerLaporanView: React.FC<KokurikulerLaporanViewProps> = ({
  activeTab,
  onChangeTab,
  school,
  academicYear,
  semester,
  currentUser,
  students,
  classrooms,
  dimensions,
  groups,
  activities,
  scores,
  descriptions
}) => {
  const activeDims = dimensions.length > 0 ? dimensions : OFFICIAL_KOKURIKULER_DIMENSIONS;
  const subMap = useMemo(() => getSubdimensionMap(activeDims), [activeDims]);
  const sortedClassrooms = useMemo(() => sortClassrooms(classrooms), [classrooms]);
  const classMap = useMemo(() => new Map(classrooms.map((c) => [c.id, c.name])), [classrooms]);
  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  const [filterYear, setFilterYear] = useState<string>(academicYear);
  const [filterSemester, setFilterSemester] = useState<'Ganjil' | 'Genap'>(semester);
  const [filterGroupId, setFilterGroupId] = useState<string>('ALL');
  const [filterActivityId, setFilterActivityId] = useState<string>('ALL');
  const [filterClassId, setFilterClassId] = useState<string>(
    currentUser.role === 'walikelas' && currentUser.classId ? currentUser.classId : 'ALL'
  );
  const [filterDimensionId, setFilterDimensionId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const availableYears = useMemo(() => {
    const set = new Set<string>([academicYear]);
    groups.forEach((g) => set.add(g.academicYear));
    scores.forEach((sc) => set.add(sc.academicYear));
    return Array.from(set).sort().reverse();
  }, [academicYear, groups, scores]);

  // Visible groups according to RBAC & selected period
  const visibleGroups = useMemo(() => {
    return groups.filter(
      (g) =>
        g.academicYear === filterYear &&
        g.semester === filterSemester &&
        canUserViewGroup(currentUser, g, students)
    );
  }, [groups, filterYear, filterSemester, currentUser, students]);

  const filteredGroups = useMemo(() => {
    return visibleGroups.filter((g) => {
      if (filterGroupId !== 'ALL' && g.id !== filterGroupId) return false;
      return true;
    });
  }, [visibleGroups, filterGroupId]);

  const filteredGroupIds = useMemo(() => new Set(filteredGroups.map((g) => g.id)), [filteredGroups]);

  const filteredActivities = useMemo(() => {
    return activities
      .filter((a) => {
        if (a.academicYear !== filterYear || a.semester !== filterSemester) return false;
        if (!filteredGroupIds.has(a.groupId)) return false;
        if (filterActivityId !== 'ALL' && a.id !== filterActivityId) return false;
        if (filterDimensionId !== 'ALL' && !a.dimensionIds?.includes(filterDimensionId)) return false;
        return true;
      })
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [activities, filterYear, filterSemester, filteredGroupIds, filterActivityId, filterDimensionId]);

  const filteredScores = useMemo(() => {
    return scores.filter((sc) => {
      if (sc.academicYear !== filterYear || sc.semester !== filterSemester) return false;
      if (!filteredGroupIds.has(sc.groupId)) return false;
      if (filterActivityId !== 'ALL' && sc.activityId !== filterActivityId) return false;
      if (filterClassId !== 'ALL' && sc.rombelId !== filterClassId) return false;
      if (filterDimensionId !== 'ALL' && sc.dimensionId !== filterDimensionId) return false;
      return true;
    });
  }, [scores, filterYear, filterSemester, filteredGroupIds, filterActivityId, filterClassId, filterDimensionId]);

  const filteredDescriptions = useMemo(() => {
    return descriptions.filter((d) => {
      if (d.academicYear !== filterYear || d.semester !== filterSemester) return false;
      if (!filteredGroupIds.has(d.groupId)) return false;
      if (filterActivityId !== 'ALL' && d.activityId !== filterActivityId) return false;
      if (filterClassId !== 'ALL' && d.rombelId !== filterClassId) return false;
      return true;
    });
  }, [descriptions, filterYear, filterSemester, filteredGroupIds, filterActivityId, filterClassId]);

  // Student-activity rows for Rekap per Siswa & Deskripsi
  const studentRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list: {
      student: Student;
      group: KokurikulerGroup;
      activity: KokurikulerActivity;
      targetCount: number;
      assessedCount: number;
      bCount: number;
      cCount: number;
      mCount: number;
      desc?: KokurikulerDescription;
    }[] = [];

    filteredActivities.forEach((act) => {
      const grp = filteredGroups.find((g) => g.id === act.groupId);
      if (!grp) return;
      (grp.studentIds || []).forEach((sid) => {
        const std = studentMap.get(sid);
        if (!std) return;
        if (filterClassId !== 'ALL' && std.classId !== filterClassId) return;
        if (
          q &&
          !std.name.toLowerCase().includes(q) &&
          !std.nisn.toLowerCase().includes(q) &&
          !std.nis.toLowerCase().includes(q)
        ) {
          return;
        }

        const actScores = filteredScores.filter(
          (sc) => sc.studentId === std.id && sc.activityId === act.id && sc.groupId === grp.id
        );
        const desc = filteredDescriptions.find(
          (d) => d.studentId === std.id && d.activityId === act.id && d.groupId === grp.id
        );

        const targetSubs =
          filterDimensionId === 'ALL'
            ? act.subdimensionIds || []
            : (act.subdimensionIds || []).filter(
                (subId) => subMap.get(subId)?.dim.id === filterDimensionId
              );

        list.push({
          student: std,
          group: grp,
          activity: act,
          targetCount: targetSubs.length,
          assessedCount: actScores.length,
          bCount: actScores.filter((s) => s.level === 'Berkembang').length,
          cCount: actScores.filter((s) => s.level === 'Cakap').length,
          mCount: actScores.filter((s) => s.level === 'Mahir').length,
          desc
        });
      });
    });

    return list;
  }, [
    filteredActivities,
    filteredGroups,
    filteredScores,
    filteredDescriptions,
    studentMap,
    filterClassId,
    filterDimensionId,
    searchQuery,
    subMap
  ]);

  // Dimension & Subdimension breakdown
  const dimensionBreakdown = useMemo(() => {
    return activeDims.map((dim) => {
      const dimScores = filteredScores.filter((sc) => sc.dimensionId === dim.id);
      return {
        dim,
        total: dimScores.length,
        b: dimScores.filter((s) => s.level === 'Berkembang').length,
        c: dimScores.filter((s) => s.level === 'Cakap').length,
        m: dimScores.filter((s) => s.level === 'Mahir').length,
        subs: dim.subdimensions.map((sub) => {
          const subScores = dimScores.filter((sc) => sc.subdimensionId === sub.id);
          return {
            sub,
            total: subScores.length,
            b: subScores.filter((s) => s.level === 'Berkembang').length,
            c: subScores.filter((s) => s.level === 'Cakap').length,
            m: subScores.filter((s) => s.level === 'Mahir').length
          };
        })
      };
    });
  }, [activeDims, filteredScores]);

  // Summary metrics
  const totalSlots = studentRows.reduce((acc, r) => acc + r.targetCount, 0);
  const totalAssessed = studentRows.reduce((acc, r) => acc + r.assessedCount, 0);
  const completionPct = totalSlots > 0 ? Math.round((totalAssessed / totalSlots) * 100) : 0;

  const handleExportPDF = () => {
    generateKokurikulerReportPDF({
      school,
      academicYear: filterYear,
      semester: filterSemester,
      title: 'Laporan Hasil Penilaian Kokurikuler SMP',
      groups: filteredGroups,
      activities: filteredActivities,
      scores: filteredScores,
      descriptions: filteredDescriptions,
      students: filterClassId === 'ALL' ? students : students.filter((s) => s.classId === filterClassId),
      classrooms,
      dimensions: activeDims
    });
  };

  const handleExportExcel = () => {
    exportKokurikulerReportToExcel(
      school.name,
      filterYear,
      filterSemester,
      filteredGroups,
      filteredActivities,
      filteredScores,
      filteredDescriptions,
      filterClassId === 'ALL' ? students : students.filter((s) => s.classId === filterClassId),
      classrooms,
      activeDims
    );
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider">
            <BarChart3 className="w-4 h-4" />
            Kokurikuler &bull; Laporan & Rekapitulasi Capaian
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
            Rekap Capaian Siswa, Kelompok Kegiatan, dan Cetak Laporan Kokurikuler
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Monitoring capaian Berkembang, Cakap, Mahir per siswa, rombel, kelompok, dimensi, subdimensi, serta ekspor PDF & Excel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 transition"
          >
            <Download className="w-4 h-4" />
            Cetak Laporan PDF
          </button>
        </div>
      </div>

      {/* Submenu Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 w-fit">
        <button
          type="button"
          onClick={() => onChangeTab('rekap-siswa')}
          className={`px-3.5 py-2 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${
            activeTab === 'rekap-siswa'
              ? 'bg-white text-blue-700 border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          1. Rekap Capaian Siswa
        </button>
        <button
          type="button"
          onClick={() => onChangeTab('rekap-kelompok')}
          className={`px-3.5 py-2 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${
            activeTab === 'rekap-kelompok'
              ? 'bg-white text-blue-700 border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          2. Rekap Kelompok & Dimensi
        </button>
        <button
          type="button"
          onClick={() => onChangeTab('cetak-laporan')}
          className={`px-3.5 py-2 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${
            activeTab === 'cetak-laporan'
              ? 'bg-white text-blue-700 border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Printer className="w-3.5 h-3.5" />
          3. Cetak Laporan & Rincian Rapor
        </button>
      </div>

      {/* Comprehensive Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
        <div>
          <label className="block font-bold text-slate-600 mb-1">Tahun Pelajaran</label>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white font-bold"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-600 mb-1">Semester</label>
          <select
            value={filterSemester}
            onChange={(e) => setFilterSemester(e.target.value as 'Ganjil' | 'Genap')}
            className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white font-bold"
          >
            <option value="Ganjil">Ganjil</option>
            <option value="Genap">Genap</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-600 mb-1">Rombel</label>
          <select
            value={filterClassId}
            disabled={currentUser.role === 'walikelas' && Boolean(currentUser.classId)}
            onChange={(e) => setFilterClassId(e.target.value)}
            className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white font-semibold disabled:bg-slate-50"
          >
            <option value="ALL">Semua Rombel</option>
            {sortedClassrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-600 mb-1">Kelompok</label>
          <select
            value={filterGroupId}
            onChange={(e) => {
              setFilterGroupId(e.target.value);
              setFilterActivityId('ALL');
            }}
            className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
          >
            <option value="ALL">Semua Kelompok ({visibleGroups.length})</option>
            {visibleGroups.map((g) => (
              <option key={g.id} value={g.id}>
                [{g.code}] {g.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-600 mb-1">Kegiatan</label>
          <select
            value={filterActivityId}
            onChange={(e) => setFilterActivityId(e.target.value)}
            className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
          >
            <option value="ALL">Semua Kegiatan</option>
            {activities
              .filter(
                (a) =>
                  a.academicYear === filterYear &&
                  a.semester === filterSemester &&
                  (filterGroupId === 'ALL' || a.groupId === filterGroupId)
              )
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-600 mb-1">Dimensi Profil Lulusan</label>
          <select
            value={filterDimensionId}
            onChange={(e) => setFilterDimensionId(e.target.value)}
            className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
          >
            <option value="ALL">Semua 8 Dimensi</option>
            {activeDims.map((d) => (
              <option key={d.id} value={d.id}>
                {d.order}. {d.shortName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Kelompok & Kegiatan</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1 tabular-nums">
            {filteredGroups.length} Kel &bull; {filteredActivities.length} Keg
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Periode {filterYear} ({filterSemester})
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Kelengkapan Penilaian</div>
          <div className="text-xl font-extrabold text-blue-700 mt-1 tabular-nums">
            {completionPct}% ({totalAssessed}/{totalSlots})
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Target subdimensi dinilai</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Distribusi Tingkatan</div>
          <div className="text-xs font-bold mt-1.5 flex items-center gap-3 tabular-nums">
            <span className="text-amber-700">
              B: {filteredScores.filter((s) => s.level === 'Berkembang').length}
            </span>
            <span className="text-emerald-700">
              C: {filteredScores.filter((s) => s.level === 'Cakap').length}
            </span>
            <span className="text-blue-700">
              M: {filteredScores.filter((s) => s.level === 'Mahir').length}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">B=Berkembang, C=Cakap, M=Mahir</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Deskripsi Siap Rapor</div>
          <div className="text-xl font-extrabold text-emerald-700 mt-1 tabular-nums">
            {
              filteredDescriptions.filter(
                (d) =>
                  d.description &&
                  (d.status === 'Sudah disimpan' ||
                    d.status === 'Sudah diperiksa' ||
                    d.status === 'Final')
              ).length
            }{' '}
            / {studentRows.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Siap tampil di Cetak Rapor</div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: REKAP CAPAIAN PER SISWA */}
      {/* =================================================================== */}
      {activeTab === 'rekap-siswa' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-bold text-slate-900">
              Rekap Capaian Kokurikuler per Peserta Didik ({studentRows.length} entri)
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama atau NISN siswa..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase text-[11px]">
                <tr>
                  <th className="px-3 py-3 font-bold w-10 text-center">No</th>
                  <th className="px-3 py-3 font-bold">Nama Siswa & NISN</th>
                  <th className="px-3 py-3 font-bold">Rombel</th>
                  <th className="px-3 py-3 font-bold">Kelompok & Kegiatan</th>
                  <th className="px-3 py-3 font-bold text-center">Terisi</th>
                  <th className="px-3 py-3 font-bold text-center">B / C / M</th>
                  <th className="px-3 py-3 font-bold">Status & Deskripsi Rapor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {studentRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      Belum ada data rekap siswa pada filter terpilih.
                    </td>
                  </tr>
                ) : (
                  studentRows.map((row, idx) => (
                    <tr key={`${row.student.id}-${row.activity.id}`} className="align-top hover:bg-slate-50/70">
                      <td className="px-3 py-2.5 text-center tabular-nums font-semibold">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-900">{row.student.name}</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {row.student.nis} / {row.student.nisn}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-700 whitespace-nowrap">
                        {classMap.get(row.student.classId) || '-'}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-900">{row.activity.name}</div>
                        <div className="text-[11px] text-blue-700 font-semibold">
                          [{row.group.code}] {row.group.name}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold tabular-nums">
                        {row.assessedCount}/{row.targetCount}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono font-bold tabular-nums whitespace-nowrap">
                        <span className="text-amber-700">{row.bCount}</span> /{' '}
                        <span className="text-emerald-700">{row.cCount}</span> /{' '}
                        <span className="text-blue-700">{row.mCount}</span>
                      </td>
                      <td className="px-3 py-2.5 max-w-md">
                        <div className="font-bold text-slate-800 text-[11px]">
                          Status: {row.desc?.status || 'Belum diisi'}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                          {row.desc?.description || 'Deskripsi belum disusun.'}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: REKAP KELOMPOK, ROMBEL, DIMENSI & SUBDIMENSI */}
      {/* =================================================================== */}
      {activeTab === 'rekap-kelompok' && (
        <div className="space-y-5">
          {/* Rekap per Kelompok & Kegiatan */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2 text-sm font-bold text-slate-900">
              <Layers className="w-4 h-4 text-blue-600" />
              Rekap Kelengkapan Penilaian per Kelompok & Kegiatan
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase text-[11px]">
                  <tr>
                    <th className="px-4 py-3 font-bold">Kelompok</th>
                    <th className="px-4 py-3 font-bold">Kegiatan & Tema</th>
                    <th className="px-4 py-3 font-bold text-center">Peserta</th>
                    <th className="px-4 py-3 font-bold text-center">Subdimensi</th>
                    <th className="px-4 py-3 font-bold text-center">Kelengkapan Input</th>
                    <th className="px-4 py-3 font-bold text-center">Berkembang</th>
                    <th className="px-4 py-3 font-bold text-center">Cakap</th>
                    <th className="px-4 py-3 font-bold text-center">Mahir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredActivities.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        Belum ada kegiatan kokurikuler pada filter ini.
                      </td>
                    </tr>
                  ) : (
                    filteredActivities.map((act) => {
                      const grp = filteredGroups.find((g) => g.id === act.groupId);
                      if (!grp) return null;
                      const actScores = filteredScores.filter(
                        (sc) => sc.activityId === act.id && sc.groupId === grp.id
                      );
                      const expected = (grp.studentIds?.length || 0) * (act.subdimensionIds?.length || 0);
                      const pct = expected > 0 ? Math.round((actScores.length / expected) * 100) : 0;

                      return (
                        <tr key={act.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3">
                            <div className="font-mono text-[11px] font-bold text-blue-700">{grp.code}</div>
                            <div className="font-bold text-slate-900">{grp.name}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800">{act.name}</div>
                            <div className="text-[11px] text-slate-500">{act.theme}</div>
                          </td>
                          <td className="px-4 py-3 text-center font-bold tabular-nums">
                            {grp.studentIds?.length || 0}
                          </td>
                          <td className="px-4 py-3 text-center font-bold tabular-nums">
                            {act.subdimensionIds?.length || 0}
                          </td>
                          <td className="px-4 py-3 text-center font-bold tabular-nums">
                            {pct}% ({actScores.length}/{expected})
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-amber-700 tabular-nums">
                            {actScores.filter((s) => s.level === 'Berkembang').length}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-emerald-700 tabular-nums">
                            {actScores.filter((s) => s.level === 'Cakap').length}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-blue-700 tabular-nums">
                            {actScores.filter((s) => s.level === 'Mahir').length}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rekap per Dimensi & Subdimensi (8 Dimensi, 25 Subdimensi SMP) */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2 text-sm font-bold text-slate-900">
              <Compass className="w-4 h-4 text-blue-600" />
              Rekap Capaian per Dimensi & Subdimensi Profil Lulusan (BSKAP 058/H/KR/2025)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase text-[11px]">
                  <tr>
                    <th className="px-4 py-3 font-bold">Kode</th>
                    <th className="px-4 py-3 font-bold">Dimensi / Subdimensi Profil Lulusan</th>
                    <th className="px-4 py-3 font-bold text-center">Total Dinilai</th>
                    <th className="px-4 py-3 font-bold text-center">Berkembang</th>
                    <th className="px-4 py-3 font-bold text-center">Cakap (Standar)</th>
                    <th className="px-4 py-3 font-bold text-center">Mahir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {dimensionBreakdown.map(({ dim, total, b, c, m, subs }) => (
                    <React.Fragment key={dim.id}>
                      <tr className="bg-slate-50/90 font-bold text-slate-900">
                        <td className="px-4 py-2.5 font-mono text-blue-700">D{dim.order}</td>
                        <td className="px-4 py-2.5">{dim.name}</td>
                        <td className="px-4 py-2.5 text-center tabular-nums">{total}</td>
                        <td className="px-4 py-2.5 text-center text-amber-700 tabular-nums">{b}</td>
                        <td className="px-4 py-2.5 text-center text-emerald-700 tabular-nums">{c}</td>
                        <td className="px-4 py-2.5 text-center text-blue-700 tabular-nums">{m}</td>
                      </tr>
                      {subs.map(({ sub, total: sTotal, b: sB, c: sC, m: sM }) => (
                        <tr key={sub.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-2 pl-7 font-mono text-[11px] text-slate-500">
                            {sub.code}
                          </td>
                          <td className="px-4 py-2 pl-7 text-slate-700">{sub.name}</td>
                          <td className="px-4 py-2 text-center tabular-nums text-slate-600">{sTotal}</td>
                          <td className="px-4 py-2 text-center tabular-nums text-amber-700">{sB}</td>
                          <td className="px-4 py-2 text-center tabular-nums text-emerald-700">{sC}</td>
                          <td className="px-4 py-2 text-center tabular-nums text-blue-700">{sM}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: CETAK LAPORAN & PRATINJAU DESKRIPSI RAPOR */}
      {/* =================================================================== */}
      {activeTab === 'cetak-laporan' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Pratinjau Laporan Resmi Kokurikuler Siap Cetak ({school.name})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Menampilkan daftar deskripsi kokurikuler siswa yang akan tercantum di Bagian B Rapor Hasil Belajar serta opsi unduh dokumen PDF & Excel.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 font-bold flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Unduh Excel
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Unduh PDF Laporan
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase text-[11px]">
                <tr>
                  <th className="px-3 py-2.5 font-bold w-10 text-center">No</th>
                  <th className="px-3 py-2.5 font-bold">Nama Peserta Didik & Rombel</th>
                  <th className="px-3 py-2.5 font-bold">Kegiatan & Tema</th>
                  <th className="px-3 py-2.5 font-bold">Deskripsi Resmi pada Rapor</th>
                  <th className="px-3 py-2.5 font-bold text-center">Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {studentRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                      Belum ada data untuk dicetak pada filter terpilih.
                    </td>
                  </tr>
                ) : (
                  studentRows.map((row, idx) => (
                    <tr key={`${row.student.id}-${row.activity.id}`} className="align-top">
                      <td className="px-3 py-2.5 text-center tabular-nums font-semibold">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-900">{row.student.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {classMap.get(row.student.classId) || '-'} &bull; NISN {row.student.nisn}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-900">{row.activity.name}</div>
                        <div className="text-[11px] text-slate-500">{row.activity.theme}</div>
                      </td>
                      <td className="px-3 py-2.5 max-w-lg text-slate-700 leading-relaxed">
                        {row.desc?.description || (
                          <span className="italic text-slate-400">
                            Belum ada deskripsi rapor tersimpan.
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-800">
                          <CheckCircle2
                            className={`w-3.5 h-3.5 ${
                              row.desc?.description ? 'text-emerald-600' : 'text-slate-300'
                            }`}
                          />
                          {row.desc?.status || 'Belum diisi'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
