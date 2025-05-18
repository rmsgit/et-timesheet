
import type { ProjectType, User } from './types';

export const PROJECT_TYPES: ProjectType[] = [
  'New Feature',
  'Bug Fix',
  'Documentation',
  'Meeting',
  'Refactor',
  'Testing',
];

// LOCAL_STORAGE_USER_KEY is no longer used for storing the authenticated user with Firebase Auth.
// Firebase Auth SDK handles session persistence.
// export const LOCAL_STORAGE_USER_KEY = 'editors_timesheet_user'; 

export const FIREBASE_USERS_PATH = 'users'; // Stores user profiles (username, role) keyed by Firebase UID
export const FIREBASE_PROJECT_TYPES_PATH = 'projectTypes';
export const FIREBASE_TIMESHEET_PATH = 'timeRecords';


// MOCK_USERS_DATA is now primarily for seeding the Realtime Database path FIREBASE_USERS_PATH
// if it's empty. These users also need to exist in Firebase Authentication to be able to log in.
// Their `id` here MUST match their Firebase Auth UID.
export const MOCK_USERS_DATA: User[] = [
  // Ensure these IDs would match potential Firebase UIDs if you want these to be auto-linked
  // For a fresh setup, admins would create users in Firebase Auth console, 
  // then their profiles (with roles) in the app's admin user management (which writes to RTDB).
  { id: 'firebase_uid_for_admin', email: 'admin@example.com', username: 'admin', role: 'admin' as const },
  { id: 'firebase_uid_for_editor', email: 'editor@example.com', username: 'editor', role: 'editor' as const },
  { id: 'firebase_uid_for_alice', email: 'alice@example.com', username: 'alice', role: 'editor' as const },
  { id: 'firebase_uid_for_bob', email: 'bob@example.com', username: 'bob', role: 'editor' as const },
];
