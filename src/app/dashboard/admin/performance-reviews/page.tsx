
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useMockUsers } from '@/hooks/useMockUsers';
import { usePerformanceReviews } from '@/hooks/usePerformanceReviews';
import { useEditorRatingCategories } from '@/hooks/useEditorRatingCategories';
import type { PerformanceReview, User, EditorRatingCategory } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertTriangle, PlusCircle, Loader2, ClipboardCheck, Edit2, Trash2 } from 'lucide-react';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { PerformanceReviewForm } from '@/components/admin/PerformanceReviewForm';

export default function PerformanceReviewsPage() {
  const { users, isUsersLoading } = useMockUsers();
  const { reviews, deleteReview, isLoading: isLoadingReviews } = usePerformanceReviews();
  const { editorRatingCategories, isLoading: isLoadingCategories } = useEditorRatingCategories();
  const { user: adminUser } = useAuth();
  
  const [selectedEditorId, setSelectedEditorId] = useState<string | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<PerformanceReview | null>(null);

  const isLoading = isUsersLoading || isLoadingReviews || isLoadingCategories;

  const editorUsers = useMemo(() => {
    return users.filter(u => u.role === 'editor').sort((a,b) => a.username.localeCompare(b.username));
  }, [users]);
  
  const reviewsForSelectedEditor = useMemo(() => {
    if (!selectedEditorId) return [];
    return reviews
      .filter(r => r.editorId === selectedEditorId)
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [reviews, selectedEditorId]);

  const getAdminUsername = useCallback((adminId: string) => {
    const admin = users.find(u => u.id === adminId);
    return admin?.fullName || admin?.username || 'Unknown Admin';
  }, [users]);
  
  const calculateTotalScore = useCallback((review: PerformanceReview): string => {
    if (isLoadingCategories || !review.categoryRatings || editorRatingCategories.length === 0) return '...';
    
    const totalScore = review.categoryRatings.reduce((acc, rating) => {
      const category = editorRatingCategories.find(c => c.id === rating.categoryId);
      if (!category || typeof category.weight !== 'number') {
        return acc; // Ignore ratings for categories that no longer exist or have no weight
      }
      
      const weightedScore = (rating.rating || 0) * (category.weight / 100);
      return acc + weightedScore;
    }, 0);

    return totalScore.toFixed(2);
  }, [editorRatingCategories, isLoadingCategories]);

  const handleCreateNew = () => {
    setEditingReview(null);
    setIsFormOpen(true);
  };

  const handleEdit = (review: PerformanceReview) => {
    setEditingReview(review);
    setIsFormOpen(true);
  };
  
  const handleDelete = async (reviewId: string) => {
      // Confirmation dialog would be ideal here
      await deleteReview(reviewId);
  };
  
  const selectedEditor = useMemo(() => users.find(u => u.id === selectedEditorId), [users, selectedEditorId]);

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <ClipboardCheck className="mr-3 h-8 w-8 text-primary" /> Editor Performance Reviews
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Editor</CardTitle>
          <CardDescription>Choose an editor to view or create performance reviews.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <div className="space-y-2">
                <Label htmlFor="editor-select">Editor</Label>
                {isUsersLoading ? (
                    <div className="flex items-center justify-center h-10 border rounded-md bg-muted">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : editorUsers.length > 0 ? (
                    <Select
                        value={selectedEditorId}
                        onValueChange={setSelectedEditorId}
                        disabled={isLoading}
                    >
                        <SelectTrigger id="editor-select">
                        <SelectValue placeholder="Select an editor" />
                        </SelectTrigger>
                        <SelectContent>
                        {editorUsers.map(editor => (
                            <SelectItem key={editor.id} value={editor.id}>
                            {editor.fullName || editor.username} ({editor.email})
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                ) : (
                    <p className="text-sm text-muted-foreground p-2 border rounded-md">No editors found.</p>
                )}
              </div>
               {selectedEditorId && (
                <Button onClick={handleCreateNew} disabled={isLoading}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Review
                </Button>
               )}
            </div>
        </CardContent>
      </Card>
      
      {isLoading && selectedEditorId && (
          <TableSkeleton columnCount={5} rowCount={3} />
      )}

      {!isLoading && selectedEditorId && (
        <Card>
            <CardHeader>
                <CardTitle>Review History for {selectedEditor?.fullName || selectedEditor?.username}</CardTitle>
            </CardHeader>
            <CardContent>
                {reviewsForSelectedEditor.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Reviewer</TableHead>
                                <TableHead>Overall Comment</TableHead>
                                <TableHead>Total Score</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reviewsForSelectedEditor.map(review => (
                                <TableRow key={review.id}>
                                    <TableCell>{format(parseISO(review.date), 'PPP')}</TableCell>
                                    <TableCell>{getAdminUsername(review.adminId)}</TableCell>
                                    <TableCell className="max-w-xs truncate">{review.overallComment}</TableCell>
                                    <TableCell className="font-medium">{calculateTotalScore(review)} / 5.00</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" onClick={() => handleEdit(review)} className="mr-2">
                                            <Edit2 className="mr-1 h-3 w-3" /> View/Edit
                                        </Button>
                                        <Button variant="destructive" size="sm" onClick={() => handleDelete(review.id)}>
                                            <Trash2 className="mr-1 h-3 w-3" /> Delete
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="text-center py-10">
                        <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-xl font-medium">No Reviews Found</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            There are no performance reviews for this editor yet.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
      )}

      {selectedEditorId && adminUser && (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{editingReview ? 'Edit' : 'Create'} Performance Review</DialogTitle>
                    <DialogDescription>
                        Provide feedback for {selectedEditor?.fullName || selectedEditor?.username}
                    </DialogDescription>
                </DialogHeader>
                <PerformanceReviewForm 
                    editorId={selectedEditorId} 
                    adminId={adminUser.id}
                    review={editingReview}
                    onClose={() => setIsFormOpen(false)}
                />
            </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
