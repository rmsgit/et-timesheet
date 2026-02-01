
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
import { Edit, Save, X, Loader2, ChevronsUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Check, X as XIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

type SortableKeys = keyof Pick<User, 'username' | 'baseSalary' | 'conveyanceAllowance' | 'travelingAllowance' | 'isEligibleForMorningOT'>;

export const SalaryConfigurationTable: React.FC = () => {
  const { users, addUserProfileToRTDB, isUsersLoading } = useMockUsers();
  const { toast } = useToast();

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState({
    baseSalary: '',
    conveyanceAllowance: '',
    travelingAllowance: '',
    isEligibleForMorningOT: false,
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
        if (sortConfig.key === 'isEligibleForMorningOT') {
            const boolA = valA === true;
            const boolB = valB === true;
            comparison = boolA === boolB ? 0 : boolA ? -1 : 1;
        }
        else if (valA === null || valA === undefined) comparison = -1;
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
      conveyanceAllowance: user.conveyanceAllowance?.toString() || '',
      travelingAllowance: user.travelingAllowance?.toString() || '',
      isEligibleForMorningOT: user.isEligibleForMorningOT || false,
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
      editingUser.fullName,
      editingUser.role!,
      editingUser.editorLevelId,
      formState.isEligibleForMorningOT,
      editingUser.availableLeaves,
      editingUser.compensatoryLeaves,
      editingUser.claimedCompensatoryYears,
      formState.baseSalary !== '' ? Number(formState.baseSalary) : undefined,
      editingUser.department,
      editingUser.jobDesignation,
      formState.conveyanceAllowance !== '' ? Number(formState.conveyanceAllowance) : undefined,
      formState.travelingAllowance !== '' ? Number(formState.travelingAllowance) : undefined,
      editingUser.joiningDate,
      editingUser.personalEmail
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
            <TableSkeleton columnCount={8} />
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  {renderSortableHeader('User', 'username')}
                  {renderSortableHeader('Basic Salary', 'baseSalary')}
                  {renderSortableHeader('Conv. Allowance', 'conveyanceAllowance')}
                  {renderSortableHeader('Traveling', 'travelingAllowance')}
                  {renderSortableHeader('Morning OT', 'isEligibleForMorningOT')}
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
                            <div className="font-medium">{user.fullName || user.username}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.baseSalary ?? 'N/A'}</TableCell>
                    <TableCell>{user.conveyanceAllowance ?? 'N/A'}</TableCell>
                    <TableCell>{user.travelingAllowance ?? 'N/A'}</TableCell>
                     <TableCell>
                      {user.role === 'editor' ? (
                        user.isEligibleForMorningOT ? (
                          <Check className="h-5 w-5 text-green-500" />
                        ) : (
                          <XIcon className="h-5 w-5 text-muted-foreground" />
                        )
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
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
            <DialogTitle>Edit Salary for {editingUser?.fullName || editingUser?.username}</DialogTitle>
            <DialogDescription>Update the payroll information for this user.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="baseSalary" className="text-right">Basic Salary</Label>
              <Input id="baseSalary" name="baseSalary" type="number" value={formState.baseSalary} onChange={handleFormChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="conveyanceAllowance" className="text-right">Conv. Allowance</Label>
              <Input id="conveyanceAllowance" name="conveyanceAllowance" type="number" value={formState.conveyanceAllowance} onChange={handleFormChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="travelingAllowance" className="text-right">Traveling</Label>
              <Input id="travelingAllowance" name="travelingAllowance" type="number" value={formState.travelingAllowance} onChange={handleFormChange} className="col-span-3" />
            </div>
            {editingUser?.role === 'editor' && (
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="isEligibleForMorningOT" className="text-right col-span-3">Eligible for Morning OT</Label>
                  <Checkbox
                      id="isEligibleForMorningOT"
                      checked={formState.isEligibleForMorningOT}
                      onCheckedChange={(checked) => setFormState(prev => ({...prev, isEligibleForMorningOT: checked as boolean}))}
                      className="col-span-1 justify-self-start"
                  />
              </div>
            )}
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
