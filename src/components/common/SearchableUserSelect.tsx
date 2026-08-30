"use client";

import React, { useMemo, useState } from 'react';
import type { User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function getUserDisplayLabel(user: User): string {
  const name = user.fullName || user.username || user.email || user.id;
  return user.role ? `${name} (${user.role})` : name;
}

export function getUserShortLabel(user: User | undefined): string {
  if (!user) return 'Unknown';
  return user.fullName || user.username || user.email || user.id;
}

interface SearchableUserSelectProps {
  users: User[];
  value: string;
  onValueChange: (userId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  id?: string;
  includeAllOption?: boolean;
  allOptionLabel?: string;
  allOptionValue?: string;
}

export const SearchableUserSelect: React.FC<SearchableUserSelectProps> = ({
  users,
  value,
  onValueChange,
  disabled = false,
  placeholder = 'Select user',
  searchPlaceholder = 'Search users...',
  emptyMessage = 'No users found.',
  className,
  id,
  includeAllOption = false,
  allOptionLabel = 'All Users',
  allOptionValue = 'all',
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedUser = users.find((u) => u.id === value);
  const isAllSelected = includeAllOption && value === allOptionValue;

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((u) => {
      const haystack = [
        u.fullName,
        u.username,
        u.email,
        u.role,
        u.department,
        u.jobDesignation,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [users, search]);

  const handleSelect = (nextValue: string) => {
    onValueChange(nextValue);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch('');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between font-normal', className)}
        >
          <span className="truncate">
            {isAllSelected
              ? allOptionLabel
              : selectedUser
                ? getUserDisplayLabel(selectedUser)
                : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="border-b p-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9"
            autoFocus
          />
        </div>
        <ScrollArea className="max-h-60">
          {filteredUsers.length === 0 && !includeAllOption ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            <ul className="p-1">
              {includeAllOption && (
                <li>
                  <button
                    type="button"
                    onClick={() => handleSelect(allOptionValue)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                      isAllSelected && 'bg-accent'
                    )}
                  >
                    <Check
                      className={cn(
                        'h-4 w-4 shrink-0',
                        isAllSelected ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="truncate">{allOptionLabel}</span>
                  </button>
                </li>
              )}
              {filteredUsers.length === 0 ? (
                <li>
                  <p className="py-4 text-center text-sm text-muted-foreground">{emptyMessage}</p>
                </li>
              ) : (
                filteredUsers.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(u.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                      value === u.id && 'bg-accent'
                    )}
                  >
                    <Check
                      className={cn(
                        'h-4 w-4 shrink-0',
                        value === u.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="truncate">{getUserDisplayLabel(u)}</span>
                  </button>
                </li>
              ))
              )}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
