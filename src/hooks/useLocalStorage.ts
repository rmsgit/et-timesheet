"use client";

import { useState, useEffect, Dispatch, SetStateAction, useCallback } from 'react';

type SetValue<T> = Dispatch<SetStateAction<T>>;

function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>, boolean] {
  const [isLoading, setIsLoading] = useState(true);

  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key “${key}” during initial state:`, error);
      return initialValue;
    }
  });

  // This useEffect runs once on the client after the component mounts.
  // Its purpose is to set isLoading to false, as by this point,
  // the useState initializer has attempted to read from localStorage.
  useEffect(() => {
    setIsLoading(false);
  }, []);

  const setValue: SetValue<T> = useCallback(
    (value) => {
      if (typeof window === 'undefined') {
        console.warn(
          `Tried setting localStorage key “${key}” even though environment is not a client`
        );
        // Update state directly if window is not available
        setStoredValue(prev => value instanceof Function ? value(prev) : value);
        return;
      }

      try {
        // Allow value to be a function so we have the same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.warn(`Error setting localStorage key “${key}”:`, error);
      }
    },
    [key, storedValue] // storedValue is needed if `value` is a function: `value(storedValue)`
  );

  return [storedValue, setValue, isLoading];
}

export default useLocalStorage;