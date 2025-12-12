# Link Preview API

A high-performance API for extracting metadata from web pages using streaming HTML parsing.

## Features

- **Streaming HTML Parsing**: Only downloads the `<head>` section for optimal performance
- **Industrial Architecture**: Clean separation of concerns with services, utilities, and error handling
- **Type Safety**: Full TypeScript support with proper interfaces
- **Security**: Built-in protection against SSRF and malicious URLs
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Configurable**: Easy to configure timeouts, headers, and security settings

## Endpoints

### GET `/api/link-preview`

Extract metadata from a URL using query parameters.

**Query Parameters:**
- `url` (required): The URL to extract metadata from

**Example Request:**
```bash
GET /api/link-preview?url=https://example.com
```

**Example Success Response:**
```json
{
  "success": true,
  "url": "https://example.com",
  "metadata": {
    "title": "Example Domain",
    "description": "This domain is for use in illustrative examples",
    "image": "https://example.com/image.jpg",
    "favicon": "https://example.com/favicon.ico",
    "url": "https://example.com"
  },
  "timestamp": "2025-12-10T10:20:31.524Z"
}
```

**Example Error Response:**
```json
{
  "success": false,
  "url": "https://example.com",
  "metadata": null,
  "error": "Unable to extract page metadata",
  "timestamp": "2025-12-10T10:20:31.524Z"
}
```



## Response Format

All responses follow a consistent format with these fields:

- `success`: Boolean indicating if the request was successful
- `url`: The URL that was processed (original input URL)
- `metadata`: Object containing extracted data (null on error)
- `error`: Error message (only present when success is false)
- `timestamp`: ISO timestamp of when the response was generated

**Success Response:**
```json
{
  "success": true,
  "url": "https://example.com",
  "metadata": { ... },
  "timestamp": "2025-12-10T10:20:31.524Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "url": "https://example.com",
  "metadata": null,
  "error": "Error message description",
  "timestamp": "2025-12-10T10:20:31.524Z"
}
```

**Common HTTP Status Codes:**
- `400`: Bad Request (invalid URL, missing parameters)
- `403`: Forbidden (blocked domain or access denied)
- `404`: Not Found (page doesn't exist)
- `408`: Request Timeout (page took too long to respond)
- `422`: Unprocessable Entity (no metadata found)
- `500`: Internal Server Error (unexpected error)
- `502`: Bad Gateway (target website issues)
- `503`: Service Unavailable (network error)

## Performance Optimizations

1. **Streaming Parser**: Stops reading as soon as `</head>` is found
2. **Timeout Protection**: 15-second timeout prevents hanging requests
3. **Size Limits**: Maximum 100KB head content to prevent memory issues
4. **Efficient Regex**: Uses optimized regex patterns instead of full DOM parsing

## Security Features

1. **SSRF Protection**: Blocks internal/private network addresses
2. **Protocol Validation**: Only allows HTTP/HTTPS protocols
3. **Domain Blocking**: Configurable blocked domains list
4. **Input Sanitization**: Validates and sanitizes all URLs

## Configuration

The API can be configured via `src/config/scraper.ts`:

```typescript
export const SCRAPER_CONFIG = {
  TIMEOUT: 15000,           // Request timeout (ms)
  MAX_HEAD_SIZE: 100000,    // Max head content size (bytes)
  USER_AGENT: '...',        // User agent string
  BLOCKED_DOMAINS: [...],   // Blocked domains for security
  ALLOWED_PROTOCOLS: [...], // Allowed URL protocols
};
```

## Architecture

```
src/
├── app/api/link-preview/
│   └── route.ts              # API route handlers
├── services/
│   └── linkPreviewService.ts # Business logic layer
├── lib/
│   ├── scraper.ts           # Core scraping functionality
│   ├── validators.ts        # URL validation utilities
│   └── errors.ts            # Error handling utilities
├── config/
│   └── scraper.ts           # Configuration settings
└── types/
    └── api.ts               # TypeScript interfaces
```

## Usage in Frontend

```typescript
// Using fetch
const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
const data = await response.json();

if (data.success) {
  console.log('Title:', data.metadata.title);
  console.log('Description:', data.metadata.description);
  console.log('Image:', data.metadata.image);
  console.log('Timestamp:', data.timestamp);
} else {
  console.error('Error:', data.error);
  console.error('URL:', data.url);
  console.error('Timestamp:', data.timestamp);
}
```