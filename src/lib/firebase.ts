
import { initializeApp, getApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';

// Define placeholder values for Firebase config
const PLACEHOLDER_PROJECT_ID = "test-4b9fb";
const PLACEHOLDER_API_KEY = "AIzaSyDO1vxm6vVZwF3HoUp_nj3q0hlkbEkYtWE"; // Essential for Auth
const PLACEHOLDER_SENDER_ID = "525338072425";
const PLACEHOLDER_APP_ID = "1:525338072425:web:17807784e360c16bff59f8";

const effectiveProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || PLACEHOLDER_PROJECT_ID;
const effectiveApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || PLACEHOLDER_API_KEY;

const firebaseConfigValues = {
  apiKey: effectiveApiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${effectiveProjectId}.firebaseapp.com`,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || (effectiveProjectId !== PLACEHOLDER_PROJECT_ID ? `https://${effectiveProjectId}-default-rtdb.firebaseio.com` : undefined),
  projectId: effectiveProjectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${effectiveProjectId}.appspot.com`,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || PLACEHOLDER_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || PLACEHOLDER_APP_ID,
};

const firebaseConfig = firebaseConfigValues as FirebaseOptions;

let app: FirebaseApp | undefined = undefined;
let auth: Auth | undefined = undefined;
let database: Database | undefined = undefined;

// Conditions for initializing services
const canInitializeApp = firebaseConfig.projectId &&
                         firebaseConfig.projectId !== PLACEHOLDER_PROJECT_ID &&
                         firebaseConfig.apiKey &&
                         firebaseConfig.apiKey !== PLACEHOLDER_API_KEY;

const canInitializeDatabase = firebaseConfig.databaseURL;

if (canInitializeApp) {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      console.info("Firebase app initialized successfully with projectId:", firebaseConfig.projectId);
    } catch (e) {
      console.error("Firebase app initialization failed:", e);
      app = undefined; 
    }
  } else {
    app = getApp();
    console.info("Using existing Firebase app instance.");
  }

  if (app) {
    try {
      auth = getAuth(app);
      console.info("Firebase Auth instance obtained successfully.");
    } catch (e) {
      console.error("Failed to get Firebase Auth instance:", e);
      auth = undefined;
    }

    if (canInitializeDatabase) {
      try {
        database = getDatabase(app);
        console.info("Firebase Realtime Database instance obtained successfully for URL:", firebaseConfig.databaseURL);
      } catch (e) {
        console.error("Failed to get Firebase Realtime Database instance:", e, "Ensure databaseURL is correct:", firebaseConfig.databaseURL);
        database = undefined;
      }
    } else {
       if (process.env.NODE_ENV === 'development') {
        console.warn(
          `FIREBASE_DB_INIT_SKIPPED: Firebase Realtime Database will NOT be initialized. ` +
          `'databaseURL' is missing or invalid. ` +
          `This might be because NEXT_PUBLIC_FIREBASE_PROJECT_ID is a placeholder, or NEXT_PUBLIC_FIREBASE_DATABASE_URL is not explicitly set. ` +
          `Database operations will fail.`
        );
      }
    }
  }
} else {
  let appInitReason = "";
  if (!firebaseConfig.projectId || firebaseConfig.projectId === PLACEHOLDER_PROJECT_ID) {
    appInitReason += `Firebase 'projectId' is missing or using the placeholder ('${PLACEHOLDER_PROJECT_ID}'). `;
  }
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === PLACEHOLDER_API_KEY) {
    appInitReason += `Firebase 'apiKey' is missing or using the placeholder. Auth will not work.`;
  }
  if (process.env.NODE_ENV === 'development') {
    console.warn( // Changed from console.error
      `FIREBASE_APP_INIT_SKIPPED: Firebase app, Auth, and Database instances will NOT be initialized. ${appInitReason} ` +
      `Consequently, Firebase-dependent operations will not function. ` +
      `Please ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID and NEXT_PUBLIC_FIREBASE_API_KEY are set to your actual project values in your .env file. Then, restart your Next.js development server.`
    );
  }
}

export { app, auth, database };
