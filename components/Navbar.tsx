'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

const navLinks = [
    { href: '/', label: 'Dashboard' },
    { href: '/signals', label: 'Signals' },
    { href: '/backtest', label: 'Backtest' },
    { href: '/volatility', label: 'Volatility' },
];

export default function Navbar() {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl shadow-[0_1px_3px_rgb(0,0,0,0.04)] py-6">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 flex flex-row justify-between items-center w-full">
                <Link href="/" className="text-xl font-black text-black tracking-tight shrink-0 uppercase">
                    Sector Performance / Momentum Analyzer
                </Link>

                {/* Desktop nav */}
                <div className="hidden md:flex items-center space-x-6">
                    {navLinks.map(({ href, label }) => (
                        <Link
                            key={href}
                            href={href}
                            className={`text-[11px] font-black uppercase tracking-widest transition-colors ${
                                pathname === href ? 'text-black border-b-2 border-pv-blue pb-0.5' : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            {label}
                        </Link>
                    ))}
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Finviz Elite Data Engine</span>
                </div>

                {/* Mobile hamburger button */}
                <button
                    className="md:hidden p-2 -mr-2 text-gray-600 hover:text-black transition-colors"
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Toggle menu"
                >
                    {menuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile menu panel */}
            <div
                className={`md:hidden overflow-hidden transition-all duration-200 ease-in-out ${
                    menuOpen ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'
                }`}
            >
                <div className="px-4 sm:px-6 pb-4 pt-2 flex flex-col space-y-3 border-t border-slate-100 mt-4">
                    {navLinks.map(({ href, label }) => (
                        <Link
                            key={href}
                            href={href}
                            onClick={() => setMenuOpen(false)}
                            className={`text-[11px] font-black uppercase tracking-widest transition-colors py-2 ${
                                pathname === href ? 'text-black border-l-2 border-pv-blue pl-3' : 'text-gray-400 hover:text-gray-600 pl-3'
                            }`}
                        >
                            {label}
                        </Link>
                    ))}
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest pl-3 pt-1">Finviz Elite Data Engine</span>
                </div>
            </div>
        </nav>
    );
}
