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
    return '';
  }
  
  // Add https:// if no protocol is specified
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  
  return trimmed;
}

/**
 * Validates and sanitizes URL input for frontend use
 */
export function validateAndSanitizeUrl(url: string): { isValid: boolean; sanitized: string; error?: string } {
  if (!url.trim()) {
    return { isValid: false, sanitized: '', error: 'URL cannot be empty' };
  }

  const sanitized = sanitizeUrl(url);
  
  if (!isValidUrl(sanitized)) {
    return { isValid: false, sanitized, error: 'Invalid URL format' };
  }
  
  return { isValid: true, sanitized };
}