import { detectLanguage } from '@/lib/htmlParser';
import type { LinkPreviewResponse } from '@/types/api';
import {
  Calendar,
  Check,
  ChevronLeft,
  ClipboardCopy,
  Download,
  Facebook,
  Image,
  ImagePlus,
  Layers,
  Link,
  RotateCcw,
  Share2,
  Sparkles,
  Trash2,
  Twitter,
  Type,
  Upload,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Routes external image URLs through our server-side proxy to bypass CORS.
 * Local/data URLs are passed through unchanged.
 */
function getProxiedImageUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) {
    return url;
  }
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

/** Format today's date based on language */
function formatDate(lang: 'bn' | 'en' | 'unknown'): string {
  const now = new Date();
  if (lang === 'bn') {
    return now.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  return now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Type declarations for Fabric.js loaded from CDN
declare global {
  const fabric: any;
}

type FabricObject = any;
type FabricCanvas = any;

/**
 * Fabric.js's built-in `graphemeSplit` only merges UTF-16 surrogate pairs
 * (for emoji outside the BMP) — every Bengali consonant, vowel sign, and
 * conjunct-forming virama is treated as its own separate "character" for
 * line-wrapping, click-to-cursor, and insert/delete. Every one of Fabric's
 * internal call sites looks this function up dynamically off `fabric.util
 * .string`, so replacing it once (before any Textbox is created) fixes
 * cursor placement everywhere text is measured. `Intl.Segmenter`'s grapheme
 * granularity groups a base character with its attached combining marks
 * (e.g. matras), matching what actually gets shaped/painted as one unit.
 */
function patchFabricGraphemeSplit() {
  if (typeof fabric === 'undefined' || !fabric.util?.string?.graphemeSplit) return;
  if (typeof Intl === 'undefined' || !Intl.Segmenter) return;
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  fabric.util.string.graphemeSplit = (text: string) =>
    Array.from(segmenter.segment(text), (s) => s.segment);
}

type PanelType = 'url' | 'images' | 'text' | 'upload' | 'date' | 'share' | 'overlay' | null;


const SocialCardEditor = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const artboardRef = useRef<HTMLDivElement>(null);

  // Existing state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [ogData, setOgData] = useState<LinkPreviewResponse | null>(null);
  const [fetchBodyImages, setFetchBodyImages] = useState(false);
  const [bodyImages, setBodyImages] = useState<string[]>([]);
  const [allImages, setAllImages] = useState<string[]>([]);
  const [activePanel, setActivePanel] = useState<PanelType>('url');

  // NEW — Date feature
  const [showDate, setShowDate] = useState(true);
  const [dateText, setDateText] = useState(formatDate('en'));

  // NEW — Overlay feature
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null);
  const [customOverlays, setCustomOverlays] = useState<string[]>([]);

  // NEW — Share status
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  // NEW — Mobile detection — lazy init reads UA synchronously, no flash
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
      || window.innerWidth <= 768;
  });

  const defaultData = {
    title: 'Enter a URL to fetch metadata',
    description: 'Use the form above to fetch metadata from any website',
    imageUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=600&fit=crop'
  };

  // ─── Dynamic canvas scaling ─────────────────────────────────

  const updateCanvasScale = useCallback(() => {
    const workspace = workspaceRef.current;
    const canvas = fabricCanvasRef.current;
    if (!workspace || !canvas) return;

    const padding = isMobile ? 24 : 64;
    const availW = workspace.clientWidth - padding;
    const availH = workspace.clientHeight - padding;
    const scaleX = availW / 1080;
    const scaleY = availH / 810;
    const scale = Math.min(scaleX, scaleY, 1);

    // Resize the actual Fabric canvas (via its native zoom/dimensions APIs)
    // instead of CSS-transforming it. A CSS transform leaves Fabric's pointer
    // math (used for clicks, drags, and text-cursor placement) unaware of the
    // visual scale, which is what made the text cursor land in the wrong spot.
    canvas.setZoom(scale);
    canvas.setDimensions({ width: 1080 * scale, height: 810 * scale });
  }, [isMobile]);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    updateCanvasScale();
    const observer = new ResizeObserver(updateCanvasScale);
    observer.observe(workspace);
    return () => observer.disconnect();
  }, [updateCanvasScale]);

  useEffect(() => {
    const timer = setTimeout(updateCanvasScale, 300);
    return () => clearTimeout(timer);
  }, [activePanel, updateCanvasScale]);

  // ─── Mobile detection — listen for resize only, initial value set by lazy useState ───

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ─── Fabric.js lifecycle ────────────────────────────────────

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js';
    script.async = true;
    script.onload = () => {
      patchFabricGraphemeSplit();
      setTimeout(() => {
        initializeCanvas();
        updateCanvasScale();
        loadApiData();
      }, 100);
    };
    document.body.appendChild(script);

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const initializeCanvas = () => {
    if (typeof fabric === 'undefined' || !canvasRef.current) return;

    const canvasWidth = 1080;
    const canvasHeight = 810;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: '#2c3e50'
    });

    fabricCanvasRef.current = canvas;

    const gridSize = 54;
    for (let i = 0; i <= (canvasWidth / gridSize); i++) {
      canvas.add(new fabric.Line([i * gridSize, 0, i * gridSize, canvasHeight], {
        stroke: '#34495e', strokeWidth: 1, selectable: false, evented: false, opacity: 0.3
      }));
    }
    for (let i = 0; i <= (canvasHeight / gridSize); i++) {
      canvas.add(new fabric.Line([0, i * gridSize, canvasWidth, i * gridSize], {
        stroke: '#34495e', strokeWidth: 1, selectable: false, evented: false, opacity: 0.3
      }));
    }
  };

  // ─── Data fetching ──────────────────────────────────────────

  const fetchOgData = async (url: string) => {
    if (!url.trim()) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({ url });
      if (fetchBodyImages) params.set('fetchBodyImages', '1');

      const response = await fetch(`/api/link-preview?${params.toString()}`);
      const data: LinkPreviewResponse = await response.json();
      setOgData(data);

      if (data.success && data.metadata) {
        const newTitle = data.metadata.title || 'No title found';
        const newDescription = data.metadata.description || 'No description available';
        const newImageUrl = data.metadata.image || defaultData.imageUrl;

        setTitle(newTitle);
        setDescription(newDescription);
        setImageUrl(newImageUrl);

        // Auto-set date language
        const lang = detectLanguage(newTitle);
        setDateText(formatDate(lang));

        const fetchedBodyImages = data.metadata.bodyImages || [];
        setBodyImages(fetchedBodyImages);
        const combinedImages = [newImageUrl, ...fetchedBodyImages].filter(img => img && img.trim() !== '');
        setAllImages(combinedImages);

        renderCard(newTitle, newImageUrl);

        if (combinedImages.length > 1) setActivePanel('images');
      } else {
        console.error('API Error:', data.error);
        setTitle('Error fetching data');
        setDescription(data.error || 'Unknown error occurred');
        setImageUrl(defaultData.imageUrl);
        setBodyImages([]);
        setAllImages([defaultData.imageUrl]);
        renderCard('Error fetching data', defaultData.imageUrl);
      }
    } catch (error) {
      console.error('Error fetching OG data:', error);
      setTitle('Network error');
      setDescription('Failed to connect to the API');
      setImageUrl(defaultData.imageUrl);
      setBodyImages([]);
      setAllImages([defaultData.imageUrl]);
      renderCard('Network error', defaultData.imageUrl);
    } finally {
      setIsLoading(false);
    }
  };

  const loadApiData = async () => {
    setIsLoading(true);
    setTimeout(() => {
      setTitle(defaultData.title);
      setDescription(defaultData.description);
      setImageUrl(defaultData.imageUrl);
      setBodyImages([]);
      setAllImages([defaultData.imageUrl]);
      renderCard(defaultData.title, defaultData.imageUrl);
      setIsLoading(false);
    }, 500);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) fetchOgData(urlInput.trim());
  };

  // ─── Canvas rendering ───────────────────────────────────────

  const renderCard = (titleText: string, imgUrl: string) => {
    if (!fabricCanvasRef.current) return;
    renderCardContent(titleText, imgUrl, fabricCanvasRef.current);
  };

  const renderCardContent = (titleText: string, imgUrl: string, canvas: FabricCanvas) => {
    const language = detectLanguage(titleText);
    const subtitleText = language === 'bn' ? 'বিস্তারিত কমেন্টে' : 'See details in comments';

    // Clear previous selectable objects
    const objects = canvas.getObjects();
    objects.forEach((obj: FabricObject) => {
      if (obj.selectable !== false) canvas.remove(obj);
    });

    const cardWidth = 1080;
    const cardHeight = 810;

    // Background
    canvas.add(new fabric.Rect({
      left: 0, top: 0, width: cardWidth, height: cardHeight,
      fill: 'white', selectable: false
    }));

    // Title
    const titlePadding = 72;
    const titleWidth = cardWidth - (titlePadding * 2);
    const titleTop = 40;
    const titleObj = new fabric.Textbox(titleText, {
      left: cardWidth / 2, top: titleTop, width: titleWidth,
      fontSize: 42, fontWeight: 'bold', fill: '#2c3e50',
      fontFamily: 'Noto Serif Bengali', textAlign: 'center',
      originX: 'center', originY: 'top',
      cornerColor: '#7c3aed', cornerSize: 10,
      transparentCorners: false, borderColor: '#7c3aed',
      lineHeight: 1.4, breakWords: false,
      lockScalingFlip: true, hasControls: true, hasBorders: true
    });
    canvas.add(titleObj);

    // ─── Dynamic image area — measured from title bottom ───
    const titleActualHeight = titleObj.getBoundingRect().height;
    const gapAfterTitle = 20;
    const subtitleReserve = 100; // space for subtitle + date at bottom
    const imageAreaTop = titleTop + titleActualHeight + gapAfterTitle;
    const imageAreaBottom = cardHeight - subtitleReserve;
    const imageAreaHeight = Math.max(imageAreaBottom - imageAreaTop, 100);
    const imageAreaWidth = cardWidth - 108;
    const imageAreaLeft = 54;

    // Load main OG image — preserve original aspect ratio
    if (imgUrl) {
      fabric.Image.fromURL(getProxiedImageUrl(imgUrl), (img: FabricObject) => {
        const imgWidth = img.width || 800;
        const imgHeight = img.height || 600;
        const imgAspectRatio = imgWidth / imgHeight;

        // Fit within available area while keeping original aspect ratio
        let finalWidth, finalHeight;
        if (imgAspectRatio > (imageAreaWidth / imageAreaHeight)) {
          // Image is wider — constrain by width
          finalWidth = imageAreaWidth;
          finalHeight = finalWidth / imgAspectRatio;
        } else {
          // Image is taller — constrain by height
          finalHeight = imageAreaHeight;
          finalWidth = finalHeight * imgAspectRatio;
        }

        const sx = finalWidth / imgWidth;
        const sy = finalHeight / imgHeight;
        const imgLeft = imageAreaLeft + (imageAreaWidth - finalWidth) / 2;
        const imgTop = imageAreaTop + (imageAreaHeight - finalHeight) / 2;

        img.set({
          left: imgLeft, top: imgTop, scaleX: sx, scaleY: sy,
          cornerColor: '#7c3aed', cornerSize: 8,
          transparentCorners: false, borderColor: '#7c3aed'
        });
        canvas.add(img);

        // ─── Overlay (marketing banner) — placed at bottom of image ───
        if (overlayUrl) {
          fabric.Image.fromURL(
            overlayUrl.startsWith('/') ? overlayUrl : getProxiedImageUrl(overlayUrl),
            (overlayImg: FabricObject) => {
              const overlayOrigW = overlayImg.width || 1;
              const overlayOrigH = overlayImg.height || 1;
              const overlayScale = finalWidth / overlayOrigW;
              const overlayH = overlayOrigH * overlayScale;

              overlayImg.set({
                left: imgLeft,
                top: imgTop + finalHeight - overlayH,
                scaleX: overlayScale,
                scaleY: overlayScale,
                cornerColor: '#7c3aed', cornerSize: 8,
                transparentCorners: false, borderColor: '#7c3aed',
                hasControls: true, hasBorders: true
              });
              canvas.add(overlayImg);
              canvas.renderAll();
            },
            { crossOrigin: 'anonymous' }
          );
        }

        canvas.renderAll();
      }, { crossOrigin: 'anonymous' });
    }

    // Subtitle
    canvas.add(new fabric.Textbox(subtitleText, {
      left: cardWidth / 2, top: cardHeight - 90, width: titleWidth,
      fontSize: 28, fill: '#7f8c8d', fontFamily: 'Noto Serif Bengali',
      textAlign: 'center', originX: 'center', originY: 'top',
      cornerColor: '#7c3aed', cornerSize: 10,
      transparentCorners: false, borderColor: '#7c3aed',
      lineHeight: 1.4, splitByGrapheme: true, breakWords: false,
      lockScalingFlip: true, hasControls: true, hasBorders: true
    }));

    // ─── Date text — bottom right ────────────────────────────
    if (showDate && dateText) {
      canvas.add(new fabric.Text(dateText, {
        left: cardWidth - 72,
        top: cardHeight - 50,
        fontSize: 20,
        fill: '#95a5a6',
        fontFamily: 'Noto Serif Bengali',
        originX: 'right',
        originY: 'top',
        cornerColor: '#7c3aed', cornerSize: 8,
        transparentCorners: false, borderColor: '#7c3aed',
        hasControls: true, hasBorders: true
      }));
    }

    canvas.renderAll();
  };

  // Re-render when date or overlay changes
  useEffect(() => {
    if (title && imageUrl && fabricCanvasRef.current) {
      renderCard(title, imageUrl);
    }
  }, [showDate, dateText, overlayUrl]);

  // ─── Canvas actions ─────────────────────────────────────────

  const downloadCard = () => {
    if (!fabricCanvasRef.current) return;
    const dataURL = fabricCanvasRef.current.toDataURL({
      format: 'png', quality: 1, multiplier: 1, width: 1080, height: 810
    });
    const link = document.createElement('a');
    link.download = 'social-card-1080x810.png';
    link.href = dataURL;
    link.click();
  };

  const getCanvasBlob = async (): Promise<Blob | null> => {
    if (!fabricCanvasRef.current) return null;
    const dataURL = fabricCanvasRef.current.toDataURL({
      format: 'png', quality: 1, multiplier: 1, width: 1080, height: 810
    });
    const response = await fetch(dataURL);
    return response.blob();
  };

  // ─── Share functions ────────────────────────────────────────

  const shareViaWebShare = async () => {
    const blob = await getCanvasBlob();
    if (!blob) return;

    const file = new File([blob], 'social-card.png', { type: 'image/png' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: title || 'Social Card' });
        setShareStatus('Shared successfully!');
      } catch (e: any) {
        if (e.name !== 'AbortError') setShareStatus('Share cancelled');
      }
    } else {
      setShareStatus('Web Share not supported — use Copy instead');
    }
    setTimeout(() => setShareStatus(null), 3000);
  };

  const copyToClipboard = async () => {
    const blob = await getCanvasBlob();
    if (!blob) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setShareStatus('Copied to clipboard!');
    } catch {
      setShareStatus('Failed to copy — try Download instead');
    }
    setTimeout(() => setShareStatus(null), 3000);
  };

  const shareToFacebook = () => {
    const url = urlInput || window.location.href;
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      '_blank', 'width=600,height=400'
    );
  };

  const shareToTwitter = () => {
    const text = title || 'Check this out!';
    const url = urlInput || window.location.href;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      '_blank', 'width=600,height=400'
    );
  };

  // ─── Element add/delete ─────────────────────────────────────

  const addText = () => {
    if (!fabricCanvasRef.current) return;
    const text = new fabric.Textbox('New Text', {
      left: 540, top: 360, width: 648, fontSize: 58, fill: '#2c3e50',
      fontFamily: 'Arial, sans-serif', textAlign: 'center',
      originX: 'center', originY: 'top',
      cornerColor: '#7c3aed', cornerSize: 10,
      transparentCorners: false, borderColor: '#7c3aed',
      lineHeight: 1.4, splitByGrapheme: true, breakWords: false,
      lockScalingFlip: true, hasControls: true, hasBorders: true
    });
    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
    fabricCanvasRef.current.renderAll();
  };

  const deleteSelected = () => {
    if (!fabricCanvasRef.current) return;
    const activeObject = fabricCanvasRef.current.getActiveObject();
    if (activeObject && activeObject.selectable !== false) {
      fabricCanvasRef.current.remove(activeObject);
      fabricCanvasRef.current.renderAll();
    }
  };

  const reloadFromApi = () => { loadApiData(); };

  const addImageFromFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && fabricCanvasRef.current) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const imgUrl = event.target?.result as string;
          fabric.Image.fromURL(imgUrl, (img: FabricObject) => {
            const maxSize = 648;
            const s = maxSize / Math.max(img.width || 300, img.height || 300);
            img.set({
              left: 324, top: 324, scaleX: s, scaleY: s,
              cornerColor: '#7c3aed', cornerSize: 8,
              transparentCorners: false, borderColor: '#7c3aed'
            });
            fabricCanvasRef.current?.add(img);
            fabricCanvasRef.current?.setActiveObject(img);
            fabricCanvasRef.current?.renderAll();
          });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const addImageFromUrl = () => {
    const url = prompt('Enter image URL:');
    if (url && fabricCanvasRef.current) {
      fabric.Image.fromURL(getProxiedImageUrl(url), (img: FabricObject) => {
        const maxSize = 648;
        const s = maxSize / Math.max(img.width || 300, img.height || 300);
        img.set({
          left: 324, top: 324, scaleX: s, scaleY: s,
          cornerColor: '#7c3aed', cornerSize: 8,
          transparentCorners: false, borderColor: '#7c3aed'
        });
        fabricCanvasRef.current?.add(img);
        fabricCanvasRef.current?.setActiveObject(img);
        fabricCanvasRef.current?.renderAll();
      }, { crossOrigin: 'anonymous' });
    }
  };

  const handleImageSelect = (selectedImageUrl: string) => {
    setImageUrl(selectedImageUrl);
    renderCard(title, selectedImageUrl);
  };

  const togglePanel = (panel: PanelType) => {
    setActivePanel(prev => prev === panel ? null : panel);
  };

  // Overlay upload
  const uploadOverlay = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          setCustomOverlays(prev => [...prev, dataUrl]);
          setOverlayUrl(dataUrl);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  // ─── Panel header helper ────────────────────────────────────

  const PanelHeader = ({ title: panelTitle }: { title: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span className="panel-title">{panelTitle}</span>
      <button
        onClick={() => setActivePanel(null)}
        style={{
          background: 'none', border: 'none', color: 'var(--text-muted)',
          cursor: 'pointer', padding: '4px', display: 'flex'
        }}
      >
        {isMobile ? <X size={16} /> : <ChevronLeft size={16} />}
      </button>
    </div>
  );

  // ─── Panel renderers ────────────────────────────────────────

  const renderUrlPanel = () => (
    <div className="editor-panel-inner">
      <PanelHeader title="Fetch from URL" />
      <p className="panel-subtitle">Paste a link to auto-extract title, image, and description.</p>

      <form onSubmit={handleUrlSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
          placeholder="https://example.com/article" className="editor-input" />
        <div className="editor-checkbox">
          <input type="checkbox" id="fetchBodyImages" checked={fetchBodyImages}
            onChange={(e) => setFetchBodyImages(e.target.checked)} />
          <label htmlFor="fetchBodyImages">Extract body images</label>
        </div>
        <button type="submit" disabled={isLoading || !urlInput.trim()} className="editor-btn-primary">
          {isLoading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span className="editor-spinner" /> Fetching…
            </span>
          ) : 'Fetch Preview'}
        </button>
      </form>

      {(title || description) && (
        <div style={{ marginTop: '4px' }}>
          <div className="panel-title" style={{ marginBottom: '8px', fontSize: '12px' }}>Metadata</div>
          {title && (<div className="meta-row"><div className="meta-label">Title</div><div className="meta-value">{title}</div></div>)}
          {description && (<div className="meta-row"><div className="meta-label">Description</div><div className="meta-value" style={{ whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{description}</div></div>)}
          {bodyImages.length > 0 && (<div className="meta-row"><div className="meta-label">Body Images</div><div className="meta-value">{bodyImages.length} found</div></div>)}
        </div>
      )}
    </div>
  );

  const renderImagesPanel = () => (
    <div className="editor-panel-inner">
      <PanelHeader title={`Images (${allImages.length})`} />
      <p className="panel-subtitle">Click an image to use it on your card.</p>
      {allImages.length > 0 ? (
        <div className="image-grid">
          {allImages.map((imgUrl, index) => (
            <div key={index} className={`image-grid-item ${imgUrl === imageUrl ? 'selected' : ''}`}
              onClick={() => handleImageSelect(imgUrl)}>
              <img src={getProxiedImageUrl(imgUrl)} alt={`Image ${index + 1}`}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              {index === 0 && <span className="badge">OG</span>}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
          <Image size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} /> No images yet. Fetch a URL first.
        </div>
      )}
    </div>
  );

  const renderTextPanel = () => (
    <div className="editor-panel-inner">
      <PanelHeader title="Text" />
      <p className="panel-subtitle">Add text elements to your canvas.</p>
      <button onClick={addText} className="editor-btn-surface" style={{ width: '100%' }}>
        <Type size={14} /> Add a text box
      </button>
      <div style={{ padding: '12px', background: 'var(--surface)', borderRadius: '8px', fontSize: '11px', color: 'var(--text-dim)', lineHeight: '1.6' }}>
        <strong style={{ color: 'var(--text-secondary)' }}>Tips</strong>
        <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
          <li>Double-click text to edit</li>
          <li>Drag to reposition</li>
          <li>Use corner handles to resize</li>
          <li>Rotate via the top handle</li>
        </ul>
      </div>
    </div>
  );

  const renderUploadPanel = () => (
    <div className="editor-panel-inner">
      <PanelHeader title="Upload" />
      <p className="panel-subtitle">Add images from your device or a URL.</p>
      <button onClick={addImageFromFile} className="editor-btn-surface" style={{ width: '100%' }}>
        <Upload size={14} /> Upload from device
      </button>
      <button onClick={addImageFromUrl} className="editor-btn-surface" style={{ width: '100%' }}>
        <ImagePlus size={14} /> Add from URL
      </button>
    </div>
  );

  const renderDatePanel = () => (
    <div className="editor-panel-inner">
      <PanelHeader title="Date" />
      <p className="panel-subtitle">Add a date stamp to the bottom-right of your card.</p>

      <div className="editor-checkbox">
        <input type="checkbox" id="showDate" checked={showDate}
          onChange={(e) => setShowDate(e.target.checked)} />
        <label htmlFor="showDate">Show date on card</label>
      </div>

      {showDate && (
        <>
          <input type="text" value={dateText} onChange={(e) => setDateText(e.target.value)}
            className="editor-input" placeholder="Enter date text" />
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => setDateText(formatDate('en'))} className="editor-btn-surface" style={{ flex: 1, fontSize: '11px' }}>
              English
            </button>
            <button onClick={() => setDateText(formatDate('bn'))} className="editor-btn-surface" style={{ flex: 1, fontSize: '11px' }}>
              বাংলা
            </button>
          </div>
          <button onClick={() => setDateText(formatDate(detectLanguage(title)))} className="editor-btn-surface" style={{ width: '100%', fontSize: '11px' }}>
            Auto-detect from title
          </button>
        </>
      )}
    </div>
  );

  const renderSharePanel = () => (
    <div className="editor-panel-inner">
      <PanelHeader title="Share" />
      <p className="panel-subtitle">Share your card to social media or clipboard.</p>

      {shareStatus && (
        <div style={{
          padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
          background: shareStatus.includes('success') || shareStatus.includes('Copied') ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
          color: shareStatus.includes('success') || shareStatus.includes('Copied') ? '#22c55e' : '#ef4444',
          display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          <Check size={14} /> {shareStatus}
        </div>
      )}

      <button onClick={shareViaWebShare} className="editor-btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <Share2 size={14} /> Share (Native)
      </button>

      <button onClick={copyToClipboard} className="editor-btn-surface" style={{ width: '100%' }}>
        <ClipboardCopy size={14} /> Copy to Clipboard
      </button>

      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Direct links</div>

      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={shareToFacebook} className="editor-btn-surface" style={{ flex: 1 }}>
          <Facebook size={14} /> Facebook
        </button>
        <button onClick={shareToTwitter} className="editor-btn-surface" style={{ flex: 1 }}>
          <Twitter size={14} /> X / Twitter
        </button>
      </div>

      <button onClick={downloadCard} className="editor-btn-surface" style={{ width: '100%' }}>
        <Download size={14} /> Download PNG
      </button>
    </div>
  );

  const renderOverlayPanel = () => (
    <div className="editor-panel-inner">
      <PanelHeader title="Overlay" />
      <p className="panel-subtitle">Add a marketing banner at the bottom of the image.</p>

      {/* Active overlay indicator */}
      {overlayUrl && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px', background: 'rgba(124,58,237,0.1)', borderRadius: '8px',
          border: '1px solid rgba(124,58,237,0.3)', fontSize: '11px', color: 'var(--text-secondary)'
        }}>
          <span>Overlay active</span>
          <button onClick={() => setOverlayUrl(null)} style={{
            background: 'none', border: 'none', color: 'var(--accent-red)',
            cursor: 'pointer', padding: '2px', display: 'flex', fontSize: '11px'
          }}>
            <X size={14} /> Remove
          </button>
        </div>
      )}

      <div className="image-grid">
        {customOverlays.map((src, i) => (
          <div key={`custom-${i}`}
            className={`image-grid-item ${overlayUrl === src ? 'selected' : ''}`}
            onClick={() => setOverlayUrl(overlayUrl === src ? null : src)}
            style={{ aspectRatio: 'auto' }}
          >
            <img src={src} alt={`Overlay ${i + 1}`}
              style={{ height: '40px', width: '100%', objectFit: 'contain', background: '#fff' }} />
          </div>
        ))}
      </div>

      <button onClick={uploadOverlay} className="editor-btn-surface" style={{ width: '100%' }}>
        <Upload size={14} /> Upload custom overlay
      </button>
    </div>
  );

  // ─── Sidebar items definition ───────────────────────────────

  const sidebarItems: { panel: PanelType; icon: React.ReactNode; label: string; color?: string }[] = [
    { panel: 'url', icon: <Link size={20} />, label: 'URL' },
    { panel: 'images', icon: <Image size={20} />, label: 'Images' },
    { panel: 'text', icon: <Type size={20} />, label: 'Text' },
    { panel: 'upload', icon: <Upload size={20} />, label: 'Upload' },
    { panel: 'date', icon: <Calendar size={20} />, label: 'Date' },
    { panel: 'overlay', icon: <Layers size={20} />, label: 'Overlay' },
    { panel: 'share', icon: <Share2 size={20} />, label: 'Share' },
  ];

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className={`editor-shell ${isMobile ? 'mobile' : ''}`}>
      {/* ── Navbar ── */}
      <header className="editor-navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={18} style={{ color: 'var(--accent-purple)' }} />
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Card Editor
          </span>
          {!isMobile && (
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '12px', marginLeft: '4px' }}>
              1080 × 810
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button onClick={reloadFromApi} className="navbar-btn navbar-btn-outline" disabled={isLoading}>
            <RotateCcw size={13} />
            {!isMobile && 'Reset'}
          </button>
          <button onClick={downloadCard} className="navbar-btn navbar-btn-accent">
            <Download size={13} />
            {!isMobile && 'Download'}
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="editor-body">
        {/* ── Icon sidebar (desktop: left, mobile: bottom) ── */}
        <nav className="editor-sidebar">
          {sidebarItems.map((item) => (
            <button key={item.label}
              className={`sidebar-btn ${activePanel === item.panel ? 'active' : ''}`}
              onClick={() => togglePanel(item.panel!)}
            >
              {item.icon}
              {!isMobile && item.label}
            </button>
          ))}

          {!isMobile && <div className="sidebar-divider" />}

          <button className="sidebar-btn" onClick={deleteSelected}
            style={{ color: 'var(--accent-red)' }}>
            <Trash2 size={20} />
            {!isMobile && 'Delete'}
          </button>
        </nav>

        {/* ── Slide-out panel (desktop: side, mobile: bottom sheet) ── */}
        <aside className={`editor-panel ${activePanel ? 'open' : ''}`}>
          {activePanel === 'url' && renderUrlPanel()}
          {activePanel === 'images' && renderImagesPanel()}
          {activePanel === 'text' && renderTextPanel()}
          {activePanel === 'upload' && renderUploadPanel()}
          {activePanel === 'date' && renderDatePanel()}
          {activePanel === 'share' && renderSharePanel()}
          {activePanel === 'overlay' && renderOverlayPanel()}
        </aside>

        {/* ── Mobile panel backdrop ── */}
        {isMobile && activePanel && (
          <div className="mobile-backdrop" onClick={() => setActivePanel(null)} />
        )}

        {/* ── Canvas workspace ── */}
        <main className="editor-workspace" ref={workspaceRef}>
          <div className="canvas-artboard" ref={artboardRef}>
            <canvas ref={canvasRef} width={1080} height={810} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default SocialCardEditor;