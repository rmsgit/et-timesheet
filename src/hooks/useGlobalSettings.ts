
"use client";

import { useContext } from 'react';
import { GlobalSettingsContext } from '@/contexts/GlobalSettingsContext';

export const useGlobalSettings = () => {
    const context = useContext(GlobalSettingsContext);
    if (!context) {
        throw new Error('useGlobalSettings must be used within a GlobalSettingsProvider');
    }
    return context;
};
