import { format } from 'date-fns';
import type { User } from '@/lib/types';

export interface CalendarBirthday {
  userId: string;
  name: string;
}

export function isBirthdayToday(dateOfBirth?: string): boolean {
  if (!dateOfBirth) return false;

  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return false;

  const today = new Date();
  return (
    birthDate.getMonth() === today.getMonth() &&
    birthDate.getDate() === today.getDate()
  );
}

export function isBirthdayOnDate(dateOfBirth: string | undefined, date: Date): boolean {
  if (!dateOfBirth) return false;

  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return false;

  return (
    birthDate.getMonth() === date.getMonth() &&
    birthDate.getDate() === date.getDate()
  );
}

export function getUserBirthdayLabel(user: User): string {
  return user.fullName || user.username || user.email || user.id;
}

/** Birthdays for a single calendar day (month/day match, year ignored). */
export function getBirthdaysOnDate(
  users: User[],
  date: Date,
  options?: { excludeUserId?: string }
): CalendarBirthday[] {
  return users
    .filter((u) => {
      if (options?.excludeUserId && u.id === options.excludeUserId) return false;
      return isBirthdayOnDate(u.dateOfBirth, date);
    })
    .map((u) => ({
      userId: u.id,
      name: getUserBirthdayLabel(u),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Map of yyyy-MM-dd → birthdays for days in the given month (and typically the visible grid). */
export function groupBirthdaysByDateKey(
  users: User[],
  dates: Date[],
  options?: { excludeUserId?: string }
): Record<string, CalendarBirthday[]> {
  const result: Record<string, CalendarBirthday[]> = {};
  for (const date of dates) {
    const birthdays = getBirthdaysOnDate(users, date, options);
    if (birthdays.length > 0) {
      result[format(date, 'yyyy-MM-dd')] = birthdays;
    }
  }
  return result;
}
