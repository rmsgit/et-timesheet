
"use client";

import React, { useEffect, useState } from 'react'; // Added useState
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTimesheet } from '@/hooks/useTimesheet';
import { useProjectTypes } from '@/hooks/useProjectTypes';
import type { TimeRecord } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Save, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const timeRecordSchema = z.object({
  date: z.date({ required_error: "A date is required." }),
  projectName: z.string().min(1, "Project name is required."),
  projectType: z.string().min(1, "Project type is required."),
  durationHours: z.coerce.number().min(0.1, "Duration must be at least 0.1 hours."),
  isRevision: z.boolean().default(false),
});

type TimeRecordFormData = z.infer<typeof timeRecordSchema>;

interface TimeRecordFormProps {
  record?: TimeRecord; 
  onClose: () => void;
}

export const TimeRecordForm: React.FC<TimeRecordFormProps> = ({ record, onClose }) => {
  const { addTimeRecord, updateTimeRecord } = useTimesheet();
  const { projectTypes, isLoadingProjectTypes } = useProjectTypes();
  const { toast } = useToast();
  const [isSubmittingForm, setIsSubmittingForm] = useState(false); // Local submitting state
  
  const { control, handleSubmit, reset, formState: { errors } } = useForm<TimeRecordFormData>({
    resolver: zodResolver(timeRecordSchema),
    defaultValues: record ? {
      date: record.date ? parseISO(record.date) : new Date(),
      projectName: record.projectName,
      projectType: record.projectType,
      durationHours: record.durationHours,
      isRevision: record.isRevision,
    } : {
      date: new Date(),
      projectName: '',
      projectType: '', 
      durationHours: 1,
      isRevision: false,
    },
  });

  useEffect(() => {
    const defaultVals = record ? {
      date: record.date ? parseISO(record.date) : new Date(),
      projectName: record.projectName,
      projectType: projectTypes.includes(record.projectType) ? record.projectType : (projectTypes.length > 0 ? projectTypes[0] : ''),
      durationHours: record.durationHours,
      isRevision: record.isRevision,
    } : {
      date: new Date(),
      projectName: '',
      projectType: projectTypes.length > 0 ? projectTypes[0] : '',
      durationHours: 1,
      isRevision: false,
    };
    if (!isLoadingProjectTypes) { // Only reset if project types are loaded
      reset(defaultVals);
    }
  }, [record, reset, projectTypes, isLoadingProjectTypes]);


  const onSubmit = async (data: TimeRecordFormData) => {
    setIsSubmittingForm(true);
    const recordData = {
      ...data,
      date: data.date.toISOString(), 
    };

    try {
      if (record) {
        await updateTimeRecord({ ...record, ...recordData });
        toast({ title: "Success", description: "Time record updated." });
      } else {
        console.log("Attempting to add new record via addTimeRecord:", recordData); // Added console.log
        await addTimeRecord(recordData);
        // Toast for addTimeRecord is now handled within the addTimeRecord function itself or its context
        // to provide specific feedback about Firebase connection.
        // If addTimeRecord itself doesn't toast on success when Firebase is connected, we can add one here.
        // For now, assuming addTimeRecord will toast appropriately.
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
        <Label htmlFor="projectType">Project Type</Label>
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
                <SelectValue placeholder="Select project type" />
              </SelectTrigger>
              <SelectContent>
                {projectTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
                 {projectTypes.length === 0 && <SelectItem value="" disabled>No project types available</SelectItem>}
              </SelectContent>
            </Select>
          )}
        />
        )}
        {errors.projectType && <p className="text-sm text-destructive mt-1">{errors.projectType.message}</p>}
      </div>

      <div>
        <Label htmlFor="durationHours">Duration (hours)</Label>
        <Controller
          name="durationHours"
          control={control}
          render={({ field }) => <Input id="durationHours" type="number" step="0.1" {...field} placeholder="e.g., 2.5" disabled={isSubmittingForm} />}
        />
        {errors.durationHours && <p className="text-sm text-destructive mt-1">{errors.durationHours.message}</p>}
      </div>

      <div className="flex items-center space-x-2">
         <Controller
            name="isRevision"
            control={control}
            render={({ field }) => (
                 <Checkbox id="isRevision" checked={field.value} onCheckedChange={field.onChange} disabled={isSubmittingForm} />
            )}
         />
        <Label htmlFor="isRevision" className="font-normal">This is a revision</Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmittingForm}>
          <X className="mr-2 h-4 w-4" /> Cancel
        </Button>
        <Button type="submit" disabled={isSubmittingForm || isLoadingProjectTypes}>
           {isSubmittingForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
           {record ? "Update Record" : "Add Record"}
        </Button>
      </div>
    </form>
  );
};
