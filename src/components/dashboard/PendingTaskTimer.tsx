
"use client";

import React, { useState, useEffect } from 'react';
import { parseISO, differenceInSeconds } from 'date-fns';
import { Clock, PauseCircle } from 'lucide-react';
import type { TimeRecord } from '@/lib/types';

interface PendingTaskTimerProps {
  record: Pick<TimeRecord, 'entryCreatedAt' | 'date' | 'isPaused' | 'pausedAt' | 'accumulatedPausedDurationSeconds'>;
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
  parts.push(`${seconds}s`);
  
  return parts.join(' ');
};

export const PendingTaskTimer: React.FC<PendingTaskTimerProps> = ({ record }) => {
  const [elapsedTime, setElapsedTime] = useState<string>('0s');

  useEffect(() => {
    const creationDate = parseISO(record.entryCreatedAt || record.date); // Fallback for older records
    
    const calculateElapsedTime = () => {
      const now = new Date();
      let activeSecondsBase;

      if (record.isPaused && record.pausedAt) {
        const pauseDate = parseISO(record.pausedAt);
        activeSecondsBase = differenceInSeconds(pauseDate, creationDate);
      } else {
        activeSecondsBase = differenceInSeconds(now, creationDate);
      }
      
      const totalEffectiveActiveSeconds = Math.max(0, activeSecondsBase - (record.accumulatedPausedDurationSeconds || 0));
      setElapsedTime(formatDurationFromTotalSecondsForTimer(totalEffectiveActiveSeconds));
    };

    calculateElapsedTime(); // Initial calculation
    let intervalId: NodeJS.Timeout | undefined = undefined;

    if (!record.isPaused) {
      intervalId = setInterval(calculateElapsedTime, 1000); // Update every second if not paused
    }

    return () => {
      if (intervalId) clearInterval(intervalId); 
    };
  }, [record]); // Rerun effect if the record object (and its pause state props) changes

  if (record.isPaused) {
    return (
      <span className="flex items-center text-gray-500 dark:text-gray-400">
        <PauseCircle className="mr-1.5 h-3.5 w-3.5" />
        Paused ({elapsedTime})
      </span>
    );
  }

  return (
    <span className="flex items-center text-orange-500">
      <Clock className="mr-1.5 h-3.5 w-3.5" />
      Pending ({elapsedTime})
    </span>
  );
};
