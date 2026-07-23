"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
}

const variants = {
  // Primary — the signature violet→pink→blue gradient CTA.
  primary:
    "text-white bg-[image:var(--gradient-brand)] hover:brightness-110 active:translate-y-px shadow-[0_8px_24px_-8px_oklch(0.64_0.22_307_/_50%)]",
  // Secondary — solid dark surface, used next to a primary gradient CTA.
  secondary:
    "bg-[var(--color-paper-deep)] text-[var(--color-ink)] border border-[var(--color-ink-faint)] hover:bg-[var(--color-paper-soft)] active:translate-y-px",
  ghost:
    "bg-transparent text-[var(--color-ink)] hover:bg-[var(--color-ink)]/[0.06]",
  outline:
    "bg-transparent text-[var(--color-ink)] border border-[var(--color-ink-faint)] hover:border-[var(--color-ink-subtle)]",
};

const sizes = {
  sm: "h-9 px-3.5 text-sm rounded-[var(--radius-editorial)]",
  md: "h-11 px-5 text-[0.95rem] rounded-[var(--radius-editorial)]",
  lg: "h-13 px-7 text-base rounded-[var(--radius-editorial)]",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-sans font-semibold tracking-[0.01em] transition-all duration-150 cursor-pointer",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
