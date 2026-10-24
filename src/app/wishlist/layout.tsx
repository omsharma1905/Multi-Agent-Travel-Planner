import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Wishlist",
  description:
    "Keep track of destinations and places you want to explore with SafariX.",
};

export default async function WishlistLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect(`${ROUTES.signIn}?redirect=${encodeURIComponent(ROUTES.wishlist)}`);
  }
  return children;
}
