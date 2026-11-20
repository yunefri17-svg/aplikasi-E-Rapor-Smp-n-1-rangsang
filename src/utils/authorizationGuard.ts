import {
  AcademicYearPeriod,
  AssessmentPolicyConfig,
  AssessmentScore,
  AuthSessionContext,
  FormativeAssessment,
  LearningChapter,
  LearningObjective,
  Student,
  Subject,
  SummativeAssessment,
  SummativeAssessmentPlan,
  Teacher,
  TeachingAssignment,
  User
} from '../types/erapor';
import { resolveTeacherForUser } from './teacherAssignmentHelper';
import { isPeriodInputLocked } from './tpAnalysisAndDescription';
import { normalizeAcademicYearValue, normalizeSemesterValue } from './electiveSubjectHelper';

export interface AuthorizationResult {
  allowed: boolean;
  readOnly: boolean;
  reason?: string;
  isUnverifiedFallback?: boolean;
  resolvedTeacherId?: string;
}

export interface InUseCheckResult {
  inUse: boolean;
  reason?: string;
  references: string[];
}

export interface LegacyProtectionResult {
  isProtected: boolean;
  reason?: string;
}

export interface ScoreConflictResult {
  hasConflict: boolean;
  serverUpdatedAt?: string;
  serverUpdatedBy?: string;
  message?: string;
}

/**
 * Checks whether a teaching assignment is active and matches teacher, subject, class, and period.
 */
export function hasActiveTeachingAssignment(params: {
  user: User | null | undefined;
  teachers?: Teacher[];
  teachingAssignments?: TeachingAssignment[];
  subjectId: string;
  classId?: string;
  academicYear?: string;
  semester?: 'Ganjil' | 'Genap';
}): { matched: boolean; teacherId?: string; assignment?: TeachingAssignment } {
  const {
    user,
    teachers = [],
    teachingAssignments = [],
    subjectId,
    classId,
    academicYear,
    semester
  } = params;

  if (!user || !subjectId) return { matched: false };

  const matchedTeacher = resolveTeacherForUser(user, teachers);
  const candidateTeacherIds = new Set<string>();
  if (user.teacherId) candidateTeacherIds.add(user.teacherId);
  if (matchedTeacher?.id) candidateTeacherIds.add(matchedTeacher.id);

  const normUserName = (user.name || '').toLowerCase().trim();
  const normTeacherName = (matchedTeacher?.name || '').toLowerCase().trim();
  const targetYear = academicYear ? normalizeAcademicYearValue(academicYear) : '';
  const targetSem = semester ? normalizeSemesterValue(semester) : '';

  const found = teachingAssignments.find((ta) => {
    if (!ta || ta.status === 'inactive') return false;
    if (ta.subjectId !== subjectId) return false;
    if (classId && ta.classId !== classId) return false;

    if (targetYear && ta.academicYear && normalizeAcademicYearValue(ta.academicYear) !== targetYear) {
      return false;
    }

    if (
      targetSem &&
      ta.semester &&
      ta.semester !== 'Semua' &&
      normalizeSemesterValue(ta.semester) !== targetSem
    ) {
      return false;
    }

    if (ta.teacherId && candidateTeacherIds.has(ta.teacherId)) return true;
    const taName = (ta.teacherName || '').toLowerCase().trim();
    if (taName && (taName === normUserName || (normTeacherName && taName === normTeacherName))) {
      return true;
    }
    return false;
  });

  if (found) {
    return { matched: true, teacherId: found.teacherId || matchedTeacher?.id || user.teacherId, assignment: found };
  }

  return { matched: false, teacherId: matchedTeacher?.id || user.teacherId };
}

/**
 * Resolves accessible classrooms for subject-level management (Formatif TP / Sumatif BAB & Plan / Nilai Mapel).
 * - admin & kepsek: all classrooms (kepsek is read-only)
 * - guru: strictly classrooms with active teaching_assignments for that teacher (and optional subjectId)
 * - walikelas: when in guru/mapel context, strictly classrooms with active teaching_assignments;
 *   for homeroom-only viewing, only their own classId (read-only for mapel without assignment)
 */
