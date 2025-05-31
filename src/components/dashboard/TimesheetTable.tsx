
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
import { CheckCircle, Edit, MoreHorizontal, Trash2, PlusCircle, CalendarClock, Loader2, Package, RefreshCw, FilePlus2, CalendarIcon } from 'lucide-react';
import { format, parseISO, isSameDay } from 'date-fns';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Label } from '../ui/label';


export const TimesheetTable: React.FC = () => {
  const { user, isAuthLoading } = useAuth();
  const { getRecordsForUser, deleteTimeRecord, markAsComplete, isTimesheetLoading } = useTimesheet();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TimeRecord | undefined>(undefined);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());


  const isLoading = isAuthLoading || isTimesheetLoading;

  const userRecords = useMemo(() => {
    if (isLoading || !user) return [];
    const allUserRecords = getRecordsForUser(user.id)
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (selectedDate) {
      return allUserRecords.filter(record => isSameDay(parseISO(record.date), selectedDate));
    }
    return allUserRecords; // Should not happen with current default, but as a fallback
  }, [user, getRecordsForUser, isLoading, selectedDate]);


  if (isAuthLoading) { 
    return (
      <div className="flex h-[calc(100vh-theme(spacing.32))] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !isAuthLoading) { 
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

  const handleDelete = async (recordId: string, projectName: string) => {
    setIsActionSubmitting(true);
    try {
      await deleteTimeRecord(recordId);
      toast({ title: "Record Deletion Initiated", description: `Attempting to delete record for "${projectName}".` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete record.", variant: "destructive" });
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleMarkComplete = async (recordId: string, projectName: string) => {
    setIsActionSubmitting(true);
    try {
      await markAsComplete(recordId);
      toast({ title: "Completion Initiated", description: `Attempting to mark "${projectName}" as complete.` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to mark as complete.", variant: "destructive" });
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const getWorkTypeBadge = (workType: TimeRecord['workType']) => {
    switch (workType) {
      case 'New work':
        return <Badge variant="outline" className="border-blue-500 text-blue-500"><FilePlus2 className="mr-1 h-3 w-3" />New</Badge>;
      case 'Revision':
        return <Badge variant="outline" className="border-orange-500 text-orange-500"><RefreshCw className="mr-1 h-3 w-3" />Revision</Badge>;
      case 'Sample work':
        return <Badge variant="outline" className="border-purple-500 text-purple-500"><Package className="mr-1 h-3 w-3" />Sample</Badge>;
      default:
        return <Badge variant="secondary">{workType}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold">My Timesheet</h2>
          <p className="text-sm text-muted-foreground">
            Showing records for: {selectedDate ? format(selectedDate, 'PPP') : 'All Dates'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
           <div className="w-full sm:w-auto">
            <Label htmlFor="timesheet-date" className="sr-only">Select Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="timesheet-date"
                  variant={"outline"}
                  className={cn(
                    "w-full sm:w-[240px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                  disabled={isLoading || isActionSubmitting}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  disabled={isLoading || isActionSubmitting}
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button onClick={handleAddNew} disabled={isLoading || isActionSubmitting} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Record
          </Button>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingRecord(undefined);}}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit Time Record' : 'Add New Time Record'}</DialogTitle>
          </DialogHeader>
          <TimeRecordForm record={editingRecord} onClose={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>

      {isTimesheetLoading && !isAuthLoading ? ( 
        <TableSkeleton columnCount={7} className="shadow-lg" /> 
      ) : userRecords.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed rounded-lg bg-card">
            <CalendarClock className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-xl font-medium">No time records for {selectedDate ? format(selectedDate, 'PPP') : 'this period'}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
                {selectedDate ? "Try selecting a different date or " : ""}
                Add a new time entry.
            </p>
            <Button className="mt-6" onClick={handleAddNew} disabled={isActionSubmitting}>
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
                  <TableHead>Category</TableHead>
                  <TableHead>Work Type</TableHead>
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
                    <TableCell>{getWorkTypeBadge(record.workType)}</TableCell>
                    <TableCell>{record.durationHours.toFixed(1)}</TableCell>
                    <TableCell>
                      {record.completedAt ? (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                          <CheckCircle className="mr-1 h-3 w-3" /> Completed
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" disabled={isActionSubmitting}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!record.completedAt && (
                            <DropdownMenuItem onClick={() => handleMarkComplete(record.id, record.projectName)} disabled={isActionSubmitting}>
                              <CheckCircle className="mr-2 h-4 w-4" /> Mark as Complete
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleEdit(record)} disabled={isActionSubmitting}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                           <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem 
                                    onSelect={(e) => e.preventDefault()} 
                                    className="text-destructive focus:text-destructive focus:bg-destructive/10 data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
                                    disabled={isActionSubmitting}
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
                                    onClick={() => handleDelete(record.id, record.projectName)}
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

