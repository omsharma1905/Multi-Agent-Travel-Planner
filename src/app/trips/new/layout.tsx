import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Plan a Journey",
  description:
    "Create a personalized journey with your destination, duration, budget, travelers, and preferences.",
};

export default async function NewTripLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect(`${ROUTES.signIn}?redirect=${encodeURIComponent(ROUTES.trips.new)}`);
  }
  return children;
}
