import { SCRAPER_CONFIG } from '@/config/scraper';
import { ScrapingError } from '@/lib/errors';
import { fetchBodyImages, fetchHeadContent, normalizeMetadata, parseMetadata, type MetaData, type ScrapingOptions } from '@/lib/scraper';
import {
  fetchBodyImagesWithEnhancedHeaders,
  fetchBodyImagesWithPuppeteer,
  fetchWithEnhancedHeaders,
  fetchWithPuppeteer,
} from '@/lib/scraperStrategies';
import { validateAndSanitizeUrl } from '@/lib/validators';

type ScrapingTier = 'fetch' | 'puppeteer' | 'enhanced-headers';

export class LinkPreviewService {
  /**
   * Fetches and processes link preview data using a multi-tier fallback chain:
   *   Tier 1: Standard fetch (fast, lightweight)
   *   Tier 2: Puppeteer headless browser (bypasses bot protection)
   *   Tier 3: Enhanced fetch headers (Sec-Fetch-*, Referer)
   */
  static async getPreviewData(rawUrl: string, options: ScrapingOptions = {}): Promise<MetaData> {
    try {
      // Validate and sanitize URL
      const url = validateAndSanitizeUrl(rawUrl);

      // Additional security check
      if (!this.isScrapableUrl(url)) {
        throw new ScrapingError('URL is not allowed for scraping', 400);
      }

      // Fetch head content with fallback chain
      const { content: headContent, tier } = await this.fetchHeadWithFallback(url);

      if (!headContent) {
        throw new ScrapingError('Unable to extract page metadata', 422);
      }

      console.log(`[Scraper] Head content fetched via Tier: ${tier} for ${url}`);

      // Parse metadata from head content
      const scrapedData = parseMetadata(headContent);

      // Fetch body images if requested — use the same tier that succeeded
      if (options.fetchBodyImages) {
        try {
          const bodyImages = await this.fetchBodyImagesWithFallback(url, tier);
          scrapedData.bodyImages = bodyImages;
        } catch (error) {
          // Don't fail the entire request if body image fetching fails
          console.warn('[Scraper] Failed to fetch body images:', error);
          scrapedData.bodyImages = [];
        }
      }

      // Normalize and structure data
      const metadata = normalizeMetadata(scrapedData, url);

      // Validate that we got at least some useful data
      if (!metadata.title && !metadata.description && !metadata.image) {
        throw new ScrapingError('No meaningful metadata found on the page', 422);
      }

      return metadata;
    } catch (error) {
      if (error instanceof ScrapingError) {
        throw error;
      }

      // Re-throw with more context
      throw new ScrapingError(
        `Failed to process link preview: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  /**
   * Attempts to fetch head content using a 3-tier fallback chain.
   * Returns the HTML content and which tier succeeded.
   */
  private static async fetchHeadWithFallback(url: string): Promise<{ content: string; tier: ScrapingTier }> {
    // Tier 1: Standard fetch
    try {
      const content = await fetchHeadContent(url);
      if (content) return { content, tier: 'fetch' };
    } catch (error) {
      console.warn('[Scraper] Tier 1 (fetch) failed:', error instanceof Error ? error.message : error);
    }

    // Tier 2: Puppeteer headless browser
    try {
      const content = await fetchWithPuppeteer(url);
      if (content) return { content, tier: 'puppeteer' };
    } catch (error) {
      console.warn('[Scraper] Tier 2 (puppeteer) failed:', error instanceof Error ? error.message : error);
    }

    // Tier 3: Enhanced headers
    try {
      const content = await fetchWithEnhancedHeaders(url);
      if (content) return { content, tier: 'enhanced-headers' };
    } catch (error) {
      console.warn('[Scraper] Tier 3 (enhanced-headers) failed:', error instanceof Error ? error.message : error);
    }

    throw new ScrapingError('All scraping methods failed for this URL', 502);
  }

  /**
   * Fetches body images using the tier that succeeded for head content,
   * with fallback to other tiers if needed.
   */
  private static async fetchBodyImagesWithFallback(url: string, preferredTier: ScrapingTier): Promise<string[]> {
    // Define fallback order based on which tier succeeded for head
    const tierOrder: ScrapingTier[] = preferredTier === 'fetch'
      ? ['fetch', 'puppeteer', 'enhanced-headers']
      : preferredTier === 'puppeteer'
        ? ['puppeteer', 'enhanced-headers', 'fetch']
        : ['enhanced-headers', 'puppeteer', 'fetch'];

    for (const tier of tierOrder) {
      try {
        switch (tier) {
          case 'fetch':
            return await fetchBodyImages(url);
          case 'puppeteer':
            return await fetchBodyImagesWithPuppeteer(url);
          case 'enhanced-headers':
            return await fetchBodyImagesWithEnhancedHeaders(url);
        }
      } catch (error) {
        console.warn(`[Scraper] Body images Tier (${tier}) failed:`, error instanceof Error ? error.message : error);
        continue;
      }
    }

    return [];
  }

  /**
   * Validates if a URL is scrapable (security and policy checks)
   */
  static isScrapableUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);

      // Check allowed protocols
      if (!SCRAPER_CONFIG.ALLOWED_PROTOCOLS.includes(urlObj.protocol as 'http:' | 'https:')) {
        return false;
      }

      // Block internal/private networks
      if (SCRAPER_CONFIG.BLOCKED_DOMAINS.some(domain =>
        urlObj.hostname.includes(domain) || urlObj.hostname.startsWith(domain)
      )) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }
}