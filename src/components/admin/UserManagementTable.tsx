
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useMockUsers } from '@/hooks/useMockUsers'; 
import { useEditorLevels } from '@/hooks/useEditorLevels';
import type { User, EditorLevel } from '@/lib/types';
import { Button, buttonVariants } from '@/components/ui/button';
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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MoreHorizontal, UserPlus, Trash2, Edit2, Shield, Save, X, AlertTriangle, Loader2, KeyRound, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Award, ChevronsUpDown, Leaf, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { auth } from '@/lib/firebase'; 
import { createUserWithEmailAndPassword, deleteUser as deleteAuthUser, sendPasswordResetEmail } from 'firebase/auth'; 
import { cn } from '@/lib/utils';
import { Checkbox } from '../ui/checkbox';


type SortableUserKeys = keyof Pick<User, 'username' | 'email' | 'role' | 'availableLeaves'> | 'editorLevelName';

export const UserManagementTable: React.FC = () => {
  const { users: allUsers, addUserProfileToRTDB, deleteUserProfileFromRTDB, isUsersLoading } = useMockUsers();
  const { editorLevels, isLoadingEditorLevels } = useEditorLevels();
  const { toast } = useToast();

  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'editor' | 'admin'>('editor');
  const [newUserEditorLevelId, setNewUserEditorLevelId] = useState<string | undefined>(undefined);
  const [newUserIsEligibleForMorningOT, setNewUserIsEligibleForMorningOT] = useState(false);
  const [newUserAvailableLeaves, setNewUserAvailableLeaves] = useState<number | string>(0);
  
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [userForPasswordReset, setUserForPasswordReset] = useState<User | null>(null);
  const [isPasswordResetDialogOpen, setIsPasswordResetDialogOpen] = useState(false);

  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [editUserFormState, setEditUserFormState] = useState<{ username: string; email: string; role: 'editor' | 'admin'; editorLevelId?: string; isEligibleForMorningOT?: boolean; availableLeaves?: number; }>({
    username: '',
    email: '',
    role: 'editor',
    editorLevelId: undefined,
    isEligibleForMorningOT: false,
    availableLeaves: 0,
  });

  const [selectedUserIds, setSelectedUserIds] = useState(new Set<string>());
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
  const [bulkLeaves, setBulkLeaves] = useState<number | string>('');

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;
  const [sortConfig, setSortConfig] = useState<{ key: SortableUserKeys | null; direction: 'ascending' | 'descending' }>({ key: 'username', direction: 'ascending' });

  // editorLevels from the hook is already sorted by its 'order' property
  const sortedEditorLevelsForSelect = useMemo(() => editorLevels, [editorLevels]);


  const getEditorLevelNameById = (levelId?: string): string => {
    if (!levelId || isLoadingEditorLevels) return '';
    const level = editorLevels.find(l => l.id === levelId);
    return level ? level.name : '';
  };

  const usersWithLevelNames = useMemo(() => {
    if (isLoadingEditorLevels) return allUsers.map(u => ({ ...u, editorLevelName: 'Loading...' }));
    return allUsers.map(user => ({
      ...user,
      editorLevelName: user.role === 'editor' ? getEditorLevelNameById(user.editorLevelId) : '',
    }));
  }, [allUsers, editorLevels, isLoadingEditorLevels]);


  const sortedUsers = useMemo(() => {
    let sortableItems = [...usersWithLevelNames];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key!];
        const valB = b[sortConfig.key!];
        
        let comparison = 0;
        if (valA === null || valA === undefined || valA === '') comparison = -1;
        else if (valB === null || valB === undefined || valB === '') comparison = 1;
        else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
        } else {
          const strA = String(valA).toLowerCase();
          const strB = String(valB).toLowerCase();
          comparison = strA.localeCompare(strB);
        }
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [usersWithLevelNames, sortConfig]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedUsers.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedUsers, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedUsers.length / rowsPerPage);

  const requestSort = (key: SortableUserKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const getSortIcon = (columnKey: SortableUserKeys) => {
    if (sortConfig.key !== columnKey) return <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUserIds(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(userId)) {
        newSelection.delete(userId);
      } else {
        newSelection.add(userId);
      }
      return newSelection;
    });
  };

  const handleSelectAll = () => {
    if (selectedUserIds.size === paginatedUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(paginatedUsers.map(u => u.id)));
    }
  };


  const handleOpenAddUserDialog = () => {
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserName('');
    setNewUserRole('editor');
    setNewUserEditorLevelId(sortedEditorLevelsForSelect.length > 0 ? sortedEditorLevelsForSelect[0].id : undefined);
    setNewUserIsEligibleForMorningOT(false);
    setNewUserAvailableLeaves(0);
    setIsAddUserDialogOpen(true);
  };

  const handleConfirmAddUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      toast({
        title: "Validation Error",
        description: "Email, password, and username cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    if (newUserRole === 'editor' && !newUserEditorLevelId && sortedEditorLevelsForSelect.length > 0) {
      toast({ title: "Validation Error", description: "Please select an editor level for the new editor.", variant: "destructive" });
      return;
    }
    if (!auth) {
        toast({ title: "Auth Error", description: "Firebase Auth not initialized.", variant: "destructive" });
        return;
    }

    setIsSubmittingForm(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, newUserEmail, newUserPassword);
      const firebaseUser = userCredential.user;
      const profileResult = await addUserProfileToRTDB(
        firebaseUser.uid, 
        newUserEmail, 
        newUserName, 
        newUserRole, 
        newUserRole === 'editor' ? newUserEditorLevelId : undefined,
        newUserRole === 'editor' ? newUserIsEligibleForMorningOT : false,
        Number(newUserAvailableLeaves)
      );

      if (profileResult.success) {
        toast({
          title: "User Added Successfully",
          description: `User "${newUserName}" created.`,
        });
        setIsAddUserDialogOpen(false);
      } else {
        toast({
          title: "Profile Error",
          description: profileResult.message || "Failed to add user profile to RTDB.",
          variant: "destructive",
        });
        // Attempt to roll back Firebase Auth user creation if RTDB profile failed
        if (auth.currentUser && auth.currentUser.uid === firebaseUser.uid) {
            await deleteAuthUser(firebaseUser).catch(delError => console.error("Failed to roll back Auth user:", delError));
        }
      }
    } catch (error: any) {
      console.error("Firebase Auth user creation error:", error);
      let message = "Failed to create user in Firebase Auth.";
      if (error.code === 'auth/email-already-in-use') {
        message = "This email is already registered for login.";
      } else if (error.code === 'auth/weak-password') {
        message = "Password is too weak (min. 6 characters).";
      } else if (error.code === 'auth/invalid-email') {
        message = "The email address is not valid.";
      }
      toast({ title: "Auth Creation Failed", description: message, variant: "destructive" });
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const openDeleteDialog = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    if (!auth) {
        toast({ title: "Auth Error", description: "Firebase Auth not initialized.", variant: "destructive" });
        return;
    }

    if (auth.currentUser && userToDelete.id === auth.currentUser.uid && userToDelete.role === 'admin') {
      const adminUsersCount = allUsers.filter(u => u.role === 'admin').length;
      if (adminUsersCount <= 1) {
        toast({
          title: "Action Restricted",
          description: "Cannot delete your own admin account as you are the only administrator.",
          variant: "destructive",
        });
        setIsDeleteDialogOpen(false);
        setUserToDelete(null);
        return;
      }
    }
    
    setIsSubmittingForm(true);
    try {
      const profileDeleteResult = await deleteUserProfileFromRTDB(userToDelete.id);
      if (profileDeleteResult.success) {
        toast({
          title: "User Profile Deleted",
          description: `Profile for "${userToDelete.username}" deleted from RTDB. Corresponding Firebase Auth user account still exists and needs manual deletion via Firebase Console if required.`,
        });
         if (currentPage > 1 && paginatedUsers.length === 1 && sortedUsers.length -1 <= (currentPage -1) * rowsPerPage) {
            setCurrentPage(currentPage - 1);
         }
      } else {
         toast({
          title: "Failed to Delete Profile",
          description: profileDeleteResult.message || "Could not delete user profile from RTDB.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error during user deletion process:", error);
      toast({ title: "Deletion Error", description: "An unexpected error occurred.", variant: "destructive"});
    } finally {
      setIsSubmittingForm(false);
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };
  
  const openPasswordResetDialog = (user: User) => {
    setUserForPasswordReset(user);
    setIsPasswordResetDialogOpen(true);
  };

  const handleConfirmPasswordReset = async () => {
    if (!userForPasswordReset || !userForPasswordReset.email) {
        toast({ title: "Error", description: "User email is not available for password reset.", variant: "destructive" });
        return;
    }
    if (!auth) {
        toast({ title: "Auth Error", description: "Firebase Auth not initialized.", variant: "destructive" });
        return;
    }

    setIsSubmittingForm(true);
    try {
        await sendPasswordResetEmail(auth, userForPasswordReset.email);
        toast({
            title: "Password Reset Email Sent",
            description: `An email has been sent to ${userForPasswordReset.email} with instructions to reset their password.`,
        });
    } catch (error: any) {
        console.error("Firebase send password reset email error:", error);
        let message = "Failed to send password reset email.";
        if (error.code === 'auth/user-not-found') {
            message = "There is no user record corresponding to this email. The user may have been deleted from Firebase Auth.";
        } else if (error.code === 'auth/invalid-email') {
            message = "The email address is not valid.";
        }
        toast({
            title: "Password Reset Failed",
            description: message,
            variant: "destructive",
        });
    } finally {
        setIsSubmittingForm(false);
        setIsPasswordResetDialogOpen(false);
        setUserForPasswordReset(null);
    }
  };

  const handleOpenEditDialog = (user: User) => {
    setEditingUser(user);
    setEditUserFormState({
        username: user.username,
        email: user.email || '',
        role: user.role || 'editor',
        editorLevelId: user.editorLevelId || (user.role === 'editor' && sortedEditorLevelsForSelect.length > 0 ? sortedEditorLevelsForSelect[0].id : undefined),
        isEligibleForMorningOT: user.isEligibleForMorningOT ?? false,
        availableLeaves: user.availableLeaves ?? 0,
    });
    setIsEditUserDialogOpen(true);
  };

  const handleConfirmEditUser = async () => {
    if (!editingUser) return;

    if (!editUserFormState.username.trim()) {
        toast({ title: "Validation Error", description: "Username cannot be empty.", variant: "destructive" });
        return;
    }
     if (!editUserFormState.email.trim()) {
        toast({ title: "Validation Error", description: "Profile email cannot be empty.", variant: "destructive" });
        return;
    }
    if (!/\S+@\S+\.\S+/.test(editUserFormState.email)) {
        toast({ title: "Validation Error", description: "Please enter a valid profile email format.", variant: "destructive" });
        return;
    }
    if (editUserFormState.role === 'editor' && !editUserFormState.editorLevelId && sortedEditorLevelsForSelect.length > 0) {
      toast({ title: "Validation Error", description: "Please select an editor level.", variant: "destructive" });
      return;
    }


    setIsSubmittingForm(true);
    const result = await addUserProfileToRTDB(
        editingUser.id,
        editUserFormState.email,
        editUserFormState.username,
        editUserFormState.role,
        editUserFormState.role === 'editor' ? editUserFormState.editorLevelId : undefined,
        editUserFormState.role === 'editor' ? editUserFormState.isEligibleForMorningOT : false,
        editUserFormState.availableLeaves
    );

    if (result.success) {
        toast({ title: "Profile Updated", description: `Profile for "${editUserFormState.username}" has been updated.` });
        setIsEditUserDialogOpen(false);
        setEditingUser(null);
    } else {
        toast({ title: "Update Failed", description: result.message || "Could not update user profile.", variant: "destructive" });
    }
    setIsSubmittingForm(false);
  };

  const handleConfirmBulkEdit = async () => {
    const leaves = parseInt(String(bulkLeaves), 10);
    if (isNaN(leaves) || leaves < 0) {
        toast({ title: 'Invalid Input', description: 'Please enter a valid non-negative number for leaves.', variant: 'destructive' });
        return;
    }

    setIsSubmittingForm(true);

    const updatePromises = Array.from(selectedUserIds).map(userId => {
        const userToUpdate = allUsers.find(u => u.id === userId);
        if (!userToUpdate || !userToUpdate.email || !userToUpdate.role) {
            console.error(`Skipping bulk update for user ${userId}: missing data.`);
            return Promise.resolve({ success: false, message: `User ${userId} not found or has incomplete data.` });
        }
        
        return addUserProfileToRTDB(
            userToUpdate.id,
            userToUpdate.email,
            userToUpdate.username,
            userToUpdate.role,
            userToUpdate.editorLevelId,
            userToUpdate.isEligibleForMorningOT,
            leaves
        );
    });

    try {
        const results = await Promise.all(updatePromises);
        const failedUpdates = results.filter(r => !r.success);

        if (failedUpdates.length > 0) {
            toast({ title: 'Bulk Update Partially Failed', description: `${failedUpdates.length} of ${selectedUserIds.size} user profiles could not be updated.`, variant: 'destructive'});
        } else {
            toast({ title: 'Bulk Update Successful', description: `Updated available leaves for ${selectedUserIds.size} users.`});
        }
    } catch (error) {
        toast({ title: 'Bulk Update Error', description: 'An unexpected error occurred during bulk update.', variant: 'destructive'});
    } finally {
        setIsSubmittingForm(false);
        setIsBulkEditDialogOpen(false);
        setSelectedUserIds(new Set());
    }
};

  const renderSortableHeader = (label: string, columnKey: SortableUserKeys, className?: string) => (
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
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <CardTitle className="text-2xl font-semibold">User Profiles & Roles</CardTitle>
              <CardDescription>Manage user profiles (RTDB) and associated Firebase Auth accounts.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                {selectedUserIds.size > 0 && (
                    <Button variant="outline" onClick={() => setIsBulkEditDialogOpen(true)} disabled={isSubmittingForm}>
                        <Edit className="mr-2 h-4 w-4" /> Bulk Edit ({selectedUserIds.size})
                    </Button>
                )}
                <Button onClick={handleOpenAddUserDialog} disabled={isUsersLoading || isSubmittingForm || isLoadingEditorLevels}>
                <UserPlus className="mr-2 h-4 w-4" /> Add User
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isUsersLoading ? (
            <TableSkeleton 
              columnCount={6} 
              rowCount={3} 
              showTableHeader={true} 
              headerTexts={["", "User", "Email", "Role", "Editor Level", "Actions"]} 
              cellWidths={["w-12", "w-[25%]", "w-[25%]", "w-[15%]", "w-[15%]", "w-[15%] text-right"]} 
            />
          ) : sortedUsers.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed rounded-lg bg-card">
                <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-xl font-medium">No User Profiles Found</h3>
                <p className="mt-1 text-sm text-muted-foreground">No user profiles in RTDB. Add one to get started.</p>
                <Button className="mt-6" onClick={handleOpenAddUserDialog} disabled={isSubmittingForm || isLoadingEditorLevels}>
                    <UserPlus className="mr-2 h-4 w-4" /> Add User
                </Button>
            </div>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                    <TableHead padding="checkbox">
                        <Checkbox
                            checked={selectedUserIds.size === paginatedUsers.length && paginatedUsers.length > 0}
                            indeterminate={selectedUserIds.size > 0 && selectedUserIds.size < paginatedUsers.length}
                            onCheckedChange={handleSelectAll}
                        />
                    </TableHead>
                  {renderSortableHeader("User", "username")}
                  {renderSortableHeader("Email", "email")}
                  {renderSortableHeader("Role", "role")}
                  {renderSortableHeader("Editor Level", "editorLevelName")}
                  {renderSortableHeader("Available Leaves", "availableLeaves")}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user) => (
                  <TableRow key={user.id} data-state={selectedUserIds.has(user.id) && "selected"}>
                    <TableCell padding="checkbox">
                        <Checkbox
                            checked={selectedUserIds.has(user.id)}
                            onCheckedChange={() => handleSelectUser(user.id)}
                        />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={`https://picsum.photos/seed/${user.username}/40/40`} alt={user.username} data-ai-hint="user avatar"/>
                          <AvatarFallback>{user.username.substring(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.username}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.email || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role === 'admin' && <Shield className="mr-1 h-3 w-3" />}
                        {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'No Role'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                        {user.role === 'editor' && user.editorLevelId ? (
                           isLoadingEditorLevels ? <div className="h-5 w-20 rounded-md bg-muted animate-pulse" /> : (
                            <Badge variant="outline" className="flex items-center gap-1.5">
                              <Award className="h-3 w-3 text-primary" />
                              {getEditorLevelNameById(user.editorLevelId) || 'N/A'}
                            </Badge>
                           )
                        ) : (
                            user.role === 'editor' && sortedEditorLevelsForSelect.length > 0 ? <span className="text-xs text-muted-foreground">Not Set</span> : 'N/A'
                        )}
                    </TableCell>
                    <TableCell>
                        {user.availableLeaves ?? 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" disabled={isSubmittingForm || isLoadingEditorLevels}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEditDialog(user)} disabled={isSubmittingForm || isLoadingEditorLevels}>
                            <Edit2 className="mr-2 h-4 w-4" /> Edit Profile
                          </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => openPasswordResetDialog(user)} disabled={isSubmittingForm || isLoadingEditorLevels || !user.email}>
                            <KeyRound className="mr-2 h-4 w-4" /> Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(user)} 
                            className="text-destructive focus:text-destructive focus:bg-destructive/10 data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
                            disabled={isSubmittingForm || isLoadingEditorLevels || (auth?.currentUser?.email === user.email && user.role === 'admin' && allUsers.filter(u=>u.role === 'admin').length <=1)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between space-x-2 p-4 border-t">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages} (Total: {sortedUsers.length} users)</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddUserDialogOpen} onOpenChange={(open) => { setIsAddUserDialogOpen(open); if (!open) { setNewUserName(''); setNewUserRole('editor'); setNewUserEmail(''); setNewUserPassword(''); setNewUserEditorLevelId(undefined); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User (Auth & Profile)</DialogTitle>
            <DialogDescription>This creates a new Firebase Authentication user and their profile in the database.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-user-email">Email (for login)</Label>
              <Input
                id="new-user-email"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="user@example.com"
                disabled={isSubmittingForm}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-user-password">Password</Label>
               <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    id="new-user-password"
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    disabled={isSubmittingForm}
                    className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-username">Username (display name)</Label>
              <Input
                id="new-username"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Enter username"
                disabled={isSubmittingForm}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-user-role">Role</Label>
              <Select value={newUserRole} onValueChange={(value: 'editor' | 'admin') => setNewUserRole(value)} disabled={isSubmittingForm}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newUserRole === 'editor' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="new-user-editor-level">Editor Level</Label>
                  {isLoadingEditorLevels ? (
                      <div className="flex items-center justify-center h-10 border rounded-md bg-muted">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                  ) : sortedEditorLevelsForSelect.length > 0 ? (
                      <Select value={newUserEditorLevelId} onValueChange={setNewUserEditorLevelId} disabled={isSubmittingForm || isLoadingEditorLevels}>
                      <SelectTrigger id="new-user-editor-level">
                          <SelectValue placeholder="Select editor level" />
                      </SelectTrigger>
                      <SelectContent>
                          {sortedEditorLevelsForSelect.map((level) => (
                          <SelectItem key={level.id} value={level.id}>{level.name}</SelectItem>
                          ))}
                      </SelectContent>
                      </Select>
                  ) : (
                      <p className="text-sm text-muted-foreground p-2 border rounded-md">No editor levels defined yet. Please add levels in Admin > Editor Levels.</p>
                  )}
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="new-user-available-leaves">Available Leaves</Label>
                    <Input
                        id="new-user-available-leaves"
                        type="number"
                        value={newUserAvailableLeaves}
                        onChange={(e) => setNewUserAvailableLeaves(e.target.value)}
                        placeholder="e.g., 15"
                        disabled={isSubmittingForm}
                    />
                </div>
                <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                        id="new-user-morning-ot"
                        checked={newUserIsEligibleForMorningOT}
                        onCheckedChange={(checked) => setNewUserIsEligibleForMorningOT(checked as boolean)}
                        disabled={isSubmittingForm}
                    />
                    <Label htmlFor="new-user-morning-ot" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Eligible for Morning OT
                    </Label>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmittingForm}><X className="mr-2 h-4 w-4" />Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={handleConfirmAddUser} disabled={isSubmittingForm || (newUserRole === 'editor' && isLoadingEditorLevels) || (newUserRole === 'editor' && sortedEditorLevelsForSelect.length === 0 && !isLoadingEditorLevels) }>
              {isSubmittingForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditUserDialogOpen} onOpenChange={(open) => { setIsEditUserDialogOpen(open); if (!open) setEditingUser(null); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit User Profile</DialogTitle>
                    <DialogDescription>
                        Modify the user's profile details. Changes are saved to the Realtime Database.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="edit-username">Username</Label>
                        <Input
                            id="edit-username"
                            value={editUserFormState.username}
                            onChange={(e) => setEditUserFormState(prev => ({ ...prev, username: e.target.value }))}
                            placeholder="Enter username"
                            disabled={isSubmittingForm}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="edit-email">Profile Email</Label>
                        <Input
                            id="edit-email"
                            type="email"
                            value={editUserFormState.email}
                            onChange={(e) => setEditUserFormState(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="user@example.com"
                            disabled={isSubmittingForm}
                        />
                         <p className="text-xs text-muted-foreground">
                            This email is for profile display. Changing it here does NOT change the user's login email for Firebase Authentication.
                        </p>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="edit-user-role">Role</Label>
                        <Select 
                            value={editUserFormState.role} 
                            onValueChange={(value: 'editor' | 'admin') => {
                                setEditUserFormState(prev => ({ 
                                    ...prev, 
                                    role: value,
                                    editorLevelId: value === 'admin' ? undefined : (prev.editorLevelId || (sortedEditorLevelsForSelect.length > 0 ? sortedEditorLevelsForSelect[0].id : undefined))
                                }));
                            }} 
                            disabled={isSubmittingForm}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="editor">Editor</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {editUserFormState.role === 'editor' && (
                        <>
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-user-editor-level">Editor Level</Label>
                                {isLoadingEditorLevels ? (
                                    <div className="flex items-center justify-center h-10 border rounded-md bg-muted">
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    </div>
                                ) : sortedEditorLevelsForSelect.length > 0 ? (
                                    <Select 
                                        value={editUserFormState.editorLevelId} 
                                        onValueChange={(value) => setEditUserFormState(prev => ({ ...prev, editorLevelId: value }))} 
                                        disabled={isSubmittingForm || isLoadingEditorLevels}
                                    >
                                    <SelectTrigger id="edit-user-editor-level">
                                        <SelectValue placeholder="Select editor level" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sortedEditorLevelsForSelect.map((level) => (
                                        <SelectItem key={level.id} value={level.id}>{level.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                ) : (
                                    <p className="text-sm text-muted-foreground p-2 border rounded-md">No editor levels defined yet. Cannot assign.</p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-user-available-leaves">Available Leaves</Label>
                                <Input
                                    id="edit-user-available-leaves"
                                    type="number"
                                    value={editUserFormState.availableLeaves ?? ''}
                                    onChange={(e) => setEditUserFormState(prev => ({ ...prev, availableLeaves: e.target.value === '' ? undefined : Number(e.target.value) }))}
                                    placeholder="e.g., 15"
                                    disabled={isSubmittingForm}
                                />
                            </div>
                            <div className="flex items-center space-x-2 pt-2">
                                <Checkbox
                                    id="edit-user-morning-ot"
                                    checked={editUserFormState.isEligibleForMorningOT}
                                    onCheckedChange={(checked) => setEditUserFormState(prev => ({ ...prev, isEligibleForMorningOT: checked as boolean }))}
                                    disabled={isSubmittingForm}
                                />
                                <Label htmlFor="edit-user-morning-ot" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Eligible for Morning OT
                                </Label>
                            </div>
                        </>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={isSubmittingForm}><X className="mr-2 h-4 w-4" />Cancel</Button>
                    </DialogClose>
                    <Button type="button" onClick={handleConfirmEditUser} disabled={isSubmittingForm || (editUserFormState.role === 'editor' && isLoadingEditorLevels) || (editUserFormState.role === 'editor' && sortedEditorLevelsForSelect.length === 0 && !isLoadingEditorLevels) }>
                         {isSubmittingForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the user's profile from RTDB. The Firebase Auth user account (for login) will remain and must be deleted manually via the Firebase Console if full deletion is required.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)} disabled={isSubmittingForm}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteUser}
              className={buttonVariants({ variant: "destructive" })}
              disabled={isSubmittingForm}
            >
              {isSubmittingForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete Profile from RTDB'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isPasswordResetDialogOpen} onOpenChange={setIsPasswordResetDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Password Reset</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to send a password reset email to {userForPasswordReset?.email}? 
                    They will receive instructions to set a new password for their Firebase Authentication account.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setUserForPasswordReset(null)} disabled={isSubmittingForm}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmPasswordReset} disabled={isSubmittingForm}>
                    {isSubmittingForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Send Reset Email'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={isBulkEditDialogOpen} onOpenChange={setIsBulkEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Edit Available Leaves</DialogTitle>
            <DialogDescription>
              Set the number of available leaves for all {selectedUserIds.size} selected users. This will overwrite their current value.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-leaves-input">Available Leaves</Label>
              <div className="relative">
                <Leaf className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="bulk-leaves-input"
                  type="number"
                  value={bulkLeaves}
                  onChange={(e) => setBulkLeaves(e.target.value)}
                  placeholder="e.g., 20"
                  disabled={isSubmittingForm}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmittingForm}><X className="mr-2 h-4 w-4" />Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={handleConfirmBulkEdit} disabled={isSubmittingForm}>
              {isSubmittingForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Apply to All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
