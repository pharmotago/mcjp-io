import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import NewsletterForm from '../components/NewsletterForm';

interface Post {
  id: string;
  title: string;
  date: string;
  category: string;
  description: string;
  keywords: string[];
  readingTime?: number;
  published?: boolean;
}

function normalizeKeywords(raw: any): string[] {
  if (Array.isArray(raw)) return raw.map(k => String(k).trim()).filter(Boolean);
  if (typeof raw === 'string') {
    let clean = raw.trim();
    if (clean.startsWith('[') && clean.endsWith(']')) {
      clean = clean.slice(1, -1);
    }
    // Match quoted strings or comma separated items
    const matches = clean.match(/"([^"]+)"|'([^']+)'|([^,]+)/g);
    if (matches) {
      return matches
        .map(k => k.replace(/^["']|["']$/g, '').trim())
        .filter(k => k.length > 0 && k !== ',');
    }
  }
  return [];
}

function parseMarkdown(fileContent: string) {
  const match = fileContent.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {} as any, content: fileContent };
  const yaml = match[1];
  const content = match[2];
  const data: any = {};
  yaml.split('\n').forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim();
      let val = line.slice(colonIdx + 1).trim();
      if (val.startsWith('"') && val.endsWith('"') && val.length >= 2) {
        val = val.slice(1, -1);
      }
      data[key] = val;
    }
  });

  data.keywords = normalizeKeywords(data.keywords);
  return { data, content };
}

