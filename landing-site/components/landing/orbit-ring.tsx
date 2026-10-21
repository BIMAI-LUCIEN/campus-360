import type { CSSProperties } from "react";
import { Bell, Briefcase, FileText, GraduationCap, MessageCircle, Sparkles, Wallet, PenLine } from "lucide-react";

const nodes = [
  { icon: Briefcase, tone: "text-[var(--color-sienna)]" },
  { icon: Sparkles, tone: "text-[var(--color-sienna)]" },
  { icon: FileText, tone: "text-[var(--color-sienna)]" },
  { icon: PenLine, tone: "text-[var(--color-sienna)]" },
  { icon: MessageCircle, tone: "text-[var(--color-sienna)]" },
  { icon: Bell, tone: "text-[var(--color-sienna)]" },
  { icon: GraduationCap, tone: "text-[var(--color-sienna)]" },
  { icon: Wallet, tone: "text-[var(--color-sienna)]" },
];

// Tilted ring of the app's features orbiting behind the hero phone (pure CSS 3D).
export function OrbitRing({ diameter = 520 }: { diameter?: number }) {
  return (
    <div className="orbit-wrap" aria-hidden style={{ "--orbit-d": `${diameter}px` } as CSSProperties}>
      <div className="orbit">
        <div className="orbit-ring" />
        {nodes.map((node, i) => {
          const Icon = node.icon;
          return (
            <div key={i} className="orbit-node" style={{ "--a": `${(360 / nodes.length) * i}deg` } as CSSProperties}>
              <span>
                <Icon className={`h-5 w-5 ${node.tone}`} />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
