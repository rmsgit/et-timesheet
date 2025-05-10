
"use client";

import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TimeRecord, User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PROJECT_TYPES } from '@/lib/constants';
import { useMockUsers } from '@/hooks/useMockUsers'; // To get editor names

interface AdminTimesheetChartProps {
  records: TimeRecord[];
}

// Define a type for chart data items
type ChartDataItem = {
  name: string; // Project Type or Editor Name
  hours: number;
  [key: string]: string | number; // For dynamic keys if needed
};


export const AdminTimesheetChart: React.FC<AdminTimesheetChartProps> = ({ records }) => {
  const { users } = useMockUsers(); // Assuming this hook provides all users

  const dataByProjectType = useMemo(() => {
    const aggregated: { [key: string]: number } = {};
    PROJECT_TYPES.forEach(type => aggregated[type] = 0);

    records.forEach(record => {
      if (aggregated[record.projectType] !== undefined) {
        aggregated[record.projectType] += record.durationHours;
      }
    });
    
    return PROJECT_TYPES.map(type => ({
      name: type,
      hours: parseFloat(aggregated[type].toFixed(1)),
    }));
  }, [records]);

  const dataByEditor = useMemo(() => {
    const aggregated: { [userId: string]: number } = {};
    const editorUsers = users.filter(u => u.role === 'editor');
    
    editorUsers.forEach(editor => aggregated[editor.id] = 0);

    records.forEach(record => {
      if (aggregated[record.userId] !== undefined) {
        aggregated[record.userId] += record.durationHours;
      }
    });
    
    return editorUsers.map(editor => ({
      name: editor.username,
      hours: parseFloat((aggregated[editor.id] || 0).toFixed(1)),
    })).filter(item => item.hours > 0); // Only show editors with hours
  }, [records, users]);


  if (records.length === 0) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Time Distribution Charts</CardTitle>
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
          <CardTitle>Hours by Project Type</CardTitle>
          <CardDescription>Total hours logged for each project type.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dataByProjectType} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}h`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend wrapperStyle={{fontSize: "12px"}} />
              <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Hours Logged" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Hours by Editor</CardTitle>
          <CardDescription>Total hours logged by each editor.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dataByEditor} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}h`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend wrapperStyle={{fontSize: "12px"}}/>
              <Bar dataKey="hours" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Hours Logged" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
