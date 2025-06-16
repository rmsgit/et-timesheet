
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTimesheet } from '@/hooks/useTimesheet';
import { useAuth } from '@/hooks/useAuth';
import { useEditorLevels } from '@/hooks/useEditorLevels';
import type { TimeRecord, WorkType, EditorLevel } from '@/lib/types';
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
  TableFooter,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { TimeRecordForm } from './TimeRecordForm';
import { CheckCircle, Edit, MoreHorizontal, Trash2, PlusCircle, CalendarClock, Loader2, Package, RefreshCw, FilePlus2, CalendarIcon, Film, Clock, Save, X, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Hourglass, ListChecks, CheckCircle2 as CheckCircle2Icon, Play, PauseCircle, CheckSquare, Square, Award, TrendingUp } from 'lucide-react';
import { format, parseISO, isSameDay, differenceInSeconds } from 'date-fns';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { CardSkeleton } from '@/components/skeletons/CardSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { PendingTaskTimer } from './PendingTaskTimer';
import { ScrollArea } from '@/components/ui/scroll-area';

const formatDurationFromDecimalHours = (totalDecimalHours: number): string => {
  if (isNaN(totalDecimalHours) || totalDecimalHours < 0) return 'N/A';
   if (totalDecimalHours === 0) return '0s';

  const totalSeconds = Math.round(totalDecimalHours * 3600);
  if (totalSeconds === 0 && totalDecimalHours > 0) return '<1s';
  if (totalSeconds === 0) return '0s';


  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) {
     parts.push(`${seconds}s`);
  }

  return parts.join(' ') || "0s";
};


const formatDurationFromTotalSeconds = (totalSeconds: number | undefined | null): string => {
  if (totalSeconds === undefined || totalSeconds === null || isNaN(totalSeconds) || totalSeconds < 0) return 'N/A';
  if (totalSeconds === 0) return '0s';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (totalSeconds > 0 && (seconds > 0 || parts.length === 0)) {
     parts.push(`${seconds}s`);
  }
  if (parts.length === 0 && totalSeconds === 0) return "0s";

  return parts.join(' ') || "0s";
};


const completionDurationSchema = z.object({
  completedInHoursDialog: z.coerce.number().int().min(0, "Hours must be 0 or more."),
  completedInMinutesDialog: z.coerce.number().int().min(0, "Minutes must be 0 or more.").max(59, "Minutes must be less than 60."),
  completedInSecondsDialog: z.coerce.number().int().min(0, "Seconds must be 0 or more.").max(59, "Seconds must be less than 60."),
}).refine(data => (data.completedInHoursDialog * 3600 + data.completedInMinutesDialog * 60 + data.completedInSecondsDialog) >= 0, {
  message: "Total completion time must be 0 seconds or more.",
  path: ["completedInSecondsDialog"],
});
type CompletionDurationFormData = z.infer<typeof completionDurationSchema>;


type SortableTimeRecordKeys = keyof Pick<TimeRecord, 'date' | 'projectName' | 'projectType' | 'workType' | 'projectDurationSeconds' | 'durationHours' | 'completedAt' | 'entryCreatedAt' | 'reChecked'>;

const compareTimestamps = (tsA: string | undefined, tsB: string | undefined): number => {
  if (!tsA && !tsB) return 0;
  if (!tsA) return -1;
  if (!tsB) return 1;
  return new Date(tsA).getTime() - new Date(tsB).getTime();
};

