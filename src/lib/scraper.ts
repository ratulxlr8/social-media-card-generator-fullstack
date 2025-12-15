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
import {
  decodeHtmlEntities,
  extractMetaContent,
  extractTitle,
  extractFavicon,
  extractBodyImages as parseBodyImages,
  countImageTags,
  findHeadEndIndex,
  findBodyStartIndex,
  hasHeadEnd,
  hasBodyStart,
} from './htmlParser';

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
        if (hasHeadEnd(collected)) {
          const headEndIndex = findHeadEndIndex(collected);
          if (headEndIndex !== -1) {
            collected = collected.substring(0, headEndIndex);
            headFound = true;
            break;
          }
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
        if (!bodyStartFound && hasBodyStart(collected)) {
          const bodyStartIndex = findBodyStartIndex(collected);
          if (bodyStartIndex !== -1) {
            collected = collected.substring(bodyStartIndex);
            bodyStartFound = true;
          }
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
        imageCount = countImageTags(collected);

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
    return parseBodyImages(
      collected,
      url,
      SCRAPER_CONFIG.MAX_BODY_IMAGES,
      SCRAPER_CONFIG.IGNORED_IMAGE_PATTERNS
    );
  } finally {
    clearTimeout(timeoutId);
  }
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