export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .slice(0, 50);
}

export function generateUniqueSlug(text: string, suffix?: string): string {
  const base = generateSlug(text);
  return suffix ? `${base}-${suffix}` : base;
}
