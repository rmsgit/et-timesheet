"use client";

import React, { useEffect, useState } from 'react';
import { Cake } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getBirthdayGreetingStorageKey, isBirthdayToday } from '@/lib/birthdayUtils';

export const BirthdayGreetingDialog: React.FC = () => {
  const { user, isAuthLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isAuthLoading || !user?.dateOfBirth || !isBirthdayToday(user.dateOfBirth)) {
      return;
    }

    const storageKey = getBirthdayGreetingStorageKey(user.id);
    if (typeof window !== 'undefined' && sessionStorage.getItem(storageKey)) {
      return;
    }

    const greeting =
      user.dateOfBirthMessage?.trim() ||
      `Happy Birthday, ${user.fullName || user.username}!`;

    setMessage(greeting);
    setIsOpen(true);
    sessionStorage.setItem(storageKey, 'true');
  }, [user, isAuthLoading]);

  const handleClose = () => setIsOpen(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5 text-primary" />
            Happy Birthday!
          </DialogTitle>
          <DialogDescription>
            Wishing you a wonderful day from the Editors Table team.
          </DialogDescription>
        </DialogHeader>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message}</p>
        <DialogFooter>
          <Button onClick={handleClose}>Thank you!</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
