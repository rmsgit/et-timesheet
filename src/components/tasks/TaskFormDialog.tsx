"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMockUsers } from '@/hooks/useMockUsers';
import { useTasks } from '@/hooks/useTasks';
import type { CreateTaskInput, UpdateTaskInput } from '@/contexts/TaskContext';
import type { Task, TaskRecurrence } from '@/lib/types';
import { getAssignableUsers } from '@/lib/taskPermissions';
import { toDateKey } from '@/lib/taskCalendarUtils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SearchableUserSelect } from '@/components/common/SearchableUserSelect';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task;
  defaultDate?: Date;
}

export const TaskFormDialog: React.FC<TaskFormDialogProps> = ({
  open,
  onOpenChange,
  task,
  defaultDate,
}) => {
  const { user } = useAuth();
  const { users, isUsersLoading } = useMockUsers();
  const { createTask, updateTask } = useTasks();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'one-time' | 'recurring'>('one-time');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('weekly');
  const [recurrenceStartDate, setRecurrenceStartDate] = useState<Date | undefined>();
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const assignableUsers = useMemo(() => {
    if (!user) return [];
    return getAssignableUsers(user, users).sort((a, b) =>
      (a.fullName || a.username).localeCompare(b.fullName || b.username)
    );
  }, [user, users]);

  useEffect(() => {
    if (!open) return;
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setType(task.type);
      setAssigneeId(task.assigneeId);
      setDueDate(task.dueDate ? parseISO(task.dueDate) : undefined);
      setRecurrence(task.recurrence || 'weekly');
      setRecurrenceStartDate(
        task.recurrenceStartDate ? parseISO(task.recurrenceStartDate) : undefined
      );
      setRecurrenceEndDate(
        task.recurrenceEndDate ? parseISO(task.recurrenceEndDate) : undefined
      );
    } else {
      setTitle('');
      setDescription('');
      setType('one-time');
      setAssigneeId(user?.id || '');
      setDueDate(defaultDate);
      setRecurrence('weekly');
      setRecurrenceStartDate(defaultDate);
      setRecurrenceEndDate(undefined);
    }
  }, [open, task, user, defaultDate]);

  const handleSubmit = async () => {
    if (!title.trim() || !assigneeId) return;
    setIsSubmitting(true);
    try {
      if (task) {
        const input: UpdateTaskInput = {
          title,
          description,
          assigneeId,
          ...(type === 'one-time'
            ? { dueDate: dueDate ? toDateKey(dueDate) : undefined }
            : {
                recurrence,
                recurrenceStartDate: recurrenceStartDate
                  ? toDateKey(recurrenceStartDate)
                  : undefined,
                recurrenceEndDate: recurrenceEndDate
                  ? toDateKey(recurrenceEndDate)
                  : undefined,
              }),
        };
        const result = await updateTask(task.id, input);
        if (result.success) onOpenChange(false);
      } else {
        const input: CreateTaskInput = {
          title,
          description,
          type,
          assigneeId,
          ...(type === 'one-time'
            ? { dueDate: dueDate ? toDateKey(dueDate) : undefined }
            : {
                recurrence,
                recurrenceStartDate: recurrenceStartDate
                  ? toDateKey(recurrenceStartDate)
                  : undefined,
                recurrenceEndDate: recurrenceEndDate
                  ? toDateKey(recurrenceEndDate)
                  : undefined,
              }),
        };
        const result = await createTask(input);
        if (result.success) onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'New Task'}</DialogTitle>
          <DialogDescription>
            {task ? 'Update task details.' : 'Create a one-time or recurring task.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          {!task && (
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v: 'one-time' | 'recurring') => setType(v)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one-time">One-time</SelectItem>
                  <SelectItem value="recurring">Recurring</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Assign to</Label>
            <SearchableUserSelect
              users={assignableUsers}
              value={assigneeId}
              onValueChange={setAssigneeId}
              disabled={isSubmitting || isUsersLoading}
              placeholder="Select user"
              searchPlaceholder="Search by name, email, or role..."
            />
          </div>

          {type === 'one-time' ? (
            <div className="space-y-2">
              <Label>Due date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start', !dueDate && 'text-muted-foreground')}
                    disabled={isSubmitting}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} />
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Recurrence</Label>
                <Select
                  value={recurrence}
                  onValueChange={(v: TaskRecurrence) => setRecurrence(v)}
                  disabled={isSubmitting || !!task}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start',
                        !recurrenceStartDate && 'text-muted-foreground'
                      )}
                      disabled={isSubmitting}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {recurrenceStartDate
                        ? format(recurrenceStartDate, 'PPP')
                        : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={recurrenceStartDate}
                      onSelect={setRecurrenceStartDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>End date (optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start',
                        !recurrenceEndDate && 'text-muted-foreground'
                      )}
                      disabled={isSubmitting}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {recurrenceEndDate
                        ? format(recurrenceEndDate, 'PPP')
                        : 'No end date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={recurrenceEndDate}
                      onSelect={setRecurrenceEndDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isSubmitting}>Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !title.trim() ||
              !assigneeId ||
              (type === 'one-time' && !dueDate) ||
              (type === 'recurring' && !recurrenceStartDate)
            }
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {task ? 'Save Changes' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
