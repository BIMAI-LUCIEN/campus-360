import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Campus 3602 Admin',
  description: 'Dashboard admin pour les PDF Campus 3602',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
