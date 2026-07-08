'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application boundary error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 mb-6 font-bold text-2xl">
        !
      </div>
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Something went wrong</h1>
      <p className="text-gray-500 max-w-sm mb-8 text-sm">
        An unexpected error occurred in the application.
      </p>
      <div className="flex gap-4 justify-center">
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold shadow-md hover:bg-purple-700 transition-all duration-200"
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all duration-200"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
