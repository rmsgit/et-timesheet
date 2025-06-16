
import { EditorLevelsManagementTable } from '@/components/admin/EditorLevelsManagementTable';
import { Award } from 'lucide-react';

export default function EditorLevelsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center">
        <Award className="mr-3 h-8 w-8 text-primary" /> Editor Level Management
      </h1>
      <EditorLevelsManagementTable />
    </div>
  );
}
