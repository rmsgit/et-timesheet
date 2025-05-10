
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTimesheet } from '@/hooks/useTimesheet';
import type { TimeRecord } from '@/lib/types';
import { PROJECT_TYPES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Save, X } from 'lucide-react';
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
  record?: TimeRecord; // For editing
  onClose: () => void;
}

export const TimeRecordForm: React.FC<TimeRecordFormProps> = ({ record, onClose }) => {
  const { addTimeRecord, updateTimeRecord } = useTimesheet();
  const { toast } = useToast();
  
  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TimeRecordFormData>({
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

  const onSubmit = (data: TimeRecordFormData) => {
    const recordData = {
      ...data,
      date: data.date.toISOString(), // Store date as ISO string
    };

    try {
      if (record) {
        updateTimeRecord({ ...record, ...recordData });
        toast({ title: "Success", description: "Time record updated." });
      } else {
        addTimeRecord(recordData);
        toast({ title: "Success", description: "Time record added." });
      }
      onClose();
    } catch (error) {
      toast({ title: "Error", description: "Failed to save record.", variant: "destructive" });
      console.error("Failed to save record:", error);
    }
  };

  useEffect(() => {
    if (record) {
      reset({
        date: record.date ? parseISO(record.date) : new Date(),
        projectName: record.projectName,
        projectType: record.projectType,
        durationHours: record.durationHours,
        isRevision: record.isRevision,
      });
    } else {
       reset({
        date: new Date(),
        projectName: '',
        projectType: '',
        durationHours: 1,
        isRevision: false,
      });
    }
  }, [record, reset]);


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
          render={({ field }) => <Input id="projectName" {...field} placeholder="e.g., Feature X Implementation" />}
        />
        {errors.projectName && <p className="text-sm text-destructive mt-1">{errors.projectName.message}</p>}
      </div>

      <div>
        <Label htmlFor="projectType">Project Type</Label>
        <Controller
          name="projectType"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger id="projectType">
                <SelectValue placeholder="Select project type" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.projectType && <p className="text-sm text-destructive mt-1">{errors.projectType.message}</p>}
      </div>

      <div>
        <Label htmlFor="durationHours">Duration (hours)</Label>
        <Controller
          name="durationHours"
          control={control}
          render={({ field }) => <Input id="durationHours" type="number" step="0.1" {...field} placeholder="e.g., 2.5" />}
        />
        {errors.durationHours && <p className="text-sm text-destructive mt-1">{errors.durationHours.message}</p>}
      </div>

      <div className="flex items-center space-x-2">
         <Controller
            name="isRevision"
            control={control}
            render={({ field }) => (
                 <Checkbox id="isRevision" checked={field.value} onCheckedChange={field.onChange} />
            )}
         />
        <Label htmlFor="isRevision" className="font-normal">This is a revision</Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          <X className="mr-2 h-4 w-4" /> Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          <Save className="mr-2 h-4 w-4" /> {isSubmitting ? "Saving..." : (record ? "Update Record" : "Add Record")}
        </Button>
      </div>
    </form>
  );
};
