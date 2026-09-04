import { useState, useEffect, useCallback, useRef } from "react";

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const initialValueRef = useRef(initialValue);

  useEffect(() => {
    initialValueRef.current = initialValue;
  }, [initialValue]);

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        
        window.dispatchEvent(
          new StorageEvent("storage", {
            key,
            newValue: JSON.stringify(valueToStore),
          })
        );
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValueRef.current);
      window.localStorage.removeItem(key);
      
      window.dispatchEvent(
        new StorageEvent("storage", {
          key,
          newValue: null,
        })
      );
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== key) return;

      try {
        const newValue = event.newValue
          ? (JSON.parse(event.newValue) as T)
          : initialValueRef.current;
        setStoredValue(newValue);
      } catch (error) {
        console.error(`Error parsing storage event for key "${key}":`, error);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key]);

  return [storedValue, setValue, removeValue];
}

export function useLocalStorageState<T>(
  key: string,
  initialValue: T
): {
  value: T;
  setValue: (value: T | ((val: T) => T)) => void;
  removeValue: () => void;
  isPersistent: boolean;
} {
  const [value, setValue, removeValue] = useLocalStorage<T>(key, initialValue);

  return {
    value,
    setValue,
    removeValue,
    isPersistent: true,
  };
}

export function useLocalStorageObject<T extends Record<string, unknown>>(
  key: string,
  initialValue: T
): {
  value: T;
  update: (updates: Partial<T>) => void;
  reset: () => void;
  remove: () => void;
} {
  const [value, setValue, removeValue] = useLocalStorage<T>(key, initialValue);

  const update = useCallback(
    (updates: Partial<T>) => {
      setValue((prev) => ({ ...prev, ...updates }));
    },
    [setValue]
  );

  const reset = useCallback(() => {
    setValue(initialValue);
  }, [setValue, initialValue]);

  return {
    value,
    update,
    reset,
    remove: removeValue,
  };
}

export function useLocalStorageArray<T>(
  key: string,
  initialValue: T[]
): {
  value: T[];
  add: (item: T) => void;
  remove: (index: number) => void;
  update: (index: number, item: T) => void;
  clear: () => void;
  contains: (item: T) => boolean;
} {
  const [value, setValue] = useLocalStorage<T[]>(key, initialValue);

  const add = useCallback(
    (item: T) => {
      setValue((prev) => [...prev, item]);
    },
    [setValue]
  );

  const remove = useCallback(
    (index: number) => {
      setValue((prev) => prev.filter((_, i) => i !== index));
    },
    [setValue]
  );

  const update = useCallback(
    (index: number, item: T) => {
      setValue((prev) => prev.map((existing, i) => (i === index ? item : existing)));
    },
    [setValue]
  );

  const clear = useCallback(() => {
    setValue([]);
  }, [setValue]);

  const contains = useCallback(
    (item: T) => {
      return value.some((existing) => 
        JSON.stringify(existing) === JSON.stringify(item)
      );
    },
    [value]
  );

  return { value, add, remove, update, clear, contains };
}

export function useLocalStorageWithExpiry<T>(
  key: string,
  initialValue: T,
  expiryInMs: number
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  const getStoredValue = useCallback((): T => {
    if (typeof window === "undefined") return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;

      const parsed = JSON.parse(item) as { value: T; expiry: number };
      
      if (Date.now() > parsed.expiry) {
        window.localStorage.removeItem(key);
        return initialValue;
      }

      return parsed.value;
    } catch {
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(getStoredValue);

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        
        const item = {
          value: valueToStore,
          expiry: Date.now() + expiryInMs,
        };
        
        window.localStorage.setItem(key, JSON.stringify(item));
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue, expiryInMs]
  );

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
