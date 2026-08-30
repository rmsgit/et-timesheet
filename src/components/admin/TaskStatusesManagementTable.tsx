"use client";

import React, { useState, useMemo } from 'react';
import { useTaskStatuses } from '@/hooks/useTaskStatuses';
import { useTasks } from '@/hooks/useTasks';
import type { TaskStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
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
import {
  MoreHorizontal,
  PlusCircle,
  Trash2,
  Edit2,
  Loader2,
  ArrowUp,
  ArrowDown,
  ListChecks,
  Star,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';

export const TaskStatusesManagementTable: React.FC = () => {
  const {
    taskStatuses,
    addTaskStatus,
    updateTaskStatus,
    setDefaultTaskStatus,
    deleteTaskStatus,
    moveTaskStatus,
    isLoadingTaskStatuses,
  } = useTaskStatuses();
  const { isStatusInUse } = useTasks();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<TaskStatus | undefined>();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6b7280');
  const [orderDisplay, setOrderDisplay] = useState<number | undefined>();
  const [statusToDelete, setStatusToDelete] = useState<TaskStatus | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sortedStatuses = useMemo(
    () => [...taskStatuses].sort((a, b) => a.order - b.order),
    [taskStatuses]
  );

  const openAdd = () => {
    setEditingStatus(undefined);
    setName('');
    setColor('#6b7280');
    setOrderDisplay(sortedStatuses.length + 1);
    setIsFormOpen(true);
  };

  const openEdit = (status: TaskStatus) => {
    setEditingStatus(status);
    setName(status.name);
    setColor(status.color);
    setOrderDisplay(status.order + 1);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const result = editingStatus
        ? await updateTaskStatus(editingStatus.id, name, color, orderDisplay)
        : await addTaskStatus(name, color);
      if (result.success) {
        toast({ title: "Success", description: editingStatus ? "Status updated." : "Status added." });
        setIsFormOpen(false);
      } else {
        toast({ title: "Error", description: result.message || "Operation failed.", variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetDefault = async (status: TaskStatus) => {
    const result = await setDefaultTaskStatus(status.id);
    if (result.success) {
      toast({ title: "Success", description: `"${status.name}" is now the default status.` });
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!statusToDelete) return;
    setIsSubmitting(true);
    try {
      const result = await deleteTaskStatus(statusToDelete.id, isStatusInUse(statusToDelete.id));
      if (result.success) {
        toast({ title: "Deleted", description: "Task status removed." });
        setStatusToDelete(undefined);
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingTaskStatuses) {
    return <TableSkeleton columnCount={5} rowCount={4} />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" /> Task Statuses
          </CardTitle>
          <CardDescription>
            Define statuses for the task calendar. New tasks use the default status.
          </CardDescription>
        </div>
        <Button onClick={openAdd}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Status
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Default</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStatuses.map((status) => (
              <TableRow key={status.id}>
                <TableCell>{status.order + 1}</TableCell>
                <TableCell className="font-medium">{status.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-4 w-4 rounded-full border"
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="text-xs text-muted-foreground">{status.color}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {status.isDefault ? (
                    <Badge variant="default">Default</Badge>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => handleSetDefault(status)}>
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(status)}>
                        <Edit2 className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => moveTaskStatus(status.id, 'up')}
                        disabled={status.order === 0}
                      >
                        <ArrowUp className="mr-2 h-4 w-4" /> Move Up
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => moveTaskStatus(status.id, 'down')}
                        disabled={status.order === sortedStatuses.length - 1}
                      >
                        <ArrowDown className="mr-2 h-4 w-4" /> Move Down
                      </DropdownMenuItem>
                      {!status.isDefault && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setStatusToDelete(status)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStatus ? 'Edit Status' : 'Add Status'}</DialogTitle>
            <DialogDescription>
              Statuses appear on the task calendar with the selected color.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="status-name">Name</Label>
              <Input
                id="status-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status-color">Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="status-color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-16 p-1"
                  disabled={isSubmitting}
                />
                <Input value={color} onChange={(e) => setColor(e.target.value)} disabled={isSubmitting} />
              </div>
            </div>
            {editingStatus && (
              <div className="space-y-2">
                <Label htmlFor="status-order">Order</Label>
                <Input
                  id="status-order"
                  type="number"
                  min={1}
                  max={sortedStatuses.length}
                  value={orderDisplay ?? editingStatus.order + 1}
                  onChange={(e) => setOrderDisplay(parseInt(e.target.value, 10))}
                  disabled={isSubmitting}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isSubmitting}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={isSubmitting || !name.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!statusToDelete} onOpenChange={(open) => !open && setStatusToDelete(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete status?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{statusToDelete?.name}&quot;? This cannot be undone if tasks use this status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSubmitting}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
