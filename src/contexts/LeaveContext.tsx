"use client";

import React, { createContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, set, push, update as firebaseUpdate, remove } from 'firebase/database';
import { FIREBASE_LEAVE_REQUESTS_PATH } from '@/lib/constants';
import type { LeaveRequest, LeaveType } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { useLoader } from '@/hooks/useLoader';
import { useToast } from '@/hooks/use-toast';

const LEAVE_LOADER_ID = "firebase_leave_requests_loader";

interface LeaveContextType {
  leaveRequests: LeaveRequest[];
  isLoading: boolean;
  applyForLeave: (date: Date | null, leaveType: LeaveType, reason: string, earnedInYear?: number) => Promise<{ success: boolean; id?: string }>;
  adminApplyCompensatoryLeave: (editorId: string, reason: string, earnedInYear: number) => Promise<{ success: boolean; id?: string }>;
  updateLeaveStatus: (leaveId: string, status: 'approved' | 'rejected') => Promise<{ success: boolean }>;
  cancelLeaveRequest: (leaveId: string) => Promise<{ success: boolean }>;
  updateLeaveRequest: (leaveId: string, updates: Partial<LeaveRequest>) => Promise<{ success: boolean }>;
  deleteLeaveRequest: (leaveId: string) => Promise<{ success: boolean }>;
}

export const LeaveContext = createContext<LeaveContextType | undefined>(undefined);

interface LeaveProviderProps {
  children: ReactNode;
}

