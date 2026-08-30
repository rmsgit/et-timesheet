import type { Task, User } from '@/lib/types';

export function getAssignableUsers(currentUser: User, allUsers: User[]): User[] {
  if (!currentUser.role) return [];

  if (currentUser.role === 'editor') {
    return allUsers.filter((u) => u.id === currentUser.id);
  }

  if (currentUser.role === 'admin') {
    return allUsers.filter(
      (u) => u.id === currentUser.id || u.role === 'editor'
    );
  }

  if (currentUser.role === 'super admin') {
    return allUsers.filter(
      (u) =>
        u.id === currentUser.id ||
        u.role === 'admin' ||
        u.role === 'editor'
    );
  }

  return [];
}

export function canAssignToUser(
  currentUser: User,
  targetUserId: string,
  allUsers: User[]
): boolean {
  return getAssignableUsers(currentUser, allUsers).some(
    (u) => u.id === targetUserId
  );
}

export function canChangeTaskStatus(
  currentUser: User,
  task: Task,
  allUsers: User[]
): boolean {
  if (!currentUser.role) return false;

  if (currentUser.role === 'super admin') return true;

  if (task.assigneeId === currentUser.id) return true;

  if (currentUser.role === 'admin') {
    const assignee = allUsers.find((u) => u.id === task.assigneeId);
    return assignee?.role === 'editor';
  }

  return false;
}

export function canDeleteTask(
  currentUser: User,
  task: Task,
  isSuperAdmin: boolean
): boolean {
  if (isSuperAdmin) return true;
  return task.createdById === currentUser.id;
}

export function canEditTask(
  currentUser: User,
  task: Task,
  isSuperAdmin: boolean
): boolean {
  if (isSuperAdmin) return true;
  return task.createdById === currentUser.id;
}

/** Whether the current user may see a task on the calendar. */
export function isTaskVisibleToViewer(
  task: Task,
  currentUser: User,
  allUsers: User[],
  isSuperAdmin: boolean
): boolean {
  if (!currentUser.role) return false;
  if (isSuperAdmin) return true;

  const assignee = allUsers.find((u) => u.id === task.assigneeId);

  if (currentUser.role === 'editor') {
    return task.assigneeId === currentUser.id;
  }

  if (currentUser.role === 'admin') {
    // Admins must not see tasks assigned to super admins
    if (assignee?.role === 'super admin') return false;
    // Own assigned tasks
    if (task.assigneeId === currentUser.id) return true;
    // Editor tasks (for management)
    if (assignee?.role === 'editor') return true;
    return false;
  }

  return false;
}

export function filterTasksForViewer(
  tasks: Task[],
  currentUser: User,
  allUsers: User[],
  isSuperAdmin: boolean,
  filterUserId?: string
): Task[] {
  let visible = tasks.filter((task) =>
    isTaskVisibleToViewer(task, currentUser, allUsers, isSuperAdmin)
  );

  if (filterUserId) {
    visible = visible.filter((task) => task.assigneeId === filterUserId);
  }

  return visible;
}

/** Users available in the calendar user filter dropdown. */
export function getCalendarFilterUsers(
  currentUser: User,
  allUsers: User[],
  isSuperAdmin: boolean
): User[] {
  if (isSuperAdmin) {
    return allUsers.filter(
      (u) =>
        u.role === 'editor' || u.role === 'admin' || u.role === 'super admin'
    );
  }
  if (currentUser.role === 'admin') {
    return getAssignableUsers(currentUser, allUsers);
  }
  return [];
}
