
export type WorkType = 'New work' | 'Revision' | 'Sample work';

export interface User {
  id: string; // Firebase UID
  email: string | null; // From Firebase Auth
  username: string; // From RTDB (can be email as fallback if not in RTDB)
  role: 'admin' | 'editor' | null; // From RTDB
}

export interface TimeRecord {
  id: string;
  userId: string; // To associate record with an editor (Firebase UID)
  date: string; // ISO string format for date
  projectName: string;
  projectType: string; // This is the type like 'Bug Fix', 'New Feature'
  workType: WorkType; // This is 'New work', 'Revision', or 'Sample work'
  durationHours: number; // Actual work duration, set upon completion. Defaults to 0 for pending.
  projectDurationMinutes?: number; // Duration of the video project itself, in minutes
  completedAt?: string; // ISO string format, set when task is marked complete
}

export type ProjectType = 'New Feature' | 'Bug Fix' | 'Documentation' | 'Meeting' | 'Refactor' | 'Testing';


