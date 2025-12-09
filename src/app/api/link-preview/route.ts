import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
        if (response.status === 403 || response.status === 503) {
             return NextResponse.json({ error: `Target site blocked access (${response.status}). It might be protected by Cloudflare.` }, { status: response.status });
        }
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    // Simple regex to extract OG tags
    const getMetaTag = (property: string) => {
      const regex = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i');
      const match = regex.exec(html);
      return match ? match[1] : null;
    };
    
    // Fallback for title and description
    const getTitle = () => {
        const ogTitle = getMetaTag('og:title');
        if (ogTitle) return ogTitle;
        const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
        return titleMatch ? titleMatch[1] : '';
    };

    const getDescription = () => {
        const ogDesc = getMetaTag('og:description');
        if (ogDesc) return ogDesc;
        const metaDesc = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i.exec(html);
        return metaDesc ? metaDesc[1] : '';
    };

    const getImage = () => {
        return getMetaTag('og:image') || '';
    };

    const getFavicon = () => {
        // Basic favicon extraction
        const linkIcon = /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i.exec(html);
        if (linkIcon) {
            const href = linkIcon[1];
            try {
                return new URL(href, url).toString();
            } catch (e) {
                return '';
            }
        }
        try {
            return new URL('/favicon.ico', new URL(url).origin).toString();
        } catch (e) {
            return '';
        }
    };

    const data = {
      title: getTitle(),
      description: getDescription(),
      image: getImage(),
      favicon: getFavicon(),
      url: url,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('Link preview error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch link preview';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
