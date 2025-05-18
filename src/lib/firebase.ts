
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
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || (effectiveProjectId !== PLACEHOLDER_PROJECT_ID ? `https://${effectiveProjectId}-default-rtdb.firebaseio.com` : undefined), // Adjusted to common default RTDB pattern
  projectId: effectiveProjectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${effectiveProjectId}.appspot.com`,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || PLACEHOLDER_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || PLACEHOLDER_APP_ID,
};

// Log warnings in development if essential variables are missing and placeholders are used
if (process.env.NODE_ENV === 'development') {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || effectiveProjectId === PLACEHOLDER_PROJECT_ID) {
    console.warn(
      "Firebase Configuration Warning: 'projectId' is using a placeholder. " +
      "Firebase Realtime Database and other services requiring a specific project ID will not be initialized. " +
      "Please ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID is set in your .env file with your actual project ID."
    );
  }
  if (!firebaseConfigValues.databaseURL && effectiveProjectId !== PLACEHOLDER_PROJECT_ID) { 
    console.warn(
      "Firebase Configuration Warning: 'databaseURL' could not be determined automatically and NEXT_PUBLIC_FIREBASE_DATABASE_URL is not set. "+
      "Firebase Realtime Database functionality will be affected even if a real 'projectId' is provided. " +
      "Ensure NEXT_PUBLIC_FIREBASE_DATABASE_URL is set if your database isn't in the default location (e.g., us-central1)."
    );
  }
   if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY || firebaseConfigValues.apiKey === PLACEHOLDER_API_KEY) {
    console.warn(
      "Firebase Configuration Warning: 'apiKey' is using a placeholder. " +
      "Certain Firebase services might not function correctly. Please ensure NEXT_PUBLIC_FIREBASE_API_KEY is set."
    );
  }
  if (firebaseConfigValues.messagingSenderId === PLACEHOLDER_SENDER_ID) {
    console.warn("Firebase Configuration Warning: 'messagingSenderId' is using a placeholder. Ensure NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID is set if you use FCM.");
  }
  if (firebaseConfigValues.appId === PLACEHOLDER_APP_ID) {
    console.warn("Firebase Configuration Warning: 'appId' is using a placeholder. Ensure NEXT_PUBLIC_FIREBASE_APP_ID is set for full Firebase integration.");
  }
}

const firebaseConfig = firebaseConfigValues as FirebaseOptions;

let app: FirebaseApp | undefined = undefined;
let database: Database | undefined = undefined;

const canInitializeFirebase = firebaseConfig.projectId &&
                              firebaseConfig.projectId !== PLACEHOLDER_PROJECT_ID &&
                              firebaseConfig.databaseURL;

if (canInitializeFirebase) {
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
      database = getDatabase(app);
      console.info("Firebase Realtime Database instance obtained successfully for URL:", firebaseConfig.databaseURL);
    } catch (e) {
      console.error("Failed to get Firebase Realtime Database instance:", e, "Ensure databaseURL is correct:", firebaseConfig.databaseURL);
      database = undefined;
    }
  }
} else {
  let reason = "";
  if (!firebaseConfig.projectId || firebaseConfig.projectId === PLACEHOLDER_PROJECT_ID) {
    reason = `Firebase 'projectId' is missing or using the placeholder ('${PLACEHOLDER_PROJECT_ID}').`;
  } else if (!firebaseConfig.databaseURL) {
    reason = `Firebase 'databaseURL' is missing. It's required for Realtime Database. It could not be derived because either NEXT_PUBLIC_FIREBASE_PROJECT_ID is a placeholder, or NEXT_PUBLIC_FIREBASE_DATABASE_URL is not explicitly set.`;
  } else {
    reason = "An unspecified configuration issue prevented Firebase initialization (e.g., one of the critical config values resolved to undefined unexpectedly).";
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.warn( // Changed from console.error to console.warn
      `FIREBASE_INIT_SKIPPED: Firebase app and database instances will NOT be initialized. ${reason} ` +
      `Consequently, data operations (read/write) with Firebase will not function. ` +
      `Please ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID is set to your actual project ID, and NEXT_PUBLIC_FIREBASE_DATABASE_URL is correctly set (if not using the default database for your project, or if projectId is a placeholder), in your .env file. Then, restart your Next.js development server.`
    );
  }
}

export { app, database };
