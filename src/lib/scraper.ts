export interface MetaData {
  title: string;
  description: string;
  image: string;
  favicon: string;
  url: string;
  bodyImages?: string[];
}

export interface ScrapedData {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  favicon?: string;
  bodyImages?: string[];
}

export interface ScrapingOptions {
  fetchBodyImages?: boolean;
}

import { SCRAPER_CONFIG } from '@/config/scraper';

/**
 * Streams HTML content and stops when </head> is found
 * This optimizes performance by not downloading the entire page
 */
export async function fetchHeadContent(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SCRAPER_CONFIG.TIMEOUT);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': SCRAPER_CONFIG.USER_AGENT,
        ...SCRAPER_CONFIG.HEADERS,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No response body available');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let collected = '';
    let headFound = false;

    try {
      while (!headFound) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        collected += chunk;
        
        // Check if we have the complete head section
        if (collected.includes('</head>')) {
          const headEndIndex = collected.indexOf('</head>') + 7;
          collected = collected.substring(0, headEndIndex);
          headFound = true;
          break;
        }
        
        // Prevent collecting too much data if head is unusually large
        if (collected.length > SCRAPER_CONFIG.MAX_HEAD_SIZE) {
          break;
        }
      }
    } finally {
      reader.releaseLock();
    }

    return collected;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Extracts content from meta tags using regex
 */
function extractMetaContent(html: string, property: string, isProperty = false): string | undefined {
  const attribute = isProperty ? 'property' : 'name';
  const regex = new RegExp(
    `<meta[^>]+${attribute}=["']${property}["'][^>]+content=["']([^"']+)["']`,
    'i'
  );
  const match = regex.exec(html);
  return match ? match[1].trim() : undefined;
}

/**
 * Extracts title from HTML
 */
function extractTitle(html: string): string | undefined {
  const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  return titleMatch ? titleMatch[1].trim() : undefined;
}

/**
 * Extracts favicon href from link tags
 */
function extractFavicon(html: string): string | undefined {
  const patterns = [
    /<link[^>]+rel=["']icon["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+rel=["']shortcut icon["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match) {
      return match[1].trim();
    }
  }

  return undefined;
}

/**
 * Parses HTML head content and extracts metadata using regex
 */
export function parseMetadata(headHtml: string): ScrapedData {
  return {
    title: extractTitle(headHtml),
    description: extractMetaContent(headHtml, 'description'),
    ogTitle: extractMetaContent(headHtml, 'og:title', true),
    ogDescription: extractMetaContent(headHtml, 'og:description', true),
    ogImage: extractMetaContent(headHtml, 'og:image', true),
    favicon: extractFavicon(headHtml),
  };
}

/**
 * Streams HTML content starting from <body> to extract images
 * Only fetches if fetchBodyImages option is enabled
 */
export async function fetchBodyImages(url: string): Promise<string[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SCRAPER_CONFIG.TIMEOUT);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': SCRAPER_CONFIG.USER_AGENT,
        ...SCRAPER_CONFIG.HEADERS,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No response body available');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let collected = '';
    let bodyStartFound = false;
    let imageCount = 0;

    try {
      while (imageCount < SCRAPER_CONFIG.MAX_BODY_IMAGES) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        collected += chunk;
        
        // Start collecting after <body> tag
        if (!bodyStartFound && collected.includes('<body')) {
          const bodyStartIndex = collected.indexOf('<body');
          collected = collected.substring(bodyStartIndex);
          bodyStartFound = true;
        }
        
        // If we haven't found body yet, continue
        if (!bodyStartFound) {
          // Keep only recent content to avoid memory issues
          if (collected.length > SCRAPER_CONFIG.MAX_HEAD_SIZE) {
            collected = collected.slice(-SCRAPER_CONFIG.MAX_HEAD_SIZE / 2);
          }
          continue;
        }
        
        // Count images found so far
        const imgMatches = collected.match(/<img[^>]+>/gi) || [];
        imageCount = imgMatches.length;
        
        // Stop if we have enough images or too much content
        if (imageCount >= SCRAPER_CONFIG.MAX_BODY_IMAGES || 
            collected.length > SCRAPER_CONFIG.MAX_BODY_SIZE) {
          break;
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Extract and filter images
    return extractBodyImages(collected, url);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Extracts image URLs from body HTML content
 */
function extractBodyImages(bodyHtml: string, baseUrl: string): string[] {
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const images: string[] = [];
  let match;

  while ((match = imgRegex.exec(bodyHtml)) !== null && images.length < SCRAPER_CONFIG.MAX_BODY_IMAGES) {
    const src = match[1].trim();
    
    // Skip if matches ignored patterns
    if (SCRAPER_CONFIG.IGNORED_IMAGE_PATTERNS.some(pattern => pattern.test(src))) {
      continue;
    }
    
    // Resolve relative URLs
    try {
      const resolvedUrl = new URL(src, baseUrl).toString();
      
      // Avoid duplicates
      if (!images.includes(resolvedUrl)) {
        images.push(resolvedUrl);
      }
    } catch {
      // Skip invalid URLs
      continue;
    }
  }

  return images;
}

/**
 * Normalizes and prioritizes metadata for frontend consumption
 */
export function normalizeMetadata(scraped: ScrapedData, originalUrl: string): MetaData {
  const title = scraped.ogTitle || scraped.title || '';
  const description = scraped.ogDescription || scraped.description || '';
  
  // Handle relative URLs for image and favicon
  const resolveUrl = (relativeUrl: string | undefined): string => {
    if (!relativeUrl) return '';
    
    try {
      return new URL(relativeUrl, originalUrl).toString();
    } catch {
      return '';
    }
  };

  const image = resolveUrl(scraped.ogImage);
  const favicon = resolveUrl(scraped.favicon) || resolveUrl('/favicon.ico');

  const result: MetaData = {
    title,
    description,
    image,
    favicon,
    url: originalUrl,
  };

  // Include body images if they exist
  if (scraped.bodyImages && scraped.bodyImages.length > 0) {
    result.bodyImages = scraped.bodyImages;
  }

  return result;
}