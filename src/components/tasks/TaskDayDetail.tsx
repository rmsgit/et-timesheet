"use client";

import React from 'react';
import type { TaskOccurrence } from '@/lib/types';
import type { CalendarBirthday } from '@/lib/birthdayUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskStatusBadge } from '@/components/tasks/TaskStatusBadge';
import { Badge } from '@/components/ui/badge';
import { Cake, ListTodo, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface TaskDayDetailProps {
  date: Date | undefined;
  occurrences: TaskOccurrence[];
  birthdays?: CalendarBirthday[];
  onSelectOccurrence: (occurrence: TaskOccurrence) => void;
  onSelectBirthday?: (userId: string) => void;
  onCreateTask?: () => void;
}

export const TaskDayDetail: React.FC<TaskDayDetailProps> = ({
  date,
  occurrences,
  birthdays = [],
  onSelectOccurrence,
  onSelectBirthday,
  onCreateTask,
}) => {
  if (!date) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Select a day to view tasks.
        </CardContent>
      </Card>
    );
  }

  const isEmpty = occurrences.length === 0 && birthdays.length === 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">{format(date, 'EEEE, MMMM d, yyyy')}</CardTitle>
        {onCreateTask && (
          <Button variant="outline" size="sm" onClick={onCreateTask}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Task
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {isEmpty ? (
          <p className="text-sm text-muted-foreground">No tasks on this day.</p>
        ) : (
          <>
            {birthdays.length > 0 && (
              <ul className="space-y-2">
                {birthdays.map((bday) => (
                  <li key={`bday-${bday.userId}`}>
                    <button
                      type="button"
                      onClick={() => onSelectBirthday?.(bday.userId)}
                      className="flex w-full items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-left text-rose-900 transition-opacity hover:opacity-80 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100"
                    >
                      <Cake className="h-4 w-4 shrink-0" />
                      <div>
                        <p className="font-medium">{bday.name}</p>
                        <p className="text-xs opacity-80">Birthday</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {occurrences.length > 0 ? (
              <ul className="space-y-2">
                {occurrences.map((occ) => (
                  <li key={`${occ.task.id}-${occ.dateKey}`}>
                    <button
                      type="button"
                      onClick={() => onSelectOccurrence(occ)}
                      className="w-full rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium flex items-center gap-1.5">
                            <ListTodo className="h-4 w-4 shrink-0 text-muted-foreground" />
                            {occ.task.title}
                          </p>
                          {occ.task.type === 'recurring' && (
                            <Badge variant="secondary" className="mt-1 text-xs capitalize">
                              {occ.task.recurrence}
                            </Badge>
                          )}
                        </div>
                        <TaskStatusBadge statusId={occ.statusId} />
                      </div>
                      {occ.task.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {occ.task.description.replace(/<[^>]*>/g, '')}
                        </p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              birthdays.length > 0 && (
                <p className="text-sm text-muted-foreground">No tasks on this day.</p>
              )
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
