import type { ReactNode } from "react";

// Shared immersive header for inner pages: aurora light, fading grid, big
// display title with a gradient accent. Pure CSS, no client JS.
export function PageHero({
  kicker,
  title,
  accent,
  subtitle,
  children,
  compact = false,
}: {
  kicker: string;
  title: string;
  accent?: string;
  subtitle?: ReactNode;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section
      className={`aurora-stage border-b border-[var(--color-ink-faint)] px-4 sm:px-6 ${
        compact ? "py-14 lg:py-20" : "py-20 lg:py-28"
      }`}
    >
      <div className="grid-fade" />
      <div className="rise-in mx-auto max-w-4xl text-center">
        <p className="kicker mb-5 flex justify-center">{kicker}</p>
        <h1
          className={`font-display tracking-[-0.04em] text-[var(--color-ink)] ${
            compact ? "text-4xl sm:text-5xl" : "text-[2.5rem] leading-[1.02] sm:text-6xl lg:text-7xl"
          }`}
        >
          {title}
          {accent && (
            <>
              {" "}
              <span className="text-gradient-brand">{accent}</span>
            </>
          )}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[var(--color-ink-muted)] sm:text-lg">
            {subtitle}
          </p>
        )}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
