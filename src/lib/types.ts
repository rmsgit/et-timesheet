
export interface User {
  id: string;
  username: string;
  role: 'admin' | 'editor';
  // password will not be stored or directly handled in client-side app beyond login form
}

export interface TimeRecord {
  id: string;
  userId: string; // To associate record with an editor
  date: string; // ISO string format for date
  projectName: string;
  projectType: string;
  durationHours: number;
  completedAt?: string; // ISO string format, set when task is marked complete
  isRevision: boolean;
}

export type ProjectType = 'New Feature' | 'Bug Fix' | 'Documentation' | 'Meeting' | 'Refactor' | 'Testing';
