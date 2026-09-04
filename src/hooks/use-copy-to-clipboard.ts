import { useState, useCallback, useRef } from "react";

interface UseCopyToClipboardResult {
  copiedText: string | null;
  isCopied: boolean;
  error: Error | null;
  copy: (text: string) => Promise<boolean>;
  reset: () => void;
}

export function useCopyToClipboard(): UseCopyToClipboardResult {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        
        if (!successful) {
          throw new Error("Copy command was unsuccessful");
        }
      }

      setCopiedText(text);
      setIsCopied(true);
      setError(null);

      timeoutRef.current = setTimeout(() => {
        setIsCopied(false);
        setCopiedText(null);
      }, 2000);

      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setIsCopied(false);
      setCopiedText(null);
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setCopiedText(null);
    setIsCopied(false);
    setError(null);
  }, []);

  return {
    copiedText,
    isCopied,
    error,
    copy,
    reset,
  };
}

export function useCopyToClipboardWithFeedback(): {
  copy: (text: string, label?: string) => Promise<boolean>;
  copiedLabel: string | null;
  isCopied: boolean;
  error: Error | null;
  reset: () => void;
} {
  const { copiedText, isCopied, error, copy, reset } = useCopyToClipboard();
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  const copyWithLabel = useCallback(
    async (text: string, label?: string): Promise<boolean> => {
      const result = await copy(text);
      if (result && label) {
        setCopiedLabel(label);
        setTimeout(() => setCopiedLabel(null), 2000);
      }
      return result;
    },
    [copy]
  );

  return {
    copy: copyWithLabel,
    copiedLabel,
    isCopied,
    error,
    reset,
  };
}

export function useCopyToFile(): {
  copyToFile: (text: string, filename: string) => Promise<boolean>;
  isCopied: boolean;
  error: Error | null;
} {
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const copyToFile = useCallback(
    async (text: string, filename: string): Promise<boolean> => {
      try {
        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setIsCopied(true);
        setError(null);
        setTimeout(() => setIsCopied(false), 2000);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsCopied(false);
        return false;
      }
    },
    []
  );

  return { copyToFile, isCopied, error };
}

export function useCopyImage(): {
  copyImage: (imageUrl: string) => Promise<boolean>;
  isCopied: boolean;
  error: Error | null;
} {
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const copyImage = useCallback(async (imageUrl: string): Promise<boolean> => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
      
      setIsCopied(true);
      setError(null);
      setTimeout(() => setIsCopied(false), 2000);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsCopied(false);
      return false;
    }
  }, []);

  return { copyImage, isCopied, error };
}

export function useCopyRichText(): {
  copyRichText: (html: string, plainText?: string) => Promise<boolean>;
  isCopied: boolean;
  error: Error | null;
} {
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const copyRichText = useCallback(
    async (html: string, plainText?: string): Promise<boolean> => {
      try {
        const htmlBlob = new Blob([html], { type: "text/html" });
        const textBlob = new Blob([plainText || html], {
          type: "text/plain",
        });
        
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": htmlBlob,
            "text/plain": textBlob,
          }),
        ]);
        
        setIsCopied(true);
        setError(null);
        setTimeout(() => setIsCopied(false), 2000);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsCopied(false);
        return false;
      }
    },
    []
  );

  return { copyRichText, isCopied, error };
}

export function useCopyWithNotification(): {
  copy: (text: string) => Promise<boolean>;
  showNotification: boolean;
  notificationMessage: string;
  hideNotification: () => void;
} {
  const { copy, isCopied } = useCopyToClipboard();
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const copyWithNotification = useCallback(
    async (text: string): Promise<boolean> => {
      const result = await copy(text);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (result) {
        setNotificationMessage("Copied to clipboard!");
      } else {
        setNotificationMessage("Failed to copy");
      }
      
      setShowNotification(true);
      
      timeoutRef.current = setTimeout(() => {
        setShowNotification(false);
      }, 2000);

      return result;
    },
    [copy]
  );

  const hideNotification = useCallback(() => {
    setShowNotification(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return {
    copy: copyWithNotification,
    showNotification,
    notificationMessage,
    hideNotification,
  };
}
