
"use client";

import React, { useState } from 'react';
import { useProjectTypes } from '@/hooks/useProjectTypes';
import { useTimesheet } from '@/hooks/useTimesheet'; // To check if type is in use
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
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
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
import { MoreHorizontal, PlusCircle, Trash2, Edit2, Save, X, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { buttonVariants } from '@/components/ui/button';

export const ProjectTypesManagementTable: React.FC = () => {
  const { projectTypes, addProjectType, updateProjectType, deleteProjectType, isLoadingProjectTypes, isProjectTypeInUse } = useProjectTypes();
  const { timeRecords: allTimeRecords, isTimesheetLoading } = useTimesheet(); // Get all time records
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<string | undefined>(undefined);
  const [currentTypeValue, setCurrentTypeValue] = useState('');
  const [typeToDelete, setTypeToDelete] = useState<string | undefined>(undefined);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const isLoading = isLoadingProjectTypes || isTimesheetLoading;

  const handleAddNew = () => {
    setEditingType(undefined);
    setCurrentTypeValue('');
    setIsFormOpen(true);
  };

  const handleEdit = (type: string) => {
    setEditingType(type);
    setCurrentTypeValue(type);
    setIsFormOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    let result;
    if (editingType) {
      result = updateProjectType(editingType, currentTypeValue);
    } else {
      result = addProjectType(currentTypeValue);
    }

    if (result.success) {
      toast({
        title: "Success",
        description: `Project type ${editingType ? 'updated' : 'added'}.`,
      });
      setIsFormOpen(false);
    } else {
      toast({
        title: "Error",
        description: result.message || "Failed to save project type.",
        variant: "destructive",
      });
    }
  };

  const openDeleteDialog = (type: string) => {
    setTypeToDelete(type);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (typeToDelete) {
      if (isProjectTypeInUse(typeToDelete, allTimeRecords)) {
        toast({
          title: "Cannot Delete Project Type",
          description: `"${typeToDelete}" is currently in use by one or more time records.`,
          variant: "destructive",
        });
      } else {
        const result = deleteProjectType(typeToDelete);
        if (result.success) {
          toast({
            title: "Project Type Deleted",
            description: `"${typeToDelete}" has been deleted.`,
          });
        } else {
           toast({
            title: "Error",
            description: result.message || "Failed to delete project type.",
            variant: "destructive",
          });
        }
      }
      setIsDeleteDialogOpen(false);
      setTypeToDelete(undefined);
    }
  };

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-semibold">Manage Project Types</CardTitle>
              <CardDescription>Add, edit, or remove project types used in timesheets.</CardDescription>
            </div>
            <Button onClick={handleAddNew} disabled={isLoading}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton columnCount={2} rowCount={projectTypes.length > 0 ? projectTypes.length : 3} showTableHeader={true} 
              headerTexts={["Project Type Name", "Actions"]} 
              cellWidths={["w-4/5", "w-1/5 text-right"]} 
            />
          ) : projectTypes.length === 0 ? (
             <div className="text-center py-10 border-2 border-dashed rounded-lg bg-card">
                <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-xl font-medium">No Project Types Defined</h3>
                <p className="mt-1 text-sm text-muted-foreground">Get started by adding your first project type.</p>
                <Button className="mt-6" onClick={handleAddNew}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Type
                </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Type Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectTypes.map((type) => (
                  <TableRow key={type}>
                    <TableCell className="font-medium">{type}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(type)}>
                            <Edit2 className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(type)}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10 data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
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
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingType(undefined); }}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmitForm}>
            <DialogHeader>
              <DialogTitle>{editingType ? 'Edit Project Type' : 'Add New Project Type'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="project-type-name" className="text-right col-span-1">
                  Name
                </Label>
                <Input
                  id="project-type-name"
                  value={currentTypeValue}
                  onChange={(e) => setCurrentTypeValue(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., New Feature"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline"><X className="mr-2 h-4 w-4" />Cancel</Button>
              </DialogClose>
              <Button type="submit"><Save className="mr-2 h-4 w-4" />{editingType ? 'Save Changes' : 'Add Type'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project type "{typeToDelete}".
              If this type is in use, deletion might be prevented.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTypeToDelete(undefined)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className={buttonVariants({ variant: "destructive" })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
