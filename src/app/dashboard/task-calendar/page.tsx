"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMockUsers } from '@/hooks/useMockUsers';
import { useTasks } from '@/hooks/useTasks';
import { getCalendarFilterUsers } from '@/lib/taskPermissions';
import { getBirthdaysOnDate } from '@/lib/birthdayUtils';
import { TaskCalendar } from '@/components/tasks/TaskCalendar';
import { TaskDayDetail } from '@/components/tasks/TaskDayDetail';
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';
import { TaskDetailDialog } from '@/components/tasks/TaskDetailDialog';
import { BirthdayDetailDialog } from '@/components/tasks/BirthdayDetailDialog';
import type { Task, TaskOccurrence } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SearchableUserSelect } from '@/components/common/SearchableUserSelect';
import { CalendarDays, Loader2, PlusCircle } from 'lucide-react';
import { startOfMonth } from 'date-fns';

export default function TaskCalendarPage() {
  const { user, isAdmin, isSuperAdmin, isAuthLoading } = useAuth();
  const { users, isUsersLoading } = useMockUsers();
  const { getTasksForDate, isLoading } = useTasks();

  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [filterUserId, setFilterUserId] = useState<string | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formDefaultDate, setFormDefaultDate] = useState<Date | undefined>(new Date());
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [selectedOccurrence, setSelectedOccurrence] = useState<TaskOccurrence | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedBirthdayUserId, setSelectedBirthdayUserId] = useState<string | null>(null);
  const [isBirthdayDetailOpen, setIsBirthdayDetailOpen] = useState(false);

  useEffect(() => {
    if (user?.id && filterUserId === undefined) {
      setFilterUserId(user.id);
    }
  }, [user?.id, filterUserId]);

  const effectiveFilterUserId = useMemo(() => {
    if (!user) return undefined;
    if (!isAdmin) return user.id;
    if (isSuperAdmin) {
      return filterUserId && filterUserId !== 'all' ? filterUserId : undefined;
    }
    // Regular admin: default to own tasks; "all" shows self + editors (never super admin)
    if (!filterUserId || filterUserId === 'all') return undefined;
    return filterUserId;
  }, [user, isAdmin, isSuperAdmin, filterUserId]);

  const dayOccurrences = useMemo(() => {
    if (!selectedDate) return [];
    return getTasksForDate(selectedDate, effectiveFilterUserId);
  }, [selectedDate, getTasksForDate, effectiveFilterUserId]);

  const dayBirthdays = useMemo(() => {
    if (!selectedDate) return [];
    return getBirthdaysOnDate(users, selectedDate);
  }, [selectedDate, users]);

  const userOptions = useMemo(() => {
    if (!user) return [];
    return getCalendarFilterUsers(user, users, isSuperAdmin).sort((a, b) =>
      (a.fullName || a.username).localeCompare(b.fullName || b.username)
    );
  }, [users, user, isSuperAdmin]);

  const handleEditFromDetail = (occurrence: TaskOccurrence) => {
    setEditingTask(occurrence.task);
    setIsFormOpen(true);
  };

  const handleOpenCreate = (date?: Date) => {
    setEditingTask(undefined);
    setFormDefaultDate(date ?? selectedDate ?? new Date());
    setIsFormOpen(true);
  };

  const handleCreateTaskForDate = (date: Date) => {
    setSelectedDate(date);
    handleOpenCreate(date);
  };

  const handleOpenBirthday = (birthdayUserId: string, date?: Date) => {
    if (date) setSelectedDate(date);
    setSelectedBirthdayUserId(birthdayUserId);
    setIsBirthdayDetailOpen(true);
  };

  if (isAuthLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 py-2 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="flex items-center text-2xl font-bold tracking-tight sm:text-3xl">
            <CalendarDays className="mr-2 h-6 w-6 shrink-0 text-primary sm:mr-3 sm:h-8 sm:w-8" />
            <span className="truncate">Task Calendar</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            View and manage one-time and recurring tasks.
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => handleOpenCreate()}>
          <PlusCircle className="mr-2 h-4 w-4" /> New Task
        </Button>
      </div>

      {(isAdmin || isSuperAdmin) && filterUserId !== undefined && (
        <div className="w-full max-w-xs space-y-2">
          <Label>Filter by user</Label>
          <SearchableUserSelect
            users={userOptions}
            value={filterUserId}
            onValueChange={setFilterUserId}
            disabled={isUsersLoading}
            includeAllOption={isSuperAdmin || (isAdmin && !isSuperAdmin)}
            allOptionLabel={isSuperAdmin ? 'All users' : 'All editors & me'}
            placeholder="Select user"
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)] lg:items-start">
          <TaskCalendar
            month={month}
            onMonthChange={setMonth}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            filterUserId={effectiveFilterUserId}
            onSelectOccurrence={(occ) => {
              setSelectedOccurrence(occ);
              setIsDetailOpen(true);
            }}
            onSelectBirthday={handleOpenBirthday}
            onCreateTaskForDate={handleCreateTaskForDate}
          />
          <TaskDayDetail
            date={selectedDate}
            occurrences={dayOccurrences}
            birthdays={dayBirthdays}
            onSelectOccurrence={(occ) => {
              setSelectedOccurrence(occ);
              setIsDetailOpen(true);
            }}
            onSelectBirthday={(birthdayUserId) => handleOpenBirthday(birthdayUserId)}
            onCreateTask={
              selectedDate ? () => handleCreateTaskForDate(selectedDate) : undefined
            }
          />
        </div>
      )}

      <TaskFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingTask(undefined);
        }}
        task={editingTask}
        defaultDate={formDefaultDate}
      />

      <TaskDetailDialog
        occurrence={selectedOccurrence}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onEdit={handleEditFromDetail}
      />

      <BirthdayDetailDialog
        userId={selectedBirthdayUserId}
        date={selectedDate}
        open={isBirthdayDetailOpen}
        onOpenChange={(open) => {
          setIsBirthdayDetailOpen(open);
          if (!open) setSelectedBirthdayUserId(null);
        }}
      />
    </div>
  );
}
