import { ReactNode } from "react";
import { Navbar } from "./navbar";
import { Footer } from "./footer";
import { PromoBanner } from "./promo-banner";

export function SiteShell({ children, hidePromo = false }: { children: ReactNode; hidePromo?: boolean }) {
  return (
    <>
      {!hidePromo && <PromoBanner />}
      <Navbar />
      <main className="min-h-screen pt-16">{children}</main>
      <Footer />
    </>
  );
}