import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCJP.io | Master of Family, Money & Life",
  description: "Automated guide map for wealth creation, masculine family leadership, and cognitive sovereignty in the modern era.",
  keywords: ["personal success", "wealth creation", "family leadership", "masculine duties", "mindset"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full dark antialiased">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        {/* Google AdSense Integration */}
        <script 
          async 
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-placeholder'}`} 
          crossOrigin="anonymous"
        ></script>
      </head>
      <body className="min-h-full flex flex-col bg-[#09090b] text-[#f4f4f5]">
        {/* Navigation */}
        <header className="sticky top-0 z-50 border-b border-[#27272a] bg-[#09090b]/80 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <a href="/" className="text-xl font-bold tracking-tight text-[#f4f4f5] hover:opacity-80 transition-opacity">
              MCJP<span className="text-amber-500">.io</span>
            </a>
            <nav className="flex items-center gap-6 text-sm font-medium text-zinc-400">
              <a href="/" className="hover:text-[#f4f4f5] transition-colors">Home</a>
              <a href="/?category=Money" className="hover:text-[#f4f4f5] transition-colors">Money</a>
              <a href="/?category=Life" className="hover:text-[#f4f4f5] transition-colors">Life</a>
              <a href="/?category=Discipline" className="hover:text-[#f4f4f5] transition-colors">Discipline</a>
            </nav>
          </div>
        </header>

        {/* Main Workspace */}
        <main className="flex-grow max-w-6xl w-full mx-auto px-6 py-12">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-[#27272a] py-8 bg-[#09090b]">
          <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
            <div>
              &copy; {new Date().getFullYear()} MCJP.io. All rights reserved.
            </div>
            <div className="flex gap-4">
              <span>Sovereign Intelligence Systems</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
