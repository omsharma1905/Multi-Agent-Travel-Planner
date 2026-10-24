import type { Metadata } from "next";
import { TripsRepository } from "@/features/trips/repository";

interface TripLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tripId: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tripId: string }>;
}): Promise<Metadata> {
  try {
    const { tripId } = await params;
    if (tripId) {
      const destination = await TripsRepository.getTripDestination(tripId);
      if (destination) {
        return {
          title: `${destination} Journey`,
          description: `Explore your personalized itinerary, transportation, stays, and activities for ${destination} planned with SafariX.`,
        };
      }
    }
  } catch {
    // Fall back to clean title and description on any lookup failure
  }

  return {
    title: "Journey",
    description:
      "Explore your personalized journey, curated accommodations, transportation, and daily itineraries planned with SafariX.",
  };
}

import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { TripsService } from "@/features/trips/service";
import { ROUTES } from "@/lib/constants";

export default async function TripLayout({ children, params }: TripLayoutProps) {
  const user = await getAuthenticatedUser();
  const { tripId } = (await params) || {};
  if (!user) {
    redirect(`${ROUTES.signIn}?redirect=${encodeURIComponent(`/trips/${tripId}`)}`);
  }
  const trip = await TripsService.getTrip(tripId, user.id);
  if (!trip) {
    redirect(ROUTES.dashboard);
  }
  return children;
}