export function getAuthorizedSubjectClassIds(params: {
  user: User | null | undefined;
  teachers?: Teacher[];
  teachingAssignments?: TeachingAssignment[];
  subjectId?: string;
  academicYear?: string;
  semester?: 'Ganjil' | 'Genap';
}): { allowAll: boolean; classIds: string[]; writableClassIds: string[] } {
  const { user, teachers = [], teachingAssignments = [], subjectId, academicYear, semester } = params;
  if (!user || user.status === 'inactive') {
    return { allowAll: false, classIds: [], writableClassIds: [] };
  }
  if (user.role === 'admin') {
    return { allowAll: true, classIds: [], writableClassIds: [] };
  }
  if (user.role === 'kepsek') {
    return { allowAll: true, classIds: [], writableClassIds: [] };
  }

  const matchedTeacher = resolveTeacherForUser(user, teachers);
  const candidateTeacherIds = new Set<string>();
  if (user.teacherId) candidateTeacherIds.add(user.teacherId);
  if (matchedTeacher?.id) candidateTeacherIds.add(matchedTeacher.id);

  const targetYear = academicYear ? normalizeAcademicYearValue(academicYear) : '';
  const targetSem = semester ? normalizeSemesterValue(semester) : '';

  const matchingAssignments = teachingAssignments.filter((ta) => {
    if (!ta || ta.status === 'inactive') return false;
    if (subjectId && ta.subjectId !== subjectId) return false;
    if (targetYear && ta.academicYear && normalizeAcademicYearValue(ta.academicYear) !== targetYear) {
      return false;
    }
    if (
      targetSem &&
      ta.semester &&
      ta.semester !== 'Semua' &&
      normalizeSemesterValue(ta.semester) !== targetSem
    ) {
      return false;
    }
    if (ta.teacherId && candidateTeacherIds.has(ta.teacherId)) return true;
    const taName = (ta.teacherName || '').toLowerCase().trim();
    return Boolean(taName && (taName === (user.name || '').toLowerCase().trim() || taName === (matchedTeacher?.name || '').toLowerCase().trim()));
  });

  const writableClassIds = Array.from(new Set(matchingAssignments.map((a) => a.classId).filter(Boolean)));

  if (user.role === 'walikelas') {
    const visibleIds = Array.from(
      new Set([...(user.classId ? [user.classId] : []), ...writableClassIds])
    );
    return {
      allowAll: false,
      classIds: visibleIds,
      writableClassIds
    };
  }

  return {
    allowAll: false,
    classIds: writableClassIds,
    writableClassIds
  };
}

/**
 * Authorizes write operations on TP, BAB, Summative Plans, or Subject Assessment Scores.
 * Enforces RBAC (admin/guru/walikelas/kepsek), teaching_assignments, period locks,
 * and unverified anonymous fallback restrictions.
 */
export function authorizeSubjectAssessmentWrite(params: {
  user: User | null | undefined;
  subjectId: string;
  classId?: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  teachers?: Teacher[];
  teachingAssignments?: TeachingAssignment[];
  assessmentPolicy?: AssessmentPolicyConfig;
  authContext?: AuthSessionContext | null;
}): AuthorizationResult {
  const {
    user,
    subjectId,
    classId,
    academicYear,
    semester,
    teachers = [],
    teachingAssignments = [],
    assessmentPolicy,
    authContext
  } = params;

  if (!user || user.status === 'inactive') {
    return {
      allowed: false,
      readOnly: true,
      reason: 'Sesi pengguna tidak aktif atau tidak ditemukan. Silakan masuk ulang.'
    };
  }

  const isFallback = authContext?.verificationStatus === 'unverified_anonymous_fallback';
  if (authContext && isFallback) {
    if (!authContext.boundUserId || authContext.boundUserId !== user.id) {
      return {
        allowed: false,
        readOnly: true,
        isUnverifiedFallback: true,
        reason:
          'Akses tulis diblokir: Sesi Firebase Anonim tidak terikat pada identitas akun Anda yang terverifikasi.'
      };
    }
  }

  if (user.role === 'kepsek') {
    return {
      allowed: false,
      readOnly: true,
      isUnverifiedFallback: isFallback,
      reason: 'Kepala Sekolah hanya memiliki hak akses baca (Read-Only) untuk TP, BAB, asesmen, dan nilai.'
    };
  }

  if (user.role !== 'admin' && isPeriodInputLocked(assessmentPolicy, academicYear, semester)) {
    return {
      allowed: false,
      readOnly: true,
      isUnverifiedFallback: isFallback,
      reason: `Periode ${academicYear} Semester ${semester} sedang dikunci oleh Administrator.`
    };
  }

  if (user.role === 'admin') {
    return {
      allowed: true,
      readOnly: false,
      isUnverifiedFallback: isFallback,
      resolvedTeacherId: user.teacherId || 'admin'
    };
  }

  // Both 'guru' and 'walikelas' MUST hold an active teaching_assignments for subject writes.
  // Wali kelas does NOT automatically have subject-grade or TP/BAB write rights without an assignment.
  const assignmentCheck = hasActiveTeachingAssignment({
    user,
    teachers,
    teachingAssignments,
    subjectId,
    classId,
    academicYear,
    semester
  });

  if (!assignmentCheck.matched) {
    return {
      allowed: false,
      readOnly: true,
      isUnverifiedFallback: isFallback,
      resolvedTeacherId: assignmentCheck.teacherId,
      reason:
        user.role === 'walikelas'
          ? 'Wali Kelas tidak dapat menyimpan/mengubah TP, BAB, asesmen sumatif, atau nilai mapel tanpa penugasan mengajar aktif pada mapel dan kelas terkait.'
          : 'Akses ditolak: Anda tidak memiliki penugasan mengajar (teaching_assignments) aktif untuk mata pelajaran, kelas, dan periode ini.'
    };
  }

  return {
    allowed: true,
    readOnly: false,
    isUnverifiedFallback: isFallback,
    resolvedTeacherId: assignmentCheck.teacherId
  };
}

