export interface LinkPreviewRequest {
  url: string;
}

export interface LinkPreviewMetadata {
  title: string;
  description: string;
  image: string;
  favicon: string;
  url: string;
}

export interface LinkPreviewSuccessResponse {
  success: true;
  url: string;
  metadata: LinkPreviewMetadata;
  timestamp: string;
}

export interface LinkPreviewErrorResponse {
  success: false;
  url: string;
  metadata: null;
  error: string;
  timestamp: string;
}

export type LinkPreviewResponse = LinkPreviewSuccessResponse | LinkPreviewErrorResponse;