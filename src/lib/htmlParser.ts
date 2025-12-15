/**
 * HTML Parser Utilities
 * Centralized functions for extracting and parsing HTML content
 */

export type DetectedLanguage = 'bn' | 'en' | 'unknown';

/**
 * Detects the primary language of a text string
 */
export function detectLanguage(text: string): DetectedLanguage {
    if (!text) return 'unknown';

    const hasBangla = /[\u0980-\u09FF]/.test(text);
    const hasEnglish = /[A-Za-z]/.test(text);

    if (hasBangla && !hasEnglish) return 'bn';
    if (hasEnglish && !hasBangla) return 'en';
    if (hasBangla && hasEnglish) return 'unknown'; // mixed

    return 'unknown';
}

/**
 * Decodes HTML entities to their corresponding characters
 */
export function decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#x27;': "'",
        '&#39;': "'",
        '&apos;': "'",
        '&nbsp;': ' ',
        '&copy;': '©',
        '&reg;': '®',
        '&trade;': '™',
        '&hellip;': '…',
        '&mdash;': '—',
        '&ndash;': '–',
        '&lsquo;': "'",
        '&rsquo;': "'",
        '&ldquo;': '"',
        '&rdquo;': '"',
    };

    return text.replace(/&(?:#x?)?[a-zA-Z0-9]+;/g, (entity) => {
        if (entities[entity]) {
            return entities[entity];
        }

        // Handle numeric entities like &#39; or &#x27;
        if (entity.startsWith('&#x')) {
            const hex = entity.slice(3, -1);
            const code = parseInt(hex, 16);
            if (!isNaN(code) && code > 0) {
                return String.fromCharCode(code);
            }
        } else if (entity.startsWith('&#')) {
            const num = entity.slice(2, -1);
            const code = parseInt(num, 10);
            if (!isNaN(code) && code > 0) {
                return String.fromCharCode(code);
            }
        }

        return entity;
    });
}

/**
 * Extracts content from meta tags using regex
 */
export function extractMetaContent(html: string, property: string, isProperty = false): string | undefined {
    const attribute = isProperty ? 'property' : 'name';
    const regex = new RegExp(
        `<meta[^>]+${attribute}=["']${property}["'][^>]+content=["']([^"']+)["']`,
        'i'
    );
    const match = regex.exec(html);
    return match ? decodeHtmlEntities(match[1].trim()) : undefined;
}

/**
 * Extracts title from HTML
 */
export function extractTitle(html: string): string | undefined {
    const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
    return titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : undefined;
}

/**
 * Extracts favicon href from link tags
 */
export function extractFavicon(html: string): string | undefined {
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
 * Extracts image URLs from body HTML content
 */
export function extractBodyImages(bodyHtml: string, baseUrl: string, maxImages: number, ignoredPatterns: readonly RegExp[]): string[] {
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const images: string[] = [];
    let match;

    while ((match = imgRegex.exec(bodyHtml)) !== null && images.length < maxImages) {
        const src = match[1].trim();

        // Skip if matches ignored patterns
        if (ignoredPatterns.some(pattern => pattern.test(src))) {
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
 * Counts img tags in HTML content
 */
export function countImageTags(html: string): number {
    const imgMatches = html.match(/<img[^>]+>/gi) || [];
    return imgMatches.length;
}

/**
 * Finds the index of </head> tag in HTML
 */
export function findHeadEndIndex(html: string): number {
    const headEndPos = html.indexOf('</head>');
    return headEndPos !== -1 ? headEndPos + 7 : -1;
}

/**
 * Finds the index of <body tag in HTML
 */
export function findBodyStartIndex(html: string): number {
    return html.indexOf('<body');
}

/**
 * Checks if HTML contains </head> tag
 */
export function hasHeadEnd(html: string): boolean {
    return html.includes('</head>');
}

/**
 * Checks if HTML contains <body tag
 */
export function hasBodyStart(html: string): boolean {
    return html.includes('<body');
}
