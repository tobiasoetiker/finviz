import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import { Outfit } from 'next/font/google';

const outfit = Outfit({ subsets: ['latin'] });


export const metadata: Metadata = {
  title: 'Sector Performance / Momentum Analyzer',
  description: 'Track industry performance and momentum with professional-grade overlays.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.className} antialiased min-h-screen flex flex-col`} suppressHydrationWarning>
        <Navbar />
        <main className="flex-grow pv-container py-6">
          {children}
        </main>
        <footer className="bg-white border-t border-gray-200 mt-auto py-8">
          <div className="pv-container text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
            &copy; {new Date().getFullYear()} Sector Performance / Momentum Analyzer <br />
            Data provided by Finviz Elite
          </div>
        </footer>
      </body>
    </html>
  );
}
