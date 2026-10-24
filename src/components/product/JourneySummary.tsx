import React from "react";
import { BudgetTier } from "@/types";

interface JourneySummaryProps {
  days: number;
  travelers: number;
  budget?: BudgetTier | string;
  className?: string;
  separator?: string;
}

export function JourneySummary({
  days,
  travelers,
  budget = "moderate",
  className = "",
  separator = "·",
}: JourneySummaryProps) {
  const formatBudget = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "budget":
        return "ESSENTIAL";
      case "moderate":
        return "COMFORT";
      case "premium":
        return "ELEVATED";
      case "luxury":
        return "SIGNATURE";
      default:
        return tier.toUpperCase();
    }
  };

  const daysLabel = `${String(days).padStart(2, "0")} ${days === 1 ? "DAY" : "DAYS"}`;
  const travelersLabel = `${travelers} ${travelers === 1 ? "TRAVELER" : "TRAVELERS"}`;
  const budgetLabel = formatBudget(budget);

  return (
    <div
      className={`font-mono text-xs uppercase tracking-widest text-[#111111]/70 inline-flex items-center flex-wrap gap-2 ${className}`}
    >
      <span>{daysLabel}</span>
      <span className="text-[#111111]/30">{separator}</span>
      <span>{travelersLabel}</span>
      <span className="text-[#111111]/30">{separator}</span>
      <span>{budgetLabel}</span>
    </div>
  );
}
