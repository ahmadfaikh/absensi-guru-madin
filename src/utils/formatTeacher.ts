/**
 * Helper to format teacher names with honorific title (Ust. / Usth.)
 * Examples:
 * - "jamal" -> "Ust. Jamal"
 * - "Jamal" -> "Ust. Jamal"
 * - "Ust Jamal" -> "Ust. Jamal"
 * - "Ust. H. Ahmad Fauzi, S.Pd.I" -> "Ust. H. Ahmad Fauzi, S.Pd.I"
 * - "Usth. Siti Fatimah, S.Ag" -> "Usth. Siti Fatimah, S.Ag"
 */
export function formatTeacherNameWithTitle(
  name?: string | null,
  username?: string | null
): string {
  const raw = (name && name.trim() !== "" ? name.trim() : username?.trim()) || "Guru";
  const clean = raw.replace(/\s+/g, " ");

  // Check for existing honorifics
  const honorificRegex = /^(ust\b|ust\.|usth\b|usth\.|ustadz\b|ustadzah\b|kyai\b|kh\b|kh\.|habib\b|sayyid\b)/i;

  if (honorificRegex.test(clean)) {
    if (/^ust\s+/i.test(clean)) {
      return clean.replace(/^ust\s+/i, "Ust. ");
    }
    if (/^usth\s+/i.test(clean)) {
      return clean.replace(/^usth\s+/i, "Usth. ");
    }
    return clean;
  }

  // Capitalize words if simple string without periods
  const capitalized = clean
    .split(" ")
    .map((word) => {
      if (word.includes(".") || word.length <= 1) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");

  return `Ust. ${capitalized}`;
}
