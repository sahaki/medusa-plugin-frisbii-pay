import { useMemo } from "react"
import { en } from "./translations/en"
import { da } from "./translations/da"
import type { TranslationKeys } from "./translations/en"

// ─── Internal locale map ─────────────────────────────────────────────────────

const TRANSLATIONS: Record<string, TranslationKeys> = { en, da }

// ─── Locale detection ─────────────────────────────────────────────────────────

/**
 * Maps a BCP 47 browser language tag (e.g. "da-DK", "da", "en-US") to the
 * nearest supported translation key ("en" or "da"). Falls back to "en".
 */
function detectAdminLocale(): "en" | "da" {
  if (typeof navigator === "undefined") return "en"
  const lang = (navigator.language || "en").toLowerCase()
  if (lang.startsWith("da")) return "da"
  return "en"
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns the translation object `t` for the Admin UI.
 * Locale is detected once from `navigator.language` and memoised.
 *
 * @example
 * ```tsx
 * const { t } = useAdminTranslation()
 * <Heading>{t.apiConnection}</Heading>
 * ```
 */
export function useAdminTranslation(): { t: TranslationKeys; locale: "en" | "da" } {
  const locale = useMemo(detectAdminLocale, [])
  const t = TRANSLATIONS[locale] ?? TRANSLATIONS.en
  return { t, locale }
}
