import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, Clock, ArrowRight, BookOpen } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { blogPosts } from "@/lib/blog-data";

export const metadata: Metadata = {
  title: "Blog — Conseils révisions, PDFs, vie étudiante",
  description:
    "Méthodo de révision, top PDFs par filière, conseils pour la vie étudiante au Cameroun et en Afrique. Tout pour réussir.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog Campus 360",
    description: "Conseils révisions, top PDFs, vie étudiante.",
    url: "/blog",
    type: "website",
  },
};

const categories = Array.from(new Set(blogPosts.map((p) => p.category)));

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default function BlogIndexPage() {
  const [featured, ...rest] = blogPosts;
  return (
    <SiteShell>
      <section className="py-16 lg:py-20 border-b border-[var(--color-ink)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-100 text-brand-700 text-sm font-semibold rounded-full mb-6">
            <BookOpen className="w-4 h-4" />
            Le blog Campus 360
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display mb-6">
            Conseils, méthodes et PDFs{" "}
            <span className="text-[var(--color-sienna)]">
              pour réussir
            </span>
          </h1>
          <p className="text-lg text-[var(--color-ink-light)] max-w-2xl mx-auto">
            Notre équipe et la communauté partagent leurs meilleures pratiques
            pour réviser efficacement, choisir tes PDFs, et réussir tes exams.
          </p>
        </div>
      </section>

      {/* Featured */}
      <section className="py-12 bg-[var(--color-paper)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href={`/blog/${featured.slug}`}
            className="block group relative rounded-3xl overflow-hidden bg-gradient-to-br from-brand-500 to-brand-700 text-white"
          >
            <div className="grid lg:grid-cols-2 gap-6 p-8 lg:p-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur text-white text-xs font-bold rounded-full mb-4">
                  ⭐ À la une
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display mb-4">
                  {featured.title}
                </h2>
                <p className="text-white/80 mb-6">{featured.description}</p>
                <div className="flex items-center gap-4 text-sm text-white/70 mb-6">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {formatDate(featured.publishedAt)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {featured.readingMinutes} min
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 font-semibold group-hover:gap-3 transition-all">
                  Lire l&apos;article
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
              <div className="hidden lg:flex justify-center">
                <div className="w-64 h-80 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center text-8xl">
                  📖
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="py-6 bg-[var(--color-paper)] border-y border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[var(--color-ink-light)] mr-2">
              Catégories :
            </span>
            <span className="px-3 py-1 bg-[var(--color-sienna)] text-white text-sm font-semibold rounded-full">
              Tous
            </span>
            {categories.map((c) => (
              <span
                key={c}
                className="px-3 py-1 bg-[var(--color-paper)] border border-[var(--color-border)] text-[var(--color-ink-light)] text-sm rounded-full hover:bg-brand-50 cursor-pointer"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Posts grid */}
      <section className="py-12 bg-[var(--color-paper)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex flex-col p-6 bg-[var(--color-paper)] rounded-2xl border border-[var(--color-border)] hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-brand-50 text-brand-700 text-xs font-bold rounded-full self-start mb-4">
                  {post.category}
                </div>
                <h3 className="text-lg font-bold font-display mb-2 group-hover:text-[var(--color-sienna)] transition-colors">
                  {post.title}
                </h3>
                <p className="text-sm text-[var(--color-ink-light)] leading-relaxed flex-1 mb-4">
                  {post.description}
                </p>
                <div className="flex items-center justify-between text-xs text-[var(--color-ink-lighter)] pt-4 border-t border-[var(--color-border)]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(post.publishedAt)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {post.readingMinutes} min
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-[var(--color-paper)] border-t border-[var(--color-border)]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-extrabold font-display mb-3">
            Reçois les nouveaux articles par email
          </h2>
          <p className="text-sm text-[var(--color-ink-light)] mb-6">
            1 email par semaine max. Désabonnement en 1 clic.
          </p>
          <form className="flex gap-2 max-w-md mx-auto">
            <input
              type="email"
              required
              placeholder="ton.email@universite.com"
              className="flex-1 px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] focus:outline-none focus:ring-2 focus:ring-brand-500"
              aria-label="Adresse email"
            />
            <button
              type="submit"
              className="px-5 py-3 bg-[var(--color-sienna)] text-white font-semibold rounded-lg hover:bg-[var(--color-sienna-deep)] cursor-pointer"
            >
              S&apos;abonner
            </button>
          </form>
        </div>
      </section>
    </SiteShell>
  );
}