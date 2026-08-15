"use client";

import React, { useEffect, useState } from "react";

export type Theme = "light" | "sepia" | "dark";

export default function ReadingThemeSwitch() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("mcjp_theme") as Theme | null;
    if (saved && ["light", "sepia", "dark"].includes(saved)) {
      setTheme(saved);
      applyTheme(saved);
    } else {
      // Default to light
      applyTheme("light");
    }
  }, []);

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    root.classList.remove("theme-dark", "theme-sepia", "theme-light");
    root.classList.add(`theme-${t}`);
  };

  const handleSelect = (t: Theme) => {
    setTheme(t);
    localStorage.setItem("mcjp_theme", t);
    applyTheme(t);
  };

  if (!mounted) return <div className="w-24 h-8" />;

  return (
    <div className="inline-flex items-center p-1 rounded-full bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/60 dark:border-slate-700/60 text-xs shadow-inner">
      <button
        onClick={() => handleSelect("light")}
        title="Crisp Light Mode"
        className={`px-2.5 py-1 rounded-full font-medium transition-all duration-200 flex items-center gap-1 ${
          theme === "light"
            ? "bg-white text-slate-900 shadow-xs font-semibold"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
        }`}
      >
        <span>☀️</span>
        <span className="hidden sm:inline">Light</span>
      </button>

      <button
        onClick={() => handleSelect("sepia")}
        title="Warm Paper (Sepia) Mode"
        className={`px-2.5 py-1 rounded-full font-medium transition-all duration-200 flex items-center gap-1 ${
          theme === "sepia"
            ? "bg-[#efe8d8] text-[#3d372f] shadow-xs font-semibold"
            : "text-slate-600 dark:text-slate-400 hover:text-amber-900"
        }`}
      >
        <span>📜</span>
        <span className="hidden sm:inline">Sepia</span>
      </button>

      <button
        onClick={() => handleSelect("dark")}
        title="Deep Dark Mode"
        className={`px-2.5 py-1 rounded-full font-medium transition-all duration-200 flex items-center gap-1 ${
          theme === "dark"
            ? "bg-slate-900 text-amber-400 shadow-xs font-semibold"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
        }`}
      >
        <span>🌙</span>
        <span className="hidden sm:inline">Dark</span>
      </button>
    </div>
  );
}
