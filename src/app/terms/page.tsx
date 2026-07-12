import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | MCJP.io",
  description: "Read the Terms of Service for MCJP.io. Understand our guidelines, disclaimer, and user terms.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6">
      <header className="space-y-4 border-b border-slate-200 pb-6">
        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 font-semibold text-xs uppercase tracking-wider">
          Legal
        </span>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
          Terms of Service
        </h1>
        <p className="text-slate-500 text-sm">
          Last Updated: June 13, 2026
        </p>
      </header>

      <div className="space-y-6 text-slate-700 text-sm md:text-base leading-relaxed">
        <p>
          Welcome to <strong>MCJP.io</strong>. These terms and conditions outline the rules and regulations for the use of MCJP.io's Website, located at <strong>https://blog.mcjp.io</strong>.
        </p>
        <p>
          By accessing this website, we assume you accept these terms and conditions. Do not continue to use MCJP.io if you do not agree to take all of the terms and conditions stated on this page.
        </p>

        <h2 className="text-xl font-semibold text-slate-900 mt-8">1. License</h2>
        <p>
          Unless otherwise stated, MCJP.io and/or its licensors own the intellectual property rights for all material on MCJP.io. All intellectual property rights are reserved. You may access this from MCJP.io for your own personal use subjected to restrictions set in these terms and conditions.
        </p>
        <p>
          You must not:
        </p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>Republish material from MCJP.io</li>
          <li>Sell, rent, or sub-license material from MCJP.io</li>
          <li>Reproduce, duplicate, or copy material from MCJP.io</li>
          <li>Redistribute content from MCJP.io</li>
        </ul>

        <h2 className="text-xl font-semibold text-slate-900 mt-8">2. Disclaimer of Financial/Legal Advice</h2>
        <p>
          The content published on MCJP.io, including articles, checklists, guidelines, and guides covering side hustles, AI tools, asset building, and money-making strategies, is for informational and educational purposes only. It does not constitute professional financial, investment, or legal advice. Always conduct your own research or consult a licensed professional before taking action based on the information provided on this website.
        </p>

        <h2 className="text-xl font-semibold text-slate-900 mt-8">3. Hyperlinking to our Content</h2>
        <p>
          The following organizations may link to our Website without prior written approval:
        </p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>Government agencies;</li>
          <li>Search engines;</li>
          <li>News organizations;</li>
          <li>Online directory distributors may link to our Website in the same manner as they hyperlink to the Websites of other listed businesses.</li>
        </ul>

        <h2 className="text-xl font-semibold text-slate-900 mt-8">4. Reservation of Rights</h2>
        <p>
          We reserve the right to request that you remove all links or any particular link to our Website. You approve to immediately remove all links to our Website upon request. We also reserve the right to amend these terms and conditions and its linking policy at any time. By continuously linking to our Website, you agree to be bound to and follow these linking terms and conditions.
        </p>

        <h2 className="text-xl font-semibold text-slate-900 mt-8">5. Disclaimer of Liability</h2>
        <p>
          To the maximum extent permitted by applicable law, we exclude all representations, warranties, and conditions relating to our website and the use of this website. We will not be liable for any loss or damage of any nature arising from the use of this website or the content published herein.
        </p>
      </div>
    </div>
  );
}
