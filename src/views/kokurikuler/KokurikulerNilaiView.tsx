import React, { useState, useMemo, useEffect } from 'react';
import {
  Classroom,
  KokurikulerAchievementLevel,
  KokurikulerActivity,
  KokurikulerDescription,
  KokurikulerDescriptionStatus,
  KokurikulerDimensionMaster,
  KokurikulerGroup,
  KokurikulerScore,
  Student,
  User
} from '../../types/erapor';
import { OFFICIAL_KOKURIKULER_DIMENSIONS } from '../../data/kokurikulerMaster';
import {
  buildKokurikulerDescriptionId,
  buildKokurikulerScoreId,
  canUserAssessGroup,
  generateKokurikulerDescription,
  getPermittedDimensionIdsForUser,
  getSubdimensionMap,
  resolveUserTeacherId
} from '../../utils/kokurikulerHelper';
import {
  downloadKokurikulerTemplate,
  parseAndValidateKokurikulerExcel,
  ParseKokurikulerResult
} from '../../services/excelService';
import { AlurPerkembanganModal } from './AlurPerkembanganModal';
import {
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  Save,
  BookOpenCheck,
  ArrowLeft,
  ListChecks,
  Download,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ShieldAlert,
  X,
  Info
} from 'lucide-react';

export type KokurikulerNilaiTab = 'input' | 'import' | 'deskripsi';

interface KokurikulerNilaiViewProps {
  activeTab: KokurikulerNilaiTab;
  onChangeTab: (tab: KokurikulerNilaiTab) => void;
  onBackToData: () => void;
  schoolName: string;
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
  onSaveScores: (
    scores: KokurikulerScore[]
  ) => Promise<{ success: boolean; count: number; error?: string }>;
  onSaveDescriptions: (
    descriptions: KokurikulerDescription[]
  ) => Promise<{ success: boolean; count: number; error?: string }>;
}

const ACHIEVEMENT_LEVELS: KokurikulerAchievementLevel[] = ['Berkembang', 'Cakap', 'Mahir'];
const DESC_STATUSES: KokurikulerDescriptionStatus[] = [
  'Belum diisi',
  'Draft',
  'Sudah disimpan',
  'Sudah diperiksa',
  'Final'
];

