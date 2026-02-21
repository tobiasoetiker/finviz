export default function Loading() {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center font-sans">
            <div className="w-16 h-16 border-4 border-[#3182CE] border-t-transparent border-solid rounded-full animate-spin mb-4"></div>
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">Loading Market Data...</h2>
            <p className="text-sm text-gray-500 mt-2">Fetching the latest insights from BigQuery</p>
        </div>
    );
}
