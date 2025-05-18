
import { initializeApp, getApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';

// Define placeholder values for Firebase config
const PLACEHOLDER_PROJECT_ID = "test-4b9fb";
const PLACEHOLDER_API_KEY = "AIzaSyDO1vxm6vVZwF3HoUp_nj3q0hlkbEkYtWE";
const PLACEHOLDER_SENDER_ID = "525338072425";
const PLACEHOLDER_APP_ID = "1:525338072425:web:17807784e360c16bff59f8";


const effectiveProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || PLACEHOLDER_PROJECT_ID;

const firebaseConfigValues = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || PLACEHOLDER_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${effectiveProjectId}.firebaseapp.com`,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || (effectiveProjectId !== PLACEHOLDER_PROJECT_ID ? `https://${effectiveProjectId}.firebaseio.com` : undefined),
  projectId: effectiveProjectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${effectiveProjectId}.appspot.com`,
  F: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || PLACEHOLDER_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || PLACEHOLDER_APP_ID,
};

// Log warnings in development if essential variables are missing and placeholders are used
if (process.env.NODE_ENV === 'development') {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || effectiveProjectId === PLACEHOLDER_PROJECT_ID) {
    console.warn(
      "Firebase Configuration Warning: 'projectId' is missing or using a placeholder. " +
      "Firebase will not be initialized. Please ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID is set in your environment variables for proper Firebase functionality."
    );
  }
  if (!firebaseConfigValues.databaseURL) {
    console.warn(
      "Firebase Configuration Warning: 'databaseURL' could not be determined or is missing. " +
      "Firebase Realtime Database functionality will be affected. Ensure NEXT_PUBLIC_FIREBASE_DATABASE_URL or a valid NEXT_PUBLIC_FIREBASE_PROJECT_ID is set."
    );
  }
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY || firebaseConfigValues.apiKey === PLACEHOLDER_API_KEY) {
    console.warn(
      "Firebase Configuration Warning: 'apiKey' is missing or using a placeholder. " +
      "Certain Firebase services might not function correctly. Please ensure NEXT_PUBLIC_FIREBASE_API_KEY is set."
    );
  }
}

const firebaseConfig = firebaseConfigValues as FirebaseOptions;

let app: FirebaseApp | undefined = undefined;
let database: Database | undefined = undefined;

// Only attempt to initialize Firebase if projectId is not the placeholder and is defined
// Also ensure databaseURL is present if we intend to use Realtime Database
if (firebaseConfig.projectId && firebaseConfig.projectId !== PLACEHOLDER_PROJECT_ID && firebaseConfig.databaseURL) {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
    } catch (e) {
      console.error("Firebase initialization failed:", e);
      // app remains undefined
    }
  } else {
    app = getApp();
  }

  if (app) {
    try {
      database = getDatabase(app);
    } catch (e) {
      console.error("Failed to get Firebase Database instance:", e);
      // database remains undefined
    }
  }
} else {
    if (process.env.NODE_ENV === 'development' && (!firebaseConfig.projectId || firebaseConfig.projectId === PLACEHOLDER_PROJECT_ID)) {
        // Warning for projectId is already logged above.
    }
    if (process.env.NODE_ENV === 'development' && !firebaseConfig.databaseURL) {
         console.warn(
            "Firebase Database will not be initialized because databaseURL is missing or invalid."
         );
    }
}

export { app, database };