export const KokurikulerNilaiView: React.FC<KokurikulerNilaiViewProps> = ({
  activeTab,
  onChangeTab,
  onBackToData,
  schoolName,
  academicYear,
  semester,
  currentUser,
  students,
  classrooms,
  dimensions,
  groups,
  activities,
  scores,
  descriptions,
  onSaveScores,
  onSaveDescriptions
}) => {
  const activeDims = dimensions.length > 0 ? dimensions : OFFICIAL_KOKURIKULER_DIMENSIONS;
  const subMap = useMemo(() => getSubdimensionMap(activeDims), [activeDims]);
  const classMap = useMemo(() => new Map(classrooms.map((c) => [c.id, c.name])), [classrooms]);
  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const myTeacherId = resolveUserTeacherId(currentUser);

  const isAdmin = currentUser.role === 'admin';
  const isReadOnlyRole = currentUser.role === 'kepsek';

  // Period-filtered groups
  const periodGroups = useMemo(
    () =>
      groups.filter(
        (g) => g.academicYear === academicYear && g.semester === semester && g.status === 'Aktif'
      ),
    [groups, academicYear, semester]
  );

  const assessableGroups = useMemo(() => {
    if (isAdmin || isReadOnlyRole) return periodGroups;
    return periodGroups.filter((g) => canUserAssessGroup(currentUser, g));
  }, [periodGroups, isAdmin, isReadOnlyRole, currentUser]);

  const [selectedGroupId, setSelectedGroupId] = useState<string>(assessableGroups[0]?.id || '');
  const selectedGroup =
    assessableGroups.find((g) => g.id === selectedGroupId) || assessableGroups[0];

  const groupActivities = useMemo(
    () =>
      activities
        .filter(
          (a) =>
            a.groupId === selectedGroup?.id &&
            a.academicYear === academicYear &&
            a.semester === semester
        )
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [activities, selectedGroup, academicYear, semester]
  );

  const [selectedActivityId, setSelectedActivityId] = useState<string>(
    groupActivities[0]?.id || ''
  );
  const selectedActivity =
    groupActivities.find((a) => a.id === selectedActivityId) || groupActivities[0];

  // Ensure selectedGroupId and selectedActivityId stay valid when period changes
  useEffect(() => {
    if (assessableGroups.length > 0 && !assessableGroups.some((g) => g.id === selectedGroupId)) {
      setSelectedGroupId(assessableGroups[0].id);
    }
  }, [assessableGroups, selectedGroupId]);

  useEffect(() => {
    if (groupActivities.length > 0 && !groupActivities.some((a) => a.id === selectedActivityId)) {
      setSelectedActivityId(groupActivities[0].id);
    }
  }, [groupActivities, selectedActivityId]);

  const permittedDimensionIds = useMemo(() => {
    if (!selectedGroup || !selectedActivity) return [];
    return getPermittedDimensionIdsForUser(
      currentUser,
      selectedGroup,
      selectedActivity.dimensionIds || []
    );
  }, [currentUser, selectedGroup, selectedActivity]);

  const [selectedDimensionId, setSelectedDimensionId] = useState<string>(
    permittedDimensionIds[0] || ''
  );

  useEffect(() => {
    if (
      permittedDimensionIds.length > 0 &&
      !permittedDimensionIds.includes(selectedDimensionId)
    ) {
      setSelectedDimensionId(permittedDimensionIds[0]);
    }
  }, [permittedDimensionIds, selectedDimensionId]);

  const activeDimension = activeDims.find((d) => d.id === selectedDimensionId);
  const visibleSubdimensions = useMemo(() => {
    if (!activeDimension || !selectedActivity) return [];
    const targetSubSet = new Set(selectedActivity.subdimensionIds || []);
    return activeDimension.subdimensions.filter((s) => targetSubSet.has(s.id));
  }, [activeDimension, selectedActivity]);

  const groupStudents = useMemo(() => {
    if (!selectedGroup) return [];
    return (selectedGroup.studentIds || [])
      .map((sid) => studentMap.get(sid))
      .filter((s): s is Student => Boolean(s))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedGroup, studentMap]);

  const isLocked = Boolean(selectedGroup?.isAssessmentLocked) || isReadOnlyRole;
  const canEditSelectedGroup =
    Boolean(selectedGroup) && !isReadOnlyRole && canUserAssessGroup(currentUser, selectedGroup!);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [isRubricOpen, setIsRubricOpen] = useState(false);
  const [isStatusDrawerOpen, setIsStatusDrawerOpen] = useState(false);

  // =========================================================================
  // SUBMENU 1: INPUT NILAI KOKURIKULER STATE
  // =========================================================================
  // Local draft overrides keyed by scoreId -> level
  const [draftScores, setDraftScores] = useState<Record<string, KokurikulerAchievementLevel>>({});
  const [bulkSubId, setBulkSubId] = useState<string>('');
  const [bulkLevel, setBulkLevel] = useState<KokurikulerAchievementLevel>('Cakap');
  const [isSavingScores, setIsSavingScores] = useState(false);

  useEffect(() => {
    setDraftScores({});
    setFeedback(null);
  }, [selectedGroup?.id, selectedActivity?.id, academicYear, semester]);

  useEffect(() => {
    if (visibleSubdimensions.length > 0) {
      setBulkSubId(visibleSubdimensions[0].id);
    }
  }, [visibleSubdimensions]);

  const savedScoreLookup = useMemo(() => {
    const map = new Map<string, KokurikulerScore>();
    scores.forEach((sc) => {
      if (
        sc.academicYear === academicYear &&
        sc.semester === semester &&
        sc.groupId === selectedGroup?.id &&
        sc.activityId === selectedActivity?.id
      ) {
        map.set(sc.id, sc);
      }
    });
    return map;
  }, [scores, academicYear, semester, selectedGroup?.id, selectedActivity?.id]);

  const getEffectiveLevel = (studentId: string, subId: string): KokurikulerAchievementLevel | '' => {
    if (!selectedGroup || !selectedActivity) return '';
    const id = buildKokurikulerScoreId(
      academicYear,
      semester,
      selectedGroup.id,
      selectedActivity.id,
      studentId,
      subId
    );
    if (draftScores[id]) return draftScores[id];
    return savedScoreLookup.get(id)?.level || '';
  };

  const handleSelectCellLevel = (
    student: Student,
    dimId: string,
    subId: string,
    level: KokurikulerAchievementLevel
  ) => {
    if (isLocked || !canEditSelectedGroup || !selectedGroup || !selectedActivity) return;
    const id = buildKokurikulerScoreId(
      academicYear,
      semester,
      selectedGroup.id,
      selectedActivity.id,
      student.id,
      subId
    );
    setDraftScores((prev) => ({ ...prev, [id]: level }));
  };

  const handleBulkApplyDraft = () => {
    if (isLocked || !canEditSelectedGroup || !selectedGroup || !selectedActivity || !bulkSubId)
      return;
    const updates: Record<string, KokurikulerAchievementLevel> = {};
    groupStudents.forEach((std) => {
      const id = buildKokurikulerScoreId(
        academicYear,
        semester,
        selectedGroup.id,
        selectedActivity.id,
        std.id,
        bulkSubId
      );
      updates[id] = bulkLevel;
    });
    setDraftScores((prev) => ({ ...prev, ...updates }));
    setFeedback({
      type: 'success',
      message: `Capaian "${bulkLevel}" diterapkan sementara ke ${groupStudents.length} siswa pada subdimensi terpilih. Silakan tinjau tiap siswa lalu klik "Simpan Data" untuk menyimpan ke Firebase.`
    });
  };

  const handleSaveInputScores = async () => {
    if (!selectedGroup || !selectedActivity || isLocked || !canEditSelectedGroup) return;
    const draftEntries = Object.entries(draftScores);
    if (draftEntries.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Belum ada perubahan capaian yang diinput pada sesi ini.'
      });
      return;
    }

    const now = new Date().toISOString();
    const toSave: KokurikulerScore[] = [];

    // Reconstruct exact metadata from students x subdimensions
    groupStudents.forEach((std) => {
      (selectedActivity.subdimensionIds || []).forEach((subId) => {
        const id = buildKokurikulerScoreId(
          academicYear,
          semester,
          selectedGroup.id,
          selectedActivity.id,
          std.id,
          subId
        );
        const level = draftScores[id];
        if (!level) return;
        const meta = subMap.get(subId);
        const existing = savedScoreLookup.get(id);
        toSave.push({
          id,
          academicYear,
          semester,
          groupId: selectedGroup.id,
          activityId: selectedActivity.id,
          studentId: std.id,
          rombelId: std.classId,
          dimensionId: meta?.dim.id || selectedDimensionId,
          subdimensionId: subId,
          teacherId: myTeacherId || selectedGroup.coordinatorTeacherId,
          level,
          status: 'Tersimpan',
          createdAt: existing?.createdAt || now,
          updatedAt: now
        });
      });
    });

    if (toSave.length === 0) {
      setFeedback({ type: 'error', message: 'Tidak ada data valid untuk disimpan.' });
      return;
    }

    setIsSavingScores(true);
    const result = await onSaveScores(toSave);
    setIsSavingScores(false);

    if (result.success) {
      setDraftScores({});
      setFeedback({
        type: 'success',
        message: `${result.count} capaian subdimensi kokurikuler berhasil disimpan dan diverifikasi di Cloud Firebase.`
      });
    } else {
      setFeedback({
        type: 'error',
        message:
          result.error ||
          'Penyimpanan ke Firebase gagal! Perubahan tetap ada di draf agar Anda dapat mencoba ulang.'
      });
    }
  };

  // =========================================================================
  // SUBMENU 2: IMPORT NILAI KOKURIKULER STATE
  // =========================================================================
  const [importParseResult, setImportParseResult] = useState<ParseKokurikulerResult | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const [conflictPolicy, setConflictPolicy] = useState<'skip' | 'overwrite'>('skip');
  const [isImporting, setIsImporting] = useState(false);

  const handleDownloadFormat = () => {
    if (!selectedGroup || !selectedActivity) {
      setFeedback({
        type: 'error',
        message: 'Pilih Kelompok dan Kegiatan Kokurikuler terlebih dahulu sebelum mengunduh format.'
      });
      return;
    }
    downloadKokurikulerTemplate(
      schoolName,
      selectedGroup,
      selectedActivity,
      students,
      classrooms,
      activeDims,
      scores
    );
  };

  const handleUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedGroup || !selectedActivity) return;

    setFeedback(null);
    setImportFileName(file.name);
    try {
      const parsed = await parseAndValidateKokurikulerExcel(
        file,
        selectedGroup,
        selectedActivity,
        groupStudents,
        scores,
        activeDims
      );
      setImportParseResult(parsed);
    } catch (err: any) {
      setImportParseResult(null);
      setFeedback({
        type: 'error',
        message: err?.message || 'Gagal memproses file Excel.'
      });
    }
  };

  const handleCommitImport = async () => {
    if (!importParseResult || !selectedGroup || !selectedActivity || isLocked || !canEditSelectedGroup)
      return;

    const entriesToCommit = importParseResult.validEntries.filter((entry) => {
      if (entry.hasExisting && conflictPolicy === 'skip') return false;
      return true;
    });

    if (entriesToCommit.length === 0) {
      setFeedback({
        type: 'error',
        message:
          'Tidak ada data baru untuk diimpor (seluruh entri valid berkonflik dan kebijakan disetel ke Lewati).'
      });
      return;
    }

    const now = new Date().toISOString();
    const toSave: KokurikulerScore[] = entriesToCommit.map((entry) => {
      const existing = savedScoreLookup.get(entry.scoreId);
      return {
        id: entry.scoreId,
        academicYear,
        semester,
        groupId: selectedGroup.id,
        activityId: selectedActivity.id,
        studentId: entry.studentId,
        rombelId: entry.rombelId,
        dimensionId: entry.dimensionId,
        subdimensionId: entry.subdimensionId,
        teacherId: myTeacherId || selectedGroup.coordinatorTeacherId,
        level: entry.level,
        status: 'Tersimpan',
        createdAt: existing?.createdAt || now,
        updatedAt: now
      };
    });

    setIsImporting(true);
    const res = await onSaveScores(toSave);
    setIsImporting(false);

    if (res.success) {
      const skippedConflictCount = importParseResult.validEntries.length - entriesToCommit.length;
      setFeedback({
        type: 'success',
        message: `Import selesai & tersimpan ke Firebase: ${res.count} capaian disimpan, ${importParseResult.skippedEmptyCount} sel kosong dilewati (tidak dipaksa angka 1), ${skippedConflictCount} nilai lama dipertahankan.`
      });
      setImportParseResult(null);
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'Import ke Firebase gagal.'
      });
    }
  };

  // =========================================================================
  // SUBMENU 3: DESKRIPSI KOKURIKULER STATE
  // =========================================================================
  const [draftDescriptions, setDraftDescriptions] = useState<
    Record<string, { text: string; status: KokurikulerDescriptionStatus; warning?: string; isAuto?: boolean }>
  >({});
  const [isSavingDescriptions, setIsSavingDescriptions] = useState(false);

  useEffect(() => {
    setDraftDescriptions({});
  }, [selectedGroup?.id, selectedActivity?.id, academicYear, semester]);

  const savedDescLookup = useMemo(() => {
    const map = new Map<string, KokurikulerDescription>();
    descriptions.forEach((d) => {
      if (
        d.academicYear === academicYear &&
        d.semester === semester &&
        d.groupId === selectedGroup?.id &&
        d.activityId === selectedActivity?.id
      ) {
        map.set(d.id, d);
      }
    });
    return map;
  }, [descriptions, academicYear, semester, selectedGroup?.id, selectedActivity?.id]);

  const handleGenerateOneDescription = (std: Student) => {
    if (!selectedGroup || !selectedActivity || isLocked || !canEditSelectedGroup) return;
    const descId = buildKokurikulerDescriptionId(
      academicYear,
      semester,
      selectedGroup.id,
      selectedActivity.id,
      std.id
    );
    const gen = generateKokurikulerDescription(std, selectedActivity, scores, activeDims);
    if (!gen.description) {
      setFeedback({
        type: 'error',
        message:
          gen.completenessWarning ||
          `Belum ada capaian subdimensi untuk ${std.name}. Input capaian terlebih dahulu.`
      });
      return;
    }
    setDraftDescriptions((prev) => ({
      ...prev,
      [descId]: {
        text: gen.description,
        status: 'Draft',
        warning: gen.completenessWarning,
        isAuto: true
      }
    }));
  };

  const handleBatchGenerateDescriptions = () => {
    if (!selectedGroup || !selectedActivity || isLocked || !canEditSelectedGroup) return;
    const nextDrafts: typeof draftDescriptions = { ...draftDescriptions };
    let generatedCount = 0;
    let emptyCount = 0;
    let incompleteCount = 0;

    groupStudents.forEach((std) => {
      const descId = buildKokurikulerDescriptionId(
        academicYear,
        semester,
        selectedGroup.id,
        selectedActivity.id,
        std.id
      );
      const gen = generateKokurikulerDescription(std, selectedActivity, scores, activeDims);
      if (gen.description) {
        generatedCount += 1;
        if (!gen.isComplete) incompleteCount += 1;
        nextDrafts[descId] = {
          text: gen.description,
          status: 'Draft',
          warning: gen.completenessWarning,
          isAuto: true
        };
      } else {
        emptyCount += 1;
      }
    });

    setDraftDescriptions(nextDrafts);
    if (generatedCount === 0) {
      setFeedback({
        type: 'error',
        message: `Belum ada siswa yang memiliki capaian subdimensi pada kegiatan "${selectedActivity.name}". Silakan isi nilai kokurikuler terlebih dahulu.`
      });
    } else {
      setFeedback({
        type: 'success',
        message: `${generatedCount} deskripsi otomatis berhasil disusun${
          incompleteCount > 0 ? ` (${incompleteCount} siswa masih belum lengkap subdimensinya)` : ''
        }${emptyCount > 0 ? `, ${emptyCount} siswa dilewati karena belum ada nilai sama sekali` : ''}. Tinjau lalu klik "Simpan Data".`
      });
    }
  };

  const handleSaveAllDescriptions = async () => {
    if (!selectedGroup || !selectedActivity || isLocked || !canEditSelectedGroup) return;
    const now = new Date().toISOString();
    const toSave: KokurikulerDescription[] = [];

    groupStudents.forEach((std) => {
      const descId = buildKokurikulerDescriptionId(
        academicYear,
        semester,
        selectedGroup.id,
        selectedActivity.id,
        std.id
      );
      const draft = draftDescriptions[descId];
      const existing = savedDescLookup.get(descId);
      if (!draft) return;
      const nextStatus: KokurikulerDescriptionStatus =
        draft.status === 'Belum diisi' || draft.status === 'Draft'
          ? 'Sudah disimpan'
          : draft.status;
      toSave.push({
        id: descId,
        academicYear,
        semester,
        groupId: selectedGroup.id,
        activityId: selectedActivity.id,
        studentId: std.id,
        rombelId: std.classId,
        teacherId: myTeacherId || selectedGroup.coordinatorTeacherId,
        description: draft.text.trim(),
        status: draft.text.trim() ? nextStatus : 'Belum diisi',
        completenessWarning: draft.warning,
        isAutoGenerated: draft.isAuto ?? existing?.isAutoGenerated ?? false,
        createdAt: existing?.createdAt || now,
        updatedAt: now
      });
    });

    if (toSave.length === 0) {
      setFeedback({ type: 'error', message: 'Belum ada perubahan deskripsi untuk disimpan.' });
      return;
    }

    setIsSavingDescriptions(true);
    const res = await onSaveDescriptions(toSave);
    setIsSavingDescriptions(false);

    if (res.success) {
      setDraftDescriptions({});
      setFeedback({
        type: 'success',
        message: `${res.count} deskripsi capaian kokurikuler berhasil disimpan ke Cloud Firebase.`
      });
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'Gagal menyimpan deskripsi ke Firebase.'
      });
    }
  };

  // Count unsaved changes on input tab
  const pendingScoreCount = Object.keys(draftScores).length;
  const pendingDescCount = Object.keys(draftDescriptions).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider">
            <ClipboardCheck className="w-4 h-4" />
            Kokurikuler &bull; Nilai Kokurikuler ({academicYear} &bull; Semester {semester})
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
            Penilaian Capaian, Import Excel, dan Deskripsi Rapor Kokurikuler
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Penilaian menggunakan 3 tingkatan capaian resmi (Berkembang, Cakap, Mahir) tanpa nilai angka 0–100 dan terpisah dari nilai mata pelajaran intrakurikuler.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setIsRubricOpen(true)}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold flex items-center gap-1.5"
          >
            <BookOpenCheck className="w-4 h-4 text-blue-600" />
            Alur Perkembangan
          </button>
          <button
            type="button"
            onClick={() => setIsStatusDrawerOpen(true)}
            disabled={!selectedActivity}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold flex items-center gap-1.5 disabled:opacity-50"
          >
            <ListChecks className="w-4 h-4 text-emerald-600" />
            Status Pengisian
          </button>
          <button
            type="button"
            onClick={onBackToData}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
        </div>
      </div>

      {/* Submenu Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 w-fit">
        <button
          type="button"
          onClick={() => onChangeTab('input')}
          className={`px-3.5 py-2 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${
            activeTab === 'input'
              ? 'bg-white text-blue-700 border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ClipboardCheck className="w-3.5 h-3.5" />
          1. Input Nilai Kokurikuler
        </button>
        <button
          type="button"
          onClick={() => onChangeTab('import')}
          className={`px-3.5 py-2 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${
            activeTab === 'import'
              ? 'bg-white text-blue-700 border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          2. Import Nilai Kokurikuler
        </button>
        <button
          type="button"
          onClick={() => onChangeTab('deskripsi')}
          className={`px-3.5 py-2 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${
            activeTab === 'deskripsi'
              ? 'bg-white text-blue-700 border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          3. Deskripsi Kokurikuler
        </button>
      </div>

      {/* Global Group & Activity Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block font-bold text-slate-700 mb-1">1. Pilih Kelompok Kokurikuler</label>
          <select
            value={selectedGroup?.id || ''}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold text-slate-900"
          >
            {assessableGroups.length === 0 ? (
              <option value="">-- Tidak ada kelompok yang dapat dinilai --</option>
            ) : (
              assessableGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  [{g.code}] {g.name} ({g.studentIds.length} siswa)
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">2. Pilih Kegiatan Kokurikuler</label>
          <select
            value={selectedActivity?.id || ''}
            onChange={(e) => setSelectedActivityId(e.target.value)}
            disabled={!selectedGroup}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold text-slate-900 disabled:bg-slate-50"
          >
            {groupActivities.length === 0 ? (
              <option value="">-- Belum ada kegiatan di kelompok ini --</option>
            ) : (
              groupActivities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.orderIndex}. {a.name} ({a.subdimensionIds.length} Subdimensi)
                </option>
              ))
            )}
          </select>
        </div>

        {activeTab === 'input' ? (
          <div>
            <label className="block font-bold text-slate-700 mb-1">3. Pilih Dimensi Profil Lulusan</label>
            <select
              value={selectedDimensionId}
              onChange={(e) => setSelectedDimensionId(e.target.value)}
              disabled={!selectedActivity || permittedDimensionIds.length === 0}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold text-slate-900 disabled:bg-slate-50"
            >
              {permittedDimensionIds.length === 0 ? (
                <option value="">-- Belum ada dimensi target --</option>
              ) : (
                permittedDimensionIds.map((dimId) => {
                  const d = activeDims.find((x) => x.id === dimId);
                  if (!d) return null;
                  return (
                    <option key={d.id} value={d.id}>
                      {d.order}. {d.name}
                    </option>
                  );
                })
              )}
            </select>
          </div>
        ) : (
          <div className="flex flex-col justify-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Tujuan Akhir Kegiatan</span>
            <span className="text-xs font-medium text-slate-800 line-clamp-2 mt-0.5">
              {selectedActivity?.finalObjective || '-'}
            </span>
          </div>
        )}
      </div>

      {/* RBAC / Lock Notices */}
      {assessableGroups.length === 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Belum Ada Kelompok Kokurikuler yang Ditugaskan pada Anda</p>
            <p className="mt-0.5">
              Untuk Tahun Pelajaran {academicYear} Semester {semester}, akun Anda belum ditetapkan sebagai Koordinator atau Guru Terlibat pada kelompok aktif mana pun, atau belum ada kelompok yang dibuat. Silakan atur pada menu <strong>Data Kokurikuler &rarr; Kelompok Kokurikuler</strong>.
            </p>
          </div>
        </div>
      )}

      {selectedGroup?.isAssessmentLocked && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Penilaian Terkunci:</strong> Koordinator/Admin telah mengunci pengisian nilai pada kelompok "{selectedGroup.name}". Perubahan capaian atau import dinonaktifkan hingga kunci dibuka.
          </span>
        </div>
      )}

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
          <button type="button" onClick={() => setFeedback(null)}>
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUBMENU 1: INPUT NILAI KOKURIKULER */}
      {/* =================================================================== */}
      {activeTab === 'input' && selectedGroup && selectedActivity && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Matriks Penilaian Dimensi: {activeDimension?.name || '-'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {groupStudents.length} peserta terdaftar &bull; {visibleSubdimensions.length} subdimensi target pada dimensi ini
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {!isLocked && canEditSelectedGroup && visibleSubdimensions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                  <span className="font-semibold text-slate-600">Bantu Isi Draf:</span>
                  <select
                    value={bulkSubId}
                    onChange={(e) => setBulkSubId(e.target.value)}
                    className="bg-white border border-slate-300 rounded px-2 py-1 font-semibold max-w-[160px]"
                  >
                    {visibleSubdimensions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={bulkLevel}
                    onChange={(e) => setBulkLevel(e.target.value as KokurikulerAchievementLevel)}
                    className="bg-white border border-slate-300 rounded px-2 py-1 font-bold"
                  >
                    {ACHIEVEMENT_LEVELS.map((lv) => (
                      <option key={lv} value={lv}>
                        {lv}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleBulkApplyDraft}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold"
                  >
                    Terapkan Draf
                  </button>
                </div>
              )}

              {!isLocked && canEditSelectedGroup && (
                <button
                  type="button"
                  onClick={handleSaveInputScores}
                  disabled={isSavingScores || pendingScoreCount === 0}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 disabled:opacity-50 transition"
                >
                  <Save className="w-4 h-4" />
                  {isSavingScores
                    ? 'Menyimpan ke Firebase...'
                    : `Simpan Data${pendingScoreCount > 0 ? ` (${pendingScoreCount} perubahan)` : ''}`}
                </button>
              )}
            </div>
          </div>

          {visibleSubdimensions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Belum ada subdimensi target pada dimensi ini. Atur pada menu{' '}
              <strong>Data Kokurikuler &rarr; Profil Lulusan</strong>.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase text-[11px]">
                  <tr>
                    <th className="px-3 py-3 font-bold w-10 text-center">No</th>
                    <th className="px-3 py-3 font-bold min-w-[190px]">Nama Siswa</th>
                    <th className="px-3 py-3 font-bold whitespace-nowrap">NIS / NISN</th>
                    <th className="px-3 py-3 font-bold whitespace-nowrap">Rombel</th>
                    {visibleSubdimensions.map((sub) => (
                      <th key={sub.id} className="px-3 py-3 font-bold min-w-[235px]">
                        <div className="font-mono text-blue-700">{sub.code}</div>
                        <div className="text-slate-900 normal-case font-bold leading-snug">
                          {sub.name}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {groupStudents.map((std, idx) => (
                    <tr key={std.id} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2.5 text-center font-semibold text-slate-600 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-slate-900">{std.name}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {std.nis} / {std.nisn}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-700 whitespace-nowrap">
                        {classMap.get(std.classId) || '-'}
                      </td>
                      {visibleSubdimensions.map((sub) => {
                        const scoreId = buildKokurikulerScoreId(
                          academicYear,
                          semester,
                          selectedGroup.id,
                          selectedActivity.id,
                          std.id,
                          sub.id
                        );
                        const isDirty = Boolean(draftScores[scoreId]);
                        const currentVal = getEffectiveLevel(std.id, sub.id);

                        return (
                          <td
                            key={sub.id}
                            className={`px-3 py-2 ${isDirty ? 'bg-blue-50/40' : ''}`}
                          >
                            <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden bg-white">
                              {ACHIEVEMENT_LEVELS.map((lv) => {
                                const selected = currentVal === lv;
                                const activeStyles =
                                  lv === 'Berkembang'
                                    ? 'bg-amber-600 text-white'
                                    : lv === 'Cakap'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-blue-600 text-white';

                                return (
                                  <button
                                    key={lv}
                                    type="button"
                                    disabled={isLocked || !canEditSelectedGroup}
                                    onClick={() =>
                                      handleSelectCellLevel(std, activeDimension!.id, sub.id, lv)
                                    }
                                    className={`px-2.5 py-1.5 text-[11px] font-bold transition border-r last:border-r-0 border-slate-200 disabled:opacity-60 ${
                                      selected
                                        ? activeStyles
                                        : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                                  >
                                    {lv}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* SUBMENU 2: IMPORT NILAI KOKURIKULER (EXCEL 1/2/3) */}
      {/* =================================================================== */}
      {activeTab === 'import' && selectedGroup && selectedActivity && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Import Nilai Kokurikuler via Excel (Kode 1 = Berkembang, 2 = Cakap, 3 = Mahir)
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Sel kosong dibiarkan kosong (tidak pernah diubah paksa menjadi 1). Nilai selain 1, 2, atau 3 akan ditolak.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadFormat}
                className="px-4 py-2 rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold flex items-center gap-2 shrink-0 transition"
              >
                <Download className="w-4 h-4" />
                Download Format Kelompok Ini (.xlsx)
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer transition">
                <Upload className="w-4 h-4" />
                <span>Pilih & Validasi File Excel (.xlsx)</span>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleUploadExcel}
                  className="hidden"
                />
              </label>
              {importFileName && (
                <span className="text-slate-600 font-medium">
                  Berkas dipilih: <strong className="text-slate-900">{importFileName}</strong>
                </span>
              )}
            </div>
          </div>

          {importParseResult && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="text-[11px] font-bold text-slate-500">Entri Valid Siap Import</div>
                  <div className="text-lg font-extrabold text-emerald-700 mt-0.5 tabular-nums">
                    {importParseResult.validEntries.length}
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="text-[11px] font-bold text-slate-500">Sel Kosong Dilewati</div>
                  <div className="text-lg font-extrabold text-slate-700 mt-0.5 tabular-nums">
                    {importParseResult.skippedEmptyCount}
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="text-[11px] font-bold text-slate-500">Konflik Nilai Tersimpan</div>
                  <div className="text-lg font-extrabold text-amber-700 mt-0.5 tabular-nums">
                    {importParseResult.existingConflicts}
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="text-[11px] font-bold text-slate-500">Baris/Nilai Ditolak</div>
                  <div className="text-lg font-extrabold text-rose-700 mt-0.5 tabular-nums">
                    {importParseResult.rowErrors.length +
                      importParseResult.duplicateStudentErrors.length +
                      importParseResult.metadataErrors.length}
                  </div>
                </div>
              </div>

              {(importParseResult.metadataErrors.length > 0 ||
                importParseResult.duplicateStudentErrors.length > 0 ||
                importParseResult.rowErrors.length > 0) && (
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Catatan Validasi & Penolakan Baris:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {importParseResult.metadataErrors.map((err, i) => (
                      <li key={`m-${i}`}>{err}</li>
                    ))}
                    {importParseResult.duplicateStudentErrors.map((err, i) => (
                      <li key={`d-${i}`}>{err}</li>
                    ))}
                    {importParseResult.rowErrors.slice(0, 15).map((err, i) => (
                      <li key={`r-${i}`}>{err}</li>
                    ))}
                    {importParseResult.rowErrors.length > 15 && (
                      <li>...dan {importParseResult.rowErrors.length - 15} kesalahan lainnya.</li>
                    )}
                  </ul>
                </div>
              )}

              {importParseResult.existingConflicts > 0 && (
                <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 space-y-2">
                  <div className="font-bold">
                    Ditemukan {importParseResult.existingConflicts} nilai siswa yang sudah ada di sistem. Pilih perlakuan saat import:
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="conflictPolicy"
                        checked={conflictPolicy === 'skip'}
                        onChange={() => setConflictPolicy('skip')}
                      />
                      Lewati nilai yang sudah ada (Pertahankan nilai lama)
                    </label>
                    <label className="flex items-center gap-2 font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="conflictPolicy"
                        checked={conflictPolicy === 'overwrite'}
                        onChange={() => setConflictPolicy('overwrite')}
                      />
                      Timpa nilai yang sudah ada dengan nilai Excel
                    </label>
                  </div>
                </div>
              )}

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-bold text-slate-800">
                  Pratinjau Data Valid ({importParseResult.validEntries.length} entri)
                </div>
                <div className="max-h-72 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] uppercase sticky top-0">
                      <tr>
                        <th className="px-3 py-2 font-bold">Baris</th>
                        <th className="px-3 py-2 font-bold">Nama Siswa</th>
                        <th className="px-3 py-2 font-bold">Subdimensi</th>
                        <th className="px-3 py-2 font-bold text-center">Kode Excel</th>
                        <th className="px-3 py-2 font-bold">Tingkatan Capaian</th>
                        <th className="px-3 py-2 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importParseResult.validEntries.slice(0, 60).map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-1.5 font-mono text-slate-500">{item.rowNumber}</td>
                          <td className="px-3 py-1.5 font-semibold text-slate-900">
                            {item.studentName}
                          </td>
                          <td className="px-3 py-1.5 text-slate-700">
                            <span className="font-mono font-bold text-blue-700 mr-1">
                              {item.subdimensionCode}
                            </span>
                            {item.subdimensionName}
                          </td>
                          <td className="px-3 py-1.5 text-center font-mono font-bold">
                            {item.numericCode}
                          </td>
                          <td className="px-3 py-1.5 font-bold text-slate-900">{item.level}</td>
                          <td className="px-3 py-1.5">
                            {item.hasExisting ? (
                              <span className="text-amber-700 font-semibold">
                                Ada ({item.existingLevel}) &rarr;{' '}
                                {conflictPolicy === 'overwrite' ? 'Ditimpakan' : 'Dilewati'}
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-semibold">Baru</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setImportParseResult(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Batal / Reset Pratinjau
                </button>
                <button
                  type="button"
                  disabled={
                    isImporting ||
                    isLocked ||
                    !canEditSelectedGroup ||
                    importParseResult.validEntries.length === 0
                  }
                  onClick={handleCommitImport}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isImporting ? 'Menyimpan Import...' : 'Import Nilai Kokurikuler'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* SUBMENU 3: DESKRIPSI KOKURIKULER */}
      {/* =================================================================== */}
      {activeTab === 'deskripsi' && selectedGroup && selectedActivity && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Penyusunan Deskripsi Capaian Kokurikuler: {selectedActivity.name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Deskripsi rapor mengacu pada Tujuan Akhir Kegiatan serta capaian subdimensi riil siswa (tidak mengarang ketercapaian jika nilai subdimensi belum lengkap).
              </p>
            </div>

            {!isLocked && canEditSelectedGroup && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleBatchGenerateDescriptions}
                  className="px-3.5 py-2 rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold flex items-center gap-1.5 transition"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Otomatis dari Nilai Kokurikuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveAllDescriptions}
                  disabled={isSavingDescriptions || pendingDescCount === 0}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 disabled:opacity-50 transition"
                >
                  <Save className="w-4 h-4" />
                  {isSavingDescriptions
                    ? 'Menyimpan...'
                    : `Simpan Data${pendingDescCount > 0 ? ` (${pendingDescCount})` : ''}`}
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase text-[11px]">
                <tr>
                  <th className="px-3 py-3 font-bold w-10 text-center">No</th>
                  <th className="px-3 py-3 font-bold min-w-[180px]">Peserta Didik</th>
                  <th className="px-3 py-3 font-bold min-w-[140px]">Kelengkapan Nilai</th>
                  <th className="px-3 py-3 font-bold min-w-[380px]">
                    Narasi Deskripsi Rapor Kokurikuler (Otomatis / Manual)
                  </th>
                  <th className="px-3 py-3 font-bold min-w-[160px]">Status & Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {groupStudents.map((std, idx) => {
                  const descId = buildKokurikulerDescriptionId(
                    academicYear,
                    semester,
                    selectedGroup.id,
                    selectedActivity.id,
                    std.id
                  );
                  const saved = savedDescLookup.get(descId);
                  const draft = draftDescriptions[descId];
                  const textVal = draft ? draft.text : saved?.description || '';
                  const statusVal: KokurikulerDescriptionStatus = draft
                    ? draft.status
                    : saved?.status || 'Belum diisi';
                  const warningText = draft ? draft.warning : saved?.completenessWarning;

                  const targetCount = selectedActivity.subdimensionIds?.length || 0;
                  const studentActScores = scores.filter(
                    (sc) =>
                      sc.studentId === std.id &&
                      sc.activityId === selectedActivity.id &&
                      sc.groupId === selectedGroup.id &&
                      sc.academicYear === academicYear &&
                      sc.semester === semester
                  );
                  const assessedCount = studentActScores.length;

                  return (
                    <tr key={std.id} className={`align-top ${draft ? 'bg-blue-50/30' : ''}`}>
                      <td className="px-3 py-3 text-center font-semibold text-slate-600 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-bold text-slate-900">{std.name}</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {std.nisn} &bull; {classMap.get(std.classId) || '-'}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-bold text-slate-800 tabular-nums">
                          {assessedCount} / {targetCount} Subdimensi
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5 space-y-0.5">
                          {studentActScores.map((sc) => (
                            <div key={sc.id}>
                              <span className="font-mono font-bold text-blue-700">
                                {subMap.get(sc.subdimensionId)?.sub.code || sc.subdimensionId}:
                              </span>{' '}
                              {sc.level}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3 space-y-2">
                        <textarea
                          rows={3}
                          disabled={isLocked || !canEditSelectedGroup}
                          value={textVal}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraftDescriptions((prev) => ({
                              ...prev,
                              [descId]: {
                                text: val,
                                status: prev[descId]?.status || saved?.status || 'Draft',
                                warning: warningText,
                                isAuto: false
                              }
                            }));
                          }}
                          placeholder="Klik 'Generate Otomatis' atau ketik narasi capaian kokurikuler siswa secara manual..."
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs leading-relaxed text-slate-900 disabled:bg-slate-50"
                        />
                        {warningText && (
                          <div className="flex items-start gap-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <span>{warningText}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 space-y-2">
                        <select
                          disabled={isLocked || !canEditSelectedGroup}
                          value={statusVal}
                          onChange={(e) => {
                            const nextStatus = e.target.value as KokurikulerDescriptionStatus;
                            setDraftDescriptions((prev) => ({
                              ...prev,
                              [descId]: {
                                text: textVal,
                                status: nextStatus,
                                warning: warningText,
                                isAuto: prev[descId]?.isAuto ?? saved?.isAutoGenerated
                              }
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold text-xs"
                        >
                          {DESC_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>

                        {!isLocked && canEditSelectedGroup && (
                          <button
                            type="button"
                            onClick={() => handleGenerateOneDescription(std)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] flex items-center justify-center gap-1"
                          >
                            <Sparkles className="w-3 h-3 text-blue-600" />
                            Generate Siswa Ini
                          </button>
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

      {/* Status Pengisian Drawer Modal */}
      {isStatusDrawerOpen && selectedGroup && selectedActivity && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Status Pengisian Capaian & Deskripsi Kokurikuler
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedGroup.code} &bull; {selectedActivity.name} ({groupStudents.length} siswa)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsStatusDrawerOpen(false)}
                className="text-slate-500 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase text-[11px]">
                  <tr>
                    <th className="px-3 py-2 font-bold">No</th>
                    <th className="px-3 py-2 font-bold">Nama Siswa</th>
                    <th className="px-3 py-2 font-bold">Rombel</th>
                    <th className="px-3 py-2 font-bold text-center">Subdimensi Terisi</th>
                    <th className="px-3 py-2 font-bold text-center">Status Deskripsi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupStudents.map((std, idx) => {
                    const targetCount = selectedActivity.subdimensionIds?.length || 0;
                    const filledCount = scores.filter(
                      (sc) =>
                        sc.studentId === std.id &&
                        sc.activityId === selectedActivity.id &&
                        sc.groupId === selectedGroup.id &&
                        sc.academicYear === academicYear &&
                        sc.semester === semester
                    ).length;
                    const descId = buildKokurikulerDescriptionId(
                      academicYear,
                      semester,
                      selectedGroup.id,
                      selectedActivity.id,
                      std.id
                    );
                    const descStatus = savedDescLookup.get(descId)?.status || 'Belum diisi';

                    return (
                      <tr key={std.id}>
                        <td className="px-3 py-2 tabular-nums">{idx + 1}</td>
                        <td className="px-3 py-2 font-semibold text-slate-900">{std.name}</td>
                        <td className="px-3 py-2 text-slate-600">{classMap.get(std.classId) || '-'}</td>
                        <td className="px-3 py-2 text-center font-bold tabular-nums">
                          <span
                            className={
                              filledCount >= targetCount && targetCount > 0
                                ? 'text-emerald-700'
                                : filledCount > 0
                                ? 'text-amber-700'
                                : 'text-rose-600'
                            }
                          >
                            {filledCount} / {targetCount}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center font-bold">{descStatus}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsStatusDrawerOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alur Perkembangan Modal */}
      <AlurPerkembanganModal
        isOpen={isRubricOpen}
        onClose={() => setIsRubricOpen(false)}
        dimensions={activeDims}
        focusDimensionIds={selectedActivity?.dimensionIds}
        focusSubdimensionIds={selectedActivity?.subdimensionIds}
      />
    </div>
  );
};
