
"use client";

import React, { useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MoreHorizontal, UserPlus, Trash2, Edit2, Shield, Save, X, AlertTriangle, Loader2, KeyRound } from 'lucide-react'; // Added KeyRound
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { auth } from '@/lib/firebase'; // Import Firebase Auth
import { createUserWithEmailAndPassword, deleteUser as deleteAuthUser } from 'firebase/auth'; // For managing Auth users

export const UserManagementTable: React.FC = () => {
  // useMockUsers now manages user profiles (username, role) in RTDB
  const { users, addUserProfileToRTDB, deleteUserProfileFromRTDB, isUsersLoading } = useMockUsers();
  const { toast } = useToast();

  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState(''); // For Firebase Auth
  const [newUserPassword, setNewUserPassword] = useState(''); // For Firebase Auth
  const [newUserName, setNewUserName] = useState(''); // For RTDB profile
  const [newUserRole, setNewUserRole] = useState<'editor' | 'admin'>('editor'); // For RTDB profile
  
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);


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
      // 1. Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, newUserEmail, newUserPassword);
      const firebaseUser = userCredential.user;

      // 2. Add user profile (role, username) to Realtime Database, using Firebase UID as key
      const profileResult = await addUserProfileToRTDB(firebaseUser.uid, newUserEmail, newUserName, newUserRole);

      if (profileResult.success) {
        toast({
          title: "User Added Successfully",
          description: `User "${newUserName}" created in Firebase Auth and RTDB.`,
        });
        setIsAddUserDialogOpen(false);
      } else {
        // Profile creation failed, attempt to roll back Auth user creation (best effort)
        toast({
          title: "Profile Error",
          description: profileResult.message || "Failed to add user profile to RTDB. Auth user created but profile failed.",
          variant: "destructive",
        });
        // Try to delete the auth user if profile save fails to keep things consistent
        if (auth.currentUser && auth.currentUser.uid === firebaseUser.uid) { // Ensure it's the same user before deleting
            await deleteAuthUser(firebaseUser).catch(delError => console.error("Failed to roll back Auth user:", delError));
        }
      }
    } catch (error: any) {
      console.error("Firebase Auth user creation error:", error);
      let message = "Failed to create user in Firebase Auth.";
      if (error.code === 'auth/email-already-in-use') {
        message = "This email is already registered.";
      } else if (error.code === 'auth/weak-password') {
        message = "Password is too weak. It should be at least 6 characters.";
      } else if (error.code === 'auth/invalid-email') {
        message = "The email address is not valid.";
      }
      toast({
        title: "Auth Creation Failed",
        description: message,
        variant: "destructive",
      });
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

    if (userToDelete.email === auth.currentUser?.email && users.filter(u => u.role === 'admin').length <= 1 && userToDelete.role === 'admin') {
         toast({
          title: "Cannot Delete Self Admin",
          description: "This is the currently logged-in primary administrator and cannot be deleted this way.",
          variant: "destructive",
        });
        setIsDeleteDialogOpen(false);
        setUserToDelete(null);
        return;
    }
    
    setIsSubmittingForm(true);
    try {
      // 1. Delete user profile from Realtime Database
      const profileDeleteResult = await deleteUserProfileFromRTDB(userToDelete.id);
      
      if (profileDeleteResult.success) {
        // 2. Attempt to delete user from Firebase Auth
        // This is more complex as it requires re-authentication or admin SDK.
        // For client-side, direct deletion of OTHER users is not possible without admin privileges/SDK.
        // This example will assume an admin is deleting and would typically use Firebase Admin SDK on a backend.
        // For now, we only delete from RTDB. Auth user deletion needs a backend or manual Firebase console action.
        toast({
          title: "User Profile Deleted",
          description: `Profile for "${userToDelete.username}" deleted from RTDB. Firebase Auth user may need manual deletion.`,
          variant: "default", // Changed to default as RTDB part succeeded
        });
      } else {
         toast({
          title: "Failed to Delete User Profile",
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
  
  const handleEditUser = (user: User) => {
     // Editing user roles/usernames in RTDB is possible.
     // Editing Firebase Auth email/password client-side for *other* users is not typical without admin SDK.
     // This function would open a form to edit RTDB profile.
     toast({
      title: "Edit User (Mocked)",
      description: `Editing user profile for "${user.username}" in RTDB would happen here. Auth details (email/password) require Firebase Console or specific flows.`,
    });
  }

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div >
              <CardTitle className="text-2xl font-semibold">User Profiles & Roles</CardTitle>
              <CardDescription>Manage user profiles and roles (stored in Firebase RTDB). Auth users are created here too.</CardDescription>
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
                          <DropdownMenuItem onClick={() => handleEditUser(user)} disabled={isSubmittingForm}>
                            <Edit2 className="mr-2 h-4 w-4" /> Edit Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(user)} 
                            className="text-destructive focus:text-destructive focus:bg-destructive/10 data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
                            disabled={isSubmittingForm || (auth?.currentUser?.email === user.email && user.role === 'admin' && users.filter(u=>u.role === 'admin').length <=1)}
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

      <Dialog open={isAddUserDialogOpen} onOpenChange={(open) => { setIsAddUserDialogOpen(open); if (!open) { setNewUserName(''); setNewUserRole('editor'); setNewUserEmail(''); setNewUserPassword('');} }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User (Auth & Profile)</DialogTitle>
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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the user's profile (username, role) from the Realtime Database.
              Deleting the Firebase Authentication user typically requires backend Admin SDK or manual deletion in Firebase Console for security reasons if not deleting self.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteUser}
              className={buttonVariants({ variant: "destructive" })}
              disabled={isSubmittingForm}
            >
              {isSubmittingForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete Profile'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
