"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface SearchPost {
  id: string;
  title: string;
  category: string;
  date: string;
  description: string;
  keywords?: string[];
  readingTime?: number;
}

interface SearchModalProps {
  posts: SearchPost[];
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ posts, isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Filter posts
  const filtered = posts.filter(post => {
    if (!query.trim()) return false;
    const q = query.toLowerCase();
    return (
      post.title.toLowerCase().includes(q) ||
      post.description.toLowerCase().includes(q) ||
      post.category.toLowerCase().includes(q) ||
      (post.keywords && post.keywords.some(k => k.toLowerCase().includes(q)))
    );
  }).slice(0, 8); // Top 8 results

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev < filtered.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : filtered.length - 1));
      } else if (e.key === "Enter" && filtered.length > 0) {
        e.preventDefault();
        const selected = filtered[selectedIndex];
        if (selected) {
          window.location.href = `/posts/${selected.id}`;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  if (!isOpen) return null;

  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "money": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "life": return "bg-sky-500/10 text-sky-600 border-sky-500/20";
      case "discipline": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      default: return "bg-slate-500/10 text-slate-600 border-slate-500/20";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-xs transition-all">
      <div 
        className="fixed inset-0" 
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <svg className="w-5 h-5 text-slate-400 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search all 272+ essays, frameworks, protocols... (e.g. fatherhood, habits, leverage)"
            className="w-full bg-transparent border-none text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden text-sm sm:text-base"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 mr-2"
            >
              Clear
            </button>
          )}
          <span className="text-xs font-mono text-slate-400 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/50">
          {!query.trim() ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <p className="font-medium text-slate-600 dark:text-slate-300">Quick Intelligence Search</p>
              <p className="text-xs mt-1 text-slate-400">Type keywords like <span className="text-amber-600 font-mono">stoic</span>, <span className="text-emerald-600 font-mono">investing</span>, or <span className="text-sky-600 font-mono">dopamine</span></p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <p className="font-medium text-slate-600 dark:text-slate-300">No matching essays found</p>
              <p className="text-xs mt-1 text-slate-400">Try searching for broader terms or categories.</p>
            </div>
          ) : (
            filtered.map((post, idx) => (
              <Link
                key={post.id}
                href={`/posts/${post.id}`}
                onClick={onClose}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`block p-3.5 rounded-xl transition-colors ${
                  idx === selectedIndex
                    ? "bg-amber-500/10 dark:bg-amber-500/15 border-l-4 border-amber-500"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border ${getCategoryColor(post.category)}`}>
                    {post.category}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{post.date}</span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mt-1 line-clamp-1">
                  {post.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                  {post.description}
                </p>
              </Link>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span><strong className="font-mono">↑↓</strong> Navigate</span>
            <span><strong className="font-mono">↵</strong> Open</span>
            <span><strong className="font-mono">ESC</strong> Close</span>
          </div>
          <span>{filtered.length} results</span>
        </div>
      </div>
    </div>
  );
}
