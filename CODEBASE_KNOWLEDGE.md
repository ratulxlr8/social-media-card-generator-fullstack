# Social Card Generator — Codebase Knowledge Base

> Auto-generated deep-dive. Use this file to quickly recall any part of the project before adding features.

---

## 1. Tech Stack

| Layer | Tool | Version / Notes |
|---|---|---|
| Framework | **Next.js App Router** | 14.x, TypeScript |
| Canvas | **Fabric.js** | 5.3.0 — loaded from CDN at runtime |
| Styling | **Tailwind CSS** | glassmorphic dark-mode theme |
| Fonts | **Google Fonts** — Noto Serif Bengali | loaded in `layout.tsx` |
| Image export | **html-to-image** (`toPng`) | used in `LinkPreview.tsx` |
| Package manager | **pnpm** | `pnpm run dev` to start |

---

## 2. Full File Map

```
src/
├── app/
│   ├── api/link-preview/
│   │   ├── route.ts           ← GET handler for /api/link-preview
│   │   └── README.md          ← API docs
│   ├── globals.css            ← glassmorphic utility classes
│   ├── layout.tsx             ← root layout, Google Fonts config
│   └── page.tsx               ← renders <SocialCardEditor />
│
├── components/
│   ├── SocialCardEditor.tsx   ← ★ MAIN COMPONENT (700 lines)
│   ├── CardDesign.tsx         ← simple HTML-based card preview (forwardRef)
│   ├── LinkPreview.tsx        ← hook-based preview card + html-to-image download
│   └── ui/
│       ├── dialog.tsx
│       ├── loading.tsx        ← <LoadingCard /> spinner
│       └── tooltip.tsx
│
├── config/
│   └── scraper.ts             ← SCRAPER_CONFIG constants
│
├── hooks/
│   └── useLinkPreview.ts      ← reusable hook: fetch + state for link preview
│
├── lib/
│   ├── errors.ts              ← ScrapingError class + getErrorMessage()
│   ├── htmlParser.ts          ← regex parsing utilities, detectLanguage()
│   ├── scraper.ts             ← fetchHeadContent(), fetchBodyImages(), parseMetadata(), normalizeMetadata()
│   ├── utils.ts               ← cn() helper (clsx)
│   └── validators.ts          ← validateAndSanitizeUrl()
│
├── services/
│   └── linkPreviewService.ts  ← LinkPreviewService class (static methods)
│
├── types/
│   └── api.ts                 ← LinkPreviewRequest/Metadata/Response types
│
└── utils/
    └── urlUtils.ts            ← URL utilities
```

---

## 3. Main Component — `SocialCardEditor.tsx`

**Path:** `src/components/SocialCardEditor.tsx` (700 lines)

This is the entire app UI in one component. It owns all state, canvas operations, and API calls.

### State

```ts
urlInput: string          // controlled text input
isLoading: boolean        // fetch in progress
fetchBodyImages: boolean  // checkbox toggle
title: string             // fetched og:title
description: string       // fetched og:description
imageUrl: string          // currently selected image URL
ogData: LinkPreviewResponse | null
bodyImages: string[]      // body-scraped images only
allImages: string[]       // [main image, ...bodyImages]

canvasRef: RefObject<HTMLCanvasElement>     // DOM ref
fabricCanvasRef: RefObject<FabricCanvas>   // Fabric instance ref
```

### Key Functions

| Function | What it does |
|---|---|
| `initializeCanvas()` | Creates `fabric.Canvas` (600×600), adds grid lines (30px spacing) |
| `renderCard(title, imgUrl)` | Delegates to `renderCardContent()` |
| `renderCardContent(title, imgUrl, canvas)` | Clears selectable objects, adds white bg rect, title Textbox, image (with 16:9 fallback), subtitle Textbox |
| `fetchOgData(url)` | Calls `/api/link-preview?url=...&fetchBodyImages=1` (if checkbox is on), updates all state, calls `renderCard()` |
| `loadApiData()` | Renders default "Enter a URL" placeholder card |
| `downloadCard()` | `canvas.toDataURL({ multiplier: 2 })` → downloads at 1200×1200 PNG |
| `addText()` | Adds new draggable `fabric.Textbox` to canvas |
| `addImageFromFile()` | File input → FileReader → `fabric.Image.fromURL` |
| `addImageFromUrl()` | `prompt()` modal → `fabric.Image.fromURL` |
| `deleteSelected()` | Removes active canvas object |
| `handleImageSelect(url)` | Switches selected image → re-renders card |

