import { ReactNode } from "react";
import { Navbar } from "./navbar";
import { Footer } from "./footer";

// hidePromo is kept for callers; the promo banner (end date passed) is no longer rendered.
export function SiteShell({ children }: { children: ReactNode; hidePromo?: boolean }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">{children}</main>
      <Footer />
    </>
  );
}
