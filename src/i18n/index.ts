import type { Request } from "express";

/**
 * Supported locales
 */
export type Locale = "en" | "fr";

const defaultLocale: Locale = "en";

/**
 * Parse Accept-Language header and return preferred locale
 */
export function getLocale(req: Request): Locale {
  const acceptLanguage = req.headers["accept-language"];
  
  if (!acceptLanguage) {
    return defaultLocale;
  }

  // Parse Accept-Language header (e.g., "en-US,en;q=0.9,fr;q=0.8")
  const languages = acceptLanguage
    .split(",")
    .map((lang) => {
      const parts = lang.split(";");
      const code = parts[0].trim().split("-")[0].toLowerCase();
      const quality = parts[1] ? parseFloat(parts[1].split("=")[1]) : 1.0;
      return { code, quality };
    })
    .sort((a, b) => b.quality - a.quality);

  // Check for supported locales
  for (const lang of languages) {
    if (lang.code === "en" || lang.code === "fr") {
      return lang.code as Locale;
    }
  }

  return defaultLocale;
}

/**
 * Get localized message
 */
export function t(key: string, locale: Locale = defaultLocale, params?: Record<string, string>): string {
  const messages = locale === "fr" ? frMessages : enMessages;
  let message = messages[key] || messages[`errors.${key}`] || key;

  // Replace parameters
  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      message = message.replace(new RegExp(`{{${paramKey}}}`, "g"), paramValue);
    }
  }

  return message;
}

/**
 * English messages
 */
const enMessages: Record<string, string> = {
  "errors.BAD_REQUEST": "Bad request",
  "errors.UNAUTHORIZED": "Unauthorized",
  "errors.FORBIDDEN": "Forbidden",
  "errors.NOT_FOUND": "Not found",
  "errors.TOO_MANY_REQUESTS": "Too many requests",
  "errors.INTERNAL_ERROR": "Internal server error",
  "errors.BAD_GATEWAY": "Bad gateway",
  "errors.SERVICE_UNAVAILABLE": "Service unavailable",
  "validation.required": "This field is required",
  "validation.invalid": "Invalid value",
};

/**
 * French messages
 */
const frMessages: Record<string, string> = {
  "errors.BAD_REQUEST": "Requête invalide",
  "errors.UNAUTHORIZED": "Non autorisé",
  "errors.FORBIDDEN": "Interdit",
  "errors.NOT_FOUND": "Non trouvé",
  "errors.TOO_MANY_REQUESTS": "Trop de requêtes",
  "errors.INTERNAL_ERROR": "Erreur serveur interne",
  "errors.BAD_GATEWAY": "Passerelle défectueuse",
  "errors.SERVICE_UNAVAILABLE": "Service indisponible",
  "validation.required": "Ce champ est requis",
  "validation.invalid": "Valeur invalide",
};
