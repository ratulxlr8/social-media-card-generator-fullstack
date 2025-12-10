"use client";
import LinkPreview from "@/components/LinkPreview";
import { useState } from "react";
import { validateAndSanitizeUrl } from "@/utils/urlUtils";

export default function Home() {
  const [url, setUrl] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState("");

  const handlePreview = () => {
    if (!inputValue.trim()) {
      setInputError("Please enter a URL");
      return;
    }

    const { isValid, sanitized, error } = validateAndSanitizeUrl(inputValue);
    
    if (!isValid) {
      setInputError(error || "Invalid URL");
      return;
    }

    setInputError("");
    setUrl(sanitized);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24 bg-yellow-50">
      <div className="z-10 max-w-5xl w-full items-center justify-between text-sm lg:flex">
        <h1 className="text-4xl font-bold text-center w-full text-black mb-4">
          Link Preview Card Generator
        </h1>
        <p className="text-center w-full text-gray-600 mb-8">
          Generate beautiful social media cards from any URL
        </p>
      </div>

      <div className="w-full flex flex-col items-center gap-8">
        <div className="relative flex place-items-center w-full max-w-4xl">
          {/* The SimpleTestMap component is rendered here. 
              Consider renaming it to something more descriptive like 'BangladeshMap' or 'DeliveryHeatMap' if it represents the core feature. */}
          {/* <DistrictMap width={1200} height={1350} className="w-full h-auto" /> */}
          {/* <DeliveryHeatmap /> */}
          {/* <SimpleTestMap /> */}
          {/* <BangladeshHeatmap /> */}
        </div>

        <div className="w-full max-w-md">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (inputError) setInputError(""); // Clear error when user types
              }}
              onKeyPress={(e) => e.key === 'Enter' && handlePreview()}
              placeholder="Enter URL (e.g., https://example.com)"
              className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                inputError 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            <button
              onClick={handlePreview}
              disabled={!inputValue.trim()}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Preview
            </button>
          </div>
          
          {inputError && (
            <div className="text-sm text-red-600 mb-4 text-center">
              {inputError}
            </div>
          )}
          
          {url && !inputError && (
            <div className="text-sm text-gray-500 mb-4 text-center">
              Processing: <span className="font-mono">{url}</span>
            </div>
          )}
        </div>

        <div className="w-full max-w-md">
          {url && <LinkPreview url={url} />}
        </div>
      </div>
    </main>
  );
}
