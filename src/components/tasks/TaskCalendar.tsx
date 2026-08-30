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
import { ChevronLeft, ChevronRight, ListTodo, Plus } from 'lucide-react';
import type { TaskOccurrence } from '@/lib/types';
import {
  groupOccurrencesByDate,
  toDateKey,
} from '@/lib/taskCalendarUtils';
import { useTasks } from '@/hooks/useTasks';
import { useMockUsers } from '@/hooks/useMockUsers';
import { useTaskStatuses } from '@/hooks/useTaskStatuses';
import { getUserShortLabel } from '@/components/common/SearchableUserSelect';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_VISIBLE_EVENTS = 3;

interface TaskCalendarProps {
  month: Date;
  onMonthChange: (month: Date) => void;
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
  filterUserId?: string;
  onSelectOccurrence?: (occurrence: TaskOccurrence) => void;
  onCreateTaskForDate?: (date: Date) => void;
}

export const TaskCalendar: React.FC<TaskCalendarProps> = ({
  month,
  onMonthChange,
  selectedDate,
  onSelectDate,
  filterUserId,
  onSelectOccurrence,
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
    <div className="rounded-lg border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-lg font-semibold">{format(month, 'MMMM yyyy')}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
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
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="border-r px-2 py-2 text-center text-xs font-medium text-muted-foreground last:border-r-0"
          >
            {day}
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
              const inCurrentMonth = isSameMonth(day, month);
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              const isTodayDate = isToday(day);
              const hiddenCount = Math.max(0, dayOccurrences.length - MAX_VISIBLE_EVENTS);

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
                    'group relative min-h-[8.5rem] cursor-pointer p-1.5 transition-colors hover:bg-muted/40',
                    !inCurrentMonth && 'bg-muted/20',
                    isSelected && 'bg-primary/5 ring-1 ring-inset ring-primary/30'
                  )}
                >
                  {/* Date number + add task */}
                  <div className="mb-1 flex items-center justify-between gap-1">
                    {onCreateTaskForDate && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Add task"
                        aria-label={`Add task on ${format(day, 'MMMM d, yyyy')}`}
                        className={cn(
                          'h-5 w-5 shrink-0 text-muted-foreground hover:text-primary',
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
                        'ml-auto inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                        !inCurrentMonth && 'text-muted-foreground/60',
                        isTodayDate &&
                          'bg-primary text-primary-foreground font-semibold',
                        isSelected && !isTodayDate && 'bg-accent text-accent-foreground'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>

                  {/* Task events */}
                  <div className="space-y-0.5">
                    {dayOccurrences.slice(0, MAX_VISIBLE_EVENTS).map((occ) => {
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
                        className="flex w-full items-start gap-1 rounded px-1.5 py-1 text-left text-white transition-opacity hover:opacity-80"
                        style={{ backgroundColor: getStatusColor(occ.statusId) }}
                      >
                        <ListTodo className="mt-0.5 h-3 w-3 shrink-0 opacity-90" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11px] font-medium leading-tight">
                            {occ.task.title}
                          </span>
                          <span className="block truncate text-[10px] leading-tight opacity-90">
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
                        className="w-full truncate px-1.5 text-left text-[10px] text-muted-foreground hover:text-foreground"
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
