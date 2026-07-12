"use client";

export default function ContactForm() {
  return (
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
  );
}
