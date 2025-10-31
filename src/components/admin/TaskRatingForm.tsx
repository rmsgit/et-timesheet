
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEditorRatingCategories } from '@/hooks/useEditorRatingCategories';
import { useTimesheet } from '@/hooks/useTimesheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RATING_SCALE } from '@/lib/constants';
import type { TimeRecord, EditorRating } from '@/lib/types';
import { Loader2, Save, X, Star } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

const ratingSchema = z.object({
  categoryId: z.string(),
  rating: z.coerce.number().min(1).max(5),
  notes: z.string().optional(),
});

const formSchema = z.object({
  ratings: z.array(ratingSchema),
});

type RatingFormData = z.infer<typeof formSchema>;

interface TaskRatingFormProps {
  record: TimeRecord;
  onClose: () => void;
}

export const TaskRatingForm: React.FC<TaskRatingFormProps> = ({ record, onClose }) => {
  const { editorRatingCategories, isLoading: isLoadingCategories } = useEditorRatingCategories();
  const { saveTaskRatings } = useTimesheet();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, reset } = useForm<RatingFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ratings: [],
    },
  });

  const { fields } = useFieldArray({
    control,
    name: "ratings",
  });

  useEffect(() => {
    if (!isLoadingCategories && editorRatingCategories.length > 0) {
      const initialRatings = editorRatingCategories.map(category => {
        const existingRating = record.ratings?.find(r => r.categoryId === category.id);
        return {
          categoryId: category.id,
          rating: existingRating?.rating || 3, // Default to 'Meets Expectations'
          notes: existingRating?.notes || '',
        };
      });
      reset({ ratings: initialRatings });
    }
  }, [editorRatingCategories, isLoadingCategories, record.ratings, reset]);

  const onSubmit = async (data: RatingFormData) => {
    setIsSubmitting(true);
    try {
      await saveTaskRatings(record.id, data.ratings);
      onClose();
    } catch (error) {
      // Error toast is handled in the context
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoadingCategories) {
    return (
        <div className="space-y-6">
            {Array.from({length: 3}).map((_, i) => (
                <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-1/3 bg-muted" />
                    <Skeleton className="h-10 w-full bg-muted" />
                    <Skeleton className="h-20 w-full bg-muted" />
                </div>
            ))}
        </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <ScrollArea className="max-h-[60vh] pr-6">
        <div className="space-y-6">
          {fields.map((field, index) => {
            const category = editorRatingCategories.find(c => c.id === field.categoryId);
            if (!category) return null;
            
            return (
              <div key={field.id} className="space-y-2 rounded-md border p-4">
                <Label htmlFor={`ratings.${index}.rating`} className="text-base font-semibold flex items-center">
                    <Star className="mr-2 h-4 w-4 text-primary" /> {category.name}
                </Label>
                <p className="text-sm text-muted-foreground">{category.description}</p>
                
                <Controller
                  control={control}
                  name={`ratings.${index}.rating`}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={String(field.value)} disabled={isSubmitting}>
                      <SelectTrigger id={`ratings.${index}.rating`}>
                        <SelectValue placeholder="Select a rating" />
                      </SelectTrigger>
                      <SelectContent>
                        {RATING_SCALE.map(item => (
                          <SelectItem key={item.value} value={String(item.value)}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                
                <Controller
                  control={control}
                  name={`ratings.${index}.notes`}
                  render={({ field }) => (
                     <Textarea {...field} placeholder="Optional notes..." rows={2} disabled={isSubmitting}/>
                  )}
                />
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <div className="flex justify-end space-x-2 pt-6">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          <X className="mr-2 h-4 w-4" /> Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Ratings
        </Button>
      </div>
    </form>
  );
};
