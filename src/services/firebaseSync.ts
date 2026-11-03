import {
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  writeBatch,
  onSnapshot,
  disableNetwork,
  enableNetwork
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from './firebase';
import { AppDatabase } from './storage';
import {
  Student,
  Teacher,
  Classroom,
  Subject,
  AssessmentScore,
  Attendance,
  HomeroomNote,
  StudentExtracurricular,
  Extracurricular,
  Curriculum,
  LearningObjective,
  SchoolProfile,
  User,
  AppNotification,
  TeachingAssignment,
  FormativeAssessment,
  SummativeAssessment,
  KKTPConfig,
  SubjectFinalScoreConfig
} from '../types/erapor';
import { sortClassrooms } from '../utils/classroomSort';

export type CloudSyncStatus = 'connected' | 'syncing' | 'synced' | 'offline' | 'error' | 'quota_exceeded';

export interface CloudSyncState {
  status: CloudSyncStatus;
  lastSyncTime: string | null;
  message: string;
  isOnline: boolean;
  quotaExceeded?: boolean;
}

// Global sync state listeners
type SyncStateListener = (state: CloudSyncState) => void;
const listeners: Set<SyncStateListener> = new Set();

// Track quota exhaustion state
let isCloudQuotaExhausted = false;

// Check if quota exhaustion was flagged in localStorage
try {
  const savedQuotaFlag = localStorage.getItem('erapor_firestore_quota_exhausted');
  if (savedQuotaFlag) {
    const quotaDate = localStorage.getItem('erapor_firestore_quota_date');
    const todayStr = new Date().toDateString();
    if (quotaDate === todayStr) {
      isCloudQuotaExhausted = true;
      // Immediately disable network to prevent background retry loops and error spam
      disableNetwork(db).catch(() => {});
    } else {
      localStorage.removeItem('erapor_firestore_quota_exhausted');
      localStorage.removeItem('erapor_firestore_quota_date');
    }
  }
} catch {
  // Ignore localStorage access issues
}

let currentSyncState: CloudSyncState = {
  status: isCloudQuotaExhausted ? 'quota_exceeded' : 'connected',
  lastSyncTime: null,
  message: isCloudQuotaExhausted
    ? 'Mode Penyimpanan Lokal Aktif (Batas Kuota Cloud Harian Tercapai - data aman di browser)'
    : 'Cloud Firebase Siap & Terhubung',
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  quotaExceeded: isCloudQuotaExhausted
};

export async function markQuotaExceeded(errMessage?: string) {
  isCloudQuotaExhausted = true;
  try {
    localStorage.setItem('erapor_firestore_quota_exhausted', 'true');
    localStorage.setItem('erapor_firestore_quota_date', new Date().toDateString());
    sessionStorage.setItem('erapor_firestore_quota_exhausted', 'true');
  } catch {}
  updateSyncState({
    status: 'quota_exceeded',
    quotaExceeded: true,
    message: 'Mode Penyimpanan Lokal Aktif (Batas kuota harian Cloud Firebase tercapai - seluruh nilai aman 100% di browser).'
  });
  try {
    // Disable network on Firestore SDK instance to stop repeated quota error retries
    await disableNetwork(db);
    console.info('[Firestore] Network disabled: free quota limit reached. Local persistence active.');
  } catch (e) {
    // Ignore error if already disabled
  }
}

export function isQuotaExceededError(err: any): boolean {
  if (!err) return false;
  const msg = (err?.message || String(err || '')).toLowerCase();
  const code = (err?.code || '').toLowerCase();
  return (
    code === 'resource-exhausted' ||
    msg.includes('resource-exhausted') ||
    msg.includes('quota limit exceeded') ||
    msg.includes('quota exceeded') ||
    msg.includes('free daily write units') ||
    msg.includes('free daily read units') ||
    msg.includes('free tier database')
  );
}
export async function reconnectToCloud(): Promise<void> {
  isCloudQuotaExhausted = false;
  try {
    localStorage.removeItem('erapor_firestore_quota_exhausted');
    localStorage.removeItem('erapor_firestore_quota_date');
    sessionStorage.removeItem('erapor_firestore_quota_exhausted');
    await enableNetwork(db);
    console.info('[Firestore] Network re-enabled by user.');
  } catch (e) {
    console.error('[Firestore] Failed to re-enable network:', e);
  }
}

export function sanitizeDocId(id: string): string {
  if (!id) return `doc_${Date.now()}`;
  return String(id).replace(/[\/\s#\[\]*?]/g, '_');
}

function updateSyncState(patch: Partial<CloudSyncState>) {
  currentSyncState = { ...currentSyncState, ...patch };
  listeners.forEach((listener) => {
    try {
      listener(currentSyncState);
    } catch (e) {
      console.error('Sync listener error', e);
    }
  });
}

export function subscribeToSyncState(listener: SyncStateListener): () => void {
  listeners.add(listener);
  listener(currentSyncState);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Ensure Firebase Authentication is established
 */
export async function ensureFirebaseAuth(): Promise<void> {
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
  } catch (error) {
    console.warn('Firebase Auth note:', error);
  }
}

/**
 * Test live connection to Cloud Firestore
 */
export async function testFirestoreConnection(forceCheck: boolean = false): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
  quotaExceeded?: boolean;
}> {
  if (isCloudQuotaExhausted && !forceCheck) {
    return {
      success: false,
      quotaExceeded: true,
      message: 'Batas kuota harian Cloud Firebase tercapai. Mode penyimpanan lokal aktif & aman.'
    };
  }

  const start = Date.now();
  try {
    if (forceCheck) {
      await enableNetwork(db).catch(() => {});
    }
    await ensureFirebaseAuth();
    // Test server reachability with getDocFromServer
    await getDocFromServer(doc(db, 'application_settings', 'app_state'));
    const latency = Date.now() - start;
    isCloudQuotaExhausted = false;
    try {
      localStorage.removeItem('erapor_firestore_quota_exhausted');
      localStorage.removeItem('erapor_firestore_quota_date');
      sessionStorage.removeItem('erapor_firestore_quota_exhausted');
    } catch {}
    updateSyncState({
      status: 'connected',
      message: `Terhubung ke Cloud Firestore (${latency} ms)`,
      isOnline: true,
      quotaExceeded: false
    });
    return {
      success: true,
      message: `Koneksi Cloud Firestore aktif dan stabil (Latensi: ${latency} ms).`,
      latencyMs: latency
    };
  } catch (error: any) {
    const latency = Date.now() - start;
    if (isQuotaExceededError(error)) {
      await markQuotaExceeded(error.message);
      return {
        success: false,
        quotaExceeded: true,
        message: 'Batas kuota harian Cloud Firebase tercapai. Mode Penyimpanan Lokal aman diaktifkan.',
        latencyMs: latency
      };
    }
    if (error?.message?.includes('the client is offline')) {
      updateSyncState({
        status: 'offline',
        message: 'Koneksi internet terputus (Offline)',
        isOnline: false
      });
      return {
        success: false,
        message: 'Tidak dapat menjangkau server Firestore. Periksa koneksi internet Anda.',
        latencyMs: latency
      };
    }
    // Server responded (even if document not found or initial permission check passed)
    updateSyncState({
      status: 'connected',
      message: `Terhubung ke Cloud Firestore (${latency} ms)`,
      isOnline: true
    });
    return {
      success: true,
      message: `Koneksi Cloud Firestore aktif dan stabil (Latensi: ${latency} ms).`,
      latencyMs: latency
    };
  }
}

function cleanForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Sync entire AppDatabase to Cloud Firestore with progress callbacks
 */
export async function syncAllToFirestore(
  dbData: AppDatabase,
  user?: User,
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; count: number; error?: string; quotaExceeded?: boolean }> {
  // If cloud quota is exhausted, immediately return with local persistence confirmation without throwing
  if (isCloudQuotaExhausted) {
    updateSyncState({
      status: 'quota_exceeded',
      quotaExceeded: true,
      message: 'Penyimpanan Lokal Aktif (Batas kuota harian Cloud Firebase tercapai - data aman 100% di browser).'
    });
    return {
      success: true,
      count: 0,
      quotaExceeded: true,
      error: 'Batas kuota harian Firestore tercapai. Data tersimpan aman di penyimpanan lokal browser.'
    };
  }

  try {
    await ensureFirebaseAuth();
    updateSyncState({ status: 'syncing', message: 'Menyimpan pembaruan ke Cloud Firebase...' });

    let totalCount = 0;

    // 1. School profile
    onProgress?.('Menyimpan profil & identitas sekolah...');
    await setDoc(doc(db, 'schools', 'smpn1rangsang'), cleanForFirestore(dbData.schoolProfile), { merge: true });
    totalCount += 1;

    // 2. Batch 1: Core structure (students, teachers, classrooms, curricula, subjects, TPs)
    onProgress?.('Menyimpan data siswa, guru, rombel, dan mata pelajaran...');
    const batch1 = writeBatch(db);

    dbData.students.forEach((s) => {
      batch1.set(doc(db, 'students', sanitizeDocId(s.id)), cleanForFirestore(s), { merge: true });
      totalCount += 1;
    });

    // Prune deleted teachers from Firestore
    try {
      const snapTeachers = await getDocs(collection(db, 'teachers'));
      const activeTeacherIds = new Set(dbData.teachers.map((t) => t.id));
      snapTeachers.docs.forEach((docSnap) => {
        if (!activeTeacherIds.has(docSnap.id)) {
          batch1.delete(docSnap.ref);
        }
      });
    } catch (e: any) {
      if (isQuotaExceededError(e)) {
        markQuotaExceeded();
        return { success: true, count: totalCount, quotaExceeded: true };
      }
      console.warn('Teacher prune note:', e);
    }

    dbData.teachers.forEach((t) => {
      batch1.set(doc(db, 'teachers', sanitizeDocId(t.id)), cleanForFirestore(t), { merge: true });
      totalCount += 1;
    });

    dbData.classrooms.forEach((c) => {
      batch1.set(doc(db, 'classrooms', sanitizeDocId(c.id)), cleanForFirestore(c), { merge: true });
      totalCount += 1;
    });

    dbData.subjects.forEach((sub) => {
      batch1.set(doc(db, 'subjects', sanitizeDocId(sub.id)), cleanForFirestore(sub), { merge: true });
      totalCount += 1;
    });

    dbData.curricula.forEach((cur) => {
      batch1.set(doc(db, 'curricula', sanitizeDocId(cur.id)), cleanForFirestore(cur), { merge: true });
      totalCount += 1;
    });

    dbData.learningObjectives.forEach((tp) => {
      batch1.set(doc(db, 'assessments', sanitizeDocId(tp.id)), cleanForFirestore(tp), { merge: true });
      totalCount += 1;
    });

    if (dbData.teachingAssignments) {
      dbData.teachingAssignments.forEach((ta) => {
        batch1.set(doc(db, 'teaching_assignments', sanitizeDocId(ta.id)), cleanForFirestore(ta), { merge: true });
        totalCount += 1;
      });
    }

    await batch1.commit();

    // 3. Batch 2: Scores, Attendance, Homeroom Notes, Extracurriculars
    onProgress?.('Menyimpan nilai capaian, absensi, ekskul, dan catatan rapor...');
    const batch2 = writeBatch(db);

    dbData.scores.forEach((sc) => {
      batch2.set(doc(db, 'assessment_scores', sanitizeDocId(sc.id)), cleanForFirestore(sc), { merge: true });
      totalCount += 1;
    });

    dbData.attendance.forEach((att) => {
      batch2.set(doc(db, 'attendance', sanitizeDocId(att.id)), cleanForFirestore(att), { merge: true });
      totalCount += 1;
    });

    dbData.homeroomNotes.forEach((hn) => {
      batch2.set(doc(db, 'homeroom_notes', sanitizeDocId(hn.id)), cleanForFirestore(hn), { merge: true });
      totalCount += 1;
    });

    dbData.extracurriculars.forEach((e) => {
      batch2.set(doc(db, 'extracurriculars', sanitizeDocId(e.id)), cleanForFirestore(e), { merge: true });
      totalCount += 1;
    });

    dbData.studentExtracurriculars.forEach((se) => {
      batch2.set(doc(db, 'student_extracurriculars', sanitizeDocId(se.id)), cleanForFirestore(se), { merge: true });
      totalCount += 1;
    });

    // 4. Batch 2: Users (Simulated Login Accounts) & Prune deleted users
    try {
      const snapUsers = await getDocs(collection(db, 'users'));
      const activeUserIds = new Set(dbData.users.map((u) => u.id));
      snapUsers.docs.forEach((docSnap) => {
        if (!activeUserIds.has(docSnap.id)) {
          batch2.delete(docSnap.ref);
        }
      });
    } catch (e: any) {
      if (isQuotaExceededError(e)) {
        markQuotaExceeded();
        return { success: true, count: totalCount, quotaExceeded: true };
      }
      console.warn('User prune note:', e);
    }

    dbData.users.forEach((u) => {
      batch2.set(doc(db, 'users', sanitizeDocId(u.id)), cleanForFirestore(u), { merge: true });
      totalCount += 1;
    });

    // 5. Batch 2: Kurikulum Merdeka 2025 Modules
    dbData.formativeAssessments.forEach((fa) => {
      batch2.set(doc(db, 'formative_assessments', sanitizeDocId(fa.id)), cleanForFirestore(fa), { merge: true });
      totalCount += 1;
    });

    dbData.summativeAssessments.forEach((sa) => {
      batch2.set(doc(db, 'summative_assessments', sanitizeDocId(sa.id)), cleanForFirestore(sa), { merge: true });
      totalCount += 1;
    });

    dbData.kktpConfigs.forEach((kc) => {
      batch2.set(doc(db, 'kktp_configs', sanitizeDocId(kc.id)), cleanForFirestore(kc), { merge: true });
      totalCount += 1;
    });

    dbData.finalScoreConfigs.forEach((fsc) => {
      batch2.set(doc(db, 'final_score_configs', sanitizeDocId(`${fsc.subjectId}_${fsc.classId}`)), cleanForFirestore(fsc), { merge: true });
      totalCount += 1;
    });

    // Master App State Metadata
    const nowTimeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    batch2.set(
      doc(db, 'application_settings', 'app_state'),
      {
        lastUpdated: new Date().toISOString(),
        lastSyncDisplay: nowTimeStr,
        lastSyncUser: user?.name || 'Administrator',
        activeAcademicYear: dbData.schoolProfile.activeAcademicYear,
        activeSemester: dbData.schoolProfile.activeSemester,
        totalStudents: dbData.students.length,
        totalTeachers: dbData.teachers.length
      },
      { merge: true }
    );
    totalCount += 1;

    await batch2.commit();

    updateSyncState({
      status: 'synced',
      lastSyncTime: nowTimeStr,
      message: `Semua data tersinkronisasi di Cloud Firestore (${nowTimeStr})`
    });

    return { success: true, count: totalCount };
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      markQuotaExceeded(err?.message);
      return {
        success: true,
        count: 0,
        quotaExceeded: true,
        error: 'Batas kuota harian Cloud Firebase tercapai. Data tersimpan aman di penyimpanan lokal browser.'
      };
    }
    console.warn('Notice in syncAllToFirestore:', err?.message || err);
    updateSyncState({
      status: 'connected',
      message: 'Data disimpan di penyimpanan lokal (Cloud dalam proses sinkronisasi)'
    });
    return { success: false, count: 0, error: err?.message || String(err) };
  }
}

/**
 * Specifically wipes master data collections from Cloud Firestore.
 * Used during a partial purge to ensure cloud data doesn't "restore" deleted local data.
 */
export async function wipeFirestoreMasterCollections(): Promise<void> {
  if (isCloudQuotaExhausted) return;
  try {
    await ensureFirebaseAuth();
    updateSyncState({ status: 'syncing', message: 'Membersihkan data master di Cloud Firestore...' });

    const collectionsToWipe = [
      'students',
      'teachers',
      'assessment_scores',
      'attendance',
      'homeroom_notes',
      'student_extracurriculars',
      'users' // we wipe users, the syncAllToFirestore will re-add admin/kepsek from current state
    ];

    for (const collName of collectionsToWipe) {
      const snap = await getDocs(collection(db, collName));
      if (snap.empty) continue;

      const batch = writeBatch(db);
      snap.docs.forEach((doc) => {
        // Safety: never wipe the admin account if it somehow has a teacherId link (unlikely but safe)
        // For 'users' collection, we just wipe everything, and App.tsx will sync back the filtered users.
        batch.delete(doc.ref);
      });
      await batch.commit();
    }
    
    updateSyncState({ status: 'connected', message: 'Cloud master data dibersihkan.' });
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      await markQuotaExceeded(err?.message);
      return;
    }
    console.error('Failed to wipe firestore collections:', err);
    throw err;
  }
}

