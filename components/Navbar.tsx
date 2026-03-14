'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const pathname = usePathname();

    return (
        <nav className="bg-white border-b border-gray-100 py-6">
            <div className="max-w-[1400px] mx-auto px-10 flex flex-row justify-between items-center w-full">
                <Link href="/" className="text-xl font-black text-black tracking-tight shrink-0 uppercase">
                    Sector Performance / Momentum Analyzer
                </Link>
                <div className="hidden md:flex items-center space-x-6">
                    <Link
                        href="/"
                        className={`text-[11px] font-black uppercase tracking-widest transition-colors ${
                            pathname === '/' ? 'text-black' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Dashboard
                    </Link>
                    <Link
                        href="/signals"
                        className={`text-[11px] font-black uppercase tracking-widest transition-colors ${
                            pathname === '/signals' ? 'text-black' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Signals
                    </Link>
                    <Link
                        href="/backtest"
                        className={`text-[11px] font-black uppercase tracking-widest transition-colors ${
                            pathname === '/backtest' ? 'text-black' : 'text-gray-400 hover:text-gray-600'
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
