/**
 * Strip HTML tags from user input to prevent XSS in stored content.
 * Replaces common HTML entities and removes all tags.
 */
export function stripHtml(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

/**
 * Sanitize a string for safe storage — removes HTML and trims whitespace.
 */
export function sanitizeText(input: string, maxLength?: number): string {
  let cleaned = stripHtml(input).trim();
  if (maxLength && cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }
  return cleaned;
}
