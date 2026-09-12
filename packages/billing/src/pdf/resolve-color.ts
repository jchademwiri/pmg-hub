import type { ColorTokens } from "./types";

export const THEME_COLOR_KEYS = [
  "foreground",
  "background",
  "muted",
  "mutedForeground",
  "primary",
  "primaryForeground",
  "border",
  "accent",
  "destructive",
  "success",
  "warning",
  "info",
] as const satisfies (keyof ColorTokens)[];

export type ThemeColorKey = (typeof THEME_COLOR_KEYS)[number];

/**
 * Resolves a color value: theme token key -> hex, or raw CSS color as-is.
 */
export function resolveColor(value: string | undefined | null, colors: ColorTokens): string {
  if (!value) return colors.foreground;
  const key = value as ThemeColorKey;
  return THEME_COLOR_KEYS.includes(key) ? colors[key] : value;
}
