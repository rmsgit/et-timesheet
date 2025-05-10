
import type { ProjectType, User } from './types';

export const PROJECT_TYPES: ProjectType[] = [
  'New Feature',
  'Bug Fix',
  'Documentation',
  'Meeting',
  'Refactor',
  'Testing',
];

export const LOCAL_STORAGE_USER_KEY = 'editors_timesheet_user'; // Still used for mock login session

// These are no longer primary sources of data, Firebase is.
// export const LOCAL_STORAGE_TIMESHEET_KEY = 'editors_timesheet_data'; 
// export const LOCAL_STORAGE_USERS_MOCK_KEY = 'editors_timesheet_users_mock';
// export const LOCAL_STORAGE_PROJECT_TYPES_KEY = 'editors_project_types_key';

export const FIREBASE_USERS_PATH = 'users';
export const FIREBASE_PROJECT_TYPES_PATH = 'projectTypes';
export const FIREBASE_TIMESHEET_PATH = 'timeRecords';


export const MOCK_USERS_DATA: User[] = [
  { id: 'admin1', username: 'admin', role: 'admin' as const },
  { id: 'editor1', username: 'editor', role: 'editor' as const },
  { id: 'editor2', username: 'alice', role: 'editor' as const },
  { id: 'editor3', username: 'bob', role: 'editor' as const },
];
