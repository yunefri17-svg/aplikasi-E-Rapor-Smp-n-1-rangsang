import {
  KokurikulerAchievementLevel,
  KokurikulerActivity,
  KokurikulerDescription,
  KokurikulerDimensionMaster,
  KokurikulerGroup,
  KokurikulerScore,
  KokurikulerSubdimensionMaster,
  Student,
  User
} from '../types/erapor';
import { OFFICIAL_KOKURIKULER_DIMENSIONS } from '../data/kokurikulerMaster';

export const cleanAcademicYearKey = (year: string): string =>
  (year || '').replace(/[^a-zA-Z0-9]/g, '_');

/**
 * Deterministic ID for Kokurikuler Score so a student can join multiple groups/activities
 * without ever creating duplicate rows for the same (period + group + activity + student + subdimension).
 */
export const buildKokurikulerScoreId = (
  academicYear: string,
  semester: string,
  groupId: string,
  activityId: string,
  studentId: string,
  subdimensionId: string
): string => {
  return `kks_${cleanAcademicYearKey(academicYear)}_${semester}_${groupId}_${activityId}_${studentId}_${subdimensionId}`;
};

/**
 * Deterministic ID for Kokurikuler Description per (period + group + activity + student).
 */
export const buildKokurikulerDescriptionId = (
  academicYear: string,
  semester: string,
  groupId: string,
  activityId: string,
  studentId: string
): string => {
  return `kkd_${cleanAcademicYearKey(academicYear)}_${semester}_${groupId}_${activityId}_${studentId}`;
};

/**
 * Resolve current active dimensions lookup map
 */
export const getDimensionMap = (
  dimensions: KokurikulerDimensionMaster[] = OFFICIAL_KOKURIKULER_DIMENSIONS
): Map<string, KokurikulerDimensionMaster> => {
  const source = dimensions.length > 0 ? dimensions : OFFICIAL_KOKURIKULER_DIMENSIONS;
  return new Map(source.map((d) => [d.id, d]));
};

export const getSubdimensionMap = (
  dimensions: KokurikulerDimensionMaster[] = OFFICIAL_KOKURIKULER_DIMENSIONS
): Map<string, { sub: KokurikulerSubdimensionMaster; dim: KokurikulerDimensionMaster }> => {
  const source = dimensions.length > 0 ? dimensions : OFFICIAL_KOKURIKULER_DIMENSIONS;
  const map = new Map<string, { sub: KokurikulerSubdimensionMaster; dim: KokurikulerDimensionMaster }>();
  source.forEach((dim) => {
    dim.subdimensions.forEach((sub) => {
      map.set(sub.id, { sub, dim });
    });
  });
  return map;
};

/**
 * Determine effective Teacher ID associated with a logged-in User
 */
export const resolveUserTeacherId = (user: User | null | undefined): string => {
  if (!user) return '';
  return user.teacherId || user.id || '';
};

/**
 * RBAC: Check whether a user can edit scores/descriptions for a given KokurikulerGroup
 */
export const canUserAssessGroup = (user: User | null | undefined, group: KokurikulerGroup): boolean => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'kepsek') return false;
  const tid = resolveUserTeacherId(user);
  if (!tid) return false;
  if (group.coordinatorTeacherId === tid) return true;
  if (Array.isArray(group.involvedTeacherIds) && group.involvedTeacherIds.includes(tid)) {
    return true;
  }
  return false;
};

/**
 * RBAC: Check which dimensions a user is permitted to assess inside a group
 */
export const getPermittedDimensionIdsForUser = (
  user: User | null | undefined,
  group: KokurikulerGroup,
  activityDimensionIds: string[]
): string[] => {
  if (!user) return [];
  if (user.role === 'admin') return activityDimensionIds;
  const tid = resolveUserTeacherId(user);
  if (group.coordinatorTeacherId === tid) return activityDimensionIds;
  if (Array.isArray(group.involvedTeacherIds) && group.involvedTeacherIds.includes(tid)) {
    const restricted = group.involvedTeacherDimensions?.[tid];
    if (restricted && restricted.length > 0) {
      return activityDimensionIds.filter((dId) => restricted.includes(dId));
    }
    return activityDimensionIds;
  }
  return [];
};

/**
 * RBAC: Check whether a user can view a group in reports / dashboards
 */
export const canUserViewGroup = (
  user: User | null | undefined,
  group: KokurikulerGroup,
  students: Student[]
): boolean => {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'kepsek') return true;
  if (canUserAssessGroup(user, group)) return true;
  if (user.role === 'walikelas' && user.classId) {
    if (group.classIds.includes(user.classId)) return true;
    const homeroomStudentIds = new Set(
      students.filter((s) => s.classId === user.classId).map((s) => s.id)
    );
    return group.studentIds.some((sid) => homeroomStudentIds.has(sid));
  }
  return false;
};

/**
 * Check whether an Excel numeric code maps strictly to Berkembang / Cakap / Mahir
 */
export const mapNumericCodeToLevel = (
  raw: unknown
): { valid: boolean; empty?: boolean; level?: KokurikulerAchievementLevel } => {
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return { valid: true, empty: true };
  }
  const str = String(raw).trim();
  if (str === '1') return { valid: true, level: 'Berkembang' };
  if (str === '2') return { valid: true, level: 'Cakap' };
  if (str === '3') return { valid: true, level: 'Mahir' };
  return { valid: false };
};

