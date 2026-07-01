import Link from 'next/link';
import { ShieldOff } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-bg p-6 overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-warning-bg blur-3xl opacity-60"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary-soft blur-3xl opacity-40"
      />

      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface shadow-popover p-8 text-center">
        <div className="flex justify-center mb-5">
          <div className="h-12 w-12 rounded-xl bg-warning-bg border border-warning-soft flex items-center justify-center text-warning">
            <ShieldOff size={48} strokeWidth={1.75} />
          </div>
        </div>

        <h1 className="font-display text-[22px] font-bold text-fg leading-tight">
          Accès refusé
        </h1>
        <p className="text-sm text-fg-subtle mt-2 mb-6 max-w-md mx-auto">
          Votre compte est connecté, mais il ne possède pas les privilèges administrateur requis.
        </p>

        <Link
          href="/admin/login"
          className="inline-flex items-center justify-center w-full h-11 bg-primary hover:bg-primary-hover text-on-primary font-semibold rounded-md transition-colors no-underline"
        >
          Retourner à la connexion
        </Link>
      </div>
    </div>
  );
}