/**
 * Authorizes elevated Administrator / System mutations (users, teaching assignments, assessment policy, academic years).
 * If session is unverified anonymous fallback, denies sensitive security/policy writes unless explicitly verified.
 */
export function authorizeSensitiveAdminAction(params: {
  user: User | null | undefined;
  authContext?: AuthSessionContext | null;
  actionLabel?: string;
  allowBoundAdminFallback?: boolean;
}): AuthorizationResult {
  const { user, authContext, actionLabel = 'perubahan kebijakan/akun', allowBoundAdminFallback = false } = params;
  if (!user || user.status === 'inactive') {
    return { allowed: false, readOnly: true, reason: 'Pengguna tidak aktif.' };
  }
  if (user.role !== 'admin') {
    return {
      allowed: false,
      readOnly: true,
      reason: `Akses ditolak: Hanya Administrator yang dapat melakukan ${actionLabel}.`
    };
  }
  if (authContext?.verificationStatus === 'unverified_anonymous_fallback') {
    const isBoundAdmin = Boolean(!authContext.boundUserId || authContext.boundUserId === user.id);
    if (allowBoundAdminFallback && isBoundAdmin) {
      return { allowed: true, readOnly: false, isUnverifiedFallback: true };
    }
    return {
      allowed: false,
      readOnly: true,
      isUnverifiedFallback: true,
      reason: `Tindakan sensitif (${actionLabel}) dibatasi karena sesi masih memakai fallback anonim. Pastikan password akun admin minimal 6 karakter & domain terdaftar di Firebase Authorized Domains agar terverifikasi Email/Password.`
    };
  }
  return { allowed: true, readOnly: false };
}

/**
 * Protects archived/finalized report scores from unintended modification or automatic recalculation.
 */
export function checkLegacyScoreProtection(params: {
  score?: Partial<AssessmentScore> | null;
  academicYears?: AcademicYearPeriod[];
  assessmentPolicy?: AssessmentPolicyConfig;
  user?: User | null;
}): LegacyProtectionResult {
  const { score, academicYears = [], assessmentPolicy, user } = params;
  if (!score) return { isProtected: false };

  const year = score.academicYear || '';
  const sem = score.semester || 'Ganjil';

  const yearPeriod = academicYears.find(
    (ay) => normalizeAcademicYearValue(ay.name) === normalizeAcademicYearValue(year)
  );
  const semPeriod = yearPeriod?.semesters?.find(
    (s) => normalizeSemesterValue(s.semester) === normalizeSemesterValue(sem)
  );

  const isPeriodArchivedOrLocked = Boolean(
    yearPeriod?.status === 'arsip' ||
      yearPeriod?.isLocked ||
      semPeriod?.status === 'arsip' ||
      semPeriod?.isLocked
  );

  const isDocLocked = score.status === 'TERKUNCI' || score.descriptionStatus === 'Sudah difinalisasi';
  const isPolicyLocked = isPeriodInputLocked(assessmentPolicy, year, sem);

  if (user?.role === 'admin') {
    if (isDocLocked) {
      return {
        isProtected: true,
        reason: `Nilai periode ${year} (${sem}) berstatus TERKUNCI / Sudah difinalisasi. Perubahan membutuhkan konfirmasi eksplisit Administrator.`
      };
    }
    return { isProtected: false };
  }

  if (isPeriodArchivedOrLocked || isDocLocked || isPolicyLocked) {
    return {
      isProtected: true,
      reason: `Nilai rapor periode ${year} (${sem}) dilindungi (arsip/terkunci/finalisasi) dan tidak dapat diubah otomatis.`
    };
  }

  return { isProtected: false };
}

