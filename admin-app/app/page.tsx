import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Campus 360 — Trouve, prévisualise et achète tes PDF académiques',
  description:
    'La plateforme camerounaise pour les étudiants : catalogue de PDF universitaires, preview gratuite, paiement wallet et lecture sécurisée sur Android.',
  openGraph: {
    title: 'Campus 360 — PDF académiques pour étudiants camerounais',
    description:
      'Catalogue, preview, achat et lecture de PDF académiques. Débloque tes documents en quelques secondes.',
    type: 'website',
    siteName: 'Campus 360',
  },
};

const APK_DOWNLOAD_URL = process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL ?? '/downloads/campus-360.apk';
const APK_VERSION_LABEL = process.env.NEXT_PUBLIC_APK_VERSION ?? 'v1.0.0';
const APK_SIZE_HINT = process.env.NEXT_PUBLIC_APK_SIZE_HINT ?? '~38 Mo';
const APK_RELEASED_AT = process.env.NEXT_PUBLIC_APK_RELEASED_AT ?? 'Juillet 2026';

const FEATURES = [
  {
    icon: '📚',
    title: 'Catalogue filtrable',
    body:
      "Recherche par université, filière, matière ou niveau. Filtres clairs, preview avant achat.",
  },
  {
    icon: '💳',
    title: 'Paiement wallet',
    body:
      'Recharge via MTN MoMo / Orange Money. Solde synchronisé entre web et mobile.',
  },
  {
    icon: '🔒',
    title: 'Lecture sécurisée',
    body:
      "URL signées à chaque ouverture. Le PDF complet n'est jamais public.",
  },
  {
    icon: '🤖',
    title: 'Assistant IA',
    body:
      "Pose une question sur un PDF acheté, l'assistant te répond avec le contexte du document.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-bg text-fg">
      {/* ────────────────── Header ────────────────── */}
      <header className="border-b border-border-light bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              aria-hidden
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-on-primary font-bold shadow-card"
            >
              C3
            </div>
            <div>
              <div className="font-display text-lg font-bold text-fg">Campus 360</div>
              <div className="text-xs text-fg-subtle">bimailu@gmail.com · campus360b.site</div>
            </div>
          </div>
          <nav className="flex items-center gap-3 text-sm font-medium">
            <a
              href="#features"
              className="hidden rounded-lg px-3 py-2 text-fg-muted transition hover:bg-surface-3 sm:inline-flex"
            >
              Fonctionnalités
            </a>
            <a
              href="#download"
              className="hidden rounded-lg px-3 py-2 text-fg-muted transition hover:bg-surface-3 sm:inline-flex"
            >
              Télécharger
            </a>
            <Link
              href="https://admin.campus360b.site/admin/login"
              className="rounded-lg border border-border bg-surface px-4 py-2 text-fg transition hover:bg-surface-2"
            >
              Espace admin
            </Link>
          </nav>
        </div>
      </header>

      {/* ────────────────── Hero ────────────────── */}
      <section className="bg-gradient-to-b from-surface to-bg">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2 md:items-center md:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border-light bg-surface px-3 py-1 text-xs font-semibold text-fg-muted">
              <span className="h-2 w-2 rounded-full bg-success" />
              Disponible sur Android · {APK_RELEASED_AT}
            </span>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight text-fg md:text-5xl">
              Trouve, prévisualise et achète
              <br />
              tes PDF académiques en 3 minutes.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-fg-muted">
              Catalogue camerounais de PDF universitaires. Preview gratuite,
              paiement wallet Mobile Money et lecture sécurisée directement
              dans l&apos;appli Android.
            </p>

            <div id="download" className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href={APK_DOWNLOAD_URL}
                className="inline-flex items-center justify-center gap-3 rounded-xl bg-primary px-6 py-4 font-semibold text-on-primary shadow-card transition hover:bg-primary-hover"
                download
              >
                <span aria-hidden className="text-xl">⬇</span>
                <span className="flex flex-col items-start">
                  <span className="text-xs uppercase opacity-80">Télécharger l&apos;APK</span>
                  <span>Campus 360 Android · {APK_VERSION_LABEL}</span>
                </span>
              </a>
              <span className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-fg-muted">
                {APK_SIZE_HINT} · Android 8+
              </span>
            </div>
            <p className="mt-4 text-xs text-fg-subtle">
              Package : <code className="rounded bg-surface-3 px-1.5 py-0.5">com.campus360b.app</code>
              {' '}&middot; Public signataire : PDF par URL signée uniquement.
            </p>
          </div>

          {/* Mock device frame */}
          <div className="relative mx-auto w-full max-w-md md:max-w-none">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-primary-soft opacity-50 blur-3xl" aria-hidden />
            <div className="relative rounded-[2.5rem] border border-border bg-surface p-6 shadow-card-hover">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-xs font-semibold text-fg-muted">Catalogue</div>
                <div className="rounded-full bg-surface-3 px-3 py-1 text-xs font-medium text-fg-muted">
                  3 PDF trouvés
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  { title: 'Algorithmique avancée', meta: 'L3 · Informatique', price: '1 200 C' },
                  { title: 'Réseaux & Télécoms', meta: 'M1 · Génie Réseaux', price: '1 500 C' },
                  { title: 'Comptabilité générale', meta: 'BTS 2 · Gestion', price: '900 C' },
                ].map((item) => (
                  <li
                    key={item.title}
                    className="flex items-center justify-between rounded-xl border border-border-light bg-surface-2 p-4"
                  >
                    <div>
                      <div className="font-semibold text-fg">{item.title}</div>
                      <div className="text-xs text-fg-subtle">{item.meta}</div>
                    </div>
                    <span className="rounded-lg bg-primary-softer px-3 py-1 text-sm font-bold text-primary-active">
                      {item.price}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex items-center justify-between rounded-xl bg-fg p-4 text-on-primary">
                <div>
                  <div className="text-xs opacity-80">Wallet</div>
                  <div className="font-display text-lg font-bold">3 600 C</div>
                </div>
                <span className="rounded-lg bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wide">
                  Recharge
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────── Features ────────────────── */}
      <section id="features" className="border-y border-border-light bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <div className="text-xs font-bold uppercase tracking-widest text-primary">
              Ce que tu fais avec Campus 360
            </div>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-fg">
              Tout pour réviser sans te ruiner.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-border-light bg-surface p-6 shadow-card transition hover:shadow-card-hover"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-softer text-2xl">
                  {feature.icon}
                </div>
                <h3 className="font-display text-lg font-bold text-fg">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{feature.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────── How it works ────────────────── */}
      <section className="bg-bg">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <div className="text-xs font-bold uppercase tracking-widest text-primary">
              Comment ça marche
            </div>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-fg">
              De l&apos;installation à la première lecture en 3 étapes.
            </h2>
          </div>

          <ol className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Télécharge & installe',
                body:
                  'APK signé Manuellement, installe sur Android 8+ (~38 Mo). Aucune collecte indue.',
              },
                {
                  step: '02',
                  title: 'Crée ton compte & recharge',
                  body:
                  'Email + WhatsApp, université et filière. Recharge via MTN MoMo ou Orange Money.',
                },
                {
                  step: '03',
                  title: 'Achète, lis & annote',
                  body:
                  'Preview gratuite avant achat. Lecture par URL signée, sécurisée dans l\'appli.',
              },
            ].map((step) => (
              <li
                key={step.step}
                className="rounded-2xl border border-border-light bg-surface p-6 shadow-card"
              >
                <div className="font-display text-3xl font-extrabold text-primary">
                  {step.step}
                </div>
                <h3 className="mt-2 font-display text-lg font-bold text-fg">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ────────────────── Final CTA ────────────────── */}
      <section className="border-t border-border-light bg-surface">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-20 text-center">
          <h2 className="font-display text-3xl font-extrabold text-fg md:text-4xl">
            Prêt à réviser plus vite ?
          </h2>
          <p className="mt-4 max-w-xl text-lg text-fg-muted">
            L&apos;APK est gratuit. Tu paies uniquement les PDF que tu achètes
            dans le catalogue, au coin près.
          </p>
          <a
            href={APK_DOWNLOAD_URL}
            className="mt-8 inline-flex items-center gap-3 rounded-xl bg-primary px-7 py-4 font-semibold text-on-primary shadow-card-hover transition hover:bg-primary-hover"
            download
          >
            <span aria-hidden>⬇</span>
            Télécharger Campus 360 · {APK_VERSION_LABEL}
          </a>
        </div>
      </section>

      {/* ────────────────── Footer ────────────────── */}
      <footer className="border-t border-border-light bg-bg">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-8 sm:flex-row sm:items-center">
          <div className="text-sm text-fg-muted">
            &copy; {new Date().getFullYear()} Campus 360 (Campus-Bordes). Conçu pour les étudiants camerounais.
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-fg-muted">
            <a href="mailto:bimailu@gmail.com" className="hover:text-primary">
              Contact
            </a>
            <Link
              href="https://admin.campus360b.site/admin/login"
              className="hover:text-primary"
            >
              Espace admin
            </Link>
            <span className="text-fg-subtle">Package: com.campus360b.app</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
