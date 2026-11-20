import React, { useState, useEffect } from 'react';
import {
  loadDatabase,
  saveDatabase,
  logActivity,
  syncHomeroomAssignment,
  syncUsersWithTeachers,
  sanitizeTeachingAssignments,
  partialPurgeMasterData,
  AppDatabase,
  calculatePredicate
} from './services/storage';
import {
  SchoolProfile,
  Teacher,
  Student,
  Classroom,
  Subject,
  Curriculum,
  LearningObjective,
  AssessmentScore,
  Attendance,
  Extracurricular,
  StudentExtracurricular,
  HomeroomNote,
  User,
  AuditLog,
  AppNotification,
  DutyMode,
  TeachingAssignment,
  FormativeAssessment,
  SummativeAssessment,
  KKTPConfig,
  SubjectFinalScoreConfig,
  AcademicYearPeriod,
  StudentMutation,
  StudentAchievement,
  KokurikulerDimensionMaster,
  KokurikulerThemeMaster,
  KokurikulerGroup,
  KokurikulerActivity,
  KokurikulerScore,
  KokurikulerDescription,
  AssessmentPolicyConfig,
  LearningChapter,
  SummativeAssessmentPlan,
  AuthSessionContext,
  SaveOperationResult
} from './types/erapor';
import { Calendar, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import {
  getAvailableAcademicYears,
  getCurrentSystemAcademicYear,
  getDefaultReportDate
} from './utils/academicYear';
import { sortClassrooms } from './utils/classroomSort';
import {
  SubjectDescriptionBank,
  mergeDescriptionBankWithDefaults
} from './utils/descriptionBank';
import {
  DEFAULT_ASSESSMENT_POLICY,
  getSummativeTpIds,
  isPeriodInputLocked,
  normalizeAssessmentPolicy
} from './utils/tpAnalysisAndDescription';
import {
  CODING_SUBJECT_ID,
  ensureElectiveCodingSubject,
  isCodingSubject
} from './utils/electiveSubjectHelper';
import { resolveTeacherForUser } from './utils/teacherAssignmentHelper';
import {
  authorizeSubjectAssessmentWrite,
  authorizeSensitiveAdminAction,
  checkLegacyScoreProtection,
  checkLearningObjectiveInUse,
  checkLearningChapterInUse,
  checkSummativePlanInUse
} from './utils/authorizationGuard';
import {
  aggregateChapterScoresFromSummatives,
  buildDeterministicScoreId,
  computeStudentReportScore,
  filterChaptersForContext,
  getEffectiveSasScore,
  resolveSchoolWeights
} from './utils/assessmentCalculation';
import { Header } from './components/layout/Header';
import { Sidebar, MenuId } from './components/layout/Sidebar';
import {
  queueAutoSyncToFirestore,
  syncAllToFirestore,
  fetchFromFirestore,
  wipeFirestoreMasterCollections,
  testFirestoreConnection,
  subscribeToSyncState,
  listenToFirestoreRealtime,
  saveScoresToFirestoreDirect,
  saveBatchToFirestoreDirect,
  saveKokurikulerScoresDirect,
  saveKokurikulerDescriptionsDirect,
  saveAssessmentPolicyDirect,
  saveDescriptionBankDirect,
  deleteDocFromFirestore,
  surgicalSync,
  reconnectToCloud,
  CloudSyncState,
  isEntityDeleted,
  addDeletedEntityId,
  removeDeletedEntityId,
  sanitizeDocId
} from './services/firebaseSync';

// Views
import { DashboardView } from './views/DashboardView';
import { DataReferensiView } from './views/DataReferensiView';
import { DataSekolahView } from './views/DataSekolahView';
import { DataGuruView } from './views/DataGuruView';
import { DataSiswaView } from './views/DataSiswaView';
import { RombelView } from './views/RombelView';
import { DataMapelView } from './views/DataMapelView';
import { DataKurikulumView } from './views/DataKurikulumView';
import { PenugasanGuruView } from './views/PenugasanGuruView';
import { DataPembelajaranView } from './views/DataPembelajaranView';
import { DataEkskulView } from './views/DataEkskulView';
import { DataAbsensiView } from './views/DataAbsensiView';
import { InputNilaiView } from './views/InputNilaiView';
import { PengolahanNilaiView } from './views/PengolahanNilaiView';
import { DeskripsiNilaiView } from './views/DeskripsiNilaiView';
import { RekapNilaiMapelView } from './views/RekapNilaiMapelView';
import { RekapitulasiNilaiView } from './views/RekapitulasiNilaiView';
import { LegerNilaiView } from './views/LegerNilaiView';
import { PengolahanRaporView } from './views/PengolahanRaporView';
import { KenaikanKelasView } from './views/KenaikanKelasView';
import { CetakRaporView } from './views/CetakRaporView';
import { LaporanSekolahView } from './views/LaporanSekolahView';
import { ImporEksporDapodikView } from './views/ImporEksporDapodikView';
import { ManajemenWaliKelasView } from './views/ManajemenWaliKelasView';
import { ManajemenPenggunaView } from './views/ManajemenPenggunaView';
import { PengaturanAplikasiView } from './views/PengaturanAplikasiView';
import { PengaturanBobotNilaiView } from './views/PengaturanBobotNilaiView';
import { ManajemenTahunAjaranView } from './views/ManajemenTahunAjaranView';
import { BukuIndukView } from './views/BukuIndukView';
import { TranskripNilaiView } from './views/TranskripNilaiView';
import { LoginView } from './views/LoginView';
import {
  getSavedSessionUserId,
  getSavedAuthSessionContext,
  logoutUser
} from './services/authService';
import { SecurityAccessDenied } from './components/SecurityAccessDenied';

// Kurikulum Merdeka 2025 Views
import { KKTPConfigView } from './views/KKTPConfigView';
import { AsesmenFormatifView } from './views/AsesmenFormatifView';
import { AsesmenSumatifView } from './views/AsesmenSumatifView';
import { PengolahanNilaiTabelView } from './views/PengolahanNilaiTabelView';
import { PengolahanNilaiAkhirView } from './views/PengolahanNilaiAkhirView';

// Modul Penilaian Kokurikuler (e-Rapor SMP Kemendikdasmen 2025.2 / BSKAP 058/H/KR/2025)
import { KokurikulerDataView } from './views/kokurikuler/KokurikulerDataView';
import { KokurikulerNilaiView } from './views/kokurikuler/KokurikulerNilaiView';
import { KokurikulerLaporanView } from './views/kokurikuler/KokurikulerLaporanView';


const EMPTY_ARRAY: any[] = [];

export default function App() {
  const [db, setDb] = useState<AppDatabase>(() => {
    const loaded = loadDatabase();
    loaded.classrooms = sortClassrooms(loaded.classrooms);
    return loaded;
  });
  const [activeMenu, setActiveMenu] = useState<MenuId>(() => {
    try {
      const saved = localStorage.getItem('erapor_active_menu');
      if (saved) return saved as MenuId;
    } catch {}
    return 'dashboard';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [targetPrintStudentId, setTargetPrintStudentId] = useState<string | undefined>(undefined);
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);

  // Authentication & Active User Session
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const savedUserId = getSavedSessionUserId();
    if (!savedUserId) return false;
    const loaded = loadDatabase();
    const found = (loaded.users || []).find((u) => u.id === savedUserId);
    return Boolean(found && found.status !== 'inactive');
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUserId = getSavedSessionUserId();
      if (savedUserId) {
        const found = db.users.find((u) => u.id === savedUserId);
        if (found && found.status !== 'inactive') return found;
      }
    } catch {}
    return null;
  });

  const [authContext, setAuthContext] = useState<AuthSessionContext | null>(() =>
    getSavedAuthSessionContext()
  );
  const [lastSaveStatus, setLastSaveStatus] = useState<SaveOperationResult | null>(null);
  const [appAlertBanner, setAppAlertBanner] = useState<{
    type: 'error' | 'warning' | 'success';
    text: string;
  } | null>(null);

  const pushAlert = (type: 'error' | 'warning' | 'success', text: string) => {
    setAppAlertBanner({ type, text });
  };

  // Dual duty mode (Wali Kelas vs Guru Mata Pelajaran)
  const [dutyMode, setDutyMode] = useState<DutyMode>(() => {
    try {
      const savedDuty = localStorage.getItem('erapor_active_duty_mode');
      if (savedDuty === 'walikelas' || savedDuty === 'guru') return savedDuty as DutyMode;
    } catch {}
    return currentUser?.role === 'walikelas' ? 'walikelas' : 'guru';
  });

  const handleLoginSuccess = (user: User, semesterChoice?: string) => {
    setCurrentUser(user);
    setAuthContext(getSavedAuthSessionContext());
    setIsAuthenticated(true);
    const newDuty: DutyMode = user.role === 'walikelas' ? 'walikelas' : 'guru';
    setDutyMode(newDuty);
    try {
      localStorage.setItem('erapor_active_duty_mode', newDuty);
    } catch {}
    setActiveMenu('dashboard');

    if (semesterChoice) {
      const parts = semesterChoice.split(' ');
      const yr = parts[0];
      const sem = parts[1] as 'Ganjil' | 'Genap';
      if (yr && (sem === 'Ganjil' || sem === 'Genap')) {
        if (db.schoolProfile.activeAcademicYear !== yr || db.schoolProfile.activeSemester !== sem) {
          updateDbAndSave((prev) => ({
            ...prev,
            schoolProfile: {
              ...prev.schoolProfile,
              activeAcademicYear: yr,
              activeSemester: sem
            }
          }));
        }
      }
    }
  };

  const handleLogout = async () => {
    await logoutUser(currentUser);
    setIsAuthenticated(false);
    setCurrentUser(null);
    setAuthContext(null);
    setLastSaveStatus(null);
    setAppAlertBanner(null);
    setActiveMenu('dashboard');
  };

  const handleSwitchUser = (user: User) => {
    setCurrentUser(user);
    const newDuty: DutyMode = user.role === 'walikelas' ? 'walikelas' : 'guru';
    setDutyMode(newDuty);
    try {
      localStorage.setItem('erapor_active_duty_mode', newDuty);
    } catch {}
  };

  const handleToggleDutyMode = (mode: DutyMode) => {
    setDutyMode(mode);
    try {
      localStorage.setItem('erapor_active_duty_mode', mode);
    } catch {}
  };

  const handleSelectMenu = (menu: MenuId) => {
    setActiveMenu(menu);
    try {
      localStorage.setItem('erapor_active_menu', menu);
    } catch {}
  };

  // Find associated teacher profile for current user using standardized helper (zero hardcoded names)
  const currentTeacher = React.useMemo(() => {
    return resolveTeacherForUser(currentUser, db.teachers);
  }, [db.teachers, currentUser]);

  const homeroomClass = React.useMemo(() => {
    if (!currentUser) return undefined;
    const cId = currentUser.classId || currentTeacher?.homeroomClassId;
    if (cId) return db.classrooms.find((c) => c.id === cId);
    if (currentTeacher?.id) {
      return db.classrooms.find((c) => c.homeroomTeacherId === currentTeacher.id);
    }
    return undefined;
  }, [currentUser, currentTeacher, db.classrooms]);

  const hasHomeroomDuty = Boolean(currentUser?.classId || currentTeacher?.isHomeroom || homeroomClass);
  const hasTeachingDuties = React.useMemo(() => {
    if (!currentTeacher) return false;
    const hasAssignments = (db.teachingAssignments || []).some(
      (ta) => ta.teacherId === currentTeacher.id && ta.status !== 'inactive'
    );
    const hasMapel = currentTeacher.subjectsTaught && currentTeacher.subjectsTaught.length > 0;
    return Boolean(hasAssignments || hasMapel);
  }, [currentTeacher, db.teachingAssignments]);

  const canSwitchDutyMode = Boolean(
    hasHomeroomDuty && hasTeachingDuties && currentUser && currentUser.role !== 'admin' && currentUser.role !== 'kepsek'
  );

  // Effective User with active role depending on current duty mode
  const effectiveUser: User = React.useMemo(() => {
    if (!currentUser) {
      return db.users[0] || {
        id: 'guest',
        username: 'guest',
        name: 'Tamu',
        role: 'guru',
        status: 'inactive'
      };
    }
    let base = currentUser;
    // Auto-link teacherId and homeroom classId if missing on user record
    if (!base.teacherId && currentTeacher) {
      base = { ...base, teacherId: currentTeacher.id };
    }
    if (!base.classId && homeroomClass?.id) {
      base = { ...base, classId: homeroomClass.id };
    }

    if (!canSwitchDutyMode) return base;
    return {
      ...base,
      role: dutyMode,
      activeDutyMode: dutyMode
    };
  }, [canSwitchDutyMode, currentUser, dutyMode, currentTeacher, homeroomClass, db.users]);

  // Modal for quick academic year switch
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);

  // Cloud Firebase Sync State
  const [cloudSyncState, setCloudSyncState] = useState<CloudSyncState>({
    status: 'connected',
    lastSyncTime: null,
    message: 'Cloud Firebase Aktif',
    isOnline: true
  });

  useEffect(() => {
    const unsubscribeSync = subscribeToSyncState(setCloudSyncState);

    // Subscribe to Firestore real-time listener for All Core Data
    const unsubscribeRealtime = listenToFirestoreRealtime((payload) => {
      setDb((prev) => {
        let changed = false;
        const updated = { ...prev };

        const mergeList = (key: keyof AppDatabase, incoming: any[] | undefined) => {
          if (incoming === undefined) return;
          const currentList = ((prev[key] as any[]) || []).slice();

          // Filter incoming by tombstone list so deleted items are never revived
          const validIncoming = incoming.filter((item) => {
            if (!item || !item.id) return false;
            if (isEntityDeleted(key as string, item.id)) return false;
            if (key === 'learningObjectives' && isEntityDeleted('assessments', item.id)) return false;
            if (key === 'learningChapters' && isEntityDeleted('summative_chapters', item.id)) return false;
            if (key === 'summativePlans' && isEntityDeleted('summative_plans', item.id)) return false;
            return true;
          });

          if (key === 'classrooms') {
            const sorted = sortClassrooms(validIncoming);
            if (JSON.stringify(currentList) !== JSON.stringify(sorted)) {
              (updated as any).classrooms = sorted;
              changed = true;
            }
            return;
          }

          if (key === 'finalScoreConfigs') {
            if (!updated.finalScoreConfigs) updated.finalScoreConfigs = [];
            validIncoming.forEach((fsc) => {
              if (!fsc) return;
              const idx = updated.finalScoreConfigs.findIndex(
                (c) => c && c.subjectId === fsc.subjectId && c.classId === fsc.classId
              );
              if (idx >= 0) {
                if (JSON.stringify(updated.finalScoreConfigs[idx]) !== JSON.stringify(fsc)) {
                  updated.finalScoreConfigs[idx] = fsc;
                  changed = true;
                }
              } else {
                updated.finalScoreConfigs.push(fsc);
                changed = true;
              }
            });
            return;
          }

          if (validIncoming.length === 0 && currentList.length === 0) return;

          // For all other collections, Cloud Firestore is the authority
          if (JSON.stringify(currentList) !== JSON.stringify(validIncoming)) {
            (updated as any)[key] = validIncoming;
            changed = true;
          }
        };

        // Standard Collections
        mergeList('scores', payload.scores);
        mergeList('notifications', payload.notifications);
        mergeList('learningChapters', payload.learningChapters);
        mergeList('summativePlans', payload.summativePlans);
        mergeList('formativeAssessments', payload.formativeAssessments);
        mergeList('summativeAssessments', payload.summativeAssessments);
        mergeList('kktpConfigs', payload.kktpConfigs);
        mergeList('finalScoreConfigs', payload.finalScoreConfigs);
        
        // Master Data Collections
        mergeList('students', payload.students);
        mergeList('teachers', payload.teachers);
        mergeList('classrooms', payload.classrooms);
        if (payload.subjects !== undefined) {
          const validIncomingSubjects = (payload.subjects || []).filter(
            (item) => item && item.id && !isEntityDeleted('subjects', item.id)
          );
          const ensuredSubjects = ensureElectiveCodingSubject(
            validIncomingSubjects,
            (id) => isEntityDeleted('subjects', id)
          );
          if (JSON.stringify(prev.subjects) !== JSON.stringify(ensuredSubjects)) {
            updated.subjects = ensuredSubjects;
            changed = true;
          }
        }
        mergeList('teachingAssignments', payload.teachingAssignments);
        mergeList('learningObjectives', payload.learningObjectives);
        mergeList('curricula', payload.curricula);
        mergeList('users', payload.users);
        mergeList('attendance', payload.attendance);
        mergeList('homeroomNotes', payload.homeroomNotes);
        
        if (payload.schoolProfile && payload.schoolProfile.length > 0) {
          const remoteSchool = payload.schoolProfile[0];
          if (JSON.stringify(prev.schoolProfile) !== JSON.stringify(remoteSchool)) {
            updated.schoolProfile = remoteSchool;
            changed = true;
          }
        }

        mergeList('extracurriculars', payload.extracurriculars);
        mergeList('studentExtracurriculars', payload.studentExtracurriculars);
        mergeList('academicYears', payload.academicYears);
        mergeList('studentMutations', payload.studentMutations);
        mergeList('studentAchievements', payload.studentAchievements);
        mergeList('kokurikulerProjects', payload.kokurikulerProjects);
        mergeList('kokurikulerDimensions', payload.kokurikulerDimensions);
        mergeList('kokurikulerThemes', payload.kokurikulerThemes);
        mergeList('kokurikulerGroups', payload.kokurikulerGroups);
        mergeList('kokurikulerActivities', payload.kokurikulerActivities);
        mergeList('kokurikulerScores', payload.kokurikulerScores);
        mergeList('kokurikulerDescriptions', payload.kokurikulerDescriptions);

        if (payload.descriptionBank && payload.descriptionBank.length > 0) {
          const mergedBank = mergeDescriptionBankWithDefaults(payload.descriptionBank);
          if (JSON.stringify(prev.descriptionBank) !== JSON.stringify(mergedBank)) {
            updated.descriptionBank = mergedBank;
            changed = true;
          }
        }

        if (payload.assessmentPolicy) {
          const normalizedPolicy = normalizeAssessmentPolicy(payload.assessmentPolicy);
          if (JSON.stringify(prev.assessmentPolicy) !== JSON.stringify(normalizedPolicy)) {
            updated.assessmentPolicy = normalizedPolicy;
            changed = true;
          }
        }

        if (changed) {
          const finalDb = syncUsersWithTeachers(updated);
          saveDatabase(finalDb);
          return finalDb;
        }
        return prev;
      });
    });

    // Initial check & auto-sync to Cloud Firestore on boot
    const initCloud = async () => {
      try {
        const conn = await testFirestoreConnection();
        if (conn.success) {
          const remoteData = await fetchFromFirestore();
          if (remoteData && Object.keys(remoteData).length > 0) {
            setDb((prev) => {
              // Filter out any tombstoned entities so deleted items never get resurrected on refresh
              const cleanRemoteTeachers = (remoteData.teachers || []).filter(
                (t) => t && t.id && !isEntityDeleted('teachers', t.id)
              );
              const cleanRemoteStudents = (remoteData.students || []).filter(
                (s) => s && s.id && !isEntityDeleted('students', s.id)
              );
              const cleanRemoteClassrooms = (remoteData.classrooms || []).filter(
                (c) => c && c.id && !isEntityDeleted('classrooms', c.id)
              );
              const cleanRemoteSubjects = (remoteData.subjects || []).filter(
                (sub) => sub && sub.id && !isEntityDeleted('subjects', sub.id)
              );
              const cleanRemoteObjectives = (remoteData.learningObjectives || []).filter(
                (tp) =>
                  tp &&
                  tp.id &&
                  !isEntityDeleted('assessments', tp.id) &&
                  !isEntityDeleted('learningObjectives', tp.id)
              );

              // Background delete of stale tombstoned items still lingering in Firestore
              (remoteData.teachers || []).forEach((t) => {
                if (t && t.id && isEntityDeleted('teachers', t.id)) {
                  deleteDocFromFirestore('teachers', t.id).catch(() => {});
                }
              });
              (remoteData.students || []).forEach((s) => {
                if (s && s.id && isEntityDeleted('students', s.id)) {
                  deleteDocFromFirestore('students', s.id).catch(() => {});
                }
              });
              (remoteData.classrooms || []).forEach((c) => {
                if (c && c.id && isEntityDeleted('classrooms', c.id)) {
                  deleteDocFromFirestore('classrooms', c.id).catch(() => {});
                }
              });
              (remoteData.subjects || []).forEach((sub) => {
                if (sub && sub.id && isEntityDeleted('subjects', sub.id)) {
                  deleteDocFromFirestore('subjects', sub.id).catch(() => {});
                }
              });
              (remoteData.learningObjectives || []).forEach((tp) => {
                if (
                  tp &&
                  tp.id &&
                  (isEntityDeleted('assessments', tp.id) || isEntityDeleted('learningObjectives', tp.id))
                ) {
                  deleteDocFromFirestore('assessments', tp.id).catch(() => {});
                }
              });

              const merged: AppDatabase = {
                ...prev,
                schoolProfile: remoteData.schoolProfile || prev.schoolProfile,
                students: remoteData.students !== undefined ? cleanRemoteStudents : prev.students.filter(s => !isEntityDeleted('students', s.id)),
                teachers: remoteData.teachers !== undefined ? cleanRemoteTeachers : prev.teachers.filter(t => !isEntityDeleted('teachers', t.id)),
                classrooms: sortClassrooms(
                  remoteData.classrooms !== undefined ? cleanRemoteClassrooms : prev.classrooms.filter(c => !isEntityDeleted('classrooms', c.id))
                ),
                subjects: ensureElectiveCodingSubject(
                  remoteData.subjects !== undefined
                    ? cleanRemoteSubjects
                    : prev.subjects.filter((sub) => !isEntityDeleted('subjects', sub.id)),
                  (id) => isEntityDeleted('subjects', id)
                ),
                curricula: remoteData.curricula && remoteData.curricula.length > 0 ? remoteData.curricula : prev.curricula,
                learningObjectives:
                  remoteData.learningObjectives !== undefined
                    ? cleanRemoteObjectives
                    : prev.learningObjectives.filter(
                        (tp) =>
                          tp &&
                          tp.id &&
                          !isEntityDeleted('assessments', tp.id) &&
                          !isEntityDeleted('learningObjectives', tp.id)
                      ),
                scores: remoteData.scores !== undefined ? remoteData.scores : prev.scores,
                attendance: remoteData.attendance !== undefined ? remoteData.attendance : prev.attendance,
                homeroomNotes: remoteData.homeroomNotes !== undefined ? remoteData.homeroomNotes : prev.homeroomNotes,
                teachingAssignments: (remoteData.teachingAssignments !== undefined ? remoteData.teachingAssignments : (prev.teachingAssignments || [])).filter(
                  (ta) => ta && !isEntityDeleted('teaching_assignments', ta.id) && !isEntityDeleted('teachers', ta.teacherId)
                ),
                users: (remoteData.users !== undefined ? remoteData.users : (prev.users || [])).filter(
                  (u) => u && !isEntityDeleted('users', u.id) && (!u.teacherId || !isEntityDeleted('teachers', u.teacherId))
                ),
                formativeAssessments: remoteData.formativeAssessments !== undefined ? remoteData.formativeAssessments : prev.formativeAssessments,
                summativeAssessments: remoteData.summativeAssessments !== undefined ? remoteData.summativeAssessments : prev.summativeAssessments,
                learningChapters: (remoteData.learningChapters !== undefined
                  ? remoteData.learningChapters
                  : (prev.learningChapters || [])
                ).filter(
                  (ch) =>
                    ch &&
                    ch.id &&
                    !isEntityDeleted('summative_chapters', ch.id) &&
                    !isEntityDeleted('learningChapters', ch.id)
                ),
                summativePlans: (remoteData.summativePlans !== undefined
                  ? remoteData.summativePlans
                  : (prev.summativePlans || [])
                ).filter(
                  (pl) =>
                    pl &&
                    pl.id &&
                    !isEntityDeleted('summative_plans', pl.id) &&
                    !isEntityDeleted('summativePlans', pl.id)
                ),
                kktpConfigs: remoteData.kktpConfigs !== undefined ? remoteData.kktpConfigs : prev.kktpConfigs,
                finalScoreConfigs: remoteData.finalScoreConfigs !== undefined ? remoteData.finalScoreConfigs : prev.finalScoreConfigs,
                extracurriculars: remoteData.extracurriculars !== undefined ? remoteData.extracurriculars : prev.extracurriculars,
                studentExtracurriculars: (
                  remoteData.studentExtracurriculars !== undefined
                    ? remoteData.studentExtracurriculars
                    : prev.studentExtracurriculars
                ).filter((se) => se && se.id && !isEntityDeleted('student_extracurriculars', se.id)),
                kokurikulerDimensions:
                  remoteData.kokurikulerDimensions && remoteData.kokurikulerDimensions.length > 0
                    ? remoteData.kokurikulerDimensions
                    : prev.kokurikulerDimensions,
                kokurikulerThemes:
                  remoteData.kokurikulerThemes && remoteData.kokurikulerThemes.length > 0
                    ? remoteData.kokurikulerThemes
                    : prev.kokurikulerThemes,
                kokurikulerGroups: (
                  remoteData.kokurikulerGroups !== undefined ? remoteData.kokurikulerGroups : (prev.kokurikulerGroups || [])
                ).filter((g) => g && g.id && !isEntityDeleted('kokurikulerGroups', g.id)),
                kokurikulerActivities: (
                  remoteData.kokurikulerActivities !== undefined ? remoteData.kokurikulerActivities : (prev.kokurikulerActivities || [])
                ).filter((a) => a && a.id && !isEntityDeleted('kokurikulerActivities', a.id)),
                kokurikulerScores:
                  remoteData.kokurikulerScores !== undefined ? remoteData.kokurikulerScores : prev.kokurikulerScores,
                kokurikulerDescriptions:
                  remoteData.kokurikulerDescriptions !== undefined
                    ? remoteData.kokurikulerDescriptions
                    : prev.kokurikulerDescriptions,
                descriptionBank: mergeDescriptionBankWithDefaults(
                  remoteData.descriptionBank && remoteData.descriptionBank.length > 0
                    ? remoteData.descriptionBank
                    : prev.descriptionBank
                ),
                assessmentPolicy: normalizeAssessmentPolicy(
                  remoteData.assessmentPolicy || prev.assessmentPolicy
                )
              };
              const cleaned = sanitizeTeachingAssignments(syncUsersWithTeachers(merged));

              // Remove orphaned users from Firestore so they never reappear on reload
              if (remoteData.users) {
                const validUserIds = new Set(cleaned.users.map((u: User) => u.id));
                remoteData.users.forEach((ru: User) => {
                  if (!validUserIds.has(ru.id)) {
                    deleteDocFromFirestore('users', ru.id).catch(() => {});
                  }
                });
              }

              // Update currentUser if the user account was deleted
              setCurrentUser((curr: User | null) => {
                if (!curr) return null;
                const exists = cleaned.users.some((u: User) => u.id === curr.id);
                if (!exists) {
                  return cleaned.users.find((u: User) => u.role === 'admin') || cleaned.users[0] || null;
                }
                return curr;
              });

              saveDatabase(cleaned);

              // Ensure Koding dan Kecerdasan Artifisial subject is persisted in Firestore once if not yet present
              const remoteHasCoding = (remoteData.subjects || []).some((sub) => isCodingSubject(sub));
              if (!remoteHasCoding && !isEntityDeleted('subjects', CODING_SUBJECT_ID)) {
                const codingSubject = cleaned.subjects.find((sub) => sub.id === CODING_SUBJECT_ID);
                if (codingSubject) {
                  surgicalSync('subjects', codingSubject.id, codingSubject).catch(() => {});
                }
              }

              return cleaned;
            });
          } else {
            // If Cloud is completely blank, queue auto sync so initial data is stored in Firestore
            queueAutoSyncToFirestore(db, 3000);
          }
        }
      } catch (err) {
        console.warn('Initial cloud sync notice:', err);
      }
    };

    initCloud();
    return () => {
      unsubscribeSync();
      unsubscribeRealtime();
    };
  }, []);

  // Persist DB helper (Instant local update + targeted or debounced Cloud sync)
  const updateDbAndSave = (
    updater: (prev: AppDatabase) => AppDatabase, 
    skipCloudSync = false,
    syncHint?: { collection: string; id: string; data: any }
  ) => {
    setDb((prev) => {
      const next = updater(prev);
      saveDatabase(next);
      
      if (!skipCloudSync) {
        if (syncHint) {
          // 1. Surgical sync: immediate push to Cloud Firestore
          surgicalSync(syncHint.collection, syncHint.id, syncHint.data).catch(() => {});
          // 2. Also schedule background sync so all collections stay perfectly consistent
          queueAutoSyncToFirestore(next, 3000);
        } else {
          // Fallback: full sync (debounced)
          queueAutoSyncToFirestore(next);
        }
      }
      return next;
    });
  };

  const handleManualSyncToCloud = async () => {
    try {
      setCloudSyncState(prev => ({ ...prev, status: 'syncing', message: 'Sinkronisasi data...' }));
      const remoteData = await fetchFromFirestore();
      if (remoteData) {
        handleApplyRemoteData(remoteData);
      }
      await syncAllToFirestore(db, currentUser || undefined);
    } catch (err) {
      console.error('Manual sync failed:', err);
    }
  };

  const handleReconnect = async () => {
    await reconnectToCloud();
    await handleManualSyncToCloud();
  };

  // Handlers for School Profile
  const handleSaveSchool = (updated: SchoolProfile) => {
    updateDbAndSave(
      (prev) => ({ ...prev, schoolProfile: updated }),
      false,
      { collection: 'schools', id: 'smpn1rangsang', data: updated }
    );
    logActivity(currentUser, 'Ubah Profil Sekolah', 'Memperbarui informasi identitas satuan pendidikan.');
  };

  // Handlers for Teachers
  const handleSaveTeacher = (teacher: Teacher) => {
    removeDeletedEntityId('teachers', teacher.id);
    updateDbAndSave((prev) => {
      const idx = prev.teachers.findIndex((t) => t.id === teacher.id);
      let newTeachers = [...prev.teachers];
      if (idx >= 0) {
        newTeachers[idx] = teacher;
      } else {
        newTeachers.push(teacher);
      }

      // Sync homeroom class assignment in classrooms if applicable
      let updatedClassrooms = [...prev.classrooms];
      if (teacher.isHomeroom && teacher.homeroomClassId) {
        updatedClassrooms = updatedClassrooms.map((c) => {
          if (c.id === teacher.homeroomClassId) {
            return { ...c, homeroomTeacherId: teacher.id };
          }
          if (c.homeroomTeacherId === teacher.id && c.id !== teacher.homeroomClassId) {
            return { ...c, homeroomTeacherId: '' };
          }
          return c;
        });
      } else if (!teacher.isHomeroom) {
        updatedClassrooms = updatedClassrooms.map((c) => {
          if (c.homeroomTeacherId === teacher.id) {
            return { ...c, homeroomTeacherId: '' };
          }
          return c;
        });
      }

      return syncUsersWithTeachers({ ...prev, teachers: newTeachers, classrooms: updatedClassrooms });
    }, false, { collection: 'teachers', id: teacher.id, data: teacher });
    logActivity(currentUser, 'Simpan Guru', `Menyimpan data guru: ${teacher.name}`);
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    addDeletedEntityId('teachers', teacherId);
    const teacherToDelete = db.teachers.find((t) => t.id === teacherId);
    
    // Find associated user accounts (by teacherId, nip, or name matching)
    const usersToDelete = db.users.filter(
      (u) =>
        u.teacherId === teacherId ||
        (teacherToDelete && u.nip && u.nip === teacherToDelete.nip) ||
        (teacherToDelete && u.name && u.name.toLowerCase().trim() === teacherToDelete.name.toLowerCase().trim())
    );

    // Record tombstones and delete associated user documents from Firestore immediately
    usersToDelete.forEach((u) => {
      addDeletedEntityId('users', u.id);
      deleteDocFromFirestore('users', u.id).catch(() => {});
    });

    // Check if the currently logged-in user is the one being deleted
    const isCurrentDeleted = currentUser ? (
      currentUser.teacherId === teacherId ||
      usersToDelete.some((u) => u.id === currentUser.id) ||
      (teacherToDelete && currentUser.nip && currentUser.nip === teacherToDelete.nip) ||
      (teacherToDelete && currentUser.name.toLowerCase().trim() === teacherToDelete.name.toLowerCase().trim())
    ) : false;

    if (isCurrentDeleted) {
      const fallbackAdmin = db.users.find((u) => u.role === 'admin' && !usersToDelete.some((del) => del.id === u.id)) || {
        id: 'usr-admin-1',
        username: 'admin',
        name: 'Administrator Rapor',
        role: 'admin',
        isActive: true
      };
      setCurrentUser(fallbackAdmin as User);
    }

    const assignmentsToDelete = (db.teachingAssignments || []).filter((ta) => ta.teacherId === teacherId);
    assignmentsToDelete.forEach((ta) => {
      addDeletedEntityId('teaching_assignments', ta.id);
      deleteDocFromFirestore('teaching_assignments', ta.id).catch(() => {});
    });

    // Update local state and persist to localStorage
    updateDbAndSave((prev) =>
      syncUsersWithTeachers({
        ...prev,
        teachers: prev.teachers.filter((t) => t.id !== teacherId),
        teachingAssignments: (prev.teachingAssignments || []).filter((ta) => ta.teacherId !== teacherId),
        users: prev.users.filter((u) => !usersToDelete.some((del) => del.id === u.id))
      }),
      true
    );

    // Explicitly delete teacher from Cloud Firestore
    await deleteDocFromFirestore('teachers', teacherId);
    logActivity(currentUser, 'Hapus Guru & Hak Akses', `Menghapus guru ${teacherToDelete?.name || teacherId} dan seluruh akun hak akses terkait.`);
  };

  // Handlers for Students
  const handleSaveStudent = (student: Student) => {
    let studentToSave = student;
    if (effectiveUser.role === 'walikelas') {
      const authorizedClassId = effectiveUser.classId || homeroomClass?.id;
      const existingStudent = db.students.find((s) => s.id === student.id);
      if (!existingStudent || !authorizedClassId || existingStudent.classId !== authorizedClassId) {
        pushAlert(
          'error',
          'Akses ditolak: Wali Kelas hanya dapat mengedit data siswa di kelas perwaliannya.'
        );
        return;
      }
      // Preserve rombel & status when edited by Wali Kelas
      studentToSave = {
        ...student,
        classId: existingStudent.classId,
        status: existingStudent.status
      };
    } else if (effectiveUser.role !== 'admin') {
      pushAlert('error', 'Akses ditolak: Anda tidak memiliki hak akses untuk mengubah data siswa.');
      return;
    }

    removeDeletedEntityId('students', studentToSave.id);
    updateDbAndSave((prev) => {
      const idx = prev.students.findIndex((s) => s.id === studentToSave.id);
      let newStudents = [...prev.students];
      if (idx >= 0) {
        newStudents[idx] = studentToSave;
      } else {
        newStudents.push(studentToSave);
      }
      return { ...prev, students: newStudents };
    }, false, { collection: 'students', id: studentToSave.id, data: studentToSave });
    logActivity(
      currentUser,
      'Simpan Siswa',
      `Menyimpan data peserta didik: ${studentToSave.name}${effectiveUser.role === 'walikelas' ? ' (oleh Wali Kelas)' : ''}`
    );
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (effectiveUser.role !== 'admin') {
      pushAlert('error', 'Akses ditolak: Hanya Administrator yang dapat menghapus data siswa.');
      return;
    }
    addDeletedEntityId('students', studentId);
    updateDbAndSave((prev) => ({
      ...prev,
      students: prev.students.filter((s) => s.id !== studentId),
      scores: prev.scores.filter((sc) => sc.studentId !== studentId)
    }), true);
    await deleteDocFromFirestore('students', studentId);
    logActivity(currentUser, 'Hapus Siswa', `Menghapus data siswa ID: ${studentId}`);
  };

  const handleImportStudents = (newStudents: Student[]) => {
    newStudents.forEach((s) => removeDeletedEntityId('students', s.id));
    updateDbAndSave((prev) => ({
      ...prev,
      students: [...prev.students, ...newStudents]
    }));
    logActivity(currentUser, 'Impor Siswa Dapodik', `Berhasil mengimpor ${newStudents.length} siswa baru.`);
  };

  // Handlers for Classrooms
  const handleSaveClassroom = (classroom: Classroom) => {
    removeDeletedEntityId('classrooms', classroom.id);
    updateDbAndSave((prev) => {
      const idx = prev.classrooms.findIndex((c) => c.id === classroom.id);
      let newCls = [...prev.classrooms];
      if (idx >= 0) {
        newCls[idx] = classroom;
      } else {
        newCls.push(classroom);
      }
      return { ...prev, classrooms: sortClassrooms(newCls) };
    }, false, { collection: 'classrooms', id: classroom.id, data: classroom });
    logActivity(currentUser, 'Simpan Rombel', `Menyimpan rombel: ${classroom.name}`);
  };

  const handleDeleteClassroom = async (classroomId: string) => {
    addDeletedEntityId('classrooms', classroomId);
    updateDbAndSave((prev) => ({
      ...prev,
      classrooms: prev.classrooms.filter((c) => c.id !== classroomId)
    }), true);
    await deleteDocFromFirestore('classrooms', classroomId);
    logActivity(currentUser, 'Hapus Rombel', `Menghapus rombel ID: ${classroomId}`);
  };

  // Handlers for Subjects
  const handleSaveSubject = (subject: Subject) => {
    removeDeletedEntityId('subjects', subject.id);
    updateDbAndSave((prev) => {
      const idx = prev.subjects.findIndex((s) => s.id === subject.id);
      let newSubs = [...prev.subjects];
      if (idx >= 0) {
        newSubs[idx] = subject;
      } else {
        newSubs.push(subject);
      }
      return { ...prev, subjects: newSubs };
    }, false, { collection: 'subjects', id: subject.id, data: subject });
    logActivity(currentUser, 'Simpan Mapel', `Menyimpan mata pelajaran: ${subject.name}`);
  };

  const handleDeleteSubject = async (subjectId: string) => {
    addDeletedEntityId('subjects', subjectId);
    updateDbAndSave((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => s.id !== subjectId)
    }), true);
    await deleteDocFromFirestore('subjects', subjectId);
    logActivity(currentUser, 'Hapus Mapel', `Menghapus mapel ID: ${subjectId}`);
  };

  // Handlers for Curricula
  const handleSaveCurricula = (curricula: Curriculum[]) => {
    updateDbAndSave((prev) => ({ ...prev, curricula }));
    logActivity(currentUser, 'Ubah Kurikulum', 'Memperbarui konfigurasi bobot nilai & kriteria kurikulum.');
  };

  // Handlers for Learning Objectives (TP)
  const handleSaveObjective = (obj: LearningObjective): { success: boolean; error?: string } => {
    const authRes = authorizeSubjectAssessmentWrite({
      user: effectiveUser,
      subjectId: obj.subjectId,
      classId: obj.classId,
      academicYear: obj.academicYear || db.schoolProfile.activeAcademicYear,
      semester: obj.semester,
      teachers: db.teachers,
      teachingAssignments: db.teachingAssignments,
      assessmentPolicy: db.assessmentPolicy,
      authContext
    });
    if (!authRes.allowed) {
      const msg = authRes.reason || 'Akses ditolak untuk menyimpan Tujuan Pembelajaran.';
      pushAlert('error', msg);
      return { success: false, error: msg };
    }

    removeDeletedEntityId('assessments', obj.id);
    removeDeletedEntityId('learningObjectives', obj.id);
    const enrichedObj: LearningObjective = {
      ...obj,
      teacherId: authRes.resolvedTeacherId || obj.teacherId,
      updatedAt: obj.updatedAt || new Date().toISOString(),
      updatedBy: currentUser?.name || obj.updatedBy
    };

    updateDbAndSave(
      (prev) => {
        const idx = prev.learningObjectives.findIndex((o) => o.id === enrichedObj.id);
        const newObjectives = [...prev.learningObjectives];
        if (idx >= 0) {
          newObjectives[idx] = enrichedObj;
        } else {
          newObjectives.push(enrichedObj);
        }
        return { ...prev, learningObjectives: newObjectives };
      },
      true
    );

    setLastSaveStatus({
      success: false,
      savedToServer: false,
      status: 'SAVING',
      message: `MENYIMPAN TP ${obj.code} ke server Firestore...`
    });
    surgicalSync('assessments', enrichedObj.id, enrichedObj).then((syncRes) => {
      if (syncRes.success) {
        setLastSaveStatus({
          success: true,
          savedToServer: true,
          status: 'SAVED_SERVER',
          count: 1,
          message: `TP ${enrichedObj.code} BERHASIL TERSIMPAN DI SERVER.`,
          timestamp: new Date().toISOString()
        });
      } else {
        const status = syncRes.quotaExceeded ? 'LOCAL_ONLY_QUOTA' : 'FAILED_SERVER';
        setLastSaveStatus({
          success: false,
          savedToServer: false,
          status,
          quotaExceeded: syncRes.quotaExceeded,
          message: syncRes.error || 'Gagal menyimpan TP ke server Firestore.',
          error: syncRes.error
        });
      }
    });

    logActivity(currentUser, 'Simpan TP', `Menyimpan Tujuan Pembelajaran: ${obj.code}`);
    return { success: true };
  };

  const handleDeleteObjective = async (
    objId: string,
    options?: { force?: boolean }
  ): Promise<{ success: boolean; error?: string }> => {
    const targetTp = db.learningObjectives.find((o) => o.id === objId);
    if (targetTp) {
      const authRes = authorizeSubjectAssessmentWrite({
        user: effectiveUser,
        subjectId: targetTp.subjectId,
        classId: targetTp.classId,
        academicYear: targetTp.academicYear || db.schoolProfile.activeAcademicYear,
        semester: targetTp.semester,
        teachers: db.teachers,
        teachingAssignments: db.teachingAssignments,
        assessmentPolicy: db.assessmentPolicy,
        authContext
      });
      if (!authRes.allowed) {
        const msg = authRes.reason || 'Akses ditolak untuk menghapus TP.';
        pushAlert('error', msg);
        return { success: false, error: msg };
      }
    }

    const usage = checkLearningObjectiveInUse({
      tpId: objId,
      learningChapters: db.learningChapters,
      summativePlans: db.summativePlans,
      formativeAssessments: db.formativeAssessments,
      summativeAssessments: db.summativeAssessments,
      scores: db.scores
    });
    if (usage.inUse && !options?.force) {
      const msg = usage.reason || 'TP sedang dipakai oleh data asesmen atau nilai rapor.';
      pushAlert('error', msg);
      return { success: false, error: msg };
    }

    addDeletedEntityId('assessments', objId);
    addDeletedEntityId('learningObjectives', objId);
    updateDbAndSave(
      (prev) => ({
        ...prev,
        learningObjectives: prev.learningObjectives.filter((o) => o.id !== objId)
      }),
      true
    );
    const deleted = await deleteDocFromFirestore('assessments', objId);
    logActivity(currentUser, 'Hapus TP', `Menghapus Tujuan Pembelajaran ID: ${objId}`);
    if (!deleted) {
      return {
        success: false,
        error: 'TP dihapus secara lokal, tetapi gagal menghapus dokumen di server Firestore.'
      };
    }
    return { success: true };
  };

  // Handlers for Extracurriculars
  const handleSaveExtracurricular = (ekskul: Extracurricular) => {
    updateDbAndSave((prev) => {
      const idx = prev.extracurriculars.findIndex((e) => e.id === ekskul.id);
      let newEkskul = [...prev.extracurriculars];
      if (idx >= 0) {
        newEkskul[idx] = ekskul;
      } else {
        newEkskul.push(ekskul);
      }
      return { ...prev, extracurriculars: newEkskul };
    }, false, { collection: 'extracurriculars', id: ekskul.id, data: ekskul });
    logActivity(currentUser, 'Simpan Ekskul', `Menyimpan kegiatan ekskul: ${ekskul.name}`);
  };

  const handleDeleteExtracurricular = (id: string) => {
    updateDbAndSave((prev) => ({
      ...prev,
      extracurriculars: prev.extracurriculars.filter((e) => e.id !== id)
    }));
    logActivity(currentUser, 'Hapus Ekskul', `Menghapus kegiatan ekskul ID: ${id}`);
  };

  const handleSaveStudentEkskul = (record: StudentExtracurricular) => {
    removeDeletedEntityId('student_extracurriculars', record.id);
    updateDbAndSave((prev) => {
      const idx = prev.studentExtracurriculars.findIndex(
        (se) =>
          se.studentId === record.studentId &&
          se.extracurricularId === record.extracurricularId &&
          se.academicYear === record.academicYear &&
          se.semester === record.semester
      );
      let list = [...prev.studentExtracurriculars];
      if (idx >= 0) {
        list[idx] = record;
      } else {
        list.push(record);
      }
      return { ...prev, studentExtracurriculars: list };
    }, false, { collection: 'student_extracurriculars', id: record.id, data: record });
  };

  const handleSaveStudentEkskulBatch = (
    recordsToSave: StudentExtracurricular[],
    recordIdsToDelete: string[]
  ) => {
    const deleteIdSet = new Set(recordIdsToDelete);
    recordsToSave.forEach((rec) => {
      removeDeletedEntityId('student_extracurriculars', rec.id);
    });
    updateDbAndSave((prev) => {
      const list = prev.studentExtracurriculars.filter((se) => !deleteIdSet.has(se.id));
      recordsToSave.forEach((rec) => {
        const idx = list.findIndex(
          (se) =>
            (rec.id && se.id === rec.id) ||
            (se.studentId === rec.studentId &&
              se.extracurricularId === rec.extracurricularId &&
              se.academicYear === rec.academicYear &&
              se.semester === rec.semester)
        );
        if (idx >= 0) {
          list[idx] = rec;
        } else {
          list.push(rec);
        }
        surgicalSync('student_extracurriculars', rec.id, rec).catch(() => {});
      });
      recordIdsToDelete.forEach((id) => {
        deleteDocFromFirestore('student_extracurriculars', id).catch(() => {});
      });
      return { ...prev, studentExtracurriculars: list };
    }, true);
    logActivity(
      currentUser,
      'Simpan Ekskul Siswa',
      `Menyimpan ${recordsToSave.length} peserta aktif & menghapus ${recordIdsToDelete.length} data non-peserta.`
    );
  };

  // Handlers for Attendance
  const handleSaveAttendance = (records: Attendance[]) => {
    updateDbAndSave((prev) => {
      const newAtt = [...prev.attendance];
      records.forEach((rec) => {
        const idx = newAtt.findIndex(
          (a) =>
            a.studentId === rec.studentId &&
            a.academicYear === rec.academicYear &&
            a.semester === rec.semester
        );
        if (idx >= 0) {
          newAtt[idx] = rec;
        } else {
          newAtt.push(rec);
        }
        // Sync each record surgically
        surgicalSync('attendance', rec.id, rec).catch(() => {});
      });
      return { ...prev, attendance: newAtt };
    }, true); // skip full sync since we did it surgically for each item above
    logActivity(currentUser, 'Simpan Absensi', `Menyimpan rekap absensi untuk ${records.length} siswa.`);
  };

  // Handlers for Scores (RBAC guarded, Legacy protected, Conflict checked & Honest server status)
  const handleSaveScores = (newScores: AssessmentScore[], notification?: AppNotification) => {
    const scoreKey = (s: AssessmentScore) =>
      `${s.studentId}-${s.subjectId}-${(s.academicYear || '').replace(/\//g, '_')}-${s.semester}`;

    const existingScoreMap = new Map(db.scores.map((s) => [scoreKey(s), s]));
    const baseUpdatedAtById: Record<string, string> = {};

    const authorizedScores: AssessmentScore[] = [];
    let rejectedAuthCount = 0;
    let protectedLegacyCount = 0;
    let lastRejectionMsg = '';

    newScores.forEach((incoming) => {
      const authRes = authorizeSubjectAssessmentWrite({
        user: effectiveUser,
        subjectId: incoming.subjectId,
        classId: incoming.classId,
        academicYear: incoming.academicYear,
        semester: incoming.semester,
        teachers: db.teachers,
        teachingAssignments: db.teachingAssignments,
        assessmentPolicy: db.assessmentPolicy,
        authContext
      });
      if (!authRes.allowed) {
        rejectedAuthCount++;
        lastRejectionMsg = authRes.reason || 'Akses simpan nilai ditolak.';
        return;
      }

      const key = scoreKey(incoming);
      const existing = existingScoreMap.get(key);
      const legacyCheck = checkLegacyScoreProtection({
        score: existing || incoming,
        academicYears: db.academicYears,
        assessmentPolicy: db.assessmentPolicy,
        user: currentUser
      });

      if (legacyCheck.isProtected && existing && currentUser?.role !== 'admin') {
        protectedLegacyCount++;
        lastRejectionMsg = legacyCheck.reason || 'Nilai arsip/finalisasi tidak dapat diubah.';
        return;
      }

      // Deterministic ID: reuse existing doc ID if present, otherwise deterministic composite ID
      const stableId =
        existing?.id ||
        buildDeterministicScoreId(
          incoming.studentId,
          incoming.subjectId,
          incoming.academicYear,
          incoming.semester
        );

      if (existing?.updatedAt) {
        baseUpdatedAtById[stableId] = existing.updatedAt;
      }

      authorizedScores.push({
        ...incoming,
        id: stableId,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.name || incoming.updatedBy,
        updatedById: currentUser?.id || incoming.updatedById
      });
    });

    if (rejectedAuthCount > 0 || protectedLegacyCount > 0) {
      pushAlert(
        'warning',
        lastRejectionMsg ||
          `Sebagian data (${rejectedAuthCount + protectedLegacyCount}) dilewati karena batas hak akses atau perlindungan nilai terfinalisasi.`
      );
    }

    if (authorizedScores.length === 0) {
      return;
    }

    updateDbAndSave((prev) => {
      const scoreMap = new Map(prev.scores.map((s) => [scoreKey(s), s]));
      authorizedScores.forEach((sc) => {
        scoreMap.set(scoreKey(sc), sc);
      });

      let updatedNotifications = prev.notifications || [];
      if (notification) {
        const notifMap = new Map(updatedNotifications.map((n) => [n.id, n]));
        notifMap.set(notification.id, notification);
        updatedNotifications = Array.from(notifMap.values());
      }

      return {
        ...prev,
        scores: Array.from(scoreMap.values()),
        notifications: updatedNotifications
      };
    }, true); // skip whole-database auto sync; targeted batch write follows

    setLastSaveStatus({
      success: false,
      savedToServer: false,
      status: 'SAVING',
      message: `MENYIMPAN ${authorizedScores.length} data nilai ke server Firestore...`
    });

    saveScoresToFirestoreDirect(authorizedScores, notification, {
      baseUpdatedAtById,
      currentUserId: currentUser?.id,
      checkConflicts: true
    }).then((res) => {
      setLastSaveStatus(res);
      if (!res.success) {
        pushAlert(
          res.conflictDetected || res.status === 'FAILED_SERVER' ? 'error' : 'warning',
          res.message || res.error || 'Gagal menyimpan data nilai ke server Firestore.'
        );
      }
    });

    logActivity(
      currentUser,
      'Simpan Nilai Siswa',
      `Menyimpan ${authorizedScores.length} data nilai (${rejectedAuthCount + protectedLegacyCount} dilindungi/dilewati).`
    );
  };

  const handleMarkNotificationRead = (notifId: string) => {
    updateDbAndSave((prev) => ({
      ...prev,
      notifications: (prev.notifications || []).map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
    }));
  };

  // Handlers for Homeroom Notes
  const handleSaveHomeroomNotes = (notes: HomeroomNote[]) => {
    updateDbAndSave((prev) => {
      const map = new Map(prev.homeroomNotes.map((n) => [n.id, n]));
      notes.forEach((n) => {
        map.set(n.id, n);
        surgicalSync('homeroom_notes', n.id, n).catch(() => {});
      });
      return { ...prev, homeroomNotes: Array.from(map.values()) };
    }, true);
    logActivity(currentUser, 'Simpan Catatan Wali Kelas', `Menyimpan catatan untuk ${notes.length} siswa.`);
  };

  // Handlers for Description Bank
  const handleSaveDescriptionBank = (bank: SubjectDescriptionBank[]) => {
    const normalized = mergeDescriptionBankWithDefaults(bank);
    updateDbAndSave((prev) => ({ ...prev, descriptionBank: normalized }), true);
    saveDescriptionBankDirect(normalized, currentUser?.name).catch(() => {});
    logActivity(currentUser, 'Simpan Bank Deskripsi', 'Memperbarui bank deskripsi dan pola capaian TP otomatis.');
  };

  // Handler for Assessment Policy & Period Input Lock (Admin)
  const handleSaveAssessmentPolicy = (policy: AssessmentPolicyConfig) => {
    const adminAuth = authorizeSensitiveAdminAction({
      user: currentUser,
      authContext,
      actionLabel: 'perubahan kebijakan penilaian & bobot nilai rapor',
      allowBoundAdminFallback: true
    });
    if (!adminAuth.allowed) {
      pushAlert('error', adminAuth.reason || 'Hanya Administrator terverifikasi yang dapat mengubah kebijakan penilaian.');
      return;
    }

    const normalized = normalizeAssessmentPolicy({
      ...policy,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.name || policy.updatedBy || 'Administrator'
    });
    updateDbAndSave((prev) => ({ ...prev, assessmentPolicy: normalized }), true);
    saveAssessmentPolicyDirect(normalized).then((res) => {
      if (!res.success || res.quotaExceeded) {
        pushAlert('warning', res.error || 'Kebijakan disimpan lokal, namun gagal sinkron ke server Firestore.');
      }
    });
    logActivity(
      currentUser,
      'Simpan Kebijakan Penilaian',
      `Memperbarui kebijakan ketercapaian TP & status kunci input (${normalized.isInputLocked ? 'Terkunci' : 'Terbuka'}).`
    );
  };

  // Handlers for Class Promotion & Graduation
  const handlePromoteStudents = (studentIds: string[], targetClassId: string) => {
    updateDbAndSave((prev) => {
      const updatedStudents = prev.students.map((s) => {
        if (studentIds.includes(s.id)) {
          return { ...s, classId: targetClassId };
        }
        return s;
      });
      return { ...prev, students: updatedStudents };
    });
    logActivity(currentUser, 'Kenaikan Kelas Siswa', `Memindahkan ${studentIds.length} siswa ke rombel tujuan.`);
  };

  const handleBatchGraduation = (graduations: { studentId: string; diplomaNumber: string; graduationDate: string }[]) => {
    updateDbAndSave((prev) => {
      const gradMap = new Map(graduations.map((g) => [g.studentId, g]));
      const updatedStudents = prev.students.map((s) => {
        if (gradMap.has(s.id)) {
          return {
            ...s,
            status: 'Lulus' as const
          };
        }
        return s;
      });
      return { ...prev, students: updatedStudents };
    });
    logActivity(
      currentUser,
      'Penetapan Kelulusan Kelas IX',
      `Menetapkan kelulusan untuk ${graduations.length} siswa menjadi Alumni.`
    );
  };

  // Handlers for Academic Years & Semesters
  const handleUpdateAcademicYears = (
    years: AcademicYearPeriod[],
    activeYear?: string,
    activeSemester?: 'Ganjil' | 'Genap'
  ) => {
    updateDbAndSave((prev) => {
      let updatedSchoolProfile = { ...prev.schoolProfile };
      if (activeYear && activeSemester) {
        updatedSchoolProfile.activeAcademicYear = activeYear;
        updatedSchoolProfile.activeSemester = activeSemester;
      }
      return {
        ...prev,
        academicYears: years,
        schoolProfile: updatedSchoolProfile
      };
    });
    years.forEach((yr) => {
      surgicalSync('academic_years', yr.id, yr).catch(() => {});
    });
    logActivity(
      currentUser,
      'Perubahan Manajemen Tahun Ajaran',
      `Memperbarui data status tahun pelajaran & semester (${activeYear || ''} ${activeSemester || ''})`
    );
  };

  // Handlers for Student Mutations
  const handleSaveMutations = (newMutations: StudentMutation[]) => {
    updateDbAndSave((prev) => ({
      ...prev,
      studentMutations: newMutations
    }));
    newMutations.forEach((m) => {
      surgicalSync('student_mutations', m.id, m).catch(() => {});
    });
    logActivity(currentUser, 'Simpan Mutasi Siswa', `Menyimpan data mutasi siswa (${newMutations.length} catatan).`);
  };

  // Handlers for Student Achievements
  const handleSaveAchievements = (achievements: StudentAchievement[]) => {
    updateDbAndSave((prev) => ({
      ...prev,
      studentAchievements: achievements
    }));
    achievements.forEach((a) => {
      surgicalSync('student_achievements', a.id, a).catch(() => {});
    });
    logActivity(currentUser, 'Simpan Prestasi Siswa', `Menyimpan ${achievements.length} catatan prestasi siswa.`);
  };

  // Handlers for Users
  const handleSaveUser = (user: User) => {
    const adminAuth = authorizeSensitiveAdminAction({
      user: currentUser,
      authContext,
      actionLabel: 'pengelolaan akun pengguna'
    });
    if (!adminAuth.allowed) {
      pushAlert('error', adminAuth.reason || 'Akses ditolak untuk mengubah akun pengguna.');
      return;
    }

    updateDbAndSave((prev) => {
      const idx = prev.users.findIndex((u) => u.id === user.id);
      const newUsers = [...prev.users];
      if (idx >= 0) {
        newUsers[idx] = user;
      } else {
        newUsers.push(user);
      }
      return { ...prev, users: newUsers };
    }, false, { collection: 'users', id: user.id, data: user });
    logActivity(currentUser, 'Simpan Pengguna', `Menyimpan akun pengguna @${user.username}`);
  };

  const handleDeleteUser = (userId: string) => {
    if (currentUser && currentUser.id === userId) {
      const fallbackAdmin = db.users.find((u) => u.role === 'admin' && u.id !== userId) || {
        id: 'usr-admin-1',
        username: 'admin',
        name: 'Administrator Rapor',
        role: 'admin',
        isActive: true
      };
      setCurrentUser(fallbackAdmin as User);
    }
    deleteDocFromFirestore('users', userId).catch(() => {});
    updateDbAndSave((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== userId)
    }));
    logActivity(currentUser, 'Hapus Pengguna', `Menghapus akun pengguna ID: ${userId}`);
  };

  // Handlers for Homeroom Teacher (Wali Kelas) Accounts
  const handleSaveWaliKelas = (user: User, teacherId: string, classId: string) => {
    updateDbAndSave((prev) => {
      // 1. Sync assignment in classrooms & teachers
      const synced = syncHomeroomAssignment(prev, teacherId, classId, user.id);
      
      // 2. Upsert user in users table
      const idx = synced.users.findIndex((u) => u.id === user.id);
      let newUsers = [...synced.users];
      const updatedUser = { ...user, teacherId, classId };
      if (idx >= 0) {
        newUsers[idx] = updatedUser;
      } else {
        newUsers.push(updatedUser);
      }
      return syncUsersWithTeachers({ ...synced, users: newUsers });
    }, false, { collection: 'users', id: user.id, data: { ...user, teacherId, classId } });
    const cls = db.classrooms.find((c) => c.id === classId);
    logActivity(
      currentUser,
      'Penugasan Wali Kelas',
      `Menetapkan akun ${user.name} (@${user.username}) sebagai Wali ${cls?.name || classId}`
    );
  };

  // Handlers for Teaching Assignments (Penugasan Guru Mengajar)
  const handleSaveTeachingAssignments = (assignments: TeachingAssignment[]) => {
    assignments.forEach((ta) => {
      removeDeletedEntityId('teaching_assignments', ta.id);
    });
    updateDbAndSave((prev) => ({
      ...prev,
      teachingAssignments: assignments
    }), true);
    assignments.forEach((ta) => {
      surgicalSync('teaching_assignments', ta.id, ta).catch(() => {});
    });
    logActivity(
      currentUser,
      'Penugasan Guru Mengajar',
      `Menyimpan daftar ${assignments.length} penugasan guru mengajar.`
    );
  };

  const handleDeleteTeachingAssignment = (assignmentId: string) => {
    addDeletedEntityId('teaching_assignments', assignmentId);
    deleteDocFromFirestore('teaching_assignments', assignmentId).catch(() => {});
    updateDbAndSave((prev) => ({
      ...prev,
      teachingAssignments: (prev.teachingAssignments || []).filter((a) => a.id !== assignmentId)
    }), true);
    logActivity(
      currentUser,
      'Hapus Penugasan Mengajar',
      `Menghapus penugasan mengajar ID: ${assignmentId}`
    );
  };

  const handleToggleUserStatus = (userId: string, newStatus: 'active' | 'inactive') => {
    const adminAuth = authorizeSensitiveAdminAction({
      user: currentUser,
      authContext,
      actionLabel: 'ubah status aktif akun'
    });
    if (!adminAuth.allowed) {
      pushAlert('error', adminAuth.reason || 'Akses ditolak.');
      return;
    }

    const targetUser = db.users.find(u => u.id === userId);
    const updatedUser = targetUser ? { ...targetUser, status: newStatus } : null;
    
    updateDbAndSave(
      (prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
      }),
      false,
      updatedUser ? { collection: 'users', id: userId, data: updatedUser } : undefined
    );
    logActivity(
      currentUser,
      'Ubah Status Akun',
      `Mengubah status akun ID ${userId} menjadi ${newStatus === 'active' ? 'Aktif' : 'Nonaktif'}`
    );
  };

  const handleResetUserPassword = (userId: string, newPass: string) => {
    const adminAuth = authorizeSensitiveAdminAction({
      user: currentUser,
      authContext,
      actionLabel: 'reset kata sandi pengguna'
    });
    if (!adminAuth.allowed) {
      pushAlert('error', adminAuth.reason || 'Akses ditolak.');
      return;
    }

    const targetUser = db.users.find(u => u.id === userId);
    const updatedUser = targetUser ? { ...targetUser, password: newPass } : null;

    updateDbAndSave(
      (prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === userId ? { ...u, password: newPass } : u))
      }),
      false,
      updatedUser ? { collection: 'users', id: userId, data: updatedUser } : undefined
    );
    logActivity(currentUser, 'Reset Password', `Mereset password untuk akun pengguna ID: ${userId}`);
  };

  // Database Backup / Restore / Reset
  const handleBackupDatabase = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(db, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `Backup_ERapor_SMPN1Rangsang_${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    logActivity(currentUser, 'Backup Database', 'Mengunduh cadangan lengkap database aplikasi ke berkas JSON.');
  };

  const handleRestoreDatabase = (jsonContent: string) => {
    try {
      const parsed = JSON.parse(jsonContent);
      setDb(parsed);
      saveDatabase(parsed);
      pushAlert('success', 'Database berhasil dipulihkan dari berkas cadangan JSON.');
      logActivity(currentUser, 'Restore Database', 'Memulihkan database dari berkas cadangan JSON.');
    } catch (e: any) {
      pushAlert('error', `Gagal memulihkan database: ${e.message}`);
    }
  };

  const handleResetDatabase = () => {
    localStorage.removeItem('erapor_smpn1rangsang_db_v3');
    localStorage.removeItem('erapor_smpn1rangsang_db_v1');
    localStorage.removeItem('erapor_deleted_entity_ids_v1');
    const freshDb = loadDatabase();
    setDb(freshDb);
    logActivity(currentUser, 'Reset Database', 'Mengembalikan database ke konfigurasi awal SMP Negeri 1 Rangsang.');
  };

  const handlePurgeMasterData = async () => {
    try {
      const purged = partialPurgeMasterData(db);
      setDb(purged);
      saveDatabase(purged);
      await wipeFirestoreMasterCollections();
      await syncAllToFirestore(purged, currentUser || undefined);
      logActivity(currentUser, 'Pembersihan Data Master', 'Mengosongkan seluruh data siswa, guru, dan akun guru untuk mulai baru.');
    } catch (e: any) {
      console.error('Purge error:', e);
      pushAlert('error', `Gagal membersihkan data master: ${e.message}`);
    }
  };

  // Kurikulum Merdeka 2025 Handlers (RBAC & Legacy Protected)
  const handleSaveLearningChapter = (ch: LearningChapter): { success: boolean; error?: string } => {
    const authRes = authorizeSubjectAssessmentWrite({
      user: effectiveUser,
      subjectId: ch.subjectId,
      classId: ch.classId,
      academicYear: ch.academicYear || db.schoolProfile.activeAcademicYear,
      semester: ch.semester,
      teachers: db.teachers,
      teachingAssignments: db.teachingAssignments,
      assessmentPolicy: db.assessmentPolicy,
      authContext
    });
    if (!authRes.allowed) {
      const msg = authRes.reason || 'Akses ditolak untuk menyimpan BAB Materi.';
      pushAlert('error', msg);
      return { success: false, error: msg };
    }

    removeDeletedEntityId('summative_chapters', ch.id);
    const enrichedChapter: LearningChapter = {
      ...ch,
      teacherId: authRes.resolvedTeacherId || ch.teacherId,
      updatedAt: new Date().toISOString()
    };

    updateDbAndSave(
      (prev) => {
        const list = (prev.learningChapters || []).filter((item) => item.id !== enrichedChapter.id);
        return { ...prev, learningChapters: [...list, enrichedChapter] };
      },
      true
    );

    setLastSaveStatus({
      success: false,
      savedToServer: false,
      status: 'SAVING',
      message: `MENYIMPAN ${enrichedChapter.code} ke server Firestore...`
    });
    surgicalSync('summative_chapters', enrichedChapter.id, enrichedChapter).then((res) => {
      if (res.success) {
        setLastSaveStatus({
          success: true,
          savedToServer: true,
          status: 'SAVED_SERVER',
          count: 1,
          message: `${enrichedChapter.code} BERHASIL TERSIMPAN DI SERVER.`,
          timestamp: new Date().toISOString()
        });
      } else {
        setLastSaveStatus({
          success: false,
          savedToServer: false,
          status: res.quotaExceeded ? 'LOCAL_ONLY_QUOTA' : 'FAILED_SERVER',
          quotaExceeded: res.quotaExceeded,
          message: res.error || 'Gagal menyimpan BAB Materi ke server.',
          error: res.error
        });
      }
    });

    logActivity(currentUser, 'Simpan BAB Materi', `Menyimpan ${enrichedChapter.code}: ${enrichedChapter.title}`);
    return { success: true };
  };

  const handleDeleteLearningChapter = async (
    chapterId: string,
    options?: { force?: boolean }
  ): Promise<{ success: boolean; error?: string }> => {
    const existing = (db.learningChapters || []).find((ch) => ch.id === chapterId);
    if (existing) {
      const authRes = authorizeSubjectAssessmentWrite({
        user: effectiveUser,
        subjectId: existing.subjectId,
        classId: existing.classId,
        academicYear: existing.academicYear,
        semester: existing.semester,
        teachers: db.teachers,
        teachingAssignments: db.teachingAssignments,
        assessmentPolicy: db.assessmentPolicy,
        authContext
      });
      if (!authRes.allowed) {
        const msg = authRes.reason || 'Akses ditolak untuk menghapus BAB Materi.';
        pushAlert('error', msg);
        return { success: false, error: msg };
      }
    }

    const usage = checkLearningChapterInUse({
      chapterId,
      summativePlans: db.summativePlans,
      summativeAssessments: db.summativeAssessments,
      scores: db.scores
    });
    if (usage.inUse && !options?.force) {
      const msg = usage.reason || 'BAB masih digunakan pada rencana sumatif atau nilai siswa.';
      pushAlert('error', msg);
      return { success: false, error: msg };
    }

    addDeletedEntityId('summative_chapters', chapterId);
    updateDbAndSave(
      (prev) => ({
        ...prev,
        learningChapters: (prev.learningChapters || []).filter((ch) => ch.id !== chapterId)
      }),
      true
    );
    const deleted = await deleteDocFromFirestore('summative_chapters', chapterId);
    logActivity(currentUser, 'Hapus BAB Materi', `Menghapus BAB Materi ID: ${chapterId}`);
    if (!deleted) {
      return {
        success: false,
        error: 'BAB dihapus secara lokal, tetapi gagal menghapus dari server Firestore.'
      };
    }
    return { success: true };
  };

  const handleSaveSummativePlan = (
    plan: SummativeAssessmentPlan
  ): { success: boolean; error?: string } => {
    const authRes = authorizeSubjectAssessmentWrite({
      user: effectiveUser,
      subjectId: plan.subjectId,
      classId: plan.classId,
      academicYear: plan.academicYear || db.schoolProfile.activeAcademicYear,
      semester: plan.semester,
      teachers: db.teachers,
      teachingAssignments: db.teachingAssignments,
      assessmentPolicy: db.assessmentPolicy,
      authContext
    });
    if (!authRes.allowed) {
      const msg = authRes.reason || 'Akses ditolak untuk menyimpan rencana asesmen sumatif.';
      pushAlert('error', msg);
      return { success: false, error: msg };
    }

    removeDeletedEntityId('summative_plans', plan.id);
    const enrichedPlan: SummativeAssessmentPlan = {
      ...plan,
      teacherId: authRes.resolvedTeacherId || plan.teacherId,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.name || plan.updatedBy
    };

    updateDbAndSave(
      (prev) => {
        const list = (prev.summativePlans || []).filter((item) => item.id !== enrichedPlan.id);
        return { ...prev, summativePlans: [...list, enrichedPlan] };
      },
      true
    );

    setLastSaveStatus({
      success: false,
      savedToServer: false,
      status: 'SAVING',
      message: `MENYIMPAN ${enrichedPlan.title} ke server Firestore...`
    });
    surgicalSync('summative_plans', enrichedPlan.id, enrichedPlan).then((res) => {
      if (res.success) {
        setLastSaveStatus({
          success: true,
          savedToServer: true,
          status: 'SAVED_SERVER',
          count: 1,
          message: `Rencana "${enrichedPlan.title}" BERHASIL TERSIMPAN DI SERVER.`,
          timestamp: new Date().toISOString()
        });
      } else {
        setLastSaveStatus({
          success: false,
          savedToServer: false,
          status: res.quotaExceeded ? 'LOCAL_ONLY_QUOTA' : 'FAILED_SERVER',
          quotaExceeded: res.quotaExceeded,
          message: res.error || 'Gagal menyimpan rencana asesmen sumatif ke server.',
          error: res.error
        });
      }
    });

    logActivity(currentUser, 'Simpan Rencana Sumatif', `Menyimpan ${enrichedPlan.title} (${enrichedPlan.tpIds.length} TP).`);
    return { success: true };
  };

  const handleDeleteSummativePlan = async (
    planId: string
  ): Promise<{ success: boolean; error?: string }> => {
    const existing = (db.summativePlans || []).find((pl) => pl.id === planId);
    if (existing) {
      const authRes = authorizeSubjectAssessmentWrite({
        user: effectiveUser,
        subjectId: existing.subjectId,
        classId: existing.classId,
        academicYear: existing.academicYear,
        semester: existing.semester,
        teachers: db.teachers,
        teachingAssignments: db.teachingAssignments,
        assessmentPolicy: db.assessmentPolicy,
        authContext
      });
      if (!authRes.allowed) {
        const msg = authRes.reason || 'Akses ditolak untuk menghapus rencana asesmen sumatif.';
        pushAlert('error', msg);
        return { success: false, error: msg };
      }
    }

    const usage = checkSummativePlanInUse({
      planId,
      summativeAssessments: db.summativeAssessments
    });
    if (usage.inUse) {
      const msg = usage.reason || 'Rencana asesmen sumatif sudah memiliki nilai siswa dan tidak dapat dihapus.';
      pushAlert('error', msg);
      return { success: false, error: msg };
    }

    addDeletedEntityId('summative_plans', planId);
    updateDbAndSave(
      (prev) => ({
        ...prev,
        summativePlans: (prev.summativePlans || []).filter((pl) => pl.id !== planId)
      }),
      true
    );
    const deleted = await deleteDocFromFirestore('summative_plans', planId);
    logActivity(currentUser, 'Hapus Rencana Sumatif', `Menghapus rencana asesmen sumatif ID: ${planId}`);
    if (!deleted) {
      return {
        success: false,
        error: 'Rencana sumatif dihapus secara lokal, tetapi gagal menghapus dari server Firestore.'
      };
    }
    return { success: true };
  };

  const handleSaveFormativesBatch = (items: FormativeAssessment[]) => {
    const allowedItems = items.filter((item) =>
      authorizeSubjectAssessmentWrite({
        user: effectiveUser,
        subjectId: item.subjectId,
        classId: item.classId,
        academicYear: item.academicYear,
        semester: item.semester,
        teachers: db.teachers,
        teachingAssignments: db.teachingAssignments,
        assessmentPolicy: db.assessmentPolicy,
        authContext
      }).allowed
    );
    if (allowedItems.length === 0) return;

    updateDbAndSave((prev) => {
      const map = new Map((prev.formativeAssessments || []).map((a) => [a.id, a]));
      allowedItems.forEach((item) => map.set(item.id, item));
      return { ...prev, formativeAssessments: Array.from(map.values()) };
    }, true);
    setLastSaveStatus({
      success: false,
      savedToServer: false,
      status: 'SAVING',
      message: `MENYIMPAN ${allowedItems.length} data formatif ke server...`
    });
    saveBatchToFirestoreDirect('formative_assessments', allowedItems).then((res) => {
      setLastSaveStatus(res);
      if (!res.success) {
        pushAlert('warning', res.message || 'Gagal menyinkronkan batch asesmen formatif ke server.');
      }
    });
  };

  const handleSaveSummativesBatch = (items: SummativeAssessment[]) => {
    const allowedItems = items.filter((item) =>
      authorizeSubjectAssessmentWrite({
        user: effectiveUser,
        subjectId: item.subjectId,
        classId: item.classId,
        academicYear: item.academicYear,
        semester: item.semester,
        teachers: db.teachers,
        teachingAssignments: db.teachingAssignments,
        assessmentPolicy: db.assessmentPolicy,
        authContext
      }).allowed
    );
    if (allowedItems.length === 0) return;

    updateDbAndSave((prev) => {
      const map = new Map((prev.summativeAssessments || []).map((a) => [a.id, a]));
      allowedItems.forEach((item) => map.set(item.id, item));
      return { ...prev, summativeAssessments: Array.from(map.values()) };
    }, true);
    setLastSaveStatus({
      success: false,
      savedToServer: false,
      status: 'SAVING',
      message: `MENYIMPAN ${allowedItems.length} data sumatif ke server...`
    });
    saveBatchToFirestoreDirect('summative_assessments', allowedItems).then((res) => {
      setLastSaveStatus(res);
      if (!res.success) {
        pushAlert('warning', res.message || 'Gagal menyinkronkan batch asesmen sumatif ke server.');
      }
    });
  };

  const handleConfirmExcelImport = (payload: {
    scoresToSave: AssessmentScore[];
    summativesToSave: SummativeAssessment[];
    notificationMessage: string;
  }) => {
    const { scoresToSave, summativesToSave } = payload;
    handleSaveScores(scoresToSave);
    if (summativesToSave.length > 0) {
      handleSaveSummativesBatch(summativesToSave);
    }
  };

  const handleSaveSpreadsheetBatch = (payload: {
    scoresToSave: AssessmentScore[];
    summativesToSave: SummativeAssessment[];
    notification?: AppNotification;
  }) => {
    const { scoresToSave, summativesToSave, notification } = payload;
    if (summativesToSave.length > 0 && scoresToSave.length === 0) {
      handleSaveSummativesBatch(summativesToSave);
      return;
    }
    if (summativesToSave.length > 0) {
      // Save summative component records locally & sync batch without overriding handleSaveScores status on conflict
      const allowedSummatives = summativesToSave.filter((item) =>
        authorizeSubjectAssessmentWrite({
          user: effectiveUser,
          subjectId: item.subjectId,
          classId: item.classId,
          academicYear: item.academicYear,
          semester: item.semester,
          teachers: db.teachers,
          teachingAssignments: db.teachingAssignments,
          assessmentPolicy: db.assessmentPolicy,
          authContext
        }).allowed
      );
      if (allowedSummatives.length > 0) {
        updateDbAndSave((prev) => {
          const map = new Map((prev.summativeAssessments || []).map((a) => [a.id, a]));
          allowedSummatives.forEach((item) => map.set(item.id, item));
          return { ...prev, summativeAssessments: Array.from(map.values()) };
        }, true);
        saveBatchToFirestoreDirect('summative_assessments', allowedSummatives).then((res) => {
          if (!res.success) {
            pushAlert('warning', res.message || 'Sebagian komponen sumatif gagal disinkronkan ke server.');
          }
        });
      }
    }
    if (scoresToSave.length > 0) {
      handleSaveScores(scoresToSave, notification);
    }
  };

  const handleUpdateSchoolWeights = (babWeight: number, sasWeight: number) => {
    updateDbAndSave((prev) => {
      const curriculaList = (prev.curricula || []).map((c) => {
        if (c.id === 'cur-merdeka' || c.id === prev.curricula[0]?.id) {
          return { ...c, formatifWeight: babWeight, sumatifWeight: sasWeight };
        }
        return c;
      });
      return { ...prev, curricula: curriculaList };
    });
  };

  const handleSaveFormative = (fa: FormativeAssessment) => {
    const authRes = authorizeSubjectAssessmentWrite({
      user: effectiveUser,
      subjectId: fa.subjectId,
      classId: fa.classId,
      academicYear: fa.academicYear,
      semester: fa.semester,
      teachers: db.teachers,
      teachingAssignments: db.teachingAssignments,
      assessmentPolicy: db.assessmentPolicy,
      authContext
    });
    if (!authRes.allowed) {
      pushAlert('error', authRes.reason || 'Akses simpan asesmen formatif ditolak.');
      return;
    }
    updateDbAndSave(
      (prev) => {
        const filtered = (prev.formativeAssessments || []).filter(a => a.id !== fa.id);
        return { ...prev, formativeAssessments: [...filtered, fa] };
      },
      false,
      { collection: 'formative_assessments', id: fa.id, data: fa }
    );
  };

  const handleSaveSummative = (sa: SummativeAssessment) => {
    const authRes = authorizeSubjectAssessmentWrite({
      user: effectiveUser,
      subjectId: sa.subjectId,
      classId: sa.classId,
      academicYear: sa.academicYear,
      semester: sa.semester,
      teachers: db.teachers,
      teachingAssignments: db.teachingAssignments,
      assessmentPolicy: db.assessmentPolicy,
      authContext
    });
    if (!authRes.allowed) {
      pushAlert('error', authRes.reason || 'Akses simpan asesmen sumatif ditolak.');
      return;
    }

    updateDbAndSave(
      (prev) => {
        const filtered = (prev.summativeAssessments || []).filter(a => a.id !== sa.id);
        const newSummatives = [...filtered, sa];

        // Harmonize sumatifMateriScores without ever overwriting locked/finalized finalScore or forcing 50:50
        const studentSummatives = newSummatives.filter(
          a =>
            a.studentId === sa.studentId &&
            a.subjectId === sa.subjectId &&
            a.academicYear === sa.academicYear &&
            a.semester === sa.semester
        );

        const tpAverages: Record<string, number> = {};
        const tpGroups: Record<string, number[]> = {};
        studentSummatives.forEach(a => {
          getSummativeTpIds(a).forEach((tpId) => {
            if (!tpGroups[tpId]) tpGroups[tpId] = [];
            tpGroups[tpId].push(a.score);
          });
        });
        Object.keys(tpGroups).forEach(tpId => {
          const vals = tpGroups[tpId];
          if (vals.length > 0) {
            tpAverages[tpId] = Math.round(vals.reduce((p, c) => p + c, 0) / vals.length);
          }
        });

        const scoreKey = (s: AssessmentScore) =>
          `${s.studentId}-${s.subjectId}-${(s.academicYear || '').replace(/\//g, '_')}-${s.semester}`;
        const targetKey = `${sa.studentId}-${sa.subjectId}-${(sa.academicYear || '').replace(/\//g, '_')}-${sa.semester}`;

        const existingScore = prev.scores.find(s => scoreKey(s) === targetKey);
        const legacyCheck = checkLegacyScoreProtection({
          score: existingScore,
          academicYears: prev.academicYears,
          assessmentPolicy: prev.assessmentPolicy,
          user: currentUser
        });

        // If existing score is protected/finalized, preserve score row untouched
        if (existingScore && legacyCheck.isProtected) {
          return {
            ...prev,
            summativeAssessments: newSummatives
          };
        }

        const weights = resolveSchoolWeights(prev.curricula, prev.assessmentPolicy);
        const contextChapters = filterChaptersForContext(prev.learningChapters || [], {
          subjectId: sa.subjectId,
          classId: sa.classId,
          academicYear: sa.academicYear,
          semester: sa.semester
        });
        const updatedChapterScores =
          contextChapters.length > 0
            ? aggregateChapterScoresFromSummatives({
                studentId: sa.studentId,
                subjectId: sa.subjectId,
                classId: sa.classId,
                academicYear: sa.academicYear,
                semester: sa.semester,
                chapters: contextChapters,
                summativeAssessments: newSummatives,
                existingChapterScores: existingScore?.chapterScores,
                existingScoreUpdatedAt: existingScore?.updatedAt
              })
            : existingScore?.chapterScores;

        const mergedLegacyMateri = { ...(existingScore?.sumatifMateriScores || {}), ...tpAverages };
        const calcResult = computeStudentReportScore({
          chapters: contextChapters,
          chapterScores: updatedChapterScores,
          sasScore: weights.sasConducted ? getEffectiveSasScore(existingScore) : undefined,
          formatifScores: existingScore?.formatifScores,
          manualFinalScore: existingScore?.manualFinalScore,
          lingkupMateriWeightPercent: weights.configuredLingkupMateriWeightPercent,
          sasWeightPercent: weights.configuredSasWeightPercent,
          sasConducted: weights.sasConducted,
          sasNotConductedPolicy: weights.sasNotConductedPolicy,
          assessmentPolicy: prev.assessmentPolicy,
          passingCriteria: weights.passingCriteria,
          legacyMateriScores: contextChapters.length > 0 ? undefined : mergedLegacyMateri
        });

        // Preserve existing finalScore unless school weights or explicit formula yielded a valid score for non-finalized records
        const resolvedFinalScore =
          existingScore?.manualFinalScore !== undefined
            ? existingScore.finalScore
            : calcResult.finalScore ?? existingScore?.finalScore ?? 0;
        const pred = calculatePredicate(resolvedFinalScore, weights.passingCriteria);
        const isManualOrLockedDesc =
          existingScore?.descriptionStatus === 'Sudah diedit guru' ||
          existingScore?.descriptionStatus === 'Sudah disimpan' ||
          existingScore?.descriptionStatus === 'Sudah difinalisasi';

        const deterministicId =
          existingScore?.id ||
          buildDeterministicScoreId(sa.studentId, sa.subjectId, sa.academicYear, sa.semester);

        const updatedScore: AssessmentScore = existingScore
          ? {
              ...existingScore,
              chapterScores: updatedChapterScores,
              sumatifMateriScores: mergedLegacyMateri,
              babAverage: calcResult.babAverage,
              babWeightPercent: calcResult.effectiveBabWeightPercent,
              sasWeightPercent: calcResult.effectiveSasWeightPercent,
              sumatifAverage: calcResult.sumatifAverage,
              rawFinalScore: calcResult.rawFinalScore,
              finalScoreBreakdown: calcResult.breakdownText,
              completenessStatus: calcResult.completenessStatus,
              hasMissingComponents: calcResult.hasMissingComponents,
              missingComponentNote: calcResult.missingComponentNote,
              finalScore: resolvedFinalScore,
              predicate: pred,
              descriptionStatus: isManualOrLockedDesc
                ? existingScore.descriptionStatus
                : (existingScore.descriptionStatus || 'Belum dibuat'),
              updatedAt: new Date().toISOString(),
              updatedBy: currentUser?.name,
              updatedById: currentUser?.id
            }
          : {
              id: deterministicId,
              studentId: sa.studentId,
              subjectId: sa.subjectId,
              classId: sa.classId,
              academicYear: sa.academicYear,
              semester: sa.semester,
              formatifScores: {},
              chapterScores: updatedChapterScores,
              sumatifMateriScores: tpAverages,
              babAverage: calcResult.babAverage,
              sumatifAverage: calcResult.sumatifAverage,
              sumatifAkhirSemester: 0,
              hasSasScore: false,
              finalScore: resolvedFinalScore,
              predicate: pred,
              highestCompetenceDesc: '',
              lowestCompetenceDesc: '',
              descriptionStatus: 'Belum dibuat',
              updatedAt: new Date().toISOString(),
              updatedBy: currentUser?.name,
              updatedById: currentUser?.id,
              status: 'SELESAI'
            };

        const updatedScores = prev.scores.some(s => scoreKey(s) === targetKey)
          ? prev.scores.map(s => (scoreKey(s) === targetKey ? updatedScore : s))
          : [...prev.scores, updatedScore];

        surgicalSync('assessment_scores', updatedScore.id, updatedScore).catch(() => {});

        return {
          ...prev,
          summativeAssessments: newSummatives,
          scores: updatedScores
        };
      },
      false,
      { collection: 'summative_assessments', id: sa.id, data: sa }
    );
  };

  const handleDeleteSummative = (id: string) => {
    const existing = (db.summativeAssessments || []).find(a => a.id === id);
    if (existing) {
      const authRes = authorizeSubjectAssessmentWrite({
        user: effectiveUser,
        subjectId: existing.subjectId,
        classId: existing.classId,
        academicYear: existing.academicYear,
        semester: existing.semester,
        teachers: db.teachers,
        teachingAssignments: db.teachingAssignments,
        assessmentPolicy: db.assessmentPolicy,
        authContext
      });
      if (!authRes.allowed) {
        pushAlert('error', authRes.reason || 'Akses hapus nilai sumatif ditolak.');
        return;
      }
    }
    updateDbAndSave((prev) => ({
      ...prev,
      summativeAssessments: (prev.summativeAssessments || []).filter(a => a.id !== id)
    }));
    deleteDocFromFirestore('summative_assessments', id).catch(() => {});
  };

  const handleSaveKKTP = (config: KKTPConfig) => {
    updateDbAndSave(
      (prev) => {
        const filtered = (prev.kktpConfigs || []).filter(c => c.tpId !== config.tpId);
        return { ...prev, kktpConfigs: [...filtered, config] };
      },
      false,
      { collection: 'kktp_configs', id: config.id, data: config }
    );
  };

  const handleSaveFinalScoreConfig = (config: SubjectFinalScoreConfig) => {
    updateDbAndSave((prev) => {
      const filtered = (prev.finalScoreConfigs || []).filter(c => c.subjectId !== config.subjectId || c.classId !== config.classId);
      return { ...prev, finalScoreConfigs: [...filtered, config] };
    });
  };

  const handleUpdateSchoolSettings = (updated: Partial<SchoolProfile>) => {
    updateDbAndSave((prev) => ({
      ...prev,
      schoolProfile: { ...prev.schoolProfile, ...updated }
    }));
    logActivity(currentUser, 'Ubah Pengaturan Periode', 'Memperbarui tahun pelajaran, semester, atau tanggal bagi rapor.');
  };

  const handleApplyRemoteData = (remoteData: Partial<AppDatabase>) => {
    updateDbAndSave((prev) => ({
      ...prev,
      ...remoteData,
      subjects: ensureElectiveCodingSubject(
        remoteData.subjects || prev.subjects,
        (id) => isEntityDeleted('subjects', id)
      ),
      learningObjectives: (remoteData.learningObjectives !== undefined
        ? remoteData.learningObjectives
        : prev.learningObjectives
      ).filter(
        (tp) =>
          tp &&
          tp.id &&
          !isEntityDeleted('assessments', tp.id) &&
          !isEntityDeleted('learningObjectives', tp.id)
      )
    }));
    logActivity(currentUser, 'Sinkronisasi Cloud Firestore', 'Memperbarui data lokal dari Cloud Firestore.');
  };

  const handleNavigateToPrint = (studentId?: string) => {
    if (studentId) setTargetPrintStudentId(studentId);
    setActiveMenu('cetak-rapor');
  };

  // ============================================================================
  // Handlers for Modul Kokurikuler (Verified Firebase Sync)
  // ============================================================================
  const handleSaveKokurikulerGroup = async (
    group: KokurikulerGroup
  ): Promise<{ success: boolean; error?: string }> => {
    removeDeletedEntityId('kokurikulerGroups', group.id);
    const syncRes = await surgicalSync('kokurikuler_groups', group.id, group);
    if (!syncRes.success || syncRes.quotaExceeded) {
      return {
        success: false,
        error:
          syncRes.error ||
          'Kuota harian Firebase tercapai. Data belum tersinkronisasi ke Cloud Firestore.'
      };
    }
    updateDbAndSave(
      (prev) => {
        const list = [...(prev.kokurikulerGroups || [])];
        const idx = list.findIndex((g) => g.id === group.id);
        if (idx >= 0) list[idx] = group;
        else list.push(group);
        return { ...prev, kokurikulerGroups: list };
      },
      true
    );
    logActivity(currentUser, 'Simpan Kelompok Kokurikuler', `Menyimpan kelompok kokurikuler: ${group.name} (${group.code})`);
    return { success: true };
  };

  const handleDeleteKokurikulerGroup = async (
    groupId: string
  ): Promise<{ success: boolean; error?: string }> => {
    addDeletedEntityId('kokurikulerGroups', groupId);
    const deleted = await deleteDocFromFirestore('kokurikuler_groups', groupId);
    if (!deleted) {
      return { success: false, error: 'Gagal menghapus kelompok kokurikuler dari Firebase Firestore.' };
    }
    updateDbAndSave(
      (prev) => ({
        ...prev,
        kokurikulerGroups: (prev.kokurikulerGroups || []).filter((g) => g.id !== groupId)
      }),
      true
    );
    logActivity(currentUser, 'Hapus Kelompok Kokurikuler', `Menghapus kelompok kokurikuler ID: ${groupId}`);
    return { success: true };
  };

  const handleSaveKokurikulerActivity = async (
    activity: KokurikulerActivity
  ): Promise<{ success: boolean; error?: string }> => {
    removeDeletedEntityId('kokurikulerActivities', activity.id);
    const syncRes = await surgicalSync('kokurikuler_activities', activity.id, activity);
    if (!syncRes.success || syncRes.quotaExceeded) {
      return {
        success: false,
        error:
          syncRes.error ||
          'Kuota harian Firebase tercapai. Data kegiatan belum tersimpan ke Cloud Firestore.'
      };
    }
    updateDbAndSave(
      (prev) => {
        const list = [...(prev.kokurikulerActivities || [])];
        const idx = list.findIndex((a) => a.id === activity.id);
        if (idx >= 0) list[idx] = activity;
        else list.push(activity);
        return { ...prev, kokurikulerActivities: list };
      },
      true
    );
    logActivity(currentUser, 'Simpan Kegiatan Kokurikuler', `Menyimpan kegiatan kokurikuler: ${activity.name}`);
    return { success: true };
  };

  const handleDeleteKokurikulerActivity = async (
    activityId: string
  ): Promise<{ success: boolean; error?: string }> => {
    addDeletedEntityId('kokurikulerActivities', activityId);
    const deleted = await deleteDocFromFirestore('kokurikuler_activities', activityId);
    if (!deleted) {
      return { success: false, error: 'Gagal menghapus kegiatan kokurikuler dari Firebase Firestore.' };
    }
    updateDbAndSave(
      (prev) => ({
        ...prev,
        kokurikulerActivities: (prev.kokurikulerActivities || []).filter((a) => a.id !== activityId)
      }),
      true
    );
    logActivity(currentUser, 'Hapus Kegiatan Kokurikuler', `Menghapus kegiatan kokurikuler ID: ${activityId}`);
    return { success: true };
  };

  const handleSaveKokurikulerDimensions = async (
    dims: KokurikulerDimensionMaster[]
  ): Promise<{ success: boolean; error?: string }> => {
    for (const d of dims) {
      const res = await surgicalSync('kokurikuler_dimensions', d.id, d);
      if (!res.success || res.quotaExceeded) {
        return {
          success: false,
          error: res.error || 'Gagal menyimpan referensi dimensi Profil Lulusan ke Firebase.'
        };
      }
    }
    updateDbAndSave((prev) => ({ ...prev, kokurikulerDimensions: dims }), true);
    logActivity(currentUser, 'Simpan Referensi Dimensi Kokurikuler', `Memperbarui status master ${dims.length} dimensi Profil Lulusan.`);
    return { success: true };
  };

  const handleSaveKokurikulerThemes = async (
    themes: KokurikulerThemeMaster[]
  ): Promise<{ success: boolean; error?: string }> => {
    for (const t of themes) {
      const res = await surgicalSync('kokurikuler_themes', t.id, t);
      if (!res.success || res.quotaExceeded) {
        return {
          success: false,
          error: res.error || 'Gagal menyimpan referensi tema kokurikuler ke Firebase.'
        };
      }
    }
    updateDbAndSave((prev) => ({ ...prev, kokurikulerThemes: themes }), true);
    logActivity(currentUser, 'Simpan Tema Kokurikuler', `Memperbarui ${themes.length} tema kegiatan kokurikuler.`);
    return { success: true };
  };

  const handleSaveKokurikulerScores = async (
    newScores: KokurikulerScore[]
  ): Promise<{ success: boolean; count: number; error?: string }> => {
    const res = await saveKokurikulerScoresDirect(newScores);
    if (!res.success) {
      return {
        success: false,
        count: 0,
        error: res.error || 'Gagal menyimpan capaian kokurikuler ke Firebase Firestore.'
      };
    }
    updateDbAndSave(
      (prev) => {
        const map = new Map((prev.kokurikulerScores || []).map((s) => [s.id, s]));
        newScores.forEach((sc) => map.set(sc.id, sc));
        return { ...prev, kokurikulerScores: Array.from(map.values()) };
      },
      true
    );
    logActivity(currentUser, 'Simpan Nilai Kokurikuler', `Menyimpan ${newScores.length} capaian subdimensi kokurikuler ke Firebase.`);
    return { success: true, count: res.count };
  };

  const handleSaveKokurikulerDescriptions = async (
    newDescs: KokurikulerDescription[]
  ): Promise<{ success: boolean; count: number; error?: string }> => {
    const res = await saveKokurikulerDescriptionsDirect(newDescs);
    if (!res.success) {
      return {
        success: false,
        count: 0,
        error: res.error || 'Gagal menyimpan deskripsi kokurikuler ke Firebase Firestore.'
      };
    }
    updateDbAndSave(
      (prev) => {
        const map = new Map((prev.kokurikulerDescriptions || []).map((d) => [d.id, d]));
        newDescs.forEach((d) => map.set(d.id, d));
        return { ...prev, kokurikulerDescriptions: Array.from(map.values()) };
      },
      true
    );
    logActivity(currentUser, 'Simpan Deskripsi Kokurikuler', `Menyimpan ${newDescs.length} deskripsi rapor kokurikuler ke Firebase.`);
    return { success: true, count: res.count };
  };

  // If user is not authenticated or not logged in, show official Login View
  if (!isAuthenticated || !currentUser) {
    return (
      <LoginView
        school={db.schoolProfile}
        allUsers={db.users}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* Sidebar navigation */}
      <Sidebar
        activeMenu={activeMenu}
        onSelectMenu={(menu) => setActiveMenu(menu)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        userRole={effectiveUser.role}
        counts={{
          students: db.students.length,
          teachers: db.teachers.length,
          classes: db.classrooms.length,
          subjects: db.subjects.length
        }}
      />

      {/* Main Content Container (ml-72 on desktop, full width on mobile) */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-72 min-h-screen print:ml-0 print:m-0 print:w-full print:min-h-0">
        {/* Header bar */}
        <Header
          school={db.schoolProfile}
          currentUser={effectiveUser}
          onSwitchUser={handleSwitchUser}
          allUsers={db.users}
          notifications={db.notifications}
          onMarkNotificationRead={handleMarkNotificationRead}
          onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onOpenQuickSettings={() => setIsQuickSettingsOpen(true)}
          cloudSyncState={cloudSyncState}
          onTriggerSync={handleManualSyncToCloud}
          onReconnect={handleReconnect}
          onLogout={handleLogout}
          activeDutyMode={dutyMode}
          onToggleDutyMode={setDutyMode}
          canSwitchDutyMode={canSwitchDutyMode}
          homeroomClassName={homeroomClass?.name}
          authContext={authContext}
          lastSaveStatus={lastSaveStatus}
        />

        {/* Global Action / Server Error / Conflict Banner */}
        {appAlertBanner && (
          <div
            className={`mx-4 sm:mx-6 lg:mx-8 mt-4 p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 shadow-xs ${
              appAlertBanner.type === 'error'
                ? 'bg-rose-50 border-rose-300 text-rose-900'
                : appAlertBanner.type === 'warning'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-emerald-50 border-emerald-300 text-emerald-900'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              {appAlertBanner.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{appAlertBanner.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setAppAlertBanner(null)}
              className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 custom-scrollbar print:p-0 print:m-0 print:overflow-visible">
          {activeMenu === 'dashboard' && (
            <DashboardView
              school={db.schoolProfile}
              students={db.students}
              teachers={db.teachers}
              classrooms={db.classrooms}
              subjects={db.subjects}
              scores={db.scores}
              currentUser={effectiveUser}
              onNavigate={(m) => setActiveMenu(m)}
              onOpenQuickSettings={() => setIsQuickSettingsOpen(true)}
              cloudSyncState={cloudSyncState}
            />
          )}

          {activeMenu === 'data-referensi' && <DataReferensiView />}

          {activeMenu === 'buku-induk' && (
            <BukuIndukView
              school={db.schoolProfile}
              students={db.students}
              classrooms={db.classrooms}
              subjects={db.subjects}
              scores={db.scores}
              attendanceList={db.attendance}
              extracurriculars={db.extracurriculars}
              studentExtracurriculars={db.studentExtracurriculars}
              homeroomNotes={db.homeroomNotes}
              studentMutations={db.studentMutations || []}
              studentAchievements={db.studentAchievements || []}
              kokurikulerProjects={db.kokurikulerProjects || []}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'manajemen-tahun-ajaran' && (
            effectiveUser.role === 'admin' || effectiveUser.role === 'kepsek' ? (
              <ManajemenTahunAjaranView
                schoolProfile={db.schoolProfile}
                academicYears={db.academicYears || []}
                students={db.students}
                scores={db.scores}
                auditLogs={db.auditLogs}
                currentUser={effectiveUser}
                onUpdateAcademicYears={(years, activeYear, activeSemester, reportDate) => {
                  handleUpdateAcademicYears(years, activeYear, activeSemester);
                  if (reportDate) {
                    handleUpdateSchoolSettings({ reportDate });
                  }
                }}
                onLogAudit={(action, details) => logActivity(currentUser, action, details)}
              />
            ) : (
              <SecurityAccessDenied
                currentUser={effectiveUser}
                customMessage="Akses Ditolak: Manajemen Tahun Ajaran & Semester hanya dapat diakses oleh Administrator dan Kepala Sekolah."
              />
            )
          )}

          {activeMenu === 'data-sekolah' && (
            effectiveUser.role === 'admin' || effectiveUser.role === 'kepsek' ? (
              <DataSekolahView
                school={db.schoolProfile}
                onSave={handleSaveSchool}
                currentUser={effectiveUser}
              />
            ) : (
              <SecurityAccessDenied
                currentUser={effectiveUser}
                customMessage="Akses Ditolak: Data Identitas Sekolah hanya dapat diakses oleh Administrator dan Kepala Sekolah."
              />
            )
          )}

          {activeMenu === 'data-guru' && (
            effectiveUser.role === 'admin' || effectiveUser.role === 'kepsek' ? (
              <DataGuruView
                teachers={db.teachers}
                subjects={db.subjects}
                classrooms={db.classrooms}
                onSaveTeacher={handleSaveTeacher}
                onDeleteTeacher={handleDeleteTeacher}
                currentUser={effectiveUser}
              />
            ) : (
              <SecurityAccessDenied
                currentUser={effectiveUser}
                customMessage="Akses Ditolak: Pengelolaan Data Guru & GTK hanya diperuntukkan bagi Administrator Sistem."
              />
            )
          )}

          {activeMenu === 'data-siswa' && (
            <DataSiswaView
              students={db.students}
              classrooms={db.classrooms}
              onSaveStudent={handleSaveStudent}
              onDeleteStudent={handleDeleteStudent}
              onNavigateToImport={() => setActiveMenu('impor-ekspor')}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'rombel' && (
            <RombelView
              classrooms={db.classrooms}
              teachers={db.teachers}
              curricula={db.curricula}
              students={db.students}
              onSaveClassroom={handleSaveClassroom}
              onDeleteClassroom={handleDeleteClassroom}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'data-mapel' && (
            <DataMapelView
              subjects={db.subjects}
              onSaveSubject={handleSaveSubject}
              onDeleteSubject={handleDeleteSubject}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'data-kurikulum' && (
            <DataKurikulumView
              curricula={db.curricula}
              onSaveCurricula={handleSaveCurricula}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'penugasan-guru' && (
            <PenugasanGuruView
              teachers={db.teachers}
              subjects={db.subjects}
              classrooms={db.classrooms}
              students={db.students}
              teachingAssignments={db.teachingAssignments || []}
              onSaveAssignments={handleSaveTeachingAssignments}
              onDeleteAssignment={handleDeleteTeachingAssignment}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'data-pembelajaran' && (
            <DataPembelajaranView
              learningObjectives={db.learningObjectives}
              subjects={db.subjects}
              curricula={db.curricula}
              onSaveObjective={handleSaveObjective}
              onDeleteObjective={handleDeleteObjective}
              currentUser={effectiveUser}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              teachingAssignments={db.teachingAssignments || EMPTY_ARRAY}
              teachers={db.teachers}
              assessmentPolicy={db.assessmentPolicy || DEFAULT_ASSESSMENT_POLICY}
            />
          )}

          {activeMenu === 'data-ekskul' && (
            <DataEkskulView
              extracurriculars={db.extracurriculars}
              studentExtracurriculars={db.studentExtracurriculars}
              classrooms={db.classrooms}
              students={db.students}
              onSaveExtracurricular={handleSaveExtracurricular}
              onDeleteExtracurricular={handleDeleteExtracurricular}
              onSaveStudentEkskul={handleSaveStudentEkskul}
              onSaveStudentEkskulBatch={handleSaveStudentEkskulBatch}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'data-absensi' && (
            <DataAbsensiView
              attendanceList={db.attendance}
              classrooms={db.classrooms}
              students={db.students}
              onSaveAttendance={handleSaveAttendance}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'kktp-config' && (
            <KKTPConfigView
              subjects={db.subjects}
              learningObjectives={db.learningObjectives}
              kktpConfigs={db.kktpConfigs || []}
              onSaveKKTP={handleSaveKKTP}
              currentUser={effectiveUser}
              teachingAssignments={db.teachingAssignments || []}
              teachers={db.teachers}
            />
          )}

          {activeMenu === 'asesmen-formatif' && (
            <AsesmenFormatifView
              classrooms={db.classrooms}
              subjects={db.subjects}
              students={db.students}
              learningObjectives={db.learningObjectives}
              learningChapters={db.learningChapters || EMPTY_ARRAY}
              summativePlans={db.summativePlans || EMPTY_ARRAY}
              formativeAssessments={db.formativeAssessments || EMPTY_ARRAY}
              summativeAssessments={db.summativeAssessments || EMPTY_ARRAY}
              scores={db.scores}
              onSaveScores={handleSaveScores}
              onSaveObjective={handleSaveObjective}
              onDeleteObjective={handleDeleteObjective}
              onNavigateToSpreadsheet={() => handleSelectMenu('pengolahan-nilai-tabel')}
              currentUser={effectiveUser}
              teachingAssignments={db.teachingAssignments || EMPTY_ARRAY}
              teachers={db.teachers}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              assessmentPolicy={db.assessmentPolicy || DEFAULT_ASSESSMENT_POLICY}
              authContext={authContext}
            />
          )}

          {activeMenu === 'asesmen-sumatif' && (
            <AsesmenSumatifView
              classrooms={db.classrooms}
              subjects={db.subjects}
              students={db.students}
              curricula={db.curricula}
              learningObjectives={db.learningObjectives}
              learningChapters={db.learningChapters || EMPTY_ARRAY}
              summativePlans={db.summativePlans || EMPTY_ARRAY}
              summativeAssessments={db.summativeAssessments || EMPTY_ARRAY}
              scores={db.scores}
              onSaveScores={handleSaveScores}
              onSaveLearningChapter={handleSaveLearningChapter}
              onDeleteLearningChapter={handleDeleteLearningChapter}
              onNavigateToSpreadsheet={() => handleSelectMenu('pengolahan-nilai-tabel')}
              currentUser={effectiveUser}
              teachingAssignments={db.teachingAssignments || EMPTY_ARRAY}
              teachers={db.teachers}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              assessmentPolicy={db.assessmentPolicy || DEFAULT_ASSESSMENT_POLICY}
              authContext={authContext}
            />
          )}

          {activeMenu === 'pengolahan-nilai-tabel' && (
            <PengolahanNilaiTabelView
              schoolName={db.schoolProfile?.name || 'SMP Negeri 1 Rangsang'}
              classrooms={db.classrooms}
              students={db.students}
              subjects={db.subjects}
              curricula={db.curricula}
              teachers={db.teachers}
              teachingAssignments={db.teachingAssignments || EMPTY_ARRAY}
              learningObjectives={db.learningObjectives}
              learningChapters={db.learningChapters || EMPTY_ARRAY}
              summativePlans={db.summativePlans || EMPTY_ARRAY}
              summativeAssessments={db.summativeAssessments || EMPTY_ARRAY}
              formativeAssessments={db.formativeAssessments || EMPTY_ARRAY}
              scores={db.scores}
              academicYears={db.academicYears}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              currentUser={effectiveUser}
              assessmentPolicy={db.assessmentPolicy || DEFAULT_ASSESSMENT_POLICY}
              authContext={authContext}
              lastSaveStatus={lastSaveStatus}
              onSaveSpreadsheetBatch={handleSaveSpreadsheetBatch}
              onConfirmExcelImport={handleConfirmExcelImport}
            />
          )}

          {activeMenu === 'pengolahan-nilai-akhir' && (
            <PengolahanNilaiAkhirView
              classrooms={db.classrooms}
              students={db.students}
              subjects={db.subjects}
              learningObjectives={db.learningObjectives}
              learningChapters={db.learningChapters || []}
              formativeAssessments={db.formativeAssessments || EMPTY_ARRAY}
              summativeAssessments={db.summativeAssessments || EMPTY_ARRAY}
              kktpConfigs={db.kktpConfigs || EMPTY_ARRAY}
              finalScoreConfigs={db.finalScoreConfigs || EMPTY_ARRAY}
              scores={db.scores}
              descriptionBank={db.descriptionBank}
              assessmentPolicy={db.assessmentPolicy || DEFAULT_ASSESSMENT_POLICY}
              onSaveScores={handleSaveScores}
              onConfirmExcelImport={handleConfirmExcelImport}
              onSaveConfig={handleSaveFinalScoreConfig}
              onNavigateToDescriptions={() => handleSelectMenu('deskripsi-nilai')}
              currentUser={effectiveUser}
              teachingAssignments={db.teachingAssignments || EMPTY_ARRAY}
              teachers={db.teachers}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              curricula={db.curricula}
            />
          )}

          {(activeMenu === 'kokurikuler-kelompok' ||
            activeMenu === 'kokurikuler-kegiatan' ||
            activeMenu === 'kokurikuler-profil') && (
            <KokurikulerDataView
              activeTab={
                activeMenu === 'kokurikuler-kelompok'
                  ? 'kelompok'
                  : activeMenu === 'kokurikuler-kegiatan'
                  ? 'kegiatan'
                  : 'profil-lulusan'
              }
              onChangeTab={(tab) =>
                handleSelectMenu(
                  tab === 'kelompok'
                    ? 'kokurikuler-kelompok'
                    : tab === 'kegiatan'
                    ? 'kokurikuler-kegiatan'
                    : 'kokurikuler-profil'
                )
              }
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              currentUser={effectiveUser}
              teachers={db.teachers}
              students={db.students}
              classrooms={db.classrooms}
              dimensions={db.kokurikulerDimensions || EMPTY_ARRAY}
              themes={db.kokurikulerThemes || EMPTY_ARRAY}
              groups={db.kokurikulerGroups || EMPTY_ARRAY}
              activities={db.kokurikulerActivities || EMPTY_ARRAY}
              scores={db.kokurikulerScores || EMPTY_ARRAY}
              descriptions={db.kokurikulerDescriptions || EMPTY_ARRAY}
              onSaveGroup={handleSaveKokurikulerGroup}
              onDeleteGroup={handleDeleteKokurikulerGroup}
              onSaveActivity={handleSaveKokurikulerActivity}
              onDeleteActivity={handleDeleteKokurikulerActivity}
              onSaveDimensions={handleSaveKokurikulerDimensions}
              onSaveThemes={handleSaveKokurikulerThemes}
            />
          )}

          {(activeMenu === 'kokurikuler-input' ||
            activeMenu === 'kokurikuler-import' ||
            activeMenu === 'kokurikuler-deskripsi') && (
            effectiveUser.role === 'admin' ||
            effectiveUser.role === 'guru' ||
            effectiveUser.role === 'walikelas' ? (
              <KokurikulerNilaiView
                activeTab={
                  activeMenu === 'kokurikuler-input'
                    ? 'input'
                    : activeMenu === 'kokurikuler-import'
                    ? 'import'
                    : 'deskripsi'
                }
                onChangeTab={(tab) =>
                  handleSelectMenu(
                    tab === 'input'
                      ? 'kokurikuler-input'
                      : tab === 'import'
                      ? 'kokurikuler-import'
                      : 'kokurikuler-deskripsi'
                  )
                }
                onBackToData={() => handleSelectMenu('kokurikuler-kelompok')}
                schoolName={db.schoolProfile.name}
                academicYear={db.schoolProfile.activeAcademicYear}
                semester={db.schoolProfile.activeSemester}
                currentUser={effectiveUser}
                students={db.students}
                classrooms={db.classrooms}
                dimensions={db.kokurikulerDimensions || EMPTY_ARRAY}
                groups={db.kokurikulerGroups || EMPTY_ARRAY}
                activities={db.kokurikulerActivities || EMPTY_ARRAY}
                scores={db.kokurikulerScores || EMPTY_ARRAY}
                descriptions={db.kokurikulerDescriptions || EMPTY_ARRAY}
                onSaveScores={handleSaveKokurikulerScores}
                onSaveDescriptions={handleSaveKokurikulerDescriptions}
              />
            ) : (
              <SecurityAccessDenied
                currentUser={effectiveUser}
                customMessage="Akses Ditolak: Penginputan & Deskripsi Nilai Kokurikuler hanya diperuntukkan bagi Koordinator/Guru Penilai, Wali Kelas, dan Administrator."
              />
            )
          )}

          {(activeMenu === 'kokurikuler-rekap-siswa' ||
            activeMenu === 'kokurikuler-rekap-kelompok' ||
            activeMenu === 'kokurikuler-cetak') && (
            <KokurikulerLaporanView
              activeTab={
                activeMenu === 'kokurikuler-rekap-siswa'
                  ? 'rekap-siswa'
                  : activeMenu === 'kokurikuler-rekap-kelompok'
                  ? 'rekap-kelompok'
                  : 'cetak-laporan'
              }
              onChangeTab={(tab) =>
                handleSelectMenu(
                  tab === 'rekap-siswa'
                    ? 'kokurikuler-rekap-siswa'
                    : tab === 'rekap-kelompok'
                    ? 'kokurikuler-rekap-kelompok'
                    : 'kokurikuler-cetak'
                )
              }
              school={db.schoolProfile}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              currentUser={effectiveUser}
              students={db.students}
              classrooms={db.classrooms}
              dimensions={db.kokurikulerDimensions || EMPTY_ARRAY}
              groups={db.kokurikulerGroups || EMPTY_ARRAY}
              activities={db.kokurikulerActivities || EMPTY_ARRAY}
              scores={db.kokurikulerScores || EMPTY_ARRAY}
              descriptions={db.kokurikulerDescriptions || EMPTY_ARRAY}
            />
          )}

          {activeMenu === 'input-nilai' && (
            <InputNilaiView
              schoolName={db.schoolProfile?.name || 'SMP Negeri 1 Rangsang'}
              classrooms={db.classrooms}
              subjects={db.subjects}
              students={db.students}
              learningObjectives={db.learningObjectives}
              learningChapters={db.learningChapters || EMPTY_ARRAY}
              scores={db.scores}
              curricula={db.curricula}
              teachers={db.teachers}
              teachingAssignments={db.teachingAssignments || EMPTY_ARRAY}
              onSaveScores={handleSaveScores}
              onConfirmExcelImport={handleConfirmExcelImport}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              currentUser={effectiveUser}
              summativeAssessments={db.summativeAssessments || EMPTY_ARRAY}
              formativeAssessments={db.formativeAssessments || EMPTY_ARRAY}
              kktpConfigs={db.kktpConfigs || EMPTY_ARRAY}
              descriptionBank={db.descriptionBank}
              assessmentPolicy={db.assessmentPolicy || DEFAULT_ASSESSMENT_POLICY}
            />
          )}

          {activeMenu === 'pengolahan-nilai' && (
            <PengolahanNilaiView
              school={db.schoolProfile}
              classrooms={db.classrooms}
              subjects={db.subjects}
              students={db.students}
              scores={db.scores}
              teachers={db.teachers}
              teachingAssignments={db.teachingAssignments || []}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'deskripsi-nilai' && (
            <DeskripsiNilaiView
              classrooms={db.classrooms}
              subjects={db.subjects}
              students={db.students}
              scores={db.scores}
              learningObjectives={db.learningObjectives}
              formativeAssessments={db.formativeAssessments || EMPTY_ARRAY}
              summativeAssessments={db.summativeAssessments || EMPTY_ARRAY}
              kktpConfigs={db.kktpConfigs || EMPTY_ARRAY}
              descriptionBank={db.descriptionBank}
              assessmentPolicy={db.assessmentPolicy || DEFAULT_ASSESSMENT_POLICY}
              teachers={db.teachers}
              teachingAssignments={db.teachingAssignments || []}
              onSaveScores={handleSaveScores}
              onSaveDescriptionBank={handleSaveDescriptionBank}
              onSaveAssessmentPolicy={handleSaveAssessmentPolicy}
              onBack={() => handleSelectMenu('input-nilai')}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'rekap-nilai-mapel' && (
            <RekapNilaiMapelView
              db={db}
              currentUser={effectiveUser}
              onSaveScores={handleSaveScores}
            />
          )}

          {activeMenu === 'rekap-nilai' && (
            <RekapitulasiNilaiView
              classrooms={db.classrooms}
              subjects={db.subjects}
              students={db.students}
              scores={db.scores}
              teachingAssignments={db.teachingAssignments || EMPTY_ARRAY}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'leger-nilai' && (
            <LegerNilaiView
              school={db.schoolProfile}
              classrooms={db.classrooms}
              subjects={db.subjects}
              students={db.students}
              scores={db.scores}
              teachers={db.teachers}
              teachingAssignments={db.teachingAssignments || EMPTY_ARRAY}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'pengolahan-rapor' && (
            <PengolahanRaporView
              classrooms={db.classrooms}
              students={db.students}
              subjects={db.subjects}
              scores={db.scores}
              attendanceList={db.attendance}
              studentExtracurriculars={db.studentExtracurriculars}
              homeroomNotes={db.homeroomNotes}
              teachingAssignments={db.teachingAssignments || EMPTY_ARRAY}
              onSaveHomeroomNotes={handleSaveHomeroomNotes}
              onNavigateToPrint={handleNavigateToPrint}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'transkrip-nilai' && (
            <TranskripNilaiView
              school={db.schoolProfile}
              students={db.students}
              classrooms={db.classrooms}
              subjects={db.subjects}
              scores={db.scores}
              homeroomNotes={db.homeroomNotes}
              currentUser={effectiveUser}
              onSaveScores={handleSaveScores}
            />
          )}

          {activeMenu === 'kenaikan-kelas' && (
            <KenaikanKelasView
              classrooms={db.classrooms}
              students={db.students}
              subjects={db.subjects}
              scores={db.scores}
              attendanceList={db.attendance}
              homeroomNotes={db.homeroomNotes}
              mutations={db.studentMutations || []}
              onSaveDecisions={handleSaveHomeroomNotes}
              onPromoteStudents={handlePromoteStudents}
              onSaveMutations={handleSaveMutations}
              onAddStudent={handleSaveStudent}
              onUpdateStudent={handleSaveStudent}
              onBatchGraduation={handleBatchGraduation}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'cetak-rapor' && (
            <CetakRaporView
              school={db.schoolProfile}
              classrooms={db.classrooms}
              students={db.students}
              subjects={db.subjects}
              scores={db.scores}
              attendanceList={db.attendance}
              extracurriculars={db.extracurriculars}
              studentExtracurriculars={db.studentExtracurriculars}
              homeroomNotes={db.homeroomNotes}
              teachers={db.teachers}
              teachingAssignments={db.teachingAssignments || EMPTY_ARRAY}
              preselectedStudentId={targetPrintStudentId}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              currentUser={effectiveUser}
              kokurikulerGroups={db.kokurikulerGroups || EMPTY_ARRAY}
              kokurikulerActivities={db.kokurikulerActivities || EMPTY_ARRAY}
              kokurikulerDescriptions={db.kokurikulerDescriptions || EMPTY_ARRAY}
              kokurikulerScores={db.kokurikulerScores || EMPTY_ARRAY}
            />
          )}

          {activeMenu === 'laporan-sekolah' && (
            effectiveUser.role === 'admin' || effectiveUser.role === 'kepsek' ? (
              <LaporanSekolahView
                school={db.schoolProfile}
                classrooms={db.classrooms}
                students={db.students}
                teachers={db.teachers}
                subjects={db.subjects}
                scores={db.scores}
                attendanceList={db.attendance}
                teachingAssignments={db.teachingAssignments || EMPTY_ARRAY}
                academicYear={db.schoolProfile.activeAcademicYear}
                semester={db.schoolProfile.activeSemester}
                currentUser={effectiveUser}
              />
            ) : (
              <SecurityAccessDenied
                currentUser={effectiveUser}
                customMessage="Akses Ditolak: Laporan Statistik Sekolah hanya dapat diakses oleh Kepala Sekolah dan Administrator."
              />
            )
          )}

          {activeMenu === 'impor-ekspor' && (
            effectiveUser.role === 'admin' ? (
              <ImporEksporDapodikView
                students={db.students}
                teachers={db.teachers}
                classrooms={db.classrooms}
                subjects={db.subjects}
                scores={db.scores}
                onImportStudents={handleImportStudents}
                currentUser={effectiveUser}
              />
            ) : (
              <SecurityAccessDenied
                currentUser={effectiveUser}
                customMessage="Akses Ditolak: Fitur Impor & Ekspor Dapodik hanya dapat diakses oleh Administrator."
              />
            )
          )}

          {activeMenu === 'manajemen-wali-kelas' && (
            effectiveUser.role === 'admin' ? (
              <ManajemenWaliKelasView
                users={db.users}
                teachers={db.teachers}
                classrooms={db.classrooms}
                currentUser={effectiveUser}
                onSaveWaliKelas={handleSaveWaliKelas}
                onDeleteUser={handleDeleteUser}
                onToggleStatus={handleToggleUserStatus}
                onResetPassword={handleResetUserPassword}
                onSwitchUser={(u) => {
                  handleSwitchUser(u);
                  setActiveMenu('dashboard');
                }}
              />
            ) : (
              <SecurityAccessDenied
                currentUser={effectiveUser}
                customMessage="Akses Ditolak: Manajemen Akun Wali Kelas hanya dapat diakses oleh Administrator."
              />
            )
          )}

          {activeMenu === 'manajemen-pengguna' && (
            effectiveUser.role === 'admin' ? (
              <ManajemenPenggunaView
                users={db.users}
                teachers={db.teachers}
                classrooms={db.classrooms}
                currentUser={effectiveUser}
                onSaveUser={handleSaveUser}
                onDeleteUser={handleDeleteUser}
                onToggleUserStatus={handleToggleUserStatus}
                onResetPassword={handleResetUserPassword}
                auditLogs={db.auditLogs}
                subjects={db.subjects}
                teachingAssignments={db.teachingAssignments || []}
              />
            ) : (
              <SecurityAccessDenied
                currentUser={effectiveUser}
                customMessage="Akses Ditolak: Manajemen Akun Pengguna hanya dapat diakses oleh Administrator Sistem."
              />
            )
          )}

          {activeMenu === 'pengaturan-bobot-nilai' && (
            <PengaturanBobotNilaiView
              assessmentPolicy={db.assessmentPolicy || DEFAULT_ASSESSMENT_POLICY}
              currentUser={effectiveUser}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              onSaveAssessmentPolicy={handleSaveAssessmentPolicy}
            />
          )}

          {activeMenu === 'pengaturan-aplikasi' && (
            effectiveUser.role === 'admin' || effectiveUser.role === 'kepsek' ? (
              <PengaturanAplikasiView
                school={db.schoolProfile}
                auditLogs={db.auditLogs}
                onUpdateSchoolSettings={handleUpdateSchoolSettings}
                onBackupDatabase={handleBackupDatabase}
                onRestoreDatabase={handleRestoreDatabase}
                onResetDatabase={handleResetDatabase}
                onPurgeMasterData={handlePurgeMasterData}
                currentUser={effectiveUser}
                db={db}
                onApplyRemoteData={handleApplyRemoteData}
                assessmentPolicy={db.assessmentPolicy || DEFAULT_ASSESSMENT_POLICY}
                onSaveAssessmentPolicy={handleSaveAssessmentPolicy}
              />
            ) : (
              <SecurityAccessDenied
                currentUser={effectiveUser}
                customMessage="Akses Ditolak: Pengaturan aplikasi hanya dapat diakses oleh Administrator dan Kepala Sekolah."
              />
            )
          )}
        </main>
      </div>

      {/* Quick Settings Modal (Triggered from header academic pill) */}
      {isQuickSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Periode & Tahun Pelajaran Aktif
              </h3>
              <button
                onClick={() => setIsQuickSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Pilih tahun pelajaran aktif untuk penginputan nilai dan pencetakan rapor. Sistem siap beroperasi jangka panjang dan berkelanjutan.
            </p>

            <div className="space-y-3.5 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Tahun Pelajaran</label>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = getCurrentSystemAcademicYear();
                      handleUpdateSchoolSettings({
                        activeAcademicYear: cur.academicYear,
                        activeSemester: cur.semester,
                        reportDate: getDefaultReportDate(cur.academicYear, cur.semester)
                      });
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-bold hover:underline"
                  >
                    Gunakan Tahun Sekarang ({getCurrentSystemAcademicYear().academicYear})
                  </button>
                </div>
                <select
                  value={db.schoolProfile.activeAcademicYear}
                  onChange={(e) => {
                    const yr = e.target.value;
                    handleUpdateSchoolSettings({
                      activeAcademicYear: yr,
                      reportDate: getDefaultReportDate(yr, db.schoolProfile.activeSemester)
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  {getAvailableAcademicYears(2023, 10).map((yr) => (
                    <option key={yr} value={yr}>
                      Tahun Pelajaran {yr} {yr === '2026/2027' ? '(Tahun Berjalan Saat Ini)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Semester</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateSchoolSettings({
                      activeSemester: 'Ganjil',
                      reportDate: getDefaultReportDate(db.schoolProfile.activeAcademicYear, 'Ganjil')
                    })}
                    className={`py-2 px-3 rounded-lg border font-bold text-xs transition ${
                      db.schoolProfile.activeSemester === 'Ganjil'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Semester Ganjil
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateSchoolSettings({
                      activeSemester: 'Genap',
                      reportDate: getDefaultReportDate(db.schoolProfile.activeAcademicYear, 'Genap')
                    })}
                    className={`py-2 px-3 rounded-lg border font-bold text-xs transition ${
                      db.schoolProfile.activeSemester === 'Genap'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Semester Genap
                  </button>
                </div>
              </div>

              {/* Data Safety Assurance Box */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] leading-relaxed flex items-start gap-2">
                <span className="text-sm">🛡️</span>
                <div>
                  <span className="font-bold block">Keamanan Data Historis:</span>
                  Data siswa, nilai, dan absensi di tahun-tahun pelajaran sebelumnya tetap aman tersimpan di database. Anda dapat beralih tahun kapan pun untuk memeriksa arsip nilai tanpa risiko data hilang.
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsQuickSettingsOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
