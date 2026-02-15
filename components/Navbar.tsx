import Link from 'next/link';

export default function Navbar() {
    return (
        <nav className="bg-white border-b border-gray-100 py-6">
            <div className="max-w-[1400px] mx-auto px-10 flex flex-row justify-between items-center w-full">
                <Link href="/" className="text-xl font-black text-black tracking-tight shrink-0 uppercase">
                    Sector Performance / Momentum Analyzer
                </Link>
                <div className="hidden md:flex items-center space-x-6 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                    <span>Finviz Elite Data Engine</span>
                </div>
            </div>
        </nav>
    );
}
