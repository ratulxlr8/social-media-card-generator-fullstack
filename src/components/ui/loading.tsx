import React from 'react';

interface LoadingProps {
  className?: string;
}

export const LoadingCard: React.FC<LoadingProps> = ({ className = "" }) => {
  return (
    <div className={`w-full max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6 animate-pulse ${className}`}>
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="h-48 bg-gray-200 rounded mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    </div>
  );
};

export const LoadingSpinner: React.FC<LoadingProps> = ({ className = "" }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
};