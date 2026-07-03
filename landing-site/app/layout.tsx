import type { Metadata, Viewport } from "next";
import { Poppins, Open_Sans } from "next/font/google";
import Script from "next/script";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-open-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Campus 360 — La bibliothèque PDF académique pour étudiants",
    template: "%s · Campus 360",
  },
  description:
    "Trouve, prévisualise et achète des PDF académiques en quelques secondes. Wallet intégré, lecture offline et assistant IA. Conçu pour les étudiants africains.",
  keywords: [
    "PDF académiques",
    "bibliothèque étudiante",
    "Campus 360",
    "Campus-Bordes",
    "achat PDF",
    "étudiants",
    "étudiants africains",
    "wallet étudiant",
    "Mobile Money",
    "révisions BAC",
    "PDF licence",
    "PDF master",
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
    title: "Campus 360 — La bibliothèque PDF académique pour étudiants",
    description:
      "Trouve, prévisualise et achète des PDF académiques en quelques secondes. Wallet Mobile Money, lecture offline et assistant IA.",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Campus 360 — La bibliothèque PDF académique pour étudiants",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Campus 360 — La bibliothèque PDF académique pour étudiants",
    description:
      "Trouve, prévisualise et achète des PDF académiques en quelques secondes.",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0ea5e9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c4a6e" },
  ],
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
    <html
      lang="fr"
      className={`${poppins.variable} ${openSans.variable} scroll-smooth`}
    >
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
      <body className="font-sans antialiased bg-white text-[var(--color-ink)]">
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