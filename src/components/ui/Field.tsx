import { cn } from "@/lib/cn";
import { Fragment, cloneElement, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  const hintId = htmlFor ? `${htmlFor}-hint` : undefined;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  function enhance(node: ReactNode): ReactNode {
    if (Array.isArray(node)) return node.map((n) => enhance(n));
    if (isValidElement(node)) {
      if (node.type === Fragment) {
        return cloneElement(node as ReactElement<Record<string, unknown>>, {}, enhance((node.props as { children?: ReactNode }).children));
      }
      const props = (node.props ?? {}) as Record<string, unknown>;
      const existingDescribed = props["aria-describedby"];
      const mergedDescribed =
        [describedBy, typeof existingDescribed === "string" ? existingDescribed : undefined]
          .filter(Boolean)
          .filter((v, i, a) => a.indexOf(v) === i)
          .join(" ") || undefined;
      return cloneElement(node as ReactElement<Record<string, unknown>>, {
        "aria-invalid": error ? true : props["aria-invalid"],
        "aria-describedby": mergedDescribed,
      });
    }
    return node;
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
          {label}
        </label>
      )}
      {enhance(children)}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}