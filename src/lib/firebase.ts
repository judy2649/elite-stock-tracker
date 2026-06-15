import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let app: any;
let db: any;
let auth: any;
let googleProvider: any;
let isFirebaseAvailable = false;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  
  const dbId = (!firebaseConfig.firestoreDatabaseId || firebaseConfig.firestoreDatabaseId === '(default)')
    ? undefined
    : firebaseConfig.firestoreDatabaseId;

  // Try to initialize with persistence, slide back gracefully to normal on fail
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
    }, dbId);
    console.log("Firestore initialized with persistent local cache.");
  } catch (persistError: any) {
    console.warn("Failed to initialize Firestore with persistent cache, falling back to standard Firestore:", persistError.message);
    try {
      db = getFirestore(app, dbId);
      console.log("Firestore initialized normally (memory-only/standard cache).");
    } catch (defaultError: any) {
      console.error("Firestore completely failed to initialize:", defaultError.message);
      throw defaultError;
    }
  }

  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  isFirebaseAvailable = true;
} catch (error: any) {
  console.warn("Firebase Client failed to initialize. Running in Local Mode.", error.message);
  // Provide mocks to prevent crashes, but they won't actually "work" for network calls
  app = {};
  db = {}; 
  auth = { currentUser: null };
  googleProvider = {};
  isFirebaseAvailable = false;
}

export { app, db, auth, googleProvider, isFirebaseAvailable };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test
import { doc, getDocFromServer } from 'firebase/firestore';

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection successful.");
  } catch (error: any) {
    if (error.message?.includes('the client is offline') || error.message?.includes('PERMISSION_DENIED')) {
      console.error("Firestore connection failed. Check your configuration and rules.", error.message);
    }
  }
}
// testConnection();

