import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Archived Journeys",
  description:
    "View your completed journeys and revisit the trips you've already taken.",
};

export default async function CompletedTripsLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect(`${ROUTES.signIn}?redirect=${encodeURIComponent(ROUTES.trips.completed)}`);
  }
  return children;
}
