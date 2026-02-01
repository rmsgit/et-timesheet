
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
import { LayoutDashboard, ListChecks, Users, BarChart3, FileText, Settings, FolderKanban, UsersRound, UserCheck, Layers, Award, Library, Star, ClipboardCheck, TrendingUp, CalendarCheck, Plane, CalendarDays, Gift, PartyPopper, Wallet, FileSpreadsheet, History } from 'lucide-react';

export function SidebarNav() {
  const pathname = usePathname();
  const { isAdmin, isEditor, isSuperAdmin } = useAuth();

  const personalRoutes = [
    { href: '/dashboard', label: 'My Timesheet', icon: ListChecks },
    { href: '/dashboard/my-report', label: 'My Report', icon: FileText },
    { href: '/dashboard/my-progress', label: 'My Progress', icon: TrendingUp },
    { href: '/dashboard/my-attendance', label: 'My Attendance', icon: CalendarDays },
    { href: '/dashboard/browse-levels', label: 'Browse Editor Levels', icon: Library },
    { href: '/dashboard/my-leave', label: 'My Leave', icon: Plane },
  ];

  const adminRoutesByCategory = {
    "Reports": [
      { href: '/dashboard/admin/report', label: 'Overall Report', icon: BarChart3 },
      { href: '/dashboard/admin/editor-report', label: 'Editor Report', icon: UserCheck },
      { href: '/dashboard/admin/project-overview', label: 'Project Overview', icon: Layers },
    ],
    "Management": [
      { href: '/dashboard/admin/users', label: 'User Profiles', icon: UsersRound },
      { href: '/dashboard/admin/leave-management', label: 'Leave Requests', icon: Plane },
      { href: '/dashboard/admin/attendance', label: 'Attendance Sheets', icon: CalendarCheck },
      { href: '/dashboard/admin/compensatory-leave', label: 'Compensatory Leave', icon: Gift },
      { href: '/dashboard/admin/holidays', label: 'Holidays', icon: PartyPopper },
      { href: '/dashboard/admin/performance-reviews', label: 'Performance Reviews', icon: ClipboardCheck },
    ],
    "Payroll": [
      { href: '/dashboard/admin/salary-configuration', label: 'Salary Config', icon: Wallet },
      { href: '/dashboard/admin/salary-report', label: 'Salary Report', icon: FileSpreadsheet },
      { href: '/dashboard/admin/payslip-history', label: 'Payslip History', icon: History },
    ],
    "Configuration": [
      { href: '/dashboard/admin/project-types', label: 'Project Types', icon: FolderKanban },
      { href: '/dashboard/admin/editor-levels', label: 'Editor Levels', icon: Award },
      { href: '/dashboard/admin/rating-categories', label: 'Rating Categories', icon: Star },
    ]
  };
  
  const commonRoutes = [
     // { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];


  const isActive = (href: string) => pathname === href;
  
  return (
    <SidebarMenu>
      {isEditor && ( 
        <SidebarGroup>
          <SidebarGroupLabel>Editor Tools</SidebarGroupLabel>
          {personalRoutes.map((route) => (
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

      {isAdmin && (
        <>
          {Object.entries(adminRoutesByCategory).map(([category, routes]) => {
            if (category === "Payroll" && !isSuperAdmin) {
              return null;
            }
            return (
              <SidebarGroup key={category}>
                <SidebarGroupLabel>{category}</SidebarGroupLabel>
                {routes.map((route) => (
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
            );
          })}
        </>
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
