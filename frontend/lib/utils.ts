import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
/** Normalize a confidence value to 0–100 for UI (accepts 0–1 or 0–100, number or string). */
export function percentNumber(
  v: number | string | null | undefined,
  clamp = true
): number {
  if (v === null || v === undefined) return 0
  const n = typeof v === "string" ? parseFloat(v) : v
  if (!isFinite(n)) return 0
  const p = n > 1 ? n : n * 100 // if already percent keep it, if 0–1 scale up
  return clamp ? Math.min(100, Math.max(0, p)) : p
}

/** Format a confidence value as text like "84.8%". */
export function percentText(
  v: number | string | null | undefined,
  digits = 1
): string {
  return `${percentNumber(v).toFixed(digits)}%`
}