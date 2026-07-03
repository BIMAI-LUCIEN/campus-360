"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary:
    "bg-brand-500 text-white shadow-md hover:bg-brand-600 hover:shadow-lg active:scale-[0.98] hover:-translate-y-0.5",
  secondary:
    "bg-white text-[var(--color-ink)] border border-[var(--color-border)] hover:border-brand-300 hover:bg-brand-50 active:scale-[0.98]",
  ghost: "bg-transparent text-[var(--color-ink)] hover:bg-white/70",
  outline:
    "bg-transparent text-brand-700 border border-brand-200 hover:bg-brand-50",
};

const sizes = {
  sm: "h-9 px-3.5 text-sm rounded-lg",
  md: "h-11 px-5 text-[0.95rem] rounded-xl",
  lg: "h-12 px-6 text-base rounded-xl",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200",
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
