"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SavedArticle } from "./BookmarkButton";

export default function SavedArticlesDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);

  const loadSaved = () => {
    try {
      const items = JSON.parse(localStorage.getItem("mcjp_bookmarks") || "[]") as SavedArticle[];
      setSavedArticles(items);
    } catch (e) {
      setSavedArticles([]);
    }
  };

  useEffect(() => {
    loadSaved();
    const handleBookmarkChange = () => loadSaved();
    window.addEventListener("mcjp_bookmark_changed", handleBookmarkChange);
    window.addEventListener("storage", handleBookmarkChange);
    return () => {
      window.removeEventListener("mcjp_bookmark_changed", handleBookmarkChange);
      window.removeEventListener("storage", handleBookmarkChange);
    };
  }, []);

  const removeArticle = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = savedArticles.filter(a => a.id !== id);
    setSavedArticles(updated);
    localStorage.setItem("mcjp_bookmarks", JSON.stringify(updated));
    window.dispatchEvent(new Event("mcjp_bookmark_changed"));
  };

  return (
    <>
      <button
        onClick={() => {
          loadSaved();
          setIsOpen(true);
        }}
        title="View Saved Articles"
        className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors border border-slate-200/80 dark:border-slate-700"
      >
        <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        <span className="hidden sm:inline">Saved</span>
        {savedArticles.length > 0 && (
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
            {savedArticles.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs transition-all">
          <div className="fixed inset-0" onClick={() => setIsOpen(false)} />

          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                </span>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Personal Reading Library ({savedArticles.length})
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
              >
                ✕
              </button>
            </div>

            {/* Articles List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {savedArticles.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-40 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <p className="font-medium text-slate-600 dark:text-slate-300 text-sm">No saved articles yet</p>
                  <p className="text-xs mt-1">Tap the "Save Article" button on any essay to build your reading list.</p>
                </div>
              ) : (
                savedArticles.map(article => (
                  <div
                    key={article.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-amber-500/30 transition-all flex items-start justify-between gap-3 group"
                  >
                    <Link
                      href={`/posts/${article.id}`}
                      onClick={() => setIsOpen(false)}
                      className="flex-1 min-w-0"
                    >
                      <span className="text-[10px] font-bold tracking-wider uppercase text-amber-600">
                        {article.category}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 mt-0.5 group-hover:text-amber-600 transition-colors">
                        {article.title}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                        {article.date}
                      </span>
                    </Link>
                    <button
                      onClick={e => removeArticle(article.id, e)}
                      title="Remove from saved"
                      className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {savedArticles.length > 0 && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-between items-center">
                <button
                  onClick={() => {
                    localStorage.removeItem("mcjp_bookmarks");
                    setSavedArticles([]);
                    window.dispatchEvent(new Event("mcjp_bookmark_changed"));
                  }}
                  className="text-xs text-rose-500 hover:underline font-medium"
                >
                  Clear All
                </button>
                <span className="text-[11px] text-slate-400">Stored locally</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
