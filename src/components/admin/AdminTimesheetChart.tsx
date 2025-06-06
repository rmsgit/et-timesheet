
"use client";

import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TimeRecord } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMockUsers } from '@/hooks/useMockUsers'; // To get editor names
import { useProjectTypes } from '@/hooks/useProjectTypes'; // To get dynamic project types
import { Loader2 } from 'lucide-react';

interface AdminTimesheetChartProps {
  records: TimeRecord[];
}

// Define a type for chart data items
type ChartDataItem = {
  name: string; // Project Type or Editor Name
  count: number; // Changed from hours to count
  [key: string]: string | number; // For dynamic keys if needed
};


export const AdminTimesheetChart: React.FC<AdminTimesheetChartProps> = ({ records }) => {
  const { users, isUsersLoading } = useMockUsers(); 
  const { projectTypes, isLoadingProjectTypes } = useProjectTypes();

  const isLoading = isUsersLoading || isLoadingProjectTypes;

  const dataByProjectType = useMemo(() => {
    if (isLoading || !projectTypes || records.length === 0) return [];
    
    const projectCountsByType: { [key: string]: Set<string> } = {};
    projectTypes.forEach(type => projectCountsByType[type] = new Set());

    records.forEach(record => {
      if (projectCountsByType[record.projectType]) {
        projectCountsByType[record.projectType].add(record.projectName);
      } else {
        // Handle case where a record's projectType might not be in the dynamic list (should be rare)
        projectCountsByType[record.projectType] = new Set([record.projectName]);
      }
    });
    
    return Object.entries(projectCountsByType)
      .map(([type, projectSet]) => ({
        name: type,
        count: projectSet.size,
      }))
      .filter(item => item.count > 0); 
  }, [records, projectTypes, isLoading]);

  const dataByEditor = useMemo(() => {
    if (isLoading || !users || records.length === 0) return [];
    
    const projectCountsByEditor: { [userId: string]: Set<string> } = {};
    const editorUsers = users.filter(u => u.role === 'editor');
    
    editorUsers.forEach(editor => projectCountsByEditor[editor.id] = new Set());

    records.forEach(record => {
      if (projectCountsByEditor[record.userId]) { // Ensure editor is in our list and initialized
        projectCountsByEditor[record.userId].add(record.projectName);
      }
    });
    
    return editorUsers.map(editor => ({
      name: editor.username,
      count: projectCountsByEditor[editor.id]?.size || 0,
    })); // Do not filter here, show all editors, even with 0 projects in range
  }, [records, users, isLoading]);

  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Project Distribution Charts</CardTitle>
          <CardDescription>Loading chart data...</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  if (records.length === 0) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Project Distribution Charts</CardTitle>
          <CardDescription>No data available for the selected period to display charts.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">Awaiting data...</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Projects by Type</CardTitle>
          <CardDescription>Total unique projects for each project type.</CardDescription>
        </CardHeader>
        <CardContent>
          {dataByProjectType.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dataByProjectType} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={(value) => `${value}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => [`${value} projects`, "Count"]}
                />
                <Legend wrapperStyle={{fontSize: "12px"}} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Project Count" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
             <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">No project type data for this period.</p>
             </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Projects by Editor</CardTitle>
          <CardDescription>Total unique projects worked on by each editor.</CardDescription>
        </CardHeader>
        <CardContent>
         {dataByEditor.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dataByEditor} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={(value) => `${value}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                   formatter={(value: number) => [`${value} projects`, "Count"]}
                />
                <Legend wrapperStyle={{fontSize: "12px"}}/>
                <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Project Count" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
             <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">No editor data or no editors found for this period.</p>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

