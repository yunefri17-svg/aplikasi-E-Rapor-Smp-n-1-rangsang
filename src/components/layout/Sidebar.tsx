import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  School,
  UserCheck,
  GraduationCap,
  Users,
  BookMarked,
  Sparkles,
  ClipboardList,
  Activity,
  CalendarCheck2,
  FileSpreadsheet,
  Calculator,
  FileSignature,
  Table,
  Files,
  FileCheck,
  TrendingUp,
  Printer,
  BarChart3,
  ArrowUpDown,
  ShieldAlert,
  Settings,
  Award,
  Calendar,
  Compass,
  Layers,
  Upload,
  X
} from 'lucide-react';
import { UserRole } from '../../types/erapor';

export type MenuId =
  | 'dashboard'
  | 'data-referensi'
  | 'buku-induk'
  | 'manajemen-tahun-ajaran'
  | 'data-sekolah'
  | 'data-guru'
  | 'data-siswa'
  | 'rombel'
  | 'data-mapel'
  | 'data-kurikulum'
  | 'penugasan-guru'
  | 'data-pembelajaran'
  | 'data-ekskul'
  | 'data-absensi'
  | 'input-nilai'
  | 'pengolahan-nilai'
  | 'deskripsi-nilai'
  | 'rekap-nilai-mapel'
  | 'rekap-nilai'
  | 'leger-nilai'
  | 'pengolahan-rapor'
  | 'transkrip-nilai'
  | 'kenaikan-kelas'
  | 'cetak-rapor'
  | 'laporan-sekolah'
  | 'impor-ekspor'
  | 'manajemen-wali-kelas'
  | 'manajemen-pengguna'
  | 'asesmen-formatif'
  | 'asesmen-sumatif'
  | 'kktp-config'
  | 'pengolahan-nilai-akhir'
  | 'kokurikuler-kelompok'
  | 'kokurikuler-kegiatan'
  | 'kokurikuler-profil'
  | 'kokurikuler-input'
  | 'kokurikuler-import'
  | 'kokurikuler-deskripsi'
  | 'kokurikuler-rekap-siswa'
  | 'kokurikuler-rekap-kelompok'
  | 'kokurikuler-cetak'
  | 'pengaturan-aplikasi';

interface SidebarProps {
  activeMenu: MenuId;
  onSelectMenu: (menu: MenuId) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  userRole: UserRole;
  counts?: {
    students: number;
    teachers: number;
    classes: number;
    subjects: number;
  };
}

interface MenuItem {
  id: MenuId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  roles: UserRole[]; // Which roles can access this menu
  subSection?: string;
}

