
import { initializeApp, getApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';

// Read essential environment variables directly
const rawProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const rawApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const rawDatabaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
const rawAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const rawStorageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const rawMessagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const rawAppId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

let firebaseConfig: FirebaseOptions | null = null;
let app: FirebaseApp | undefined = undefined;
let auth: Auth | undefined = undefined;
let database: Database | undefined = undefined;

if (process.env.NODE_ENV === 'development') {
  console.log(
    "====================================================================================\n" +
    "🔎 DEBUG: Firebase Configuration Values (from process.env in src/lib/firebase.ts)\n" +
    "------------------------------------------------------------------------------------\n" +
    `- NEXT_PUBLIC_FIREBASE_PROJECT_ID: "${rawProjectId || 'NOT SET'}"\n` +
    `- NEXT_PUBLIC_FIREBASE_API_KEY: "${rawApiKey ? rawApiKey.substring(0, 4) + '...' + rawApiKey.substring(rawApiKey.length - 4) : 'NOT SET'}"\n` +
    `- NEXT_PUBLIC_FIREBASE_DATABASE_URL: "${rawDatabaseURL || 'NOT SET'}"\n` +
    `- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "${rawAuthDomain || 'NOT SET'}"\n` +
    `- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "${rawStorageBucket || 'NOT SET'}"\n` +
    `- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "${rawMessagingSenderId || 'NOT SET'}"\n` +
    `- NEXT_PUBLIC_FIREBASE_APP_ID: "${rawAppId || 'NOT SET'}"\n` +
    "===================================================================================="
  );
}

// Check if essential configurations for app initialization are present and not empty strings
const isProjectIdMissing = !rawProjectId || rawProjectId.trim() === "";
const isApiKeyMissing = !rawApiKey || rawApiKey.trim() === "";

if (isProjectIdMissing || isApiKeyMissing) {
  if (process.env.NODE_ENV === 'development') {
    let missingReason = "";
    if (isProjectIdMissing && isApiKeyMissing) {
      missingReason = "'NEXT_PUBLIC_FIREBASE_PROJECT_ID' and 'NEXT_PUBLIC_FIREBASE_API_KEY' are missing or empty.";
    } else if (isProjectIdMissing) {
      missingReason = "'NEXT_PUBLIC_FIREBASE_PROJECT_ID' is missing or empty.";
    } else {
      missingReason = "'NEXT_PUBLIC_FIREBASE_API_KEY' is missing or empty.";
    }

    console.warn(
      "====================================================================================\n" +
      "🔴 CRITICAL FIREBASE CONFIGURATION ISSUE (src/lib/firebase.ts) 🔴\n" +
      "====================================================================================\n" +
      `Firebase App, Authentication, and Realtime Database WILL NOT initialize because: ${missingReason}\n\n` +
      "Please ensure these are correctly set in your .env file (located in the project root):\n" +
      "  - NEXT_PUBLIC_FIREBASE_PROJECT_ID=\"YOUR_REAL_PROJECT_ID\"\n" +
      "  - NEXT_PUBLIC_FIREBASE_API_KEY=\"YOUR_REAL_API_KEY\"\n" +
      "  (And ideally also NEXT_PUBLIC_FIREBASE_DATABASE_URL, etc., for your specific project.)\n\n" +
      "👉 CRITICAL: After saving changes to your .env file, you MUST FULLY RESTART your Next.js development server.\n" +
      "Consequences: Login, data saving, and other Firebase-dependent features will NOT work.\n" +
      "===================================================================================="
    );
  }
} else {
  // All essential configurations for app init are present, proceed to build the config object
  firebaseConfig = {
    apiKey: rawApiKey!, // Not null or empty due to check above
    authDomain: rawAuthDomain || `${rawProjectId}.firebaseapp.com`,
    databaseURL: rawDatabaseURL, // Will be checked separately for DB initialization
    projectId: rawProjectId!, // Not null or empty due to check above
    storageBucket: rawStorageBucket || `${rawProjectId}.appspot.com`,
    messagingSenderId: rawMessagingSenderId,
    appId: rawAppId,
  };

  // Attempt to initialize Firebase app
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      if (process.env.NODE_ENV === 'development') {
        console.info("✅ Firebase app initialized successfully with effective config:", app.options);
      }
    } catch (e) {
      console.error("🔥 Firebase app initialization FAILED:", e, "Using config:", firebaseConfig);
      app = undefined;
    }
  } else {
    app = getApp();
    if (process.env.NODE_ENV === 'development') {
      console.info("✅ Using existing Firebase app instance with effective config:", app.options);
    }
  }

  if (app) {
    // Attempt to initialize Auth
    try {
      auth = getAuth(app);
      if (process.env.NODE_ENV === 'development') {
        console.info("✅ Firebase Auth instance obtained successfully.");
      }
    } catch (e) {
      console.error("🔥 Failed to get Firebase Auth instance:", e);
      auth = undefined;
    }

    // Attempt to initialize Database
    const effectiveDatabaseURL = (app.options as FirebaseOptions).databaseURL;
    if (effectiveDatabaseURL && effectiveDatabaseURL.trim() !== "") {
      try {
        database = getDatabase(app);
        if (process.env.NODE_ENV === 'development') {
          console.info("✅ Firebase Realtime Database instance obtained successfully for URL:", effectiveDatabaseURL);
        }
      } catch (e) {
        console.error("🔥 Failed to get Firebase Realtime Database instance:", e, "Ensure databaseURL is correct and service is enabled:", effectiveDatabaseURL);
        database = undefined;
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `🟡 FIREBASE_DB_INIT_SKIPPED: Firebase Realtime Database will NOT be initialized. ` +
          `'databaseURL' is missing, empty, or invalid in the Firebase config used for app initialization. ` +
          `Value seen: "${effectiveDatabaseURL || 'NOT SET OR EMPTY'}". ` +
          `Please ensure NEXT_PUBLIC_FIREBASE_DATABASE_URL is explicitly set in your .env file. ` +
          `Database operations will fail.`
        );
      }
      database = undefined;
    }
  } else {
    // App initialization failed (likely due to earlier critical config issue)
    // Warnings for auth and database are implicitly covered by app init failure
    if (process.env.NODE_ENV === 'development' && (isProjectIdMissing || isApiKeyMissing)) {
      // The critical warning has already been displayed.
    } else if (process.env.NODE_ENV === 'development') {
      // If critical warning wasn't shown but app is still undefined (e.g. initializeApp threw an unexpected error)
      console.error("🔥 UNEXPECTED_FIREBASE_APP_INIT_FAILURE: Firebase app object is undefined after initialization attempt, but critical .env variable checks passed. This is unexpected. Firebase services (Auth, Database) will not be available.");
    }
  }
}

export { app, auth, database };
