import fs from 'fs';
import path from 'path';
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

function parseMarkdown(fileContent: string) {
  const match = fileContent.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {} as any, content: fileContent };
  const yaml = match[1];
  const content = match[2];
  const data: any = {};
  yaml.split('\n').forEach(line => {
    const parts = line.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let val = parts.slice(1).join(':').trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      try {
        if (val.startsWith('[') && val.endsWith(']')) {
          val = JSON.parse(val.replace(/'/g, '"'));
        }
      } catch (e) {}
      data[key] = val;
    }
  });
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

      // Calculate reading time based on word count
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

  // Filter out future posts, unless in development mode
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
    <div className="space-y-12">
      {/* Hero Header */}
      <section className="text-center py-6 space-y-4">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight text-slate-900">
          Sovereign Guidance for the <span className="gold-gradient">Modern Man</span>
        </h1>
        <p className="max-w-2xl mx-auto text-slate-600 text-sm md:text-base leading-relaxed">
          Actionable blueprints on building leveraged wealth, leading with familial integrity, and mastering mental discipline in the digital era.
        </p>

        {/* Search Bar */}
        <form action="/" method="GET" className="relative max-w-md mx-auto mt-6">
          <input
            type="text"
            name="q"
            defaultValue={searchQuery}
            placeholder="Search articles..."
            className="w-full bg-white border border-slate-200 rounded-full px-5 py-2.5 pl-11 pr-10 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-xs"
          />
          <span className="absolute left-4 top-3.5 text-slate-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          {searchQuery && (
            <a
              href="/"
              className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer flex items-center justify-center"
              title="Clear search"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </a>
          )}
          {activeCategory && <input type="hidden" name="category" value={activeCategory} />}
        </form>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-8 border-b border-slate-200 pb-6">
          {[
            { name: "All", href: "/" },
            { name: "Money", href: "/?category=Money" },
            { name: "Life", href: "/?category=Life" },
            { name: "Discipline", href: "/?category=Discipline" }
          ].map((tab) => {
            const isActive = tab.name === "All" ? !activeCategory : activeCategory.toLowerCase() === tab.name.toLowerCase();
            return (
              <a
                key={tab.name}
                href={tab.href}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-200 shadow-xs border ${
                  isActive
                    ? "bg-amber-600 border-amber-600 text-white"
                    : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                {tab.name}
              </a>
            );
          })}
        </div>
      </section>

      {/* Featured Post (Only on main page with no filters) */}
      {featuredPost && (
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 border-b border-slate-200 pb-2">
            Featured Article
          </h2>
          <a
            href={`/posts/${featuredPost.id}`}
            className="block p-6 md:p-8 rounded-lg glass-panel hover:border-amber-500/50 transition-all duration-300 space-y-4"
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 font-semibold uppercase tracking-wider">
                  {featuredPost.category}
                </span>
                {featuredPost.readingTime && (
                  <span className="text-slate-500 font-medium">{featuredPost.readingTime} min read</span>
                )}
              </div>
              <span className="text-slate-400">{featuredPost.date}</span>
            </div>
            <h3 className="text-2xl md:text-4xl font-bold text-slate-900 hover:text-amber-600 transition-colors leading-tight">
              {featuredPost.title}
            </h3>
            <p className="text-slate-600 text-sm md:text-base leading-relaxed line-clamp-3">
              {featuredPost.description}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {featuredPost.keywords.map((kw, i) => (
                <span key={i} className="text-xs text-slate-400">
                  #{kw}
                </span>
              ))}
            </div>
          </a>
        </section>
      )}

      {/* Grid List */}
      <div className="space-y-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 border-b border-slate-200 pb-2">
          {searchQuery
            ? `Search Results for "${searchQuery}"`
            : activeCategory
            ? `${activeCategory} Articles`
            : "Recent Insights"}
        </h2>
        
        {filteredPosts.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No articles found matching the query.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Newsletter module injected dynamically as first item if browsing all */}
            {isBrowsingAll && (
              <>
                <NewsletterForm />

                {/* Hostinger Partner Offer Widget */}
                <div className="p-6 rounded-lg glass-panel bg-amber-50/20 border border-amber-200/40 flex flex-col justify-between min-h-[220px] shadow-xs">
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-amber-700 uppercase tracking-widest">Recommended Setup</span>
                    <h3 className="text-xl font-bold text-slate-900">Launch Your Digital Income Stream</h3>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      We host MCJP.io on Hostinger for its superior speed, security, and affordability. Host your assets with our partner link to claim 20% off plus a free domain.
                    </p>
                  </div>
                  <a
                    href="https://www.hostinger.com?REFERRALCODE=OYBPHARMOWCY"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded text-xs font-semibold transition-colors mt-4 cursor-pointer shadow-sm"
                  >
                    Claim 20% Discount &rarr;
                  </a>
                </div>

                {/* The Stoic Dad Portal Widget */}
                <div className="p-6 rounded-lg glass-panel bg-white/70 border border-slate-200 flex flex-col justify-between min-h-[220px] shadow-xs">
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-amber-600 uppercase tracking-widest">Sister Project</span>
                    <h3 className="text-xl font-bold text-slate-900">The Stoic Dad</h3>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Daily wisdom, philosophy journals, and parenting strategies for the modern father. Achieve absolute mental resilience.
                    </p>
                  </div>
                  <a
                    href="https://the-stoic-dad.mcjp.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-amber-600 hover:bg-amber-500 text-white py-2.5 rounded text-xs font-semibold transition-colors mt-4 cursor-pointer shadow-sm"
                  >
                    Explore The Stoic Dad &rarr;
                  </a>
                </div>
              </>
            )}

            {displayPosts.map((post, index) => (
              <div key={post.id} className="space-y-6 flex flex-col justify-between">
                <a
                  href={`/posts/${post.id}`}
                  className="block p-6 rounded-lg glass-panel hover:border-amber-500/50 transition-all duration-300 flex flex-col justify-between min-h-[220px]"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 font-semibold uppercase tracking-wider">
                          {post.category}
                        </span>
                        {post.readingTime && (
                          <span className="text-slate-500 font-medium">{post.readingTime} min read</span>
                        )}
                      </div>
                      <span className="text-slate-400">{post.date}</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 hover:text-amber-600 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-slate-600 text-xs md:text-sm leading-relaxed line-clamp-3">
                      {post.description}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {post.keywords.map((kw, i) => (
                      <span key={i} className="text-xs text-slate-400">
                        #{kw}
                      </span>
                    ))}
                  </div>
                </a>

                {/* Inline Ad slot injected after display post index 1 */}
                {index === 1 && process.env.NEXT_PUBLIC_ADSENSE_APPROVED === 'true' && process.env.NEXT_PUBLIC_ADSENSE_IN_FEED_SLOT && (
                  <div className="col-span-full p-4 rounded border border-slate-200 bg-slate-50 text-center text-xs text-slate-500 min-h-[110px] flex flex-col justify-center items-center relative shadow-xs">
                    <div className="absolute top-1 left-2 uppercase tracking-widest text-[8px] text-slate-400 font-semibold select-none">Advertisement</div>
                    <ins className="adsbygoogle"
                         style={{ display: 'block', width: '100%', minHeight: '90px' }}
                         data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-1966724508656296'}
                         data-ad-slot={process.env.NEXT_PUBLIC_ADSENSE_IN_FEED_SLOT}
                         data-ad-format="fluid"
                         data-full-width-responsive="true"></ins>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
