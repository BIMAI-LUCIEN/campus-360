"use client";

import { useState, useMemo } from "react";
import { Search, ChevronDown } from "lucide-react";

interface Faq {
  q: string;
  a: string;
}

interface Category {
  name: string;
  icon: string;
  faqs: Faq[];
}

export function SearchableFAQ({ categories }: { categories: Category[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return categories;
    const q = query.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        faqs: cat.faqs.filter(
          (f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q),
        ),
      }))
      .filter((cat) => cat.faqs.length > 0);
  }, [query, categories]);

  return (
    <>
      <div className="relative mb-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-ink-lighter)]" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher dans la FAQ..."
          aria-label="Rechercher"
          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-[var(--color-border)] shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-base"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-[var(--color-ink-light)] mb-2">
            Aucune réponse trouvée pour &quot;{query}&quot;
          </p>
          <p className="text-sm text-[var(--color-ink-lighter)]">
            Essaie avec d&apos;autres mots-clés, ou contacte-nous directement.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {filtered.map((cat) => (
            <div key={cat.name}>
              <h2 className="text-2xl font-extrabold font-display mb-4 flex items-center gap-2">
                <span className="text-3xl">{cat.icon}</span>
                {cat.name}
              </h2>
              <div className="space-y-3">
                {cat.faqs.map((f) => (
                  <details
                    key={f.q}
                    className="p-5 bg-[var(--color-paper)] rounded-xl border border-[var(--color-border)] group"
                  >
                    <summary className="cursor-pointer font-semibold text-[var(--color-ink)] flex items-center justify-between">
                      {f.q}
                      <ChevronDown className="w-5 h-5 text-brand-500 group-open:rotate-180 transition-transform" />
                    </summary>
                    <p className="mt-3 text-sm text-[var(--color-ink-light)] leading-relaxed">
                      {f.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}