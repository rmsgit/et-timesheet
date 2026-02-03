
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useHolidays } from '@/hooks/useHolidays';
import type { Holiday } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PartyPopper, CalendarIcon, PlusCircle, Trash2, Loader2, Edit2, Checkbox, Briefcase, Star } from 'lucide-react';
import { format, parseISO, getYear } from 'date-fns';
import { cn } from '@/lib/utils';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox as CheckboxUI } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

export default function HolidaysPage() {
    const { holidays, isLoading, addHoliday, updateHoliday, deleteHoliday } = useHolidays();
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

    const [holidayDate, setHolidayDate] = useState<Date | undefined>();
    const [holidayName, setHolidayName] = useState('');
    const [isWorkingDay, setIsWorkingDay] = useState(false);

    const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [selectedYear, setSelectedYear] = useState<string>('2025');

    const availableYears = useMemo(() => {
        const years = [];
        for (let i = 2030; i >= 2025; i--) {
            years.push(i);
        }
        return years.sort((a, b) => b - a);
    }, []);
    
    const filteredHolidays = useMemo(() => {
        return holidays.filter(h => getYear(parseISO(h.date)).toString() === selectedYear);
    }, [holidays, selectedYear]);

    const handleOpenForm = (holiday: Holiday | null) => {
        setEditingHoliday(holiday);
        if (holiday) {
            setHolidayDate(parseISO(holiday.date));
            setHolidayName(holiday.name);
            setIsWorkingDay(holiday.isWorkingDay || false);
        } else {
            setHolidayDate(new Date(parseInt(selectedYear), new Date().getMonth(), new Date().getDate()));
            setHolidayName('');
            setIsWorkingDay(false);
        }
        setIsFormOpen(true);
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!holidayDate || !holidayName.trim()) return;

        setIsSubmitting(true);
        if (editingHoliday) {
            await updateHoliday(editingHoliday.id, {
                date: holidayDate.toISOString(),
                name: holidayName,
                isWorkingDay: isWorkingDay,
            });
        } else {
            await addHoliday(holidayDate, holidayName, isWorkingDay);
        }
        setIsSubmitting(false);
        setIsFormOpen(false);
    };

    const handleDelete = async () => {
        if (!holidayToDelete) return;
        setIsSubmitting(true);
        await deleteHoliday(holidayToDelete.id);
        setIsSubmitting(false);
        setHolidayToDelete(null);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
                <PartyPopper className="mr-3 h-8 w-8 text-primary" /> Holiday Management
            </h1>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Holiday List for {selectedYear}</CardTitle>
                            <CardDescription>Add, edit, or remove company-wide holidays and designated working days.</CardDescription>
                        </div>
                         <Button onClick={() => handleOpenForm(null)} disabled={isSubmitting || isLoading}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Holiday
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 max-w-xs">
                        <Label htmlFor="year-select">Filter by Year</Label>
                         <Select value={selectedYear} onValueChange={setSelectedYear} disabled={isLoading}>
                            <SelectTrigger id="year-select">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {availableYears.map(year => (
                                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {isLoading ? (
                        <TableSkeleton columnCount={4} />
                    ) : filteredHolidays.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredHolidays.map(holiday => (
                                    <TableRow key={holiday.id}>
                                        <TableCell>{format(parseISO(holiday.date), 'PPP')}</TableCell>
                                        <TableCell className="font-medium">{holiday.name}</TableCell>
                                        <TableCell>
                                            {holiday.isWorkingDay ? (
                                                <Badge variant="secondary" className="border-green-500 text-green-700">
                                                    <Briefcase className="mr-1 h-3 w-3"/> Working Day
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline">
                                                    <Star className="mr-1 h-3 w-3 text-yellow-500" /> Holiday
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                             <Button variant="ghost" size="sm" onClick={() => handleOpenForm(holiday)} className="mr-2" disabled={isSubmitting}>
                                                <Edit2 className="mr-1 h-3 w-3" /> Edit
                                            </Button>
                                            <Button variant="destructive" size="sm" onClick={() => setHolidayToDelete(holiday)} disabled={isSubmitting}>
                                                <Trash2 className="mr-1 h-4 w-4" /> Delete
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            No holidays have been added for {selectedYear} yet.
                        </div>
                    )}
                </CardContent>
            </Card>
            
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                 <DialogContent>
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>{editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="holiday-date">Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                        variant={"outline"}
                                        className={cn("w-full justify-start text-left font-normal", !holidayDate && "text-muted-foreground")}
                                        disabled={isSubmitting}
                                        >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {holidayDate ? format(holidayDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                        mode="single"
                                        selected={holidayDate}
                                        onSelect={setHolidayDate}
                                        initialFocus
                                        disabled={isSubmitting}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="holiday-name">Holiday Name</Label>
                                <Input
                                    id="holiday-name"
                                    value={holidayName}
                                    onChange={(e) => setHolidayName(e.target.value)}
                                    placeholder="e.g., New Year's Day"
                                    disabled={isSubmitting}
                                />
                            </div>
                             <div className="flex items-center space-x-2">
                                <CheckboxUI
                                    id="is-working-day"
                                    checked={isWorkingDay}
                                    onCheckedChange={(checked) => setIsWorkingDay(checked as boolean)}
                                    disabled={isSubmitting}
                                />
                                <Label htmlFor="is-working-day" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Mark as a special working day
                                </Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSubmitting || !holidayDate || !holidayName.trim()}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                {editingHoliday ? 'Save Changes' : 'Add Holiday'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!holidayToDelete} onOpenChange={(open) => !open && setHolidayToDelete(null)}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the holiday: <span className="font-semibold">{holidayToDelete?.name}</span>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isSubmitting} className={cn(buttonVariants({variant: "destructive"}))}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
                    </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
