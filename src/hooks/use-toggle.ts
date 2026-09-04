import { useState, useCallback } from "react";

export function useToggle(
  initialValue: boolean = false
): [boolean, () => void, () => void, () => void, (value: boolean) => void] {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue((prev) => !prev);
  }, []);

  const setTrue = useCallback(() => {
    setValue(true);
  }, []);

  const setFalse = useCallback(() => {
    setValue(false);
  }, []);

  const set = useCallback((newValue: boolean) => {
    setValue(newValue);
  }, []);

  return [value, toggle, setTrue, setFalse, set];
}

export function useToggleMultiple<T extends string>(
  initialValues: Record<T, boolean>
): {
  values: Record<T, boolean>;
  toggle: (key: T) => void;
  setTrue: (key: T) => void;
  setFalse: (key: T) => void;
  set: (key: T, value: boolean) => void;
  setAll: (value: boolean) => void;
  reset: () => void;
  getActiveKeys: () => T[];
  isActive: (key: T) => boolean;
} {
  const [values, setValues] = useState<Record<T, boolean>>(initialValues);

  const toggle = useCallback((key: T) => {
    setValues((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const setTrue = useCallback((key: T) => {
    setValues((prev) => ({
      ...prev,
      [key]: true,
    }));
  }, []);

  const setFalse = useCallback((key: T) => {
    setValues((prev) => ({
      ...prev,
      [key]: false,
    }));
  }, []);

  const set = useCallback((key: T, value: boolean) => {
    setValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const setAll = useCallback((value: boolean) => {
    setValues((prev) => {
      const newValues = { ...prev };
      for (const key in newValues) {
        newValues[key as T] = value;
      }
      return newValues;
    });
  }, []);

  const reset = useCallback(() => {
    setValues(initialValues);
  }, [initialValues]);

  const getActiveKeys = useCallback((): T[] => {
    return Object.keys(values).filter(
      (key) => values[key as T]
    ) as T[];
  }, [values]);

  const isActive = useCallback(
    (key: T): boolean => {
      return values[key] || false;
    },
    [values]
  );

  return {
    values,
    toggle,
    setTrue,
    setFalse,
    set,
    setAll,
    reset,
    getActiveKeys,
    isActive,
  };
}

export function useTriState(): {
  value: "on" | "off" | "mixed";
  toggle: () => void;
  setOn: () => void;
  setOff: () => void;
  setMixed: () => void;
  isOn: boolean;
  isOff: boolean;
  isMixed: boolean;
} {
  const [value, setValue] = useState<"on" | "off" | "mixed">("off");

  const toggle = useCallback(() => {
    setValue((prev) => {
      switch (prev) {
        case "on":
          return "off";
        case "off":
          return "on";
        case "mixed":
          return "on";
      }
    });
  }, []);

  const setOn = useCallback(() => setValue("on"), []);
  const setOff = useCallback(() => setValue("off"), []);
  const setMixed = useCallback(() => setValue("mixed"), []);

  return {
    value,
    toggle,
    setOn,
    setOff,
    setMixed,
    isOn: value === "on",
    isOff: value === "off",
    isMixed: value === "mixed",
  };
}

export function useBoolean(
  initialValue: boolean = false
): {
  value: boolean;
  setTrue: () => void;
  setFalse: () => void;
  toggle: () => void;
  set: (value: boolean) => void;
} {
  const [value, setValue] = useState(initialValue);

  return {
    value,
    setTrue: useCallback(() => setValue(true), []),
    setFalse: useCallback(() => setValue(false), []),
    toggle: useCallback(() => setValue((prev) => !prev), []),
    set: useCallback((newValue: boolean) => setValue(newValue), []),
  };
}

export function useCount(
  initialValue: number = 0,
  options?: {
    min?: number;
    max?: number;
    step?: number;
  }
): {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  set: (value: number) => void;
  canIncrement: boolean;
  canDecrement: boolean;
} {
  const { min = -Infinity, max = Infinity, step = 1 } = options || {};
  const [count, setCount] = useState(initialValue);

  const increment = useCallback(() => {
    setCount((prev) => Math.min(prev + step, max));
  }, [step, max]);

  const decrement = useCallback(() => {
    setCount((prev) => Math.max(prev - step, min));
  }, [step, min]);

  const reset = useCallback(() => {
    setCount(initialValue);
  }, [initialValue]);

  const set = useCallback(
    (value: number) => {
      setCount(Math.max(min, Math.min(max, value)));
    },
    [min, max]
  );

  return {
    count,
    increment,
    decrement,
    reset,
    set,
    canIncrement: count < max,
    canDecrement: count > min,
  };
}
