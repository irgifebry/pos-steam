"use client";

import { useEffect, useRef, useId } from "react";
import { cn } from "@/lib/cn";
import { X } from "lucide-react";
import type { ReactNode, RefObject } from "react";

type Size = "sm" | "md" | "lg";

const sizeClasses: Record<Size, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

// Module-level stack tracking open modals so only the topmost acts.
let modalCounter = 0;
const modalStack: number[] = [];

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  initialFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: Size;
  initialFocusRef?: RefObject<HTMLElement | null>;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const initialFocusRefRef = useRef(initialFocusRef);
  const modalIdRef = useRef(0);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
    initialFocusRefRef.current = initialFocusRef;
  });

  useEffect(() => {
    if (!open) return;

    modalIdRef.current = ++modalCounter;
    modalStack.push(modalIdRef.current);
    const isTopmost = () => modalStack[modalStack.length - 1] === modalIdRef.current;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const raf = requestAnimationFrame(() => {
      const focusRef = initialFocusRefRef.current;
      if (focusRef?.current) {
        focusRef.current.focus();
      } else {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (focusables && focusables.length > 0) {
          focusables[0].focus();
        } else {
          dialogRef.current?.focus();
        }
      }
    });

    function getFocusables() {
      return Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (!isTopmost()) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const nodes = getFocusables();
      if (nodes.length === 0) {
        e.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !active || !dialogRef.current.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !active || !dialogRef.current.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    function onFocusIn(e: FocusEvent) {
      const target = e.target as HTMLElement | null;
      if (target && dialogRef.current?.contains(target)) {
        lastFocusedRef.current = target;
      }
    }

    function onFocusOut(e: FocusEvent) {
      if (!isTopmost()) return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const target = e.target as Node | null;
      if (!target || !dialog.contains(target)) return;
      const related = e.relatedTarget as Node | null;
      if (related && dialog.contains(related)) return;
      requestAnimationFrame(() => {
        if (!isTopmost()) return;
        const lf = lastFocusedRef.current;
        if (lf && dialog.contains(lf)) {
          lf.focus();
        } else {
          const nodes = getFocusables();
          if (nodes.length > 0) {
            nodes[0].focus();
          } else {
            dialog.focus();
          }
        }
      });
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.body.style.overflow = prevOverflow;
      const idx = modalStack.indexOf(modalIdRef.current);
      if (idx !== -1) modalStack.splice(idx, 1);
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        if (modalStack[modalStack.length - 1] !== modalIdRef.current) return;
        onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full bg-surface rounded-[var(--radius-lg)] shadow-[var(--shadow-float)] max-h-[90vh] overflow-y-auto outline-none",
          sizeClasses[size],
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 id={titleId} className="text-xl font-bold text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-[var(--radius-sm)] flex items-center justify-center text-muted hover:bg-bg"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-line">{footer}</div>}
      </div>
    </div>
  );
}