export const LeaveProvider: React.FC<LeaveProviderProps> = ({ children }) => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const { showLoader, hideLoader } = useLoader();
  const { toast } = useToast();

  useEffect(() => {
    showLoader(LEAVE_LOADER_ID, "Loading leave data...");
    setIsLoading(true);

    if (!database) {
      console.warn("useLeave: Firebase Database is not initialized.");
      setIsLoading(false);
      hideLoader(LEAVE_LOADER_ID);
      return;
    }

    const dbRef = ref(database, FIREBASE_LEAVE_REQUESTS_PATH);
    const unsubscribe = onValue(dbRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const requestsArray = Object.entries(data).map(([id, requestData]) => ({
            id,
            ...(requestData as Omit<LeaveRequest, 'id'>),
          }));
          setLeaveRequests(requestsArray);
        } else {
          setLeaveRequests([]);
        }
      } catch (e) {
        console.error("Error processing leave requests snapshot:", e);
        setLeaveRequests([]);
      } finally {
        setIsLoading(false);
        hideLoader(LEAVE_LOADER_ID);
      }
    }, (error) => {
      console.error("Firebase read error (leaveRequests):", error);
      setIsLoading(false);
      hideLoader(LEAVE_LOADER_ID);
    });

    return () => {
      unsubscribe();
      hideLoader(LEAVE_LOADER_ID);
    };
  }, [showLoader, hideLoader]);

  const applyForLeave = useCallback(async (date: Date | null, leaveType: LeaveType, reason: string, earnedInYear?: number): Promise<{ success: boolean, id?: string }> => {
    if (!user) {
        toast({ title: "Not Authenticated", description: "You must be logged in to apply for leave.", variant: "destructive" });
        return { success: false };
    }
    if (!database) return { success: false };
    
    const newRequestRef = push(ref(database, FIREBASE_LEAVE_REQUESTS_PATH));
    const newId = newRequestRef.key;
    if (!newId) return { success: false };

    const leaveData: Omit<LeaveRequest, 'id' | 'cancelledBy' | 'cancelledAt'> = {
        userId: user.id,
        leaveType,
        date: date ? date.toISOString() : '',
        reason,
        status: 'pending',
        requestedAt: new Date().toISOString(),
    };

    if (leaveType === 'compensatory' && earnedInYear) {
      // Cast to Partial to add optional property
      (leaveData as Partial<LeaveRequest>).earnedInYear = earnedInYear;
    }

    try {
        await set(newRequestRef, leaveData);
        toast({ title: "Success", description: "Your leave request has been submitted." });
        return { success: true, id: newId };
    } catch (error) {
        console.error("Firebase apply for leave error:", error);
        toast({ title: "Error", description: "Failed to submit leave request.", variant: "destructive" });
        return { success: false };
    }
  }, [user, toast]);

  const adminApplyCompensatoryLeave = useCallback(async (editorId: string, reason: string, earnedInYear: number): Promise<{ success: boolean, id?: string }> => {
    if (!user || !(isAdmin || isSuperAdmin)) {
        toast({ title: "Permission Denied", description: "Only admins can perform this action.", variant: "destructive" });
        return { success: false };
    }
    if (!database) return { success: false };
    
    const newRequestRef = push(ref(database, FIREBASE_LEAVE_REQUESTS_PATH));
    const newId = newRequestRef.key;
    if (!newId) return { success: false };

    const leaveData: Omit<LeaveRequest, 'id' | 'cancelledBy' | 'cancelledAt'> = {
        userId: editorId, // Use the passed editorId
        leaveType: 'compensatory',
        date: '', // No date
        reason,
        status: 'pending',
        requestedAt: new Date().toISOString(),
        earnedInYear: earnedInYear,
    };

    try {
        await set(newRequestRef, leaveData);
        toast({ title: "Success", description: "Compensatory leave request has been submitted." });
        return { success: true, id: newId };
    } catch (error) {
        console.error("Firebase admin apply leave error:", error);
        toast({ title: "Error", description: "Failed to submit leave request.", variant: "destructive" });
        return { success: false };
    }
  }, [user, toast, isAdmin, isSuperAdmin]);

  const updateLeaveStatus = useCallback(async (leaveId: string, status: 'approved' | 'rejected'): Promise<{ success: boolean }> => {
    if (!user || !(isAdmin || isSuperAdmin)) {
      toast({ title: "Permission Denied", description: "Only admins can approve or reject leave.", variant: "destructive" });
      return { success: false };
    }
    if (!database) return { success: false };

    const updates = {
      status: status,
      reviewedBy: user.id,
      reviewedAt: new Date().toISOString(),
    };

    try {
      await firebaseUpdate(ref(database, `${FIREBASE_LEAVE_REQUESTS_PATH}/${leaveId}`), updates);
      toast({ title: "Success", description: `Leave request has been ${status}.` });
      return { success: true };
    } catch (error) {
      console.error("Firebase update leave status error:", error);
      toast({ title: "Error", description: "Failed to update leave status.", variant: "destructive" });
      return { success: false };
    }
  }, [user, toast, isAdmin, isSuperAdmin]);

  const cancelLeaveRequest = useCallback(async (leaveId: string): Promise<{ success: boolean }> => {
    if (!user) {
        toast({ title: "Not Authenticated", description: "You must be logged in to cancel a request.", variant: "destructive" });
        return { success: false };
    }
    if (!database) return { success: false };

    const requestToCancel = leaveRequests.find(req => req.id === leaveId);
    if (!requestToCancel) {
        toast({ title: "Not Found", description: "The leave request could not be found.", variant: "destructive" });
        return { success: false };
    }
    if (requestToCancel.userId !== user.id) {
        toast({ title: "Permission Denied", description: "You can only cancel your own leave requests.", variant: "destructive" });
        return { success: false };
    }
     if (requestToCancel.status !== 'pending' && requestToCancel.status !== 'approved') {
        toast({ title: "Action Not Allowed", description: "You can only cancel pending or approved leave requests.", variant: "destructive" });
        return { success: false };
    }

    const updates = {
      status: 'cancelled',
      cancelledBy: user.id,
      cancelledAt: new Date().toISOString(),
    };

    try {
        await firebaseUpdate(ref(database, `${FIREBASE_LEAVE_REQUESTS_PATH}/${leaveId}`), updates);
        toast({ title: "Success", description: "Your leave request has been cancelled." });
        return { success: true };
    } catch (error) {
        console.error("Firebase cancel leave request error:", error);
        toast({ title: "Error", description: "Failed to cancel leave request.", variant: "destructive" });
        return { success: false };
    }
}, [user, toast, leaveRequests]);

  const updateLeaveRequest = useCallback(async (leaveId: string, updates: Partial<LeaveRequest>): Promise<{ success: boolean }> => {
    if (!database) {
      toast({ title: "Error", description: "Database not connected.", variant: "destructive" });
      return { success: false };
    }
    try {
      await firebaseUpdate(ref(database, `${FIREBASE_LEAVE_REQUESTS_PATH}/${leaveId}`), updates);
      toast({ title: "Success", description: "Leave request updated successfully." });
      return { success: true };
    } catch (error) {
      console.error("Firebase update leave request error:", error);
      toast({ title: "Error", description: "Failed to update leave request.", variant: "destructive" });
      return { success: false };
    }
  }, [toast]);
  
  const deleteLeaveRequest = useCallback(async (leaveId: string): Promise<{ success: boolean }> => {
    if (!user || !(isAdmin || isSuperAdmin)) {
      toast({ title: "Permission Denied", description: "Only admins can delete leave requests.", variant: "destructive" });
      return { success: false };
    }
    if (!database) {
      toast({ title: "Error", description: "Database not connected.", variant: "destructive" });
      return { success: false };
    }

    try {
      await remove(ref(database, `${FIREBASE_LEAVE_REQUESTS_PATH}/${leaveId}`));
      toast({ title: "Success", description: "Leave request has been permanently deleted." });
      return { success: true };
    } catch (error) {
      console.error("Firebase delete leave request error:", error);
      toast({ title: "Error", description: "Failed to delete leave request.", variant: "destructive" });
      return { success: false };
    }
  }, [user, toast, isAdmin, isSuperAdmin]);

  return (
    <LeaveContext.Provider value={{ leaveRequests, isLoading, applyForLeave, adminApplyCompensatoryLeave, updateLeaveStatus, cancelLeaveRequest, updateLeaveRequest, deleteLeaveRequest }}>
      {children}
    </LeaveContext.Provider>
  );
};
