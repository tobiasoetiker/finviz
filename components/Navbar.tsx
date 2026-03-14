'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const pathname = usePathname();

    return (
        <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl shadow-[0_1px_3px_rgb(0,0,0,0.04)] py-6">
            <div className="max-w-[1400px] mx-auto px-10 flex flex-row justify-between items-center w-full">
                <Link href="/" className="text-xl font-black text-black tracking-tight shrink-0 uppercase">
                    Sector Performance / Momentum Analyzer
                </Link>
                <div className="hidden md:flex items-center space-x-6">
                    <Link
                        href="/"
                        className={`text-[11px] font-black uppercase tracking-widest transition-colors ${
                            pathname === '/' ? 'text-black border-b-2 border-pv-blue pb-0.5' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Dashboard
                    </Link>
                    <Link
                        href="/signals"
                        className={`text-[11px] font-black uppercase tracking-widest transition-colors ${
                            pathname === '/signals' ? 'text-black border-b-2 border-pv-blue pb-0.5' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Signals
                    </Link>
                    <Link
                        href="/backtest"
                        className={`text-[11px] font-black uppercase tracking-widest transition-colors ${
                            pathname === '/backtest' ? 'text-black border-b-2 border-pv-blue pb-0.5' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Backtest
                    </Link>
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Finviz Elite Data Engine</span>
                </div>
            </div>
        </nav>
    );
}
