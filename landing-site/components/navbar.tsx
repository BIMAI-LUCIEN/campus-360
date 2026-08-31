import { NavbarClient } from "./navbar-client";
import { getServerSession } from "@/lib/session";

export async function Navbar() {
  const session = await getServerSession();
  return <NavbarClient user={session?.user} />;
}
