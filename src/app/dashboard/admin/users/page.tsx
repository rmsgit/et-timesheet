
"use client";

import React, { useMemo } from 'react';
import { UserManagementTable } from '@/components/admin/UserManagementTable';
import { UsersRound, Users, UserCheck, ListFilter } from 'lucide-react';
import { useMockUsers } from '@/hooks/useMockUsers';
import { useTimesheet } from '@/hooks/useTimesheet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CardSkeleton } from '@/components/skeletons/CardSkeleton';

export default function UserManagementPage() {
  const { users, isUsersLoading } = useMockUsers();
  const { timeRecords, isTimesheetLoading } = useTimesheet();

  const isLoading = isUsersLoading || isTimesheetLoading;

  const totalUsersCount = useMemo(() => {
    if (isUsersLoading || !users) return 0;
    return users.length;
  }, [users, isUsersLoading]);

  const registeredEditorsCount = useMemo(() => {
    if (isUsersLoading || !users) return 0;
    return users.filter(u => u.role === 'editor').length;
  }, [users, isUsersLoading]);

  const editorUserIds = useMemo(() => {
    if (isUsersLoading || !users) return new Set<string>();
    return new Set(users.filter(u => u.role === 'editor').map(u => u.id));
  }, [users, isUsersLoading]);

  const activeEditorsCount = useMemo(() => {
    if (isLoading || !timeRecords || editorUserIds.size === 0) return 0;
    const editorIdsInTimeRecords = new Set(timeRecords.map(tr => tr.userId));
    return Array.from(editorUserIds).filter(editorId => editorIdsInTimeRecords.has(editorId)).length;
  }, [timeRecords, isLoading, editorUserIds]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
                <UsersRound className="mr-3 h-8 w-8 text-primary" /> User Profiles & Roles
            </h1>
            <p className="text-muted-foreground mt-1">
                Manage user profiles, roles, and see an overview of user activity.
            </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <CardSkeleton className="shadow-md" />
            <CardSkeleton className="shadow-md" />
            <CardSkeleton className="shadow-md" />
        </div>
      ) : (
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalUsersCount}</div>
                    <p className="text-xs text-muted-foreground">
                      All registered user profiles.
                    </p>
                </CardContent>
            </Card>
            <Card className="shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Registered Editors</CardTitle>
                    <UsersRound className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{registeredEditorsCount}</div>
                    <p className="text-xs text-muted-foreground">
                      Users with the 'editor' role.
                    </p>
                </CardContent>
            </Card>
            <Card className="shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Editors</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{activeEditorsCount}</div>
                    <p className="text-xs text-muted-foreground">
                       Editors with logged time entries.
                    </p>
                </CardContent>
            </Card>
        </div>
      )}
      
      <UserManagementTable />
    </div>
  );
}
