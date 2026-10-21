import type { CSSProperties } from "react";

// Slowly spinning glass cube in the brand gradient (decoration, pure CSS 3D).
export function Cube3D({ size = 90, className = "", delay = "0s" }: { size?: number; className?: string; delay?: string }) {
  return (
    <div className={`cube-scene pointer-events-none ${className}`} aria-hidden>
      <div className="cube" style={{ "--cube": `${size}px`, animationDelay: delay } as CSSProperties}>
        <i /><i /><i /><i /><i /><i />
      </div>
    </div>
  );
}
