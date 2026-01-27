
import { SalaryConfigurationTable } from '@/components/admin/SalaryConfigurationTable';
import { Wallet } from 'lucide-react';

export default function SalaryConfigurationPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center">
        <Wallet className="mr-3 h-8 w-8 text-primary" /> Salary Configuration
      </h1>
      <p className="text-muted-foreground">
        Manage base salary, allowances, and other payroll-related information for all users.
      </p>
      <SalaryConfigurationTable />
    </div>
  );
}
