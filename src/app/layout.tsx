import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCJP.io | Master of Family, Money & Life",
  description: "Automated guide map for wealth creation, masculine family leadership, and cognitive sovereignty in the modern era.",
  keywords: ["personal success", "wealth creation", "family leadership", "masculine duties", "mindset"],
  verification: {
    google: "MnMKxjqywGXoQaPoGH1ZbuIRcSDvmw2y0JuwsPeuPKQ",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        {/* Google AdSense Integration */}
        <script 
          async 
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-1966724508656296'}`} 
          crossOrigin="anonymous"
        ></script>
        {/* JSON-LD Structured Data Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "MCJP.io",
              "url": "https://blog.mcjp.io",
              "description": "Automated guide map for wealth creation, masculine family leadership, and cognitive sovereignty in the modern era.",
              "publisher": {
                "@type": "Organization",
                "name": "MCJP.io",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://blog.mcjp.io/globe.svg"
                }
              }
            })
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#f8fafc] text-slate-800">
        {/* Navigation */}
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <a href="/" className="text-xl font-bold tracking-tight text-slate-900 hover:opacity-80 transition-opacity">
              MCJP<span className="text-amber-600">.io</span>
            </a>
            <nav className="flex items-center gap-6 text-sm font-medium text-slate-500">
              <a href="/" className="hover:text-slate-900 transition-colors">Home</a>
              <a href="/?category=Money" className="hover:text-slate-900 transition-colors">Money</a>
              <a href="/?category=Life" className="hover:text-slate-900 transition-colors">Life</a>
              <a href="/?category=Discipline" className="hover:text-slate-900 transition-colors">Discipline</a>
            </nav>
          </div>
        </header>

        {/* Top Leaderboard Ad Unit */}
        <div className="max-w-6xl w-full mx-auto px-6 pt-6 -mb-6">
          <div className="p-2 rounded border border-slate-200 bg-slate-50 text-center text-xs text-slate-500 overflow-hidden min-h-[90px] flex flex-col justify-center items-center relative group shadow-xs">
            <div className="absolute top-1 left-2 uppercase tracking-widest text-[9px] text-slate-400 font-semibold select-none">Advertisement</div>
            <ins className="adsbygoogle"
                 style={{ display: 'block', width: '100%', minHeight: '90px' }}
                 data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-1966724508656296'}
                 data-ad-slot="top-leaderboard-ad-slot"
                 data-ad-format="horizontal"
                 data-full-width-responsive="true"></ins>
            <div className="py-2 text-[10px] text-slate-400 select-none">
              Top Banner (Active upon AdSense approval)
            </div>
          </div>
        </div>

        {/* Main Workspace */}
        <main className="flex-grow max-w-6xl w-full mx-auto px-6 py-12">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 py-8 bg-slate-50">
          <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div>
              &copy; {new Date().getFullYear()} MCJP.io. All rights reserved.
            </div>
            <div className="flex flex-wrap gap-4 items-center justify-center md:justify-end">
              <a href="/about" className="hover:text-slate-800 transition-colors">About</a>
              <a href="/contact" className="hover:text-slate-800 transition-colors">Contact</a>
              <a href="/privacy" className="hover:text-slate-800 transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-slate-800 transition-colors">Terms of Service</a>
              <a href="https://www.hostinger.com?REFERRALCODE=OYBPHARMOWCY" target="_blank" rel="noopener noreferrer" className="hover:text-amber-600 transition-colors font-medium">Hosted on Hostinger (20% Off)</a>
              <span className="text-slate-300 hidden md:inline">|</span>
              <span>Sovereign Intelligence Systems</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
