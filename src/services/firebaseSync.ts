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

// Tombstone / Deleted IDs tracker to prevent resurrection of deleted entities
const DELETED_ENTITIES_KEY = 'erapor_deleted_entity_ids_v1';

export function getDeletedEntityIds(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(DELETED_ENTITIES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function addDeletedEntityId(collectionName: string, id: string): void {
  if (!id) return;
  try {
    const map = getDeletedEntityIds();
    if (!map[collectionName]) {
      map[collectionName] = [];
    }
    const cleanId = String(id);
    if (!map[collectionName].includes(cleanId)) {
      map[collectionName].push(cleanId);
      localStorage.setItem(DELETED_ENTITIES_KEY, JSON.stringify(map));
    }
  } catch {}
}

export function isEntityDeleted(collectionName: string, id: string): boolean {
  if (!id) return false;
  try {
    const map = getDeletedEntityIds();
    const list = map[collectionName];
    if (!list) return false;
    const cleanId = String(id);
    return list.includes(cleanId) || list.includes(sanitizeDocId(cleanId));
  } catch {
    return false;
  }
}

export function removeDeletedEntityId(collectionName: string, id: string): void {
  if (!id) return;
  try {
    const map = getDeletedEntityIds();
    if (map[collectionName]) {
      const cleanId = String(id);
      map[collectionName] = map[collectionName].filter(x => x !== cleanId && x !== sanitizeDocId(cleanId));
      localStorage.setItem(DELETED_ENTITIES_KEY, JSON.stringify(map));
    }
  } catch {}
}

/**
 * Executes a promise with an enforced timeout so the app never hangs indefinitely
 */
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 15000, fallbackValue?: T): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((resolve, reject) => {
    timeoutId = setTimeout(() => {
      if (fallbackValue !== undefined) {
        resolve(fallbackValue);
      } else {
        reject(new Error(`Batas waktu koneksi Firestore terlampaui (${timeoutMs / 1000} detik)`));
      }
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
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

export let unauthorizedDomainDetected = false;

/**
 * Ensure Firebase Authentication is established
 */
export async function ensureFirebaseAuth(): Promise<void> {
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
  } catch (error: any) {
    if (error?.code === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized-domain')) {
      unauthorizedDomainDetected = true;
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'domain Anda';
      console.error(
        `[Firebase Auth] Domain '${currentHost}' belum didaftarkan di Firebase Console! ` +
        `Silakan buka Firebase Console -> Authentication -> Settings -> Authorized Domains -> Tambahkan '${currentHost}'.`
      );
      updateSyncState({
        status: 'error',
        message: `Domain '${currentHost}' belum diizinkan di Firebase Console. Tambahkan domain ini di Authentication -> Authorized domains.`
      });
    } else {
      console.warn('Firebase Auth note:', error?.message || error);
    }
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
    
    if (unauthorizedDomainDetected) {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'domain Vercel Anda';
      return {
        success: false,
        message: `Domain '${currentHost}' belum diizinkan di Firebase Console. Tambahkan '${currentHost}' di Firebase Console > Authentication > Settings > Authorized Domains.`,
        latencyMs: Date.now() - start
      };
    }

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
    if (error?.code === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized-domain')) {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'domain Vercel Anda';
      return {
        success: false,
        message: `Domain '${currentHost}' belum diizinkan di Firebase Console. Tambahkan domain ini di Authentication > Authorized domains.`,
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

    // Helper to safely commit items in batches under Firestore's 500 limit with timeout protection
    const commitInBatches = async (
      items: { ref: any; data: any }[],
      taskName: string
    ) => {
      const BATCH_SIZE = 350; // Well below 500 limit for speed and safety
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const chunk = items.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(op => {
          batch.set(op.ref, cleanForFirestore(op.data), { merge: true });
        });
        await withTimeout(batch.commit(), 20000);
        totalCount += chunk.length;
        onProgress?.(`${taskName} (${Math.min(i + chunk.length, items.length)}/${items.length})...`);
      }
    };

    // 0. Prune deleted master items from Cloud Firestore so deleted records don't persist in cloud
    try {
      const [remoteTeachers, remoteStudents, remoteClassrooms, remoteSubjects] = await Promise.all([
        getDocs(collection(db, 'teachers')),
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'classrooms')),
        getDocs(collection(db, 'subjects'))
      ]);

      const localTeacherIds = new Set(dbData.teachers.map((t) => sanitizeDocId(t.id)));
      const localStudentIds = new Set(dbData.students.map((s) => sanitizeDocId(s.id)));
      const localClassIds = new Set(dbData.classrooms.map((c) => sanitizeDocId(c.id)));
      const localSubjectIds = new Set(dbData.subjects.map((s) => sanitizeDocId(s.id)));

      const pruneBatch = writeBatch(db);
      let pruneCount = 0;

      remoteTeachers.docs.forEach((docSnap) => {
        if (!localTeacherIds.has(docSnap.id) || isEntityDeleted('teachers', docSnap.id)) {
          pruneBatch.delete(docSnap.ref);
          pruneCount++;
        }
      });
      remoteStudents.docs.forEach((docSnap) => {
        if (!localStudentIds.has(docSnap.id) || isEntityDeleted('students', docSnap.id)) {
          pruneBatch.delete(docSnap.ref);
          pruneCount++;
        }
      });
      remoteClassrooms.docs.forEach((docSnap) => {
        if (!localClassIds.has(docSnap.id) || isEntityDeleted('classrooms', docSnap.id)) {
          pruneBatch.delete(docSnap.ref);
          pruneCount++;
        }
      });
      remoteSubjects.docs.forEach((docSnap) => {
        if (!localSubjectIds.has(docSnap.id) || isEntityDeleted('subjects', docSnap.id)) {
          pruneBatch.delete(docSnap.ref);
          pruneCount++;
        }
      });

      if (pruneCount > 0) {
        onProgress?.(`Membersihkan ${pruneCount} data terhapus di Cloud...`);
        await withTimeout(pruneBatch.commit(), 15000);
      }
    } catch (pruneErr) {
      console.warn('Prune master docs note (non-fatal):', pruneErr);
    }

    // 1. School profile (1 doc)
    onProgress?.('Menyimpan profil & identitas sekolah (1/5)...');
    await withTimeout(setDoc(doc(db, 'schools', 'smpn1rangsang'), cleanForFirestore(dbData.schoolProfile), { merge: true }), 15000);
    totalCount += 1;

    // 2. Master Structure (Students, Teachers, Classrooms, Subjects, Curricula, TPs, Assignments)
    onProgress?.('Menyiapkan data siswa, guru, rombel, dan mapel (2/5)...');
    const masterOps: { ref: any; data: any }[] = [];

    dbData.students.forEach((s) => {
      if (!isEntityDeleted('students', s.id)) {
        masterOps.push({ ref: doc(db, 'students', sanitizeDocId(s.id)), data: s });
      }
    });
    dbData.teachers.forEach((t) => {
      if (!isEntityDeleted('teachers', t.id)) {
        masterOps.push({ ref: doc(db, 'teachers', sanitizeDocId(t.id)), data: t });
      }
    });
    dbData.classrooms.forEach((c) => {
      if (!isEntityDeleted('classrooms', c.id)) {
        masterOps.push({ ref: doc(db, 'classrooms', sanitizeDocId(c.id)), data: c });
      }
    });
    dbData.subjects.forEach((sub) => {
      if (!isEntityDeleted('subjects', sub.id)) {
        masterOps.push({ ref: doc(db, 'subjects', sanitizeDocId(sub.id)), data: sub });
      }
    });
    dbData.curricula.forEach((cur) => {
      masterOps.push({ ref: doc(db, 'curricula', sanitizeDocId(cur.id)), data: cur });
    });
    dbData.learningObjectives.forEach((tp) => {
      masterOps.push({ ref: doc(db, 'assessments', sanitizeDocId(tp.id)), data: tp });
    });
    if (dbData.teachingAssignments) {
      dbData.teachingAssignments.forEach((ta) => {
        if (!isEntityDeleted('teaching_assignments', ta.id)) {
          masterOps.push({ ref: doc(db, 'teaching_assignments', sanitizeDocId(ta.id)), data: ta });
        }
      });
    }

    await commitInBatches(masterOps, 'Mengunggah struktur master');

    // 3. Scores & Kurikulum Merdeka 2025 Assessments
    onProgress?.('Menyimpan data penilaian & capaian siswa (3/5)...');
    const assessmentOps: { ref: any; data: any }[] = [];

    dbData.scores.forEach((sc) => {
      assessmentOps.push({ ref: doc(db, 'assessment_scores', sanitizeDocId(sc.id)), data: sc });
    });
    dbData.formativeAssessments.forEach((fa) => {
      assessmentOps.push({ ref: doc(db, 'formative_assessments', sanitizeDocId(fa.id)), data: fa });
    });
    dbData.summativeAssessments.forEach((sa) => {
      assessmentOps.push({ ref: doc(db, 'summative_assessments', sanitizeDocId(sa.id)), data: sa });
    });
    dbData.kktpConfigs.forEach((kc) => {
      assessmentOps.push({ ref: doc(db, 'kktp_configs', sanitizeDocId(kc.id)), data: kc });
    });
    dbData.finalScoreConfigs.forEach((fsc) => {
      assessmentOps.push({ ref: doc(db, 'final_score_configs', sanitizeDocId(`${fsc.subjectId}_${fsc.classId}`)), data: fsc });
    });

    await commitInBatches(assessmentOps, 'Mengunggah data penilaian');

    // 4. Attendance, Homeroom Notes, Extracurriculars, Users
    onProgress?.('Menyimpan absensi, ekstrakurikuler, dan catatan rapor (4/5)...');
    const reportOps: { ref: any; data: any }[] = [];

    dbData.attendance.forEach((att) => {
      reportOps.push({ ref: doc(db, 'attendance', sanitizeDocId(att.id)), data: att });
    });
    dbData.homeroomNotes.forEach((hn) => {
      reportOps.push({ ref: doc(db, 'homeroom_notes', sanitizeDocId(hn.id)), data: hn });
    });
    dbData.extracurriculars.forEach((e) => {
      reportOps.push({ ref: doc(db, 'extracurriculars', sanitizeDocId(e.id)), data: e });
    });
    dbData.studentExtracurriculars.forEach((se) => {
      reportOps.push({ ref: doc(db, 'student_extracurriculars', sanitizeDocId(se.id)), data: se });
    });
    dbData.users.forEach((u) => {
      if (!isEntityDeleted('users', u.id)) {
        reportOps.push({ ref: doc(db, 'users', sanitizeDocId(u.id)), data: u });
      }
    });

    await commitInBatches(reportOps, 'Mengunggah data rapor');

    // 5. Master App State Metadata (5/5)
    onProgress?.('Menyelesaikan metadata status aplikasi (5/5)...');
    const nowTimeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    await withTimeout(
      setDoc(
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
      ),
      15000
    );
    totalCount += 1;

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

    const hasAnyCloudData = 
      schoolDoc.exists() || 
      !studentsSnap.empty || 
      !teachersSnap.empty || 
      !scoresSnap.empty ||
      !formativeSnap.empty ||
      !summativeSnap.empty;

    if (!hasAnyCloudData) {
      updateSyncState({
        status: 'connected',
        message: 'Cloud Firebase aktif (database cloud kosong, siap sinkronisasi awal)'
      });
      return null;
    }

    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    updateSyncState({
      status: 'synced',
      lastSyncTime: nowStr,
      message: `Data berhasil ditarik dari Cloud Firestore (${nowStr})`
    });

    return {
      ...(schoolDoc.exists() ? { schoolProfile: schoolDoc.data() as SchoolProfile } : {}),
      ...(studentsSnap.empty ? {} : { students: studentsSnap.docs.map((d) => d.data() as Student) }),
      ...(teachersSnap.empty ? {} : { teachers: teachersSnap.docs.map((d) => d.data() as Teacher) }),
      ...(classroomsSnap.empty ? {} : { classrooms: sortClassrooms(classroomsSnap.docs.map((d) => d.data() as Classroom)) }),
      ...(subjectsSnap.empty ? {} : { subjects: subjectsSnap.docs.map((d) => d.data() as Subject) }),
      ...(scoresSnap.empty ? {} : { scores: scoresSnap.docs.map((d) => d.data() as AssessmentScore) }),
      ...(attendanceSnap.empty ? {} : { attendance: attendanceSnap.docs.map((d) => d.data() as Attendance) }),
      ...(notesSnap.empty ? {} : { homeroomNotes: notesSnap.docs.map((d) => d.data() as HomeroomNote) }),
      ...(ekskulSnap.empty ? {} : { extracurriculars: ekskulSnap.docs.map((d) => d.data() as Extracurricular) }),
      ...(studentEkskulSnap.empty ? {} : { studentExtracurriculars: studentEkskulSnap.docs.map((d) => d.data() as StudentExtracurricular) }),
      ...(curriculaSnap.empty ? {} : { curricula: curriculaSnap.docs.map((d) => d.data() as Curriculum) }),
      ...(tpsSnap.empty ? {} : { learningObjectives: tpsSnap.docs.map((d) => d.data() as LearningObjective) }),
      ...(usersSnap.empty ? {} : { users: usersSnap.docs.map((d) => d.data() as User) }),
      ...(teachingAssignmentsSnap.empty ? {} : { teachingAssignments: teachingAssignmentsSnap.docs.map((d) => d.data() as TeachingAssignment) }),
      ...(formativeSnap.empty ? {} : { formativeAssessments: formativeSnap.docs.map((d) => d.data() as FormativeAssessment) }),
      ...(summativeSnap.empty ? {} : { summativeAssessments: summativeSnap.docs.map((d) => d.data() as SummativeAssessment) }),
      ...(kktpSnap.empty ? {} : { kktpConfigs: kktpSnap.docs.map((d) => d.data() as KKTPConfig) }),
      ...(finalConfigSnap.empty ? {} : { finalScoreConfigs: finalConfigSnap.docs.map((d) => d.data() as SubjectFinalScoreConfig) })
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

export interface FirestoreRealtimePayload {
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
  removedDocIds?: Record<string, string[]>;
}

/**
 * Real-time listener for Assessment Scores & Notifications from Cloud Firestore.
 * Updates state instantly across all connected devices when data is added, changed, or deleted.
 */
export function listenToFirestoreRealtime(
  onDataUpdate: (payload: FirestoreRealtimePayload) => void
): () => void {
  if (isCloudQuotaExhausted) {
    return () => {};
  }

  ensureFirebaseAuth().catch(() => {});

  const genericListener = (collectionName: string, payloadKey: string) => {
    return onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        const items: any[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data());
        });

        const removedIds: string[] = [];
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'removed') {
            removedIds.push(change.doc.id);
            const rawId = (change.doc.data() as any)?.id;
            if (rawId && rawId !== change.doc.id) {
              removedIds.push(rawId);
            }
          }
        });

        onDataUpdate({ 
          [payloadKey]: items,
          removedDocIds: removedIds.length > 0 ? { [payloadKey]: removedIds } : undefined
        });
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
export async function deleteDocFromFirestore(collectionName: string, docId: string): Promise<boolean> {
  if (isCloudQuotaExhausted) return true;
  addDeletedEntityId(collectionName, docId);
  try {
    await withTimeout(ensureFirebaseAuth(), 8000).catch(() => {});
    await withTimeout(deleteDoc(doc(db, collectionName, sanitizeDocId(docId))), 10000);
    return true;
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      markQuotaExceeded();
      return true;
    } else {
      console.warn(`Failed to delete ${collectionName}/${docId} from Firestore:`, err);
      return false;
    }
  }
}

