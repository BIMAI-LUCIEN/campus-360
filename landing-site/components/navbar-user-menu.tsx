"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, LogOut, ChevronDown, BookOpen } from "lucide-react";
import { signOut } from "@/lib/auth-client";

interface Props {
  initial: string;
  name: string;
  email: string;
}

export function NavbarUserMenu({ initial, name, email }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function onSignOut() {
    try {
      await signOut();
      router.push("/");
      router.refresh();
    } catch (e) {
      console.error("signOut failed", e);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-2 px-1 py-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-bold">
          {initial || <User className="w-4 h-4" />}
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-[var(--color-ink-light)]" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 bg-[var(--color-paper)] rounded-xl  border border-[var(--color-border)] overflow-hidden z-50"
        >
          <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-paper)]">
            <div className="font-semibold text-sm font-display truncate">{name}</div>
            <div className="text-xs text-[var(--color-ink-lighter)] truncate">{email}</div>
          </div>
          <div className="py-1">
            <Link
              href="/compte"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-ink)] hover:bg-[var(--color-paper)] transition-colors cursor-pointer"
            >
              <User className="w-4 h-4 text-[var(--color-ink-light)]" />
              Mon compte
            </Link>
            <Link
              href="/telecharger"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-ink)] hover:bg-[var(--color-paper)] transition-colors cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-[var(--color-ink-light)]" />
              Télécharger l&apos;app
            </Link>
            <button
              type="button"
              onClick={onSignOut}
              className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border-t border-[var(--color-border)]"
            >
              <LogOut className="w-4 h-4" />
              Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}