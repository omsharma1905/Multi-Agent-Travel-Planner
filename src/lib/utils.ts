/**
 * @file src/lib/utils.ts
 *
 * Minimal utility layer.
 *
 * Keep this file small and focused. Only add utilities that are
 * actually required by the current implementation.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS class names intelligently, resolving conflicts.
 *
 * @example
 * cn("px-4 py-2", condition && "bg-blue-500", "px-6")
 * // => "py-2 bg-blue-500 px-6"  (px-4 is overridden by px-6)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number as a compact currency string.
 *
 * @example
 * formatCurrency(1500, "USD") // => "$1,500"
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Capitalises the first letter of a string.
 */
export function capitalise(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
