import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "My Journeys",
  description:
    "Manage your SafariX journeys, saved trips, wishlist, and travel plans.",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect(`${ROUTES.signIn}?redirect=${encodeURIComponent(ROUTES.dashboard)}`);
  }
  return children;
}
