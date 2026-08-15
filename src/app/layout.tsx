import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://mcjp-blog-git-main-mcjp.vercel.app'),
  title: "MCJP.io | Master of Family, Money & Life",
  description: "Automated guide map for wealth creation, masculine family leadership, and cognitive sovereignty in the modern era.",
  verification: {
    google: "qnckJbqi5qG8Zih800FfL90PenL7mY8edsxPZgfezs4",
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "MCJP.io | Master of Family, Money & Life",
    description: "Automated guide map for wealth creation, masculine family leadership, and cognitive sovereignty in the modern era.",
    url: "https://mcjp-blog-git-main-mcjp.vercel.app",
    type: "website",
  }
};

import Navbar from "@/components/Navbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased theme-light">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        {/* Google AdSense Verification Script */}
        <script 
          async 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1966724508656296" 
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
              "url": "https://mcjp-blog-git-main-mcjp.vercel.app",
              "description": "Automated guide map for wealth creation, masculine family leadership, and cognitive sovereignty in the modern era.",
              "publisher": {
                "@type": "Organization",
                "name": "MCJP.io",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://mcjp-blog-git-main-mcjp.vercel.app/globe.svg"
                }
              }
            })
          }}
        />
      </head>
      <body className="min-h-full flex flex-col transition-colors duration-200">
        {/* Navigation */}
        <Navbar />

        {/* Top Leaderboard Ad Unit */}
        {process.env.NEXT_PUBLIC_ADSENSE_APPROVED === 'true' && process.env.NEXT_PUBLIC_ADSENSE_TOP_SLOT && (
          <div className="max-w-6xl w-full mx-auto px-6 pt-6 -mb-6">
            <ins className="adsbygoogle"
                 style={{ display: 'block', width: '100%' }}
                 data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-1966724508656296'}
                 data-ad-slot={process.env.NEXT_PUBLIC_ADSENSE_TOP_SLOT}
                 data-ad-format="horizontal"
                 data-full-width-responsive="true"></ins>
          </div>
        )}

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
