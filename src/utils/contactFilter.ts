/**
 * Strip phones, WhatsApp / Telegram handles, and emails from user text
 * so sellers cannot leak contact details via reviews or notes.
 */
export function sanitizeContactLeak(text: string): string {
  if (!text) return text;

  let out = text;

  // Emails
  out = out.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
    '[gizlendi]'
  );

  // WhatsApp / Telegram / Instagram style prompts
  out = out.replace(
    /\b(whats?\s*app|wp|watsap|telegram|tg|instagram|ig|dm)\b/gi,
    '[gizlendi]'
  );

  // Turkish / intl phone patterns (05xx, +90, spaced digits)
  out = out.replace(
    /(?:\+?90[\s.-]?)?(?:0?5\d{2})[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/g,
    '[gizlendi]'
  );
  out = out.replace(
    /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{2,4}[\s.-]?\d{2,4}/g,
    '[gizlendi]'
  );

  // Long digit runs that look like numbers
  out = out.replace(/\b\d{10,13}\b/g, '[gizlendi]');

  return out.replace(/\s{2,}/g, ' ').trim();
}

export function containsContactLeak(text: string): boolean {
  if (!text.trim()) return false;
  return sanitizeContactLeak(text) !== text.trim();
}

/** Statuses where buyer may see store phone / address / maps. */
export const CONTACT_UNLOCK_STATUSES = [
  'preparing',
  'shipped',
  'delivered',
] as const;

export type ContactUnlockStatus = (typeof CONTACT_UNLOCK_STATUSES)[number];

export function canRevealStoreContact(status: string): boolean {
  return (CONTACT_UNLOCK_STATUSES as readonly string[]).includes(status);
}
