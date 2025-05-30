
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
const isApiKeyPlaceholder = !effectiveApiKey || effectiveApiKey === PLACEHOLDER_API_KEY;


if (process.env.NODE_ENV === 'development') {
  console.log(
    "DEBUG FIREBASE CONFIG (src/lib/firebase.ts):\n" +
    `- Raw NEXT_PUBLIC_FIREBASE_PROJECT_ID from process.env: "${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}"\n` +
    `- Raw NEXT_PUBLIC_FIREBASE_API_KEY from process.env: "${process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? process.env.NEXT_PUBLIC_FIREBASE_API_KEY.substring(0,4) + '...' : 'NOT SET'}"\n` +
    `--------------------------------------------------\n` +
    `- Effective Project ID being used: "${effectiveProjectId}" (Is placeholder: ${isProjectIdPlaceholder})\n` +
    `- Effective API Key being used: "${effectiveApiKey ? effectiveApiKey.substring(0, 4) + '...' + effectiveApiKey.substring(effectiveApiKey.length - 4) : 'NOT SET'}" (Is placeholder/missing: ${isApiKeyPlaceholder})\n` +
    `- Effective Database URL: "${firebaseConfig.databaseURL || 'NOT SET OR AUTO-DERIVED'}"\n` +
    `- Effective Auth Domain: "${firebaseConfig.authDomain}"`
  );
}


const canInitializeApp = effectiveProjectId && !isProjectIdPlaceholder && effectiveApiKey && !isApiKeyPlaceholder;

if (process.env.NODE_ENV === 'development' && (isProjectIdPlaceholder || isApiKeyPlaceholder)) {
  console.warn(
    "====================================================================================\n" +
    "🔴 CRITICAL FIREBASE CONFIGURATION ISSUE (src/lib/firebase.ts) 🔴\n" +
    "====================================================================================\n" +
    "Firebase is using PLACEHOLDER or MISSING values because essential environment variables are not correctly set or the server was not restarted after .env changes:\n\n" +
    `[!] NEXT_PUBLIC_FIREBASE_PROJECT_ID is effectively: '${effectiveProjectId}' ${isProjectIdPlaceholder ? '\n    👉 THIS IS A PLACEHOLDER! Firebase will not work correctly.' : '(This appears to be a custom value.)'}\n` +
    `[!] NEXT_PUBLIC_FIREBASE_API_KEY is effectively: '${effectiveApiKey ? effectiveApiKey.substring(0,4) + '...' + effectiveApiKey.substring(effectiveApiKey.length -4) : 'NOT SET'}' ${isApiKeyPlaceholder ? '\n    👉 THIS IS A PLACEHOLDER OR MISSING! Firebase Auth will not work.' : '(This appears to be a custom value.)'}\n\n` +
    "CONSEQUENCES:\n" +
    "- Firebase App, Authentication, and Realtime Database WILL NOT initialize correctly.\n" +
    "- Login, data saving, and other Firebase-dependent features will NOT work with your actual project.\n" +
    "\n" +
    "👉 TO FIX THIS:\n" +
    "1. Ensure you have a file named `.env` in the ROOT DIRECTORY of your project.\n" +
    "2. In `.env`, set the following variables with your ACTUAL Firebase project credentials:\n" +
    "   - NEXT_PUBLIC_FIREBASE_PROJECT_ID=\"YOUR_REAL_PROJECT_ID\"\n" +
    "   - NEXT_PUBLIC_FIREBASE_API_KEY=\"YOUR_REAL_API_KEY\"\n" +
    "   - NEXT_PUBLIC_FIREBASE_DATABASE_URL=\"YOUR_REAL_DATABASE_URL\" (e.g., https://your-project-id-default-rtdb.firebaseio.com)\n" +
    "   (And other NEXT_PUBLIC_FIREBASE_... config variables as needed, like AUTH_DOMAIN, STORAGE_BUCKET, etc.)\n" +
    "3. CRITICAL: After saving changes to your `.env` file, you MUST FULLY RESTART your Next.js development server.\n" +
    "===================================================================================="
  );
}

if (canInitializeApp) {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      if (process.env.NODE_ENV === 'development') {
        console.info("Firebase app initialized successfully with projectId:", firebaseConfig.projectId);
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
          `This might be because NEXT_PUBLIC_FIREBASE_PROJECT_ID is a placeholder ('${PLACEHOLDER_PROJECT_ID}'), or NEXT_PUBLIC_FIREBASE_DATABASE_URL is not explicitly set or is incorrect. ` +
          `Database operations will fail.`
        );
      }
    }
  }
} else {
  // App cannot be initialized
  app = undefined;
  auth = undefined;
  database = undefined;

  let reasonMessage = "";
  if (isProjectIdPlaceholder) {
    reasonMessage += `Firebase 'projectId' is using the placeholder ('${PLACEHOLDER_PROJECT_ID}'). `;
  } else if (!effectiveProjectId) {
    reasonMessage += `Firebase 'projectId' is missing. `;
  }

  if (isApiKeyPlaceholder) {
    // Check if it's missing or if it's the placeholder
    if (!effectiveApiKey) {
      reasonMessage += `Firebase 'apiKey' is MISSING. `;
    } else {
      reasonMessage += `Firebase 'apiKey' is using a placeholder. `;
    }
  }
  
  if (!reasonMessage) { 
    reasonMessage = "An unexpected configuration state (neither projectId nor apiKey seems to be the direct issue, check other effective... values or .env loading). ";
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.warn( // Changed from error to warn
      `FIREBASE_APP_INIT_SKIPPED: Firebase app, Auth, and Database instances will NOT be initialized. Reason: ${reasonMessage}` +
      `Consequently, data operations (read/write) with Firebase will not function. ` +
      `Please ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID and NEXT_PUBLIC_FIREBASE_API_KEY are correctly set with your REAL project credentials in your .env file, and that you have RESTARTED your Next.js development server.`
    );
  }
}

export { app, auth, database };
