
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel
} from '@/components/ui/sidebar';
import { LayoutDashboard, ListChecks, Users, BarChart3, FileText, Settings, FolderKanban, UsersRound, UserCheck } from 'lucide-react';

export function SidebarNav() {
  const pathname = usePathname();
  const { isAdmin, isEditor } = useAuth();

  const editorRoutes = [
    { href: '/dashboard', label: 'My Timesheet', icon: ListChecks },
    { href: '/dashboard/my-report', label: 'My Report', icon: FileText },
  ];

  const adminRoutes = [
    { href: '/dashboard/admin/users', label: 'User Management', icon: UsersRound },
    { href: '/dashboard/admin/report', label: 'Admin Report', icon: BarChart3 },
    { href: '/dashboard/admin/project-types', label: 'Project Types', icon: FolderKanban },
    { href: '/dashboard/admin/editor-report', label: 'Editor Specific Report', icon: UserCheck },
  ];
  
  const commonRoutes = [
     // { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];


  const isActive = (href: string) => pathname === href;

  return (
    <SidebarMenu>
      {isEditor && (
        <SidebarGroup>
          <SidebarGroupLabel>Editor Tools</SidebarGroupLabel>
          {editorRoutes.map((route) => (
            <SidebarMenuItem key={route.href}>
              <Link href={route.href} passHref legacyBehavior>
                <SidebarMenuButton
                  asChild
                  variant="default"
                  size="default"
                  isActive={isActive(route.href)}
                  tooltip={{ children: route.label, side: "right", align: "center" }}
                >
                  <a>
                    <route.icon />
                    <span>{route.label}</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarGroup>
      )}

      {isAdmin && adminRoutes.length > 0 && (
         <SidebarGroup>
          <SidebarGroupLabel>Admin Tools</SidebarGroupLabel>
          {adminRoutes.map((route) => (
            <SidebarMenuItem key={route.href}>
              <Link href={route.href} passHref legacyBehavior>
                <SidebarMenuButton
                  asChild
                  variant="default"
                  size="default"
                  isActive={isActive(route.href)}
                  tooltip={{ children: route.label, side: "right", align: "center" }}
                >
                  <a>
                    <route.icon />
                    <span>{route.label}</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarGroup>
      )}
      
      {commonRoutes.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel>General</SidebarGroupLabel>
          {commonRoutes.map((route) => (
            <SidebarMenuItem key={route.href}>
              <Link href={route.href} passHref legacyBehavior>
                <SidebarMenuButton
                  asChild
                  variant="default"
                  size="default"
                  isActive={isActive(route.href)}
                  tooltip={{ children: route.label, side: "right", align: "center" }}
                >
                  <a>
                    <route.icon />
                    <span>{route.label}</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarGroup>
      )}
    </SidebarMenu>
  );
}

    