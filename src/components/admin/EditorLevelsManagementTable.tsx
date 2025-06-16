
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useEditorLevels } from '@/hooks/useEditorLevels';
import type { EditorLevel } from '@/lib/types';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { MoreHorizontal, PlusCircle, Trash2, Edit2, Save, X, AlertTriangle, Loader2, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

type SortableEditorLevelKeys = keyof Pick<EditorLevel, 'name' | 'description'>;

export const EditorLevelsManagementTable: React.FC = () => {
  const { editorLevels, addEditorLevel, updateEditorLevel, deleteEditorLevel, isLoadingEditorLevels } = useEditorLevels();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<EditorLevel | undefined>(undefined);
  const [currentLevelName, setCurrentLevelName] = useState('');
  const [currentLevelDescription, setCurrentLevelDescription] = useState('');
  
  const [levelToDelete, setLevelToDelete] = useState<EditorLevel | undefined>(undefined);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10; 
  const [sortConfig, setSortConfig] = useState<{ key: SortableEditorLevelKeys; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });

  const sortedEditorLevels = useMemo(() => {
    let sortableItems = [...editorLevels];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key!];
        const valB = b[sortConfig.key!];
        let comparison = 0;
        if (valA < valB) {
          comparison = -1;
        } else if (valA > valB) {
          comparison = 1;
        }
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [editorLevels, sortConfig]);

  const paginatedEditorLevels = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedEditorLevels.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedEditorLevels, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedEditorLevels.length / rowsPerPage);

  const requestSort = (key: SortableEditorLevelKeys) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending'
    }));
    setCurrentPage(1);
  };

  const getSortIcon = (columnKey: SortableEditorLevelKeys) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const handleAddNew = () => {
    setEditingLevel(undefined);
    setCurrentLevelName('');
    setCurrentLevelDescription('');
    setIsFormOpen(true);
  };

  const handleEdit = (level: EditorLevel) => {
    setEditingLevel(level);
    setCurrentLevelName(level.name);
    setCurrentLevelDescription(level.description);
    setIsFormOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingForm(true);
    let result;
    if (editingLevel) {
      result = await updateEditorLevel(editingLevel.id, currentLevelName, currentLevelDescription);
    } else {
      result = await addEditorLevel(currentLevelName, currentLevelDescription);
    }

    if (result.success) {
      toast({
        title: "Success",
        description: `Editor level ${editingLevel ? 'updated' : 'added'}.`,
      });
      setIsFormOpen(false);
    } else {
      toast({
        title: "Error",
        description: result.message || `Failed to ${editingLevel ? 'update' : 'add'} editor level.`,
        variant: "destructive",
      });
    }
    setIsSubmittingForm(false);
  };

  const openDeleteDialog = (level: EditorLevel) => {
    setLevelToDelete(level);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (levelToDelete) {
      // Note: isEditorLevelInUse check is not implemented in the hook yet.
      const result = await deleteEditorLevel(levelToDelete.id);
      if (result.success) {
        toast({
          title: "Editor Level Deleted",
          description: `Level "${levelToDelete.name}" has been deleted.`,
        });
        if (currentPage > 1 && paginatedEditorLevels.length === 1 && sortedEditorLevels.length -1 <= (currentPage -1) * rowsPerPage) {
          setCurrentPage(currentPage - 1);
        }
      } else {
         toast({
          title: "Error",
          description: result.message || "Failed to delete editor level.",
          variant: "destructive",
        });
      }
      setIsDeleteDialogOpen(false);
      setLevelToDelete(undefined);
    }
  };
  
  const renderSortableHeader = (label: string, columnKey: SortableEditorLevelKeys, className?: string) => (
    <TableHead className={cn("cursor-pointer hover:bg-muted/50", className)} onClick={() => requestSort(columnKey)}>
      <div className="flex items-center">
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
              <CardTitle className="text-2xl font-semibold">Manage Editor Levels</CardTitle>
              <CardDescription>Define different proficiency levels for editors.</CardDescription>
            </div>
            <Button onClick={handleAddNew} disabled={isLoadingEditorLevels || isSubmittingForm}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Level
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingEditorLevels ? (
            <TableSkeleton columnCount={3} rowCount={3} showTableHeader={true} 
              headerTexts={["Level Name", "Description", "Actions"]} 
              cellWidths={["w-1/4", "w-1/2", "w-1/4 text-right"]} 
            />
          ) : sortedEditorLevels.length === 0 ? (
             <div className="text-center py-10 border-2 border-dashed rounded-lg bg-card">
                <Award className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-xl font-medium">No Editor Levels Defined</h3>
                <p className="mt-1 text-sm text-muted-foreground">Get started by adding your first editor level.</p>
                <Button className="mt-6" onClick={handleAddNew} disabled={isSubmittingForm}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Level
                </Button>
            </div>
          ) : (
            <>
            <ScrollArea className="h-[calc(100vh-25rem)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {renderSortableHeader("Level Name", "name", "w-[25%]")}
                    {renderSortableHeader("Description", "description", "w-[55%]")}
                    <TableHead className="text-right w-[20%]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEditorLevels.map((level) => (
                    <TableRow key={level.id}>
                      <TableCell className="font-medium">{level.name}</TableCell>
                      <TableCell>
                        <p className="line-clamp-2 text-sm text-muted-foreground" title={level.description}>
                          {level.description || "-"}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={isSubmittingForm}>
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(level)} disabled={isSubmittingForm}>
                              <Edit2 className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(level)}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10 data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
                              disabled={isSubmittingForm}
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
                <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages} (Total {sortedEditorLevels.length} levels)</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
             {totalPages <= 1 && sortedEditorLevels.length > 0 && (
                <div className="flex items-center justify-end space-x-2 p-4 border-t">
                    <span className="text-sm text-muted-foreground">Total levels: {sortedEditorLevels.length}</span>
                </div>
            )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) {setEditingLevel(undefined); setCurrentLevelName(''); setCurrentLevelDescription('');} }}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSubmitForm}>
            <DialogHeader>
              <DialogTitle>{editingLevel ? 'Edit Editor Level' : 'Add New Editor Level'}</DialogTitle>
              <DialogDescription>
                {editingLevel ? `Modifying the level: "${editingLevel.name}"` : "Define a new proficiency tier for editors."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="level-name">Level Name</Label>
                <Input
                  id="level-name"
                  value={currentLevelName}
                  onChange={(e) => setCurrentLevelName(e.target.value)}
                  placeholder="e.g., Senior Editor"
                  required
                  disabled={isSubmittingForm}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="level-description">Description</Label>
                <Textarea
                  id="level-description"
                  value={currentLevelDescription}
                  onChange={(e) => setCurrentLevelDescription(e.target.value)}
                  placeholder="Provide a brief description of this editor level's responsibilities and skills."
                  rows={5}
                  disabled={isSubmittingForm}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmittingForm}><X className="mr-2 h-4 w-4" />Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmittingForm}>
                {isSubmittingForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {editingLevel ? 'Save Changes' : 'Add Level'}
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
              This action cannot be undone. This will permanently delete the editor level "{levelToDelete?.name}".
              Ensure this level is not currently assigned to any editors before deleting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLevelToDelete(undefined)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className={buttonVariants({ variant: "destructive" })}
            >
              Delete Level
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