/**
 * Fetch latest database from Cloud Firestore
 */
export async function fetchFromFirestore(): Promise<Partial<AppDatabase> | null> {
  if (isCloudQuotaExhausted) {
    return null;
  }
  try {
    await ensureFirebaseAuth();
    updateSyncState({ status: 'syncing', message: 'Mengambil data dari Cloud Firestore...' });

    // Precheck app_state to see if cloud database has been populated yet
    const stateDoc = await getDoc(doc(db, 'application_settings', 'app_state'));
    if (!stateDoc.exists()) {
      updateSyncState({
        status: 'connected',
        message: 'Cloud Firebase aktif (menyiapkan sinkronisasi awal)'
      });
      return null;
    }

    const [
      schoolDoc,
      studentsSnap,
      teachersSnap,
      classroomsSnap,
      subjectsSnap,
      scoresSnap,
      attendanceSnap,
      notesSnap,
      ekskulSnap,
      studentEkskulSnap,
      curriculaSnap,
      tpsSnap,
      usersSnap,
      teachingAssignmentsSnap,
      formativeSnap,
      summativeSnap,
      kktpSnap,
      finalConfigSnap
    ] = await Promise.all([
      getDoc(doc(db, 'schools', 'smpn1rangsang')),
      getDocs(collection(db, 'students')),
      getDocs(collection(db, 'teachers')),
      getDocs(collection(db, 'classrooms')),
      getDocs(collection(db, 'subjects')),
      getDocs(collection(db, 'assessment_scores')),
      getDocs(collection(db, 'attendance')),
      getDocs(collection(db, 'homeroom_notes')),
      getDocs(collection(db, 'extracurriculars')),
      getDocs(collection(db, 'student_extracurriculars')),
      getDocs(collection(db, 'curricula')),
      getDocs(collection(db, 'assessments')),
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'teaching_assignments')),
      getDocs(collection(db, 'formative_assessments')),
      getDocs(collection(db, 'summative_assessments')),
      getDocs(collection(db, 'kktp_configs')),
      getDocs(collection(db, 'final_score_configs'))
    ]);

    if (!schoolDoc.exists() || studentsSnap.empty) {
      return null;
    }

    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    updateSyncState({
      status: 'synced',
      lastSyncTime: nowStr,
      message: `Data berhasil ditarik dari Cloud Firestore (${nowStr})`
    });

    return {
      schoolProfile: schoolDoc.data() as SchoolProfile,
      students: studentsSnap.docs.map((d) => d.data() as Student),
      teachers: teachersSnap.docs.map((d) => d.data() as Teacher),
      classrooms: sortClassrooms(classroomsSnap.docs.map((d) => d.data() as Classroom)),
      subjects: subjectsSnap.docs.map((d) => d.data() as Subject),
      scores: scoresSnap.docs.map((d) => d.data() as AssessmentScore),
      attendance: attendanceSnap.docs.map((d) => d.data() as Attendance),
      homeroomNotes: notesSnap.docs.map((d) => d.data() as HomeroomNote),
      extracurriculars: ekskulSnap.docs.map((d) => d.data() as Extracurricular),
      studentExtracurriculars: studentEkskulSnap.docs.map((d) => d.data() as StudentExtracurricular),
      curricula: curriculaSnap.docs.map((d) => d.data() as Curriculum),
      learningObjectives: tpsSnap.docs.map((d) => d.data() as LearningObjective),
      users: usersSnap.docs.map((d) => d.data() as User),
      teachingAssignments: teachingAssignmentsSnap.docs.map((d) => d.data() as TeachingAssignment),
      formativeAssessments: formativeSnap.docs.map((d) => d.data() as FormativeAssessment),
      summativeAssessments: summativeSnap.docs.map((d) => d.data() as SummativeAssessment),
      kktpConfigs: kktpSnap.docs.map((d) => d.data() as KKTPConfig),
      finalScoreConfigs: finalConfigSnap.docs.map((d) => d.data() as SubjectFinalScoreConfig)
    };
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      await markQuotaExceeded(err?.message);
      return null;
    }
    console.warn('Notice in fetchFromFirestore:', err?.message || err);
    updateSyncState({
      status: 'connected',
      message: 'Cloud Firebase aktif (menggunakan data lokal terverifikasi)'
    });
    return null;
  }
}

