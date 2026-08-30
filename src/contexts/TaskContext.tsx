"use client";

import React, {
  createContext,
  ReactNode,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, set, push, update as firebaseUpdate, remove } from 'firebase/database';
import { FIREBASE_TASKS_PATH } from '@/lib/constants';
import type { Task, TaskOccurrence, TaskRecurrence } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { useLoader } from '@/hooks/useLoader';
import { useToast } from '@/hooks/use-toast';
import { useMockUsers } from '@/hooks/useMockUsers';
import { useTaskStatuses } from '@/hooks/useTaskStatuses';
import {
  canAssignToUser,
  canChangeTaskStatus,
  canDeleteTask,
  canEditTask,
  filterTasksForViewer,
} from '@/lib/taskPermissions';
import {
  expandTasksToOccurrences,
  getOccurrencesForDate,
  toDateKey,
} from '@/lib/taskCalendarUtils';

const TASKS_LOADER_ID = "firebase_tasks_loader";

export interface CreateTaskInput {
  title: string;
  description?: string;
  type: 'one-time' | 'recurring';
  assigneeId: string;
  dueDate?: string;
  recurrence?: TaskRecurrence;
  recurrenceStartDate?: string;
  recurrenceEndDate?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
  recurrence?: TaskRecurrence;
  recurrenceStartDate?: string;
  recurrenceEndDate?: string;
}

interface TaskContextType {
  tasks: Task[];
  isLoading: boolean;
  createTask: (input: CreateTaskInput) => Promise<{ success: boolean; id?: string }>;
  updateTask: (taskId: string, input: UpdateTaskInput) => Promise<{ success: boolean }>;
  updateTaskStatus: (
    taskId: string,
    statusId: string,
    dateKey?: string
  ) => Promise<{ success: boolean }>;
  deleteTask: (taskId: string) => Promise<{ success: boolean }>;
  getTasksForDateRange: (
    start: Date,
    end: Date,
    filterUserId?: string
  ) => TaskOccurrence[];
  getTasksForDate: (date: Date, filterUserId?: string) => TaskOccurrence[];
  isStatusInUse: (statusId: string) => boolean;
}

export const TaskContext = createContext<TaskContextType | undefined>(undefined);

interface TaskProviderProps {
  children: ReactNode;
}

