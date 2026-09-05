"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Cake, ListTodo } from 'lucide-react';
import { format } from 'date-fns';
import { get, ref, update } from 'firebase/database';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { useTaskStatuses } from '@/hooks/useTaskStatuses';
import { useMockUsers } from '@/hooks/useMockUsers';
import { database } from '@/lib/firebase';
import { FIREBASE_USERS_PATH } from '@/lib/constants';
import {
  getBirthdaysOnDate,
  getUserBirthdayLabel,
  isBirthdayToday,
} from '@/lib/birthdayUtils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskStatusBadge } from '@/components/tasks/TaskStatusBadge';

/** Local calendar date key used for once-per-day briefing (YYYY-MM-DD). */
function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const DailyBriefingDialog: React.FC = () => {
  const { user, isAuthLoading, isSuperAdmin } = useAuth();
  const { getTasksForDate, isLoading: isLoadingTasks } = useTasks();
  const { taskStatuses, isLoadingTaskStatuses } = useTaskStatuses();
  const { users, isUsersLoading } = useMockUsers();
  const [isOpen, setIsOpen] = useState(false);
  const markedSeenRef = useRef(false);

  const isDataReady =
    !isAuthLoading &&
    !!user &&
    !isLoadingTasks &&
    !isLoadingTaskStatuses &&
    !isUsersLoading;

  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => getLocalDateKey(today), [today]);
  const todayLabel = format(today, 'EEEE, MMMM d');

  const todoStatus = useMemo(
    () => taskStatuses.find((s) => s.isDefault) ?? taskStatuses[0],
    [taskStatuses]
  );

  /** Only To Do occurrences scheduled for today (one-time due today or recurring on today). */
  const myTodoOccurrences = useMemo(() => {
    if (!user?.id || !todoStatus) return [];
    return getTasksForDate(today, user.id).filter(
      (occ) => occ.statusId === todoStatus.id
    );
  }, [getTasksForDate, today, user?.id, todoStatus]);

  const todaysBirthdays = useMemo(() => {
    if (!users.length || !user?.id) return [];
    return getBirthdaysOnDate(users, today, { excludeUserId: user.id });
  }, [users, today, user?.id]);

  const isOwnBirthday = !!(user?.dateOfBirth && isBirthdayToday(user.dateOfBirth));
  const ownBirthdayMessage =
    user?.dateOfBirthMessage?.trim() ||
    (user ? `Happy Birthday, ${getUserBirthdayLabel(user)}!` : '');

  const hasTodos = myTodoOccurrences.length > 0;
  const hasBirthdays = todaysBirthdays.length > 0;
  // Popup open decision: only today's To Do tasks
  const shouldShowBriefing = hasTodos;

  const markBriefingSeen = useCallback(async () => {
    if (!user?.id || !database || markedSeenRef.current) return;
    markedSeenRef.current = true;
    try {
      await update(ref(database, `${FIREBASE_USERS_PATH}/${user.id}`), {
        lastDailyBriefingSeenDate: todayKey,
      });
    } catch (error) {
      markedSeenRef.current = false;
      console.error('Failed to save daily briefing seen date:', error);
    }
  }, [user?.id, todayKey]);

  useEffect(() => {
    if (!isDataReady || !user || !shouldShowBriefing) return;
    let cancelled = false;

    const maybeOpenBriefing = async () => {
      // Fast path from auth profile
      if (user.lastDailyBriefingSeenDate === todayKey) return;

      // Source of truth: user profile in RTDB (works across browsers)
      if (database) {
        try {
          const snapshot = await get(
            ref(database, `${FIREBASE_USERS_PATH}/${user.id}/lastDailyBriefingSeenDate`)
          );
          if (snapshot.exists() && snapshot.val() === todayKey) {
            return;
          }
        } catch (error) {
          console.error('Failed to read daily briefing seen date:', error);
        }
      }

      if (!cancelled) {
        setIsOpen(true);
      }
    };

    void maybeOpenBriefing();
    return () => {
      cancelled = true;
    };
  }, [isDataReady, user, shouldShowBriefing, todayKey]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      void markBriefingSeen();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    void markBriefingSeen();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Today&apos;s briefing</DialogTitle>
          <DialogDescription>
            {hasBirthdays || isOwnBirthday
              ? `Your to-do tasks and birthday notes for ${todayLabel}.`
              : `Your open to-do tasks for ${todayLabel}.`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="space-y-5">
            {isOwnBirthday && (
              <section className="rounded-md border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/50 dark:bg-rose-950/40">
                <div className="mb-1 flex items-center gap-2 font-medium text-rose-900 dark:text-rose-100">
                  <Cake className="h-4 w-4" />
                  Happy Birthday!
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-rose-950 dark:text-rose-100">
                  {ownBirthdayMessage}
                </p>
              </section>
            )}

            {hasTodos && (
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <ListTodo className="h-4 w-4 text-muted-foreground" />
                    To Do today
                  </h3>
                  <Badge variant="secondary">{myTodoOccurrences.length}</Badge>
                </div>
                <ul className="space-y-2">
                  {myTodoOccurrences.map((occ) => (
                    <li key={`${occ.task.id}-${occ.dateKey}`} className="rounded-md border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium leading-snug">{occ.task.title}</p>
                        <TaskStatusBadge statusId={occ.statusId} />
                      </div>
                      {occ.task.type === 'recurring' && occ.task.recurrence && (
                        <p className="mt-1 text-xs capitalize text-muted-foreground">
                          {occ.task.recurrence}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {hasBirthdays && (
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Cake className="h-4 w-4 text-rose-600" />
                    Birthdays today
                  </h3>
                  <Badge variant="secondary">{todaysBirthdays.length}</Badge>
                </div>
                <ul className="space-y-2">
                  {todaysBirthdays.map((bday) => {
                    const birthdayUser = users.find((u) => u.id === bday.userId);
                    const message = birthdayUser?.dateOfBirthMessage?.trim();
                    const canViewMessage = isSuperAdmin && !!message;
                    return (
                      <li
                        key={bday.userId}
                        className="rounded-md border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/50 dark:bg-rose-950/40"
                      >
                        <p className="font-medium text-rose-950 dark:text-rose-100">
                          {bday.name}
                        </p>
                        {birthdayUser?.role && (
                          <p className="text-xs capitalize text-rose-800/80 dark:text-rose-200/80">
                            {birthdayUser.role}
                          </p>
                        )}
                        {canViewMessage && (
                          <p className="mt-1 whitespace-pre-wrap text-sm text-rose-900 dark:text-rose-100">
                            {message}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" asChild>
            <Link href="/dashboard/task-calendar" onClick={handleClose}>
              Open Task Calendar
            </Link>
          </Button>
          <Button onClick={handleClose}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
