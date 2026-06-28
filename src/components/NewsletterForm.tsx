"use client";

import React, { useState, useEffect } from "react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  useEffect(() => {
    const isSubscribed = localStorage.getItem("mcjp_subscribed") === "true";
    if (isSubscribed) {
      setStatus("success");
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");

    // Simulate API call
    setTimeout(() => {
      localStorage.setItem("mcjp_subscribed", "true");
      setStatus("success");
    }, 1200);
  };

  const handleReset = () => {
    localStorage.removeItem("mcjp_subscribed");
    setStatus("idle");
    setEmail("");
  };

  if (status === "success") {
    return (
      <div className="p-6 rounded-lg glass-panel bg-emerald-50/30 border border-emerald-500/20 flex flex-col justify-between min-h-[220px] transition-all duration-500">
        <div className="space-y-2">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
            ✓ Access Granted
          </span>
          <h3 className="text-xl font-bold text-slate-900">The Sovereign Morning Stack</h3>
          <p className="text-slate-600 text-xs leading-relaxed">
            Thank you for subscribing! Your 7 Non-Negotiable Habits checklist is ready for download.
          </p>
        </div>
        <div className="mt-4 space-y-2">
          <a
            href="https://blog.mcjp.io/sovereign-morning-stack.pdf"
            download
            className="block w-full text-center bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            Download PDF Checklist ↓
          </a>
          <button
            onClick={handleReset}
            className="block w-full text-center text-slate-400 hover:text-slate-600 text-[10px] transition-colors cursor-pointer"
          >
            Change Email / Resubscribe
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-lg glass-panel bg-white/70 flex flex-col justify-between min-h-[220px]">
      <div className="space-y-2">
        <span className="text-xs font-semibold text-amber-600 uppercase tracking-widest">🔒 The Sovereign Morning Stack</span>
        <h3 className="text-xl font-bold text-slate-900">7 Non-Negotiable Habits of High-Performing Men</h3>
        <p className="text-slate-700 text-xs font-medium">Free PDF Checklist — Instant Download</p>
        <p className="text-slate-600 text-xs leading-relaxed">
          Join 5,000+ men who've replaced aimless mornings with a structured sovereignty protocol.
        </p>
        <p className="text-slate-500 text-[10px] italic">
          ✓ No fluff  ✓ No motivation porn  ✓ Just the protocol
        </p>
      </div>
      <form className="mt-4 flex gap-2" onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Enter your email address"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading"}
          className="flex-grow bg-slate-50 border border-slate-200 rounded px-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded text-xs font-semibold transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center min-w-[120px]"
        >
          {status === "loading" ? (
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <>Get the Free PDF &rarr;</>
          )}
        </button>
      </form>
    </div>
  );
}
