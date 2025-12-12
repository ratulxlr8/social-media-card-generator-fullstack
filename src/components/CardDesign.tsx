import { forwardRef } from 'react';

interface CardDesignProps {
  title: string;
  onTitleChange: (title: string) => void;
  image: string | null;
}

const CardDesign = forwardRef<HTMLDivElement, CardDesignProps>(
  ({ title, onTitleChange, image }, ref) => {
    return (
      <div
        ref={ref}
        className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 my-4"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <textarea
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="font-bold text-xl text-gray-800 w-full border-none focus:ring-0 p-0 bg-transparent resize-none overflow-hidden font-bengali"
            placeholder="Enter title..."
            rows={2}
            style={{ minHeight: "3.5rem" }}
          />
        </div>

        {/* Body */}
        <div className="relative h-64 w-full bg-gray-100">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={title}
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
    );
  }
);

CardDesign.displayName = 'CardDesign';

export default CardDesign;
