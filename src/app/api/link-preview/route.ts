import { NextResponse } from 'next/server';
import { LinkPreviewService } from '@/services/linkPreviewService';
import { getErrorMessage } from '@/lib/errors';

function parseBoolean(value: string | null): boolean {
  return value === '1' || value === 'true';
}

export async function GET(request: Request) {
  const timestamp = new Date().toISOString();
  let url = '';

  try {
    const { searchParams } = new URL(request.url);
    const rawUrl = searchParams.get('url');
    const fetchBodyImages = parseBoolean(
      searchParams.get('fetchBodyImages')
    );

    if (!rawUrl) {
      return NextResponse.json(
        { 
          success: false,
          url: '',
          metadata: null,
          error: 'URL parameter is required',
          timestamp
        }, 
        { status: 400 }
      );
    }

    url = rawUrl;

    // Check if URL is scrapable
    if (!LinkPreviewService.isScrapableUrl(rawUrl)) {
      return NextResponse.json(
        { 
          success: false,
          url: rawUrl,
          metadata: null,
          error: 'URL is not scrapable or not allowed',
          timestamp
        }, 
        { status: 400 }
      );
    }

    // Get preview data using service
    const metadata = await LinkPreviewService.getPreviewData(rawUrl,
      { fetchBodyImages }
    );

    return NextResponse.json({
      success: true,
      url: metadata.url,
      metadata: {
        title: metadata.title,
        description: metadata.description,
        image: metadata.image,
        favicon: metadata.favicon,
        url: metadata.url,
        ...(fetchBodyImages && metadata.bodyImages
          ? { bodyImages: metadata.bodyImages }
          : {})
      },
      timestamp
    });

  } catch (error) {
    console.error('Link preview error:', error);
    
    const { message } = getErrorMessage(error);
    
    return NextResponse.json({
      success: false,
      url: url,
      metadata: null,
      error: message,
      timestamp
    });
  }
}


