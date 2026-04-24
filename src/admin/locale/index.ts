import { useMemo } from "react"
import { en } from "./translations/en"
import { da } from "./translations/da"
import type { TranslationKeys } from "./translations/en"

// ─── Internal locale map ─────────────────────────────────────────────────────

const TRANSLATIONS: Record<string, TranslationKeys> = { en, da }

// ─── Locale detection ─────────────────────────────────────────────────────────

/**
 * Maps a config locale string (e.g. "da_DK", "en_GB") or a BCP 47 browser
 * language tag (e.g. "da-DK", "da", "en-US") to the nearest supported
 * translation key ("en" or "da"). Falls back to "en".
 */
function resolveLocaleKey(locale: string): "en" | "da" {
  const lower = locale.toLowerCase()
  if (lower.startsWith("da")) return "da"
  return "en"
}

function detectAdminLocale(overrideLocale?: string): "en" | "da" {
  if (overrideLocale) return resolveLocaleKey(overrideLocale)
  // Access navigator via globalThis to avoid requiring DOM lib in tsconfig.
  const nav = (globalThis as unknown as { navigator?: { language?: string } }).navigator
  return resolveLocaleKey(nav?.language || "en")
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns the translation object `t` for the Admin UI.
 *
 * Pass `overrideLocale` (e.g. `config.locale` from Frisbii settings) to drive
 * translations from the saved config rather than the browser language.
 * Falls back to `navigator.language` when `overrideLocale` is undefined.
 *
 * @example
 * ```tsx
 * const { t } = useAdminTranslation(config?.locale)
 * <Heading>{t.apiConnection}</Heading>
 * ```
 */
export function useAdminTranslation(overrideLocale?: string): { t: TranslationKeys; locale: "en" | "da" } {
  const locale = useMemo(() => detectAdminLocale(overrideLocale), [overrideLocale])
  const t = TRANSLATIONS[locale] ?? TRANSLATIONS.en
  return { t, locale }
}
