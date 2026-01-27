
import { SalaryConfigurationTable } from '@/components/admin/SalaryConfigurationTable';
import { GlobalSalarySettings } from '@/components/admin/GlobalSalarySettings';
import { Wallet } from 'lucide-react';

export default function SalaryConfigurationPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center">
        <Wallet className="mr-3 h-8 w-8 text-primary" /> Salary & Global Configuration
      </h1>
      <p className="text-muted-foreground">
        Manage global payroll settings like OT and EPF rates, and individual user salary details.
      </p>
      
      <GlobalSalarySettings />

      <SalaryConfigurationTable />
    </div>
  );
}