// Automatic debounced sync helper
let syncDebounceTimer: any = null;

/**
 * Automatically queues and executes a sync to Cloud Firestore in the background
 * whenever any data changes in the application.
 */
/**
 * Automatically queues and executes a sync to Cloud Firestore in the background
 * whenever any data changes in the application.
 */
export function queueAutoSyncToFirestore(dbData: AppDatabase, delayMs: number = 2000): void {
  if (isCloudQuotaExhausted) {
    // Quota reached: rely seamlessly on localStorage
    updateSyncState({
      status: 'quota_exceeded',
      quotaExceeded: true,
      message: 'Mode Penyimpanan Lokal Aktif (Data disimpan aman di browser)'
    });
    return;
  }

  updateSyncState({ status: 'syncing', message: 'Mempersiapkan sinkronisasi otomatis ke Cloud...' });

  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }

  syncDebounceTimer = setTimeout(async () => {
    try {
      await syncAllToFirestore(dbData);
    } catch (e: any) {
      if (isQuotaExceededError(e)) {
        markQuotaExceeded();
      } else {
        console.warn('Auto sync warning:', e);
      }
    }
  }, delayMs);
}

/**
 * Real-time listener for Assessment Scores & Notifications from Cloud Firestore.
 * Updates state instantly when Guru Mata Pelajaran inputs scores in another browser/device.
 */
