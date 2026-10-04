import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { siteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Campus 360 — Trouve ton stage & révise tes cours avec l'IA",
    template: "%s · Campus 360",
  },
  description:
    "Matching de stage par IA, Générateur de CV officiel RH en 30s, rappels de relance J+7, bibliothèque de 3 500+ PDFs et Wallet Mobile Money Orange/MTN.",
  keywords: [
    "Stage IA",
    "Trouver un stage",
    "Générateur CV",
    "CV officiel RH",
    "Campus 360",
    "PDFs académiques",
    "Mobile Money",
    "Orange Money",
    "MTN MoMo",
    "Cameroun",
    "Afrique",
    "Révisions",
  ],
  authors: [{ name: "Campus 360" }],
  creator: "Campus 360",
  publisher: "Campus 360",
  alternates: {
    canonical: "/",
    languages: {
      "fr-FR": "/",
    },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: siteUrl,
    siteName: "Campus 360",
    title: "Campus 360 — Trouve ton stage & révise tes cours avec l'IA",
    description:
      "L'IA qui trouve les stages adaptés à ta filière, génère ton CV officiel RH en 30s et t'ouvre l'accès à 3 500+ cours d'universités.",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Campus 360 — Trouve ton stage & révise tes cours avec l'IA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Campus 360 — Trouve ton stage & révise tes cours avec l'IA",
    description:
      "Trouve ton stage, génère ton CV officiel RH et révise tes examens avec l'IA.",
    images: ["/images/og-image.png"],
    creator: "@campus360",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "education",
};

export const viewport: Viewport = {
  themeColor: "#0E0E10",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// JSON-LD Organization + WebSite + SoftwareApplication
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Campus 360",
      alternateName: "Campus-Bordes",
      url: siteUrl,
      logo: `${siteUrl}/images/logo.png`,
      description:
        "Bibliothèque PDF académique pour étudiants africains. Achat de PDFs via Mobile Money, lecture offline, assistant IA.",
      sameAs: [
        "https://twitter.com/campus360",
        "https://github.com/BIMAI-LUCIEN/campus-360",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        availableLanguage: ["French", "English"],
        email: "support@campus360b.site",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "Campus 360",
      inLanguage: "fr-FR",
      publisher: { "@id": `${siteUrl}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteUrl}/catalogue?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      name: "Campus 360",
      operatingSystem: "ANDROID, IOS",
      applicationCategory: "EducationalApplication",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "XOF",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.7",
        ratingCount: "128",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/images/icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="application-name" content="Campus 360" />
        <meta name="apple-mobile-web-app-title" content="Campus 360" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="geo.region" content="CM" />
        <meta name="geo.placename" content="Cameroun" />
      </head>
      <body className="font-sans antialiased bg-[var(--color-paper)] text-[var(--color-ink)]">
        <Script
          id="ld-json-org"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
