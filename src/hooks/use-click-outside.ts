import { useEffect, useRef, useCallback } from "react";

type Event = MouseEvent | TouchEvent;

export function useClickOutside<T extends HTMLElement = HTMLElement>(
  handler: () => void,
  options?: {
    enabled?: boolean;
    exclude?: React.RefObject<HTMLElement>[];
    eventType?: "mousedown" | "mouseup";
  }
): React.RefObject<T> {
  const ref = useRef<T>(null);
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const { enabled = true, exclude = [], eventType = "mousedown" } = options || {};
    
    if (!enabled) return;

    const listener = (event: Event) => {
      const target = event.target as Node;
      
      if (!ref.current || ref.current.contains(target)) {
        return;
      }

      for (const excludeRef of exclude) {
        if (excludeRef.current?.contains(target)) {
          return;
        }
      }

      handlerRef.current();
    };

    document.addEventListener(eventType, listener);
    
    return () => {
      document.removeEventListener(eventType, listener);
    };
  }, [options]);

  return ref;
}

export function useClickOutsideMultiple(
  handler: () => void,
  refs: React.RefObject<HTMLElement>[],
  options?: {
    enabled?: boolean;
    eventType?: "mousedown" | "mouseup";
  }
): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const { enabled = true, eventType = "mousedown" } = options || {};
    
    if (!enabled) return;

    const listener = (event: Event) => {
      const target = event.target as Node;
      
      for (const ref of refs) {
        if (ref.current?.contains(target)) {
          return;
        }
      }

      handlerRef.current();
    };

    document.addEventListener(eventType, listener);
    
    return () => {
      document.removeEventListener(eventType, listener);
    };
  }, [refs, options]);
}

export function useEscapeKey(
  handler: () => void,
  options?: {
    enabled?: boolean;
  }
): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const { enabled = true } = options || {};
    
    if (!enabled) return;

    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handlerRef.current();
      }
    };

    document.addEventListener("keydown", listener);
    
    return () => {
      document.removeEventListener("keydown", listener);
    };
  }, [options]);
}

export function useOutsideClickAlert(
  message: string = "Are you sure you want to leave?"
): React.RefObject<HTMLElement> {
  const ref = useRef<HTMLElement>(null);
  const hasChangesRef = useRef(false);

  const setHasChanges = useCallback((hasChanges: boolean) => {
    hasChangesRef.current = hasChanges;
  }, []);

  useEffect(() => {
    const listener = (event: BeforeUnloadEvent) => {
      if (hasChangesRef.current) {
        event.preventDefault();
        event.returnValue = message;
      }
    };

    window.addEventListener("beforeunload", listener);
    
    return () => {
      window.removeEventListener("beforeunload", listener);
    };
  }, [message]);

  return ref;
}

export function useDocumentClick(
  handler: (event: MouseEvent) => void,
  options?: {
    enabled?: boolean;
    exclude?: string[];
  }
): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const { enabled = true, exclude = [] } = options || {};
    
    if (!enabled) return;

    const listener = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      for (const selector of exclude) {
        if (target.closest(selector)) {
          return;
        }
      }

      handlerRef.current(event);
    };

    document.addEventListener("click", listener);
    
    return () => {
      document.removeEventListener("click", listener);
    };
  }, [options]);
}

export function useClickPosition(): {
  position: { x: number; y: number } | null;
  ref: React.RefObject<HTMLElement>;
  clearPosition: () => void;
} {
  const ref = useRef<HTMLElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const clearPosition = useCallback(() => {
    setPosition(null);
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const listener = (event: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      setPosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    };

    element.addEventListener("click", listener);
    
    return () => {
      element.removeEventListener("click", listener);
    };
  }, []);

  return { position, ref, clearPosition };
}

export function useLongPress(
  handler: () => void,
  options?: {
    delay?: number;
    onStart?: () => void;
    onCancel?: () => void;
  }
): {
  onMouseDown: () => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onTouchStart: () => void;
  onTouchEnd: () => void;
} {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handlerRef = useRef(handler);
  const { delay = 500, onStart, onCancel } = options || {};

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  const start = useCallback(() => {
    onStart?.();
    timeoutRef.current = setTimeout(() => {
      handlerRef.current();
    }, delay);
  }, [delay, onStart]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    onCancel?.();
  }, [onCancel]);

  return {
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: cancel,
  };
}

import { useState } from "react";
