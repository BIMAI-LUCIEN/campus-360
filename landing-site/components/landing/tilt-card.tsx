"use client";

import { useRef, type ReactNode, type PointerEvent } from "react";
import { cn } from "@/lib/cn";

// Card that leans toward the pointer (desktop only) with a soft light spot.
export function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    el.style.setProperty("--ty", `${(x - 0.5) * 10}deg`);
    el.style.setProperty("--tx", `${(0.5 - y) * 10}deg`);
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--tx", "0deg");
    el.style.setProperty("--ty", "0deg");
  };

  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className={cn("tilt relative overflow-hidden", className)}>
      <div className="tilt-glow pointer-events-none absolute inset-0" />
      <div className="relative">{children}</div>
    </div>
  );
}
