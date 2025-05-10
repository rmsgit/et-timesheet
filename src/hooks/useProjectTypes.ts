
"use client";

import { useCallback } from 'react';
import useLocalStorage from './useLocalStorage';
import { PROJECT_TYPES as INITIAL_PROJECT_TYPES, LOCAL_STORAGE_PROJECT_TYPES_KEY } from '@/lib/constants';
import type { TimeRecord } from '@/lib/types';

export const useProjectTypes = () => {
  const [projectTypes, setProjectTypes, isLoadingProjectTypes] = useLocalStorage<string[]>(
    LOCAL_STORAGE_PROJECT_TYPES_KEY,
    INITIAL_PROJECT_TYPES
  );

  const addProjectType = useCallback((newType: string): { success: boolean; message?: string } => {
    if (newType.trim() === "") {
      return { success: false, message: "Project type cannot be empty." };
    }
    if (projectTypes.map(pt => pt.toLowerCase()).includes(newType.toLowerCase())) {
      return { success: false, message: "Project type already exists." };
    }
    setProjectTypes(prev => [...prev, newType.trim()]);
    return { success: true };
  }, [projectTypes, setProjectTypes]);

  const updateProjectType = useCallback((oldType: string, newType: string): { success: boolean; message?: string } => {
    if (newType.trim() === "") {
      return { success: false, message: "Project type cannot be empty." };
    }
    // Check if the new type name (if changed) conflicts with existing types, excluding the oldType itself.
    const lowerNewType = newType.toLowerCase();
    const lowerOldType = oldType.toLowerCase();
    if (lowerOldType !== lowerNewType && projectTypes.some(pt => pt.toLowerCase() === lowerNewType)) {
      return { success: false, message: "New project type name already exists." };
    }
    setProjectTypes(prev => prev.map(pt => (pt.toLowerCase() === lowerOldType ? newType.trim() : pt)));
    return { success: true };
  }, [projectTypes, setProjectTypes]);

  const deleteProjectType = useCallback((typeToDelete: string): { success: boolean; message?: string } => {
    // The check for isProjectTypeInUse will be done in the component.
    setProjectTypes(prev => prev.filter(pt => pt.toLowerCase() !== typeToDelete.toLowerCase()));
    return { success: true };
  }, [setProjectTypes]);

  const isProjectTypeInUse = useCallback((projectType: string, allTimeRecords: TimeRecord[]): boolean => {
    return allTimeRecords.some(record => record.projectType.toLowerCase() === projectType.toLowerCase());
  }, []);

  return { projectTypes, addProjectType, updateProjectType, deleteProjectType, isLoadingProjectTypes, isProjectTypeInUse };
};
