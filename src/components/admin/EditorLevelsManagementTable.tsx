
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useEditorLevels } from '@/hooks/useEditorLevels';
import type { EditorLevel } from '@/lib/types';
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
import { MoreHorizontal, PlusCircle, Trash2, Edit2, Save, X, AlertTriangle, Loader2, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Award, ChevronsUpDown, SortAsc } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

type SortableEditorLevelKeys = keyof Pick<EditorLevel, 'name' | 'description' | 'order'>;

export const EditorLevelsManagementTable: React.FC = () => {
  const { editorLevels, addEditorLevel, updateEditorLevel, deleteEditorLevel, isLoadingEditorLevels, moveLevel } = useEditorLevels();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<EditorLevel | undefined>(undefined);
  const [currentLevelName, setCurrentLevelName] = useState('');
  const [currentLevelDescription, setCurrentLevelDescription] = useState('');
  const [currentLevelOrderDisplay, setCurrentLevelOrderDisplay] = useState<number | undefined>(undefined);
  
  const [levelToDelete, setLevelToDelete] = useState<EditorLevel | undefined>(undefined);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [isMovingLevel, setIsMovingLevel] = useState(false);


  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10; 
  const [sortConfig, setSortConfig] = useState<{ key: SortableEditorLevelKeys; direction: 'ascending' | 'descending' }>({ key: 'order', direction: 'ascending' });

  const sortedEditorLevels = useMemo(() => {
    let sortableItems = [...editorLevels]; 
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key!];
        const valB = b[sortConfig.key!];
        let comparison = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB;
        } else if (typeof valA === 'string' && typeof valB === 'string') {
            comparison = valA.localeCompare(valB);
        } else { // Handle description (HTML string) or potentially mixed types robustly
            const strA = String(valA).replace(/<[^>]*>?/gm, '').toLowerCase(); // Strip HTML for desc sort
            const strB = String(valB).replace(/<[^>]*>?/gm, '').toLowerCase();
            comparison = strA.localeCompare(strB);
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
    if (sortConfig.key !== columnKey) return <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const handleAddNew = () => {
    setEditingLevel(undefined);
    setCurrentLevelName('');
    setCurrentLevelDescription('');
    setCurrentLevelOrderDisplay(editorLevels.length + 1); // Default to next order
    setIsFormOpen(true);
  };

  const handleEdit = (level: EditorLevel) => {
    setEditingLevel(level);
    setCurrentLevelName(level.name);
    setCurrentLevelDescription(level.description);
    setCurrentLevelOrderDisplay(level.order + 1); // Display 1-based order
    setIsFormOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLevelName.trim()) {
        toast({ title: "Validation Error", description: "Level name cannot be empty.", variant: "destructive" });
        return;
    }
    if (editingLevel && currentLevelOrderDisplay !== undefined && (currentLevelOrderDisplay < 1 || currentLevelOrderDisplay > editorLevels.length)) {
        toast({ title: "Validation Error", description: `Order must be between 1 and ${editorLevels.length}.`, variant: "destructive" });
        return;
    }
    if (!editingLevel && currentLevelOrderDisplay !== undefined && (currentLevelOrderDisplay < 1 || currentLevelOrderDisplay > editorLevels.length + 1)) {
         toast({ title: "Validation Error", description: `Order must be between 1 and ${editorLevels.length + 1}.`, variant: "destructive" });
        return;
    }


    setIsSubmittingForm(true);
    let result;
    if (editingLevel) {
      result = await updateEditorLevel(editingLevel.id, currentLevelName, currentLevelDescription, currentLevelOrderDisplay);
    } else {
      // For adding, useEditorLevels calculates order automatically, so don't pass currentLevelOrderDisplay.
      // If specific order is needed on add, addEditorLevel would need an 'order' param.
      // For now, it adds to the end.
      result = await addEditorLevel(currentLevelName, currentLevelDescription);
    }

    if (result.success) {
      toast({
        title: "Success",
        description: `Editor level ${editingLevel ? 'updated' : 'added'}. ${result.message || ''}`,
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
      setIsSubmittingForm(true); 
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
      setIsSubmittingForm(false);
    }
  };

  const handleMoveLevel = async (levelId: string, direction: 'up' | 'down') => {
    setIsMovingLevel(true);
    const result = await moveLevel(levelId, direction);
    if (!result.success) {
        toast({ title: "Error", description: result.message || "Failed to reorder level.", variant: "destructive" });
    } else if (result.message && (result.message.includes("Already at top") || result.message.includes("Already at bottom")) ) {
        // No toast for already at limit
    } else {
        toast({ title: "Success", description: "Level reordered." });
    }
    setIsMovingLevel(false);
  };
  
  const renderSortableHeader = (label: string, columnKey: SortableEditorLevelKeys, className?: string, icon?: React.ElementType) => (
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
              <CardTitle className="text-2xl font-semibold">Manage Editor Levels</CardTitle>
              <CardDescription>Define and order different proficiency levels for editors.</CardDescription>
            </div>
            <Button onClick={handleAddNew} disabled={isLoadingEditorLevels || isSubmittingForm || isMovingLevel}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Level
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingEditorLevels ? (
            <TableSkeleton columnCount={4} rowCount={3} showTableHeader={true} 
              headerTexts={["Order", "Level Name", "Description", "Actions"]} 
              cellWidths={["w-[10%]", "w-[20%]", "w-[45%]", "w-[25%] text-right"]} 
            />
          ) : sortedEditorLevels.length === 0 ? (
             <div className="text-center py-10 border-2 border-dashed rounded-lg bg-card">
                <Award className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-xl font-medium">No Editor Levels Defined</h3>
                <p className="mt-1 text-sm text-muted-foreground">Get started by adding your first editor level.</p>
                <Button className="mt-6" onClick={handleAddNew} disabled={isSubmittingForm || isMovingLevel}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Level
                </Button>
            </div>
          ) : (
            <>
            <ScrollArea className="h-[calc(100vh-25rem)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {renderSortableHeader("Order", "order", "w-[10%]", SortAsc)}
                    {renderSortableHeader("Level Name", "name", "w-[20%]")}
                    {renderSortableHeader("Description", "description", "w-[45%]")}
                    <TableHead className="text-right w-[25%]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEditorLevels.map((level) => (
                    <TableRow key={level.id}>
                      <TableCell>{level.order + 1}</TableCell>
                      <TableCell className="font-medium">{level.name}</TableCell>
                      <TableCell>
                        <div 
                          className="line-clamp-2 text-sm text-muted-foreground ProseMirror-display-preview"
                          dangerouslySetInnerHTML={{ __html: level.description || "-" }} 
                        />
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleMoveLevel(level.id, 'up')} 
                          disabled={isMovingLevel || isSubmittingForm || level.order === 0}
                          title="Move Up"
                        >
                            <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleMoveLevel(level.id, 'down')} 
                          disabled={isMovingLevel || isSubmittingForm || level.order === sortedEditorLevels.length - 1}
                          title="Move Down"
                        >
                            <ArrowDown className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={isSubmittingForm || isMovingLevel}>
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(level)} disabled={isSubmittingForm || isMovingLevel}>
                              <Edit2 className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator/>
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(level)}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10 data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
                              disabled={isSubmittingForm || isMovingLevel}
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

      <Dialog open={isFormOpen} onOpenChange={(open) => { 
          setIsFormOpen(open); 
          if (!open) {
              setEditingLevel(undefined); 
              setCurrentLevelName(''); 
              setCurrentLevelDescription('');
              setCurrentLevelOrderDisplay(undefined);
          } 
      }}>
        <DialogContent className="sm:max-w-2xl">
          <form onSubmit={handleSubmitForm}>
            <DialogHeader>
              <DialogTitle>{editingLevel ? 'Edit Editor Level' : 'Add New Editor Level'}</DialogTitle>
              <DialogDescription>
                {editingLevel ? `Modifying the level: "${editingLevel.name}"` : "Define a new proficiency tier for editors."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4"> 
              <div className="space-y-1.5">
                <Label htmlFor="level-name">Level Name</Label>
                <Input
                  id="level-name"
                  value={currentLevelName}
                  onChange={(e) => setCurrentLevelName(e.target.value)}
                  placeholder="e.g., Senior Editor"
                  required
                  disabled={isSubmittingForm || isMovingLevel}
                />
              </div>
              {editingLevel && (
                <div className="space-y-1.5">
                  <Label htmlFor="level-order">Order (1-based)</Label>
                  <Input
                    id="level-order"
                    type="number"
                    value={currentLevelOrderDisplay ?? ''}
                    onChange={(e) => setCurrentLevelOrderDisplay(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    placeholder={`1-${editorLevels.length}`}
                    min="1"
                    max={editorLevels.length}
                    disabled={isSubmittingForm || isMovingLevel}
                  />
                   <p className="text-xs text-muted-foreground">Set the display order. 1 is the first level.</p>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="level-description">Description</Label>
                <RichTextEditor
                  value={currentLevelDescription}
                  onChange={setCurrentLevelDescription}
                  disabled={isSubmittingForm || isMovingLevel}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmittingForm || isMovingLevel}><X className="mr-2 h-4 w-4" />Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmittingForm || isMovingLevel}>
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
              This will also re-index the order of subsequent levels.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLevelToDelete(undefined)} disabled={isSubmittingForm || isMovingLevel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className={buttonVariants({ variant: "destructive" })}
              disabled={isSubmittingForm || isMovingLevel}
            >
              {isSubmittingForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete Level'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
