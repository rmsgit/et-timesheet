
import { RatingCategoriesManagementTable } from '@/components/admin/RatingCategoriesManagementTable';
import { Star } from 'lucide-react';

export default function RatingCategoriesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center">
        <Star className="mr-3 h-8 w-8 text-primary" /> Editor Rating Category Management
      </h1>
      <RatingCategoriesManagementTable />
    </div>
  );
}
