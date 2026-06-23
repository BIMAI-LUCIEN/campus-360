import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Campus-Bordes Admin',
  description: 'Dashboard admin pour les PDF Campus-Bordes',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
