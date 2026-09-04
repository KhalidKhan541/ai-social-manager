import { useState, useEffect, useCallback, useRef } from "react";

type KeyHandler = (event: KeyboardEvent) => void;
type KeyEvent = "keydown" | "keyup" | "keypress";

interface UseKeyPressOptions {
  enabled?: boolean;
  target?: EventTarget;
  useCapture?: boolean;
}

export function useKeyPress(
  targetKey: string,
  handler: KeyHandler,
  options?: UseKeyPressOptions
): boolean {
  const [isPressed, setIsPressed] = useState(false);
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const { enabled = true, target, useCapture = false } = options || {};
    
    if (!enabled) return;

    const targetElement = target || document;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === targetKey) {
        setIsPressed(true);
        handlerRef.current(event);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === targetKey) {
        setIsPressed(false);
      }
    };

    targetElement.addEventListener("keydown", handleKeyDown);
    targetElement.addEventListener("keyup", handleKeyUp);

    return () => {
      targetElement.removeEventListener("keydown", handleKeyDown);
      targetElement.removeEventListener("keyup", handleKeyUp);
    };
  }, [targetKey, options]);

  return isPressed;
}

export function useKeyCombo(
  keys: string[],
  handler: KeyHandler,
  options?: UseKeyPressOptions
): boolean {
  const [isPressed, setIsPressed] = useState<Record<string, boolean>>({});
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const { enabled = true, target, useCapture = false } = options || {};
    
    if (!enabled) return;

    const targetElement = target || document;
    const pressedKeys: Record<string, boolean> = {};

    const handleKeyDown = (event: KeyboardEvent) => {
      if (keys.includes(event.key)) {
        pressedKeys[event.key] = true;
        setIsPressed({ ...pressedKeys });
        
        if (keys.every((key) => pressedKeys[key])) {
          handlerRef.current(event);
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (keys.includes(event.key)) {
        delete pressedKeys[event.key];
        setIsPressed({ ...pressedKeys });
      }
    };

    const handleBlur = () => {
      Object.keys(pressedKeys).forEach((key) => {
        delete pressedKeys[key];
      });
      setIsPressed({});
    };

    targetElement.addEventListener("keydown", handleKeyDown);
    targetElement.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      targetElement.removeEventListener("keydown", handleKeyDown);
      targetElement.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [keys, options]);

  return keys.every((key) => isPressed[key]);
}

export function useShortcut(
  shortcuts: Record<string, KeyHandler>,
  options?: UseKeyPressOptions
): void {
  const shortcutsRef = useRef(shortcuts);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  useEffect(() => {
    const { enabled = true, target, useCapture = false } = options || {};
    
    if (!enabled) return;

    const targetElement = target || document;

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = [];
      
      if (event.ctrlKey || event.metaKey) key.push("ctrl");
      if (event.altKey) key.push("alt");
      if (event.shiftKey) key.push("shift");
      if (event.key) key.push(event.key.toLowerCase());

      const shortcut = key.join("+");
      
      if (shortcutsRef.current[shortcut]) {
        event.preventDefault();
        shortcutsRef.current[shortcut](event);
      }
    };

    targetElement.addEventListener("keydown", handleKeyDown);

    return () => {
      targetElement.removeEventListener("keydown", handleKeyDown);
    };
  }, [options]);
}

export function useArrowKeys(
  handlers: {
    up?: KeyHandler;
    down?: KeyHandler;
    left?: KeyHandler;
    right?: KeyHandler;
  },
  options?: UseKeyPressOptions
): void {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const { enabled = true, target, useCapture = false } = options || {};
    
    if (!enabled) return;

    const targetElement = target || document;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowUp":
          event.preventDefault();
          handlersRef.current.up?.(event);
          break;
        case "ArrowDown":
          event.preventDefault();
          handlersRef.current.down?.(event);
          break;
        case "ArrowLeft":
          event.preventDefault();
          handlersRef.current.left?.(event);
          break;
        case "ArrowRight":
          event.preventDefault();
          handlersRef.current.right?.(event);
          break;
      }
    };

    targetElement.addEventListener("keydown", handleKeyDown);

    return () => {
      targetElement.removeEventListener("keydown", handleKeyDown);
    };
  }, [options]);
}

export function useKeyPressSequence(
  sequence: string[],
  handler: KeyHandler,
  options?: {
    timeout?: number;
    enabled?: boolean;
  }
): void {
  const { timeout = 1000, enabled = true } = options || {};
  const sequenceRef = useRef<string[]>([]);
  const handlerRef = useRef(handler);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      sequenceRef.current.push(event.key);

      if (
        sequenceRef.current.length === sequence.length &&
        sequenceRef.current.every((key, i) => key === sequence[i])
      ) {
        handlerRef.current(event);
        sequenceRef.current = [];
      } else if (
        !sequence
          .slice(0, sequenceRef.current.length)
          .every((key, i) => key === sequenceRef.current[i])
      ) {
        sequenceRef.current = [];
      }

      timeoutRef.current = setTimeout(() => {
        sequenceRef.current = [];
      }, timeout);
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [sequence, timeout, enabled]);
}

export function useKeyboardNavigation<T extends HTMLElement>(
  items: T[],
  options?: {
    onSelect?: (item: T, index: number) => void;
    onEscape?: () => void;
    orientation?: "horizontal" | "vertical" | "both";
    loop?: boolean;
  }
): {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  handleKeyDown: (event: React.KeyboardEvent) => void;
} {
  const [activeIndex, setActiveIndex] = useState(0);
  const { onSelect, onEscape, orientation = "vertical", loop = true } = options || {};

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const isVertical = orientation === "vertical" || orientation === "both";
      const isHorizontal = orientation === "horizontal" || orientation === "both";

      let nextIndex = activeIndex;

      switch (event.key) {
        case "ArrowDown":
          if (isVertical) {
            event.preventDefault();
            nextIndex = loop
              ? (activeIndex + 1) % items.length
              : Math.min(activeIndex + 1, items.length - 1);
          }
          break;
        case "ArrowUp":
          if (isVertical) {
            event.preventDefault();
            nextIndex = loop
              ? (activeIndex - 1 + items.length) % items.length
              : Math.max(activeIndex - 1, 0);
          }
          break;
        case "ArrowRight":
          if (isHorizontal) {
            event.preventDefault();
            nextIndex = loop
              ? (activeIndex + 1) % items.length
              : Math.min(activeIndex + 1, items.length - 1);
          }
          break;
        case "ArrowLeft":
          if (isHorizontal) {
            event.preventDefault();
            nextIndex = loop
              ? (activeIndex - 1 + items.length) % items.length
              : Math.max(activeIndex - 1, 0);
          }
          break;
        case "Home":
          event.preventDefault();
          nextIndex = 0;
          break;
        case "End":
          event.preventDefault();
          nextIndex = items.length - 1;
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          onSelect?.(items[activeIndex]!, activeIndex);
          return;
        case "Escape":
          event.preventDefault();
          onEscape?.();
          return;
      }

      if (nextIndex !== activeIndex) {
        setActiveIndex(nextIndex);
        items[nextIndex]?.focus();
      }
    },
    [activeIndex, items, onSelect, onEscape, orientation, loop]
  );

  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown,
  };
}
