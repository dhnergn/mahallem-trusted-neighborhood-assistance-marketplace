// In-app message content filtering and anti-leak shielding

export interface MessageFilterResult {
  isSafe: boolean;
  sanitizedContent: string;
  flaggedReasons: string[];
  hasExternalContactLeak: boolean;
}

// Regex to catch phone numbers (Turkish and international formats)
// e.g. 0532 123 45 67, +905321112233, 532-123-4567, etc.
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{2}[-.\s]?\d{2}/g;

// Regex to catch external URLs or off-platform handles
const URL_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(wa\.me\/[^\s]+)|(t\.me\/[^\s]+)/gi;

// Suspicious off-platform keywords
const OFF_PLATFORM_KEYWORDS = [
  'whatsapp', 'wp den yaz', 'telegram', 'instagram', 'dm at', 'özelden yaz',
  'iban', 'hesap no', 'banka hesabı', 'elden nakit',
];

/**
 * Screens chat messages to prevent off-platform scams, phishing, and PII leakage
 */
export function filterChatMessage(content: string): MessageFilterResult {
  const flaggedReasons: string[] = [];
  let sanitized = content.trim();
  let hasExternalContactLeak = false;

  // 1. Check for raw external phone numbers
  const phoneMatches = sanitized.match(PHONE_REGEX);
  if (phoneMatches && phoneMatches.some(m => m.replace(/\D/g, '').length >= 10)) {
    flaggedReasons.push('PHONE_NUMBER_DETECTED');
    hasExternalContactLeak = true;
    sanitized = sanitized.replace(PHONE_REGEX, '[Contact Info Shielded]');
  }

  // 2. Check for external URLs (WhatsApp, Telegram, external phishing)
  if (URL_REGEX.test(sanitized)) {
    flaggedReasons.push('EXTERNAL_LINK_DETECTED');
    hasExternalContactLeak = true;
    sanitized = sanitized.replace(URL_REGEX, '[External Link Shielded]');
  }

  // 3. Check for off-platform prompt phrases
  const lower = sanitized.toLowerCase();
  for (const kw of OFF_PLATFORM_KEYWORDS) {
    if (lower.includes(kw)) {
      flaggedReasons.push(`OFF_PLATFORM_KEYWORD: ${kw}`);
    }
  }

  return {
    isSafe: flaggedReasons.length === 0,
    sanitizedContent: sanitized,
    flaggedReasons,
    hasExternalContactLeak,
  };
}
