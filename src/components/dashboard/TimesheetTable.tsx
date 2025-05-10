
"use client";

import React, { useState, useMemo } from 'react';
import { useTimesheet } from '@/hooks/useTimesheet';
import { useAuth } from '@/hooks/useAuth';
import type { TimeRecord } from '@/lib/types';
import { Button } from '@/components/ui/button';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TimeRecordForm } from './TimeRecordForm';
import { CheckCircle, Edit, MoreHorizontal, Trash2, PlusCircle, CalendarClock, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';


export const TimesheetTable: React.FC = () => {
  const { user, isAuthLoading } = useAuth();
  const { getRecordsForUser, deleteTimeRecord, markAsComplete, isTimesheetLoading } = useTimesheet();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TimeRecord | undefined>(undefined);

  const isLoading = isAuthLoading || isTimesheetLoading;

  const userRecords = useMemo(() => {
    if (isLoading || !user) return [];
    return getRecordsForUser(user.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [user, getRecordsForUser, isLoading]);


  if (isAuthLoading) { // Initial auth loading
    return (
      <div className="flex h-[calc(100vh-theme(spacing.32))] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !isAuthLoading) { // Should be caught by layout, but as a fallback
    return <p className="text-center p-8">Loading user data or redirecting...</p>;
  }
  

  const handleAddNew = () => {
    setEditingRecord(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (record: TimeRecord) => {
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const handleDelete = (recordId: string) => {
    deleteTimeRecord(recordId);
    toast({ title: "Record Deleted", description: "The time record has been successfully deleted." });
  };

  const handleMarkComplete = (recordId: string) => {
    markAsComplete(recordId);
    toast({ title: "Task Completed", description: "The task has been marked as complete." });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">My Timesheet</h2>
        <Button onClick={handleAddNew} disabled={isLoading}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Record
        </Button>
      </div>

      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingRecord(undefined);}}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit Time Record' : 'Add New Time Record'}</DialogTitle>
          </DialogHeader>
          <TimeRecordForm record={editingRecord} onClose={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>

      {isTimesheetLoading && !isAuthLoading ? ( // Timesheet data is loading, auth is done
        <TableSkeleton columnCount={6} className="shadow-lg" />
      ) : userRecords.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed rounded-lg bg-card">
            <CalendarClock className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-xl font-medium">No time records yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Get started by adding your first time entry.</p>
            <Button className="mt-6" onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Record
            </Button>
        </div>
      ) : (
        <Card className="shadow-lg">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Duration (hrs)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{format(parseISO(record.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="font-medium">{record.projectName}</TableCell>
                    <TableCell><Badge variant="secondary">{record.projectType}</Badge></TableCell>
                    <TableCell>{record.durationHours.toFixed(1)}</TableCell>
                    <TableCell>
                      {record.completedAt ? (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                          <CheckCircle className="mr-1 h-3 w-3" /> Completed
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                      {record.isRevision && <Badge variant="outline" className="ml-2 border-orange-500 text-orange-500">Revision</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!record.completedAt && (
                            <DropdownMenuItem onClick={() => handleMarkComplete(record.id)}>
                              <CheckCircle className="mr-2 h-4 w-4" /> Mark as Complete
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleEdit(record)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                           <AlertDialog>
                              <AlertDialogTrigger asChild>
                                {/* The DropdownMenuItem itself cannot be the direct child for AlertDialogTrigger to get correct styling if it uses asChild from Radix.
                                    We wrap it or ensure it's a simple button or element.
                                    Here, DropdownMenuItem is fine as it renders a div/button.
                                */}
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} 
                                    className="text-destructive focus:text-destructive focus:bg-destructive/10 data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the time record for "{record.projectName}".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(record.id)}
                                    className={buttonVariants({ variant: "destructive" })}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