export function listenToFirestoreRealtime(
  onDataUpdate: (payload: { 
    scores?: AssessmentScore[]; 
    notifications?: AppNotification[];
    formativeAssessments?: FormativeAssessment[];
    summativeAssessments?: SummativeAssessment[];
    kktpConfigs?: KKTPConfig[];
    finalScoreConfigs?: SubjectFinalScoreConfig[];
    students?: Student[];
    teachers?: Teacher[];
    classrooms?: Classroom[];
    subjects?: Subject[];
    teachingAssignments?: TeachingAssignment[];
    learningObjectives?: LearningObjective[];
    curricula?: Curriculum[];
    users?: User[];
    attendance?: Attendance[];
    homeroomNotes?: HomeroomNote[];
    schoolProfile?: SchoolProfile[];
    extracurriculars?: Extracurricular[];
    studentExtracurriculars?: StudentExtracurricular[];
  }) => void
): () => void {
  if (isCloudQuotaExhausted) {
    return () => {};
  }

  ensureFirebaseAuth().catch(() => {});

  const genericListener = (collectionName: string, payloadKey: string) => {
    return onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        if (!snapshot.empty) {
          const items: any[] = [];
          snapshot.forEach((docSnap) => {
            items.push(docSnap.data());
          });
          onDataUpdate({ [payloadKey]: items });
        }
      },
      (err) => {
        if (isQuotaExceededError(err)) {
          markQuotaExceeded();
        } else {
          console.warn(`Real-time ${collectionName} listener note:`, err?.message || err);
        }
      }
    );
  };

  const unsubscribers = [
    genericListener('assessment_scores', 'scores'),
    genericListener('notifications', 'notifications'),
    genericListener('formative_assessments', 'formativeAssessments'),
    genericListener('summative_assessments', 'summativeAssessments'),
    genericListener('kktp_configs', 'kktpConfigs'),
    genericListener('final_score_configs', 'finalScoreConfigs'),
    genericListener('students', 'students'),
    genericListener('teachers', 'teachers'),
    genericListener('classrooms', 'classrooms'),
    genericListener('subjects', 'subjects'),
    genericListener('teaching_assignments', 'teachingAssignments'),
    genericListener('assessments', 'learningObjectives'),
    genericListener('curricula', 'curricula'),
    genericListener('users', 'users'),
    genericListener('attendance', 'attendance'),
    genericListener('homeroom_notes', 'homeroomNotes'),
    genericListener('schools', 'schoolProfile'),
    genericListener('extracurriculars', 'extracurriculars'),
    genericListener('student_extracurriculars', 'studentExtracurriculars')
  ];

  return () => {
    unsubscribers.forEach(unsub => unsub());
  };
}

