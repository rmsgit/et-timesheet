
"use client";

import { useState, useEffect, Dispatch, SetStateAction, useCallback } from 'react';

type SetValue<T> = Dispatch<SetStateAction<T>>;

function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>, boolean] {
  const [isLoading, setIsLoading] = useState(true);

  // Initialize state with a function. This function will be executed only on the initial render.
  const [storedValue, setStoredValue] = useState<T>(() => {
    // For SSR, return initialValue as window is not available.
    if (typeof window === 'undefined') {
      return initialValue;
    }
    // On client, try to read from localStorage.
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key “${key}” during initial state:`, error);
      return initialValue;
    }
  });

  // Effect to handle client-side hydration and set isLoading to false.
  // This runs after the component mounts.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const item = window.localStorage.getItem(key);
        if (item) {
          setStoredValue(JSON.parse(item) as T);
        } else {
          // If no item in localStorage, ensure state is initialValue
          // And optionally persist initialValue to localStorage if it wasn't there
          setStoredValue(initialValue);
          // window.localStorage.setItem(key, JSON.stringify(initialValue)); // Uncomment if initialValue should be stored if not present
        }
      } catch (error) {
        console.warn(`Error reading localStorage key “${key}” in useEffect:`, error);
        setStoredValue(initialValue); // Fallback to initialValue on error
      } finally {
        setIsLoading(false); // Finished loading attempt
      }
    } else {
        // For SSR or environments without window, assume not loading or handle as per requirements
        setIsLoading(false);
    }
  }, [key, initialValue]);

  const setValue: SetValue<T> = useCallback(
    (value) => {
      if (typeof window === 'undefined') {
        console.warn(
          `Tried setting localStorage key “${key}” even though environment is not a client`
        );
        // Update state directly if window is not available (e.g., SSR context)
        setStoredValue(prev => value instanceof Function ? value(prev) : value);
        return;
      }

      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.warn(`Error setting localStorage key “${key}”:`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue, isLoading];
}

export default useLocalStorage;
