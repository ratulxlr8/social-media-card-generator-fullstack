import type { LinkPreviewResponse } from '@/types/api';
import { useEffect, useRef, useState } from 'react';

type DetectedLanguage = 'bn' | 'en' | 'unknown';

function detectLanguage(text: string): DetectedLanguage {
  if (!text) return 'unknown';
  const hasBangla = /[\u0980-\u09FF]/.test(text);
  const hasEnglish = /[A-Za-z]/.test(text);
  if (hasBangla && !hasEnglish) return 'bn';
  if (hasEnglish && !hasBangla) return 'en';
  if (hasBangla && hasEnglish) return 'unknown';
  return 'unknown';
}
// Type declarations for Fabric.js loaded from CDN
declare global {
  const fabric: any;
}

type FabricObject = any;
type FabricCanvas = any;

const SocialCardEditor = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [ogData, setOgData] = useState<LinkPreviewResponse | null>(null);
  const [fetchBodyImages, setFetchBodyImages] = useState(false);
  const [bodyImages, setBodyImages] = useState<string[]>([]);
  const [allImages, setAllImages] = useState<string[]>([]);

  // Default data for initial load
  const defaultData = {
    title: 'Enter a URL to fetch metadata',
    description: 'Use the form above to fetch metadata from any website',
    imageUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=600&fit=crop'
  };

  useEffect(() => {
    // Load Fabric.js from CDN
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js';
    script.async = true;
    script.onload = () => {
      setTimeout(() => {
        initializeCanvas();
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

    const canvasSize = 1080;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: canvasSize,
      height: canvasSize,
      backgroundColor: '#2c3e50'
    });

    fabricCanvasRef.current = canvas;

    // Add subtle grid for better UX
    const gridSize = 54;
    for (let i = 0; i <= (canvasSize / gridSize); i++) {
      canvas.add(new fabric.Line([i * gridSize, 0, i * gridSize, canvasSize], {
        stroke: '#34495e',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        opacity: 0.3
      }));
      canvas.add(new fabric.Line([0, i * gridSize, canvasSize, i * gridSize], {
        stroke: '#34495e',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        opacity: 0.3
      }));
    }
  };

  const fetchOgData = async (url: string) => {
    if (!url.trim()) return;

    setIsLoading(true);
    try {
      // Build URL with fetchBodyImages parameter
      const params = new URLSearchParams({ url });
      if (fetchBodyImages) {
        params.set('fetchBodyImages', '1');
      }

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

        // Handle body images
        const fetchedBodyImages = data.metadata.bodyImages || [];
        setBodyImages(fetchedBodyImages);

        // Create combined image list (main image + body images)
        const combinedImages = [newImageUrl, ...fetchedBodyImages].filter(img => img && img.trim() !== '');
        setAllImages(combinedImages);

        renderCard(newTitle, newImageUrl);
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

    // Load default data initially
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
    if (urlInput.trim()) {
      fetchOgData(urlInput.trim());
    }
  };

  const renderCard = (titleText: string, imgUrl: string) => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    
    // Render immediately, font loading will happen automatically
    renderCardContent(titleText, imgUrl, canvas);
  };

  const renderCardContent = (titleText: string, imgUrl: string, canvas: FabricCanvas) => {
    // Detect language for subtitle
    const language = detectLanguage(titleText);
    const subtitleText = language === 'bn' ? 'বিস্তারিত কমেন্টে' : 'See details in comments';

    // Clear previous content (keep grid)
    const objects = canvas.getObjects();
    objects.forEach((obj: FabricObject) => {
      if (obj.selectable !== false) {
        canvas.remove(obj);
      }
    });

    // Card dimensions - full canvas size (1080×1080)
    const canvasSize = 1080;
    const cardWidth = canvasSize;
    const cardHeight = canvasSize;

    // Add main card background - full size, no padding
    const cardBg = new fabric.Rect({
      left: 0,
      top: 0,
      width: cardWidth,
      height: cardHeight,
      fill: 'white',
      selectable: false
    });
    canvas.add(cardBg);

    // Add title text at the top with proper centering and wrapping
    const titlePadding = 72; // Scaled from 40 (40 * 1.8 = 72)
    const titleWidth = cardWidth - (titlePadding * 2);
    
    const title = new fabric.Textbox(titleText, {
      left: canvasSize / 2, // Center horizontally on canvas
      top: 72, // Scaled from 40 (40 * 1.8 = 72)
      width: titleWidth,
      fontSize: 42, // Scaled from 24 (24 * 1.8 = 43.2, rounded to 42)
      fontWeight: 'bold',
      fill: '#2c3e50',
      fontFamily: 'Noto Serif Bengali',
      textAlign: 'center',
      originX: 'center',
      originY: 'top',
      cornerColor: '#3498db',
      cornerSize: 10,
      transparentCorners: false,
      borderColor: '#3498db',
      lineHeight: 1.4,
      charSpacing: 0,
      breakWords: false,
      // Enable resizing
      lockRotation: false,
      lockScalingFlip: true,
      hasControls: true,
      hasBorders: true
    });
    canvas.add(title);

    // Calculate image area (leaving space for title and subtitle)
    const imageAreaTop = 162; // Scaled from 90 (90 * 1.8 = 162)
    const imageAreaHeight = cardHeight - 288; // Scaled from 160 (160 * 1.8 = 288)
    const imageAreaWidth = cardWidth - 108; // Scaled from 60 (60 * 1.8 = 108)
    const imageAreaLeft = 54; // Scaled from 30 (30 * 1.8 = 54)

    // Add image with proper aspect ratio
    if (imgUrl) {
      fabric.Image.fromURL(imgUrl, (img: FabricObject) => {
        const imgWidth = img.width || 800;
        const imgHeight = img.height || 600;
        const imgAspectRatio = imgWidth / imgHeight;

        // Calculate dimensions maintaining aspect ratio
        let finalWidth, finalHeight;

        // Check if image should be 16:9 or maintain original ratio
        const targetAspectRatio = 16 / 9;

        if (Math.abs(imgAspectRatio - targetAspectRatio) > 0.5) {
          // Force 16:9 if original ratio is significantly different
          finalWidth = imageAreaWidth;
          finalHeight = finalWidth / targetAspectRatio;

          // If height exceeds available space, scale down
          if (finalHeight > imageAreaHeight) {
            finalHeight = imageAreaHeight;
            finalWidth = finalHeight * targetAspectRatio;
          }
        } else {
          // Maintain original aspect ratio
          if (imgAspectRatio > (imageAreaWidth / imageAreaHeight)) {
            // Image is wider, fit to width
            finalWidth = imageAreaWidth;
            finalHeight = finalWidth / imgAspectRatio;
          } else {
            // Image is taller, fit to height
            finalHeight = imageAreaHeight;
            finalWidth = finalHeight * imgAspectRatio;
          }
        }

        const scaleX = finalWidth / imgWidth;
        const scaleY = finalHeight / imgHeight;

        img.set({
          left: imageAreaLeft + (imageAreaWidth - finalWidth) / 2,
          top: imageAreaTop + (imageAreaHeight - finalHeight) / 2,
          scaleX: scaleX,
          scaleY: scaleY,
          cornerColor: '#3498db',
          cornerSize: 8,
          transparentCorners: false,
          borderColor: '#3498db'
        });
        canvas.add(img);
        canvas.renderAll();
      }, { crossOrigin: 'anonymous' });
    }

    // Add subtitle at the bottom with proper centering and wrapping
    const subtitle = new fabric.Textbox(subtitleText, {
      left: canvasSize / 2, // Center horizontally on canvas
      top: cardHeight - 126, // Scaled from 70 (70 * 1.8 = 126)
      width: titleWidth,
      fontSize: 28, // Scaled from 16 (16 * 1.8 = 28.8, rounded to 28)
      fill: '#7f8c8d',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      originX: 'center',
      originY: 'top',
      cornerColor: '#3498db',
      cornerSize: 10,
      transparentCorners: false,
      borderColor: '#3498db',
      lineHeight: 1.4,
      charSpacing: 0,
      splitByGrapheme: true,
      breakWords: false,
      // Enable resizing
      lockRotation: false,
      lockScalingFlip: true,
      hasControls: true,
      hasBorders: true
    });
    canvas.add(subtitle);

    canvas.renderAll();
  };

  const downloadCard = () => {
    if (!fabricCanvasRef.current) return;

    // Export at native 1080×1080 resolution
    const dataURL = fabricCanvasRef.current.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1, // Already set to 1, so it exports at canvas's internal resolution (1080x1080)
      width: 1080,
      height: 1080
    });

    const link = document.createElement('a');
    link.download = 'social-card-1080x1080.png';
    link.href = dataURL;
    link.click();
  };

  const addText = () => {
    if (!fabricCanvasRef.current) return;

    const text = new fabric.Textbox('New Text', {
      left: 540, // Scaled from 270 (270 * 1.8 = 486, but 1080/2 = 540 for center)
      top: 486, // Scaled from 270 (270 * 1.8 = 486)
      width: 648, // Scaled from 360 (360 * 1.8 = 648)
      fontSize: 58, // Scaled from 32 (32 * 1.8 = 57.6, rounded to 58)
      fill: '#2c3e50',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      originX: 'center',
      originY: 'top',
      cornerColor: '#3498db',
      cornerSize: 10,
      transparentCorners: false,
      borderColor: '#3498db',
      lineHeight: 1.4,
      charSpacing: 0,
      splitByGrapheme: true,
      breakWords: false,
      lockRotation: false,
      lockScalingFlip: true,
      hasControls: true,
      hasBorders: true
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

  const reloadFromApi = () => {
    loadApiData();
  };

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
            const imgWidth = img.width || 300;
            const imgHeight = img.height || 300;

            const maxSize = 648; // Scaled from 360 (360 * 1.8 = 648)
            let scaleX, scaleY;

            if (imgWidth > imgHeight) {
              scaleX = maxSize / imgWidth;
              scaleY = maxSize / imgWidth;
            } else {
              scaleX = maxSize / imgHeight;
              scaleY = maxSize / imgHeight;
            }

            img.set({
              left: 324, // Scaled from 180 (180 * 1.8 = 324)
              top: 324, // Scaled from 180 (180 * 1.8 = 324)
              scaleX: scaleX,
              scaleY: scaleY,
              cornerColor: '#3498db',
              cornerSize: 8,
              transparentCorners: false,
              borderColor: '#3498db'
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
      fabric.Image.fromURL(url, (img: FabricObject) => {
        const imgWidth = img.width || 300;
        const imgHeight = img.height || 300;

        const maxSize = 648; // Scaled from 360 (360 * 1.8 = 648)
        let scaleX, scaleY;

        if (imgWidth > imgHeight) {
          scaleX = maxSize / imgWidth;
          scaleY = maxSize / imgWidth;
        } else {
          scaleX = maxSize / imgHeight;
          scaleY = maxSize / imgHeight;
        }

        img.set({
          left: 324, // Scaled from 180 (180 * 1.8 = 324)
          top: 324, // Scaled from 180 (180 * 1.8 = 324)
          scaleX: scaleX,
          scaleY: scaleY,
          cornerColor: '#3498db',
          cornerSize: 8,
          transparentCorners: false,
          borderColor: '#3498db'
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-6">
      {/* Subtle background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative">
        {/* Compact Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Social Card Editor
            </h1>
            <p className="text-sm text-white/50">Create 1080×1080 social media cards</p>
          </div>
          <button
            onClick={downloadCard}
            className="hidden md:flex items-center gap-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 text-sm font-medium py-2 px-4 rounded-xl border border-green-500/20 transition-colors"
          >
            ⬇ Download
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Canvas Area */}
          <div className="lg:col-span-8">
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-3 md:p-4 border border-white/10 shadow-2xl shadow-purple-500/5">
              <div className="flex justify-center canvas-preview-wrapper">
                <canvas
                  ref={canvasRef}
                  width={1080}
                  height={1080}
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Compact Sidebar */}
          <div className="lg:col-span-4 space-y-3">
            {/* URL Input */}
            <div className="backdrop-blur-xl bg-white/5 rounded-xl p-4 border border-white/10">
              <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-3">Fetch Preview</h2>
              <form onSubmit={handleUrlSubmit} className="space-y-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Paste a URL..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 text-sm focus:border-purple-500/50 focus:outline-none transition-colors"
                />

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="fetchBodyImages"
                    checked={fetchBodyImages}
                    onChange={(e) => setFetchBodyImages(e.target.checked)}
                    className="w-3.5 h-3.5 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500 focus:ring-1"
                  />
                  <label htmlFor="fetchBodyImages" className="text-xs text-white/60">
                    Extract body images
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !urlInput.trim()}
                  className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-white/10 disabled:text-white/30 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  {isLoading ? 'Loading...' : 'Fetch'}
                </button>
              </form>
            </div>

            {/* Tools — compact 3-col grid */}
            <div className="backdrop-blur-xl bg-white/5 rounded-xl p-4 border border-white/10">
              <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-3">Tools</h2>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={addText}
                  className="bg-white/5 hover:bg-white/10 text-white/80 text-xs font-medium py-2 px-2 rounded-lg border border-white/10 transition-colors"
                >
                  + Text
                </button>
                <button
                  onClick={addImageFromFile}
                  className="bg-white/5 hover:bg-white/10 text-white/80 text-xs font-medium py-2 px-2 rounded-lg border border-white/10 transition-colors"
                >
                  Upload
                </button>
                <button
                  onClick={addImageFromUrl}
                  className="bg-white/5 hover:bg-white/10 text-white/80 text-xs font-medium py-2 px-2 rounded-lg border border-white/10 transition-colors"
                >
                  URL
                </button>
                <button
                  onClick={deleteSelected}
                  className="bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs font-medium py-2 px-2 rounded-lg border border-red-500/15 transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={reloadFromApi}
                  disabled={isLoading}
                  className="bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white/80 text-xs font-medium py-2 px-2 rounded-lg border border-white/10 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={downloadCard}
                  className="bg-green-500/15 hover:bg-green-500/25 text-green-300 text-xs font-medium py-2 px-2 rounded-lg border border-green-500/15 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Body Images Section */}
            {(allImages.length > 0 || (fetchBodyImages && ogData)) && (
              <div className="backdrop-blur-xl bg-white/5 rounded-xl p-4 border border-white/10">
                <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-3">
                  Images ({allImages.length})
                </h2>

                {allImages.length > 0 ? (
                  <>
                    <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
                      {allImages.map((imgUrl, index) => (
                        <div
                          key={index}
                          className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${imgUrl === imageUrl
                            ? 'border-purple-500 ring-1 ring-purple-500/50'
                            : 'border-white/15 hover:border-white/30'
                            }`}
                          onClick={() => handleImageSelect(imgUrl)}
                        >
                          <img
                            src={imgUrl}
                            alt={`Image ${index + 1}`}
                            className="w-full h-12 object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            {imgUrl === imageUrl && (
                              <div className="w-3 h-3 bg-purple-500 rounded-full border-2 border-white"></div>
                            )}
                          </div>
                          {index === 0 && (
                            <div className="absolute top-0.5 left-0.5 bg-purple-500 text-white text-[10px] px-1 py-0.5 rounded">
                              OG
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-white/40 mt-1.5">
                      Click to swap image
                    </p>
                  </>
                ) : fetchBodyImages && ogData && (
                  <p className="text-xs text-white/50 text-center py-2">
                    No body images found
                  </p>
                )}
              </div>
            )}

            {/* Metadata Display — compact */}
            {(title || description) && (
              <div className="backdrop-blur-xl bg-white/5 rounded-xl p-4 border border-white/10">
                <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-2">Metadata</h2>
                <div className="space-y-1.5">
                  {title && (
                    <div>
                      <span className="text-[10px] font-medium text-white/40 uppercase">Title</span>
                      <p className="text-xs text-white/80 truncate">{title}</p>
                    </div>
                  )}
                  {description && (
                    <div>
                      <span className="text-[10px] font-medium text-white/40 uppercase">Desc</span>
                      <p className="text-xs text-white/60 line-clamp-2">{description}</p>
                    </div>
                  )}
                  {bodyImages.length > 0 && (
                    <p className="text-[10px] text-white/50">
                      {bodyImages.length} body images extracted
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Tips — minimal */}
            <div className="backdrop-blur-xl bg-white/5 rounded-xl p-3 border border-white/10">
              <p className="text-[10px] text-white/40 leading-relaxed">
                <span className="text-white/60 font-medium">Tips:</span> Drag to move · Double-click to edit · Corners to resize · Rotate via handle
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialCardEditor;