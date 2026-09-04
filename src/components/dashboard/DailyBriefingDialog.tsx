"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Cake, ListTodo } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { useTaskStatuses } from '@/hooks/useTaskStatuses';
import { useMockUsers } from '@/hooks/useMockUsers';
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
import type { Task } from '@/lib/types';

function getDailyBriefingStorageKey(userId: string): string {
  const today = new Date();
  const dateKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  // v2: reset earlier keys that may have been set when the dialog opened empty
  return `daily-briefing-v2-shown-${userId}-${dateKey}`;
}

export const DailyBriefingDialog: React.FC = () => {
  const { user, isAuthLoading, isSuperAdmin } = useAuth();
  const { tasks, isLoading: isLoadingTasks } = useTasks();
  const { taskStatuses, isLoadingTaskStatuses } = useTaskStatuses();
  const { users, isUsersLoading } = useMockUsers();
  const [isOpen, setIsOpen] = useState(false);

  const isDataReady =
    !isAuthLoading &&
    !!user &&
    !isLoadingTasks &&
    !isLoadingTaskStatuses &&
    !isUsersLoading;

  const today = useMemo(() => new Date(), []);
  const todayLabel = format(today, 'EEEE, MMMM d');

  const todoStatus = useMemo(
    () => taskStatuses.find((s) => s.isDefault) ?? taskStatuses[0],
    [taskStatuses]
  );

  /** Same rule as the Task Calendar sidebar badge: open To Do items assigned to me. */
  const myTodoTasks = useMemo((): Task[] => {
    if (!user?.id || !todoStatus) return [];
    return tasks.filter(
      (task) =>
        task.assigneeId === user.id && task.statusId === todoStatus.id
    );
  }, [tasks, user?.id, todoStatus]);

  const todaysBirthdays = useMemo(() => {
    if (!users.length || !user?.id) return [];
    return getBirthdaysOnDate(users, today, { excludeUserId: user.id });
  }, [users, today, user?.id]);

  const isOwnBirthday = !!(user?.dateOfBirth && isBirthdayToday(user.dateOfBirth));
  const ownBirthdayMessage =
    user?.dateOfBirthMessage?.trim() ||
    (user ? `Happy Birthday, ${getUserBirthdayLabel(user)}!` : '');

  const hasTodos = myTodoTasks.length > 0;
  const hasBirthdays = todaysBirthdays.length > 0;
  const hasContent = hasTodos || hasBirthdays || isOwnBirthday;

  useEffect(() => {
    if (!isDataReady || !user) return;
    if (!hasContent) return;

    const storageKey = getDailyBriefingStorageKey(user.id);
    if (typeof window !== 'undefined' && sessionStorage.getItem(storageKey)) {
      return;
    }

    setIsOpen(true);
    sessionStorage.setItem(storageKey, 'true');
  }, [isDataReady, user, hasContent]);

  const handleClose = () => setIsOpen(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Today&apos;s briefing</DialogTitle>
          <DialogDescription>
            {hasTodos && (hasBirthdays || isOwnBirthday)
              ? `Your to-do tasks and birthday notes for ${todayLabel}.`
              : hasTodos
                ? `Your open to-do tasks — ${todayLabel}.`
                : isOwnBirthday && !hasBirthdays
                  ? `Your birthday message for ${todayLabel}.`
                  : `Birthdays for ${todayLabel}.`}
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
                    To Do tasks
                  </h3>
                  <Badge variant="secondary">{myTodoTasks.length}</Badge>
                </div>
                <ul className="space-y-2">
                  {myTodoTasks.map((task) => (
                    <li key={task.id} className="rounded-md border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium leading-snug">{task.title}</p>
                        <TaskStatusBadge statusId={task.statusId} />
                      </div>
                      {task.type === 'recurring' && task.recurrence && (
                        <p className="mt-1 text-xs capitalize text-muted-foreground">
                          {task.recurrence}
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
