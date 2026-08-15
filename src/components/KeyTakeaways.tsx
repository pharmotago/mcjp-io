import React from "react";

interface KeyTakeawaysProps {
  category: string;
  description: string;
  readingTime?: number;
}

export default function KeyTakeaways({
  category,
  description,
  readingTime,
}: KeyTakeawaysProps) {
  if (!description) return null;

  return (
    <div className="my-8 rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50/60 to-orange-50/30 p-6 shadow-xs">
      <div className="flex items-center gap-2 mb-3">
        <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
          Executive Summary & Core Takeaway
        </span>
      </div>
      <p className="text-sm md:text-base leading-relaxed text-slate-800 font-normal">
        {description}
      </p>
      <div className="mt-4 pt-3 border-t border-amber-200/40 flex items-center justify-between text-xs text-amber-900/70">
        <span className="font-medium">Theme: {category}</span>
        {readingTime && <span>{readingTime} min deep read</span>}
      </div>
    </div>
  );
}
