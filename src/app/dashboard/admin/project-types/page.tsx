
import { ProjectTypesManagementTable } from '@/components/admin/ProjectTypesManagementTable';
import { FolderKanban } from 'lucide-react';

export default function ProjectTypesPage() {
  return (
    <div className="space-y-6">
      <h1 className="flex items-center text-2xl font-bold tracking-tight sm:text-3xl">
        <FolderKanban className="mr-2 h-6 w-6 shrink-0 text-primary sm:mr-3 sm:h-8 sm:w-8" /> Project Type Management
      </h1>
      <ProjectTypesManagementTable />
    </div>
  );
}
