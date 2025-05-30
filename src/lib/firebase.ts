
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
const effectiveMessagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || PLACEHOLDER_SENDER_ID;
const effectiveAppId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || PLACEHOLDER_APP_ID;

const firebaseConfigValues = {
  apiKey: effectiveApiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${effectiveProjectId}.firebaseapp.com`,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || (effectiveProjectId !== PLACEHOLDER_PROJECT_ID ? `https://${effectiveProjectId}-default-rtdb.firebaseio.com` : undefined),
  projectId: effectiveProjectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${effectiveProjectId}.appspot.com`,
  messagingSenderId: effectiveMessagingSenderId,
  appId: effectiveAppId,
};

const firebaseConfig = firebaseConfigValues as FirebaseOptions;

let app: FirebaseApp | undefined = undefined;
let auth: Auth | undefined = undefined;
let database: Database | undefined = undefined;

const isProjectIdPlaceholder = effectiveProjectId === PLACEHOLDER_PROJECT_ID;
const isApiKeyPlaceholder = effectiveApiKey === PLACEHOLDER_API_KEY;

if (process.env.NODE_ENV === 'development' && (isProjectIdPlaceholder || isApiKeyPlaceholder)) {
  console.warn(
    "====================================================================================\n" +
    "🔴 CRITICAL FIREBASE CONFIGURATION ISSUE 🔴\n" +
    "====================================================================================\n" +
    "Firebase is using PLACEHOLDER values because essential environment variables are missing or incorrect:\n" +
    (isProjectIdPlaceholder ? `\n[!] NEXT_PUBLIC_FIREBASE_PROJECT_ID is effectively: '${PLACEHOLDER_PROJECT_ID}' (Placeholder).` : "") +
    (isApiKeyPlaceholder ? `\n[!] NEXT_PUBLIC_FIREBASE_API_KEY is effectively using a placeholder.` : "") +
    "\n\n" +
    "CONSEQUENCES:\n" +
    "- Firebase App, Authentication, and Realtime Database WILL NOT initialize correctly.\n" +
    "- Login, data saving, and other Firebase-dependent features will NOT work with your actual project.\n" +
    "\n" +
    "👉 TO FIX THIS:\n" +
    "1. Create or open the `.env` file in the root directory of your project.\n" +
    "2. Ensure the following variables are set with your ACTUAL Firebase project credentials:\n" +
    "   - NEXT_PUBLIC_FIREBASE_PROJECT_ID=\"YOUR_REAL_PROJECT_ID\"\n" +
    "   - NEXT_PUBLIC_FIREBASE_API_KEY=\"YOUR_REAL_API_KEY\"\n" +
    "   - NEXT_PUBLIC_FIREBASE_DATABASE_URL=\"YOUR_REAL_DATABASE_URL\" (e.g., https://your-project-id-default-rtdb.firebaseio.com)\n" +
    "   (And other Firebase config variables like AUTH_DOMAIN, STORAGE_BUCKET, etc.)\n" +
    "3. IMPORTANT: After saving changes to your `.env` file, you MUST RESTART your Next.js development server.\n" +
    "===================================================================================="
  );
}

const canInitializeApp = effectiveProjectId && !isProjectIdPlaceholder && effectiveApiKey && !isApiKeyPlaceholder;

if (canInitializeApp) {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      if (process.env.NODE_ENV === 'development') {
        console.info("Firebase app initialized successfully with projectId:", firebaseConfig.projectId);
      }
    } catch (e) {
      console.error("Firebase app initialization failed:", e);
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

    const canInitializeDatabase = firebaseConfig.databaseURL;
    if (canInitializeDatabase) {
      try {
        database = getDatabase(app);
        if (process.env.NODE_ENV === 'development') {
          console.info("Firebase Realtime Database instance obtained successfully for URL:", firebaseConfig.databaseURL);
        }
      } catch (e) {
        console.error("Failed to get Firebase Realtime Database instance:", e, "Ensure databaseURL is correct:", firebaseConfig.databaseURL);
        database = undefined;
      }
    } else {
       if (process.env.NODE_ENV === 'development') {
        console.warn(
          `FIREBASE_DB_INIT_SKIPPED: Firebase Realtime Database will NOT be initialized. ` +
          `'databaseURL' is missing or invalid in firebaseConfig. ` +
          `This might be because NEXT_PUBLIC_FIREBASE_PROJECT_ID is a placeholder, or NEXT_PUBLIC_FIREBASE_DATABASE_URL is not explicitly set or is incorrect. ` +
          `Database operations will fail.`
        );
      }
    }
  }
} else {
  if (process.env.NODE_ENV === 'development' && !(isProjectIdPlaceholder || isApiKeyPlaceholder)) {
    // This case implies that canInitializeApp is false for some other reason than placeholders, which is unlikely with current logic but good to cover.
    console.warn(
      `FIREBASE_APP_INIT_SKIPPED: Firebase app, Auth, and Database instances will NOT be initialized due to an unexpected configuration state. Please verify all NEXT_PUBLIC_FIREBASE_... variables in your .env file and restart your server.`
    );
  }
  // The detailed placeholder warning above already covers the main scenario for !canInitializeApp
}

export { app, auth, database };

    