export const mapLevelToNumericCode = (level?: KokurikulerAchievementLevel): number | '' => {
  if (level === 'Berkembang') return 1;
  if (level === 'Cakap') return 2;
  if (level === 'Mahir') return 3;
  return '';
};

/**
 * Automatic Narrative Description Generator compliant with Section I rules:
 * - References activity.finalObjective (Tujuan Akhir Kegiatan)
 * - Evaluates actual stored KokurikulerScores per selected subdimension ONLY
 * - Never fabricates mastery for unassessed subdimensions
 * - Flags completenessWarning when subdimensions are still missing
 */
export interface GeneratedKokurikulerDescResult {
  description: string;
  assessedCount: number;
  totalTargetCount: number;
  isComplete: boolean;
  completenessWarning?: string;
}

export const generateKokurikulerDescription = (
  student: Student,
  activity: KokurikulerActivity,
  studentActivityScores: KokurikulerScore[],
  dimensions: KokurikulerDimensionMaster[] = OFFICIAL_KOKURIKULER_DIMENSIONS
): GeneratedKokurikulerDescResult => {
  const targetSubIds = activity.subdimensionIds || [];
  const subMap = getSubdimensionMap(dimensions);

  const scoreBySubId = new Map<string, KokurikulerScore>();
  studentActivityScores.forEach((sc) => {
    if (
      sc.studentId === student.id &&
      sc.activityId === activity.id &&
      sc.groupId === activity.groupId &&
      sc.academicYear === activity.academicYear &&
      sc.semester === activity.semester
    ) {
      scoreBySubId.set(sc.subdimensionId, sc);
    }
  });

  const assessedItems: {
    dimName: string;
    subName: string;
    level: KokurikulerAchievementLevel;
    indicatorText: string;
  }[] = [];

  targetSubIds.forEach((subId) => {
    const score = scoreBySubId.get(subId);
    const meta = subMap.get(subId);
    if (score && meta) {
      assessedItems.push({
        dimName: meta.dim.name,
        subName: meta.sub.name,
        level: score.level,
        indicatorText: meta.sub.levelDescriptions[score.level]
      });
    }
  });

  if (assessedItems.length === 0) {
    return {
      description: '',
      assessedCount: 0,
      totalTargetCount: targetSubIds.length,
      isComplete: false,
      completenessWarning: `Belum ada capaian subdimensi yang diinput untuk ${student.name} pada kegiatan ini (0 dari ${targetSubIds.length} target subdimensi).`
    };
  }

  const isComplete = assessedItems.length >= targetSubIds.length;
  const missingCount = Math.max(0, targetSubIds.length - assessedItems.length);
  const completenessWarning = isComplete
    ? undefined
    : `Penilaian belum lengkap (${assessedItems.length} dari ${targetSubIds.length} subdimensi telah dinilai, ${missingCount} subdimensi belum diisi). Deskripsi hanya disusun berdasarkan subdimensi yang sudah dinilai.`;

  // Group assessed items by level
  const mahirItems = assessedItems.filter((i) => i.level === 'Mahir');
  const cakapItems = assessedItems.filter((i) => i.level === 'Cakap');
  const berkembangItems = assessedItems.filter((i) => i.level === 'Berkembang');

  const joinNames = (list: typeof assessedItems) => {
    const names = list.map((x) => `${x.subName} (${x.dimName})`);
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} dan ${names[1]}`;
    return `${names.slice(0, -1).join(', ')}, dan ${names[names.length - 1]}`;
  };

  const parts: string[] = [];

  const cleanObjective = (activity.finalObjective || activity.name || '').trim().replace(/\.$/, '');
  parts.push(
    `Dalam kegiatan "${activity.name}" yang bertujuan untuk ${cleanObjective.charAt(0).toLowerCase() + cleanObjective.slice(1)}, ${student.name}`
  );

  const clauseList: string[] = [];
  if (mahirItems.length > 0) {
    const topIndicator = mahirItems[0].indicatorText.replace(/\.$/, '');
    clauseList.push(
      `menunjukkan capaian pada kategori Mahir (melampaui standar) pada aspek ${joinNames(mahirItems)}, ditandai dengan kemampuan ${topIndicator.charAt(0).toLowerCase() + topIndicator.slice(1)}`
    );
  }
  if (cakapItems.length > 0) {
    const stdIndicator = cakapItems[0].indicatorText.replace(/\.$/, '');
    clauseList.push(
      `mencapai kategori Cakap (sesuai standar kelulusan) dalam aspek ${joinNames(cakapItems)} dengan ${stdIndicator.charAt(0).toLowerCase() + stdIndicator.slice(1)}`
    );
  }
  if (berkembangItems.length > 0) {
    const devIndicator = berkembangItems[0].indicatorText.replace(/\.$/, '');
    clauseList.push(
      `berada pada tahap Berkembang dalam aspek ${joinNames(berkembangItems)} sehingga perlu terus didorong agar konsisten dalam ${devIndicator.charAt(0).toLowerCase() + devIndicator.slice(1)}`
    );
  }

  const narrative = `${parts[0]} ${clauseList.join('; serta ')}.`.replace(/\s+/g, ' ').trim();

  return {
    description: narrative,
    assessedCount: assessedItems.length,
    totalTargetCount: targetSubIds.length,
    isComplete,
    completenessWarning
  };
};
