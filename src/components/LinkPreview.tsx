"use client";

import { toPng } from "html-to-image";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLinkPreview } from "@/hooks/useLinkPreview";
import { LoadingCard } from "@/components/ui/loading";

interface LinkPreviewProps {
  url: string;
}

const LinkPreview: React.FC<LinkPreviewProps> = ({ url }) => {
  const { data, loading, error, refetch } = useLinkPreview(url);
  const cardRef = useRef<HTMLDivElement>(null);

  // Editable state
  const [editableTitle, setEditableTitle] = useState("");
  const [editableDescription, setEditableDescription] = useState("");

  // Update editable state when data changes
  useEffect(() => {
    if (data) {
      setEditableTitle(data.title || "");
      setEditableDescription(data.description || "");
    }
  }, [data]);

  const handleDownload = useCallback(async () => {
    if (cardRef.current === null) {
      return;
    }

    try {
      const dataUrl = await toPng(cardRef.current, { 
        cacheBust: true, 
        pixelRatio: 3, // Upscale for better quality
        backgroundColor: 'white', // Ensure clean background
        style: {
           margin: '0', // Remove any external margins
           boxShadow: 'none', // Optional: remove shadow if you want a flat image, or keep it if part of the design
        }
      });
      const link = document.createElement("a");
      link.download = "link-preview-card.png";
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to download image", err);
    }
  }, [cardRef]);

  if (loading) {
    return <LoadingCard />;
  }

  if (error) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
          role="alert"
        >
          <div className="flex items-center justify-between">
            <div>
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
            <button
              onClick={refetch}
              className="ml-4 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-4">
        <CardDesign
          ref={cardRef}
          title={editableTitle}
          onTitleChange={setEditableTitle}
          image={data.image}
        />

      <button
        onClick={handleDownload}
        className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" x2="12" y1="15" y2="3" />
        </svg>
        Download Card
      </button>
    </div>
  );
};

export default LinkPreview;
