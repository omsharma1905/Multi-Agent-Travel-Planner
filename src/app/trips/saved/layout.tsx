import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Saved Journeys",
  description: "View and manage the journeys you've saved in SafariX.",
};

export default async function SavedTripsLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect(`${ROUTES.signIn}?redirect=${encodeURIComponent(ROUTES.trips.saved)}`);
  }
  return children;
}
