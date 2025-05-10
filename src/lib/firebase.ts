
import { initializeApp, getApp, getApps, type FirebaseOptions } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Define placeholder values for Firebase config
const PLACEHOLDER_PROJECT_ID = "your-project-id-placeholder";
const PLACEHOLDER_API_KEY = "your-api-key-placeholder";
const PLACEHOLDER_SENDER_ID = "your-sender-id-placeholder";
const PLACEHOLDER_APP_ID = "your-app-id-placeholder"; // e.g., 1:1234567890:web:abcdef1234567890

const effectiveProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || PLACEHOLDER_PROJECT_ID;

const firebaseConfigValues = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || PLACEHOLDER_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${effectiveProjectId}.firebaseapp.com`,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || `https://${effectiveProjectId}.firebaseio.com`,
  projectId: effectiveProjectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${effectiveProjectId}.appspot.com`,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || PLACEHOLDER_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || PLACEHOLDER_APP_ID,
};

// Log warnings in development if essential variables are missing and placeholders are used
if (process.env.NODE_ENV === 'development') {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.warn(
      "Firebase Configuration Warning: 'projectId' is missing. Using placeholder value. " +
      "Please ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID is set in your environment variables for proper Firebase functionality."
    );
  }
  if (!process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL) {
    console.warn(
      "Firebase Configuration Warning: 'databaseURL' is missing. Using placeholder value. " +
      "Please ensure NEXT_PUBLIC_FIREBASE_DATABASE_URL is set in your environment variables."
    );
  }
   if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    console.warn(
      "Firebase Configuration Warning: 'apiKey' is missing. Using placeholder value. " +
      "Please ensure NEXT_PUBLIC_FIREBASE_API_KEY is set for full Firebase functionality (e.g., Auth)."
    );
  }
}


// The explicit checks that threw errors for missing projectId and databaseURL are removed.
// The application will now attempt to initialize with actual or placeholder values.
const firebaseConfig = firebaseConfigValues as FirebaseOptions;

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Get a reference to the database service
const database = getDatabase(app);

export { app, database };

