import type { Metadata } from "next";
import ContactForm from "../../components/ContactForm";

export const metadata: Metadata = {
  title: "Contact Us | MCJP.io",
  description: "Get in touch with the team at MCJP.io. Send us your feedback, inquiries, or suggestions.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact Us | MCJP.io",
    description: "Get in touch with the team at MCJP.io. Send us your feedback, inquiries, or suggestions.",
    url: "https://blog.mcjp.io/contact",
    type: "website",
  },
  twitter: {
    card: 'summary_large_image',
    title: "Contact Us | MCJP.io",
    description: "Get in touch with the team at MCJP.io. Send us your feedback, inquiries, or suggestions.",
  }
};

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

        <ContactForm />
      </div>
    </div>
  );
}