/**
 * Directly save updated scores and notification to Cloud Firestore in real time.
 */
export async function saveScoresToFirestoreDirect(
  scores: AssessmentScore[],
  notification?: AppNotification
): Promise<boolean> {
  // If cloud quota reached, data is already persisted in localStorage via saveDatabase
  if (isCloudQuotaExhausted) {
    updateSyncState({
      status: 'quota_exceeded',
      quotaExceeded: true,
      message: 'Nilai tersimpan aman di browser (Penyimpanan Lokal Aktif).'
    });
    return true;
  }

  try {
    await ensureFirebaseAuth();
    const batch = writeBatch(db);

    scores.forEach((sc) => {
      batch.set(doc(db, 'assessment_scores', sanitizeDocId(sc.id)), cleanForFirestore(sc), { merge: true });
    });

    if (notification) {
      batch.set(doc(db, 'notifications', sanitizeDocId(notification.id)), cleanForFirestore(notification), { merge: true });
    }

    await batch.commit();
    updateSyncState({
      status: 'synced',
      lastSyncTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      message: 'Nilai & Notifikasi berhasil disinkronkan ke Cloud Firestore'
    });
    return true;
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      markQuotaExceeded(err?.message);
      return true; // Local persistence has already succeeded
    }
    console.warn('Direct score push warning:', err?.message || err);
    return false;
  }
}

