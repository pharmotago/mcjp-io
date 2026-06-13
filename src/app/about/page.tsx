export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6">
      <header className="space-y-4 border-b border-slate-200 pb-6">
        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 font-semibold text-xs uppercase tracking-wider">
          Our Mission
        </span>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
          About MCJP.io
        </h1>
        <p className="text-slate-600 text-lg">
          A sovereign map for building leveraged wealth, leading with familial integrity, and mastering mental discipline in the digital era.
        </p>
      </header>

      <div className="space-y-6 text-slate-700 leading-relaxed">
        <p>
          Welcome to <strong>MCJP.io</strong>. We believe the modern world presents unprecedented opportunities alongside unique challenges. With the rise of AI, digital assets, and global connection, individuals have more leverage than ever before to achieve autonomy. Yet, the ambient noise, constant distractions, and decaying social structures make focus and long-term planning incredibly rare.
        </p>
        <p>
          Our purpose is to serve as a high-density, no-nonsense publication offering structured guidance across three critical pillars of life:
        </p>

        <div className="grid gap-6 md:grid-cols-3 mt-8">
          <div className="p-5 rounded-lg glass-panel bg-white/70 space-y-2">
            <h3 className="font-semibold text-amber-600 text-lg">Money</h3>
            <p className="text-xs text-slate-600">
              Escaping the hourly trap. We focus on building leveraged assets, solopreneurship, AI integrations, and long-term wealth compounding.
            </p>
          </div>
          <div className="p-5 rounded-lg glass-panel bg-white/70 space-y-2">
            <h3 className="font-semibold text-amber-600 text-lg">Life</h3>
            <p className="text-xs text-slate-600">
              Honoring responsibility. We advocate for strong, healthy family dynamics, active mentorship, and leading with integrity and strength.
            </p>
          </div>
          <div className="p-5 rounded-lg glass-panel bg-white/70 space-y-2">
            <h3 className="font-semibold text-amber-600 text-lg">Discipline</h3>
            <p className="text-xs text-slate-600">
              Guarding the mind. Strategies for dopamine detoxing, protecting cognitive energy, and cultivating unshakeable execution routines.
            </p>
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-slate-900 mt-10">Our Editorial Philosophy</h2>
        <p>
          We publish content created by combining deep human experience with structured analytical frameworks. Every post on this site is designed to be highly actionable, offering clear blueprints and eliminating generic filler.
        </p>
        <p>
          Our daily organic publication cycle ensures a steady stream of insights designed to keep you focused on what matters most: building, providing, and protecting.
        </p>
      </div>
    </div>
  );
}
