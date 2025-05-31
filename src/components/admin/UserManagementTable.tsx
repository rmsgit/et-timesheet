
"use client";

import React, { useState, useEffect } from 'react';
import { useMockUsers } from '@/hooks/useMockUsers'; // Manages RTDB user profiles
import type { User } from '@/lib/types';
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
import { MoreHorizontal, UserPlus, Trash2, Edit2, Shield, Save, X, AlertTriangle, Loader2, KeyRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { auth } from '@/lib/firebase'; // Import Firebase Auth
import { createUserWithEmailAndPassword, deleteUser as deleteAuthUser, sendPasswordResetEmail } from 'firebase/auth'; // For managing Auth users
import { FormDescription } from '@/components/ui/form';


export const UserManagementTable: React.FC = () => {
  const { users, addUserProfileToRTDB, deleteUserProfileFromRTDB, isUsersLoading } = useMockUsers();
  const { toast } = useToast();

  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'editor' | 'admin'>('editor');
  
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [userForPasswordReset, setUserForPasswordReset] = useState<User | null>(null);
  const [isPasswordResetDialogOpen, setIsPasswordResetDialogOpen] = useState(false);

  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [editUserFormState, setEditUserFormState] = useState<{ username: string; email: string; role: 'editor' | 'admin' }>({
    username: '',
    email: '',
    role: 'editor',
  });


  const handleOpenAddUserDialog = () => {
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserName('');
    setNewUserRole('editor');
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
    if (!auth) {
        toast({ title: "Auth Error", description: "Firebase Auth not initialized.", variant: "destructive" });
        return;
    }

    setIsSubmittingForm(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, newUserEmail, newUserPassword);
      const firebaseUser = userCredential.user;
      const profileResult = await addUserProfileToRTDB(firebaseUser.uid, newUserEmail, newUserName, newUserRole);

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
        // Attempt to roll back Firebase Auth user creation if RTDB profile fails
        // This check ensures we are dealing with the newly created user
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

    // Prevent self-deletion of the primary admin if they are the only admin
    if (auth.currentUser && userToDelete.id === auth.currentUser.uid && userToDelete.role === 'admin') {
      const adminUsersCount = users.filter(u => u.role === 'admin').length;
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
      // Note: Deleting from RTDB first. Firebase Auth user deletion is more destructive
      // and often handled manually or via backend functions for safety.
      // This UI currently only removes the RTDB profile.
      const profileDeleteResult = await deleteUserProfileFromRTDB(userToDelete.id);
      if (profileDeleteResult.success) {
        toast({
          title: "User Profile Deleted",
          description: `Profile for "${userToDelete.username}" deleted from RTDB. Corresponding Firebase Auth user account still exists and needs manual deletion via Firebase Console if required.`,
        });
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
    // Basic email format check (not exhaustive)
    if (!/\S+@\S+\.\S+/.test(editUserFormState.email)) {
        toast({ title: "Validation Error", description: "Please enter a valid profile email format.", variant: "destructive" });
        return;
    }


    setIsSubmittingForm(true);
    const result = await addUserProfileToRTDB(
        editingUser.id,
        editUserFormState.email,
        editUserFormState.username,
        editUserFormState.role
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


  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div >
              <CardTitle className="text-2xl font-semibold">User Profiles & Roles</CardTitle>
              <CardDescription>Manage user profiles (RTDB) and associated Firebase Auth accounts.</CardDescription>
            </div>
            <Button onClick={handleOpenAddUserDialog} disabled={isUsersLoading || isSubmittingForm}>
              <UserPlus className="mr-2 h-4 w-4" /> Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isUsersLoading ? (
            <TableSkeleton 
              columnCount={4} 
              rowCount={3} 
              showTableHeader={true} 
              headerTexts={["User", "Email", "Role", "Actions"]} 
              cellWidths={["w-2/6", "w-2/6", "w-1/6", "w-1/6 text-right"]} 
            />
          ) : users.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed rounded-lg bg-card">
                <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-xl font-medium">No User Profiles Found</h3>
                <p className="mt-1 text-sm text-muted-foreground">No user profiles in RTDB. Add one to get started.</p>
                <Button className="mt-6" onClick={handleOpenAddUserDialog} disabled={isSubmittingForm}>
                    <UserPlus className="mr-2 h-4 w-4" /> Add User
                </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
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
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" disabled={isSubmittingForm}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEditDialog(user)} disabled={isSubmittingForm}>
                            <Edit2 className="mr-2 h-4 w-4" /> Edit Profile
                          </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => openPasswordResetDialog(user)} disabled={isSubmittingForm || !user.email}>
                            <KeyRound className="mr-2 h-4 w-4" /> Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(user)} 
                            className="text-destructive focus:text-destructive focus:bg-destructive/10 data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
                            disabled={isSubmittingForm || (auth?.currentUser?.email === user.email && user.role === 'admin' && users.filter(u=>u.role === 'admin').length <=1)}
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
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={(open) => { setIsAddUserDialogOpen(open); if (!open) { setNewUserName(''); setNewUserRole('editor'); setNewUserEmail(''); setNewUserPassword('');} }}>
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
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmittingForm}><X className="mr-2 h-4 w-4" />Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={handleConfirmAddUser} disabled={isSubmittingForm}>
              {isSubmittingForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
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
                            onValueChange={(value: 'editor' | 'admin') => setEditUserFormState(prev => ({ ...prev, role: value }))} 
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
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={isSubmittingForm}><X className="mr-2 h-4 w-4" />Cancel</Button>
                    </DialogClose>
                    <Button type="button" onClick={handleConfirmEditUser} disabled={isSubmittingForm}>
                         {isSubmittingForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>


      {/* Delete User Dialog */}
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

      {/* Password Reset Dialog */}
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
    </>
  );
};

    