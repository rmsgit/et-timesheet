"use client";

import React from 'react';
import { useTaskStatuses } from '@/hooks/useTaskStatuses';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TaskStatusBadgeProps {
  statusId: string;
  className?: string;
}

export const TaskStatusBadge: React.FC<TaskStatusBadgeProps> = ({
  statusId,
  className,
}) => {
  const { taskStatuses } = useTaskStatuses();
  const status = taskStatuses.find((s) => s.id === statusId);

  if (!status) {
    return <Badge variant="secondary" className={className}>Unknown</Badge>;
  }

  return (
    <Badge
      variant="outline"
      className={cn('border-transparent text-white', className)}
      style={{ backgroundColor: status.color }}
    >
      {status.name}
    </Badge>
  );
};
