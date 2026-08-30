"use client";

import { useState, useEffect, useCallback } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, set, push, remove, update as firebaseUpdate } from 'firebase/database';
import { INITIAL_TASK_STATUSES, FIREBASE_TASK_STATUSES_PATH } from '@/lib/constants';
import type { TaskStatus } from '@/lib/types';
import { useLoader } from './useLoader';
import { useToast } from './use-toast';

const TASK_STATUSES_LOADER_ID = "firebase_task_statuses_loader";

export const useTaskStatuses = () => {
  const [taskStatuses, setTaskStatusesState] = useState<TaskStatus[]>([]);
  const [isLoadingTaskStatuses, setIsLoadingTaskStatuses] = useState(true);
  const { showLoader, hideLoader } = useLoader();
  const { toast } = useToast();

  const sortStatuses = (statuses: TaskStatus[]) =>
    statuses.sort((a, b) => a.order - b.order);

  useEffect(() => {
    showLoader(TASK_STATUSES_LOADER_ID, "Loading task statuses...");
    setIsLoadingTaskStatuses(true);

    if (!database) {
      setTaskStatusesState(sortStatuses(INITIAL_TASK_STATUSES));
      setIsLoadingTaskStatuses(false);
      hideLoader(TASK_STATUSES_LOADER_ID);
      return;
    }

    const dbRef = ref(database, FIREBASE_TASK_STATUSES_PATH);
    const unsubscribe = onValue(
      dbRef,
      (snapshot) => {
        try {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const statusesArray = Object.entries(data).map(([id, statusData]) => ({
              id,
              ...(statusData as Omit<TaskStatus, 'id'>),
              order: (statusData as TaskStatus).order ?? 0,
            }));
            setTaskStatusesState(sortStatuses(statusesArray));
          } else {
            const initialToSeed: Record<string, Omit<TaskStatus, 'id'>> = {};
            INITIAL_TASK_STATUSES.forEach((status) => {
              initialToSeed[status.id] = {
                name: status.name,
                color: status.color,
                order: status.order,
                ...(status.isDefault ? { isDefault: true } : {}),
              };
            });
            set(dbRef, initialToSeed)
              .then(() => setTaskStatusesState(sortStatuses(INITIAL_TASK_STATUSES)))
              .catch(() => setTaskStatusesState(sortStatuses(INITIAL_TASK_STATUSES)));
          }
        } catch {
          setTaskStatusesState(sortStatuses(INITIAL_TASK_STATUSES));
        } finally {
          setIsLoadingTaskStatuses(false);
          hideLoader(TASK_STATUSES_LOADER_ID);
        }
      },
      () => {
        setIsLoadingTaskStatuses(false);
        hideLoader(TASK_STATUSES_LOADER_ID);
        setTaskStatusesState(sortStatuses(INITIAL_TASK_STATUSES));
      }
    );

    return () => {
      unsubscribe();
      hideLoader(TASK_STATUSES_LOADER_ID);
    };
  }, [showLoader, hideLoader]);

  const getDefaultStatus = useCallback((): TaskStatus | undefined => {
    return taskStatuses.find((s) => s.isDefault) ?? taskStatuses[0];
  }, [taskStatuses]);

  const addTaskStatus = useCallback(
    async (
      name: string,
      color: string
    ): Promise<{ success: boolean; message?: string; id?: string }> => {
      if (!database) return { success: false, message: "Firebase DB not available." };
      if (!name.trim()) return { success: false, message: "Status name cannot be empty." };
      if (
        taskStatuses.some(
          (s) => s.name.toLowerCase() === name.trim().toLowerCase()
        )
      ) {
        return { success: false, message: `A status named "${name.trim()}" already exists.` };
      }

      const newRef = push(ref(database, FIREBASE_TASK_STATUSES_PATH));
      const newId = newRef.key;
      if (!newId) return { success: false, message: "Could not generate status ID." };

      const newOrder =
        taskStatuses.length > 0
          ? Math.max(...taskStatuses.map((s) => s.order)) + 1
          : 0;

      try {
        await set(newRef, {
          name: name.trim(),
          color,
          order: newOrder,
        });
        return { success: true, id: newId };
      } catch {
        return { success: false, message: "Failed to add status." };
      }
    },
    [taskStatuses]
  );

  const updateTaskStatus = useCallback(
    async (
      id: string,
      name: string,
      color: string,
      newOrderDisplay?: number
    ): Promise<{ success: boolean; message?: string }> => {
      if (!database) return { success: false, message: "Firebase DB not available." };
      if (!name.trim()) return { success: false, message: "Status name cannot be empty." };

      const sorted = sortStatuses([...taskStatuses]);
      const idx = sorted.findIndex((s) => s.id === id);
      if (idx === -1) return { success: false, message: "Status not found." };

      if (
        sorted.some(
          (s) => s.id !== id && s.name.toLowerCase() === name.trim().toLowerCase()
        )
      ) {
        return { success: false, message: `Another status named "${name.trim()}" already exists.` };
      }

      let final = [...sorted];
      let statusToUpdate = {
        ...final[idx],
        name: name.trim(),
        color,
      };

      let orderChanged = false;
      if (newOrderDisplay !== undefined) {
        const targetOrder = Math.max(
          0,
          Math.min(newOrderDisplay - 1, final.length - 1)
        );
        if (targetOrder !== statusToUpdate.order) {
          orderChanged = true;
          statusToUpdate = { ...statusToUpdate, order: -1 };
          final.splice(idx, 1);
          final.splice(targetOrder, 0, statusToUpdate);
          final = final.map((s, i) => ({ ...s, order: i }));
        }
      } else {
        final[idx] = statusToUpdate;
      }

      const updates: Record<string, TaskStatus | Omit<TaskStatus, 'id'>> = {};
      if (orderChanged) {
        final.forEach((s) => {
          updates[`${FIREBASE_TASK_STATUSES_PATH}/${s.id}`] = {
            name: s.name,
            color: s.color,
            order: s.order,
            ...(s.isDefault ? { isDefault: true } : {}),
          };
        });
      } else {
        updates[`${FIREBASE_TASK_STATUSES_PATH}/${id}`] = {
          name: name.trim(),
          color,
          order: final[idx].order,
          ...(final[idx].isDefault ? { isDefault: true } : {}),
        };
      }

      try {
        await firebaseUpdate(ref(database), updates);
        return { success: true };
      } catch {
        return { success: false, message: "Failed to update status." };
      }
    },
    [taskStatuses]
  );

  const setDefaultTaskStatus = useCallback(
    async (id: string): Promise<{ success: boolean; message?: string }> => {
      if (!database) return { success: false, message: "Firebase DB not available." };

      const updates: Record<string, boolean | null> = {};
      taskStatuses.forEach((s) => {
        if (s.id === id) {
          updates[`${FIREBASE_TASK_STATUSES_PATH}/${s.id}/isDefault`] = true;
        } else if (s.isDefault) {
          updates[`${FIREBASE_TASK_STATUSES_PATH}/${s.id}/isDefault`] = null;
        }
      });

      try {
        await firebaseUpdate(ref(database), updates);
        return { success: true };
      } catch {
        return { success: false, message: "Failed to set default status." };
      }
    },
    [taskStatuses]
  );

  const deleteTaskStatus = useCallback(
    async (
      id: string,
      isInUse: boolean
    ): Promise<{ success: boolean; message?: string }> => {
      if (!database) return { success: false, message: "Firebase DB not available." };
      if (isInUse) {
        return {
          success: false,
          message: "Cannot delete a status that is used by tasks.",
        };
      }

      const sorted = sortStatuses([...taskStatuses]);
      const toDelete = sorted.find((s) => s.id === id);
      if (!toDelete) return { success: false, message: "Status not found." };
      if (toDelete.isDefault) {
        return { success: false, message: "Cannot delete the default status." };
      }

      try {
        await remove(ref(database, `${FIREBASE_TASK_STATUSES_PATH}/${id}`));
        const remaining = sorted.filter((s) => s.id !== id);
        const updates: Record<string, number> = {};
        remaining.forEach((s, index) => {
          if (s.order !== index) {
            updates[`${FIREBASE_TASK_STATUSES_PATH}/${s.id}/order`] = index;
          }
        });
        if (Object.keys(updates).length > 0) {
          await firebaseUpdate(ref(database), updates);
        }
        return { success: true };
      } catch {
        return { success: false, message: "Failed to delete status." };
      }
    },
    [taskStatuses]
  );

  const moveTaskStatus = useCallback(
    async (
      id: string,
      direction: 'up' | 'down'
    ): Promise<{ success: boolean; message?: string }> => {
      if (!database) return { success: false, message: "Firebase not connected." };

      const sorted = sortStatuses([...taskStatuses]);
      const idx = sorted.findIndex((s) => s.id === id);
      if (idx === -1) return { success: false, message: "Status not found." };

      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= sorted.length) {
        return { success: true, message: "Already at boundary." };
      }

      const a = sorted[idx];
      const b = sorted[newIdx];
      const updates: Record<string, number> = {
        [`${FIREBASE_TASK_STATUSES_PATH}/${a.id}/order`]: b.order,
        [`${FIREBASE_TASK_STATUSES_PATH}/${b.id}/order`]: a.order,
      };

      try {
        await firebaseUpdate(ref(database), updates);
        return { success: true };
      } catch {
        return { success: false, message: "Failed to reorder status." };
      }
    },
    [taskStatuses]
  );

  return {
    taskStatuses,
    isLoadingTaskStatuses,
    getDefaultStatus,
    addTaskStatus,
    updateTaskStatus,
    setDefaultTaskStatus,
    deleteTaskStatus,
    moveTaskStatus,
  };
};
