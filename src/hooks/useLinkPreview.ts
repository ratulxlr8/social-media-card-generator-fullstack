import { useState, useEffect } from 'react';
import type { LinkPreviewResponse } from '@/types/api';

interface PreviewData {
  title: string;
  description: string;
  image: string;
  favicon: string;
  url: string;
  bodyImages?: string[];
}

interface UseLinkPreviewOptions {
  fetchBodyImages?: boolean;
}

interface UseLinkPreviewReturn {
  data: PreviewData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useLinkPreview(url: string, options: UseLinkPreviewOptions = {}): UseLinkPreviewReturn {
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!url) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams({ url });
      if (options.fetchBodyImages) {
        params.set('fetchBodyImages', '1');
      }
      
      const response = await fetch(`/api/link-preview?${params.toString()}`);
      const result: LinkPreviewResponse = await response.json();
      
      if (result.success && result.metadata) {
        setData(result.metadata);
      } else {
        throw new Error(result.error || "Failed to fetch preview data");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [url, options.fetchBodyImages]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}