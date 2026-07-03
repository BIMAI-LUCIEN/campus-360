import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Clock, ArrowLeft, User, Share2, BookOpen } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { getPostBySlug, getRelatedPosts, blogPosts } from "@/lib/blog-data";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url: `/blog/${slug}`,
      publishedTime: post.publishedAt,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

// Tiny markdown-ish renderer (h2, h3, lists, tables, blockquotes, paragraphs, bold)
function renderContent(content: string) {
  const blocks = content.split(/\n\n+/);
  return blocks.map((block, idx) => {
    const trimmed = block.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("## ")) {
      return (
        <h2 key={idx} className="text-2xl font-extrabold font-display mt-10 mb-4">
          {trimmed.slice(3)}
        </h2>
      );
    }
    if (trimmed.startsWith("### ")) {
      return (
        <h3 key={idx} className="text-xl font-bold font-display mt-8 mb-3">
          {trimmed.slice(4)}
        </h3>
      );
    }
    if (trimmed.startsWith("- ")) {
      const items = trimmed.split("\n").map((l) => l.replace(/^- /, "").trim());
      return (
        <ul key={idx} className="my-4 space-y-2 list-disc pl-6 text-[var(--color-ink-light)]">
          {items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      );
    }
    if (trimmed.startsWith("|")) {
      const rows = trimmed.split("\n").filter((r) => r.trim().startsWith("|"));
      const dataRows = rows.filter((r) => !r.match(/^\|[\s\-:|]+\|$/));
      return (
        <div key={idx} className="my-6 overflow-x-auto">
          <table className="w-full text-sm border border-[var(--color-border)] rounded-lg overflow-hidden">
            <thead className="bg-brand-50">
              <tr>
                {dataRows[0]?.split("|").slice(1, -1).map((h, i) => (
                  <th key={i} className="px-4 py-2 text-left font-semibold">
                    {h.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.slice(1).map((row, ri) => (
                <tr key={ri} className="border-t border-[var(--color-border)]">
                  {row.split("|").slice(1, -1).map((c, i) => (
                    <td key={i} className="px-4 py-2 text-[var(--color-ink-light)]">
                      {c.trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (trimmed.startsWith("> ")) {
      return (
        <blockquote
          key={idx}
          className="my-4 pl-4 border-l-4 border-brand-500 text-[var(--color-ink-light)] italic"
        >
          {trimmed.slice(2)}
        </blockquote>
      );
    }
    return (
      <p key={idx} className="my-4 text-[var(--color-ink-light)] leading-relaxed">
        {trimmed}
      </p>
    );
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const related = getRelatedPosts(slug, 3);

  // JSON-LD Article
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    author: { "@type": "Person", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "Campus 360",
      logo: { "@type": "ImageObject", url: "https://campus360b.site/images/logo.png" },
    },
    mainEntityOfPage: `https://campus360b.site/blog/${post.slug}`,
    keywords: post.tags.join(", "),
  };

  return (
    <SiteShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <article className="py-16 lg:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Tous les articles
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 text-brand-700 text-sm font-bold rounded-full mb-4">
            {post.category}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display mb-6 leading-tight">
            {post.title}
          </h1>

          <p className="text-lg text-[var(--color-ink-light)] mb-6">
            {post.description}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-ink-lighter)] pb-6 mb-8 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-semibold text-[var(--color-ink)]">{post.author}</div>
                <div className="text-xs">{post.authorRole}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {formatDate(post.publishedAt)}
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {post.readingMinutes} min de lecture
            </div>
          </div>

          <div className="prose prose-lg max-w-none">{renderContent(post.content)}</div>

          <div className="mt-12 p-6 bg-brand-50 rounded-2xl border border-brand-200 flex flex-col sm:flex-row items-center gap-4">
            <BookOpen className="w-10 h-10 text-brand-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold font-display mb-1">Applique ça avec Campus 360</h3>
              <p className="text-sm text-[var(--color-ink-light)]">
                Télécharge l&apos;app, génère tes fiches avec l&apos;IA et commence
                à réviser efficacement.
              </p>
            </div>
            <a
              href="https://campus360b.site/downloads/campus-360.apk"
              download="campus-360.apk"
              className="px-5 py-2.5 bg-amber-cta hover:bg-amber-cta-hover text-white font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              Télécharger
            </a>
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section className="py-16 bg-[var(--color-paper)] border-t border-[var(--color-border)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-extrabold font-display mb-8">
              Articles liés
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="group p-6 bg-white rounded-2xl border border-[var(--color-border)] hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-brand-50 text-brand-700 text-xs font-bold rounded-full mb-3">
                    {p.category}
                  </div>
                  <h3 className="font-bold font-display mb-2 group-hover:text-brand-600 transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-sm text-[var(--color-ink-light)] line-clamp-2">
                    {p.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </SiteShell>
  );
}