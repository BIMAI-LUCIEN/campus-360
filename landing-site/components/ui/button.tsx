"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
}

// Brand book: one solid violet button per screen; the other actions use
// Violet 50 or an outline.
const variants = {
  primary:
    "text-white bg-[#7C3AED] hover:bg-[#6D28D9] active:translate-y-px shadow-[0_10px_24px_-12px_rgba(124,58,237,0.6)]",
  secondary:
    "bg-[#F5F3FF] text-[#6D28D9] hover:bg-[#EDE9FE] active:translate-y-px",
  ghost:
    "bg-transparent text-[var(--color-ink)] hover:bg-[#F1F5F9]",
  outline:
    "bg-white text-[var(--color-ink)] border border-[#E2E8F0] hover:border-[#C4B5FD]",
};

const sizes = {
  sm: "h-9 px-3.5 text-sm rounded-xl",
  md: "h-11 px-5 text-[0.95rem] rounded-xl",
  lg: "h-13 px-7 text-base rounded-xl",
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
