/**
 * Internationalization messages
 * Default: English (en), Secondary: French (fr)
 */

type Locale = "en" | "fr";

const messages: Record<Locale, Record<string, string>> = {
  en: {
    ALLERGEN_MISSING: "Detected undeclared allergen: {0}",
    ALLERGEN_MISSING_HINT: "Add a 'Contains:' statement listing all major allergens present in the product.",
    SERVING_SIZE_MISSING: "Serving size is missing.",
    SERVING_SIZE_MISSING_HINT: "Provide serving size value and unit (e.g., 30 g). Required by US 21 CFR 101.9.",
    SERVING_SIZE_UNIT_UNCOMMON: "Serving size unit '{0}' may be uncommon or non-standard.",
    SERVING_SIZE_UNIT_UNCOMMON_HINT: "Consider using standard units like 'g' (grams) or 'ml' (milliliters).",
    CLAIM_HIGH_PROTEIN_UNSUPPORTED: "Claim 'high protein' may be unsupported. Context shows ~{0} g protein per serving.",
    CLAIM_HIGH_PROTEIN_UNSUPPORTED_HINT: "Ensure ≥ 10 g protein per serving to support 'high protein' claims, or revise the claim.",
    CLAIM_LOW_FAT_UNSUPPORTED: "Claim 'low fat' may be unsupported. Context shows ~{0} g fat per serving.",
    CLAIM_LOW_FAT_UNSUPPORTED_HINT: "Ensure ≤ 3 g fat per serving to support 'low fat' claims, or revise the claim.",
    CLAIM_SUGAR_FREE_UNSUPPORTED: "Claim 'sugar free' may be unsupported. Context shows ~{0} g carbs per serving.",
    CLAIM_SUGAR_FREE_UNSUPPORTED_HINT: "Ensure minimal or zero carbohydrates to support 'sugar free' claims, or revise the claim.",
    CONTAINS_SECTION_MISSING: "Ingredients list found but no explicit 'Contains:' allergen statement.",
    CONTAINS_SECTION_MISSING_HINT: "Add an explicit 'Contains:' section listing all major allergens present.",
  },
  fr: {
    ALLERGEN_MISSING: "Allergène non déclaré détecté: {0}",
    ALLERGEN_MISSING_HINT: "Ajoutez une déclaration 'Contient:' listant tous les allergènes majeurs présents dans le produit.",
    SERVING_SIZE_MISSING: "La taille de la portion est manquante.",
    SERVING_SIZE_MISSING_HINT: "Fournissez la valeur et l'unité de la taille de la portion (ex: 30 g). Requis par US 21 CFR 101.9.",
    SERVING_SIZE_UNIT_UNCOMMON: "L'unité de taille de portion '{0}' peut être inhabituelle ou non standard.",
    SERVING_SIZE_UNIT_UNCOMMON_HINT: "Envisagez d'utiliser des unités standard comme 'g' (grammes) ou 'ml' (millilitres).",
    CLAIM_HIGH_PROTEIN_UNSUPPORTED: "La déclaration 'riche en protéines' peut ne pas être justifiée. Le contexte montre ~{0} g de protéines par portion.",
    CLAIM_HIGH_PROTEIN_UNSUPPORTED_HINT: "Assurez-vous d'avoir ≥ 10 g de protéines par portion pour justifier les déclarations 'riche en protéines', ou révisez la déclaration.",
    CLAIM_LOW_FAT_UNSUPPORTED: "La déclaration 'faible en matières grasses' peut ne pas être justifiée. Le contexte montre ~{0} g de matières grasses par portion.",
    CLAIM_LOW_FAT_UNSUPPORTED_HINT: "Assurez-vous d'avoir ≤ 3 g de matières grasses par portion pour justifier les déclarations 'faible en matières grasses', ou révisez la déclaration.",
    CLAIM_SUGAR_FREE_UNSUPPORTED: "La déclaration 'sans sucre' peut ne pas être justifiée. Le contexte montre ~{0} g de glucides par portion.",
    CLAIM_SUGAR_FREE_UNSUPPORTED_HINT: "Assurez-vous d'avoir des glucides minimaux ou nuls pour justifier les déclarations 'sans sucre', ou révisez la déclaration.",
    CONTAINS_SECTION_MISSING: "Liste d'ingrédients trouvée mais aucune déclaration explicite 'Contient:' pour les allergènes.",
    CONTAINS_SECTION_MISSING_HINT: "Ajoutez une section 'Contient:' explicite listant tous les allergènes majeurs présents.",
  },
};

/**
 * Get localized message
 * @param locale - Language code (en, fr)
 * @param key - Message key
 * @param args - Optional replacement values for {0}, {1}, etc.
 */
export function getMessage(locale: Locale, key: string, ...args: string[]): string {
  const localeMessages = messages[locale] || messages.en;
  let message = localeMessages[key] || messages.en[key] || key;

  // Replace placeholders {0}, {1}, etc. with arguments
  args.forEach((arg, index) => {
    message = message.replace(`{${index}}`, arg);
  });

  return message;
}