### Canvas Layout (600×600)

```
┌───────────────────────────────────┐  (0,0)
│        Title Textbox (y=40)       │
│   [imageArea: 30–570, 90–530]     │
│              Image                │
│       Subtitle Textbox (y=530)    │
└───────────────────────────────────┘  (600,600)
```

- Grid lines: `selectable: false, evented: false` — never removed during clear
- Selectable objects are cleared by checking `obj.selectable !== false`
- Language auto-detection: if title is Bengali → subtitle = `'বিস্তারিত কমেন্টে'`, else `'See details in comments'`
- Image aspect ratio: if > 0.5 deviation from 16:9, forces 16:9; otherwise fits proportionally

### UI Layout

Dark glassmorphic: `bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900`  
Layout: `grid lg:grid-cols-3` — Canvas (2 cols) + Sidebar (1 col)

**Sidebar Panels:**
1. **Fetch Preview** — URL input + "Extract body images" checkbox + Fetch button
2. **Tools** — Add Text, Upload, Image URL, Delete / Reset, Download
3. **Images** — grid of all images (main + body), click to swap into card (only shown when images exist)
4. **Metadata** — displays title, description, body image count
5. **Quick Tips** — static UX hints

---

## 4. Alternative Components (less used)

### `CardDesign.tsx`
- Simple HTML card (not canvas-based)
- Props: `title`, `onTitleChange`, `image`
- Uses `forwardRef` so parent can pass ref for html-to-image export
- Renders: Header (editable textarea) + Body (img) + Footer (language-aware text)
- **Not currently rendered in main page** — only used via `LinkPreview.tsx`

### `LinkPreview.tsx`
- Uses `useLinkPreview(url)` hook vs direct fetch
- Renders `<CardDesign>` + Download button (uses `html-to-image` toPng, pixelRatio: 3)
- Has loading/error/retry UI states
- **Not currently rendered in main page** (dead path, available for future use)

---

## 5. API Route — `/api/link-preview`

**File:** `src/app/api/link-preview/route.ts`

```
GET /api/link-preview?url=<URL>&fetchBodyImages=1
```

**Query params:**
- `url` (required) — target URL to scrape
- `fetchBodyImages` — `"1"` or `"true"` to also extract `<img>` tags from body

**Pipeline:**
```
Request → LinkPreviewService.isScrapableUrl() → LinkPreviewService.getPreviewData()
→ validateAndSanitizeUrl() → fetchHeadContent() → parseMetadata()
→ (optional) fetchBodyImages() → normalizeMetadata() → NextResponse.json()
```

**Success response:**
```ts
{
  success: true,
  url: string,
  metadata: { title, description, image, favicon, url, bodyImages? },
  timestamp: string
}
```

**Error response:**
```ts
{ success: false, url, metadata: null, error: string, timestamp }
```

---

## 6. Backend Scraping Layer

### `lib/scraper.ts`
- `fetchHeadContent(url)` — streams HTML, stops at `</head>` (max 100KB), uses AbortController (15s timeout)
- `fetchBodyImages(url)` — streams from `<body>`, collects up to 10 img tags (max 500KB)
- `parseMetadata(headHtml)` — regex extracts: `<title>`, `meta[name=description]`, `og:title`, `og:description`, `og:image`, favicon
- `normalizeMetadata(scrapped, originalUrl)` — OG fields take priority; resolves relative URLs

### `lib/htmlParser.ts`
- `detectLanguage(text)` → `'bn' | 'en' | 'unknown'` (Unicode range `\u0980-\u09FF` for Bengali)
- `decodeHtmlEntities(text)` — handles `&amp;`, `&lt;`, numeric entities, etc.
- `extractMetaContent(html, property, isProperty?)` — regex for meta name/property + content
- `extractTitle(html)` — `<title>...</title>`
- `extractFavicon(html)` — checks `rel="icon"`, `"shortcut icon"`, `"apple-touch-icon"`
- `extractBodyImages(bodyHtml, baseUrl, maxImages, ignoredPatterns)` — returns resolved absolute URLs
- `countImageTags(html)`, `findHeadEndIndex()`, `findBodyStartIndex()`, `hasHeadEnd()`, `hasBodyStart()`

