"use client";

import React, { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMockUsers } from '@/hooks/useMockUsers';
import { useTasks } from '@/hooks/useTasks';
import { useTaskStatuses } from '@/hooks/useTaskStatuses';
import type { TaskOccurrence } from '@/lib/types';
import {
  canChangeTaskStatus,
  canDeleteTask,
  canEditTask,
} from '@/lib/taskPermissions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TaskStatusBadge } from '@/components/tasks/TaskStatusBadge';
import { Edit2, Loader2, Trash2, ListTodo } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface TaskDetailDialogProps {
  occurrence: TaskOccurrence | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (occurrence: TaskOccurrence) => void;
}

export const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({
  occurrence,
  open,
  onOpenChange,
  onEdit,
}) => {
  const { user, isSuperAdmin } = useAuth();
  const { users } = useMockUsers();
  const { taskStatuses } = useTaskStatuses();
  const { updateTaskStatus, deleteTask } = useTasks();
  const [selectedStatusId, setSelectedStatusId] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const task = occurrence?.task;
  const dateKey = occurrence?.dateKey;

  React.useEffect(() => {
    if (occurrence) {
      setSelectedStatusId(occurrence.statusId);
    }
  }, [occurrence]);

  const assignee = useMemo(
    () => users.find((u) => u.id === task?.assigneeId),
    [users, task?.assigneeId]
  );
  const creator = useMemo(
    () => users.find((u) => u.id === task?.createdById),
    [users, task?.createdById]
  );

  const canChange = task && user ? canChangeTaskStatus(user, task, users) : false;
  const canEdit = task && user ? canEditTask(user, task, isSuperAdmin) : false;
  const canDelete = task && user ? canDeleteTask(user, task, isSuperAdmin) : false;

  const handleStatusUpdate = async () => {
    if (!task || !selectedStatusId) return;
    setIsUpdating(true);
    try {
      const result = await updateTaskStatus(
        task.id,
        selectedStatusId,
        task.type === 'recurring' ? dateKey : undefined
      );
      if (result.success) onOpenChange(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    setIsUpdating(true);
    try {
      const result = await deleteTask(task.id);
      if (result.success) {
        setShowDeleteConfirm(false);
        onOpenChange(false);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  if (!task || !occurrence) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 shrink-0 text-muted-foreground" />
              {task.title}
            </DialogTitle>
            <DialogDescription>
              {task.type === 'recurring'
                ? `Recurring (${task.recurrence}) · ${format(parseISO(dateKey!), 'PPP')}`
                : task.dueDate
                  ? format(parseISO(task.dueDate), 'PPP')
                  : 'One-time task'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              {canChange ? (
                <Select
                  value={selectedStatusId}
                  onValueChange={setSelectedStatusId}
                  disabled={isUpdating}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {taskStatuses.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <TaskStatusBadge statusId={occurrence.statusId} />
              )}
            </div>

            {task.description && (
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="mt-1 text-sm whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <Label className="text-muted-foreground">Assignee</Label>
                <p>{assignee?.fullName || assignee?.username || 'Unknown'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Created by</Label>
                <p>{creator?.fullName || creator?.username || 'Unknown'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Type</Label>
                <p className="capitalize">{task.type.replace('-', ' ')}</p>
              </div>
              {task.type === 'recurring' && (
                <div>
                  <Label className="text-muted-foreground">Recurrence</Label>
                  <p className="capitalize">{task.recurrence}</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {canDelete && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isUpdating}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            )}
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(occurrence);
                }}
                disabled={isUpdating}
              >
                <Edit2 className="mr-2 h-4 w-4" /> Edit
              </Button>
            )}
            {canChange && (
              <Button onClick={handleStatusUpdate} disabled={isUpdating}>
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Status
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{task.title}&quot;
              {task.type === 'recurring' ? ' (entire recurring series)' : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isUpdating}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
