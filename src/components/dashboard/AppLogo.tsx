
import { Edit3Icon } from 'lucide-react';
import Link from 'next/link';

export function AppLogo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2" aria-label="Editors Table Timesheet Home">
      <Edit3Icon className="h-7 w-7 text-primary group-data-[theme=dark]:text-primary-foreground" />
      <span className="text-xl font-semibold text-primary group-data-[theme=dark]:text-primary-foreground">
        Timesheet
      </span>
    </Link>
  );
}
