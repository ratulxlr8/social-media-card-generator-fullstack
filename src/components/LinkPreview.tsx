"use client";

import { toPng } from "html-to-image";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface LinkPreviewProps {
  url: string;
}

interface PreviewData {
  title: string;
  description: string;
  image: string;
  favicon: string;
  url: string;
}

const LinkPreview: React.FC<LinkPreviewProps> = ({ url }) => {
  console.log(url);
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Editable state
  const [editableTitle, setEditableTitle] = useState("");
  const [editableDescription, setEditableDescription] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
        console.log(response);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch preview data");
        }
        const result = await response.json();
        setData(result);
        // Initialize editable state
        setEditableTitle(result.title || "");
        setEditableDescription(result.description || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (url) {
      fetchData();
    }
  }, [url]);

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
    return (
      <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-48 bg-gray-200 rounded mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="w-full max-w-md mx-auto bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative"
        role="alert"
      >
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={cardRef}
        className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 my-4"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <textarea
            value={editableTitle}
            onChange={(e) => setEditableTitle(e.target.value)}
            className="font-bold text-xl text-gray-800 w-full border-none focus:ring-0 p-0 bg-transparent resize-none overflow-hidden font-bengali"
            placeholder="Enter title..."
            rows={2}
            style={{ minHeight: "3.5rem" }}
          />
        </div>

        {/* Body */}
        <div className="relative h-64 w-full bg-gray-100">
          {data.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.image}
              alt={editableTitle}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              No Image Available
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex items-center justify-center">
          <p className="font-bengali">বিস্তারিত দেখুন কমেন্টে</p>
        </div>
      </div>

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