/**
 * Detects potential concurrent overwrite conflict when another user updated the server document
 * more recently than the local base timestamp loaded by this session.
 */
export function detectScoreServerConflict(params: {
  localBaseUpdatedAt?: string;
  serverScore?: AssessmentScore | null;
  currentUserId?: string;
}): ScoreConflictResult {
  const { localBaseUpdatedAt, serverScore, currentUserId } = params;
  if (!serverScore || !serverScore.updatedAt || !localBaseUpdatedAt) {
    return { hasConflict: false };
  }

  const serverTime = Date.parse(serverScore.updatedAt);
  const localTime = Date.parse(localBaseUpdatedAt);

  const isServerNewer =
    !Number.isNaN(serverTime) && !Number.isNaN(localTime)
      ? serverTime > localTime
      : serverScore.updatedAt !== localBaseUpdatedAt;

  const isDifferentEditor =
    Boolean(serverScore.updatedById && currentUserId && serverScore.updatedById !== currentUserId) ||
    !serverScore.updatedById;

  if (isServerNewer && isDifferentEditor) {
    const editor = serverScore.updatedBy || 'pengguna lain';
    return {
      hasConflict: true,
      serverUpdatedAt: serverScore.updatedAt,
      serverUpdatedBy: editor,
      message: `Konflik terdeteksi: Dokumen nilai siswa sudah diperbarui lebih baru di server oleh ${editor} (${serverScore.updatedAt}).`
    };
  }

  return { hasConflict: false };
}

/**
 * Checks if a Tujuan Pembelajaran (TP) is referenced by BAB, Summative Plan, Assessments, or Scores.
 */
export function checkLearningObjectiveInUse(params: {
  tpId: string;
  learningChapters?: LearningChapter[];
  summativePlans?: SummativeAssessmentPlan[];
  formativeAssessments?: FormativeAssessment[];
  summativeAssessments?: SummativeAssessment[];
  scores?: AssessmentScore[];
}): InUseCheckResult {
  const {
    tpId,
    learningChapters = [],
    summativePlans = [],
    formativeAssessments = [],
    summativeAssessments = [],
    scores = []
  } = params;

  const refs: string[] = [];

  const usedChapters = learningChapters.filter((ch) => (ch.linkedTpIds || []).includes(tpId));
  if (usedChapters.length > 0) {
    refs.push(`${usedChapters.length} BAB Materi (${usedChapters.map((c) => c.code).join(', ')})`);
  }

  const usedPlans = summativePlans.filter((pl) => (pl.tpIds || []).includes(tpId));
  if (usedPlans.length > 0) {
    refs.push(`${usedPlans.length} Rencana Sumatif (${usedPlans.map((p) => p.title).join(', ')})`);
  }

  const usedSummatives = summativeAssessments.filter(
    (sa) => sa.tpId === tpId || (sa.tpIds || []).includes(tpId)
  );
  if (usedSummatives.length > 0) {
    refs.push(`${usedSummatives.length} data nilai sumatif siswa`);
  }

  const usedFormatives = formativeAssessments.filter(
    (fa) => fa.tpId === tpId || (fa.tpIds || []).includes(tpId)
  );
  if (usedFormatives.length > 0) {
    refs.push(`${usedFormatives.length} catatan formatif historis`);
  }

  const usedScores = scores.filter(
    (sc) =>
      (sc.selectedOptimalTpIds || []).includes(tpId) ||
      (sc.selectedImprovementTpIds || []).includes(tpId) ||
      (sc.learningObjectiveIds || []).includes(tpId) ||
      Boolean(sc.formatifKktpScores && Object.prototype.hasOwnProperty.call(sc.formatifKktpScores, tpId)) ||
      Boolean(sc.formatifShowScores && Object.prototype.hasOwnProperty.call(sc.formatifShowScores, tpId)) ||
      Boolean(sc.sumatifMateriScores && Object.prototype.hasOwnProperty.call(sc.sumatifMateriScores, tpId))
  );
  if (usedScores.length > 0) {
    refs.push(`${usedScores.length} data formatif/deskripsi/nilai siswa`);
  }

  return {
    inUse: refs.length > 0,
    references: refs,
    reason:
      refs.length > 0
        ? `TP ini masih terhubung dengan data penilaian: ${refs.join('; ')}. Menghapus master TP tidak akan menghapus arsip nilai rapor lama.`
        : undefined
  };
}

