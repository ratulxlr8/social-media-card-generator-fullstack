import type { LinkPreviewResponse } from '@/types/api';
import { useEffect, useRef, useState } from 'react';
import { detectLanguage } from '@/lib/htmlParser';

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

    // Make canvas responsive but maintain 1:1 aspect ratio
    const canvasSize = 600; // Smaller display size for better layout

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: canvasSize,
      height: canvasSize,
      backgroundColor: '#2c3e50'
    });

    fabricCanvasRef.current = canvas;

    // Add subtle grid for better UX
    const gridSize = 30;
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
        // Handle error response
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
      // Fallback to default data
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

    // Card dimensions - full canvas size
    const canvasSize = 600;
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
    const titlePadding = 40;
    const titleWidth = cardWidth - (titlePadding * 2);

    const title = new fabric.Textbox(titleText, {
      left: canvasSize / 2, // Center horizontally on canvas
      top: 40,
      width: titleWidth,
      fontSize: 24,
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
    const imageAreaTop = 90;
    const imageAreaHeight = cardHeight - 160; // Space for title (90) and subtitle (70)
    const imageAreaWidth = cardWidth - 60; // 30px padding on each side
    const imageAreaLeft = 30;

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
      top: cardHeight - 70,
      width: titleWidth,
      fontSize: 16,
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

    // Export at 2x resolution (1200x1200) while displaying at 600x600
    const dataURL = fabricCanvasRef.current.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2, // This will make it 1200x1200
      width: 600,
      height: 600
    });

    const link = document.createElement('a');
    link.download = 'social-card-1200x1200.png';
    link.href = dataURL;
    link.click();
  };

  const addText = () => {
    if (!fabricCanvasRef.current) return;

    const text = new fabric.Textbox('New Text', {
      left: 300, // Center of 600px canvas
      top: 150,
      width: 200,
      fontSize: 18,
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
      // Enable resizing
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

            // Scale image to fit nicely on canvas
            const maxSize = 200;
            let scaleX, scaleY;

            if (imgWidth > imgHeight) {
              scaleX = maxSize / imgWidth;
              scaleY = maxSize / imgWidth;
            } else {
              scaleX = maxSize / imgHeight;
              scaleY = maxSize / imgHeight;
            }

            img.set({
              left: 100,
              top: 100,
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

        // Scale image to fit nicely on canvas
        const maxSize = 200;
        let scaleX, scaleY;

        if (imgWidth > imgHeight) {
          scaleX = maxSize / imgWidth;
          scaleY = maxSize / imgWidth;
        } else {
          scaleX = maxSize / imgHeight;
          scaleY = maxSize / imgHeight;
        }

        img.set({
          left: 100,
          top: 100,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 md:p-8">
      {/* Subtle background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative">
        {/* Header */}
        <div className="mb-8 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Social Card Editor
          </h1>
          <p className="text-white/60">Create and customize your social media cards</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Canvas Area */}
          <div className="lg:col-span-2">
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 md:p-6 border border-white/10">
              <div className="flex justify-center">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={600}
                  className="rounded-xl max-w-full h-auto"
                  style={{ maxWidth: '600px', maxHeight: '600px' }}
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* URL Input */}
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-5 border border-white/10">
              <h2 className="text-lg font-semibold text-white mb-4">Fetch Preview</h2>
              <form onSubmit={handleUrlSubmit} className="space-y-3">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Enter URL..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/40 text-sm focus:border-purple-500/50 focus:outline-none transition-colors"
                />

                {/* Body Images Checkbox */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="fetchBodyImages"
                    checked={fetchBodyImages}
                    onChange={(e) => setFetchBodyImages(e.target.checked)}
                    className="w-4 h-4 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500 focus:ring-2"
                  />
                  <label htmlFor="fetchBodyImages" className="text-sm text-white/80">
                    Extract body images
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !urlInput.trim()}
                  className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-white/10 disabled:text-white/40 text-white font-medium py-2.5 px-4 rounded-xl transition-colors"
                >
                  {isLoading ? 'Loading...' : 'Fetch'}
                </button>
              </form>
            </div>

            {/* Tools */}
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-5 border border-white/10">
              <h2 className="text-lg font-semibold text-white mb-4">Tools</h2>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={addText}
                  className="bg-white/5 hover:bg-white/10 text-white/90 text-sm font-medium py-2.5 px-3 rounded-xl border border-white/10 transition-colors"
                >
                  Add Text
                </button>
                <button
                  onClick={addImageFromFile}
                  className="bg-white/5 hover:bg-white/10 text-white/90 text-sm font-medium py-2.5 px-3 rounded-xl border border-white/10 transition-colors"
                >
                  Upload
                </button>
                <button
                  onClick={addImageFromUrl}
                  className="bg-white/5 hover:bg-white/10 text-white/90 text-sm font-medium py-2.5 px-3 rounded-xl border border-white/10 transition-colors"
                >
                  Image URL
                </button>
                <button
                  onClick={deleteSelected}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-medium py-2.5 px-3 rounded-xl border border-red-500/20 transition-colors"
                >
                  Delete
                </button>
              </div>
              <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2">
                <button
                  onClick={reloadFromApi}
                  disabled={isLoading}
                  className="bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white/90 text-sm font-medium py-2.5 px-3 rounded-xl border border-white/10 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={downloadCard}
                  className="bg-green-500/20 hover:bg-green-500/30 text-green-300 text-sm font-medium py-2.5 px-3 rounded-xl border border-green-500/20 transition-colors"
                >
                  Download
                </button>
              </div>
            </div>

            {/* Body Images Section */}
            {(allImages.length > 0 || (fetchBodyImages && ogData)) && (
              <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-5 border border-white/10">
                <h2 className="text-lg font-semibold text-white mb-4">
                  Images ({allImages.length})
                </h2>

                {allImages.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                      {allImages.map((imgUrl, index) => (
                        <div
                          key={index}
                          className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${imgUrl === imageUrl
                            ? 'border-purple-500 ring-2 ring-purple-500/50'
                            : 'border-white/20 hover:border-white/40'
                            }`}
                          onClick={() => handleImageSelect(imgUrl)}
                        >
                          <img
                            src={imgUrl}
                            alt={`Image ${index + 1}`}
                            className="w-full h-16 object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            {imgUrl === imageUrl && (
                              <div className="w-4 h-4 bg-purple-500 rounded-full border-2 border-white"></div>
                            )}
                          </div>
                          {index === 0 && (
                            <div className="absolute top-1 left-1 bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded">
                              Main
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-white/50 mt-2">
                      Click any image to use it in your card
                    </p>
                  </>
                ) : fetchBodyImages && ogData && (
                  <div className="text-center py-4">
                    <p className="text-sm text-white/60">
                      No additional images found in the page body
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Metadata Display */}
            {(title || description) && (
              <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-5 border border-white/10">
                <h2 className="text-lg font-semibold text-white mb-4">Metadata</h2>
                <div className="space-y-3">
                  {title && (
                    <div>
                      <label className="block text-xs font-medium text-white/50 mb-1">Title</label>
                      <p className="text-sm text-white/90 truncate">{title}</p>
                    </div>
                  )}
                  {description && (
                    <div>
                      <label className="block text-xs font-medium text-white/50 mb-1">Description</label>
                      <p className="text-sm text-white/70 line-clamp-2">{description}</p>
                    </div>
                  )}
                  {bodyImages.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-white/50 mb-1">
                        Body Images Found
                      </label>
                      <p className="text-sm text-white/70">
                        {bodyImages.length} additional images extracted
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-5 border border-white/10">
              <h2 className="text-lg font-semibold text-white mb-3">Quick Tips</h2>
              <ul className="text-sm text-white/60 space-y-1.5">
                <li>• Drag to move elements</li>
                <li>• Double-click to edit text</li>
                <li>• Drag corners to resize text</li>
                <li>• Rotate using corner handle</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialCardEditor;