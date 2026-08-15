import React from 'react';

export default function AuthorProfile() {
  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6 sm:p-8 rounded-2xl bg-white border border-slate-200/90 shadow-xs mt-12 mb-8">
      <div className="flex-shrink-0">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 shadow-md">
          <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-amber-300 font-bold text-2xl tracking-wider">
            PK
          </div>
        </div>
      </div>
      <div className="text-center sm:text-left space-y-2 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h3 className="text-xl font-bold text-slate-900">Peter K.</h3>
          <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60 inline-block self-center sm:self-auto">
            15+ Years Clinical Lead & Systems Architect
          </span>
        </div>
        <p className="text-slate-600 text-sm leading-relaxed">
          Pharmacist, father, and software systems builder. Creator of sovereign workflow automations, SaaS management platforms, and autonomous intelligence engines. Dedicated to sharing field-tested protocols on leveraged wealth, stoic fatherhood, and high-performance cognitive discipline.
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs font-medium text-slate-500">
          <span className="flex items-center gap-1">
            <span className="text-amber-500">📍</span> Sydney & Central Coast, NSW
          </span>
          <span className="flex items-center gap-1">
            <span className="text-amber-500">🛡️</span> Sovereign Intelligence Hub
          </span>
        </div>
      </div>
    </div>
  );
}
