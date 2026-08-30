import {
  addDays,
  addMonths,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDate,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
  startOfMonth,
} from 'date-fns';
import type { Task, TaskOccurrence } from '@/lib/types';

export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function getOccurrenceStatusId(task: Task, dateKey: string): string {
  return task.occurrenceStatuses?.[dateKey] ?? task.statusId;
}

function clampToMonthDay(year: number, month: number, day: number): Date {
  const lastDay = endOfMonth(new Date(year, month, 1)).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

function getWeeklyOccurrences(
  task: Task,
  rangeStart: Date,
  rangeEnd: Date
): string[] {
  if (!task.recurrenceStartDate) return [];

  const start = startOfDay(parseISO(task.recurrenceStartDate));
  const endBound = task.recurrenceEndDate
    ? startOfDay(parseISO(task.recurrenceEndDate))
    : rangeEnd;

  const dates: string[] = [];
  let cursor = start;

  if (isBefore(cursor, rangeStart)) {
    const diffDays = Math.floor(
      (rangeStart.getTime() - cursor.getTime()) / (1000 * 60 * 60 * 24)
    );
    const weeksToSkip = Math.floor(diffDays / 7);
    cursor = addDays(cursor, weeksToSkip * 7);
    while (isBefore(cursor, rangeStart)) {
      cursor = addDays(cursor, 7);
    }
  }

  while (!isAfter(cursor, rangeEnd) && !isAfter(cursor, endBound)) {
    if (!isBefore(cursor, rangeStart)) {
      dates.push(toDateKey(cursor));
    }
    cursor = addDays(cursor, 7);
  }

  return dates;
}

function getMonthlyOccurrences(
  task: Task,
  rangeStart: Date,
  rangeEnd: Date
): string[] {
  if (!task.recurrenceStartDate) return [];

  const anchor = parseISO(task.recurrenceStartDate);
  const anchorDay = getDate(anchor);
  const endBound = task.recurrenceEndDate
    ? startOfDay(parseISO(task.recurrenceEndDate))
    : rangeEnd;

  const dates: string[] = [];
  let cursor = startOfMonth(rangeStart);
  cursor = clampToMonthDay(cursor.getFullYear(), cursor.getMonth(), anchorDay);

  if (isBefore(cursor, parseISO(task.recurrenceStartDate))) {
    cursor = addMonths(cursor, 1);
    cursor = clampToMonthDay(cursor.getFullYear(), cursor.getMonth(), anchorDay);
  }

  while (!isAfter(cursor, rangeEnd) && !isAfter(cursor, endBound)) {
    if (
      !isBefore(cursor, rangeStart) &&
      !isBefore(cursor, parseISO(task.recurrenceStartDate))
    ) {
      dates.push(toDateKey(cursor));
    }
    const next = addMonths(cursor, 1);
    cursor = clampToMonthDay(next.getFullYear(), next.getMonth(), anchorDay);
  }

  return dates;
}

function getYearlyOccurrences(
  task: Task,
  rangeStart: Date,
  rangeEnd: Date
): string[] {
  if (!task.recurrenceStartDate) return [];

  const anchor = parseISO(task.recurrenceStartDate);
  const anchorMonth = anchor.getMonth();
  const anchorDay = getDate(anchor);
  const endBound = task.recurrenceEndDate
    ? startOfDay(parseISO(task.recurrenceEndDate))
    : rangeEnd;

  const dates: string[] = [];
  let year = rangeStart.getFullYear();
  const endYear = rangeEnd.getFullYear();

  while (year <= endYear) {
    const occurrence = clampToMonthDay(year, anchorMonth, anchorDay);
    if (
      !isBefore(occurrence, rangeStart) &&
      !isAfter(occurrence, rangeEnd) &&
      !isBefore(occurrence, parseISO(task.recurrenceStartDate)) &&
      !isAfter(occurrence, endBound)
    ) {
      dates.push(toDateKey(occurrence));
    }
    year += 1;
  }

  return dates;
}

export function getTaskOccurrenceDates(
  task: Task,
  rangeStart: Date,
  rangeEnd: Date
): string[] {
  if (task.type === 'one-time') {
    if (!task.dueDate) return [];
    const due = startOfDay(parseISO(task.dueDate));
    if (isBefore(due, rangeStart) || isAfter(due, rangeEnd)) return [];
    return [toDateKey(due)];
  }

  switch (task.recurrence) {
    case 'weekly':
      return getWeeklyOccurrences(task, rangeStart, rangeEnd);
    case 'monthly':
      return getMonthlyOccurrences(task, rangeStart, rangeEnd);
    case 'yearly':
      return getYearlyOccurrences(task, rangeStart, rangeEnd);
    default:
      return [];
  }
}

export function expandTasksToOccurrences(
  tasks: Task[],
  rangeStart: Date,
  rangeEnd: Date,
  filterUserId?: string
): TaskOccurrence[] {
  const filtered = filterUserId
    ? tasks.filter((t) => t.assigneeId === filterUserId)
    : tasks;

  const occurrences: TaskOccurrence[] = [];

  for (const task of filtered) {
    const dateKeys = getTaskOccurrenceDates(task, rangeStart, rangeEnd);
    for (const dateKey of dateKeys) {
      occurrences.push({
        task,
        dateKey,
        statusId: getOccurrenceStatusId(task, dateKey),
      });
    }
  }

  return occurrences.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

export function getOccurrencesForDate(
  tasks: Task[],
  date: Date,
  filterUserId?: string
): TaskOccurrence[] {
  const dayStart = startOfDay(date);
  return expandTasksToOccurrences(tasks, dayStart, dayStart, filterUserId);
}

export function getDatesWithTasks(
  tasks: Task[],
  month: Date,
  filterUserId?: string
): Set<string> {
  const rangeStart = startOfMonth(month);
  const rangeEnd = endOfMonth(month);
  const occurrences = expandTasksToOccurrences(
    tasks,
    rangeStart,
    rangeEnd,
    filterUserId
  );
  return new Set(occurrences.map((o) => o.dateKey));
}

export function groupOccurrencesByDate(
  occurrences: TaskOccurrence[]
): Record<string, TaskOccurrence[]> {
  return occurrences.reduce<Record<string, TaskOccurrence[]>>((acc, occ) => {
    if (!acc[occ.dateKey]) acc[occ.dateKey] = [];
    acc[occ.dateKey].push(occ);
    return acc;
  }, {});
}

export function isTaskOnDate(task: Task, date: Date): boolean {
  const dateKey = toDateKey(date);
  return getTaskOccurrenceDates(task, date, date).includes(dateKey);
}

export function datesInMonth(month: Date): Date[] {
  return eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month),
  });
}

export function isSameDateKey(date: Date, dateKey: string): boolean {
  return isSameDay(date, parseISO(dateKey));
}
