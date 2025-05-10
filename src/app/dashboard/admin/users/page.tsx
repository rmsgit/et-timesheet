
import { UserManagementTable } from '@/components/admin/UserManagementTable';
import { Users } from 'lucide-react';

export default function UserManagementPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center">
        <Users className="mr-3 h-8 w-8 text-primary" /> User Accounts
      </h1>
      <UserManagementTable />
    </div>
  );
}