function getPosts(): Post[] {
  const postsDir = path.join(process.cwd(), 'content', 'posts');
  if (!fs.existsSync(postsDir)) return [];
  
  const files = fs.readdirSync(postsDir);
  const allPosts = files
    .filter(file => file.endsWith('.md'))
    .map(file => {
      const id = file.replace(/\.md$/, '');
      const fullPath = path.join(postsDir, file);
      const fileContent = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = parseMarkdown(fileContent);

      const wordCount = content.trim().split(/\s+/).length;
      const readingTime = Math.ceil(wordCount / 200);

      return {
        id,
        title: data.title || id,
        date: data.date || '',
        category: data.category || 'General',
        description: data.description || '',
        keywords: data.keywords || [],
        readingTime,
        published: data.published === 'true' || data.published === true,
      };
    });

  const todayStr = new Date().toISOString().split('T')[0];
  const isDev = process.env.NODE_ENV === 'development';
  const filtered = isDev ? allPosts : allPosts.filter(post => post.published && post.date <= todayStr);

  return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const posts = getPosts();
  const activeCategory = params.category || '';
  const searchQuery = params.q || '';

  // Calculate dynamic category counts
  const counts = {
    all: posts.length,
    money: posts.filter(p => p.category.toLowerCase() === 'money').length,
    life: posts.filter(p => p.category.toLowerCase() === 'life').length,
    discipline: posts.filter(p => p.category.toLowerCase() === 'discipline').length,
  };
  
  const filteredPosts = posts.filter(post => {
    const matchesCategory = !activeCategory || post.category.toLowerCase() === activeCategory.toLowerCase();
    const matchesSearch = !searchQuery || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.keywords.some(kw => kw.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const isBrowsingAll = !activeCategory && !searchQuery;
  const featuredPost = isBrowsingAll && filteredPosts.length > 0 ? filteredPosts[0] : null;
  const displayPosts = featuredPost ? filteredPosts.slice(1) : filteredPosts;

  return (
    <div className="space-y-14">
      {/* Editorial Hero Header */}
      <section className="text-center pt-4 pb-2 space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-800 text-xs font-semibold tracking-wide">
          <span className="flex h-2 w-2 rounded-full bg-amber-600 animate-pulse" />
          <span>Field Notes from a Pharmacist & Systems Builder</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.12] text-slate-900 max-w-4xl mx-auto">
          Sovereign Playbooks on <span className="gold-gradient">Wealth, Fatherhood</span> & Mastery
        </h1>

        <p className="max-w-2xl mx-auto text-slate-600 text-sm sm:text-base leading-relaxed">
          Actionable blueprints and clinical frameworks for building leveraged digital assets, leading your family with unshakeable integrity, and executing daily deep work.
        </p>

        {/* Search Bar */}
        <form action="/" method="GET" className="relative max-w-lg mx-auto mt-6">
          <input
            type="text"
            name="q"
            defaultValue={searchQuery}
            placeholder="Search 270+ articles on wealth, stoicism, focus..."
            className="w-full bg-white border border-slate-200/90 rounded-full px-5 py-3 pl-12 pr-10 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-xs"
          />
          <span className="absolute left-4 top-3.5 text-slate-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          {searchQuery && (
            <Link
              href="/"
              className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer flex items-center justify-center"
              title="Clear search"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Link>
          )}
          {activeCategory && <input type="hidden" name="category" value={activeCategory} />}
        </form>

        {/* Category Navigation Pills with Live Counts */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-4">
          {[
            { name: "All", label: `All Insights (${counts.all})`, href: "/" },
            { name: "Money", label: `Money & Wealth (${counts.money})`, href: "/?category=Money" },
            { name: "Life", label: `Life & Fatherhood (${counts.life})`, href: "/?category=Life" },
            { name: "Discipline", label: `Discipline & Mind (${counts.discipline})`, href: "/?category=Discipline" }
          ].map((tab) => {
            const isActive = tab.name === "All" ? !activeCategory && !searchQuery : activeCategory.toLowerCase() === tab.name.toLowerCase();
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider transition-all duration-200 shadow-xs border ${
                  isActive
                    ? "bg-slate-900 border-slate-900 text-white shadow-md dark:bg-amber-500 dark:border-amber-500 dark:text-slate-950"
                    : "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Sub-Topic Quick Tag Cloud */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 text-xs text-slate-400">
          <span className="font-semibold text-slate-500 dark:text-slate-400 mr-1">Trending Topics:</span>
          {[
            "Fatherhood", "Habits", "Neuroplasticity", "Leverage", "Investing", 
            "Focus", "Leadership", "Stoicism", "Longevity", "Cashflow"
          ].map((tag) => {
            const isTagActive = searchQuery.toLowerCase() === tag.toLowerCase();
            return (
              <Link
                key={tag}
                href={`/?q=${encodeURIComponent(tag)}`}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  isTagActive
                    ? "bg-amber-500 text-white font-bold"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                }`}
              >
                #{tag}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Core Focus Tracks (Only when browsing all) */}
      {isBrowsingAll && (
        <section className="grid sm:grid-cols-3 gap-4">
          <Link
            href="/?category=Money"
            className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-amber-500/40 transition-all group shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 font-bold mb-3 group-hover:scale-105 transition-transform">
              💼
            </div>
            <h3 className="font-bold text-slate-900 text-base group-hover:text-amber-600 transition-colors">
              Leveraged Wealth
            </h3>
            <p className="text-slate-500 text-xs mt-1 leading-relaxed">
              Algorithmic assets, SaaS cashflows, and asymmetric financial engines.
            </p>
          </Link>

          <Link
            href="/?category=Life"
            className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-amber-500/40 transition-all group shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 font-bold mb-3 group-hover:scale-105 transition-transform">
              🛡️
            </div>
            <h3 className="font-bold text-slate-900 text-base group-hover:text-amber-600 transition-colors">
              Stoic Fatherhood
            </h3>
            <p className="text-slate-500 text-xs mt-1 leading-relaxed">
              Family leadership, intentional parenting, and unbreakable marital resilience.
            </p>
          </Link>

          <Link
            href="/?category=Discipline"
            className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-amber-500/40 transition-all group shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 font-bold mb-3 group-hover:scale-105 transition-transform">
              ⚡
            </div>
            <h3 className="font-bold text-slate-900 text-base group-hover:text-amber-600 transition-colors">
              Cognitive Mastery
            </h3>
            <p className="text-slate-500 text-xs mt-1 leading-relaxed">
              Neuroplasticity protocols, deep focus habits, and physical endurance systems.
            </p>
          </Link>
        </section>
      )}

      {/* Featured Lead Story */}
      {featuredPost && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Editor's Featured Story
            </span>
            <span className="text-xs font-medium text-amber-700">Must-Read Deep Dive</span>
          </div>

          <Link
            href={`/posts/${featuredPost.id}`}
            className="block p-7 sm:p-9 rounded-2xl bg-white border border-slate-200 hover:border-amber-500/50 hover:shadow-lg transition-all duration-300 space-y-4 group"
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 font-bold uppercase tracking-wider text-[11px]">
                  {featuredPost.category}
                </span>
                {featuredPost.readingTime && (
                  <span className="text-slate-500 font-medium">
                    {featuredPost.readingTime} min read
                  </span>
                )}
              </div>
              <span className="text-slate-400 font-mono">{featuredPost.date}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 group-hover:text-amber-600 transition-colors leading-[1.2]">
              {featuredPost.title}
            </h2>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed line-clamp-3">
              {featuredPost.description}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <div className="w-5 h-5 rounded-full bg-slate-900 text-amber-300 flex items-center justify-center text-[9px] font-bold">
                  PK
                </div>
                <span>By Peter K.</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {featuredPost.keywords.slice(0, 4).map((kw, i) => (
                  <span key={i} className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                    #{kw}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Main Articles Feed Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            {searchQuery
              ? `Results for "${searchQuery}" (${filteredPosts.length})`
              : activeCategory
              ? `${activeCategory} Feed (${filteredPosts.length})`
              : "Latest Field Reports"}
          </h2>
          <span className="text-xs text-slate-400">Updated Daily</span>
        </div>
        
        {filteredPosts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8 space-y-3">
            <span className="text-3xl">🔍</span>
            <p className="text-slate-800 font-semibold text-base">No articles found</p>
            <p className="text-slate-500 text-xs max-w-sm mx-auto">
              We couldn't find any articles matching &ldquo;{searchQuery}&rdquo;. Try another search term or browse by category.
            </p>
            <Link
              href="/"
              className="inline-block mt-2 text-xs font-bold text-amber-600 hover:text-amber-700"
            >
              Clear Filters &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Newsletter & Partner Cards injected organically */}
            {isBrowsingAll && (
              <>
                <NewsletterForm />

                {/* Hostinger Partner Offer Widget */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-50/40 to-orange-50/20 border border-amber-200/60 flex flex-col justify-between min-h-[220px] shadow-xs">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">
                      Founder's Infrastructure
                    </span>
                    <h3 className="text-xl font-bold text-slate-900">
                      Launch Your Digital Business
                    </h3>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      We run and recommend Hostinger for reliable SSD hosting, free domain, and unmatched speed. Claim an exclusive 20% reader discount.
                    </p>
                  </div>
                  <a
                    href="https://www.hostinger.com?REFERRALCODE=OYBPHARMOWCY"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-lg text-xs font-semibold transition-colors mt-4 shadow-sm"
                  >
                    Claim 20% Discount &rarr;
                  </a>
                </div>

                {/* The Stoic Dad Sister Project */}
                <div className="p-6 rounded-2xl bg-white border border-slate-200/90 flex flex-col justify-between min-h-[220px] shadow-xs">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                      Sister Project
                    </span>
                    <h3 className="text-xl font-bold text-slate-900">The Stoic Dad</h3>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Daily philosophy journals, parenting blueprints, and stoic wisdom designed for fathers raising anti-fragile families.
                    </p>
                  </div>
                  <a
                    href="https://the-stoic-dad.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-amber-600 hover:bg-amber-500 text-white py-2.5 rounded-lg text-xs font-semibold transition-colors mt-4 shadow-sm"
                  >
                    Explore The Stoic Dad &rarr;
                  </a>
                </div>
              </>
            )}

            {displayPosts.map((post) => (
              <div key={post.id} className="flex flex-col justify-between">
                <Link
                  href={`/posts/${post.id}`}
                  className="p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-amber-500/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[240px] group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 font-bold uppercase tracking-wider text-[10px]">
                        {post.category}
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">{post.date}</span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-2 leading-snug">
                      {post.title}
                    </h3>

                    <p className="text-slate-600 text-xs leading-relaxed line-clamp-3">
                      {post.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    {post.readingTime && (
                      <span className="font-medium text-slate-500">{post.readingTime} min read</span>
                    )}
                    <span className="font-semibold text-amber-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5">
                      Read &rarr;
                    </span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
