
"use client";

import { useContext } from 'react';
import { HolidayContext } from '@/contexts/HolidayContext';

export const useHolidays = () => {
    const context = useContext(HolidayContext);
    if (!context) {
        throw new Error('useHolidays must be used within a HolidayProvider');
    }
    return context;
};
