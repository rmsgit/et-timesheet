
import { initializeApp, getApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';

// Effective configuration will be read directly from process.env
const effectiveProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const effectiveApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const effectiveAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const effectiveDatabaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
const effectiveStorageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const effectiveMessagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const effectiveAppId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

let firebaseConfig: FirebaseOptions | null = null;

// Check if essential configurations are present
const isProjectIdMissing = !effectiveProjectId;
const isApiKeyMissing = !effectiveApiKey;

if (process.env.NODE_ENV === 'development') {
  console.log(
    "DEBUG FIREBASE CONFIG (src/lib/firebase.ts):\n" +
    `- Raw NEXT_PUBLIC_FIREBASE_PROJECT_ID from process.env: "${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'NOT SET'}"\n` +
    `- Raw NEXT_PUBLIC_FIREBASE_API_KEY from process.env: "${process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? process.env.NEXT_PUBLIC_FIREBASE_API_KEY.substring(0,4) + '...' : 'NOT SET'}"\n` +
    `- Raw NEXT_PUBLIC_FIREBASE_DATABASE_URL from process.env: "${process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'NOT SET'}"\n` +
    `--------------------------------------------------\n` +
    `- Effective Project ID being used: "${effectiveProjectId || 'NOT SET'}" (Is Missing: ${isProjectIdMissing})\n` +
    `- Effective API Key being used: "${effectiveApiKey ? effectiveApiKey.substring(0, 4) + '...' + effectiveApiKey.substring(effectiveApiKey.length - 4) : 'NOT SET'}" (Is Missing: ${isApiKeyMissing})\n` +
    `- Effective Database URL: "${effectiveDatabaseURL || 'NOT SET OR WILL BE AUTO-DERIVED IF POSSIBLE'}"`
  );
}

if (isProjectIdMissing || isApiKeyMissing) {
  if (process.env.NODE_ENV === 'development') {
    console.warn( // Changed to warn
      "====================================================================================\n" +
      "🔴 CRITICAL FIREBASE CONFIGURATION ISSUE (src/lib/firebase.ts) 🔴\n" +
      "====================================================================================\n" +
      "Firebase is NOT CONFIGURED because essential environment variables are missing. Please ensure these are correctly set in your .env file and that you have RESTARTED your development server:\n\n" +
      `[!] NEXT_PUBLIC_FIREBASE_PROJECT_ID is: '${effectiveProjectId || 'MISSING'}' ${isProjectIdMissing ? '\n    👉 THIS IS REQUIRED! Firebase will not work correctly.' : ''}\n` +
      `[!] NEXT_PUBLIC_FIREBASE_API_KEY is: '${effectiveApiKey ? effectiveApiKey.substring(0,4) + '...' + effectiveApiKey.substring(effectiveApiKey.length -4) : 'MISSING'}' ${isApiKeyMissing ? '\n    👉 THIS IS REQUIRED! Firebase Auth will not work.' : ''}\n\n` +
      "CONSEQUENCES:\n" +
      "- Firebase App, Authentication, and Realtime Database WILL NOT initialize.\n" +
      "- Login, data saving, and other Firebase-dependent features will NOT work.\n" +
      "\n" +
      "👉 TO FIX THIS:\n" +
      "1. Ensure you have a file named `.env` in the ROOT DIRECTORY of your project.\n" +
      "2. In `.env`, set (at a minimum):\n" +
      "   - NEXT_PUBLIC_FIREBASE_PROJECT_ID=\"YOUR_REAL_PROJECT_ID\"\n" +
      "   - NEXT_PUBLIC_FIREBASE_API_KEY=\"YOUR_REAL_API_KEY\"\n" +
      "   (And ideally also NEXT_PUBLIC_FIREBASE_DATABASE_URL, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, etc., for your specific project.)\n" +
      "3. CRITICAL: After saving changes to your `.env` file, you MUST FULLY RESTART your Next.js development server.\n" +
      "===================================================================================="
    );
  }
} else {
  // All essential configurations are present, proceed to build the config object
  firebaseConfig = {
    apiKey: effectiveApiKey!, // Not null due to check above
    authDomain: effectiveAuthDomain || `${effectiveProjectId}.firebaseapp.com`,
    databaseURL: effectiveDatabaseURL || `https://${effectiveProjectId}-default-rtdb.firebaseio.com`, // Default derivation
    projectId: effectiveProjectId!, // Not null due to check above
    storageBucket: effectiveStorageBucket || `${effectiveProjectId}.appspot.com`,
    messagingSenderId: effectiveMessagingSenderId,
    appId: effectiveAppId,
  };
}

let app: FirebaseApp | undefined = undefined;
let auth: Auth | undefined = undefined;
let database: Database | undefined = undefined;

// Initialize Firebase only if firebaseConfig was successfully constructed
if (firebaseConfig) {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      if (process.env.NODE_ENV === 'development') {
        console.info("Firebase app initialized successfully with config:", firebaseConfig);
      }
    } catch (e) {
      console.error("Firebase app initialization FAILED:", e);
      app = undefined; 
    }
  } else {
    app = getApp();
    if (process.env.NODE_ENV === 'development') {
      console.info("Using existing Firebase app instance.");
    }
  }

  if (app) {
    try {
      auth = getAuth(app);
      if (process.env.NODE_ENV === 'development') {
        console.info("Firebase Auth instance obtained successfully.");
      }
    } catch (e) {
      console.error("Failed to get Firebase Auth instance:", e);
      auth = undefined;
    }

    // Check if databaseURL is present in the final config used for initialization
    const currentDatabaseURL = (app.options as FirebaseOptions).databaseURL;
    if (currentDatabaseURL) {
      try {
        database = getDatabase(app);
        if (process.env.NODE_ENV === 'development') {
          console.info("Firebase Realtime Database instance obtained successfully for URL:", currentDatabaseURL);
        }
      } catch (e) {
        console.error("Failed to get Firebase Realtime Database instance:", e, "Ensure databaseURL is correct:", currentDatabaseURL);
        database = undefined;
      }
    } else {
       if (process.env.NODE_ENV === 'development') {
        console.warn( // Changed to warn
          `FIREBASE_DB_INIT_SKIPPED: Firebase Realtime Database will NOT be initialized. ` +
          `'databaseURL' is missing or invalid in the Firebase config. ` +
          `Please ensure NEXT_PUBLIC_FIREBASE_DATABASE_URL is explicitly set in your .env file if it's not the default for your projectId, or if the auto-derivation is failing. ` +
          `Database operations will fail.`
        );
      }
    }
  }
} else {
  // Firebase config could not be constructed (due to missing essential .env vars)
  // The critical warning about missing PROJECT_ID or API_KEY should have already been logged.
  app = undefined;
  auth = undefined;
  database = undefined;
  if (process.env.NODE_ENV === 'development') {
    console.warn( // Changed to warn
      `FIREBASE_APP_INIT_SKIPPED: Firebase app, Auth, and Database instances will NOT be initialized due to missing essential configurations (PROJECT_ID or API_KEY). See critical warning above.`
    );
  }
}

export { app, auth, database };

    