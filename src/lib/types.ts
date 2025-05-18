
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
  projectType: string;
  durationHours: number;
  completedAt?: string; // ISO string format, set when task is marked complete
  isRevision: boolean;
}

export type ProjectType = 'New Feature' | 'Bug Fix' | 'Documentation' | 'Meeting' | 'Refactor' | 'Testing';
