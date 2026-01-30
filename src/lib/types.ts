
export type WorkType = 'New work' | 'Revision' | 'Sample work';

export interface User {
  id: string; // Firebase UID
  email: string | null; // From Firebase Auth
  username: string; // From RTDB (can be email as fallback if not in RTDB)
  role: 'admin' | 'editor' | null; // From RTDB
  editorLevelId?: string; // ID of the assigned EditorLevel
  isEligibleForMorningOT?: boolean;
  availableLeaves?: number;
  compensatoryLeaves?: number;
  claimedCompensatoryYears?: { [year: string]: number };

  // Payroll fields
  baseSalary?: number;
  department?: string;
  jobDesignation?: string;
  conveyanceAllowance?: number;
  joiningDate?: string; // ISO string
}

export interface CategoryRating {
  categoryId: string;
  rating: number; // 1-5
  notes?: string;
}

export interface PerformanceReview {
    id: string;
    editorId: string;
    adminId: string;
    date: string; // ISO string
    overallComment: string;
    categoryRatings: CategoryRating[];
}

export interface TimeRecord {
  id: string;
  userId: string; // To associate record with an editor (Firebase UID)
  date: string; // ISO string format for date (user-selected work date)
  entryCreatedAt?: string; // ISO string format, timestamp of when the record entry was created
  projectName: string;
  projectType: string; // This is the type like 'Bug Fix', 'New Feature'
  workType: WorkType; // This is 'New work', 'Revision', or 'Sample work'
  durationHours: number; // Actual work duration, set upon completion. Defaults to 0 for pending.
  projectDurationSeconds?: number; // Duration of the video project itself, in total seconds
  completedAt?: string; // ISO string format, set when task is marked complete
  reChecked?: boolean; // To mark if the record has been re-checked

  // New fields for pause/resume
  isPaused?: boolean;
  pausedAt?: string; // ISO string, time when the timer was last paused
  accumulatedPausedDurationSeconds?: number; // Total seconds the timer has been paused
}

export type ProjectType = 'New Feature' | 'Bug Fix' | 'Documentation' | 'Meeting' | 'Refactor' | 'Testing';

export interface EditorLevel {
  id: string;
  name: string;
  description: string;
  order: number; // New field for sorting
}

export interface EditorRatingCategory {
  id: string;
  name: string;
  description: string;
  weight: number;
}

export type LeaveType = 'full-day' | 'half-day' | 'short-leave' | 'compensatory';

export interface LeaveRequest {
  id: string;
  userId: string;
  leaveType: LeaveType;
  date: string; // ISO string
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requestedAt: string; // ISO string
  reviewedBy?: string; // admin user id
  reviewedAt?: string; // ISO string
  cancelledBy?: string; // user id who cancelled
  cancelledAt?: string; // ISO string
  earnedInYear?: number;
}

export interface AttendanceRecord {
  date: string;
  checkIn: string;
  checkOut: string;
  overtime: string;
  leaveInfo: string;
  earlyLeave: string;
}

export interface Holiday {
  id: string;
  date: string; // ISO string
  name: string;
  isWorkingDay?: boolean;
}

export interface Paysheet {
  id: string; // Composite key: ${userId}_${year}-${month}
  userId: string;
  username: string;
  payPeriod: string; // e.g., "August 2024"
  year: string;
  month: string;
  baseSalary: number;
  conveyanceAllowance: number;
  otAmount?: number;
  specialWorkingDayAmount?: number;
  noLeaveBonusAmount?: number;
  otherPayment: number;
  totalEarnings: number;
  unpaidLeaveDeduction: number;
  totalDeductions: number;
  netSalary: number;
  totalWorkingDays: number;
  presentDays: number;
  allowedLeaves: number;
  leaveDays: number;
  absentDays: number;
  totalOTHours: string;
  generatedAt: string; // ISO string
  presentOnSpecialWorkingDays?: number;
}

export interface GlobalSettings {
  otRate: number; // rate per hour
  epfRate: number; // percentage
  noLeaveBonusOneYearOrMore?: number;
  noLeaveBonusLessThanOneYear?: number;
}
