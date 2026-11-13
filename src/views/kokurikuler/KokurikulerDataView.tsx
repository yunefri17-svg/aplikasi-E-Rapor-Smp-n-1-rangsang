import React, { useState, useMemo } from 'react';
import {
  Classroom,
  KokurikulerActivity,
  KokurikulerDescription,
  KokurikulerDimensionMaster,
  KokurikulerGroup,
  KokurikulerScore,
  KokurikulerThemeMaster,
  Student,
  Teacher,
  User
} from '../../types/erapor';
import {
  OFFICIAL_KOKURIKULER_DIMENSIONS,
  OFFICIAL_KOKURIKULER_THEMES,
  OFFICIAL_SMP_PHASES
} from '../../data/kokurikulerMaster';
import {
  canUserAssessGroup,
  cleanAcademicYearKey,
  resolveUserTeacherId
} from '../../utils/kokurikulerHelper';
import { sortClassrooms } from '../../utils/classroomSort';
import { AlurPerkembanganModal } from './AlurPerkembanganModal';
import {
  Users,
  Calendar,
  Compass,
  Plus,
  Edit3,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Search,
  BookOpenCheck,
  Layers,
  Tag,
  Save,
  X,
  Info,
  ShieldCheck
} from 'lucide-react';

export type KokurikulerDataTab = 'kelompok' | 'kegiatan' | 'profil-lulusan';

interface KokurikulerDataViewProps {
  activeTab: KokurikulerDataTab;
  onChangeTab: (tab: KokurikulerDataTab) => void;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  currentUser: User;
  teachers: Teacher[];
  students: Student[];
  classrooms: Classroom[];
  dimensions: KokurikulerDimensionMaster[];
  themes: KokurikulerThemeMaster[];
  groups: KokurikulerGroup[];
  activities: KokurikulerActivity[];
  scores: KokurikulerScore[];
  descriptions: KokurikulerDescription[];
  onSaveGroup: (group: KokurikulerGroup) => Promise<{ success: boolean; error?: string }>;
  onDeleteGroup: (groupId: string) => Promise<{ success: boolean; error?: string }>;
  onSaveActivity: (activity: KokurikulerActivity) => Promise<{ success: boolean; error?: string }>;
  onDeleteActivity: (activityId: string) => Promise<{ success: boolean; error?: string }>;
  onSaveDimensions: (dims: KokurikulerDimensionMaster[]) => Promise<{ success: boolean; error?: string }>;
  onSaveThemes: (themes: KokurikulerThemeMaster[]) => Promise<{ success: boolean; error?: string }>;
}