interface MenuGroup {
  groupTitle: string;
  items: MenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeMenu,
  onSelectMenu,
  isOpenMobile,
  onCloseMobile,
  userRole,
  counts
}) => {
  const menuGroups: MenuGroup[] = [
    {
      groupTitle: 'UTAMA',
      items: [
        { id: 'dashboard', label: '1. Dashboard', icon: LayoutDashboard, roles: ['admin', 'guru', 'walikelas', 'kepsek'] },
        { id: 'data-referensi', label: '2. Data Referensi', icon: BookOpen, roles: ['admin', 'guru', 'walikelas', 'kepsek'] }
      ]
    },
    {
      groupTitle: 'DATA MASTER & AKADEMIK',
      items: [
        { id: 'buku-induk', label: 'Buku Induk Siswa', icon: BookOpen, badge: counts?.students, roles: ['admin', 'guru', 'walikelas', 'kepsek'] },
        { id: 'manajemen-tahun-ajaran', label: 'Manajemen Tahun Ajaran', icon: Calendar, roles: ['admin', 'kepsek'] },
        { id: 'data-sekolah', label: '3. Data Sekolah', icon: School, roles: ['admin', 'kepsek'] },
        { id: 'data-guru', label: '4. Data Guru & GTK', icon: UserCheck, badge: counts?.teachers, roles: ['admin', 'kepsek'] },
        { id: 'data-siswa', label: '5. Data Siswa', icon: GraduationCap, badge: counts?.students, roles: ['admin', 'guru', 'walikelas', 'kepsek'] },
        { id: 'rombel', label: '6. Rombongan Belajar', icon: Users, badge: counts?.classes, roles: ['admin', 'guru', 'walikelas', 'kepsek'] },
        { id: 'data-mapel', label: '7. Data Mata Pelajaran', icon: BookMarked, badge: counts?.subjects, roles: ['admin', 'guru', 'walikelas', 'kepsek'] },
        { id: 'data-kurikulum', label: '8. Data Kurikulum', icon: Sparkles, roles: ['admin', 'guru', 'walikelas', 'kepsek'] },
        { id: 'penugasan-guru', label: '9. Penugasan Guru Mengajar', icon: Award, roles: ['admin', 'kepsek', 'guru', 'walikelas'] },
        { id: 'data-pembelajaran', label: '10. Data Pembelajaran (CP/TP)', icon: ClipboardList, roles: ['admin', 'guru', 'walikelas'] },
        { id: 'data-ekskul', label: '11. Data Ekstrakurikuler', icon: Activity, roles: ['admin', 'walikelas'] }
      ]
    },
    {
      groupTitle: 'KURIKULUM MERDEKA 2025',
      items: [
        { id: 'kktp-config', label: '12. Konfigurasi KKTP', icon: Settings, roles: ['admin', 'guru', 'walikelas'] },
        { id: 'asesmen-formatif', label: '13. Asesmen Formatif', icon: ClipboardList, roles: ['admin', 'guru', 'walikelas'] },
        { id: 'asesmen-sumatif', label: '14. Asesmen Sumatif', icon: Award, roles: ['admin', 'guru', 'walikelas'] },
        { id: 'pengolahan-nilai-akhir', label: '15. Pengolahan Nilai Akhir', icon: Calculator, roles: ['admin', 'guru', 'walikelas'] }
      ]
    },
    {
      groupTitle: 'KOKURIKULER',
      items: [
        { id: 'kokurikuler-kelompok', label: 'Kelompok Kokurikuler', icon: Users, roles: ['admin', 'guru', 'walikelas', 'kepsek'], subSection: 'Data Kokurikuler' },
        { id: 'kokurikuler-kegiatan', label: 'Kegiatan Kokurikuler', icon: Layers, roles: ['admin', 'guru', 'walikelas', 'kepsek'], subSection: 'Data Kokurikuler' },
        { id: 'kokurikuler-profil', label: 'Profil Lulusan (8 Dimensi)', icon: Compass, roles: ['admin', 'guru', 'walikelas', 'kepsek'], subSection: 'Data Kokurikuler' },
        { id: 'kokurikuler-input', label: 'Input Nilai Kokurikuler', icon: ClipboardList, roles: ['admin', 'guru', 'walikelas'], subSection: 'Nilai Kokurikuler' },
        { id: 'kokurikuler-import', label: 'Import Nilai Kokurikuler', icon: Upload, roles: ['admin', 'guru', 'walikelas'], subSection: 'Nilai Kokurikuler' },
        { id: 'kokurikuler-deskripsi', label: 'Deskripsi Kokurikuler', icon: FileSignature, roles: ['admin', 'guru', 'walikelas'], subSection: 'Nilai Kokurikuler' },
        { id: 'kokurikuler-rekap-siswa', label: 'Rekap Capaian Siswa', icon: Table, roles: ['admin', 'guru', 'walikelas', 'kepsek'], subSection: 'Laporan Kokurikuler' },
        { id: 'kokurikuler-rekap-kelompok', label: 'Rekap Kelompok Kegiatan', icon: BarChart3, roles: ['admin', 'guru', 'walikelas', 'kepsek'], subSection: 'Laporan Kokurikuler' },
        { id: 'kokurikuler-cetak', label: 'Cetak Laporan Kokurikuler', icon: Printer, roles: ['admin', 'guru', 'walikelas', 'kepsek'], subSection: 'Laporan Kokurikuler' }
      ]
    },
    {
      groupTitle: 'PENILAIAN & PROSES',
      items: [
        { id: 'data-absensi', label: '16. Data Absensi', icon: CalendarCheck2, roles: ['admin', 'walikelas'] },
        { id: 'input-nilai', label: '17. Input Nilai Siswa (Legacy)', icon: FileSpreadsheet, roles: ['admin', 'guru', 'walikelas'] },
        { id: 'pengolahan-nilai', label: '18. Pengolahan Nilai (Legacy)', icon: Calculator, roles: ['admin', 'guru', 'walikelas'] },
        { id: 'deskripsi-nilai', label: '19. Deskripsi Nilai Otomatis', icon: FileSignature, roles: ['admin', 'guru', 'walikelas'] },
        { id: 'rekap-nilai-mapel', label: '20. Rekap Nilai Mata Pelajaran', icon: Table, roles: ['admin', 'walikelas', 'kepsek'] },
        { id: 'rekap-nilai', label: '21. Rekapitulasi Nilai Rapor', icon: Table, roles: ['admin', 'guru', 'walikelas', 'kepsek'] }
      ]
    },
    {
      groupTitle: 'RAPOR & KELULUSAN',
      items: [
        { id: 'leger-nilai', label: '16. Leger Nilai', icon: Files, roles: ['admin', 'walikelas', 'kepsek'] },
        { id: 'pengolahan-rapor', label: '17. Pengolahan Rapor', icon: FileCheck, roles: ['admin', 'walikelas', 'kepsek'] },
        { id: 'transkrip-nilai', label: 'Transkrip Nilai (6 Sem)', icon: FileSpreadsheet, roles: ['admin', 'walikelas', 'kepsek', 'guru'] },
        { id: 'kenaikan-kelas', label: '18. Kenaikan & Mutasi Siswa', icon: TrendingUp, roles: ['admin', 'walikelas', 'kepsek'] },
        { id: 'cetak-rapor', label: '19. Cetak Rapor (PDF)', icon: Printer, roles: ['admin', 'walikelas', 'kepsek'] }
      ]
    },
    {
      groupTitle: 'LAPORAN & SISTEM',
      items: [
        { id: 'laporan-sekolah', label: '20. Laporan Sekolah', icon: BarChart3, roles: ['admin', 'kepsek'] },
        { id: 'impor-ekspor', label: '21. Impor & Ekspor Dapodik', icon: ArrowUpDown, roles: ['admin'] },
        { id: 'manajemen-wali-kelas', label: '22. Manajemen Akun Wali Kelas', icon: UserCheck, roles: ['admin'] },
        { id: 'manajemen-pengguna', label: '23. Manajemen Pengguna', icon: ShieldAlert, roles: ['admin'] },
        { id: 'pengaturan-aplikasi', label: '24. Pengaturan Aplikasi', icon: Settings, roles: ['admin', 'kepsek'] }
      ]
    }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 h-screen w-72 bg-slate-900 text-slate-300 z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } border-r border-slate-800 shadow-xl print:hidden`}
      >
        {/* Top Branding */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm tracking-tighter shadow-md">
              ER
            </div>
            <div>
              <div className="font-extrabold text-white text-sm tracking-tight">
                E-RAPOR SMP
              </div>
              <div className="text-[11px] text-blue-400 font-semibold tracking-wide">
                SMPN 1 RANGSANG
              </div>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar text-xs">
          {menuGroups.map((group, gIdx) => {
            // Filter items that match current user role
            const visibleItems = group.items.filter((item) =>
              item.roles.includes(userRole)
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={gIdx} className="space-y-1">
                <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {group.groupTitle}
                </div>
                {visibleItems.map((item, idx) => {
                  const Icon = item.icon;
                  const isActive = activeMenu === item.id;
                  const prevSubSection = idx > 0 ? visibleItems[idx - 1].subSection : undefined;
                  const showSubHeader = item.subSection && item.subSection !== prevSubSection;

                  return (
                    <React.Fragment key={item.id}>
                      {showSubHeader && (
                        <div className="px-3 pt-2 pb-0.5 text-[10px] font-semibold text-blue-400/90 tracking-wide">
                          {item.subSection}
                        </div>
                      )}
                      <button
                        onClick={() => {
                          onSelectMenu(item.id);
                          if (isOpenMobile) onCloseMobile();
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white font-semibold shadow-xs shadow-blue-500/20 translate-x-0.5'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge !== undefined && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isActive
                                ? 'bg-blue-700 text-blue-100'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Versi 2.4 Kemendikbud</span>
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Online
          </span>
        </div>
      </aside>
    </>
  );
};
