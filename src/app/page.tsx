"use client";
import LinkPreview from "@/components/LinkPreview";
import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [inputValue, setInputValue] = useState("");

  const handlePreview = () => {
    if (inputValue) {
      setUrl(inputValue);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24 bg-yellow-50">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold text-center w-full text-black">
          {/* Bangladesh District Map */}
        </h1>
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

        <div className="w-full max-w-md flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter URL..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handlePreview}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Preview
          </button>
        </div>

        <div className="w-full max-w-md">
          <LinkPreview url={url} />
        </div>
      </div>
    </main>
  );
}
