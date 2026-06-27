import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Campus 360 Admin',
  description: 'Dashboard admin pour les PDF Campus 360',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
