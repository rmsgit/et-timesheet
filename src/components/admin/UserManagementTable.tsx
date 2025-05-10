
"use client";

import React from 'react';
import { useMockUsers } from '@/hooks/useMockUsers';
import { Button } from '@/components/ui/button';
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
import { MoreHorizontal, UserPlus, Trash2, Edit2, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';

export const UserManagementTable: React.FC = () => {
  const { users, addUser, deleteUser, isUsersLoading } = useMockUsers();
  const { toast } = useToast();

  const handleAddUser = () => {
    toast({
      title: "Add User (Mocked)",
      description: "User creation functionality is mocked for this demo.",
    });
  };

  const handleDeleteUser = (userId: string, username: string) => {
    toast({
      title: "Delete User (Mocked)",
      description: `User "${username}" deletion is mocked for this demo.`,
      variant: "destructive"
    });
  };
  
  const handleEditUser = (username: string) => {
     toast({
      title: "Edit User (Mocked)",
      description: `Editing user "${username}" is mocked for this demo.`,
    });
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div >
            <CardTitle className="text-2xl font-semibold">User Management</CardTitle>
            <CardDescription>Manage editor and admin accounts.</CardDescription>
          </div>
          <Button onClick={handleAddUser} disabled={isUsersLoading}>
            <UserPlus className="mr-2 h-4 w-4" /> Add User
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isUsersLoading ? (
          <TableSkeleton columnCount={3} rowCount={MOCK_USERS_DATA.length} showTableHeader={true} 
            headerTexts={["User", "Role", "Actions"]} 
            cellWidths={["w-2/5", "w-2/5", "w-1/5 text-right"]} 
          />
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
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditUser(user.username)}>
                          <Edit2 className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteUser(user.id, user.username)} 
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
  );
};
