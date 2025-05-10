
import { initializeApp, getApp, getApps, type FirebaseOptions } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfigValues = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check for essential configuration keys
// These checks are crucial because Firebase SDK might give generic errors if these are missing.
if (!firebaseConfigValues.projectId) {
  throw new Error(
    "Firebase Configuration Error: 'projectId' is missing. " +
    "Please ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID is set in your environment variables and the Next.js server has been restarted."
  );
}

if (!firebaseConfigValues.databaseURL) {
  // Firebase SDK can sometimes infer this if projectId is standard, but explicit is better.
  // The error message "Can't determine Firebase Database URL" implies inference failed or it's strictly required.
  throw new Error(
    "Firebase Configuration Error: 'databaseURL' is missing. " +
    "Please ensure NEXT_PUBLIC_FIREBASE_DATABASE_URL is set in your environment variables and the Next.js server has been restarted."
  );
}

// All checks passed, cast to FirebaseOptions
const firebaseConfig = firebaseConfigValues as FirebaseOptions;

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// This line will throw if the app instance is not correctly configured,
// specifically if databaseURL is not part of app.options or projectId is not suitable for URL inference.
// Our checks above should ensure `app` is initialized with necessary details if env vars are set.
const database = getDatabase(app);

export { app, database };
