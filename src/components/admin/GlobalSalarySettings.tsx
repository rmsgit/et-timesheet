
"use client";

import React, { useState, useEffect } from 'react';
import { useGlobalSettings } from '@/hooks/useGlobalSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, BadgePercent, Clock, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';

export const GlobalSalarySettings: React.FC = () => {
    const { settings, isLoading, saveSettings } = useGlobalSettings();
    const [otRate, setOtRate] = useState<string>('');
    const [epfRate, setEpfRate] = useState<string>('');
    const [noLeaveBonusOneYearOrMore, setNoLeaveBonusOneYearOrMore] = useState<string>('');
    const [noLeaveBonusLessThanOneYear, setNoLeaveBonusLessThanOneYear] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (settings) {
            setOtRate(String(settings.otRate ?? ''));
            setEpfRate(String(settings.epfRate ?? ''));
            setNoLeaveBonusOneYearOrMore(String(settings.noLeaveBonusOneYearOrMore ?? ''));
            setNoLeaveBonusLessThanOneYear(String(settings.noLeaveBonusLessThanOneYear ?? ''));
        }
    }, [settings]);

    const handleSave = async () => {
        const numOtRate = parseFloat(otRate);
        const numEpfRate = parseFloat(epfRate);
        const numNoLeaveBonusOneYearOrMore = parseFloat(noLeaveBonusOneYearOrMore);
        const numNoLeaveBonusLessThanOneYear = parseFloat(noLeaveBonusLessThanOneYear);

        if (
            isNaN(numOtRate) || numOtRate < 0 ||
            isNaN(numEpfRate) || numEpfRate < 0 ||
            isNaN(numNoLeaveBonusOneYearOrMore) || numNoLeaveBonusOneYearOrMore < 0 ||
            isNaN(numNoLeaveBonusLessThanOneYear) || numNoLeaveBonusLessThanOneYear < 0
        ) {
            toast({
                title: "Invalid Input",
                description: "All rates and bonuses must be valid, non-negative numbers.",
                variant: "destructive",
            });
            return;
        }

        setIsSaving(true);
        await saveSettings({ 
            otRate: numOtRate, 
            epfRate: numEpfRate,
            noLeaveBonusOneYearOrMore: numNoLeaveBonusOneYearOrMore,
            noLeaveBonusLessThanOneYear: numNoLeaveBonusLessThanOneYear
        });
        setIsSaving(false);
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2 bg-muted" />
                    <Skeleton className="h-4 w-3/4 bg-muted" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24 bg-muted" />
                        <Skeleton className="h-10 w-full bg-muted" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24 bg-muted" />
                        <Skeleton className="h-10 w-full bg-muted" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-32 bg-muted" />
                        <Skeleton className="h-10 w-full bg-muted" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-32 bg-muted" />
                        <Skeleton className="h-10 w-full bg-muted" />
                    </div>
                    <div className="flex justify-end">
                        <Skeleton className="h-10 w-24 bg-muted" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Global Payroll Settings</CardTitle>
                <CardDescription>
                    Configure global rates and bonuses that will apply to all salary calculations.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="otRate">Overtime (OT) Rate (per hour)</Label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="otRate"
                                type="number"
                                value={otRate}
                                onChange={(e) => setOtRate(e.target.value)}
                                placeholder="e.g., 150"
                                disabled={isSaving}
                                className="pl-10"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="epfRate">Employee Provident Fund (EPF) Rate (%)</Label>
                        <div className="relative">
                            <BadgePercent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="epfRate"
                                type="number"
                                value={epfRate}
                                onChange={(e) => setEpfRate(e.target.value)}
                                placeholder="e.g., 8 for 8%"
                                disabled={isSaving}
                                className="pl-10"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="noLeaveBonusOneYearOrMore">No-Leave Bonus (≥ 1 Year Service)</Label>
                        <div className="relative">
                            <Award className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="noLeaveBonusOneYearOrMore"
                                type="number"
                                value={noLeaveBonusOneYearOrMore}
                                onChange={(e) => setNoLeaveBonusOneYearOrMore(e.target.value)}
                                placeholder="e.g., 500"
                                disabled={isSaving}
                                className="pl-10"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="noLeaveBonusLessThanOneYear">No-Leave Bonus (&lt; 1 Year Service)</Label>
                        <div className="relative">
                            <Award className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="noLeaveBonusLessThanOneYear"
                                type="number"
                                value={noLeaveBonusLessThanOneYear}
                                onChange={(e) => setNoLeaveBonusLessThanOneYear(e.target.value)}
                                placeholder="e.g., 250"
                                disabled={isSaving}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Global Settings
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