export const KokurikulerDataView: React.FC<KokurikulerDataViewProps> = ({
  activeTab,
  onChangeTab,
  academicYear,
  semester,
  currentUser,
  teachers,
  students,
  classrooms,
  dimensions,
  themes,
  groups,
  activities,
  scores,
  descriptions,
  onSaveGroup,
  onDeleteGroup,
  onSaveActivity,
  onDeleteActivity,
  onSaveDimensions,
  onSaveThemes
}) => {
  const activeDims = dimensions.length > 0 ? dimensions : OFFICIAL_KOKURIKULER_DIMENSIONS;
  const activeThemes = themes.length > 0 ? themes : OFFICIAL_KOKURIKULER_THEMES;
  const sortedClassrooms = useMemo(() => sortClassrooms(classrooms), [classrooms]);
  const sortedTeachers = useMemo(
    () => [...teachers].sort((a, b) => a.name.localeCompare(b.name)),
    [teachers]
  );
  const activeStudents = useMemo(
    () =>
      students
        .filter((s) => s.status === 'Aktif')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [students]
  );

  const isAdmin = currentUser.role === 'admin';
  const isReadOnlyRole = currentUser.role === 'kepsek';
  const myTeacherId = resolveUserTeacherId(currentUser);

  // Shared period filter (defaults to active school year & semester)
  const [filterYear, setFilterYear] = useState<string>(academicYear);
  const [filterSemester, setFilterSemester] = useState<'Ganjil' | 'Genap'>(semester);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isRubricModalOpen, setIsRubricModalOpen] = useState(false);

  const availableYears = useMemo(() => {
    const yrs = new Set<string>([academicYear]);
    groups.forEach((g) => yrs.add(g.academicYear));
    activities.forEach((a) => yrs.add(a.academicYear));
    return Array.from(yrs).sort().reverse();
  }, [academicYear, groups, activities]);

  // Period-filtered groups & activities
  const periodGroups = useMemo(
    () =>
      groups.filter(
        (g) =>
          g.academicYear === filterYear &&
          g.semester === filterSemester &&
          (isAdmin || isReadOnlyRole || canUserAssessGroup(currentUser, g) || g.status === 'Aktif')
      ),
    [groups, filterYear, filterSemester, isAdmin, isReadOnlyRole, currentUser]
  );

  // =========================================================================
  // TAB 1: KELOMPOK KOKURIKULER STATE & HANDLERS
  // =========================================================================
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState<{
    code: string;
    name: string;
    theme: string;
    phase: string;
    classIds: string[];
    coordinatorTeacherId: string;
    involvedTeacherIds: string[];
    involvedTeacherDimensions: Record<string, string[]>;
    studentIds: string[];
    status: 'Aktif' | 'Nonaktif';
    isAssessmentLocked: boolean;
  }>({
    code: '',
    name: '',
    theme: activeThemes[0]?.name || '',
    phase: OFFICIAL_SMP_PHASES[0],
    classIds: [],
    coordinatorTeacherId: myTeacherId || sortedTeachers[0]?.id || '',
    involvedTeacherIds: [],
    involvedTeacherDimensions: {},
    studentIds: [],
    status: 'Aktif',
    isAssessmentLocked: false
  });
  const [studentSearch, setStudentSearch] = useState('');
  const [isSavingGroup, setIsSavingGroup] = useState(false);

  const generateNextGroupCode = () => {
    const yearShort = filterYear
      .split('/')
      .map((y) => y.slice(-2))
      .join('');
    const semNum = filterSemester === 'Ganjil' ? '1' : '2';
    const count = periodGroups.length + 1;
    return `KOK-${yearShort}-${semNum}-${String(count).padStart(2, '0')}`;
  };

  const openNewGroupModal = () => {
    setFeedback(null);
    setEditingGroupId(null);
    setGroupForm({
      code: generateNextGroupCode(),
      name: '',
      theme: activeThemes.find((t) => t.isActive)?.name || activeThemes[0]?.name || '',
      phase: OFFICIAL_SMP_PHASES[0],
      classIds: [],
      coordinatorTeacherId: myTeacherId || sortedTeachers[0]?.id || '',
      involvedTeacherIds: [],
      involvedTeacherDimensions: {},
      studentIds: [],
      status: 'Aktif',
      isAssessmentLocked: false
    });
    setStudentSearch('');
    setIsGroupModalOpen(true);
  };

  const openEditGroupModal = (grp: KokurikulerGroup) => {
    setFeedback(null);
    setEditingGroupId(grp.id);
    setGroupForm({
      code: grp.code,
      name: grp.name,
      theme: grp.theme,
      phase: grp.phase,
      classIds: [...(grp.classIds || [])],
      coordinatorTeacherId: grp.coordinatorTeacherId,
      involvedTeacherIds: [...(grp.involvedTeacherIds || [])],
      involvedTeacherDimensions: { ...(grp.involvedTeacherDimensions || {}) },
      studentIds: [...(grp.studentIds || [])],
      status: grp.status,
      isAssessmentLocked: Boolean(grp.isAssessmentLocked)
    });
    setStudentSearch('');
    setIsGroupModalOpen(true);
  };

  const toggleGroupClass = (classId: string) => {
    setGroupForm((prev) => {
      const exists = prev.classIds.includes(classId);
      const nextClasses = exists
        ? prev.classIds.filter((c) => c !== classId)
        : [...prev.classIds, classId];

      // Auto-add/remove students belonging to that class cleanly
      const classStudentIds = activeStudents
        .filter((s) => s.classId === classId)
        .map((s) => s.id);
      const studentSet = new Set(prev.studentIds);
      if (exists) {
        classStudentIds.forEach((sid) => studentSet.delete(sid));
      } else {
        classStudentIds.forEach((sid) => studentSet.add(sid));
      }

      return {
        ...prev,
        classIds: nextClasses,
        studentIds: Array.from(studentSet)
      };
    });
  };

  const handleSaveGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.code.trim() || !groupForm.name.trim()) {
      setFeedback({ type: 'error', message: 'Kode dan Nama Kelompok wajib diisi.' });
      return;
    }
    if (!groupForm.coordinatorTeacherId) {
      setFeedback({ type: 'error', message: 'Koordinator Kelompok wajib dipilih dari data guru terdaftar.' });
      return;
    }
    if (groupForm.studentIds.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Pilih minimal satu rombel atau siswa peserta terdaftar ke dalam kelompok ini.'
      });
      return;
    }

    setIsSavingGroup(true);
    const now = new Date().toISOString();
    const coordTeacher = teachers.find((t) => t.id === groupForm.coordinatorTeacherId);
    const existing = editingGroupId ? groups.find((g) => g.id === editingGroupId) : undefined;

    const payload: KokurikulerGroup = {
      id:
        editingGroupId ||
        `kkg_${cleanAcademicYearKey(filterYear)}_${filterSemester}_${Date.now()}`,
      code: groupForm.code.trim(),
      name: groupForm.name.trim(),
      academicYear: existing?.academicYear || filterYear,
      semester: existing?.semester || filterSemester,
      theme: groupForm.theme,
      phase: groupForm.phase,
      classIds: groupForm.classIds,
      coordinatorTeacherId: groupForm.coordinatorTeacherId,
      coordinatorName: coordTeacher?.name || '',
      involvedTeacherIds: groupForm.involvedTeacherIds,
      involvedTeacherDimensions: groupForm.involvedTeacherDimensions,
      studentIds: groupForm.studentIds,
      status: groupForm.status,
      isAssessmentLocked: groupForm.isAssessmentLocked,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };

    const res = await onSaveGroup(payload);
    setIsSavingGroup(false);

    if (res.success) {
      setIsGroupModalOpen(false);
      setFeedback({
        type: 'success',
        message: `Kelompok "${payload.name}" (${payload.studentIds.length} siswa) berhasil disimpan ke Firebase.`
      });
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'Gagal menyimpan kelompok ke Firebase.'
      });
    }
  };

  const handleDeleteGroupWithCheck = async (grp: KokurikulerGroup) => {
    const depActivities = activities.filter((a) => a.groupId === grp.id);
    const depScores = scores.filter((sc) => sc.groupId === grp.id);
    const depDescs = descriptions.filter((d) => d.groupId === grp.id);

    if (depActivities.length > 0 || depScores.length > 0 || depDescs.length > 0) {
      setFeedback({
        type: 'error',
        message: `Kelompok "${grp.name}" tidak dapat dihapus karena masih memiliki ${depActivities.length} kegiatan, ${depScores.length} capaian penilaian, dan ${depDescs.length} deskripsi. Hapus data turunan terlebih dahulu atau ubah status menjadi Nonaktif.`
      });
      return;
    }

    const res = await onDeleteGroup(grp.id);
    if (res.success) {
      setFeedback({ type: 'success', message: `Kelompok "${grp.name}" berhasil dihapus.` });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Gagal menghapus kelompok.' });
    }
  };

  const handleToggleGroupLock = async (grp: KokurikulerGroup) => {
    if (!isAdmin && grp.coordinatorTeacherId !== myTeacherId) {
      setFeedback({
        type: 'error',
        message: 'Hanya Administrator atau Koordinator kelompok ini yang dapat mengubah kunci penilaian.'
      });
      return;
    }
    const res = await onSaveGroup({
      ...grp,
      isAssessmentLocked: !grp.isAssessmentLocked,
      updatedAt: new Date().toISOString()
    });
    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Penilaian kelompok "${grp.name}" ${!grp.isAssessmentLocked ? 'dikunci' : 'dibuka kembali'}.`
      });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Gagal memperbarui status kunci.' });
    }
  };

  // =========================================================================
  // TAB 2: KEGIATAN KOKURIKULER STATE & HANDLERS
  // =========================================================================
  const [filterTheme, setFilterTheme] = useState<string>('ALL');
  const [filterPhase, setFilterPhase] = useState<string>('ALL');
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [activityForm, setActivityForm] = useState<{
    orderIndex: number;
    name: string;
    finalObjective: string;
    groupId: string;
    theme: string;
    phase: string;
    dimensionIds: string[];
  }>({
    orderIndex: 1,
    name: '',
    finalObjective: '',
    groupId: '',
    theme: activeThemes[0]?.name || '',
    phase: OFFICIAL_SMP_PHASES[0],
    dimensionIds: ['dim-1', 'dim-5']
  });
  const [isSavingActivity, setIsSavingActivity] = useState(false);

  const periodActivities = useMemo(() => {
    return activities
      .filter((a) => {
        if (a.academicYear !== filterYear || a.semester !== filterSemester) return false;
        if (filterTheme !== 'ALL' && a.theme !== filterTheme) return false;
        if (filterPhase !== 'ALL' && a.phase !== filterPhase) return false;
        return true;
      })
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [activities, filterYear, filterSemester, filterTheme, filterPhase]);

  const openNewActivityModal = () => {
    setFeedback(null);
    if (periodGroups.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Buat Kelompok Kokurikuler terlebih dahulu untuk Tahun Pelajaran dan Semester ini sebelum menambah kegiatan.'
      });
      return;
    }
    const defaultGrp = periodGroups[0];
    setEditingActivityId(null);
    setActivityForm({
      orderIndex: periodActivities.length + 1,
      name: '',
      finalObjective: '',
      groupId: defaultGrp.id,
      theme: defaultGrp.theme,
      phase: defaultGrp.phase,
      dimensionIds: []
    });
    setIsActivityModalOpen(true);
  };

  const openEditActivityModal = (act: KokurikulerActivity) => {
    setFeedback(null);
    setEditingActivityId(act.id);
    setActivityForm({
      orderIndex: act.orderIndex,
      name: act.name,
      finalObjective: act.finalObjective,
      groupId: act.groupId,
      theme: act.theme,
      phase: act.phase,
      dimensionIds: [...(act.dimensionIds || [])]
    });
    setIsActivityModalOpen(true);
  };

  const handleSaveActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityForm.name.trim() || !activityForm.finalObjective.trim()) {
      setFeedback({ type: 'error', message: 'Nama Kegiatan dan Tujuan Akhir Kegiatan wajib diisi.' });
      return;
    }
    if (!activityForm.groupId) {
      setFeedback({ type: 'error', message: 'Kelompok Kegiatan wajib dipilih.' });
      return;
    }
    if (activityForm.dimensionIds.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Pilih minimal 1 Dimensi Profil Lulusan untuk kegiatan ini.'
      });
      return;
    }

    setIsSavingActivity(true);
    const now = new Date().toISOString();
    const existing = editingActivityId
      ? activities.find((a) => a.id === editingActivityId)
      : undefined;

    // Keep previously selected subdimensions that belong to retained dimensions;
    // if new dimensions have no subdimensions chosen yet, auto-include their default subdimensions or let user refine in Profil Lulusan tab
    const validDimSet = new Set(activityForm.dimensionIds);
    const existingSubs = (existing?.subdimensionIds || []).filter((subId) => {
      const owner = activeDims.find((d) => d.subdimensions.some((s) => s.id === subId));
      return owner && validDimSet.has(owner.id);
    });

    const dimsWithoutSubs = activityForm.dimensionIds.filter(
      (dId) =>
        !existingSubs.some((subId) => {
          const dim = activeDims.find((d) => d.id === dId);
          return dim?.subdimensions.some((s) => s.id === subId);
        })
    );

    const autoAddedSubs: string[] = [];
    dimsWithoutSubs.forEach((dId) => {
      const dim = activeDims.find((d) => d.id === dId);
      if (dim && dim.subdimensions.length > 0) {
        // Preselect all subdimensions of newly chosen dimension so teacher can immediately assess or adjust in Profil Lulusan
        dim.subdimensions.forEach((s) => autoAddedSubs.push(s.id));
      }
    });

    const payload: KokurikulerActivity = {
      id:
        editingActivityId ||
        `kka_${cleanAcademicYearKey(filterYear)}_${filterSemester}_${Date.now()}`,
      orderIndex: Number(activityForm.orderIndex) || 1,
      name: activityForm.name.trim(),
      finalObjective: activityForm.finalObjective.trim(),
      groupId: activityForm.groupId,
      theme: activityForm.theme,
      phase: activityForm.phase,
      academicYear: existing?.academicYear || filterYear,
      semester: existing?.semester || filterSemester,
      dimensionIds: activityForm.dimensionIds,
      subdimensionIds: Array.from(new Set([...existingSubs, ...autoAddedSubs])),
      isLocked: existing?.isLocked || false,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };

    const res = await onSaveActivity(payload);
    setIsSavingActivity(false);
    if (res.success) {
      setIsActivityModalOpen(false);
      setFeedback({
        type: 'success',
        message: `Kegiatan "${payload.name}" berhasil disimpan. Anda dapat menyesuaikan subdimensi target di menu Profil Lulusan.`
      });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Gagal menyimpan kegiatan.' });
    }
  };

  const handleDeleteActivityWithCheck = async (act: KokurikulerActivity) => {
    const depScores = scores.filter((sc) => sc.activityId === act.id);
    const depDescs = descriptions.filter((d) => d.activityId === act.id);
    if (depScores.length > 0 || depDescs.length > 0) {
      setFeedback({
        type: 'error',
        message: `Kegiatan "${act.name}" tidak dapat dihapus karena sudah memiliki ${depScores.length} capaian nilai dan ${depDescs.length} deskripsi rapor.`
      });
      return;
    }
    const res = await onDeleteActivity(act.id);
    if (res.success) {
      setFeedback({ type: 'success', message: `Kegiatan "${act.name}" berhasil dihapus.` });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Gagal menghapus kegiatan.' });
    }
  };

  // =========================================================================
  // TAB 3: PROFIL LULUSAN & REFERENSI MASTER STATE & HANDLERS
  // =========================================================================
  const [selectedActivityIdForProfil, setSelectedActivityIdForProfil] = useState<string>(
    periodActivities[0]?.id || ''
  );
  const [profilSubTab, setProfilSubTab] = useState<'mapping' | 'master-ref'>('mapping');
  const [newThemeName, setNewThemeName] = useState('');

  const activeMappingActivity =
    periodActivities.find((a) => a.id === selectedActivityIdForProfil) || periodActivities[0];
  const activeMappingGroup = activeMappingActivity
    ? groups.find((g) => g.id === activeMappingActivity.groupId)
    : undefined;

  const activityAssessmentStarted = useMemo(() => {
    if (!activeMappingActivity) return false;
    return (
      scores.some((sc) => sc.activityId === activeMappingActivity.id) ||
      descriptions.some((d) => d.activityId === activeMappingActivity.id)
    );
  }, [activeMappingActivity, scores, descriptions]);

  const handleToggleSubdimensionForActivity = async (dimId: string, subId: string) => {
    if (!activeMappingActivity) return;
    if (isReadOnlyRole) {
      setFeedback({ type: 'error', message: 'Kepala Sekolah hanya memiliki akses pantau (read-only).' });
      return;
    }
    if (activeMappingGroup?.isAssessmentLocked && !isAdmin) {
      setFeedback({
        type: 'error',
        message: 'Penilaian kelompok sedang terkunci. Hubungi Administrator untuk membuka kunci.'
      });
      return;
    }

    const currentSubs = new Set(activeMappingActivity.subdimensionIds || []);
    const isRemoving = currentSubs.has(subId);

    if (isRemoving && activityAssessmentStarted) {
      const hasScoreOnSub = scores.some(
        (sc) => sc.activityId === activeMappingActivity.id && sc.subdimensionId === subId
      );
      if (hasScoreOnSub && !isAdmin) {
        setFeedback({
          type: 'error',
          message: 'Subdimensi ini sudah memiliki capaian nilai siswa sehingga tidak dapat dihapus dari target kecuali oleh Administrator.'
        });
        return;
      }
    }

    if (isRemoving) {
      currentSubs.delete(subId);
    } else {
      currentSubs.add(subId);
    }

    const nextSubIds = Array.from(currentSubs);
    // Sync dimensionIds cleanly
    const nextDimSet = new Set<string>();
    activeDims.forEach((d) => {
      if (d.subdimensions.some((s) => currentSubs.has(s.id))) {
        nextDimSet.add(d.id);
      }
    });

    const res = await onSaveActivity({
      ...activeMappingActivity,
      dimensionIds: Array.from(nextDimSet),
      subdimensionIds: nextSubIds,
      updatedAt: new Date().toISOString()
    });

    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Target Profil Lulusan untuk kegiatan "${activeMappingActivity.name}" diperbarui (${nextSubIds.length} subdimensi).`
      });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Gagal menyimpan pemetaan.' });
    }
  };

  const isMasterLocked = activeDims.every((d) => d.isLocked !== false);

  const handleToggleMasterReferenceLock = async () => {
    if (!isAdmin) return;
    const nextLock = !isMasterLocked;
    const updated = activeDims.map((d) => ({
      ...d,
      isLocked: nextLock,
      updatedAt: new Date().toISOString(),
      subdimensions: d.subdimensions.map((s) => ({ ...s, isLocked: nextLock }))
    }));
    const res = await onSaveDimensions(updated);
    if (res.success) {
      setFeedback({
        type: 'success',
        message: nextLock
          ? 'Referensi Master BSKAP 058/H/KR/2025 dikunci untuk menjaga keaslian standar.'
          : 'Kunci Referensi Master dibuka oleh Administrator.'
      });
    }
  };

  const handleAddTheme = async () => {
    if (!newThemeName.trim()) return;
    const newTheme: KokurikulerThemeMaster = {
      id: `theme-${Date.now()}`,
      name: newThemeName.trim(),
      isActive: true
    };
    const res = await onSaveThemes([...activeThemes, newTheme]);
    if (res.success) {
      setNewThemeName('');
      setFeedback({ type: 'success', message: `Tema "${newTheme.name}" ditambahkan.` });
    }
  };

  const handleToggleThemeActive = async (themeId: string) => {
    const updated = activeThemes.map((t) =>
      t.id === themeId ? { ...t, isActive: !t.isActive } : t
    );
    await onSaveThemes(updated);
  };

  const filteredModalStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    return activeStudents.filter((s) => {
      if (q) {
        return (
          s.name.toLowerCase().includes(q) ||
          s.nis.toLowerCase().includes(q) ||
          s.nisn.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeStudents, studentSearch]);

  const classMap = useMemo(() => new Map(classrooms.map((c) => [c.id, c.name])), [classrooms]);
  const teacherMap = useMemo(() => new Map(teachers.map((t) => [t.id, t])), [teachers]);

  return (
    <div className="space-y-5">
      {/* Page Header & Period Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider">
            <Compass className="w-4 h-4" />
            Kokurikuler &bull; Data Kokurikuler (e-Rapor SMP 2025.2)
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
            Pengelolaan Kelompok, Kegiatan, dan Profil Lulusan
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Referensi resmi Keputusan Kepala BSKAP No. 058/H/KR/2025 (Jenjang SMP / Fase D) menggunakan 3 tingkatan: Berkembang, Cakap, Mahir.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-600">Periode:</span>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-none"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value as 'Ganjil' | 'Genap')}
              className="bg-transparent font-bold text-blue-700 focus:outline-none pl-1 border-l border-slate-300"
            >
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setIsRubricModalOpen(true)}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold flex items-center gap-1.5 transition"
          >
            <BookOpenCheck className="w-4 h-4 text-blue-600" />
            Alur Perkembangan
          </button>
        </div>
      </div>

      {/* Submenu Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 w-fit">
        <button
          type="button"
          onClick={() => onChangeTab('kelompok')}
          className={`px-3.5 py-2 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${
            activeTab === 'kelompok'
              ? 'bg-white text-blue-700 border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          1. Kelompok Kokurikuler ({periodGroups.length})
        </button>
        <button
          type="button"
          onClick={() => onChangeTab('kegiatan')}
          className={`px-3.5 py-2 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${
            activeTab === 'kegiatan'
              ? 'bg-white text-blue-700 border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          2. Kegiatan Kokurikuler ({periodActivities.length})
        </button>
        <button
          type="button"
          onClick={() => onChangeTab('profil-lulusan')}
          className={`px-3.5 py-2 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${
            activeTab === 'profil-lulusan'
              ? 'bg-white text-blue-700 border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          3. Profil Lulusan (8 Dimensi)
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-start justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-start gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-500 hover:text-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 1: KELOMPOK KOKURIKULER */}
      {/* =================================================================== */}
      {activeTab === 'kelompok' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Daftar Kelompok Kokurikuler ({filterYear} &bull; Semester {filterSemester})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Peserta kelompok diambil langsung dari siswa dan rombel terdaftar. Satu kelompok dapat mencakup satu atau beberapa rombel sekaligus.
              </p>
            </div>
            {!isReadOnlyRole && (
              <button
                type="button"
                onClick={openNewGroupModal}
                className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                Tambah Kelompok
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-3 font-bold">Kode / Nama Kelompok</th>
                  <th className="px-4 py-3 font-bold">Tema & Fase</th>
                  <th className="px-4 py-3 font-bold">Rombel & Peserta</th>
                  <th className="px-4 py-3 font-bold">Koordinator & Guru Terlibat</th>
                  <th className="px-4 py-3 font-bold text-center">Status & Kunci</th>
                  <th className="px-4 py-3 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {periodGroups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      Belum ada kelompok kokurikuler pada Tahun Pelajaran {filterYear} Semester {filterSemester}. Klik <strong>Tambah Kelompok</strong> untuk menyusun kelompok nyata dari data guru dan siswa terdaftar.
                    </td>
                  </tr>
                ) : (
                  periodGroups.map((grp) => {
                    const coord = teacherMap.get(grp.coordinatorTeacherId);
                    const rombelNames = (grp.classIds || [])
                      .map((cid) => classMap.get(cid))
                      .filter(Boolean)
                      .join(', ');
                    const actCount = activities.filter((a) => a.groupId === grp.id).length;

                    return (
                      <tr key={grp.id} className="hover:bg-slate-50/70 align-top">
                        <td className="px-4 py-3">
                          <div className="font-mono text-[11px] font-bold text-blue-700">{grp.code}</div>
                          <div className="font-bold text-slate-900 mt-0.5">{grp.name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {actCount} kegiatan terdaftar
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{grp.theme}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{grp.phase}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">
                            {grp.studentIds?.length || 0} Siswa Terdaftar
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 max-w-xs">
                            {rombelNames || 'Siswa pilihan manual'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">
                            Koor: {coord?.name || grp.coordinatorName || '-'}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {grp.involvedTeacherIds?.length || 0} guru tim penilai terlibat
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                                grp.status === 'Aktif' ? 'text-emerald-700' : 'text-slate-500'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  grp.status === 'Aktif' ? 'bg-emerald-600' : 'bg-slate-400'
                                }`}
                              />
                              {grp.status}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleGroupLock(grp)}
                              disabled={isReadOnlyRole}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-semibold transition ${
                                grp.isAssessmentLocked
                                  ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                              }`}
                              title="Klik untuk mengunci atau membuka input nilai kelompok ini"
                            >
                              {grp.isAssessmentLocked ? (
                                <>
                                  <Lock className="w-3 h-3" /> Terkunci
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3 h-3" /> Terbuka
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!isReadOnlyRole && (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditGroupModal(grp)}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
                                title="Edit Kelompok"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteGroupWithCheck(grp)}
                                className="p-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50"
                                title="Hapus Kelompok (cek dependensi)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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
      )}

      {/* =================================================================== */}
      {/* TAB 2: KEGIATAN KOKURIKULER (ALUR e-RAPOR 2025.2) */}
      {/* =================================================================== */}
      {activeTab === 'kegiatan' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Daftar Kegiatan Kokurikuler (Alur Pilih Tema &rarr; Pilih Fase &rarr; Kelola Kegiatan)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Setiap kegiatan memilih dimensi Profil Lulusan yang relevan secara fleksibel (tidak wajib seluruh 8 dimensi sekaligus).
              </p>
            </div>
            {!isReadOnlyRole && (
              <button
                type="button"
                onClick={openNewActivityModal}
                className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                Tambah Kegiatan
              </button>
            )}
          </div>

          {/* Filters: Tema & Fase */}
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">1. Filter Tema:</span>
              <select
                value={filterTheme}
                onChange={(e) => setFilterTheme(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800"
              >
                <option value="ALL">Semua Tema</option>
                {activeThemes.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">2. Filter Fase:</span>
              <select
                value={filterPhase}
                onChange={(e) => setFilterPhase(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800"
              >
                <option value="ALL">Semua Fase SMP</option>
                {OFFICIAL_SMP_PHASES.map((ph) => (
                  <option key={ph} value={ph}>
                    {ph}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-3 font-bold w-14 text-center">No</th>
                  <th className="px-4 py-3 font-bold">Nama Kegiatan & Tujuan Akhir</th>
                  <th className="px-4 py-3 font-bold">Kelompok / Tema / Fase</th>
                  <th className="px-4 py-3 font-bold">Dimensi & Subdimensi Target</th>
                  <th className="px-4 py-3 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {periodActivities.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                      Belum ada kegiatan kokurikuler pada filter terpilih. Pastikan Kelompok Kokurikuler sudah dibuat lalu klik <strong>Tambah Kegiatan</strong>.
                    </td>
                  </tr>
                ) : (
                  periodActivities.map((act) => {
                    const grp = groups.find((g) => g.id === act.groupId);
                    const selectedDims = activeDims.filter((d) => act.dimensionIds?.includes(d.id));
                    return (
                      <tr key={act.id} className="hover:bg-slate-50/70 align-top">
                        <td className="px-4 py-3 text-center font-bold text-slate-700 tabular-nums">
                          {act.orderIndex}
                        </td>
                        <td className="px-4 py-3 max-w-md">
                          <div className="font-bold text-slate-900">{act.name}</div>
                          <div className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                            <span className="font-semibold text-slate-700">Tujuan Akhir:</span>{' '}
                            {act.finalObjective}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-blue-700">
                            {grp ? `${grp.code} — ${grp.name}` : act.groupId}
                          </div>
                          <div className="text-[11px] text-slate-700 mt-0.5">{act.theme}</div>
                          <div className="text-[11px] text-slate-500">{act.phase}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-[11px] font-bold text-slate-800">
                            {selectedDims.length} Dimensi &bull; {act.subdimensionIds?.length || 0} Subdimensi
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                            {selectedDims.map((d) => d.shortName).join(', ') || '-'}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedActivityIdForProfil(act.id);
                              setProfilSubTab('mapping');
                              onChangeTab('profil-lulusan');
                            }}
                            className="text-[11px] text-blue-600 hover:underline font-semibold mt-1 inline-block"
                          >
                            Atur Subdimensi Profil Lulusan &rarr;
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!isReadOnlyRole && (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditActivityModal(act)}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
                                title="Edit Kegiatan"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteActivityWithCheck(act)}
                                className="p-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50"
                                title="Hapus Kegiatan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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
      )}

      {/* =================================================================== */}
      {/* TAB 3: PROFIL LULUSAN & REFERENSI BSKAP 058/H/KR/2025 */}
      {/* =================================================================== */}
      {activeTab === 'profil-lulusan' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setProfilSubTab('mapping')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                  profilSubTab === 'mapping'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Pemetaan Dimensi & Subdimensi Kegiatan
              </button>
              <button
                type="button"
                onClick={() => setProfilSubTab('master-ref')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                  profilSubTab === 'master-ref'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Data Master 8 Dimensi & Tema (BSKAP 058)
              </button>
            </div>

            {isAdmin && profilSubTab === 'master-ref' && (
              <button
                type="button"
                onClick={handleToggleMasterReferenceLock}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition ${
                  isMasterLocked
                    ? 'border-amber-300 bg-amber-50 text-amber-900'
                    : 'border-emerald-300 bg-emerald-50 text-emerald-900'
                }`}
              >
                {isMasterLocked ? (
                  <>
                    <Lock className="w-3.5 h-3.5" /> Referensi Master Terkunci
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" /> Referensi Master Terbuka
                  </>
                )}
              </button>
            )}
          </div>

          {profilSubTab === 'mapping' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div className="flex-1 max-w-xl">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pilih Kegiatan Kokurikuler ({filterYear} &bull; {filterSemester}):
                  </label>
                  <select
                    value={activeMappingActivity?.id || ''}
                    onChange={(e) => setSelectedActivityIdForProfil(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white"
                  >
                    {periodActivities.length === 0 ? (
                      <option value="">-- Belum ada kegiatan pada periode ini --</option>
                    ) : (
                      periodActivities.map((act) => {
                        const grp = groups.find((g) => g.id === act.groupId);
                        return (
                          <option key={act.id} value={act.id}>
                            [{grp?.code || '-'}] {act.name} ({act.subdimensionIds?.length || 0} Subdimensi)
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>

                {activeMappingActivity && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-600">
                      Terpilih: <strong>{activeMappingActivity.subdimensionIds?.length || 0}</strong> subdimensi dari{' '}
                      <strong>{activeMappingActivity.dimensionIds?.length || 0}</strong> dimensi
                    </span>
                  </div>
                )}
              </div>

              {activityAssessmentStarted && activeMappingActivity && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Penilaian siswa untuk kegiatan ini sudah berjalan. Subdimensi yang telah terisi nilainya tidak dapat dilepas oleh guru untuk menjaga konsistensi rapor.
                  </span>
                </div>
              )}

              {!activeMappingActivity ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  Silakan buat Kelompok dan Kegiatan Kokurikuler terlebih dahulu sebelum memetakan Profil Lulusan.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {activeDims.map((dim) => {
                    const selectedInDim = dim.subdimensions.filter((s) =>
                      activeMappingActivity.subdimensionIds?.includes(s.id)
                    ).length;

                    return (
                      <div
                        key={dim.id}
                        className={`border rounded-xl overflow-hidden ${
                          selectedInDim > 0 ? 'border-blue-300 bg-blue-50/10' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
                          <div>
                            <div className="text-[11px] font-bold text-slate-500 uppercase">
                              Dimensi {dim.order}
                            </div>
                            <div className="text-xs font-bold text-slate-900">{dim.name}</div>
                          </div>
                          <span className="text-[11px] font-bold text-blue-700 shrink-0">
                            {selectedInDim}/{dim.subdimensions.length} Dipilih
                          </span>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {dim.subdimensions.map((sub) => {
                            const checked = activeMappingActivity.subdimensionIds?.includes(sub.id);
                            return (
                              <label
                                key={sub.id}
                                className="flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50/80 transition"
                              >
                                <input
                                  type="checkbox"
                                  checked={Boolean(checked)}
                                  onChange={() => handleToggleSubdimensionForActivity(dim.id, sub.id)}
                                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex-1 text-xs">
                                  <div className="font-bold text-slate-900">
                                    <span className="font-mono text-blue-700 mr-1.5">{sub.code}</span>
                                    {sub.name}
                                  </div>
                                  <div className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                                    <strong>Cakap (Standar):</strong> {sub.levelDescriptions.Cakap}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {profilSubTab === 'master-ref' && (
            <div className="space-y-4">
              {/* Theme Master Manager */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-blue-600" />
                      Referensi Master Tema Kokurikuler SMP
                    </h3>
                    <p className="text-xs text-slate-500">
                      Digunakan berulang setiap tahun pelajaran dan semester pada pengaturan kelompok dan kegiatan.
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newThemeName}
                        onChange={(e) => setNewThemeName(e.target.value)}
                        placeholder="Tambah tema resmi baru..."
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs w-56"
                      />
                      <button
                        type="button"
                        onClick={handleAddTheme}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                      >
                        Tambah
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {activeThemes.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 flex items-start justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{t.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {t.isActive ? 'Aktif digunakan' : 'Nonaktif'}
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleToggleThemeActive(t.id)}
                          className="text-[11px] font-semibold text-blue-600 hover:underline shrink-0"
                        >
                          {t.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Complete 8 Dimensions & 25 Subdimensions Reference List */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      8 Dimensi & 25 Subdimensi Profil Lulusan Jenjang SMP (Fase D)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Keputusan Kepala BSKAP No. 058/H/KR/2025. Tersedia tetap lintas tahun pelajaran.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRubricModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100"
                  >
                    Buka Tampilan Rubrik Lengkap
                  </button>
                </div>

                <div className="space-y-3">
                  {activeDims.map((dim) => (
                    <div key={dim.id} className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-900">
                          {dim.order}. {dim.name}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600">
                          {dim.subdimensions.length} Subdimensi SMP
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {dim.subdimensions.map((sub) => (
                          <div key={sub.id} className="px-4 py-3 text-xs space-y-1.5">
                            <div className="font-bold text-slate-800">
                              <span className="font-mono text-blue-700 mr-2">{sub.code}</span>
                              {sub.name}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-slate-600">
                              <div className="p-2 rounded bg-amber-50/50 border border-amber-100">
                                <strong className="text-amber-800 block mb-0.5">Berkembang:</strong>
                                {sub.levelDescriptions.Berkembang}
                              </div>
                              <div className="p-2 rounded bg-emerald-50/50 border border-emerald-100">
                                <strong className="text-emerald-800 block mb-0.5">Cakap (Standar):</strong>
                                {sub.levelDescriptions.Cakap}
                              </div>
                              <div className="p-2 rounded bg-blue-50/50 border border-blue-100">
                                <strong className="text-blue-800 block mb-0.5">Mahir:</strong>
                                {sub.levelDescriptions.Mahir}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL TAMBAH / EDIT KELOMPOK KOKURIKULER */}
      {/* =================================================================== */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveGroupSubmit}
            className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                {editingGroupId ? 'Edit Kelompok Kokurikuler' : 'Tambah Kelompok Kokurikuler Baru'} ({filterYear} &bull; {filterSemester})
              </h3>
              <button
                type="button"
                onClick={() => setIsGroupModalOpen(false)}
                className="text-slate-500 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kode Kelompok *</label>
                  <input
                    type="text"
                    required
                    value={groupForm.code}
                    onChange={(e) => setGroupForm({ ...groupForm, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Nama Kelompok *</label>
                  <input
                    type="text"
                    required
                    value={groupForm.name}
                    onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                    placeholder="Contoh: Kokurikuler Kelas VII Peduli Lingkungan Pesisir"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tema Kegiatan *</label>
                  <select
                    value={groupForm.theme}
                    onChange={(e) => setGroupForm({ ...groupForm, theme: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    {activeThemes.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fase *</label>
                  <select
                    value={groupForm.phase}
                    onChange={(e) => setGroupForm({ ...groupForm, phase: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    {OFFICIAL_SMP_PHASES.map((ph) => (
                      <option key={ph} value={ph}>
                        {ph}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Kelompok</label>
                  <select
                    value={groupForm.status}
                    onChange={(e) =>
                      setGroupForm({ ...groupForm, status: e.target.value as 'Aktif' | 'Nonaktif' })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Koordinator Kelompok (Guru Terdaftar) *
                  </label>
                  <select
                    value={groupForm.coordinatorTeacherId}
                    onChange={(e) =>
                      setGroupForm({ ...groupForm, coordinatorTeacherId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    <option value="">-- Pilih Koordinator --</option>
                    {sortedTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.nip ? `(${t.nip})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Rombel Terdaftar (Multi-Rombel)
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-slate-200 bg-slate-50 max-h-28 overflow-y-auto">
                    {sortedClassrooms.map((c) => {
                      const active = groupForm.classIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleGroupClass(c.id)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold border transition ${
                            active
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Guru Terlibat */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Guru Terlibat / Tim Penilai ({groupForm.involvedTeacherIds.length} dipilih &mdash; dapat dibatasi per dimensi)
                </label>
                <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {sortedTeachers.map((t) => {
                    const checked = groupForm.involvedTeacherIds.includes(t.id);
                    const restrictedDims = groupForm.involvedTeacherDimensions[t.id] || [];
                    return (
                      <div key={t.id} className="px-3 py-2 hover:bg-slate-50">
                        <label className="flex items-center justify-between cursor-pointer">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setGroupForm((prev) => ({
                                  ...prev,
                                  involvedTeacherIds: checked
                                    ? prev.involvedTeacherIds.filter((id) => id !== t.id)
                                    : [...prev.involvedTeacherIds, t.id]
                                }));
                              }}
                              className="rounded border-slate-300 text-blue-600"
                            />
                            <span className="font-semibold text-slate-800">{t.name}</span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {checked
                              ? restrictedDims.length > 0
                                ? `Khusus ${restrictedDims.length} dimensi`
                                : 'Semua dimensi kegiatan'
                              : t.position || 'Guru Mapel'}
                          </span>
                        </label>
                        {checked && (
                          <div className="mt-1.5 pl-6 flex flex-wrap gap-1">
                            {activeDims.map((dim) => {
                              const hasDim = restrictedDims.includes(dim.id);
                              return (
                                <button
                                  key={dim.id}
                                  type="button"
                                  onClick={() => {
                                    setGroupForm((prev) => {
                                      const cur = prev.involvedTeacherDimensions[t.id] || [];
                                      const next = hasDim
                                        ? cur.filter((id) => id !== dim.id)
                                        : [...cur, dim.id];
                                      return {
                                        ...prev,
                                        involvedTeacherDimensions: {
                                          ...prev.involvedTeacherDimensions,
                                          [t.id]: next
                                        }
                                      };
                                    });
                                  }}
                                  className={`px-2 py-0.5 rounded border text-[10px] font-semibold transition ${
                                    hasDim
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {dim.order}. {dim.shortName}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Siswa Peserta Terdaftar */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label className="font-bold text-slate-700">
                    Peserta Didik Kelompok ({groupForm.studentIds.length} siswa aktif terdaftar)
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Cari nama / NISN siswa..."
                      className="pl-8 pr-3 py-1 rounded-lg border border-slate-300 text-xs w-56"
                    />
                  </div>
                </div>
                <div className="border border-slate-200 rounded-lg max-h-44 overflow-y-auto divide-y divide-slate-100">
                  {filteredModalStudents.length === 0 ? (
                    <div className="p-4 text-center text-slate-500">
                      Tidak ada siswa aktif yang cocok dengan pencarian.
                    </div>
                  ) : (
                    filteredModalStudents.map((s) => {
                      const isSelected = groupForm.studentIds.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setGroupForm((prev) => ({
                                  ...prev,
                                  studentIds: isSelected
                                    ? prev.studentIds.filter((id) => id !== s.id)
                                    : [...prev.studentIds, s.id]
                                }));
                              }}
                              className="rounded border-slate-300 text-blue-600"
                            />
                            <span className="font-semibold text-slate-900">{s.name}</span>
                            <span className="font-mono text-[11px] text-slate-500">({s.nisn})</span>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-600">
                            {classMap.get(s.classId) || '-'}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsGroupModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSavingGroup}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {isSavingGroup ? 'Menyimpan...' : 'Simpan Kelompok'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL TAMBAH / EDIT KEGIATAN KOKURIKULER */}
      {/* =================================================================== */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveActivitySubmit}
            className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                {editingActivityId ? 'Edit Kegiatan Kokurikuler' : 'Tambah Kegiatan Kokurikuler'}
              </h3>
              <button
                type="button"
                onClick={() => setIsActivityModalOpen(false)}
                className="text-slate-500 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor Urut *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={activityForm.orderIndex}
                    onChange={(e) =>
                      setActivityForm({ ...activityForm, orderIndex: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block font-bold text-slate-700 mb-1">Kelompok Kegiatan *</label>
                  <select
                    value={activityForm.groupId}
                    onChange={(e) => {
                      const grp = periodGroups.find((g) => g.id === e.target.value);
                      setActivityForm({
                        ...activityForm,
                        groupId: e.target.value,
                        theme: grp?.theme || activityForm.theme,
                        phase: grp?.phase || activityForm.phase
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    {periodGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        [{g.code}] {g.name} ({g.studentIds.length} siswa)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Kegiatan Kokurikuler *</label>
                <input
                  type="text"
                  required
                  value={activityForm.name}
                  onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })}
                  placeholder="Contoh: Proyek Pengolahan Sampah Organik Sekolah"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tujuan Akhir Kegiatan * (Menjadi acuan pembuatan deskripsi rapor)
                </label>
                <textarea
                  required
                  rows={2}
                  value={activityForm.finalObjective}
                  onChange={(e) =>
                    setActivityForm({ ...activityForm, finalObjective: e.target.value })
                  }
                  placeholder="Contoh: menumbuhkan kepedulian lingkungan, kemampuan berpikir kritis, serta kolaborasi siswa dalam mengelola limbah sekolah secara berkelanjutan."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tema</label>
                  <select
                    value={activityForm.theme}
                    onChange={(e) => setActivityForm({ ...activityForm, theme: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    {activeThemes.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fase</label>
                  <select
                    value={activityForm.phase}
                    onChange={(e) => setActivityForm({ ...activityForm, phase: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    {OFFICIAL_SMP_PHASES.map((ph) => (
                      <option key={ph} value={ph}>
                        {ph}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Pilihan Dimensi Profil Lulusan (Fleksibel 1–8 Dimensi sesuai kebutuhan kegiatan) *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeDims.map((dim) => {
                    const checked = activityForm.dimensionIds.includes(dim.id);
                    return (
                      <label
                        key={dim.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                          checked
                            ? 'border-blue-500 bg-blue-50/50 text-slate-900'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setActivityForm((prev) => ({
                              ...prev,
                              dimensionIds: checked
                                ? prev.dimensionIds.filter((id) => id !== dim.id)
                                : [...prev.dimensionIds, dim.id]
                            }));
                          }}
                          className="mt-0.5 rounded border-slate-300 text-blue-600"
                        />
                        <div>
                          <div className="font-bold">
                            {dim.order}. {dim.shortName}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {dim.subdimensions.length} subdimensi
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsActivityModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSavingActivity}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {isSavingActivity ? 'Menyimpan...' : 'Simpan Kegiatan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Official BSKAP 058 Modal */}
      <AlurPerkembanganModal
        isOpen={isRubricModalOpen}
        onClose={() => setIsRubricModalOpen(false)}
        dimensions={activeDims}
        focusDimensionIds={activeMappingActivity?.dimensionIds}
        focusSubdimensionIds={activeMappingActivity?.subdimensionIds}
      />
    </div>
  );
};
