import { SCRAPER_CONFIG } from '@/config/scraper';
import puppeteer from 'puppeteer';

/**
 * Tier 2 Fallback: Uses Puppeteer headless browser to bypass bot protection.
 * Launches a real Chromium instance, navigates to the URL, and extracts
 * the head HTML. This passes TLS fingerprinting, JS challenges, and cookie walls.
 */
export async function fetchWithPuppeteer(url: string): Promise<string> {
  let browser;

  try {
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

    // Set a realistic viewport
    await page.setViewport(SCRAPER_CONFIG.PUPPETEER.VIEWPORT);

    // Set a realistic user agent
    await page.setUserAgent(SCRAPER_CONFIG.USER_AGENT);

    // Navigate with timeout
    await page.goto(url, {
      waitUntil: SCRAPER_CONFIG.PUPPETEER.WAIT_UNTIL,
      timeout: SCRAPER_CONFIG.PUPPETEER.TIMEOUT,
    });

    // Extract full head content
    const headHtml = await page.evaluate(() => {
      const head = document.head || document.querySelector('head');
      return head ? head.innerHTML : '';
    });

    if (!headHtml) {
      throw new Error('Puppeteer: No head content found');
    }

    return headHtml;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Tier 2 Fallback for body images: Uses Puppeteer to extract img tags from <body>.
 */
export async function fetchBodyImagesWithPuppeteer(url: string): Promise<string[]> {
  let browser;

  try {
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

    await page.goto(url, {
      waitUntil: SCRAPER_CONFIG.PUPPETEER.WAIT_UNTIL,
      timeout: SCRAPER_CONFIG.PUPPETEER.TIMEOUT,
    });

    // Extract image URLs from the body
    const images = await page.evaluate((maxImages: number, ignoredPatterns: string[]) => {
      const imgs = Array.from(document.body?.querySelectorAll('img') || []);
      const urls: string[] = [];

      for (const img of imgs) {
        if (urls.length >= maxImages) break;

        const src = img.src || img.getAttribute('data-src') || '';
        if (!src || src.startsWith('data:')) continue;

        // Filter ignored patterns
        const isIgnored = ignoredPatterns.some(pattern => new RegExp(pattern, 'i').test(src));
        if (isIgnored) continue;

        // Resolve to absolute URL
        try {
          const absoluteUrl = new URL(src, window.location.href).toString();
          if (!urls.includes(absoluteUrl)) {
            urls.push(absoluteUrl);
          }
        } catch {
          // Skip invalid URLs
        }
      }

      return urls;
    }, SCRAPER_CONFIG.MAX_BODY_IMAGES, SCRAPER_CONFIG.IGNORED_IMAGE_PATTERNS.map(p => p.source));

    return images;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Tier 3 Fallback: Enhanced fetch with additional browser-like headers.
 * Adds Sec-Fetch-* headers and Referer to mimic real browser navigation.
 * Less overhead than Puppeteer but bypasses simpler bot protections.
 */
export async function fetchWithEnhancedHeaders(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SCRAPER_CONFIG.TIMEOUT);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': SCRAPER_CONFIG.USER_AGENT,
        ...SCRAPER_CONFIG.ENHANCED_HEADERS,
      },
    });

    if (!response.ok) {
      throw new Error(`Enhanced fetch HTTP ${response.status}: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No response body available');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let collected = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        collected += chunk;

        // Check if we have the complete head section
        const headEndMatch = collected.toLowerCase().indexOf('</head>');
        if (headEndMatch !== -1) {
          collected = collected.substring(0, headEndMatch);
          break;
        }

        // Prevent collecting too much data
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
 * Tier 3 Fallback for body images: Enhanced fetch with Sec-Fetch headers.
 */
export async function fetchBodyImagesWithEnhancedHeaders(url: string): Promise<string[]> {
  const { extractBodyImages, countImageTags, hasBodyStart, findBodyStartIndex } = await import('./htmlParser');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SCRAPER_CONFIG.TIMEOUT);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': SCRAPER_CONFIG.USER_AGENT,
        ...SCRAPER_CONFIG.ENHANCED_HEADERS,
      },
    });

    if (!response.ok) {
      throw new Error(`Enhanced fetch HTTP ${response.status}: ${response.statusText}`);
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

        if (!bodyStartFound && hasBodyStart(collected)) {
          const bodyStartIndex = findBodyStartIndex(collected);
          if (bodyStartIndex !== -1) {
            collected = collected.substring(bodyStartIndex);
            bodyStartFound = true;
          }
        }

        if (!bodyStartFound) {
          if (collected.length > SCRAPER_CONFIG.MAX_HEAD_SIZE) {
            collected = collected.slice(-SCRAPER_CONFIG.MAX_HEAD_SIZE / 2);
          }
          continue;
        }

        imageCount = countImageTags(collected);

        if (imageCount >= SCRAPER_CONFIG.MAX_BODY_IMAGES ||
          collected.length > SCRAPER_CONFIG.MAX_BODY_SIZE) {
          break;
        }
      }
    } finally {
      reader.releaseLock();
    }

    return extractBodyImages(
      collected,
      url,
      SCRAPER_CONFIG.MAX_BODY_IMAGES,
      SCRAPER_CONFIG.IGNORED_IMAGE_PATTERNS
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
