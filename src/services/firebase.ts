import { initializeApp, getApps, getApp, setLogLevel } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence verbose internal Firebase SDK console logs (e.g. backoff delays, quota errors)
try {
  setLogLevel('silent');
} catch {
  // Ignore if unsupported
}

export interface FirestoreErrorInfo {
  error: string;
  operation: string;
  path: string;
  authInfo: {
    userId?: string;
    email?: string;
    role?: string;
  };
}

export function handleFirestoreError(
  error: unknown,
  operation: string,
  path: string,
  currentUser?: { id?: string; email?: string; role?: string }
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operation,
    path,
    authInfo: {
      userId: currentUser?.id,
      email: currentUser?.email,
      role: currentUser?.role,
    },
  };
  console.error('[Firestore Error]', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Initialize Firebase App singleton
export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with custom databaseId if provided
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(firebaseApp);

export const auth: Auth = getAuth(firebaseApp);
export const storage: FirebaseStorage = getStorage(firebaseApp);

/**
 * Upload school asset (logo, photo, report card) to Firebase Storage
 */
export async function uploadSchoolAsset(
  folder: 'school_logos' | 'student_photos' | 'teacher_photos' | 'report_cards' | 'school_documents',
  fileName: string,
  file: Blob | File | Uint8Array,
  contentType?: string
): Promise<string> {
  try {
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageRef = ref(storage, `${folder}/${cleanFileName}`);
    const metadata = contentType ? { contentType } : undefined;
    
    await uploadBytes(storageRef, file, metadata);
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error) {
    console.error(`Failed to upload asset to ${folder}/${fileName}:`, error);
    throw error;
  }
}
