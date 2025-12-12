# Social Card Editor - Frontend Architecture Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Component Structure](#component-structure)
4. [Data Flow](#data-flow)
5. [Canvas Implementation](#canvas-implementation)
6. [API Integration](#api-integration)
7. [UI/UX Design System](#uiux-design-system)
8. [Performance Optimizations](#performance-optimizations)
9. [Development Guidelines](#development-guidelines)

---

## Overview

The Social Card Editor is a modern web application built with **Next.js 14**, **TypeScript**, and **Fabric.js** that allows users to create, customize, and export social media cards. The application features a glassmorphic design system and provides real-time editing capabilities with URL metadata fetching.

### Key Features
- 🎨 **Visual Canvas Editor** - Drag, resize, rotate text and images
- 🔗 **URL Metadata Fetching** - Automatic extraction of title, description, and images
- 🎭 **Glassmorphic UI** - Modern, clean design with backdrop blur effects
- 📱 **Responsive Design** - Works seamlessly across devices
- 💾 **Export Functionality** - Download cards as high-resolution PNG files
- 🌐 **Bengali Font Support** - Proper rendering of Bengali text

---

## System Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[Next.js App Router] --> B[SocialCardEditor Component]
        B --> C[Canvas Engine - Fabric.js]
        B --> D[UI Components]
        B --> E[State Management]
    end
    
    subgraph "Backend Layer"
        F[Link Preview API] --> G[LinkPreviewService]
        G --> H[Web Scraper]
        G --> I[URL Validator]
    end
    
    subgraph "External Services"
        J[Fabric.js CDN]
        K[Google Fonts]
        L[Unsplash Images]
    end
    
    B --> F
    C --> J
    D --> K
    B --> L
    
    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style C fill:#fff3e0
    style F fill:#e8f5e8
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Next.js 14 | React framework with App Router |
| **Language** | TypeScript | Type safety and developer experience |
| **Canvas** | Fabric.js 5.3.0 | Interactive canvas manipulation |
| **Styling** | Tailwind CSS | Utility-first CSS framework |
| **Fonts** | Google Fonts | Typography (Noto Serif Bengali) |
| **State** | React Hooks | Local component state management |

---

## Component Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with font configuration
│   ├── page.tsx                # Main page component
│   └── globals.css             # Global styles and glassmorphic utilities
├── components/
│   └── SocialCardEditor.tsx    # Main editor component
├── services/
│   └── linkPreviewService.ts   # API service layer
├── types/
│   └── api.ts                  # TypeScript interfaces
└── utils/
    └── urlUtils.ts             # URL validation utilities
```

### Component Hierarchy

```mermaid
graph TD
    A[App Layout] --> B[Home Page]
    B --> C[SocialCardEditor]
    
    C --> D[Canvas Container]
    C --> E[Sidebar Controls]
    
    D --> F[Fabric.js Canvas]
    F --> G[Card Background]
    F --> H[Title Text]
    F --> I[Image Element]
    F --> J[Subtitle Text]
    
    E --> K[URL Input Form]
    E --> L[Tool Buttons]
    E --> M[Metadata Display]
    E --> N[Tips Section]
    
    style C fill:#ffeb3b,color:#000
    style F fill:#4caf50,color:#fff
    style E fill:#2196f3,color:#fff
```

---

## Data Flow

### State Management Architecture

```mermaid
sequenceDiagram
    participant U as User
    participant C as Component
    participant S as State
    participant A as API
    participant F as Fabric.js
    
    U->>C: Enter URL
    C->>S: Update urlInput state
    U->>C: Click Fetch
    C->>A: Call /api/link-preview
    A-->>C: Return metadata
    C->>S: Update title, description, imageUrl
    C->>F: Call renderCard()
    F-->>C: Canvas updated
    C-->>U: Visual feedback
```

### Component State Structure

```typescript
interface ComponentState {
  // Form inputs
  urlInput: string;
  isLoading: boolean;
  
  // Fetched metadata
  title: string;
  description: string;
  imageUrl: string;
  ogData: LinkPreviewResponse | null;
  
  // Canvas references
  canvasRef: RefObject<HTMLCanvasElement>;
  fabricCanvasRef: RefObject<FabricCanvas>;
}
```

---

## Canvas Implementation

### Fabric.js Integration

The canvas implementation uses Fabric.js for interactive element manipulation:

```mermaid
graph LR
    A[Canvas Initialization] --> B[Grid Setup]
    B --> C[Card Rendering]
    C --> D[Element Creation]
    
    D --> E[Title Textbox]
    D --> F[Image Object]
    D --> G[Subtitle Textbox]
    
    E --> H[Interactive Controls]
    F --> H
    G --> H
    
    H --> I[Drag & Drop]
    H --> J[Resize Handles]
    H --> K[Rotation Controls]
    
    style A fill:#ff9800
    style H fill:#4caf50
```

### Canvas Architecture

```typescript
// Canvas initialization flow
const initializeCanvas = () => {
  // 1. Create Fabric.js canvas instance
  const canvas = new fabric.Canvas(canvasRef.current, {
    width: 600,
    height: 600,
    backgroundColor: '#2c3e50'
  });
  
  // 2. Add grid lines for visual guidance
  addGridLines(canvas);
  
  // 3. Store canvas reference
  fabricCanvasRef.current = canvas;
};

// Card rendering pipeline
const renderCard = (title: string, imageUrl: string) => {
  // 1. Clear existing content (preserve grid)
  clearSelectableObjects(canvas);
  
  // 2. Create card background (full canvas)
  addCardBackground(canvas);
  
  // 3. Add interactive text elements
  addTitleText(canvas, title);
  addSubtitleText(canvas);
  
  // 4. Load and position image
  addImageElement(canvas, imageUrl);
};
```

### Element Configuration

| Element | Properties | Interactions |
|---------|------------|--------------|
| **Card Background** | `selectable: false` | Static background |
| **Title Text** | `hasControls: true`, `lockRotation: false` | Drag, resize, rotate, edit |
| **Image** | `hasControls: true`, `lockRotation: false` | Drag, resize, rotate |
| **Subtitle** | `hasControls: true`, `lockRotation: false` | Drag, resize, rotate, edit |
| **Grid Lines** | `selectable: false`, `evented: false` | Visual guides only |

---

## API Integration

### Link Preview Service Architecture

```mermaid
graph TD
    A[User Input URL] --> B[Frontend Validation]
    B --> C[API Request /api/link-preview]
    C --> D[LinkPreviewService]
    D --> E[URL Validation]
    E --> F[Web Scraping]
    F --> G[Metadata Extraction]
    G --> H[Response Formatting]
    H --> I[Frontend Processing]
    I --> J[Canvas Update]
    
    style C fill:#2196f3,color:#fff
    style D fill:#4caf50,color:#fff
    style J fill:#ff9800,color:#fff
```

### API Response Handling

```typescript
interface LinkPreviewResponse {
  success: boolean;
  url: string;
  metadata: {
    title: string;
    description: string;
    image: string;
    favicon: string;
    url: string;
  } | null;
  error?: string;
  timestamp: string;
}

// Error handling strategy
const fetchOgData = async (url: string) => {
  try {
    const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
    const data: LinkPreviewResponse = await response.json();
    
    if (data.success && data.metadata) {
      // Success path: Update state and render
      updateMetadataState(data.metadata);
      renderCard(data.metadata.title, data.metadata.image);
    } else {
      // API error: Show error state
      handleApiError(data.error);
    }
  } catch (error) {
    // Network error: Show fallback
    handleNetworkError(error);
  }
};
```

---

## UI/UX Design System

### Glassmorphic Design Principles

```mermaid
graph LR
    A[Design System] --> B[Color Palette]
    A --> C[Typography]
    A --> D[Spacing]
    A --> E[Effects]
    
    B --> F[Dark Gradient Background]
    B --> G[White/Opacity Text]
    B --> H[Accent Colors]
    
    C --> I[Noto Serif Bengali]
    C --> J[Font Hierarchy]
    
    D --> K[Consistent Padding]
    D --> L[Grid Layout]
    
    E --> M[Backdrop Blur]
    E --> N[Subtle Shadows]
    E --> O[Smooth Transitions]
    
    style A fill:#9c27b0,color:#fff
    style E fill:#ff5722,color:#fff
```

### CSS Architecture

```css
/* Glassmorphic base classes */
.glass-panel {
  backdrop-filter: blur(16px);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
}

.glass-button {
  backdrop-filter: blur(12px);
  background: rgba(255, 255, 255, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}
```

### Responsive Design Strategy

| Breakpoint | Layout | Canvas Size | Sidebar |
|------------|--------|-------------|---------|
| **Mobile** | Stacked | 100% width | Full width below |
| **Tablet** | Stacked | Max 600px | Full width below |
| **Desktop** | 2-column | Fixed 600px | Fixed sidebar |

---

## Performance Optimizations

### Loading Strategy

```mermaid
graph TD
    A[Page Load] --> B[Component Mount]
    B --> C[Fabric.js CDN Load]
    C --> D[Canvas Initialization]
    D --> E[Default Card Render]
    
    F[User Action] --> G[API Call]
    G --> H[Metadata Fetch]
    H --> I[Canvas Update]
    
    J[Font Loading] --> K[Document.fonts.ready]
    K --> L[Text Rendering]
    
    style C fill:#ff9800
    style G fill:#2196f3
    style J fill:#4caf50
```

### Optimization Techniques

1. **Lazy Loading**
   - Fabric.js loaded from CDN only when needed
   - Images loaded asynchronously with crossOrigin support

2. **Memory Management**
   - Canvas disposal on component unmount
   - Script cleanup in useEffect return function

3. **Rendering Optimization**
   - Selective object clearing (preserve grid lines)
   - Batch canvas operations with renderAll()

4. **Font Loading**
   - Google Fonts with Next.js optimization
   - Fallback fonts for better loading experience

---

## Development Guidelines

### Code Organization Principles

```typescript
// 1. Separation of Concerns
const SocialCardEditor = () => {
  // State management
  const [state, setState] = useState();
  
  // Canvas operations
  const initializeCanvas = () => { /* ... */ };
  const renderCard = () => { /* ... */ };
  
  // API operations
  const fetchOgData = () => { /* ... */ };
  
  // UI event handlers
  const handleUrlSubmit = () => { /* ... */ };
  
  // Render
  return <UI />;
};
```

### Error Handling Strategy

```mermaid
graph TD
    A[User Action] --> B{Validation}
    B -->|Valid| C[API Call]
    B -->|Invalid| D[Show Validation Error]
    
    C --> E{API Response}
    E -->|Success| F[Update UI]
    E -->|API Error| G[Show API Error]
    E -->|Network Error| H[Show Network Error]
    
    F --> I[Canvas Render]
    I --> J{Render Success}
    J -->|Success| K[Complete]
    J -->|Error| L[Show Canvas Error]
    
    style D fill:#f44336,color:#fff
    style G fill:#ff9800,color:#fff
    style H fill:#ff5722,color:#fff
    style L fill:#e91e63,color:#fff
```

### Testing Strategy

| Test Type | Coverage | Tools |
|-----------|----------|-------|
| **Unit Tests** | Component logic, utilities | Jest, React Testing Library |
| **Integration Tests** | API integration, canvas operations | Cypress |
| **Visual Tests** | UI components, responsive design | Storybook, Chromatic |
| **E2E Tests** | Complete user workflows | Playwright |

### Deployment Considerations

1. **Build Optimization**
   - Next.js automatic code splitting
   - Image optimization for default assets
   - CSS purging with Tailwind

2. **CDN Strategy**
   - Fabric.js from reliable CDN
   - Google Fonts with preconnect
   - Static assets optimization

3. **Browser Compatibility**
   - Modern browsers (ES2020+)
   - Canvas API support required
   - Backdrop-filter support for glassmorphic effects

---

## Conclusion

This Social Card Editor represents a modern, scalable frontend architecture that balances performance, maintainability, and user experience. The glassmorphic design system provides a contemporary aesthetic while the Fabric.js integration enables powerful canvas manipulation capabilities.

The modular architecture ensures easy maintenance and feature expansion, while the comprehensive error handling and performance optimizations provide a robust user experience across different devices and network conditions.

---

*Last Updated: December 2024*  
*Architecture Version: 1.0*  
*Next.js Version: 14.x*  
*Fabric.js Version: 5.3.0*