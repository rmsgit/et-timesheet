
import type { ProjectType, User, EditorLevel, EditorRatingCategory } from './types';

export const PROJECT_TYPES: ProjectType[] = [
  'New Feature',
  'Bug Fix',
  'Documentation',
  'Meeting',
  'Refactor',
  'Testing',
];

// Firebase Realtime Database Paths
export const FIREBASE_USERS_PATH = 'users'; // Stores user profiles (username, role, email) keyed by Firebase Auth UID
export const FIREBASE_PROJECT_TYPES_PATH = 'projectTypes';
export const FIREBASE_TIMESHEET_PATH = 'timeRecords';
export const FIREBASE_ADMIN_NOTIFICATIONS_PATH = 'adminTaskCompletionNotifications';
export const FIREBASE_EDITOR_LEVELS_PATH = 'editorLevels';
export const FIREBASE_EDITOR_RATING_CATEGORIES_PATH = 'editorRatingCategories';
export const FIREBASE_PERFORMANCE_REVIEWS_PATH = 'performanceReviews';
export const FIREBASE_LEAVE_REQUESTS_PATH = 'leaveRequests';
export const FIREBASE_ATTENDANCE_PATH = 'attendance';
export const FIREBASE_HOLIDAYS_PATH = 'holidays';

export const RATING_SCALE = [
  { value: 5, label: '5 - Outstanding' },
  { value: 4, label: '4 - Exceeds Expectations' },
  { value: 3, label: '3 - Meets Expectations' },
  { value: 2, label: '2 - Needs Improvement' },
  { value: 1, label: '1 - Unsatisfactory' },
];


// MOCK_USERS_DATA: Example User Structures
// -----------------------------------------
// This array provides examples of what user profile data looks like in the Realtime Database.
// IT IS NOT USED TO AUTOMATICALLY CREATE OR SEED USERS.
//
// To add test users to your application:
// 1. First Admin User (Manual Setup if none exist):
//    a. In Firebase Console > Authentication: Create a user (e.g., admin@example.com). Note their UID.
//    b. In Firebase Console > Realtime Database: Under the `users` path, create a node named with the UID from step (a).
//       Inside this UID node, add: { "email": "admin@example.com", "username": "admin", "role": "admin" }
// 2. Subsequent Test Users (Via App's Admin Panel):
//    a. Log in to the application as the admin user created above.
//    b. Navigate to Dashboard > Admin Tools > User Profiles & Roles.
//    c. Click "Add User" and fill in the details. This will create both the Firebase Auth user
//       and their profile in the Realtime Database correctly.
//
// The `id` field in these examples (e.g., 'example_admin_uid') is a placeholder. In your actual
// Realtime Database, the key for each user object under the `users` path will be their
// actual Firebase Authentication User ID (UID).
export const MOCK_USERS_DATA: User[] = [
  { id: 'example_admin_uid', email: 'admin@example.com', username: 'admin', role: 'admin' as const, availableLeaves: 20, compensatoryLeaves: 5 },
  { id: 'example_editor_uid_1', email: 'editor1@example.com', username: 'editorOne', role: 'editor' as const, editorLevelId: 'level_1_junior', availableLeaves: 15, compensatoryLeaves: 2 },
  { id: 'example_editor_uid_2', email: 'alice@example.com', username: 'alice', role: 'editor' as const, editorLevelId: 'level_2_mid', availableLeaves: 15, compensatoryLeaves: 0 },
  { id: 'example_editor_uid_3', email: 'bob@example.com', username: 'bob', role: 'editor' as const, editorLevelId: 'level_3_senior', availableLeaves: 18, compensatoryLeaves: 0 },
];

export const INITIAL_EDITOR_LEVELS: EditorLevel[] = [
  { id: 'level_1_junior', name: 'Junior Editor', description: 'Entry-level editor, typically handles straightforward tasks and requires some supervision.', order: 0 },
  { id: 'level_2_mid', name: 'Mid-Level Editor', description: 'Experienced editor capable of handling most standard tasks independently and delivering consistent quality.', order: 1 },
  { id: 'level_3_senior', name: 'Senior Editor', description: 'Highly experienced editor, capable of complex projects, mentoring others, and quality assurance.', order: 2 },
  { id: 'level_4_lead', name: 'Lead Editor', description: 'Manages editing teams or complex workflows, sets standards, and oversees major projects.', order: 3 },
];

export const INITIAL_EDITOR_RATING_CATEGORIES: EditorRatingCategory[] = [
    { id: 'cat_1_technical', name: 'Technical Skill', description: 'Proficiency with editing software, color correction, audio mixing, and other technical aspects.', weight: 30 },
    { id: 'cat_2_creativity', name: 'Creativity & Storytelling', description: 'Ability to craft a compelling narrative, pacing, shot selection, and overall artistic input.', weight: 25 },
    { id: 'cat_3_communication', name: 'Communication', description: 'Clarity and timeliness of communication with team members and clients. Responsiveness to feedback.', weight: 20 },
    { id: 'cat_4_speed', name: 'Speed & Efficiency', description: 'Ability to deliver high-quality work within expected timeframes. Turnaround time.', weight: 15 },
    { id: 'cat_5_proactivity', name: 'Proactivity & Attitude', description: 'Initiative, problem-solving skills, and overall professionalism.', weight: 10 },
];
