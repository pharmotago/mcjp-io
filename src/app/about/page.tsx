import type { Metadata } from "next";
import AuthorProfile from "@/components/AuthorProfile";

export const metadata: Metadata = {
  title: "About MCJP.io — Sovereign Blueprints for the Modern Man",
  description: "MCJP.io publishes actionable systems for building leveraged wealth, mastering discipline, and leading your family with integrity. No fluff — just the blueprints.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About MCJP.io — Sovereign Blueprints for the Modern Man",
    description: "MCJP.io publishes actionable systems for building leveraged wealth, mastering discipline, and leading your family with integrity. No fluff — just the blueprints.",
    images: [
      {
        url: 'https://blog.mcjp.io/og/about-mcjpio.png',
        width: 1200,
        height: 630,
        alt: "About MCJP.io — Sovereign Blueprints for the Modern Man",
      }
    ],
    type: "website",
  },
  twitter: {
    card: 'summary_large_image',
    title: "About MCJP.io — Sovereign Blueprints for the Modern Man",
    description: "MCJP.io publishes actionable systems for building leveraged wealth, mastering discipline, and leading your family with integrity. No fluff — just the blueprints.",
    images: ['https://blog.mcjp.io/og/about-mcjpio.png'],
  }
};

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

      <AuthorProfile />

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
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">Who is Behind MCJP.io?</h2>
          <div className="space-y-3 text-slate-800">
            <p>
              I am a pharmacist with over 15 years of experience in the local community, currently managing a dynamic pharmacy brand. But beyond the dispensary, I am a system builder.
            </p>
            <p>
              Operating a consulting and technology firm on the side, I leverage AI automation tools like Notion, Activepieces, and custom AI operators to design hyper-efficient digital workflows. My philosophy is rooted in "flexible perseverance"—acknowledging that no one is 100% right, yet firmly pushing forward with the core values I believe in.
            </p>
            <p>
              Above all, I am a husband and a father to two wonderful daughters. Whether I'm meticulously planning our family trips to Japan and Korea down to the minute, or simply letting go of my perfectionism to share a laugh with them, my ultimate life goal is simple: to be remembered as a truly good person. This blog is a distillation of my systems, my failures, and the blueprints I'm building for my family's future.
            </p>
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
              <a href="/posts/discipline_dopamine_fasting_deep_work" className="text-amber-600 hover:text-amber-500 font-semibold flex items-center gap-1">
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
