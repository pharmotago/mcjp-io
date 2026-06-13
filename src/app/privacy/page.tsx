export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6">
      <header className="space-y-4 border-b border-[#27272a] pb-6">
        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-semibold text-xs uppercase tracking-wider">
          Legal
        </span>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-[#f4f4f5] leading-tight">
          Privacy Policy
        </h1>
        <p className="text-zinc-500 text-sm">
          Last Updated: June 13, 2026
        </p>
      </header>

      <div className="space-y-6 text-zinc-300 text-sm md:text-base leading-relaxed">
        <p>
          At <strong>MCJP.io</strong>, accessible from <strong>https://blog.mcjp.io</strong>, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by MCJP.io and how we use it.
        </p>

        <h2 className="text-xl font-semibold text-[#f4f4f5] mt-8">1. Log Files</h2>
        <p>
          MCJP.io follows a standard procedure of using log files. These files log visitors when they visit websites. All hosting companies do this and a part of hosting services' analytics. The information collected by log files includes internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks. These are not linked to any information that is personally identifiable.
        </p>

        <h2 className="text-xl font-semibold text-[#f4f4f5] mt-8">2. Cookies and Web Beacons</h2>
        <p>
          Like any other website, MCJP.io uses 'cookies'. These cookies are used to store information including visitors' preferences, and the pages on the website that the visitor accessed or visited. The information is used to optimize the users' experience by customizing our web page content based on visitors' browser type and/or other information.
        </p>

        <h2 className="text-xl font-semibold text-[#f4f4f5] mt-8">3. Google DoubleClick DART Cookie</h2>
        <p>
          Google is one of a third-party vendor on our site. It also uses cookies, known as DART cookies, to serve ads to our site visitors based upon their visit to www.website.com and other sites on the internet. However, visitors may choose to decline the use of DART cookies by visiting the Google ad and content network Privacy Policy at the following URL – <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">https://policies.google.com/technologies/ads</a>.
        </p>

        <h2 className="text-xl font-semibold text-[#f4f4f5] mt-8">4. Our Advertising Partners</h2>
        <p>
          Some of advertisers on our site may use cookies and web beacons. Our advertising partners include:
        </p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li><strong>Google AdSense</strong></li>
        </ul>
        <p>
          Each of our advertising partners has their own Privacy Policy for their policies on user data. For easier access, we hyperlinked to their Privacy Policies above.
        </p>

        <h2 className="text-xl font-semibold text-[#f4f4f5] mt-8">5. Third-Party Privacy Policies</h2>
        <p>
          MCJP.io's Privacy Policy does not apply to other advertisers or websites. Thus, we are advising you to consult the respective Privacy Policies of these third-party ad servers for more detailed information. It may include their practices and instructions about how to opt-out of certain options.
        </p>
        <p>
          You can choose to disable cookies through your individual browser options. To know more detailed information about cookie management with specific web browsers, it can be found at the browsers' respective websites.
        </p>

        <h2 className="text-xl font-semibold text-[#f4f4f5] mt-8">6. GDPR Data Protection Rights</h2>
        <p>
          We would like to make sure you are fully aware of all of your data protection rights. Every user is entitled to the following:
        </p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li><strong>The right to access</strong> – You have the right to request copies of your personal data.</li>
          <li><strong>The right to rectification</strong> – You have the right to request that we correct any information you believe is inaccurate.</li>
          <li><strong>The right to erasure</strong> – You have the right to request that we erase your personal data, under certain conditions.</li>
          <li><strong>The right to restrict processing</strong> – You have the right to request that we restrict the processing of your personal data, under certain conditions.</li>
        </ul>

        <h2 className="text-xl font-semibold text-[#f4f4f5] mt-8">7. Consent</h2>
        <p>
          By using our website, you hereby consent to our Privacy Policy and agree to its terms.
        </p>
      </div>
    </div>
  );
}