export const TaskProvider: React.FC<TaskProviderProps> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isSuperAdmin } = useAuth();
  const { users } = useMockUsers();
  const { getDefaultStatus } = useTaskStatuses();
  const { showLoader, hideLoader } = useLoader();
  const { toast } = useToast();

  useEffect(() => {
    showLoader(TASKS_LOADER_ID, "Loading tasks...");
    setIsLoading(true);

    if (!database) {
      setIsLoading(false);
      hideLoader(TASKS_LOADER_ID);
      return;
    }

    const dbRef = ref(database, FIREBASE_TASKS_PATH);
    const unsubscribe = onValue(
      dbRef,
      (snapshot) => {
        try {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const tasksArray = Object.entries(data).map(([id, taskData]) => ({
              id,
              ...(taskData as Omit<Task, 'id'>),
            }));
            setTasks(tasksArray);
          } else {
            setTasks([]);
          }
        } catch {
          setTasks([]);
        } finally {
          setIsLoading(false);
          hideLoader(TASKS_LOADER_ID);
        }
      },
      () => {
        setIsLoading(false);
        hideLoader(TASKS_LOADER_ID);
        setTasks([]);
      }
    );

    return () => {
      unsubscribe();
      hideLoader(TASKS_LOADER_ID);
    };
  }, [showLoader, hideLoader]);

  const isStatusInUse = useCallback(
    (statusId: string) => {
      return tasks.some((task) => {
        if (task.statusId === statusId) return true;
        if (task.occurrenceStatuses) {
          return Object.values(task.occurrenceStatuses).includes(statusId);
        }
        return false;
      });
    },
    [tasks]
  );

  const createTask = useCallback(
    async (input: CreateTaskInput): Promise<{ success: boolean; id?: string }> => {
      if (!user) {
        toast({
          title: "Not Authenticated",
          description: "You must be logged in to create tasks.",
          variant: "destructive",
        });
        return { success: false };
      }
      if (!database) return { success: false };

      if (!input.title.trim()) {
        toast({ title: "Validation Error", description: "Title is required.", variant: "destructive" });
        return { success: false };
      }

      if (!canAssignToUser(user, input.assigneeId, users)) {
        toast({
          title: "Permission Denied",
          description: "You cannot assign tasks to this user.",
          variant: "destructive",
        });
        return { success: false };
      }

      const defaultStatus = getDefaultStatus();
      if (!defaultStatus) {
        toast({
          title: "Configuration Error",
          description: "No default task status configured.",
          variant: "destructive",
        });
        return { success: false };
      }

      const newRef = push(ref(database, FIREBASE_TASKS_PATH));
      const newId = newRef.key;
      if (!newId) return { success: false };

      const now = new Date().toISOString();
      const taskData: Omit<Task, 'id'> = {
        title: input.title.trim(),
        description: input.description?.trim() || undefined,
        type: input.type,
        assigneeId: input.assigneeId,
        createdById: user.id,
        createdAt: now,
        updatedAt: now,
        statusId: defaultStatus.id,
        ...(input.type === 'one-time'
          ? { dueDate: input.dueDate }
          : {
              recurrence: input.recurrence,
              recurrenceStartDate: input.recurrenceStartDate,
              recurrenceEndDate: input.recurrenceEndDate || undefined,
            }),
      };

      try {
        await set(newRef, taskData);
        toast({ title: "Success", description: "Task created." });
        return { success: true, id: newId };
      } catch {
        toast({ title: "Error", description: "Failed to create task.", variant: "destructive" });
        return { success: false };
      }
    },
    [user, users, getDefaultStatus, toast]
  );

  const updateTask = useCallback(
    async (taskId: string, input: UpdateTaskInput): Promise<{ success: boolean }> => {
      if (!user || !database) return { success: false };

      const task = tasks.find((t) => t.id === taskId);
      if (!task) return { success: false };

      if (!canEditTask(user, task, isSuperAdmin)) {
        toast({
          title: "Permission Denied",
          description: "You cannot edit this task.",
          variant: "destructive",
        });
        return { success: false };
      }

      if (input.assigneeId && !canAssignToUser(user, input.assigneeId, users)) {
        toast({
          title: "Permission Denied",
          description: "You cannot assign tasks to this user.",
          variant: "destructive",
        });
        return { success: false };
      }

      const updates: Partial<Task> = {
        updatedAt: new Date().toISOString(),
      };
      if (input.title !== undefined) updates.title = input.title.trim();
      if (input.description !== undefined) updates.description = input.description.trim() || undefined;
      if (input.assigneeId !== undefined) updates.assigneeId = input.assigneeId;
      if (input.dueDate !== undefined) updates.dueDate = input.dueDate;
      if (input.recurrence !== undefined) updates.recurrence = input.recurrence;
      if (input.recurrenceStartDate !== undefined) updates.recurrenceStartDate = input.recurrenceStartDate;
      if (input.recurrenceEndDate !== undefined) updates.recurrenceEndDate = input.recurrenceEndDate;

      try {
        await firebaseUpdate(ref(database, `${FIREBASE_TASKS_PATH}/${taskId}`), updates);
        toast({ title: "Success", description: "Task updated." });
        return { success: true };
      } catch {
        toast({ title: "Error", description: "Failed to update task.", variant: "destructive" });
        return { success: false };
      }
    },
    [user, tasks, users, isSuperAdmin, toast]
  );

  const updateTaskStatus = useCallback(
    async (
      taskId: string,
      statusId: string,
      dateKey?: string
    ): Promise<{ success: boolean }> => {
      if (!user || !database) return { success: false };

      const task = tasks.find((t) => t.id === taskId);
      if (!task) return { success: false };

      if (!canChangeTaskStatus(user, task, users)) {
        toast({
          title: "Permission Denied",
          description: "You cannot change this task's status.",
          variant: "destructive",
        });
        return { success: false };
      }

      const updates: Partial<Task> & Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      };

      if (task.type === 'recurring' && dateKey) {
        updates[`occurrenceStatuses/${dateKey}`] = statusId;
      } else {
        updates.statusId = statusId;
      }

      try {
        await firebaseUpdate(ref(database, `${FIREBASE_TASKS_PATH}/${taskId}`), updates);
        toast({ title: "Success", description: "Task status updated." });
        return { success: true };
      } catch {
        toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
        return { success: false };
      }
    },
    [user, tasks, users, toast]
  );

  const deleteTask = useCallback(
    async (taskId: string): Promise<{ success: boolean }> => {
      if (!user || !database) return { success: false };

      const task = tasks.find((t) => t.id === taskId);
      if (!task) return { success: false };

      if (!canDeleteTask(user, task, isSuperAdmin)) {
        toast({
          title: "Permission Denied",
          description: "You cannot delete this task.",
          variant: "destructive",
        });
        return { success: false };
      }

      try {
        await remove(ref(database, `${FIREBASE_TASKS_PATH}/${taskId}`));
        toast({ title: "Success", description: "Task deleted." });
        return { success: true };
      } catch {
        toast({ title: "Error", description: "Failed to delete task.", variant: "destructive" });
        return { success: false };
      }
    },
    [user, tasks, isSuperAdmin, toast]
  );

  const getTasksForDateRange = useCallback(
    (start: Date, end: Date, filterUserId?: string): TaskOccurrence[] => {
      if (!user) return [];
      const visible = filterTasksForViewer(
        tasks,
        user,
        users,
        isSuperAdmin,
        filterUserId
      );
      return expandTasksToOccurrences(visible, start, end);
    },
    [tasks, user, users, isSuperAdmin]
  );

  const getTasksForDate = useCallback(
    (date: Date, filterUserId?: string): TaskOccurrence[] => {
      if (!user) return [];
      const visible = filterTasksForViewer(
        tasks,
        user,
        users,
        isSuperAdmin,
        filterUserId
      );
      return getOccurrencesForDate(visible, date);
    },
    [tasks, user, users, isSuperAdmin]
  );

  const value = useMemo(
    () => ({
      tasks,
      isLoading,
      createTask,
      updateTask,
      updateTaskStatus,
      deleteTask,
      getTasksForDateRange,
      getTasksForDate,
      isStatusInUse,
    }),
    [
      tasks,
      isLoading,
      createTask,
      updateTask,
      updateTaskStatus,
      deleteTask,
      getTasksForDateRange,
      getTasksForDate,
      isStatusInUse,
    ]
  );

  return (
    <TaskContext.Provider value={value}>{children}</TaskContext.Provider>
  );
};
