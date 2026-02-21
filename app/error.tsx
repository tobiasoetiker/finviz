'use client'; // Error components must be Client Components

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center font-sans text-center px-4">
            <div className="bg-red-50 text-red-600 rounded-full w-20 h-20 flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2 mt-4">Something went wrong!</h2>
            <p className="text-gray-500 mb-8 max-w-md">
                We encountered an error while trying to fetch the latest market data. This could be due to a temporary database connection issue.
            </p>
            <button
                className="bg-[#3182CE] hover:bg-[#2b6cb0] text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-sm"
                onClick={
                    // Attempt to recover by trying to re-render the segment
                    () => reset()
                }
            >
                Try again
            </button>
        </div>
    );
}
