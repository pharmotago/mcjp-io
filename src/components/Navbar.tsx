"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import ReadingThemeSwitch from "./ReadingThemeSwitch";
import SavedArticlesDrawer from "./SavedArticlesDrawer";
import SearchModal from "./SearchModal";

interface NavPost {
  id: string;
  title: string;
  category: string;
  date: string;
  description: string;
  keywords?: string[];
}

export default function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [posts, setPosts] = useState<NavPost[]>([]);

  useEffect(() => {
    // Keyboard shortcut for Cmd+K / Ctrl+K
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    // Fetch lightweight search index
    fetch("/api/search-index")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPosts(data);
      })
      .catch(() => {});

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 hover:opacity-85 transition-opacity flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
              M
            </span>
            <span>
              MCJP<span className="text-amber-600">.io</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-500 dark:text-slate-400">
            <Link href="/" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">Home</Link>
            <Link href="/?category=Money" className="hover:text-emerald-600 transition-colors">Money</Link>
            <Link href="/?category=Life" className="hover:text-sky-600 transition-colors">Life</Link>
            <Link href="/?category=Discipline" className="hover:text-amber-600 transition-colors">Discipline</Link>
            <Link href="/about" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">About</Link>
          </nav>

          {/* Right Actions: Search + Theme + Bookmarks + RSS */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Spotlight Search Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
              title="Search articles (Cmd + K)"
            >
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="hidden sm:inline">Search...</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-900 text-slate-400 rounded border border-slate-200 dark:border-slate-700 shadow-2xs">
                ⌘K
              </kbd>
            </button>

            {/* Saved Articles Drawer */}
            <SavedArticlesDrawer />

            {/* Reading Theme Switch */}
            <ReadingThemeSwitch />

            {/* Spotify Show Link */}
            <a
              href="https://open.spotify.com/show/5aE6GrjxFmJoGD2QITKIV1"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-400 hover:text-emerald-500 transition-colors inline-flex items-center gap-1 text-xs font-semibold"
              title="The Better Signal on Spotify"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.625.625 0 0 1-.86.207c-2.355-1.44-5.32-1.766-8.812-.968a.625.625 0 0 1-.28-1.218c3.824-.874 7.106-.504 9.745 1.119a.625.625 0 0 1 .207.86zm1.226-2.727a.782.782 0 0 1-1.077.258c-2.696-1.657-6.806-2.136-9.995-1.168a.782.782 0 0 1-.468-1.492c3.64-1.106 8.188-.574 11.282 1.325a.782.782 0 0 1 .258 1.077zm.105-2.836C14.69 8.91 9.07 8.724 5.81 9.714a.938.938 0 1 1-.546-1.794c3.75-1.139 9.948-.922 13.784 1.355a.938.938 0 1 1-.94 1.624z" />
              </svg>
            </a>

            {/* YouTube Channel Link */}
            <a
              href="https://www.youtube.com/@TheBetterSignal"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors inline-flex items-center gap-1 text-xs font-semibold"
              title="@TheBetterSignal on YouTube"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>

            {/* RSS Link */}
            <a
              href="/rss.xml"
              className="p-2 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors hidden sm:inline-block"
              title="RSS Feed"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z" />
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* Global Spotlight Search Modal */}
      <SearchModal
        posts={posts}
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </>
  );
}
