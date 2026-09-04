"use client";

import React, { useMemo } from 'react';
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { Cake, ChevronLeft, ChevronRight, ListTodo, Plus } from 'lucide-react';
import type { TaskOccurrence } from '@/lib/types';
import {
  groupOccurrencesByDate,
  toDateKey,
} from '@/lib/taskCalendarUtils';
import { groupBirthdaysByDateKey } from '@/lib/birthdayUtils';
import { useTasks } from '@/hooks/useTasks';
import { useMockUsers } from '@/hooks/useMockUsers';
import { useTaskStatuses } from '@/hooks/useTaskStatuses';
import { getUserShortLabel } from '@/components/common/SearchableUserSelect';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MAX_VISIBLE_EVENTS = 3;
const MAX_VISIBLE_BIRTHDAYS = 2;

interface TaskCalendarProps {
  month: Date;
  onMonthChange: (month: Date) => void;
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
  filterUserId?: string;
  onSelectOccurrence?: (occurrence: TaskOccurrence) => void;
  onSelectBirthday?: (userId: string, date: Date) => void;
  onCreateTaskForDate?: (date: Date) => void;
}

export const TaskCalendar: React.FC<TaskCalendarProps> = ({
  month,
  onMonthChange,
  selectedDate,
  onSelectDate,
  filterUserId,
  onSelectOccurrence,
  onSelectBirthday,
  onCreateTaskForDate,
}) => {
  const { getTasksForDateRange } = useTasks();
  const { users } = useMockUsers();
  const { taskStatuses } = useTaskStatuses();

  const userById = useMemo(() => {
    return new Map(users.map((u) => [u.id, u]));
  }, [users]);

  const occurrencesByDate = useMemo(() => {
    const rangeStart = startOfMonth(month);
    const rangeEnd = endOfMonth(month);
    const occurrences = getTasksForDateRange(
      rangeStart,
      rangeEnd,
      filterUserId
    );
    return groupOccurrencesByDate(occurrences);
  }, [getTasksForDateRange, month, filterUserId]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const gridStart = startOfWeek(monthStart);
    const gridEnd = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = gridStart;
    while (day <= gridEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [month]);

  const birthdaysByDate = useMemo(() => {
    return groupBirthdaysByDateKey(users, calendarDays);
  }, [users, calendarDays]);

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  const getStatusColor = (statusId: string) =>
    taskStatuses.find((s) => s.id === statusId)?.color || '#6b7280';

  const goToPreviousMonth = () => {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    onMonthChange(startOfMonth(today));
    onSelectDate(today);
  };

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b px-3 py-3 sm:px-4">
        <h2 className="min-w-0 truncate text-base font-semibold sm:text-lg">
          {format(month, 'MMMM yyyy')}
        </h2>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button variant="outline" size="sm" className="px-2 sm:px-3" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b">
        {WEEKDAYS.map((day, idx) => (
          <div
            key={day}
            className="border-r px-0.5 py-1.5 text-center text-[10px] font-medium text-muted-foreground last:border-r-0 sm:px-2 sm:py-2 sm:text-xs"
          >
            <span className="sm:hidden">{WEEKDAYS_SHORT[idx]}</span>
            <span className="hidden sm:inline">{day}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="divide-y">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 divide-x">
            {week.map((day) => {
              const dateKey = toDateKey(day);
              const dayOccurrences = occurrencesByDate[dateKey] || [];
              const dayBirthdays = birthdaysByDate[dateKey] || [];
              const inCurrentMonth = isSameMonth(day, month);
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              const isTodayDate = isToday(day);
              const visibleBirthdayCount = Math.min(
                dayBirthdays.length,
                MAX_VISIBLE_BIRTHDAYS
              );
              const remainingEventSlots = Math.max(
                0,
                MAX_VISIBLE_EVENTS - visibleBirthdayCount
              );
              const hiddenBirthdayCount = Math.max(
                0,
                dayBirthdays.length - MAX_VISIBLE_BIRTHDAYS
              );
              const hiddenTaskCount = Math.max(
                0,
                dayOccurrences.length - remainingEventSlots
              );
              const hiddenCount = hiddenBirthdayCount + hiddenTaskCount;
              const totalItems = dayBirthdays.length + dayOccurrences.length;

              return (
                <div
                  key={dateKey}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectDate(day)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectDate(day);
                    }
                  }}
                  className={cn(
                    'group relative min-h-[3.25rem] cursor-pointer p-0.5 transition-colors hover:bg-muted/40 sm:min-h-[6rem] sm:p-1 md:min-h-[8.5rem] md:p-1.5',
                    !inCurrentMonth && 'bg-muted/20',
                    isSelected && 'bg-primary/5 ring-1 ring-inset ring-primary/30'
                  )}
                >
                  {/* Date number + add task */}
                  <div className="mb-0.5 flex items-center justify-between gap-0.5 sm:mb-1">
                    {onCreateTaskForDate && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Add task"
                        aria-label={`Add task on ${format(day, 'MMMM d, yyyy')}`}
                        className={cn(
                          'hidden h-5 w-5 shrink-0 text-muted-foreground hover:text-primary sm:inline-flex',
                          'opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100',
                          isSelected && 'opacity-100'
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateTaskForDate(day);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <span
                      className={cn(
                        'ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium sm:h-6 sm:w-6 sm:text-xs',
                        !inCurrentMonth && 'text-muted-foreground/60',
                        isTodayDate &&
                          'bg-primary text-primary-foreground font-semibold',
                        isSelected && !isTodayDate && 'bg-accent text-accent-foreground'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>

                  {/* Mobile: compact indicators */}
                  <div className="flex flex-wrap items-center justify-center gap-0.5 px-0.5 sm:hidden">
                    {dayBirthdays.length > 0 && (
                      <Cake className="h-2.5 w-2.5 text-rose-500" aria-hidden />
                    )}
                    {dayOccurrences.slice(0, 3).map((occ) => (
                      <span
                        key={`${occ.task.id}-${occ.dateKey}-dot`}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: getStatusColor(occ.statusId) }}
                        aria-hidden
                      />
                    ))}
                    {totalItems > 4 && (
                      <span className="text-[8px] leading-none text-muted-foreground">
                        +{totalItems - 4}
                      </span>
                    )}
                  </div>

                  {/* sm+: Birthdays + task events */}
                  <div className="hidden space-y-0.5 sm:block">
                    {dayBirthdays.slice(0, MAX_VISIBLE_BIRTHDAYS).map((bday) => (
                      <button
                        key={`bday-${bday.userId}`}
                        type="button"
                        title={`Birthday — ${bday.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDate(day);
                          onSelectBirthday?.(bday.userId, day);
                        }}
                        className="flex w-full items-center gap-1 rounded border border-rose-200 bg-rose-50 px-1 py-0.5 text-left text-rose-800 transition-opacity hover:opacity-80 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200 md:px-1.5 md:py-1"
                      >
                        <Cake className="h-3 w-3 shrink-0 opacity-90" />
                        <span className="min-w-0 flex-1 truncate text-[10px] font-medium leading-tight md:text-[11px]">
                          {bday.name}
                        </span>
                      </button>
                    ))}
                    {dayOccurrences.slice(0, remainingEventSlots).map((occ) => {
                      const assigneeName = getUserShortLabel(
                        userById.get(occ.task.assigneeId)
                      );

                      return (
                      <button
                        key={`${occ.task.id}-${occ.dateKey}`}
                        type="button"
                        title={`${occ.task.title} — ${assigneeName}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDate(day);
                          onSelectOccurrence?.(occ);
                        }}
                        className="flex w-full items-start gap-1 rounded px-1 py-0.5 text-left text-white transition-opacity hover:opacity-80 md:px-1.5 md:py-1"
                        style={{ backgroundColor: getStatusColor(occ.statusId) }}
                      >
                        <ListTodo className="mt-0.5 h-3 w-3 shrink-0 opacity-90" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[10px] font-medium leading-tight md:text-[11px]">
                            {occ.task.title}
                          </span>
                          <span className="hidden truncate text-[10px] leading-tight opacity-90 md:block">
                            {assigneeName}
                          </span>
                        </span>
                      </button>
                      );
                    })}
                    {hiddenCount > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDate(day);
                        }}
                        className="w-full truncate px-1 text-left text-[10px] text-muted-foreground hover:text-foreground md:px-1.5"
                      >
                        +{hiddenCount} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export type { TaskOccurrence };
