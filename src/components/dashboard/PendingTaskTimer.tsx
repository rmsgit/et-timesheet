
"use client";

import React, { useState, useEffect } from 'react';
import { parseISO, differenceInSeconds } from 'date-fns';
import { Clock } from 'lucide-react';

interface PendingTaskTimerProps {
  recordCreationDateISO: string;
}

const formatDurationFromTotalSecondsForTimer = (totalSeconds: number): string => {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '0s';
  if (totalSeconds === 0) return '0s';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  // Always show seconds for a live timer
  parts.push(`${seconds}s`);
  
  return parts.join(' ');
};

export const PendingTaskTimer: React.FC<PendingTaskTimerProps> = ({ recordCreationDateISO }) => {
  const [elapsedTime, setElapsedTime] = useState<string>('0s');

  useEffect(() => {
    const creationDate = parseISO(recordCreationDateISO);
    
    const calculateElapsedTime = () => {
      const now = new Date();
      const seconds = differenceInSeconds(now, creationDate);
      setElapsedTime(formatDurationFromTotalSecondsForTimer(Math.max(0, seconds)));
    };

    calculateElapsedTime(); // Initial calculation
    const intervalId = setInterval(calculateElapsedTime, 1000); // Update every second

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [recordCreationDateISO]);

  return (
    <span className="flex items-center text-orange-500">
      <Clock className="mr-1.5 h-3.5 w-3.5" />
      Pending ({elapsedTime})
    </span>
  );
};
