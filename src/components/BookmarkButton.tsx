"use client";

import React, { useState, useEffect } from "react";

interface BookmarkButtonProps {
  postId: string;
  title: string;
  category: string;
  date: string;
}

export interface SavedArticle {
  id: string;
  title: string;
  category: string;
  date: string;
  savedAt: string;
}

export default function BookmarkButton({ postId, title, category, date }: BookmarkButtonProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("mcjp_bookmarks") || "[]") as SavedArticle[];
      setIsSaved(saved.some(a => a.id === postId));
    } catch (e) {
      setIsSaved(false);
    }
  }, [postId]);

  const toggleBookmark = () => {
    try {
      let saved = JSON.parse(localStorage.getItem("mcjp_bookmarks") || "[]") as SavedArticle[];
      if (isSaved) {
        saved = saved.filter(a => a.id !== postId);
        setIsSaved(false);
      } else {
        saved.unshift({
          id: postId,
          title,
          category,
          date,
          savedAt: new Date().toISOString()
        });
        setIsSaved(true);
        setToast(true);
        setTimeout(() => setToast(false), 2000);
      }
      localStorage.setItem("mcjp_bookmarks", JSON.stringify(saved));
      // Dispatch storage event so navbar updates
      window.dispatchEvent(new Event("mcjp_bookmark_changed"));
    } catch (e) {
      console.error("Bookmark toggle failed:", e);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={toggleBookmark}
        title={isSaved ? "Remove from Saved" : "Save for later reading"}
        className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 border ${
          isSaved
            ? "bg-amber-500/10 border-amber-500/30 text-amber-600 shadow-xs"
            : "bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
        }`}
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform ${isSaved ? "fill-amber-500 stroke-amber-500 scale-110" : "fill-none stroke-current"}`}
          viewBox="0 0 24 24"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        <span>{isSaved ? "Saved" : "Save Article"}</span>
      </button>

      {toast && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-[11px] font-medium bg-slate-900 text-white rounded-md whitespace-nowrap shadow-md animate-in fade-in slide-in-from-bottom-1 duration-150 z-20">
          ✓ Saved to your library!
        </span>
      )}
    </div>
  );
}
