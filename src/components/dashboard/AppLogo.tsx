
import Image from 'next/image';
import Link from 'next/link';

export function AppLogo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 group" aria-label="Editors Table Timesheet Home">
      <Image
        src="/et-logo.jpg"
        alt="Editors Table Logo"
        width={28}
        height={28}
        className="rounded-sm object-contain"
        priority
      />
      <span className="text-base font-semibold text-sidebar-foreground group-data-[theme=dark]:text-sidebar-foreground">
        Time Sheet
      </span>
    </Link>
  );
}
