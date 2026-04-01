"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLeave } from '@/hooks/useLeave';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuBadge,
} from '@/components/ui/sidebar';
import { LayoutDashboard, ListChecks, Users, BarChart3, FileText, Settings, FolderKanban, UsersRound, UserCheck, Layers, Award, Library, Star, ClipboardCheck, TrendingUp, CalendarCheck, Plane, CalendarDays, Gift, PartyPopper, Wallet, FileSpreadsheet, History } from 'lucide-react';

export function SidebarNav() {
  const pathname = usePathname();
  const { isAdmin, isEditor, isSuperAdmin } = useAuth();
  const { leaveRequests, isLoading: isLoadingLeave } = useLeave();

  const pendingLeaveCount = useMemo(() => {
    if (isLoadingLeave) return 0;
    return leaveRequests.filter(req => req.status === 'pending').length;
  }, [leaveRequests, isLoadingLeave]);

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
      { href: '/dashboard/admin/leave-report', label: 'Leave Report', icon: FileSpreadsheet },
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
  
  const commonRoutes: { href: string; label: string; icon: React.ComponentType }[] = [
     // { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  const adminCategoryOrder = ["Reports", "Management", "Payroll", "Attendance Management", "Configuration"];

  const isActive = (href: string) => pathname === href;

  // Editor-only view
  if (isEditor && !isAdmin) {
    return (
      <SidebarMenu>
        <SidebarGroup>
          <SidebarGroupLabel>Attendance Management</SidebarGroupLabel>
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
      </SidebarMenu>
    );
  }

  // Admin view (covers super admin as well)
  if (isAdmin) {
    const adminPersonalRoutes = personalRoutes.filter(route => route.href === '/dashboard/my-attendance' || route.href === '/dashboard/my-leave');
    
    return (
      <SidebarMenu>
        {adminCategoryOrder.map(category => {
          if (category === "Payroll" && !isSuperAdmin) {
            return null;
          }

          if (category === "Attendance Management") {
            if (adminPersonalRoutes.length > 0) {
              return (
                <SidebarGroup key={category}>
                  <SidebarGroupLabel>{category}</SidebarGroupLabel>
                  {adminPersonalRoutes.map((route) => (
                    <SidebarMenuItem key={route.href}>
                      <Link href={route.href} passHref legacyBehavior>
                        <SidebarMenuButton asChild variant="default" size="default" isActive={isActive(route.href)} tooltip={{ children: route.label, side: "right", align: "center" }}>
                          <a><route.icon /><span>{route.label}</span></a>
                        </SidebarMenuButton>
                      </Link>
                    </SidebarMenuItem>
                  ))}
                </SidebarGroup>
              );
            }
            return null;
          }

          const routes = adminRoutesByCategory[category as keyof typeof adminRoutesByCategory];
          return (
            <SidebarGroup key={category}>
              <SidebarGroupLabel>{category}</SidebarGroupLabel>
              {routes.map((route) => {
                const isLeaveManagement = route.href === '/dashboard/admin/leave-management';
                const showBadge = isLeaveManagement && pendingLeaveCount > 0;
                return (
                  <SidebarMenuItem key={route.href}>
                    <Link href={route.href} passHref legacyBehavior>
                      <SidebarMenuButton asChild variant="default" size="default" isActive={isActive(route.href)} tooltip={{ children: route.label, side: "right", align: "center" }}>
                        <a>
                          <route.icon />
                          <span>{route.label}</span>
                          {showBadge && <SidebarMenuBadge>{pendingLeaveCount}</SidebarMenuBadge>}
                        </a>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                );
              })}
            </SidebarGroup>
          );
        })}
      </SidebarMenu>
    );
  }
  
  // Fallback for users with no specific role or for common routes if any are added later
  return (
    <SidebarMenu>
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
