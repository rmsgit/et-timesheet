
"use client";

import React, { useState } from 'react';
import { useMockUsers } from '@/hooks/useMockUsers';
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
import { MoreHorizontal, UserPlus, Trash2, Edit2, Shield, Save, X, AlertTriangle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';

export const UserManagementTable: React.FC = () => {
  const { users, addUser, deleteUser, isUsersLoading } = useMockUsers();
  const { toast } = useToast();

  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'editor' | 'admin'>('editor');
  
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);


  const handleOpenAddUserDialog = () => {
    setNewUserName('');
    setNewUserRole('editor');
    setIsAddUserDialogOpen(true);
  };

  const handleConfirmAddUser = () => {
    if (!newUserName.trim()) {
      toast({
        title: "Validation Error",
        description: "Username cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmittingForm(true);
    // addUser is now optimistic and doesn't return a promise for success/failure directly for UI
    // It updates Firebase, and the UI list updates via onValue listener.
    // We show a toast based on the synchronous checks.
    const result = addUser(newUserName, newUserRole); 
    if (result.success && result.user) {
      toast({
        title: "User Add Initiated",
        description: `Attempting to add user "${result.user.username}".`,
      });
      setIsAddUserDialogOpen(false);
    } else {
      toast({
        title: "Failed to Add User",
        description: result.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
    setIsSubmittingForm(false);
  };

  const openDeleteDialog = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDeleteUser = () => {
    if (userToDelete) {
      if (userToDelete.username === 'admin' && users.filter(u => u.role === 'admin').length <= 1) {
         toast({
          title: "Cannot Delete Admin",
          description: "This is the primary administrator account and cannot be deleted.",
          variant: "destructive",
        });
        setIsDeleteDialogOpen(false);
        setUserToDelete(null);
        return;
      }

      // deleteUser is optimistic.
      const result = deleteUser(userToDelete.id);
      if (result.success) {
        toast({
          title: "User Deletion Initiated",
          description: `Attempting to delete user "${userToDelete.username}".`,
        });
      } else {
         toast({
          title: "Failed to Delete User",
          description: result.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };
  
  const handleEditUser = (username: string) => {
     toast({
      title: "Edit User (Mocked)",
      description: `Editing user "${username}" is mocked. Firebase update logic would be here.`,
    });
  }

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div >
              <CardTitle className="text-2xl font-semibold">User Management</CardTitle>
              <CardDescription>Manage editor and admin accounts stored in Firebase.</CardDescription>
            </div>
            <Button onClick={handleOpenAddUserDialog} disabled={isUsersLoading || isSubmittingForm}>
              <UserPlus className="mr-2 h-4 w-4" /> Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isUsersLoading ? (
            <TableSkeleton 
              columnCount={3} 
              rowCount={3} 
              showTableHeader={true} 
              headerTexts={["User", "Role", "Actions"]} 
              cellWidths={["w-2/5", "w-2/5", "w-1/5 text-right"]} 
            />
          ) : users.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed rounded-lg bg-card">
                <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-xl font-medium">No Users Found</h3>
                <p className="mt-1 text-sm text-muted-foreground">No users currently in the system. Add one to get started.</p>
                <Button className="mt-6" onClick={handleOpenAddUserDialog} disabled={isSubmittingForm}>
                    <UserPlus className="mr-2 h-4 w-4" /> Add User
                </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
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
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role === 'admin' && <Shield className="mr-1 h-3 w-3" />}
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
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
                          <DropdownMenuItem onClick={() => handleEditUser(user.username)} disabled={isSubmittingForm}>
                            <Edit2 className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(user)} 
                            className="text-destructive focus:text-destructive focus:bg-destructive/10 data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
                            disabled={(user.username === 'admin' && users.filter(u => u.role === 'admin').length <= 1) || isSubmittingForm}
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

      <Dialog open={isAddUserDialogOpen} onOpenChange={(open) => { setIsAddUserDialogOpen(open); if (!open) { setNewUserName(''); setNewUserRole('editor');} }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-username" className="text-right col-span-1">
                Username
              </Label>
              <Input
                id="new-username"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="col-span-3"
                placeholder="Enter username"
                disabled={isSubmittingForm}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-user-role" className="text-right col-span-1">
                Role
              </Label>
              <Select value={newUserRole} onValueChange={(value: 'editor' | 'admin') => setNewUserRole(value)} disabled={isSubmittingForm}>
                <SelectTrigger className="col-span-3">
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
              This action cannot be undone. This will permanently delete the user account 
              for "{userToDelete?.username}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteUser}
              className={buttonVariants({ variant: "destructive" })}
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