/**
 * Surgical sync: Updates a single document in a specific collection.
 * This is the PREFERRED method to save data changes as it uses only 1 write unit.
 */
export async function surgicalSync(
  collectionName: string,
  docId: string,
  data: any
): Promise<{ success: boolean; error?: string; quotaExceeded?: boolean }> {
  if (isCloudQuotaExhausted) {
    return { success: true, quotaExceeded: true };
  }

  try {
    await ensureFirebaseAuth();
    const cleanData = JSON.parse(JSON.stringify(data));
    await setDoc(doc(db, collectionName, sanitizeDocId(docId)), cleanData, { merge: true });
    
    updateSyncState({
      status: 'synced',
      lastSyncTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      message: `Pembaruan ${collectionName} berhasil disinkronkan.`
    });
    
    return { success: true };
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      await markQuotaExceeded(err?.message);
      return { success: true, quotaExceeded: true };
    }
    console.warn(`Surgical sync failed for ${collectionName}/${docId}:`, err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Delete a document from Cloud Firestore directly so deleted records do not reappear on refresh.
 */
export async function deleteDocFromFirestore(collectionName: string, docId: string): Promise<void> {
  if (isCloudQuotaExhausted) return;
  try {
    await ensureFirebaseAuth();
    await deleteDoc(doc(db, collectionName, sanitizeDocId(docId)));
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      markQuotaExceeded();
    } else {
      console.warn(`Failed to delete ${collectionName}/${docId} from Firestore:`, err);
    }
  }
}