### `lib/validators.ts`
- `validateAndSanitizeUrl(rawUrl)` — throws `ScrapingError` for invalid/private URLs

### `lib/errors.ts`
- `ScrapingError extends Error` — adds `statusCode` field
- `getErrorMessage(error)` — safe message extraction

### `config/scraper.ts` — `SCRAPER_CONFIG`
```ts
TIMEOUT: 15000ms
MAX_HEAD_SIZE: 100_000 bytes
MAX_BODY_SIZE: 500_000 bytes
MAX_BODY_IMAGES: 10
USER_AGENT: Chrome 120 string
BLOCKED_DOMAINS: ['localhost', '127.0.0.1', '10.', '192.168.', '172.16.', ...]
ALLOWED_PROTOCOLS: ['http:', 'https:']
IGNORED_IMAGE_PATTERNS: [/^data:/, /\.svg$/i, /tracking|analytics|pixel|beacon/i, /favicon|icon/i]
```

---

## 7. Types (`src/types/api.ts`)

```ts
interface LinkPreviewMetadata {
  title: string; description: string; image: string;
  favicon: string; url: string; bodyImages?: string[];
}
type LinkPreviewResponse = LinkPreviewSuccessResponse | LinkPreviewErrorResponse;
```

---

## 8. Custom Hook — `useLinkPreview`

**File:** `src/hooks/useLinkPreview.ts`

```ts
useLinkPreview(url: string, options?: { fetchBodyImages?: boolean })
// returns: { data: PreviewData | null, loading, error, refetch }
```

Triggers on `url` or `options.fetchBodyImages` change (useEffect dependency).  
**Note:** `SocialCardEditor` does NOT use this hook — it calls fetch directly. Hook is used in `LinkPreview.tsx`.

---

## 9. Design System

- **Theme:** Dark glassmorphic (`backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl`)
- **Accent:** Purple (`bg-purple-500`, `border-purple-500/50`)
- **Background:** `bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900`
- **Glow effects:** `bg-purple-500/20 blur-3xl`, `bg-blue-500/20 blur-3xl` (fixed, pointer-events-none)
- **Canvas border radius:** `rounded-xl`
- **Tailwind classes** used throughout, no custom CSS modules

**globals.css** defines glassmorphic utility classes:
```css
.glass-panel { backdrop-filter: blur(16px); background: rgba(255,255,255,0.05); ... }
.glass-button { backdrop-filter: blur(12px); transition: all 0.3s cubic-bezier(0.4,0,0.2,1); }
```

---

## 10. Common Patterns & Conventions

1. **Fabric.js is CDN-only** — `typeof fabric === 'undefined'` guard before every canvas op
2. **Canvas cleanup:** `fabricCanvasRef.current.dispose()` in `useEffect` return
3. **Grid lines preservation:** only objects with `selectable !== false` are cleared
4. **Image crossOrigin:** always `{ crossOrigin: 'anonymous' }` in `fabric.Image.fromURL`
5. **Export multiplier:** `multiplier: 2` gives 1200×1200 from a 600×600 canvas
6. **Bengali detection:** check Unicode range in `detectLanguage()` from `lib/htmlParser.ts`
7. **URL alias:** `@/` = `src/` (configured in `tsconfig.json`)
8. **Server components:** `app/page.tsx` and `app/layout.tsx` are Server Components; all canvas/interactive code is client-side (`'use client'` or pure state hooks)

---

## 11. Where to Add New Features

| Feature idea | Where to add |
|---|---|
| New canvas element type | `renderCardContent()` or new function in `SocialCardEditor.tsx` |
| New sidebar panel | Add JSX section in sidebar div (`SocialCardEditor.tsx` ~line 515) |
| New scraper metadata field | `lib/htmlParser.ts` + `lib/scraper.ts` + `types/api.ts` |
| New API endpoint | `src/app/api/<name>/route.ts` |
| Reusable card style/template | New component alongside `CardDesign.tsx` |
| Canvas text styling controls | Extend toolbar in `SocialCardEditor.tsx`, update `fabric.Textbox` properties |
| Multiple card templates | State variable for `activeTemplate`, switch in `renderCardContent()` |
| Share / copy-to-clipboard | Add button in Tools panel, use `canvas.toDataURL()` + `navigator.clipboard` |

---

*Generated: 2026-02-19 | Project: social-media-card-generator-fullstack*