/**
 * Checks if a BAB Materi (LearningChapter) is already referenced by Summative Plans, Assessments, or Scores.
 */
export function checkLearningChapterInUse(params: {
  chapterId: string;
  summativePlans?: SummativeAssessmentPlan[];
  summativeAssessments?: SummativeAssessment[];
  scores?: AssessmentScore[];
}): InUseCheckResult {
  const { chapterId, summativePlans = [], summativeAssessments = [], scores = [] } = params;
  const refs: string[] = [];

  const usedPlans = summativePlans.filter((pl) => pl.chapterId === chapterId);
  if (usedPlans.length > 0) {
    refs.push(`${usedPlans.length} rencana asesmen sumatif (${usedPlans.map((p) => p.title).join(', ')})`);
  }

  const usedSummatives = summativeAssessments.filter((sa) => sa.chapterId === chapterId);
  if (usedSummatives.length > 0) {
    refs.push(`${usedSummatives.length} nilai sumatif siswa`);
  }

  const usedScores = scores.filter(
    (sc) =>
      Boolean(sc.chapterScores && Object.prototype.hasOwnProperty.call(sc.chapterScores, chapterId)) ||
      Boolean(sc.sumatifMateriScores && Object.prototype.hasOwnProperty.call(sc.sumatifMateriScores, chapterId))
  );
  if (usedScores.length > 0) {
    refs.push(`${usedScores.length} rekap nilai rapor siswa`);
  }

  return {
    inUse: refs.length > 0,
    references: refs,
    reason:
      refs.length > 0
        ? `BAB ini masih digunakan pada data penilaian: ${refs.join('; ')}. Menghapus master BAB tidak akan menghapus nilai atau arsip rapor lama.`
        : undefined
  };
}

/**
 * Checks if a SummativeAssessmentPlan is already used in recorded student SummativeAssessments.
 */
export function checkSummativePlanInUse(params: {
  planId: string;
  summativeAssessments?: SummativeAssessment[];
}): InUseCheckResult {
  const { planId, summativeAssessments = [] } = params;
  const used = summativeAssessments.filter((sa) => sa.planId === planId);
  if (used.length > 0) {
    return {
      inUse: true,
      references: [`${used.length} nilai siswa pada asesmen ini`],
      reason: `Asesmen sumatif tidak dapat dihapus karena sudah memiliki ${used.length} nilai siswa.`
    };
  }
  return { inUse: false, references: [] };
}

/**
 * Provides clear user-facing verification notice for Firebase Auth status.
 */
export function getAuthVerificationNotice(
  authContext?: AuthSessionContext | null,
  user?: User | null
): { isVerified: boolean; label: string; detail?: string } {
  if (!authContext) {
    return {
      isVerified: false,
      label: 'Sesi Lokal Aktif',
      detail: 'Masuk ulang untuk memperbarui token verifikasi Firebase Authentication.'
    };
  }
  if (authContext.verificationStatus === 'verified_password' || authContext.verificationStatus === 'verified_google') {
    return {
      isVerified: true,
      label: 'Terverifikasi Firebase Auth',
      detail: `UID: ${authContext.firebaseUid || '-'}`
    };
  }
  return {
    isVerified: false,
    label: 'Sesi Fallback Anonim (Terbatas)',
    detail:
      authContext.notice ||
      (user?.password && user.password.length < 6
        ? 'Kata sandi akun kurang dari 6 karakter sehingga belum dapat didaftarkan ke Firebase Auth Email/Password.'
        : 'Sesi menggunakan fallback anonim. Tindakan sensitif dibatasi sesuai otoritas akun yang terverifikasi.')
  };
}

export function isObjectiveVisibleInContext(
  tp: LearningObjective,
  params: {
    subjectId: string;
    gradeLevel?: string;
    classId?: string;
    semester: 'Ganjil' | 'Genap';
    academicYear?: string;
  }
): boolean {
  if (!tp || tp.subjectId !== params.subjectId) return false;
  if (tp.semester !== params.semester) return false;
  if (params.gradeLevel && String(tp.gradeLevel) !== String(params.gradeLevel)) return false;
  if (tp.classId && params.classId && tp.classId !== params.classId) return false;
  if (tp.academicYear && params.academicYear && tp.academicYear !== params.academicYear) return false;
  return true;
}

export type { Student, Subject };
