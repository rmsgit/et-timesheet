
"use client";

import React, { useState, useMemo } from 'react';
import { useEditorRatingCategories } from '@/hooks/useEditorRatingCategories';
import type { EditorRatingCategory } from '@/lib/types';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RichTextEditor from '@/components/common/RichTextEditor';
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
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
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
import { MoreHorizontal, PlusCircle, Trash2, Edit2, Save, X, AlertTriangle, Loader2, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Star, ChevronsUpDown, Percent } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

type SortableKeys = keyof Pick<EditorRatingCategory, 'name' | 'description' | 'weight'>;

export const RatingCategoriesManagementTable: React.FC = () => {
  const { editorRatingCategories, addEditorRatingCategory, updateEditorRatingCategory, deleteEditorRatingCategory, isLoading } = useEditorRatingCategories();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EditorRatingCategory | undefined>(undefined);
  const [currentName, setCurrentName] = useState('');
  const [currentDescription, setCurrentDescription] = useState('');
  const [currentWeight, setCurrentWeight] = useState<number | string>('');
  
  const [categoryToDelete, setCategoryToDelete] = useState<EditorRatingCategory | undefined>(undefined);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10; 
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });

  const sortedCategories = useMemo(() => {
    let sortableItems = [...editorRatingCategories]; 
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key!];
        const valB = b[sortConfig.key!];
        let comparison = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB;
        } else if (typeof valA === 'string' && typeof valB === 'string') {
            comparison = valA.localeCompare(valB);
        } else {
            const strA = String(valA).replace(/<[^>]*>?/gm, '').toLowerCase();
            const strB = String(valB).replace(/<[^>]*>?/gm, '').toLowerCase();
            comparison = strA.localeCompare(strB);
        }
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [editorRatingCategories, sortConfig]);

  const paginatedCategories = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedCategories.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedCategories, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedCategories.length / rowsPerPage);

  const requestSort = (key: SortableKeys) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending'
    }));
    setCurrentPage(1);
  };

  const getSortIcon = (columnKey: SortableKeys) => {
    if (sortConfig.key !== columnKey) return <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const handleAddNew = () => {
    setEditingCategory(undefined);
    setCurrentName('');
    setCurrentDescription('');
    setCurrentWeight('');
    setIsFormOpen(true);
  };

  const handleEdit = (category: EditorRatingCategory) => {
    setEditingCategory(category);
    setCurrentName(category.name);
    setCurrentDescription(category.description);
    setCurrentWeight(category.weight);
    setIsFormOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentName.trim() || currentWeight === '') {
        toast({ title: "Validation Error", description: "Name and weight cannot be empty.", variant: "destructive" });
        return;
    }
    const weightValue = Number(currentWeight);
    if (isNaN(weightValue)) {
        toast({ title: "Validation Error", description: "Weight must be a number.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    let result;
    if (editingCategory) {
      result = await updateEditorRatingCategory(editingCategory.id, currentName, currentDescription, weightValue);
    } else {
      result = await addEditorRatingCategory(currentName, currentDescription, weightValue);
    }

    if (result.success) {
      toast({
        title: "Success",
        description: `Rating category ${editingCategory ? 'updated' : 'added'}.`,
      });
      setIsFormOpen(false);
    } else {
      toast({
        title: "Error",
        description: result.message || `Failed to ${editingCategory ? 'update' : 'add'} category.`,
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  const openDeleteDialog = (category: EditorRatingCategory) => {
    setCategoryToDelete(category);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (categoryToDelete) {
      setIsSubmitting(true); 
      const result = await deleteEditorRatingCategory(categoryToDelete.id);
      if (result.success) {
        toast({
          title: "Category Deleted",
          description: `Category "${categoryToDelete.name}" has been deleted.`,
        });
        if (currentPage > 1 && paginatedCategories.length === 1 && sortedCategories.length - 1 <= (currentPage - 1) * rowsPerPage) {
          setCurrentPage(currentPage - 1);
        }
      } else {
         toast({
          title: "Error",
          description: result.message || "Failed to delete category.",
          variant: "destructive",
        });
      }
      setIsDeleteDialogOpen(false);
      setCategoryToDelete(undefined);
      setIsSubmitting(false);
    }
  };
  
  const renderSortableHeader = (label: string, columnKey: SortableKeys, className?: string, icon?: React.ElementType) => (
    <TableHead className={cn("cursor-pointer hover:bg-muted/50", className)} onClick={() => requestSort(columnKey)}>
      <div className="flex items-center">
        {icon && React.createElement(icon, { className: "mr-2 h-4 w-4" })}
        {label}
        {getSortIcon(columnKey)}
      </div>
    </TableHead>
  );

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-semibold">Manage Rating Categories</CardTitle>
              <CardDescription>Define criteria for evaluating editor performance.</CardDescription>
            </div>
            <Button onClick={handleAddNew} disabled={isLoading || isSubmitting}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton columnCount={4} rowCount={3} />
          ) : sortedCategories.length === 0 ? (
             <div className="text-center py-10 border-2 border-dashed rounded-lg bg-card">
                <Star className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-xl font-medium">No Rating Categories Defined</h3>
                <p className="mt-1 text-sm text-muted-foreground">Get started by adding your first category.</p>
                <Button className="mt-6" onClick={handleAddNew} disabled={isSubmitting}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
                </Button>
            </div>
          ) : (
            <>
            <ScrollArea className="h-[calc(100vh-25rem)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {renderSortableHeader("Category Name", "name", "w-[25%]")}
                    {renderSortableHeader("Description", "description", "w-[50%]")}
                    {renderSortableHeader("Weight (%)", "weight", "w-[15%]", Percent)}
                    <TableHead className="text-right w-[10%]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCategories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell>
                        <div 
                          className="line-clamp-2 text-sm text-muted-foreground ProseMirror-display-preview"
                          dangerouslySetInnerHTML={{ __html: cat.description || "-" }} 
                        />
                      </TableCell>
                      <TableCell>{cat.weight}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={isSubmitting}>
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(cat)} disabled={isSubmitting}>
                              <Edit2 className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator/>
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(cat)}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10 data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
                              disabled={isSubmitting}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            {totalPages > 1 && (
              <div className="flex items-center justify-between space-x-2 p-4 border-t">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages} (Total {sortedCategories.length} categories)</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
             {totalPages <= 1 && sortedCategories.length > 0 && (
                <div className="flex items-center justify-end space-x-2 p-4 border-t">
                    <span className="text-sm text-muted-foreground">Total categories: {sortedCategories.length}</span>
                </div>
            )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => { 
          setIsFormOpen(open); 
          if (!open) { setEditingCategory(undefined); } 
      }}>
        <DialogContent className="sm:max-w-2xl">
          <form onSubmit={handleSubmitForm}>
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Edit Rating Category' : 'Add New Rating Category'}</DialogTitle>
              <DialogDescription>
                {editingCategory ? `Modifying the category: "${editingCategory.name}"` : "Define a new criterion for editor evaluation."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="category-name">Category Name</Label>
                  <Input
                    id="category-name"
                    value={currentName}
                    onChange={(e) => setCurrentName(e.target.value)}
                    placeholder="e.g., Technical Skill"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="category-weight">Weight (%)</Label>
                  <Input
                    id="category-weight"
                    type="number"
                    value={currentWeight}
                    onChange={(e) => setCurrentWeight(e.target.value)}
                    placeholder="e.g., 25"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category-description">Description</Label>
                <RichTextEditor
                  value={currentDescription}
                  onChange={setCurrentDescription}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}><X className="mr-2 h-4 w-4" />Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {editingCategory ? 'Save Changes' : 'Add Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the category "{categoryToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCategoryToDelete(undefined)} disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className={buttonVariants({ variant: "destructive" })}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete Category'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
