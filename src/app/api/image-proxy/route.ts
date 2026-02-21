import { SCRAPER_CONFIG } from '@/config/scraper';
import { NextResponse } from 'next/server';

/**
 * Image proxy API route.
 * Fetches external images server-side and serves them with proper CORS headers.
 * Uses a 2-tier fallback:
 *   Tier 1: Standard fetch with browser-like headers
 *   Tier 2: Puppeteer headless browser (for servers that check TLS/cookies)
 *
 * GET /api/image-proxy?url=<image-url>
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Security: only allow http/https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Only HTTP/HTTPS URLs are allowed' }, { status: 400 });
    }

    // Security: block private networks
    if (SCRAPER_CONFIG.BLOCKED_DOMAINS.some(domain =>
      parsedUrl.hostname.includes(domain) || parsedUrl.hostname.startsWith(domain)
    )) {
      return NextResponse.json({ error: 'URL is not allowed' }, { status: 400 });
    }

    // Tier 1: Standard fetch
    const result = await fetchImageWithFetch(imageUrl, parsedUrl.origin);
    if (result) return result;

    console.warn(`[ImageProxy] Tier 1 failed for ${imageUrl}, falling back to Puppeteer`);

    // Tier 2: Puppeteer headless browser
    const puppeteerResult = await fetchImageWithPuppeteer(imageUrl);
    if (puppeteerResult) return puppeteerResult;

    return NextResponse.json({ error: 'Failed to proxy image after all attempts' }, { status: 502 });

  } catch (error) {
    console.error('Image proxy error:', error);
    return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 });
  }
}

/**
 * Tier 1: Fetch image via standard HTTP request with browser-like headers.
 * Returns a NextResponse on success, or null on failure (so caller can try fallback).
 */
async function fetchImageWithFetch(imageUrl: string, refererOrigin: string): Promise<NextResponse | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        ...SCRAPER_CONFIG.ENHANCED_HEADERS,
        'User-Agent': SCRAPER_CONFIG.USER_AGENT,
        'Referer': refererOrigin,
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      console.warn(`[ImageProxy] Tier 1 HTTP ${response.status} for ${imageUrl}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      console.warn(`[ImageProxy] Tier 1 non-image content-type: ${contentType}`);
      return null;
    }

    const imageBuffer = await response.arrayBuffer();
    return buildImageResponse(imageBuffer, contentType);

  } catch (error) {
    console.warn(`[ImageProxy] Tier 1 fetch error:`, error instanceof Error ? error.message : error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Tier 2: Use Puppeteer to fetch the image as a real browser.
 * Navigates to the image URL and captures the response buffer directly.
 */
async function fetchImageWithPuppeteer(imageUrl: string): Promise<NextResponse | null> {
  let browser;

  try {
    const puppeteer = (await import('puppeteer')).default;

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport(SCRAPER_CONFIG.PUPPETEER.VIEWPORT);
    await page.setUserAgent(SCRAPER_CONFIG.USER_AGENT);

    // Intercept the image response to capture its raw bytes
    let imageBuffer: Buffer | null = null;
    let contentType = 'image/jpeg';

    page.on('response', async (response) => {
      if (response.url() === imageUrl && response.ok()) {
        try {
          const headers = response.headers();
          contentType = headers['content-type'] || 'image/jpeg';
          imageBuffer = await response.buffer();
        } catch {
          // Ignore response capture errors
        }
      }
    });

    await page.goto(imageUrl, {
      waitUntil: 'networkidle0',
      timeout: SCRAPER_CONFIG.PUPPETEER.TIMEOUT,
    });

    if (!imageBuffer) {
      console.warn('[ImageProxy] Puppeteer: no image buffer captured');
      return null;
    }

    return buildImageResponse(imageBuffer, contentType);

  } catch (error) {
    console.warn('[ImageProxy] Puppeteer error:', error instanceof Error ? error.message : error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function buildImageResponse(buffer: ArrayBuffer | Buffer, contentType: string): NextResponse {
  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
