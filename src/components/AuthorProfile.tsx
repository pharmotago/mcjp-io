import React from 'react';

export default function AuthorProfile() {
  return (
    <div className="flex flex-col md:flex-row items-center md:items-start gap-6 p-6 rounded-xl bg-slate-50 border border-slate-200 mt-12 mb-8 shadow-sm">
      <div className="flex-shrink-0">
        <div className="w-24 h-24 rounded-full bg-amber-100 border-2 border-amber-500 overflow-hidden flex items-center justify-center text-amber-700">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
          </svg>
        </div>
      </div>
      <div className="text-center md:text-left space-y-2 flex-1">
        <h3 className="text-xl font-bold text-slate-900">Peter K.</h3>
        <p className="text-amber-700 font-semibold text-sm tracking-wide uppercase">
          15+ Year Pharmacist & System Builder
        </p>
        <p className="text-slate-600 text-sm leading-relaxed max-w-2xl">
          Peter is a pharmacist with over 15 years of clinical and leadership experience. He builds automated systems, AI-driven agencies, and operates multiple digital assets. At MCJP.io, he shares actionable blueprints on leveraged wealth, resilient leadership, and mental discipline.
        </p>
      </div>
    </div>
  );
}