export const TimesheetTable: React.FC = () => {
  const { user, isAuthLoading } = useAuth();
  const { getRecordsForUser, deleteTimeRecord, setCompletionDetails, pauseTimer, resumeTimer, toggleReCheckedStatus, isTimesheetLoading } = useTimesheet();
  const { editorLevels, isLoadingEditorLevels } = useEditorLevels();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TimeRecord | undefined>(undefined);

  const [isSetCompletionDialogOpen, setIsSetCompletionDialogOpen] = useState(false);
  const [recordForCompletion, setRecordForCompletion] = useState<TimeRecord | null>(null);
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);

  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;
  const [sortConfig, setSortConfig] = useState<{ key: SortableTimeRecordKeys | null; direction: 'ascending' | 'descending' }>({ key: 'entryCreatedAt', direction: 'descending' });

  const [isNextLevelInfoOpen, setIsNextLevelInfoOpen] = useState(false);
  const [nextLevelDetails, setNextLevelDetails] = useState<EditorLevel | null>(null);

  const isLoading = isAuthLoading || isTimesheetLoading || isLoadingEditorLevels;

  const fullUserRecordsForDay = useMemo(() => {
    if (isAuthLoading || isTimesheetLoading || !user || !selectedDate) return [];
    return getRecordsForUser(user.id)
      .filter(record => isSameDay(parseISO(record.date), selectedDate));
  }, [user, getRecordsForUser, isAuthLoading, isTimesheetLoading, selectedDate]);

  const sortedRecords = useMemo(() => {
    let sortableItems = [...fullUserRecordsForDay];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key!];
        const valB = b[sortConfig.key!];

        let comparison = 0;
        if (sortConfig.key === 'date' || sortConfig.key === 'completedAt' || sortConfig.key === 'entryCreatedAt') {
          comparison = compareTimestamps(valA as string | undefined, valB as string | undefined);
        } else if (sortConfig.key === 'reChecked') {
          const boolA = valA === true;
          const boolB = valB === true;
          comparison = boolA === boolB ? 0 : boolA ? -1 : 1;
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else if (valA === undefined || valA === null) {
          comparison = -1;
        } else if (valB === undefined || valB === null) {
          comparison = 1;
        } else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
        } else {
          const strA = String(valA).toLowerCase();
          const strB = String(valB).toLowerCase();
          comparison = strA.localeCompare(strB);
        }
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [fullUserRecordsForDay, sortConfig]);


  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedRecords.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedRecords, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedRecords.length / rowsPerPage);

  const requestSort = (key: SortableTimeRecordKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const getSortIcon = (columnKey: SortableTimeRecordKeys) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };


  const dailyTotalHours = useMemo(() => {
    return fullUserRecordsForDay.reduce((sum, record) => record.completedAt ? sum + record.durationHours : sum, 0);
  }, [fullUserRecordsForDay]);

  const tasksCompletedToday = useMemo(() => {
    return fullUserRecordsForDay.filter(record => record.completedAt).length;
  }, [fullUserRecordsForDay]);

  const pendingTasksToday = useMemo(() => {
    return fullUserRecordsForDay.filter(record => !record.completedAt).length;
  }, [fullUserRecordsForDay]);

  const currentEditorLevel = useMemo(() => {
    if (isLoadingEditorLevels || !user || !user.editorLevelId || !editorLevels.length) {
      return null;
    }
    return editorLevels.find(level => level.id === user.editorLevelId);
  }, [user, editorLevels, isLoadingEditorLevels]);

  const nextEditorLevel = useMemo(() => {
    if (!currentEditorLevel || isLoadingEditorLevels || !editorLevels.length) {
      return null;
    }
    // editorLevels are assumed to be sorted by `order` from the hook
    const currentIndex = editorLevels.findIndex(level => level.id === currentEditorLevel.id);
    if (currentIndex === -1 || currentIndex >= editorLevels.length - 1) {
      return null; // No next level or current level not found
    }
    return editorLevels[currentIndex + 1];
  }, [currentEditorLevel, editorLevels, isLoadingEditorLevels]);

  const handleShowNextLevelInfo = () => {
    if (nextEditorLevel) {
      setNextLevelDetails(nextEditorLevel);
      setIsNextLevelInfoOpen(true);
    }
  };

  const { control: completionFormControl, handleSubmit: handleCompletionSubmit, reset: resetCompletionForm, formState: { errors: completionFormErrors } } = useForm<CompletionDurationFormData>({
    resolver: zodResolver(completionDurationSchema),
    defaultValues: {
      completedInHoursDialog: 0,
      completedInMinutesDialog: 0,
      completedInSecondsDialog: 0,
    },
  });

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
    const newRecordBase: Partial<TimeRecord> = {
        date: selectedDate ? selectedDate.toISOString() : new Date().toISOString(),
        projectDurationSeconds: undefined,
        workType: 'New work',
    };
    setEditingRecord(newRecordBase as TimeRecord); 
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
      if (currentPage > 1 && paginatedRecords.length === 1 && sortedRecords.length -1 <= (currentPage -1) * rowsPerPage) {
        setCurrentPage(currentPage - 1);
      }
    } catch (error) {
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const openSetCompletionDialog = (record: TimeRecord) => {
    setRecordForCompletion(record);

    let initialHours = 0;
    let initialMinutes = 0;
    let initialSeconds = 0;

    if (record.completedAt && record.durationHours > 0) {
        const totalSecondsFromDuration = Math.round(record.durationHours * 3600);
        initialHours = Math.floor(totalSecondsFromDuration / 3600);
        initialMinutes = Math.floor((totalSecondsFromDuration % 3600) / 60);
        initialSeconds = totalSecondsFromDuration % 60;
    } else if (!record.completedAt) {
        let baseActiveSeconds;
        const creationOrStartTime = parseISO(record.entryCreatedAt || record.date);

        if (record.isPaused && record.pausedAt) {
            baseActiveSeconds = differenceInSeconds(parseISO(record.pausedAt), creationOrStartTime);
        } else {
            baseActiveSeconds = differenceInSeconds(new Date(), creationOrStartTime);
        }
        const netActiveSeconds = Math.max(0, baseActiveSeconds - (record.accumulatedPausedDurationSeconds || 0));

        initialHours = Math.max(0, Math.floor(netActiveSeconds / 3600));
        initialMinutes = Math.max(0, Math.floor((netActiveSeconds % 3600) / 60));
        initialSeconds = Math.max(0, netActiveSeconds % 60);
    }

    resetCompletionForm({
      completedInHoursDialog: initialHours,
      completedInMinutesDialog: initialMinutes,
      completedInSecondsDialog: initialSeconds
    });
    setIsSetCompletionDialogOpen(true);
  };

  const onSetCompletionSubmit = async (data: CompletionDurationFormData) => {
    if (!recordForCompletion) return;
    setIsSubmittingCompletion(true);
    try {
      await setCompletionDetails(recordForCompletion.id, data.completedInHoursDialog, data.completedInMinutesDialog, data.completedInSecondsDialog);
      setIsSetCompletionDialogOpen(false);
      setRecordForCompletion(null);
    } catch (error) {
    } finally {
      setIsSubmittingCompletion(false);
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

  const renderSortableHeader = (label: string, columnKey: SortableTimeRecordKeys, className?: string) => (
    <TableHead className={cn("cursor-pointer hover:bg-muted/50", className)} onClick={() => requestSort(columnKey)}>
      <div className="flex items-center">
        {label}
        {getSortIcon(columnKey)}
      </div>
    </TableHead>
  );

  const isDialogEditingMode = !!(editingRecord && editingRecord.id);

  const handlePauseTimer = async (recordId: string) => {
    setIsActionSubmitting(true);
    await pauseTimer(recordId);
    setIsActionSubmitting(false);
  };

  const handleResumeTimer = async (recordId: string) => {
    setIsActionSubmitting(true);
    await resumeTimer(recordId);
    setIsActionSubmitting(false);
  };

  const handleToggleReChecked = async (recordId: string) => {
    setIsActionSubmitting(true);
    await toggleReCheckedStatus(recordId);
    setIsActionSubmitting(false);
  };

  let editorLevelDisplay: React.ReactNode = null;
  if (isAuthLoading || isLoadingEditorLevels) {
    editorLevelDisplay = <Skeleton className="h-5 w-40 mt-2 bg-muted" />;
  } else if (user && user.role === 'editor') {
    const levelName = currentEditorLevel ? currentEditorLevel.name : (editorLevels.length > 0 ? 'Not Assigned' : 'N/A');
    editorLevelDisplay = (
      <div className="flex items-center gap-2 text-md text-muted-foreground mt-2">
        <Award className="h-5 w-5 text-primary" />
        <span className="font-semibold">Level: {levelName}</span>
        {nextEditorLevel && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-primary hover:bg-primary/10 rounded-full"
                  onClick={handleShowNextLevelInfo}
                  aria-label={`Learn about ${nextEditorLevel.name}`}
                >
                  <TrendingUp className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Info on your next level: {nextEditorLevel.name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
         👋 Welcome, {user ? user.username : 'Editor'}!
        </h1>
        <p className="text-lg text-muted-foreground mt-1">
          This is your personal timesheet dashboard. Track your work efficiently.
        </p>
        {editorLevelDisplay}
      </div>

      {(isAuthLoading || isTimesheetLoading) ? (
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <CardSkeleton className="shadow-md" />
          <CardSkeleton className="shadow-md" />
          <CardSkeleton className="shadow-md" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Logged Hours Today</CardTitle>
              <Hourglass className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDurationFromDecimalHours(dailyTotalHours)}</div>
              <p className="text-xs text-muted-foreground">
                For {selectedDate ? format(selectedDate, "PPP") : 'selected day'}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasks Completed Today</CardTitle>
               <CheckCircle2Icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tasksCompletedToday}</div>
               <p className="text-xs text-muted-foreground">
                Marked as complete
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Tasks Today</CardTitle>
              <ListChecks className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingTasksToday}</div>
               <p className="text-xs text-muted-foreground">
                Awaiting completion
              </p>
            </CardContent>
          </Card>
        </div>
      )}


      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold">
            Entries for {selectedDate ? format(selectedDate, 'PPP') : 'Selected Date'}
          </h2>
          <p className="text-sm text-muted-foreground">
            Use the calendar to view records for a specific day or add new entries.
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
                  onSelect={(date) => {setSelectedDate(date); setCurrentPage(1);}}
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
            <DialogTitle>{isDialogEditingMode ? 'Edit Time Record' : 'Add New Time Record'}</DialogTitle>
          </DialogHeader>
          <TimeRecordForm record={editingRecord} isEditing={isDialogEditingMode} onClose={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isSetCompletionDialogOpen} onOpenChange={(open) => { setIsSetCompletionDialogOpen(open); if(!open) setRecordForCompletion(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {recordForCompletion?.completedAt ? 'Edit Completion Time for: ' : 'Set Completion Time for: '}
              {recordForCompletion?.projectName}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCompletionSubmit(onSetCompletionSubmit)} className="space-y-4 pt-2 pb-4">
            <div>
              <Label>Completed In</Label>
              <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground mr-1" />
                  <div className="flex-1">
                      <Controller
                      name="completedInHoursDialog"
                      control={completionFormControl}
                      render={({ field }) => <Input type="number" {...field} placeholder="H" disabled={isSubmittingCompletion} />}
                      />
                  </div>
                  <span className="text-muted-foreground">:</span>
                  <div className="flex-1">
                      <Controller
                      name="completedInMinutesDialog"
                      control={completionFormControl}
                      render={({ field }) => <Input type="number" {...field} placeholder="M" step="1" min="0" max="59" disabled={isSubmittingCompletion} />}
                      />
                  </div>
                   <span className="text-muted-foreground">:</span>
                  <div className="flex-1">
                      <Controller
                      name="completedInSecondsDialog"
                      control={completionFormControl}
                      render={({ field }) => <Input type="number" {...field} placeholder="S" step="1" min="0" max="59" disabled={isSubmittingCompletion} />}
                      />
                  </div>
              </div>
               {completionFormErrors.completedInHoursDialog && <p className="text-sm text-destructive mt-1">{completionFormErrors.completedInHoursDialog.message}</p>}
               {completionFormErrors.completedInMinutesDialog && <p className="text-sm text-destructive mt-1">{completionFormErrors.completedInMinutesDialog.message}</p>}
               {completionFormErrors.completedInSecondsDialog && <p className="text-sm text-destructive mt-1">{completionFormErrors.completedInSecondsDialog.message}</p>}
               {completionFormErrors.root?.completedInSecondsDialog && <p className="text-sm text-destructive mt-1">{completionFormErrors.root.completedInSecondsDialog.message}</p>}
            </div>
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmittingCompletion}><X className="mr-2 h-4 w-4" />Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmittingCompletion}>
                {isSubmittingCompletion ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Submit Completion
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isNextLevelInfoOpen} onOpenChange={setIsNextLevelInfoOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-primary" />
              Aim for: {nextLevelDetails?.name || 'Next Level'}
            </DialogTitle>
          </DialogHeader>
          {nextLevelDetails?.description && (
            <ScrollArea className="max-h-[60vh] py-4 pr-4">
              <div
                className="ProseMirror-display-preview prose dark:prose-invert max-w-none text-sm"
                dangerouslySetInnerHTML={{ __html: nextLevelDetails.description }}
              />
            </ScrollArea>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {(isTimesheetLoading && !isAuthLoading) ? (
        <TableSkeleton columnCount={9} className="shadow-lg" />
      ) : sortedRecords.length === 0 && selectedDate ? (
        <div className="text-center py-10 border-2 border-dashed rounded-lg bg-card">
            <CalendarClock className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-xl font-medium">No time records for {format(selectedDate, 'PPP')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
                Try selecting a different date or add a new time entry.
            </p>
            <Button className="mt-6" onClick={handleAddNew} disabled={isActionSubmitting}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Record
            </Button>
        </div>
      ) : (
        <Card className="shadow-lg">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {renderSortableHeader("Date", "date")}
                    {renderSortableHeader("Project Name", "projectName")}
                    {renderSortableHeader("Category", "projectType")}
                    {renderSortableHeader("Work Type", "workType")}
                    {renderSortableHeader("Proj. Duration", "projectDurationSeconds")}
                    {renderSortableHeader("Work Time", "durationHours")}
                    {renderSortableHeader("Status", "completedAt")}
                    {renderSortableHeader("Re-checked", "reChecked")}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{format(parseISO(record.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="font-medium">{record.projectName}</TableCell>
                      <TableCell><Badge variant="secondary">{record.projectType}</Badge></TableCell>
                      <TableCell>{getWorkTypeBadge(record.workType)}</TableCell>
                      <TableCell>
                          <span className="flex items-center">
                              <Film className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>
                              {formatDurationFromTotalSeconds(record.projectDurationSeconds)}
                          </span>
                      </TableCell>
                      <TableCell>
                        {record.completedAt ? (
                          <span className="flex items-center">
                            <Clock className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>
                            {formatDurationFromDecimalHours(record.durationHours)}
                          </span>
                        ) : (
                          <PendingTaskTimer record={record} />
                        )}
                      </TableCell>
                      <TableCell>
                        {record.completedAt ? (
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                            <CheckCircle className="mr-1 h-3 w-3" /> Completed
                          </Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.reChecked ? (
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                            <CheckSquare className="mr-1 h-3 w-3" /> Re-checked
                          </Badge>
                        ) : (
                          <Badge variant="outline">Not Re-checked</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={isActionSubmitting || isSubmittingCompletion}>
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openSetCompletionDialog(record)} disabled={isActionSubmitting || isSubmittingCompletion}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                {record.completedAt ? "Edit Completion Time" : "Mark as Complete"}
                            </DropdownMenuItem>
                            {!record.completedAt && (
                              <>
                                <DropdownMenuSeparator />
                                {record.isPaused ? (
                                  <DropdownMenuItem onClick={() => handleResumeTimer(record.id)} disabled={isActionSubmitting || isSubmittingCompletion}>
                                    <Play className="mr-2 h-4 w-4" /> Resume Timer
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handlePauseTimer(record.id)} disabled={isActionSubmitting || isSubmittingCompletion}>
                                    <PauseCircle className="mr-2 h-4 w-4" /> Pause Timer
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleReChecked(record.id)} disabled={isActionSubmitting || isSubmittingCompletion}>
                                {record.reChecked ? <CheckSquare className="mr-2 h-4 w-4 text-green-500" /> : <Square className="mr-2 h-4 w-4 opacity-50" />}
                                {record.reChecked ? "Unmark as Re-checked" : "Mark as Re-checked"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(record)} disabled={isActionSubmitting || isSubmittingCompletion}>
                              <Edit className="mr-2 h-4 w-4" /> Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                      onSelect={(e) => e.preventDefault()}
                                      className="text-destructive focus:text-destructive focus:bg-destructive/10 data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
                                      disabled={isActionSubmitting || isSubmittingCompletion}
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
                {fullUserRecordsForDay.length > 0 && (
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={6} className="font-semibold text-muted-foreground text-right">
                        Total Completed Work Time for {selectedDate ? format(selectedDate, 'PPP') : 'selected day'}:
                      </TableCell>
                      <TableCell>
                          <span className="flex items-center font-semibold">
                              <Clock className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>
                              {formatDurationFromDecimalHours(dailyTotalHours)}
                          </span>
                      </TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          </CardContent>
          {totalPages > 1 && (
            <div className="flex items-center justify-between space-x-2 p-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || isLoading}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || isLoading}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

