
"use client";

import React, { useState } from 'react';
import { useHolidays } from '@/hooks/useHolidays';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { PartyPopper, CalendarIcon, PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';

export default function HolidaysPage() {
    const { holidays, isLoading, addHoliday, deleteHoliday } = useHolidays();
    const [newHolidayDate, setNewHolidayDate] = useState<Date | undefined>(new Date());
    const [newHolidayName, setNewHolidayName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [holidayToDelete, setHolidayToDelete] = useState<{id: string, name: string} | null>(null);

    const handleAddHoliday = async () => {
        if (!newHolidayDate || !newHolidayName.trim()) {
            return; // Basic validation, context handles toast
        }
        setIsSubmitting(true);
        const result = await addHoliday(newHolidayDate, newHolidayName);
        if (result.success) {
            setNewHolidayName('');
            setNewHolidayDate(new Date());
        }
        setIsSubmitting(false);
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
                    <CardTitle>Add New Holiday</CardTitle>
                    <CardDescription>Add company-wide holidays to the system.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="grid w-full sm:w-auto sm:flex-1 gap-1.5">
                            <Label htmlFor="holiday-date">Date</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant={"outline"}
                                    className={cn("w-full justify-start text-left font-normal", !newHolidayDate && "text-muted-foreground")}
                                    disabled={isSubmitting}
                                    >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {newHolidayDate ? format(newHolidayDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                    mode="single"
                                    selected={newHolidayDate}
                                    onSelect={setNewHolidayDate}
                                    initialFocus
                                    disabled={isSubmitting}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid w-full sm:w-auto sm:flex-1 gap-1.5">
                            <Label htmlFor="holiday-name">Holiday Name</Label>
                            <Input
                                id="holiday-name"
                                value={newHolidayName}
                                onChange={(e) => setNewHolidayName(e.target.value)}
                                placeholder="e.g., New Year's Day"
                                disabled={isSubmitting}
                            />
                        </div>
                        <Button onClick={handleAddHoliday} disabled={isSubmitting || !newHolidayDate || !newHolidayName.trim()}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                            Add Holiday
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Upcoming Holidays</CardTitle>
                    <CardDescription>List of all defined holidays.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <TableSkeleton columnCount={3} />
                    ) : holidays.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {holidays.map(holiday => (
                                    <TableRow key={holiday.id}>
                                        <TableCell>{format(parseISO(holiday.date), 'PPP')}</TableCell>
                                        <TableCell className="font-medium">{holiday.name}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="destructive" size="sm" onClick={() => setHolidayToDelete({id: holiday.id, name: holiday.name})} disabled={isSubmitting}>
                                                <Trash2 className="mr-1 h-4 w-4" /> Delete
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            No holidays have been added yet.
                        </div>
                    )}
                </CardContent>
            </Card>

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
                    <AlertDialogAction onClick={handleDelete} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
