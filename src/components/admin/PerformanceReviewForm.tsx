
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEditorRatingCategories } from '@/hooks/useEditorRatingCategories';
import { usePerformanceReviews } from '@/hooks/usePerformanceReviews';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RATING_SCALE } from '@/lib/constants';
import type { PerformanceReview, CategoryRating } from '@/lib/types';
import { Loader2, Save, X, Star, MessageSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const categoryRatingSchema = z.object({
  categoryId: z.string(),
  rating: z.coerce.number().min(1, "Rating is required").max(5),
  notes: z.string().optional(),
});

const formSchema = z.object({
  overallComment: z.string().min(1, "Overall comment is required."),
  categoryRatings: z.array(categoryRatingSchema),
});

type ReviewFormData = z.infer<typeof formSchema>;

interface PerformanceReviewFormProps {
  editorId: string;
  adminId: string;
  review: PerformanceReview | null;
  onClose: () => void;
}

export const PerformanceReviewForm: React.FC<PerformanceReviewFormProps> = ({ editorId, adminId, review, onClose }) => {
  const { editorRatingCategories, isLoading: isLoadingCategories } = useEditorRatingCategories();
  const { addReview, updateReview } = usePerformanceReviews();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const { control, handleSubmit, reset } = useForm<ReviewFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      overallComment: '',
      categoryRatings: [],
    },
  });

  const { fields } = useFieldArray({
    control,
    name: "categoryRatings",
  });

  useEffect(() => {
    if (!isLoadingCategories && editorRatingCategories.length > 0) {
      const initialRatings = editorRatingCategories.map(category => {
        const existingRating = review?.categoryRatings.find(r => r.categoryId === category.id);
        return {
          categoryId: category.id,
          rating: existingRating?.rating || 3, // Default to 'Meets Expectations'
          notes: existingRating?.notes || '',
        };
      });
      reset({ 
        overallComment: review?.overallComment || '',
        categoryRatings: initialRatings 
      });
    }
  }, [editorRatingCategories, isLoadingCategories, review, reset]);

  const onSubmit = async (data: ReviewFormData) => {
    setIsSubmitting(true);
    try {
      if (review) {
        await updateReview(review.id, data);
        toast({ title: "Success", description: "Performance review updated." });
      } else {
        await addReview(editorId, adminId, data);
        toast({ title: "Success", description: "Performance review created." });
      }
      onClose();
    } catch (error) {
       toast({ title: "Error", description: "Failed to save the review.", variant: "destructive"});
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoadingCategories) {
    return (
        <div className="space-y-6 p-4">
            <Skeleton className="h-24 w-full bg-muted" />
            {Array.from({length: 3}).map((_, i) => (
                <div key={i} className="space-y-2 border p-4 rounded-md">
                    <Skeleton className="h-5 w-1/3 bg-muted" />
                    <Skeleton className="h-10 w-full bg-muted" />
                    <Skeleton className="h-20 w-full bg-muted" />
                </div>
            ))}
        </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-grow min-h-0">
      <ScrollArea className="flex-grow pr-6 -mr-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="overallComment" className="text-lg font-semibold flex items-center">
                <MessageSquare className="mr-2 h-5 w-5 text-primary" /> Overall Comment
            </Label>
             <Controller
                control={control}
                name="overallComment"
                render={({ field, fieldState }) => (
                    <>
                    <Textarea {...field} id="overallComment" placeholder="Provide a general summary of the editor's performance..." rows={4} disabled={isSubmitting}/>
                    {fieldState.error && <p className="text-sm text-destructive">{fieldState.error.message}</p>}
                    </>
                )}
            />
          </div>

          <h3 className="text-lg font-semibold border-t pt-4">Category Ratings</h3>
          
          {fields.map((field, index) => {
            const category = editorRatingCategories.find(c => c.id === field.categoryId);
            if (!category) return null;
            
            return (
              <div key={field.id} className="space-y-3 rounded-md border p-4">
                <Label htmlFor={`categoryRatings.${index}.rating`} className="text-base font-semibold flex items-center">
                    <Star className="mr-2 h-4 w-4 text-primary" /> {category.name} ({category.weight}%)
                </Label>
                <div
                    className="text-sm text-muted-foreground ProseMirror-display-preview"
                    dangerouslySetInnerHTML={{ __html: category.description || "No description provided." }}
                />
                
                <Controller
                  control={control}
                  name={`categoryRatings.${index}.rating`}
                  render={({ field, fieldState }) => (
                    <div>
                      <Select onValueChange={field.onChange} value={String(field.value)} disabled={isSubmitting}>
                        <SelectTrigger id={`categoryRatings.${index}.rating`}>
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
                      {fieldState.error && <p className="text-sm text-destructive mt-1">{fieldState.error.message}</p>}
                    </div>
                  )}
                />
                
                <Controller
                  control={control}
                  name={`categoryRatings.${index}.notes`}
                  render={({ field }) => (
                     <Textarea {...field} placeholder="Optional notes for this category..." rows={2} disabled={isSubmitting}/>
                  )}
                />
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <div className="flex justify-end space-x-2 pt-6 mt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          <X className="mr-2 h-4 w-4" /> Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {review ? 'Save Changes' : 'Submit Review'}
        </Button>
      </div>
    </form>
  );
};
