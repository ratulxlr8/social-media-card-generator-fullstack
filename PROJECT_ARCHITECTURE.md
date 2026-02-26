# Social Media Card Generator — Complete Project Architecture

> **Purpose**: This document gives any AI model, chatbot, or developer full context to understand, navigate, modify, or extend this codebase without reading individual files. Updated **February 2026**.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Project File Tree](#3-project-file-tree)
4. [Architecture Diagram](#4-architecture-diagram)
5. [Data Flow](#5-data-flow)
6. [Entry Points & Routing](#6-entry-points--routing)
7. [API Routes](#7-api-routes)
8. [Backend Scraping Engine](#8-backend-scraping-engine)
9. [Frontend — Main Component SocialCardEditor](#9-frontend--main-component-socialcardeditor)
10. [Canvas System (Fabric.js)](#10-canvas-system-fabricjs)
11. [Alternative Components (Unused in Main Flow)](#11-alternative-components-unused-in-main-flow)
12. [Shared Libraries](#12-shared-libraries)
13. [Type System](#13-type-system)
14. [Design System & Styling](#14-design-system--styling)
15. [Configuration Files](#15-configuration-files)
16. [Conventions & Patterns](#16-conventions--patterns)
17. [Security Model](#17-security-model)
18. [Known Quirks & Technical Debt](#18-known-quirks--technical-debt)
19. [Extension Guide](#19-extension-guide)

---

## 1. Project Overview

**Social Media Card Generator** is a full-stack Next.js application that:

1. Takes any URL as input
2. Scrapes the page's OpenGraph/meta tags (title, description, image) via a server-side API
3. Renders the scraped content onto an interactive **Fabric.js canvas** (1080×810, 4:3 ratio)
4. Lets the user drag/resize/rotate/edit all elements
5. Exports the card as a high-resolution PNG (1080×810)

The primary use case is generating social media cards for Bangla and English news articles. The app auto-detects Bengali text and adjusts the subtitle accordingly.

---

## 2. Tech Stack & Dependencies

| Layer | Technology | Version | Notes |
|---|---|---|---|
| **Framework** | Next.js (App Router) | 16.1.6 | `pnpm run dev` starts on port 3004 |
| **Language** | TypeScript | 5.x | Strict mode enabled |
| **React** | React + React DOM | 19.2.0 | — |
| **Canvas** | Fabric.js | 5.3.0 | Loaded from CDN at runtime (not npm) |
| **Styling** | Tailwind CSS v4 | 4.x | via `@tailwindcss/postcss` |
| **CSS Animations** | tw-animate-css | 1.4.0 | Tailwind animation plugin |
| **UI Primitives** | Radix UI | Dialog 1.1.15, Tooltip 1.2.8 | Shadcn/ui new-york style |
| **Icons** | Lucide React | 0.555.0 | Used in dialog close button |
| **Image Export** | html-to-image | 1.11.13 | Used only in `LinkPreview.tsx` (alt path) |
| **Scraping** | Puppeteer | 24.37.5 | Headless Chromium for bot-protected sites |
| **Fonts** | Google Fonts | — | Geist, Geist Mono, Noto Serif Bengali |
| **Package Manager** | pnpm | — | Workspace enabled (`pnpm-workspace.yaml`) |
| **Maps** | react-simple-maps | 3.0.0 | Installed; `bd-all.geo.json` in `/public` |
| **Utilities** | clsx + tailwind-merge | — | Combined in `cn()` helper |

### Quick Start

```bash
pnpm install
pnpm run dev        # → http://localhost:3004
pnpm run build      # production build
pnpm run lint       # eslint
```

---

## 3. Project File Tree

```
social-media-card-generator-fullstack/
├── public/
│   ├── bd-all.geo.json            # Bangladesh GeoJSON (for react-simple-maps)
│   ├── file.svg / globe.svg / next.svg / vercel.svg / window.svg
│   └── (default Next.js assets)
│
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── image-proxy/
│   │   │   │   └── route.ts       ← GET /api/image-proxy?url=<IMG_URL>
│   │   │   └── link-preview/
│   │   │       ├── route.ts       ← GET /api/link-preview?url=<URL>&fetchBodyImages=1
│   │   │       └── README.md      ← API documentation
│   │   ├── globals.css            ← Tailwind v4 config + glassmorphic utilities + canvas CSS overrides
│   │   ├── layout.tsx             ← Root layout: Geist + Geist Mono + Noto Serif Bengali fonts
│   │   └── page.tsx               ← "use client"; renders <SocialCardEditor />
│   │
│   ├── components/
│   │   ├── SocialCardEditor.tsx   ← ★ MAIN COMPONENT (694 lines) — all state, canvas, API calls
│   │   ├── CardDesign.tsx         ← HTML-based card (forwardRef) — used by LinkPreview.tsx
│   │   ├── LinkPreview.tsx        ← Hook-based preview + html-to-image download — NOT active
│   │   └── ui/
│   │       ├── dialog.tsx         ← Radix Dialog (Shadcn/ui)
│   │       ├── loading.tsx        ← <LoadingCard /> and <LoadingSpinner />
│   │       └── tooltip.tsx        ← Radix Tooltip (Shadcn/ui)
│   │
│   ├── config/
│   │   └── scraper.ts             ← SCRAPER_CONFIG — timeouts, limits, headers, Puppeteer config
│   │
│   ├── hooks/
│   │   └── useLinkPreview.ts      ← Custom hook for link-preview API (used by LinkPreview.tsx only)
│   │
│   ├── lib/
│   │   ├── errors.ts              ← ScrapingError, ValidationError, NetworkError, getErrorMessage()
│   │   ├── htmlParser.ts          ← detectLanguage(), decodeHtmlEntities(), extractMetaContent(), etc.
│   │   ├── scraper.ts             ← fetchHeadContent(), fetchBodyImages(), parseMetadata(), normalizeMetadata()
│   │   ├── scraperStrategies.ts   ← Tier 2/3 fallbacks: Puppeteer + enhanced headers
│   │   ├── utils.ts               ← cn() helper (clsx + tailwind-merge)
│   │   └── validators.ts          ← isValidUrl(), sanitizeUrl(), validateAndSanitizeUrl() (server-side)
│   │
│   ├── services/
│   │   └── linkPreviewService.ts  ← LinkPreviewService class — 3-tier fallback orchestrator
│   │
│   ├── types/
│   │   └── api.ts                 ← LinkPreviewRequest, LinkPreviewMetadata, LinkPreviewResponse types
│   │
│   └── utils/
│       └── urlUtils.ts            ← Client-side URL utilities (duplicate of some lib/validators.ts funcs)
│
├── package.json                   ← name: "card-maker", port: 3004
├── tsconfig.json                  ← paths: @/* → ./src/*
├── next.config.ts                 ← Empty config (no custom options)
├── postcss.config.mjs             ← @tailwindcss/postcss plugin
├── eslint.config.mjs              ← next core-web-vitals + typescript
├── components.json                ← Shadcn/ui config (new-york style, slate base)
├── pnpm-workspace.yaml            ← Workspace root
├── CODEBASE_KNOWLEDGE.md          ← Previous knowledge base (partially outdated)
├── FRONTEND_ARCHITECTURE.md       ← Previous frontend docs (partially outdated)
└── README.md                      ← Default Next.js README
```

---

## 4. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     BROWSER (CLIENT)                        │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              SocialCardEditor.tsx                      │  │
│  │  ┌─────────┐  ┌────────────┐  ┌──────────────────┐   │  │
│  │  │URL Input│→ │ fetchOgData│→ │ renderCardContent │   │  │
│  │  └─────────┘  └─────┬──────┘  └────────┬─────────┘   │  │
│  │                     │                   │             │  │
│  │              fetch("/api/        fabric.Canvas        │  │
│  │              link-preview")      (1080×810)           │  │
│  │                     │                   │             │  │
│  │  Images use: ───────┼── getProxiedImageUrl() ────┐   │  │
│  │  "/api/image-proxy?url=..."                      │   │  │
│  └─────────────────────┼────────────────────────────┼───┘  │
│                        │                            │      │
└────────────────────────┼────────────────────────────┼──────┘
                         │                            │
                         ▼                            ▼
┌────────────────────────────────────────────────────────────┐
│                   NEXT.JS SERVER                           │
│                                                            │
│  ┌──────────────────────┐    ┌─────────────────────────┐   │
│  │ /api/link-preview    │    │ /api/image-proxy        │   │
│  │                      │    │                         │   │
│  │ LinkPreviewService   │    │ 2-tier fallback:        │   │
│  │ 3-tier fallback:     │    │ 1. Standard fetch       │   │
│  │ 1. Standard fetch    │    │ 2. Puppeteer            │   │
│  │ 2. Puppeteer         │    │                         │   │
│  │ 3. Enhanced headers  │    │ Returns image bytes     │   │
│  │                      │    │ with CORS headers       │   │
│  │ Returns: title, desc,│    └─────────────────────────┘   │
│  │ image, favicon,      │                                  │
│  │ bodyImages[]         │                                  │
│  └──────────────────────┘                                  │
│                                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │          Scraping Layer                             │    │
│  │  scraper.ts → htmlParser.ts → validators.ts        │    │
│  │  scraperStrategies.ts (Puppeteer + Enhanced fetch) │    │
│  │  config/scraper.ts (timeouts, limits, headers)     │    │
│  └────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│                  EXTERNAL WEBSITES                         │
│                                                            │
│   Target URLs scraped for OG metadata + body images        │
│   Target image URLs proxied for CORS bypass                │
└────────────────────────────────────────────────────────────┘
```

---

## 5. Data Flow

### Main Flow: URL → Card

```
1. User pastes URL into sidebar input
2. handleUrlSubmit() calls fetchOgData(url)
3. fetchOgData() → GET /api/link-preview?url=...&fetchBodyImages=0|1
4. Server: LinkPreviewService.getPreviewData()
   a. validateAndSanitizeUrl(url)
   b. fetchHeadWithFallback(url) → tries Tier 1/2/3
   c. parseMetadata(headHtml) → extracts og:title, og:image, etc.
   d. (optional) fetchBodyImagesWithFallback(url)
   e. normalizeMetadata() → resolves relative URLs, prioritizes OG fields
5. Response → client receives { success, metadata: { title, description, image, bodyImages } }
6. Client updates React state (title, description, imageUrl, bodyImages, allImages)
7. renderCard(title, imageUrl) → renderCardContent()
   a. Clears canvas (keeps grid lines + non-selectable objects)
   b. Creates white background rect (1080×810)
   c. Creates title Textbox (font: Noto Serif Bengali, centered)
   d. Loads image via fabric.Image.fromURL(getProxiedImageUrl(url))
      - Image URL routed through /api/image-proxy to bypass CORS
   e. Creates subtitle Textbox (auto: Bengali or English based on detectLanguage())
8. User can drag/resize/rotate/edit any element
9. downloadCard() → canvas.toDataURL({ format: 'png', multiplier: 1 }) → 1080×810 PNG download
```

### Image CORS Proxy Flow

```
1. Any external image URL in SocialCardEditor → getProxiedImageUrl(url)
2. Returns "/api/image-proxy?url=<encoded_url>"
3. Server fetches image:
   a. Tier 1: Standard fetch with browser-like headers
   b. Tier 2: Puppeteer headless browser (if Tier 1 fails)
4. Returns raw image bytes with Access-Control-Allow-Origin: *
5. Cache-Control: public, max-age=86400
```

---

## 7. API Routes

### `GET /api/link-preview`

**File**: `src/app/api/link-preview/route.ts`

| Param | Required | Description |
|---|---|---|
| `url` | Yes | Target URL to scrape |
| `fetchBodyImages` | No | `"1"` or `"true"` to also extract `<img>` tags from body |

**Success Response** (`200`):
```json
{
  "success": true,
  "url": "https://example.com",
  "metadata": {
    "title": "Page Title",
    "description": "Page description",
    "image": "https://example.com/og-image.jpg",
    "favicon": "https://example.com/favicon.ico",
    "url": "https://example.com",
    "bodyImages": ["https://example.com/img1.jpg", "..."]
  },
  "timestamp": "2026-02-26T..."
}
```

**Error Response** (`400 | 5xx`):
```json
{
  "success": false,
  "url": "...",
  "metadata": null,
  "error": "Error message",
  "timestamp": "..."
}
```

### `GET /api/image-proxy`

**File**: `src/app/api/image-proxy/route.ts`

| Param | Required | Description |
|---|---|---|
| `url` | Yes | External image URL to proxy |

**Success**: Returns raw image bytes with `Content-Type` from origin and CORS headers.
**Error**: `400` (invalid/blocked URL), `500` (fetch error), `502` (all tiers failed).

**Security**: Validates URL protocol (http/https only), blocks private networks using `SCRAPER_CONFIG.BLOCKED_DOMAINS`.

---

## 8. Backend Scraping Engine

### 3-Tier Fallback Chain (`LinkPreviewService`)

**File**: `src/services/linkPreviewService.ts`

The scraper uses a progressive fallback strategy:

| Tier | Method | When Used | File |
|---|---|---|---|
| **1** | Standard `fetch` with `User-Agent` + `Accept` headers | First attempt (fastest) | `lib/scraper.ts` |
| **2** | Puppeteer headless Chromium | When Tier 1 fails (bypasses TLS fingerprinting, JS challenges) | `lib/scraperStrategies.ts` |
| **3** | Enhanced `fetch` with `Sec-Fetch-*`, `Referer`, `Cache-Control` headers | When Tier 2 fails (bypasses simpler bot detection) | `lib/scraperStrategies.ts` |

The tier that succeeds for head content is tried first for body images.

### Scraping Pipeline

```
fetchHeadContent(url)          # Streams HTML, stops at </head> (max 100KB)
    ↓
parseMetadata(headHtml)        # Regex extraction of <title>, og:*, meta[name=*], favicon
    ↓
fetchBodyImages(url)           # (optional) Streams from <body>, collects up to 10 <img> tags (max 500KB)
    ↓
normalizeMetadata(scraped, url)  # OG fields prioritized, relative URLs resolved
```

### Key Functions in `lib/scraper.ts`

| Function | Description |
|---|---|
| `fetchHeadContent(url)` | Streams HTML via `response.body.getReader()`, stops at `</head>` tag. Uses `AbortController` with 15s timeout. Max 100KB. |
| `parseMetadata(headHtml)` | Extracts: `<title>`, `meta[name=description]`, `og:title`, `og:description`, `og:image`, favicon links |
| `fetchBodyImages(url)` | Streams from `<body>`, counts `<img>` tags, stops at 10 images or 500KB. Filters out data URIs, SVGs, tracking pixels. |
| `normalizeMetadata(scraped, url)` | OG fields take priority over plain meta. Resolves relative URLs via `new URL(relative, base)`. |

### Key Functions in `lib/htmlParser.ts`

| Function | Description |
|---|---|
| `detectLanguage(text)` | Returns `'bn'` (Bengali via `\u0980-\u09FF`), `'en'`, or `'unknown'` |
| `decodeHtmlEntities(text)` | Handles `&amp;`, `&lt;`, numeric entities (`&#39;`, `&#x27;`), named entities |
| `extractMetaContent(html, prop, isProperty?)` | Regex for both `<meta name="..." content="...">` and `<meta content="..." property="...">` orderings |
| `extractTitle(html)` | Regex for `<title>...</title>` |
| `extractFavicon(html)` | Checks `rel="icon"`, `"shortcut icon"`, `"apple-touch-icon"` |
| `extractBodyImages(bodyHtml, baseUrl, max, ignored)` | Returns resolved absolute URLs, deduplicated |

### Scraper Configuration (`config/scraper.ts`)

```typescript
SCRAPER_CONFIG = {
  TIMEOUT: 15000,              // 15s timeout
  MAX_HEAD_SIZE: 100_000,      // 100KB head limit
  MAX_BODY_SIZE: 500_000,      // 500KB body limit
  MAX_BODY_IMAGES: 10,         // max images from body
  MIN_IMAGE_SIZE: 100,         // min dimension filter
  USER_AGENT: 'Chrome/120...',
  HEADERS: { Accept, Accept-Language, Accept-Encoding, DNT, Connection, Upgrade-Insecure-Requests },
  ENHANCED_HEADERS: { ...HEADERS, Referer: 'google.com', Sec-Fetch-Dest/Mode/Site/User, Cache-Control },
  BLOCKED_DOMAINS: ['localhost', '127.0.0.1', '0.0.0.0', '10.', '192.168.', '172.16.'],
  ALLOWED_PROTOCOLS: ['http:', 'https:'],
  PUPPETEER: { TIMEOUT: 20000, WAIT_UNTIL: 'domcontentloaded', VIEWPORT: { width: 1280, height: 720 } },
  IGNORED_IMAGE_PATTERNS: [/^data:/, /\.svg$/i, /tracking|analytics|pixel|beacon/i, /favicon|icon/i]
}
```

---

## 9. Frontend — Main Component `SocialCardEditor`

**File**: `src/components/SocialCardEditor.tsx` (694 lines)

This single component owns all state, canvas operations, API calls, and UI rendering.

### State Variables

```typescript
urlInput: string              // controlled URL text input
isLoading: boolean            // fetch in progress
fetchBodyImages: boolean      // checkbox: whether to scrape body imgs
title: string                 // fetched or default title
description: string           // fetched or default description
imageUrl: string              // currently selected image URL
ogData: LinkPreviewResponse | null  // full API response
bodyImages: string[]          // body-scraped images only
allImages: string[]           // [main image, ...bodyImages]

canvasRef: RefObject<HTMLCanvasElement>     // DOM canvas element
fabricCanvasRef: RefObject<FabricCanvas>    // Fabric.js instance
```

### Key Functions

| Function | What It Does |
|---|---|
| `getProxiedImageUrl(url)` | Routes external URLs through `/api/image-proxy`. Passes through `data:`, `blob:`, `/` URLs unchanged. |
| `initializeCanvas()` | Creates `fabric.Canvas(1080×810)`, adds grid lines (54px spacing), sets bg `#2c3e50` |
| `fetchOgData(url)` | Calls `/api/link-preview`, updates all state, calls `renderCard()` |
| `loadApiData()` | Loads default placeholder card ("Enter a URL to fetch metadata") |
| `handleUrlSubmit(e)` | Form submit handler → calls `fetchOgData()` |
| `renderCard(title, imgUrl)` | Delegates to `renderCardContent()` |
| `renderCardContent(title, imgUrl, canvas)` | Clears selectable objects, adds: white bg rect → title Textbox → image → subtitle Textbox |
| `downloadCard()` | `canvas.toDataURL({ format:'png', multiplier:1, width:1080, height:810 })` → triggers download as `social-card-1080x810.png` |
| `addText()` | Adds new draggable `fabric.Textbox` at center |
| `addImageFromFile()` | File input → FileReader → `fabric.Image.fromURL` → adds to canvas |
| `addImageFromUrl()` | `prompt()` → `fabric.Image.fromURL(getProxiedImageUrl(url))` → adds to canvas |
| `deleteSelected()` | Removes active canvas object (only if `selectable !== false`) |
| `reloadFromApi()` | Resets to default placeholder card |
| `handleImageSelect(url)` | Changes selected image and re-renders card |

### UI Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ Header: "Social Card Editor"                     [⬇ Download]   │
├───────────────────────────────────┬──────────────────────────────┤
│                                   │ ┌──────────────────────────┐ │
│                                   │ │ FETCH PREVIEW            │ │
│                                   │ │ [URL input............]  │ │
│                                   │ │ ☐ Extract body images    │ │
│       CANVAS (8 cols)             │ │ [     Fetch      ]       │ │
│       1080×810 (4:3)              │ ├──────────────────────────┤ │
│       Scaled to fit               │ │ TOOLS (3×2 grid)         │ │
│       via CSS overrides           │ │ [+Text] [Upload] [URL]   │ │
│                                   │ │ [Delete] [Reset] [Save]  │ │
│                                   │ ├──────────────────────────┤ │
│                                   │ │ IMAGES (grid, scrollable)│ │
│                                   │ │ Click to swap into card  │ │
│                                   │ ├──────────────────────────┤ │
│                                   │ │ METADATA (title, desc)   │ │
│                                   │ ├──────────────────────────┤ │
│                                   │ │ TIPS                     │ │
│                                   │ └──────────────────────────┘ │
└───────────────────────────────────┴──────────────────────────────┘
Grid: lg:grid-cols-12 → Canvas=col-span-8, Sidebar=col-span-4
Background: bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900
```

---

## 10. Canvas System (Fabric.js)

### Loading

Fabric.js is loaded from CDN via `<script>` tag injected in `useEffect`. The global `fabric` object is accessed directly:

```typescript
declare global { const fabric: any; }
// Guard: if (typeof fabric === 'undefined') return;
```

### Canvas Dimensions

- **Internal resolution**: 1080×810 pixels (4:3 aspect ratio)
- **Grid spacing**: 54px (creates a 20×15 grid)
- **Background color**: `#2c3e50` (dark blue-gray)
- **CSS preview**: Wrapper class `.canvas-preview-wrapper` scales the canvas down:
  - `max-width: 540px`, `aspect-ratio: 4 / 3`
  - All canvases inside get `width: 100% !important; height: 100% !important`

### Canvas Object Hierarchy

```
Canvas (1080×810)
├── Grid Lines (selectable: false, evented: false) — NEVER removed
├── White Background Rect (selectable: false) — re-created on each render
├── Title Textbox (y=54, centered, Noto Serif Bengali, font-size 42)
├── Image (positioned within 54–972 × 130–590 area, aspect-ratio-aware)
└── Subtitle Textbox (y=720, centered, font-size 28, auto-language)
```

### Image Aspect Ratio Logic

```
If |imgAspectRatio - 16/9| > 0.5 → Force 16:9 crop
Otherwise → Fit proportionally within image area
Image area: x=54..972, y=130..(810-220)
```

### Export

```typescript
canvas.toDataURL({ format: 'png', quality: 1, multiplier: 1, width: 1080, height: 810 })
// Downloads as social-card-1080x810.png
```

### Canvas Cleanup

- `useEffect` cleanup: `fabricCanvasRef.current.dispose()` + remove CDN script
- Object clearing: Only removes objects where `obj.selectable !== false` (preserves grid)

---

## 11. Alternative Components (Unused in Main Flow)

These exist but are **NOT rendered** in the current app:

### `CardDesign.tsx`

- Simple HTML card component (not canvas-based)
- Props: `title`, `onTitleChange`, `image`
- Uses `forwardRef<HTMLDivElement>` for html-to-image capture
- Renders: Header (editable textarea) → Body (img) → Footer (language-aware text)
- Uses `detectLanguage()` for Bengali subtitle

### `LinkPreview.tsx`

- Uses `useLinkPreview(url)` custom hook (not direct fetch)
- Renders `<CardDesign>` + Download button using `html-to-image` (`toPng`, `pixelRatio: 3`)
- Has loading/error/retry UI states
- Would be an alternative to the Fabric.js canvas approach

### `useLinkPreview.ts` Hook

```typescript
useLinkPreview(url: string, options?: { fetchBodyImages?: boolean })
// Returns: { data: PreviewData | null, loading, error, refetch }
// Triggers on url or fetchBodyImages change
```

---

## 12. Shared Libraries

### `lib/errors.ts`

| Export | Description |
|---|---|
| `ScrapingError` | `extends Error` — adds `statusCode: number` and optional `code: string` |
| `ValidationError` | `extends Error` — for invalid input |
| `NetworkError` | `extends Error` — adds optional `statusCode` |
| `getErrorMessage(error)` | Maps common HTTP/fetch errors to user-friendly messages with status codes |

### `lib/utils.ts`

```typescript
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
```

### `lib/validators.ts` (Server-side)

```typescript
isValidUrl(url) → boolean       // http/https only
sanitizeUrl(url) → string       // adds https:// if missing, throws on empty
validateAndSanitizeUrl(url)      // sanitize + validate, throws on invalid
```

### `utils/urlUtils.ts` (Client-side)

```typescript
isValidUrl(url) → boolean              // same as lib/validators
sanitizeUrl(url) → string              // returns '' instead of throwing
validateAndSanitizeUrl(url) → { isValid, sanitized, error? }  // returns object instead of throwing
```

> Note: There is duplication between `lib/validators.ts` and `utils/urlUtils.ts`. The server-side version throws errors; the client-side version returns error objects.

---

## 13. Type System

**File**: `src/types/api.ts`

```typescript
interface LinkPreviewRequest {
  url: string;
  fetchBodyImages?: boolean;
}

interface LinkPreviewMetadata {
  title: string;
  description: string;
  image: string;
  favicon: string;
  url: string;
  bodyImages?: string[];    // only present if requested
}

interface LinkPreviewSuccessResponse {
  success: true;
  url: string;
  metadata: LinkPreviewMetadata;
  timestamp: string;
}

interface LinkPreviewErrorResponse {
  success: false;
  url: string;
  metadata: null;
  error: string;
  timestamp: string;
}

type LinkPreviewResponse = LinkPreviewSuccessResponse | LinkPreviewErrorResponse;
```

**Internal Types** in `lib/scraper.ts`:

```typescript
interface MetaData { title, description, image, favicon, url, bodyImages? }
interface ScrapedData { title?, description?, ogTitle?, ogDescription?, ogImage?, favicon?, bodyImages? }
interface ScrapingOptions { fetchBodyImages?: boolean }
```

**Fabric.js Types**: All typed as `any` via local declarations:
```typescript
type FabricObject = any;
type FabricCanvas = any;
```

---

## 14. Design System & Styling

### Theme

- **Mode**: Dark (glassmorphic)
- **Background**: `bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900`
- **Card panels**: `backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl`
- **Accent**: Purple (`bg-purple-500`, `border-purple-500/50`)
- **Glow effects**: Fixed positioned `bg-purple-500/15` and `bg-blue-500/15` blur spheres

### CSS Architecture (`globals.css`)

- Tailwind v4 with `@import "tailwindcss"` and `@import "tw-animate-css"`
- Custom CSS variables for light/dark themes using `oklch()` color space
- Shadcn/ui design tokens (`--background`, `--foreground`, `--primary`, `--card`, etc.)
- Custom utilities:
  - `.font-noto-serif-bengali` — Bengali font family
  - `.glass-panel` — backdrop-blur + semi-transparent background + border + shadow
  - `.glass-button:hover` — lift effect (`translateY(-2px)`) + increased blur
  - `.glass-transition` — smooth cubic-bezier transition
- Canvas CSS overrides (`.canvas-preview-wrapper .canvas-container` → responsive 4:3 preview)
- Font-face declaration for `Noto Serif Bengali` (local loading for canvas use)
- Float animation keyframes with delay utilities

### Shadcn/ui Configuration

```json
{
  "style": "new-york",
  "rsc": true,
  "tailwind": { "baseColor": "slate", "cssVariables": true },
  "iconLibrary": "lucide",
  "aliases": { "@/components", "@/lib/utils", "@/components/ui", "@/lib", "@/hooks" }
}
```

---

## 15. Configuration Files

| File | Purpose |
|---|---|
| `package.json` | `name: "card-maker"`, dev port 3004, dependencies list |
| `tsconfig.json` | `target: ES2017`, strict, `@/* → ./src/*` path alias, bundler moduleResolution |
| `next.config.ts` | Empty config (no custom options) |
| `postcss.config.mjs` | `@tailwindcss/postcss` plugin |
| `eslint.config.mjs` | Next.js core-web-vitals + TypeScript rules |
| `components.json` | Shadcn/ui component generator config |
| `pnpm-workspace.yaml` | Workspace configuration for pnpm |

---

## 16. Conventions & Patterns

1. **Fabric.js is CDN-only** — always guard with `typeof fabric === 'undefined'`
2. **Canvas cleanup** — `fabricCanvasRef.current.dispose()` in `useEffect` return
3. **Grid preservation** — only objects with `selectable !== false` are cleared during re-render
4. **Image CORS** — all external images routed through `/api/image-proxy`; `crossOrigin: 'anonymous'` set on Fabric image loads
5. **Export at native resolution** — `multiplier: 1` gives 1080×810 from a 1080×810 canvas
6. **Bengali detection** — `detectLanguage()` checks Unicode range `\u0980-\u09FF`; subtitle auto-switches
7. **Path alias** — `@/` = `src/` (via tsconfig)
8. **Server Components** — `app/layout.tsx` is a Server Component; `app/page.tsx` has `"use client"` directive
9. **No global state management** — all state lives in `SocialCardEditor` via `useState`
10. **Puppeteer is lazy-loaded** — in `image-proxy/route.ts`, Puppeteer is `await import('puppeteer')` for dynamic import
11. **Error boundary pattern** — scraping errors are caught and returned as structured JSON, never crash the API

---

## 17. Security Model

- **SSRF Protection**: `BLOCKED_DOMAINS` blocks `localhost`, `127.0.0.1`, `10.*`, `192.168.*`, `172.16.*`
- **Protocol Validation**: Only `http:` and `https:` allowed
- **URL Sanitization**: `validateAndSanitizeUrl()` adds protocol if missing, validates format
- **Resource Limits**: Max 100KB head, 500KB body, 10 images, 15s timeout (20s for Puppeteer)
- **Image Proxy**: Validates URL before proxying, blocks same private networks
- **No auth**: The application has no authentication — it's a standalone tool

---

## 18. Known Quirks & Technical Debt

1. **`SocialCardEditor.tsx` is monolithic** (694 lines) — all state/logic in one component; candidates for extraction: canvas operations, API calls, image gallery
2. **Duplicate URL utilities** — `lib/validators.ts` (throws) vs `utils/urlUtils.ts` (returns objects) — similar functions with different error handling
3. **Fabric.js types are `any`** — no TypeScript safety for canvas operations
4. **`CardDesign.tsx` and `LinkPreview.tsx` are dead code** — not rendered anywhere in the active app
5. **`useLinkPreview` hook unused** by main component — `SocialCardEditor` calls `fetch` directly
6. **`react-simple-maps` installed** but no map component exists — only GeoJSON served from `public/`
7. **No tests** — no test files, test config, or test dependencies exist
8. **`metadata` in `layout.tsx` still says** "Create Next App" — should be updated
9. **Canvas dimensions changed** from 600×600 to 1080×810 but existing docs reference old values
10. **Puppeteer launches a new browser instance per request** — could be resource-intensive under load

---

## 19. Extension Guide

| Feature Idea | Where to Add |
|---|---|
| New canvas element type (shape, watermark, etc.) | New function in `SocialCardEditor.tsx` alongside `addText()` |
| New sidebar panel / tool | Add JSX section in sidebar div (after `lg:col-span-4` at ~line 523) |
| New scraper metadata field (e.g., `og:video`) | `lib/htmlParser.ts` → `lib/scraper.ts` → `types/api.ts` |
| New API endpoint | `src/app/api/<name>/route.ts` |
| Canvas text styling (color, font, size picker) | Extend toolbar, update `fabric.Textbox` properties on canvas |
| Multiple card templates | State variable `activeTemplate`, switch in `renderCardContent()` |
| Share / copy-to-clipboard | Use `canvas.toDataURL()` + `navigator.clipboard.write()` |
| Batch card generation | New page + server action that loops URLs |
| Auth / user accounts | Add `next-auth` or similar; wrap in middleware |
| Extract SocialCardEditor logic | Create custom hooks: `useCanvas()`, `useScraper()`, `useImageGallery()` |
| Replace dead components | Either integrate `CardDesign`/`LinkPreview` or delete them |

---

*Generated: 2026-02-26 | Covers all 24 source files + all config files | Project: social-media-card-generator-fullstack*
