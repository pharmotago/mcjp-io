export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-10 py-8 px-4">
      <header className="space-y-4 border-b border-slate-200 pb-8 text-center md:text-left">
        <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 font-semibold text-xs uppercase tracking-wider">
          Sovereign Mission
        </span>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
          About MCJP.io
        </h1>
        <p className="text-slate-700 text-lg md:text-xl font-medium max-w-2xl leading-relaxed">
          MCJP.io is a sovereign intelligence system for the modern man.
        </p>
      </header>

      <div className="space-y-8 text-slate-700 leading-relaxed text-sm md:text-base">
        <section className="space-y-4">
          <p className="text-base md:text-lg text-slate-800">
            We publish actionable frameworks on three pillars: building leveraged wealth, leading your family with integrity, and mastering mental discipline. No fluff. No motivation porn. Just the blueprints.
          </p>
        </section>

        <section className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-100">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">Why MCJP.io?</h2>
          <p>
            Most self-improvement content is either too vague to act on, or optimized for clicks rather than results.
          </p>
          <p>
            MCJP.io is different. Every article is built around a specific system, framework, or protocol — something you can implement this week, not just think about.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">Our Three Core Pillars</h2>
          <div className="grid gap-6 md:grid-cols-3 mt-4">
            <div className="p-5 rounded-lg border border-slate-200/60 bg-white shadow-xs space-y-2">
              <h3 className="font-bold text-amber-600 text-lg flex items-center gap-1.5">💰 Money</h3>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                Leveraged wealth, asset building, and financial independence. Escaping the hourly trap.
              </p>
            </div>
            <div className="p-5 rounded-lg border border-slate-200/60 bg-white shadow-xs space-y-2">
              <h3 className="font-bold text-amber-600 text-lg flex items-center gap-1.5">⚡ Discipline</h3>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                Mental fortitude, habit systems, and cognitive performance. Guarding the mind.
              </p>
            </div>
            <div className="p-5 rounded-lg border border-slate-200/60 bg-white shadow-xs space-y-2">
              <h3 className="font-bold text-amber-600 text-lg flex items-center gap-1.5">👨‍👩‍👧 Life</h3>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                Family leadership, fatherhood, and masculine identity. Honoring responsibility.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4 pt-4 border-t border-slate-100">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">Start with our most-read articles:</h2>
          <ul className="space-y-3">
            <li>
              <a href="/posts/money_financial_independence_blueprint" className="text-amber-600 hover:text-amber-500 font-semibold flex items-center gap-1">
                Financial Independence Blueprint &rarr;
              </a>
            </li>
            <li>
              <a href="/posts/personal_growth_discipline" className="text-amber-600 hover:text-amber-500 font-semibold flex items-center gap-1">
                The Dopamine Shield &rarr;
              </a>
            </li>
            <li>
              <a href="/posts/book_90_day_habit_system" className="text-amber-600 hover:text-amber-500 font-semibold flex items-center gap-1">
                90-Day Habit System Review &rarr;
              </a>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
