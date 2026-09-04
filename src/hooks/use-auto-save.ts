import { useState, useEffect, useCallback, useRef } from "react";

interface UseAutoSaveOptions<T> {
  value: T;
  onSave: (value: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
  compare?: (prev: T, next: T) => boolean;
}

interface UseAutoSaveResult<T> {
  lastSavedValue: T | null;
  lastSavedAt: Date | null;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  save: () => Promise<void>;
  reset: () => void;
  discardChanges: () => void;
}

export function useAutoSave<T>({
  value,
  onSave,
  delay = 30000,
  enabled = true,
  compare = (a, b) => JSON.stringify(a) === JSON.stringify(b),
}: UseAutoSaveOptions<T>): UseAutoSaveResult<T> {
  const [lastSavedValue, setLastSavedValue] = useState<T | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const valueRef = useRef(value);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    valueRef.current = value;
    
    if (lastSavedValue !== null && !compare(lastSavedValue, value)) {
      setHasUnsavedChanges(true);
    }
  }, [value, lastSavedValue, compare]);

  const save = useCallback(async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      await onSaveRef.current(valueRef.current);
      setLastSavedValue(valueRef.current);
      setLastSavedAt(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Auto-save failed:", error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [isSaving]);

  useEffect(() => {
    if (!enabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (hasUnsavedChanges) {
      timeoutRef.current = setTimeout(() => {
        save().catch(console.error);
      }, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay, enabled, hasUnsavedChanges, save]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setLastSavedValue(null);
    setLastSavedAt(null);
    setIsSaving(false);
    setHasUnsavedChanges(false);
  }, []);

  const discardChanges = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setHasUnsavedChanges(false);
  }, []);

  return {
    lastSavedValue,
    lastSavedAt,
    isSaving,
    hasUnsavedChanges,
    save,
    reset,
    discardChanges,
  };
}

export function useAutoSaveForm<T extends Record<string, unknown>>(
  form: T,
  options: {
    onSave: (form: T) => Promise<void>;
    delay?: number;
    enabled?: boolean;
    validate?: (form: T) => boolean;
  }
): UseAutoSaveResult<T> & {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const { onSave, delay = 30000, enabled = true, validate } = options;
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isValid = validate ? validate(form) : true;

  const autoSave = useAutoSave({
    value: form,
    onSave,
    delay,
    enabled: enabled && isValid,
  });

  useEffect(() => {
    if (validate) {
      const validationErrors: Record<string, string> = {};
      
      for (const [key, value] of Object.entries(form)) {
        if (typeof value === "string" && value.length === 0) {
          validationErrors[key] = "Required";
        }
      }
      
      setErrors(validationErrors);
    }
  }, [form, validate]);

  return {
    ...autoSave,
    isValid,
    errors,
  };
}

export function useAutoSaveLocalStorage<T>(
  key: string,
  value: T,
  options?: {
    delay?: number;
    enabled?: boolean;
  }
): {
  lastSavedAt: Date | null;
  isSaving: boolean;
  save: () => void;
  load: () => T | null;
  clear: () => void;
} {
  const { delay = 5000, enabled = true } = options || {};
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const save = useCallback(() => {
    if (!enabled) return;

    setIsSaving(true);
    
    try {
      localStorage.setItem(key, JSON.stringify(value));
      setLastSavedAt(new Date());
    } catch (error) {
      console.error("Failed to save to localStorage:", error);
    } finally {
      setIsSaving(false);
    }
  }, [key, value, enabled]);

  const load = useCallback((): T | null => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error("Failed to load from localStorage:", error);
      return null;
    }
  }, [key]);

  const clear = useCallback(() => {
    localStorage.removeItem(key);
    setLastSavedAt(null);
  }, [key]);

  useEffect(() => {
    if (!enabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(save, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay, enabled, save]);

  return {
    lastSavedAt,
    isSaving,
    save,
    load,
    clear,
  };
}

export function useAutoSaveWithConfirmation<T>(
  value: T,
  onSave: (value: T) => Promise<void>,
  options?: {
    delay?: number;
    enabled?: boolean;
    onBeforeUnload?: () => boolean;
  }
): UseAutoSaveResult<T> & {
  showConfirmation: boolean;
  setShowConfirmation: (show: boolean) => void;
  confirmSave: () => Promise<void>;
  cancelSave: () => void;
} {
  const { delay = 30000, enabled = true, onBeforeUnload } = options || {};
  const [showConfirmation, setShowConfirmation] = useState(false);
  const pendingValueRef = useRef<T | null>(null);

  const autoSave = useAutoSave({
    value,
    onSave,
    delay,
    enabled,
  });

  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (autoSave.hasUnsavedChanges) {
        if (onBeforeUnload && !onBeforeUnload()) {
          event.preventDefault();
          event.returnValue = "";
          setShowConfirmation(true);
          pendingValueRef.current = value;
          return;
        }
        
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [autoSave.hasUnsavedChanges, enabled, onBeforeUnload, value]);

  const confirmSave = useCallback(async () => {
    if (pendingValueRef.current !== null) {
      await autoSave.save();
      pendingValueRef.current = null;
    }
    setShowConfirmation(false);
  }, [autoSave.save]);

  const cancelSave = useCallback(() => {
    pendingValueRef.current = null;
    setShowConfirmation(false);
  }, []);

  return {
    ...autoSave,
    showConfirmation,
    setShowConfirmation,
    confirmSave,
    cancelSave,
  };
}
