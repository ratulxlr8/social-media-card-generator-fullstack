/**
 * Validates if a string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Sanitizes URL by adding protocol if missing
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  
  if (!trimmed) {
    throw new Error('URL cannot be empty');
  }
  
  // Add https:// if no protocol is specified
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  
  return trimmed;
}

/**
 * Validates and sanitizes URL input
 */
export function validateAndSanitizeUrl(url: string): string {
  const sanitized = sanitizeUrl(url);
  
  if (!isValidUrl(sanitized)) {
    throw new Error('Invalid URL format');
  }
  
  return sanitized;
}