
import { UserManagementTable } from '@/components/admin/UserManagementTable';
import { UsersRound } from 'lucide-react';

export default function UserManagementPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center">
        <UsersRound className="mr-3 h-8 w-8 text-primary" /> User Profiles & Roles
      </h1>
      <p className="text-muted-foreground">
        Manage user profiles and roles. Only administrators can perform actions here.
      </p>
      <UserManagementTable />
    </div>
  );
}
