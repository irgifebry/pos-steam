"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ToastVariant = "info" | "success" | "error";

export type Toast = { message: string; variant: ToastVariant } | null;

export function useToast(defaultDuration = 2500) {
  const [toast, setToast] = useState<Toast>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, variant });
      timer.current = setTimeout(() => setToast(null), defaultDuration);
    },
    [defaultDuration],
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { toast, showToast, dismiss };
}
