"use client";

import React, { useMemo } from 'react';
import { Cake } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useMockUsers } from '@/hooks/useMockUsers';
import { getUserBirthdayLabel } from '@/lib/birthdayUtils';
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

interface BirthdayDetailDialogProps {
  userId: string | null;
  date?: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BirthdayDetailDialog: React.FC<BirthdayDetailDialogProps> = ({
  userId,
  date,
  open,
  onOpenChange,
}) => {
  const { user, isSuperAdmin } = useAuth();
  const { users } = useMockUsers();

  const birthdayUser = useMemo(
    () => (userId ? users.find((u) => u.id === userId) : undefined),
    [users, userId]
  );

  const name = birthdayUser ? getUserBirthdayLabel(birthdayUser) : 'Unknown';
  const birthDateLabel = birthdayUser?.dateOfBirth
    ? format(parseISO(birthdayUser.dateOfBirth), 'MMMM d, yyyy')
    : null;
  const calendarDateLabel = date ? format(date, 'MMMM d') : null;
  const isOwnBirthday = !!user?.id && birthdayUser?.id === user.id;
  const canViewBirthdayMessage = isSuperAdmin || isOwnBirthday;
  const message =
    birthdayUser?.dateOfBirthMessage?.trim() ||
    `Happy Birthday, ${name}!`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5 text-rose-600" />
            Birthday
          </DialogTitle>
          <DialogDescription>
            {calendarDateLabel
              ? `${name}'s birthday on ${calendarDateLabel}`
              : `Birthday details for ${name}`}
          </DialogDescription>
        </DialogHeader>

        {birthdayUser ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-lg font-semibold">{name}</p>
              <div className="flex flex-wrap gap-2">
                {birthdayUser.role && (
                  <Badge variant="secondary" className="capitalize">
                    {birthdayUser.role}
                  </Badge>
                )}
                {birthdayUser.department && (
                  <Badge variant="outline">{birthdayUser.department}</Badge>
                )}
              </div>
            </div>

            <dl className="space-y-2 text-sm">
              {birthDateLabel && (
                <div>
                  <dt className="text-muted-foreground">Date of birth</dt>
                  <dd className="font-medium">{birthDateLabel}</dd>
                </div>
              )}
              {birthdayUser.jobDesignation && (
                <div>
                  <dt className="text-muted-foreground">Designation</dt>
                  <dd className="font-medium">{birthdayUser.jobDesignation}</dd>
                </div>
              )}
              {(birthdayUser.email || birthdayUser.personalEmail) && (
                <div>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="font-medium break-all">
                    {birthdayUser.email || birthdayUser.personalEmail}
                  </dd>
                </div>
              )}
            </dl>

            {canViewBirthdayMessage && (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/50 dark:bg-rose-950/40">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-rose-700 dark:text-rose-300">
                  Birthday message
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-rose-950 dark:text-rose-100">
                  {message}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">User details could not be found.</p>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
