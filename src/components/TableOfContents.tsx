"use client";

import React, { useState } from "react";

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  items: TocItem[];
}

export default function TableOfContents({ items }: TableOfContentsProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (!items || items.length === 0) return null;

  return (
    <nav className="my-8 rounded-xl border border-slate-200/90 bg-slate-50/80 p-5 shadow-xs transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Table of Contents
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          type="button"
          className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          {isOpen ? "Hide" : "Show"}
        </button>
      </div>

      {isOpen && (
        <ul className="mt-4 space-y-2 border-t border-slate-200/60 pt-3 text-xs leading-relaxed">
          {items.map((item, idx) => (
            <li
              key={idx}
              className={`${item.level === 3 ? "ml-4 text-slate-500" : "font-medium text-slate-700"}`}
            >
              <a
                href={`#${item.id}`}
                className="hover:text-amber-600 transition-colors inline-block py-0.5"
              >
                {item.level === 3 ? "↳ " : "• "}
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
