
import type { ProjectType, User } from './types';

export const PROJECT_TYPES: ProjectType[] = [
  'New Feature',
  'Bug Fix',
  'Documentation',
  'Meeting',
  'Refactor',
  'Testing',
];

export const LOCAL_STORAGE_USER_KEY = 'editors_timesheet_user';
export const LOCAL_STORAGE_TIMESHEET_KEY = 'editors_timesheet_data';
export const LOCAL_STORAGE_USERS_MOCK_KEY = 'editors_timesheet_users_mock';

export const MOCK_USERS_DATA: User[] = [
  { id: 'admin1', username: 'admin', role: 'admin' as const },
  { id: 'editor1', username: 'editor', role: 'editor' as const },
  { id: 'editor2', username: 'alice', role: 'editor' as const },
  { id: 'editor3', username: 'bob', role: 'editor' as const },
];
