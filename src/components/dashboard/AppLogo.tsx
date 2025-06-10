
import Image from 'next/image';
import Link from 'next/link';

export function AppLogo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 group" aria-label="Editors Table Timesheet Home">
      <Image
        src="https://editorstable.com/wp-content/uploads/2025/01/et-logo.jpg"
        alt="Company Logo"
        width={28}
        height={28}
        className="rounded-sm object-contain"
        data-ai-hint="company logo"
      />
      <span className="text-base font-semibold text-sidebar-foreground group-data-[theme=dark]:text-sidebar-foreground">
        Time Sheet
      </span>
    </Link>
  );
}
