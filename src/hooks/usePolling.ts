"use client";

import { useEffect, useRef } from "react";

export function usePolling(
  callback: () => void | Promise<void>,
  intervalMs: number,
  enabled = true,
) {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (!enabled) return;
    let inFlight = false;
    const run = async () => {
      if (inFlight) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        await callbackRef.current();
      } catch {
        // swallow to avoid unhandled rejection
      } finally {
        inFlight = false;
      }
    };

    void run();
    const id = setInterval(() => void run(), intervalMs);
    const onVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void run();
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }
    return () => {
      clearInterval(id);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
  }, [intervalMs, enabled]);
}
