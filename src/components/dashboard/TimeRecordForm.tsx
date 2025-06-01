
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTimesheet } from '@/hooks/useTimesheet';
import { useProjectTypes } from '@/hooks/useProjectTypes';
import type { TimeRecord, WorkType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Save, X, Loader2, Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const workTypeOptions: WorkType[] = ['New work', 'Revision', 'Sample work'];

const timeRecordSchema = z.object({
  date: z.date({ required_error: "A date is required." }),
  projectName: z.string().min(1, "Project name is required."),
  projectType: z.string().min(1, "Project type is required."),
  workType: z.enum(workTypeOptions, { required_error: "Work type is required." }),
  projectDurationInputHours: z.preprocess(
    val => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().int().min(0, "Hours must be 0 or more.").optional()
  ),
  projectDurationInputMinutes: z.preprocess(
    val => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().int().min(0, "Minutes must be 0 or more.").max(59, "Minutes must be less than 60.").optional()
  ),
}).refine(data => {
  return true;
}, {
  message: "Both hours and minutes for project duration must be provided if one is set, or leave both blank.",
  path: ["projectDurationInputMinutes"]
});


type TimeRecordFormData = z.infer<typeof timeRecordSchema>;

interface TimeRecordFormProps {
  record?: TimeRecord; // This is the full TimeRecord, including durationHours and completedAt if editing
  onClose: () => void;
}

export const TimeRecordForm: React.FC<TimeRecordFormProps> = ({ record, onClose }) => {
  const { addTimeRecord, updateTimeRecord } = useTimesheet();
  const { projectTypes, isLoadingProjectTypes } = useProjectTypes();
  const { toast } = useToast();
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const prevRecordRef = useRef(record);
  
  const getInitialWorkType = (): WorkType => {
    if (record && record.id) {
      if (record.workType) return record.workType;
    }
    return 'New work'; 
  };

  const { control, handleSubmit, reset, formState: { errors }, getValues } = useForm<TimeRecordFormData>({
    resolver: zodResolver(timeRecordSchema),
    defaultValues: {
      date: record?.date ? parseISO(record.date) : new Date(),
      projectName: (record?.id ? record.projectName : (record?.projectName || '')),
      projectType: (record?.id ? record.projectType : (record?.projectType || '')),
      workType: (record?.id ? getInitialWorkType() : (record?.workType || 'New work')),
      projectDurationInputHours: (record?.id && record.projectDurationMinutes != null) ? Math.floor(record.projectDurationMinutes / 60) : undefined,
      projectDurationInputMinutes: (record?.id && record.projectDurationMinutes != null) ? (record.projectDurationMinutes % 60) : undefined,
    },
  });

  useEffect(() => {
    const isEditing = record && record.id;
    
    let defaultProjectDurationInputHours: number | undefined = undefined;
    let defaultProjectDurationInputMinutes: number | undefined = undefined;

    if (isEditing && record.projectDurationMinutes != null) {
        defaultProjectDurationInputHours = Math.floor(record.projectDurationMinutes / 60);
        defaultProjectDurationInputMinutes = record.projectDurationMinutes % 60;
    } else if (!isEditing && record?.projectDurationMinutes != null) {
        defaultProjectDurationInputHours = Math.floor(record.projectDurationMinutes / 60);
        defaultProjectDurationInputMinutes = record.projectDurationMinutes % 60;
    }

    let resetToValues: Partial<TimeRecordFormData> = {
        date: record?.date ? parseISO(record.date) : new Date(),
        projectName: isEditing ? record.projectName : (record?.projectName || ''),
        projectType: isEditing ? record.projectType : (record?.projectType || ''),
        workType: isEditing ? getInitialWorkType() : (record?.workType || 'New work'),
        projectDurationInputHours: defaultProjectDurationInputHours,
        projectDurationInputMinutes: defaultProjectDurationInputMinutes,
    };
    
    if (!isEditing) {
        resetToValues.projectName = resetToValues.projectName || '';
        resetToValues.workType = resetToValues.workType || 'New work';
    }

    if (!isLoadingProjectTypes) {
        const currentProjectType = isEditing ? record.projectType : (record?.projectType || '');
        if (currentProjectType && !projectTypes.includes(currentProjectType) && projectTypes.length > 0) {
            resetToValues.projectType = projectTypes[0];
        } else if (currentProjectType && !projectTypes.includes(currentProjectType) && projectTypes.length === 0) {
            resetToValues.projectType = '';
        } else if (!currentProjectType && projectTypes.length > 0) {
            resetToValues.projectType = projectTypes[0];
        } else {
            resetToValues.projectType = currentProjectType;
        }
    } else {
      resetToValues.projectType = isEditing ? record.projectType : (record?.projectType || '');
    }
    
    if (prevRecordRef.current !== record || (prevRecordRef.current === record && isLoadingProjectTypes && !getValues().projectType && projectTypes.length > 0)) {
        reset(resetToValues as TimeRecordFormData);
    }
    prevRecordRef.current = record;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record, reset, projectTypes, isLoadingProjectTypes, getValues]);


  const onSubmit = async (data: TimeRecordFormData) => {
    setIsSubmittingForm(true);
    
    let finalProjectDurationMinutes: number | undefined = undefined;
    if (data.projectDurationInputHours !== undefined || data.projectDurationInputMinutes !== undefined) {
        const h = data.projectDurationInputHours ?? 0;
        const m = data.projectDurationInputMinutes ?? 0;
        if (h > 0 || m > 0) { 
            finalProjectDurationMinutes = (h * 60) + m;
        }
    }

    const recordDataToSaveBase = {
      date: data.date.toISOString(),
      projectName: data.projectName,
      projectType: data.projectType,
      workType: data.workType,
      projectDurationMinutes: finalProjectDurationMinutes,
    };
    
    try {
      if (record && record.id) {
        // Preserve existing durationHours and completedAt when editing general details
        const fullExistingRecord: TimeRecord = {
            ...record, // spread the original record passed in props
            ...recordDataToSaveBase, // then overlay the form data
        };
        await updateTimeRecord(fullExistingRecord); 
        toast({ title: "Success", description: "Time record updated." });
      } else {
        // For new records, durationHours will be 0, completedAt undefined by default in context
        await addTimeRecord(recordDataToSaveBase as Omit<TimeRecord, 'id' | 'userId' | 'completedAt' | 'durationHours'>);
        toast({ title: "Success", description: "Time record added." });
      }
      onClose();
    } catch (error) {
      toast({ title: "Error", description: "Failed to save record.", variant: "destructive" });
      console.error("Failed to save record:", error);
    } finally {
      setIsSubmittingForm(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-1">
      <div>
        <Label htmlFor="date">Date</Label>
        <Controller
          name="date"
          control={control}
          render={({ field }) => (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !field.value && "text-muted-foreground"
                  )}
                  disabled={isSubmittingForm}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  initialFocus
                  disabled={isSubmittingForm}
                />
              </PopoverContent>
            </Popover>
          )}
        />
        {errors.date && <p className="text-sm text-destructive mt-1">{errors.date.message}</p>}
      </div>

      <div>
        <Label htmlFor="projectName">Project Name</Label>
        <Controller
          name="projectName"
          control={control}
          render={({ field }) => <Input id="projectName" {...field} placeholder="e.g., Feature X Implementation" disabled={isSubmittingForm} />}
        />
        {errors.projectName && <p className="text-sm text-destructive mt-1">{errors.projectName.message}</p>}
      </div>

      <div>
        <Label htmlFor="projectType">Project Category</Label>
        {isLoadingProjectTypes ? (
          <div className="flex items-center justify-center h-10 border rounded-md bg-muted">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> 
          </div>
        ) : (
        <Controller
          name="projectType"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={isSubmittingForm || isLoadingProjectTypes}>
              <SelectTrigger id="projectType">
                <SelectValue placeholder="Select project category" />
              </SelectTrigger>
              <SelectContent>
                {projectTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
                 {projectTypes.length === 0 && <SelectItem value="" disabled>No project categories available</SelectItem>}
              </SelectContent>
            </Select>
          )}
        />
        )}
        {errors.projectType && <p className="text-sm text-destructive mt-1">{errors.projectType.message}</p>}
      </div>

      <div>
        <Label htmlFor="workType">Work Type</Label>
        <Controller
          name="workType"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={isSubmittingForm}>
              <SelectTrigger id="workType">
                <SelectValue placeholder="Select work type" />
              </SelectTrigger>
              <SelectContent>
                {workTypeOptions.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.workType && <p className="text-sm text-destructive mt-1">{errors.workType.message}</p>}
      </div>
      
      <div>
        <Label>Project Duration</Label>
        <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-muted-foreground mr-1" />
            <div className="flex-1">
                <Controller
                name="projectDurationInputHours"
                control={control}
                render={({ field }) => <Input type="number" {...field} placeholder="Hours" value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} disabled={isSubmittingForm} />}
                />
                 {errors.projectDurationInputHours && <p className="text-sm text-destructive mt-1">{errors.projectDurationInputHours.message}</p>}
            </div>
            <span className="text-muted-foreground">:</span>
            <div className="flex-1">
                <Controller
                name="projectDurationInputMinutes"
                control={control}
                render={({ field }) => <Input type="number" {...field} placeholder="Minutes" value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} step="1" min="0" max="59" disabled={isSubmittingForm} />}
                />
                 {errors.projectDurationInputMinutes && <p className="text-sm text-destructive mt-1">{errors.projectDurationInputMinutes.message}</p>}
            </div>
        </div>
        {errors.root?.projectDurationInputMinutes && <p className="text-sm text-destructive mt-1">{errors.root.projectDurationInputMinutes.message}</p>}
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmittingForm}>
          <X className="mr-2 h-4 w-4" /> Cancel
        </Button>
        <Button type="submit" disabled={isSubmittingForm || isLoadingProjectTypes}>
           {isSubmittingForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
           {record && record.id ? "Update Record" : "Add Record"}
        </Button>
      </div>
    </form>
  );
};

