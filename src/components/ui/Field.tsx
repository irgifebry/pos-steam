import { cn } from "@/lib/cn";
import { useId, cloneElement, isValidElement, Fragment } from "react";
import type { ReactElement, ReactNode } from "react";

const FORM_ELEMENTS = new Set(["input", "select", "textarea"]);
const FORM_COMPONENTS = new Set(["Input"]);

function componentDisplayName(node: ReactElement): string | undefined {
  const type = node.type as { displayName?: string; name?: string };
  return type?.displayName ?? type?.name;
}

function isFormElement(node: ReactElement): boolean {
  const type = node.type;
  if (typeof type === "string") return FORM_ELEMENTS.has(type);
  return FORM_COMPONENTS.has(componentDisplayName(node) ?? "");
}

function findFormId(node: ReactNode): string | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findFormId(child);
      if (found) return found;
    }
    return undefined;
  }
  if (isValidElement(node)) {
    if (node.type === Fragment) {
      return findFormId((node.props as { children?: ReactNode }).children);
    }
    const props = (node.props ?? {}) as Record<string, unknown>;
    if (isFormElement(node as ReactElement) && typeof props.id === "string") {
      return props.id;
    }
    return findFormId(props.children as ReactNode);
  }
  return undefined;
}



export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const generatedId = useId();
  const childId = htmlFor === undefined ? findFormId(children) : undefined;
  const id = htmlFor ?? childId ?? generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  function enhance(node: ReactNode): ReactNode {
    if (Array.isArray(node)) {
      return node.map((child, index) => {
        const enhanced = enhance(child);
        if (isValidElement(enhanced) && enhanced.key == null) {
          return cloneElement(enhanced as ReactElement<Record<string, unknown>>, { key: index });
        }
        return enhanced;
      });
    }
    if (isValidElement(node)) {
      if (node.type === Fragment) {
        return cloneElement(node as ReactElement<Record<string, unknown>>, {}, enhance((node.props as { children?: ReactNode }).children));
      }
      if (!isFormElement(node as ReactElement)) {
        return node;
      }
      const props = (node.props ?? {}) as Record<string, unknown>;
      const existingDescribed = props["aria-describedby"];
      const mergedDescribed =
        [describedBy, typeof existingDescribed === "string" ? existingDescribed : undefined]
          .filter(Boolean)
          .filter((v, i, a) => a.indexOf(v) === i)
          .join(" ") || undefined;
      const childProps: Record<string, unknown> = {
        "aria-invalid": error ? true : props["aria-invalid"],
        "aria-describedby": mergedDescribed,
      };
      if (props.id === undefined) {
        childProps.id = id;
      }
      if (required || props.required === true) {
        childProps["aria-required"] = props["aria-required"] ?? true;
      } else if (props["aria-required"] !== undefined) {
        childProps["aria-required"] = props["aria-required"];
      }
      return cloneElement(node as ReactElement<Record<string, unknown>>, childProps);
    }
    return node;
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
          {required && <span className="text-danger ml-0.5" aria-hidden="true">*</span>}
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