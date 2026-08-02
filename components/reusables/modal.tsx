"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const openModalStack: symbol[] = [];

// Modal Root Component
interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  ariaLabelledBy?: string;
  overlayClassName?: string;
}

export function Modal({
  open,
  onOpenChange,
  children,
  ariaLabelledBy,
  overlayClassName,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const modalId = useRef(Symbol("modal"));
  const onOpenChangeRef = useRef(onOpenChange);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const currentModalId = modalId.current;
    openModalStack.push(currentModalId);

    previousFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => {
      modalRef.current
        ?.querySelector<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
        ?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (openModalStack.at(-1) !== currentModalId) {
        return;
      }

      if (event.key === "Escape") {
        onOpenChangeRef.current(false);
        return;
      }

      if (event.key !== "Tab" || !modalRef.current) {
        return;
      }

      const focusableElements = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (!firstElement || !lastElement) {
        return;
      }

      if (
        event.shiftKey &&
        document.activeElement === firstElement
      ) {
        event.preventDefault();
        lastElement.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === lastElement
      ) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (openModalStack.at(-1) !== currentModalId) {
        return;
      }

      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onOpenChangeRef.current(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
      const stackIndex = openModalStack.lastIndexOf(currentModalId);
      if (stackIndex !== -1) {
        openModalStack.splice(stackIndex, 1);
      }
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-2 sm:items-center sm:p-4",
        overlayClassName,
      )}
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
      >
        {children}
      </div>
    </div>
  );
}

// Modal Content Container
interface ModalContentProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "custom";
  children: React.ReactNode;
}

export function ModalContent({
  className,
  size = "md",
  children,
}: ModalContentProps) {
  const sizeClasses = {
    sm: "w-full max-w-sm",
    md: "w-full max-w-md",
    lg: "w-full max-w-lg",
    xl: "w-full max-w-xl",
    "2xl": "w-full max-w-4xl",
    custom: "w-full max-w-[420px] sm:w-[420px]",
  };

  return (
    <div
      className={cn(
        "max-h-[calc(100dvh-16px)] overflow-hidden rounded-xl border border-bd-50 bg-bk-50 p-4 shadow-lg sm:max-h-[calc(100dvh-32px)]",
        sizeClasses[size],
        className,
      )}
    >
      {children}
    </div>
  );
}

// Modal Header
interface ModalHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export function ModalHeader({ className, children }: ModalHeaderProps) {
  return <div className={cn("mb-3", className)}>{children}</div>;
}

// Modal Title
interface ModalTitleProps {
  className?: string;
  children: React.ReactNode;
}

export function ModalTitle({ className, children }: ModalTitleProps) {
  return (
    <h2 className={cn("text-xs font-medium text-fg-30", className)}>
      {children}
    </h2>
  );
}

// Modal Description
interface ModalDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export function ModalDescription({
  className,
  children,
}: ModalDescriptionProps) {
  return <p className={cn("text-xs text-fg-60 mt-1", className)}>{children}</p>;
}

// Modal Body
interface ModalBodyProps {
  className?: string;
  children: React.ReactNode;
}

export function ModalBody({ className, children }: ModalBodyProps) {
  return <div className={cn("mb-4", className)}>{children}</div>;
}

// Modal Footer
interface ModalFooterProps {
  className?: string;
  align?: "left" | "center" | "right" | "between";
  children: React.ReactNode;
}

export function ModalFooter({
  className,
  align = "right",
  children,
}: ModalFooterProps) {
  const alignClasses = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
    between: "justify-between",
  };

  return (
    <div className={cn("flex gap-2", alignClasses[align], className)}>
      {children}
    </div>
  );
}

// Modal Separator (for dividing sections)
interface ModalSeparatorProps {
  className?: string;
}

export function ModalSeparator({ className }: ModalSeparatorProps) {
  return <div className={cn("border-t border-bd-50 my-3", className)} />;
}

// Compound export for easy importing
export const ModalComponents = {
  Root: Modal,
  Content: ModalContent,
  Header: ModalHeader,
  Title: ModalTitle,
  Description: ModalDescription,
  Body: ModalBody,
  Footer: ModalFooter,
  Separator: ModalSeparator,
};
