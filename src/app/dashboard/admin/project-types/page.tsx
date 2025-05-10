
import { ProjectTypesManagementTable } from '@/components/admin/ProjectTypesManagementTable';
import { FolderKanban } from 'lucide-react';

export default function ProjectTypesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center">
        <FolderKanban className="mr-3 h-8 w-8 text-primary" /> Project Type Management
      </h1>
      <ProjectTypesManagementTable />
    </div>
  );
}
