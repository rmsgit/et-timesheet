
"use client";

import { useContext } from 'react';
import { PaysheetContext } from '@/contexts/PaysheetContext';

export const usePaysheet = () => {
    const context = useContext(PaysheetContext);
    if (!context) {
        throw new Error('usePaysheet must be used within a PaysheetProvider');
    }
    return context;
};
