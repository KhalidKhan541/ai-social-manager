import { useRef, useState, useCallback, useEffect } from "react";

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

export function usePreviousWithIndex<T>(value: T): [T | undefined, number] {
  const ref = useRef<{ value: T | undefined; index: number }>({
    value: undefined,
    index: 0,
  });
  const [state, setState] = useState({
    value: undefined as T | undefined,
    index: 0,
  });

  useEffect(() => {
    const prevValue = ref.current.value;
    const prevIndex = ref.current.index;
    
    ref.current.value = value;
    ref.current.index = prevIndex + 1;
    
    setState({
      value: prevValue,
      index: prevIndex,
    });
  }, [value]);

  return [state.value, state.index];
}

export function usePreviousArray<T>(value: T[], maxLength: number = 10): T[] {
  const ref = useRef<T[]>([]);

  useEffect(() => {
    ref.current = [value, ...ref.current].slice(0, maxLength);
  }, [value, maxLength]);

  return ref.current;
}

export function usePreviousState<T>(
  initialValue: T
): [T, (newValue: T | ((prev: T) => T)) => void, T | undefined] {
  const [currentValue, setCurrentValue] = useState<T>(initialValue);
  const previousValue = usePrevious(currentValue);

  return [currentValue, setCurrentValue, previousValue];
}

export function useChangeTracker<T>(value: T): {
  current: T;
  previous: T | undefined;
  hasChanged: boolean;
  changeCount: number;
  lastChangeAt: Date | undefined;
} {
  const ref = useRef<{
    value: T;
    changeCount: number;
    lastChangeAt: Date | undefined;
  }>({
    value,
    changeCount: 0,
    lastChangeAt: undefined,
  });
  const [state, setState] = useState({
    current: value,
    previous: undefined as T | undefined,
    hasChanged: false,
    changeCount: 0,
    lastChangeAt: undefined as Date | undefined,
  });

  useEffect(() => {
    if (ref.current.value !== value) {
      const previous = ref.current.value;
      const changeCount = ref.current.changeCount + 1;
      const lastChangeAt = new Date();
      
      ref.current.value = value;
      ref.current.changeCount = changeCount;
      ref.current.lastChangeAt = lastChangeAt;
      
      setState({
        current: value,
        previous,
        hasChanged: true,
        changeCount,
        lastChangeAt,
      });
    }
  }, [value]);

  return state;
}

export function usePreviousWithCallback<T>(
  value: T,
  callback: (previous: T, current: T) => void
): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (ref.current !== undefined && ref.current !== value) {
      callbackRef.current(ref.current, value);
    }
    ref.current = value;
  }, [value]);

  return ref.current;
}

export function useCompare<T>(
  value: T,
  comparator: (a: T, b: T) => boolean
): {
  current: T;
  previous: T | undefined;
  hasChanged: boolean;
} {
  const ref = useRef<{ value: T; previous: T | undefined }>({
    value,
    previous: undefined,
  });
  const [state, setState] = useState({
    current: value,
    previous: undefined as T | undefined,
    hasChanged: false,
  });

  useEffect(() => {
    const hasChanged = !comparator(ref.current.value, value);
    
    if (hasChanged) {
      const previous = ref.current.value;
      ref.current.value = value;
      ref.current.previous = previous;
      
      setState({
        current: value,
        previous,
        hasChanged: true,
      });
    }
  }, [value, comparator]);

  return state;
}

export function useFirstRender(): boolean {
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
    }
  }, []);

  return isFirstRender.current;
}

export function useIsFirstMount(): boolean {
  const [isFirstMount] = useState(true);
  return isFirstMount;
}

export function useUpdateEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList
): void {
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    return effect();
  }, deps);
}

export function usePreviousMultiple<T extends Record<string, unknown>>(
  values: T
): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = values;
  }, Object.values(values));

  return ref.current;
}
