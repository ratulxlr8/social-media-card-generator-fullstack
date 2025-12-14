import { fetchHeadContent, fetchBodyImages, parseMetadata, normalizeMetadata, type MetaData, type ScrapingOptions } from '@/lib/scraper';
import { validateAndSanitizeUrl } from '@/lib/validators';
import { ScrapingError } from '@/lib/errors';
import { SCRAPER_CONFIG } from '@/config/scraper';

export class LinkPreviewService {
  /**
   * Fetches and processes link preview data
   */
  static async getPreviewData(rawUrl: string, options: ScrapingOptions = {}): Promise<MetaData> {
    try {
      // Validate and sanitize URL
      const url = validateAndSanitizeUrl(rawUrl);

      // Additional security check
      if (!this.isScrapableUrl(url)) {
        throw new ScrapingError('URL is not allowed for scraping', 400);
      }

      // Stream and extract head content
      const headContent = await fetchHeadContent(url);
      
      if (!headContent) {
        throw new ScrapingError('Unable to extract page metadata', 422);
      }

      // Parse metadata from head content
      const scrapedData = parseMetadata(headContent);
      
      // Fetch body images if requested
      if (options.fetchBodyImages) {
        try {
          const bodyImages = await fetchBodyImages(url);
          scrapedData.bodyImages = bodyImages;
        } catch (error) {
          // Don't fail the entire request if body image fetching fails
          console.warn('Failed to fetch body images:', error);
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