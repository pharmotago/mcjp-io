"use client";

export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 py-6">
      <header className="space-y-4 border-b border-slate-200 pb-6">
        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 font-semibold text-xs uppercase tracking-wider">
          Get in Touch
        </span>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
          Contact Us
        </h1>
        <p className="text-slate-600 text-lg">
          Have questions, partnership inquiries, or feedback? Send us a message.
        </p>
      </header>

      <div className="space-y-6">
        <div className="p-6 rounded-lg glass-panel bg-white/70 space-y-4 shadow-xs">
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-900">Direct Email</h3>
            <p className="text-sm text-slate-600">
              For general inquiries, editorial feedback, or advertising options:
            </p>
            <a href="mailto:welcome@mcjp.io" className="text-amber-600 hover:underline text-sm font-medium">
              welcome@mcjp.io
            </a>
          </div>
        </div>

        {/* Contact Form Mockup */}
        <form className="space-y-4 pt-4" onSubmit={(e) => e.preventDefault()}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="name" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</label>
              <input
                type="text"
                id="name"
                required
                className="w-full bg-white border border-slate-200 rounded px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-xs"
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                id="email"
                required
                className="w-full bg-white border border-slate-200 rounded px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-xs"
                placeholder="john@example.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="message" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Message</label>
            <textarea
              id="message"
              required
              rows={5}
              className="w-full bg-white border border-slate-200 rounded px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all resize-none shadow-xs"
              placeholder="Your message details..."
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 rounded bg-amber-600 text-white font-semibold text-sm hover:bg-amber-500 transition-all cursor-pointer shadow-sm"
          >
            Send Message
          </button>
        </form>
      </div>
    </div>
  );
}
