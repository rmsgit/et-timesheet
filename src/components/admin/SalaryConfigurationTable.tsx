
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useMockUsers } from '@/hooks/useMockUsers';
import type { User } from '@/lib/types';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Edit, Save, X, Loader2, ChevronsUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type SortableKeys = keyof Pick<User, 'username' | 'baseSalary' | 'department' | 'jobDesignation' | 'conveyanceAllowance'>;

export const SalaryConfigurationTable: React.FC = () => {
  const { users, addUserProfileToRTDB, isUsersLoading } = useMockUsers();
  const { toast } = useToast();

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState({
    baseSalary: '',
    department: '',
    jobDesignation: '',
    conveyanceAllowance: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys | null; direction: 'ascending' | 'descending' }>({ key: 'username', direction: 'ascending' });

  const sortedUsers = useMemo(() => {
    let sortableItems = [...users];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key!];
        const valB = b[sortConfig.key!];
        
        let comparison = 0;
        if (valA === null || valA === undefined) comparison = -1;
        else if (valB === null || valB === undefined) comparison = 1;
        else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
        } else {
          comparison = String(valA).localeCompare(String(valB));
        }

        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [users, sortConfig]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedUsers.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedUsers, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedUsers.length / rowsPerPage);

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

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormState({
      baseSalary: user.baseSalary?.toString() || '',
      department: user.department || '',
      jobDesignation: user.jobDesignation || '',
      conveyanceAllowance: user.conveyanceAllowance?.toString() || '',
    });
    setIsFormOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!editingUser) return;

    setIsSubmitting(true);
    const result = await addUserProfileToRTDB(
      editingUser.id,
      editingUser.email!,
      editingUser.username,
      editingUser.role!,
      editingUser.editorLevelId,
      editingUser.isEligibleForMorningOT,
      editingUser.availableLeaves,
      editingUser.compensatoryLeaves,
      editingUser.claimedCompensatoryYears,
      formState.baseSalary !== '' ? Number(formState.baseSalary) : undefined,
      formState.department,
      formState.jobDesignation,
      formState.conveyanceAllowance !== '' ? Number(formState.conveyanceAllowance) : undefined
    );

    if (result.success) {
      toast({ title: 'Success', description: 'Salary configuration updated.' });
      setIsFormOpen(false);
    } else {
      toast({ title: 'Error', description: result.message || 'Failed to update salary configuration.', variant: 'destructive' });
    }
    setIsSubmitting(false);
  };
  
  const renderSortableHeader = (label: string, key: SortableKeys, className?: string) => (
    <TableHead className={cn("cursor-pointer hover:bg-muted/50", className)} onClick={() => requestSort(key)}>
      <div className="flex items-center">
        {label}
        {getSortIcon(key)}
      </div>
    </TableHead>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>User Salary Details</CardTitle>
          <CardDescription>View and manage salary information for all users.</CardDescription>
        </CardHeader>
        <CardContent>
          {isUsersLoading ? (
            <TableSkeleton columnCount={6} />
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  {renderSortableHeader('User', 'username')}
                  {renderSortableHeader('Base Salary', 'baseSalary')}
                  {renderSortableHeader('Department', 'department')}
                  {renderSortableHeader('Job Designation', 'jobDesignation')}
                  {renderSortableHeader('Conveyance Allowance', 'conveyanceAllowance')}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={`https://picsum.photos/seed/${user.username}/40/40`} alt={user.username} data-ai-hint="user avatar" />
                          <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.baseSalary ?? 'N/A'}</TableCell>
                    <TableCell>{user.department || 'N/A'}</TableCell>
                    <TableCell>{user.jobDesignation || 'N/A'}</TableCell>
                    <TableCell>{user.conveyanceAllowance ?? 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(user)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
                <div className="flex items-center justify-between space-x-2 p-4 border-t">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                    Next <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                </div>
            )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Salary for {editingUser?.username}</DialogTitle>
            <DialogDescription>Update the payroll information for this user.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="baseSalary" className="text-right">Base Salary</Label>
              <Input id="baseSalary" name="baseSalary" type="number" value={formState.baseSalary} onChange={handleFormChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="department" className="text-right">Department</Label>
              <Input id="department" name="department" value={formState.department} onChange={handleFormChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="jobDesignation" className="text-right">Job Designation</Label>
              <Input id="jobDesignation" name="jobDesignation" value={formState.jobDesignation} onChange={handleFormChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="conveyanceAllowance" className="text-right">Conveyance</Label>
              <Input id="conveyanceAllowance" name="conveyanceAllowance" type="number" value={formState.conveyanceAllowance} onChange={handleFormChange} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isSubmitting}><X className="mr-2 h-4 w-4" />Cancel</Button>
            </DialogClose>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
