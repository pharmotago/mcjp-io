import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import AuthorProfile from '@/components/AuthorProfile';
import NewsletterForm from '@/components/NewsletterForm';
import AffiliateCTA from '@/components/AffiliateCTA';
import ReadingProgress from '@/components/ReadingProgress';
import ShareBar from '@/components/ShareBar';
import TableOfContents, { TocItem } from '@/components/TableOfContents';
import KeyTakeaways from '@/components/KeyTakeaways';
import BookmarkButton from '@/components/BookmarkButton';
import ArticleAudioPlayer from '@/components/ArticleAudioPlayer';
import ShareButtons from '@/components/ShareButtons';

interface PostData {
  title: string;
  date: string;
  category: string;
  description: string;
  keywords: string[];
  canonical?: string;
  ogImage?: string;
  readingTime?: number;
  lastUpdated?: string;
}

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

function getPost(id: string) {
  const postsDir = path.join(process.cwd(), 'content', 'posts');
  const fullPath = path.join(postsDir, `${id}.md`);
  
  if (!fs.existsSync(fullPath)) return null;
  
  const fileContent = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = parseMarkdown(fileContent);

  const wordCount = content.trim().split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);

  return {
    id,
    data: {
      title: data.title || id,
      date: data.date || '',
      category: data.category || 'General',
      description: data.description || '',
      keywords: data.keywords || [],
      canonical: data.canonical || undefined,
      ogImage: data['og:image'] || data.ogImage || undefined,
      readingTime,
    } as PostData,
    content,
    wordCount,
  };
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const resolvedParams = await params;
  const post = getPost(resolvedParams.id);
  if (!post) {
    return {
      title: "Post Not Found | MCJP.io"
    };
  }

  let ogImageUrl = `https://mcjp-blog.vercel.app/api/og?title=${encodeURIComponent(post.data.title)}&category=${encodeURIComponent(post.data.category)}&readTime=${encodeURIComponent((post.data.readingTime || 5) + ' min read')}`;
  if (post.data.ogImage) {
    ogImageUrl = post.data.ogImage.startsWith('http')
      ? post.data.ogImage
      : `https://mcjp-blog.vercel.app${post.data.ogImage.startsWith('/') ? '' : '/'}${post.data.ogImage}`;
  } else {
    const focusImgPath = path.join(process.cwd(), 'public', 'images', `${resolvedParams.id}_focus.png`);
    if (fs.existsSync(focusImgPath)) {
      ogImageUrl = `https://mcjp-blog.vercel.app/images/${resolvedParams.id}_focus.png`;
    }
  }

  const title = `${post.data.title} | MCJP.io`;
  const description = post.data.description || 'MCJP.io - Master of Family, Money & Life';

  return {
    title,
    description,
    keywords: post.data.keywords || [],
    alternates: {
      canonical: post.data.canonical || `/posts/${resolvedParams.id}`,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `https://mcjp-blog.vercel.app/posts/${resolvedParams.id}`,
      siteName: 'MCJP.io',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: post.data.title,
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    }
  };
}

function getAllPublishedPosts(): Post[] {
  const postsDir = path.join(process.cwd(), 'content', 'posts');
  if (!fs.existsSync(postsDir)) return [];
  const files = fs.readdirSync(postsDir);
  const posts: Post[] = [];

  const todayStr = new Date().toISOString().split('T')[0];
  const isDev = process.env.NODE_ENV === 'development';

  files.forEach(file => {
    if (file.endsWith('.md')) {
      const id = file.replace(/\.md$/, '');
      const fullPath = path.join(postsDir, file);
      const fileContent = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = parseMarkdown(fileContent);

      const isPublished = data.published === 'true' || data.published === true;
      if (!isDev && (!isPublished || (data.date && data.date > todayStr))) {
        return;
      }

      const wordCount = content.trim().split(/\s+/).length;
      const readingTime = Math.ceil(wordCount / 200);

      posts.push({
        id,
        title: data.title || id,
        date: data.date || '',
        category: data.category || 'General',
        description: data.description || '',
        keywords: data.keywords || [],
        readingTime,
        published: isPublished,
      });
    }
  });

  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function generateStaticParams() {
  const postsDir = path.join(process.cwd(), 'content', 'posts');
  if (!fs.existsSync(postsDir)) return [];
  const files = fs.readdirSync(postsDir);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const isDev = process.env.NODE_ENV === 'development';

  return files
    .filter(file => file.endsWith('.md'))
    .map(file => {
      const fullPath = path.join(postsDir, file);
      const fileContent = fs.readFileSync(fullPath, 'utf8');
      const { data } = parseMarkdown(fileContent);
      
      const isPublished = data.published === 'true' || data.published === true;
      if (!isDev && (!isPublished || (data.date && data.date > todayStr))) {
        return null;
      }
      return { id: file.replace(/\.md$/, '') };
    })
    .filter(Boolean) as { id: string }[];
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const post = getPost(resolvedParams.id);
  
  if (!post) {
    notFound();
  }

  const allPosts = getAllPublishedPosts();
  const currentIndex = allPosts.findIndex(p => p.id === resolvedParams.id);
  const prevPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const nextPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;

  // Curated Related Posts (same category preferred)
  let relatedPosts = allPosts.filter(
    p => p.id !== resolvedParams.id && p.category.toLowerCase() === post.data.category.toLowerCase()
  );
  if (relatedPosts.length < 3) {
    const others = allPosts.filter(
      p => p.id !== resolvedParams.id && p.category.toLowerCase() !== post.data.category.toLowerCase()
    );
    relatedPosts = [...relatedPosts, ...others];
  }
  relatedPosts = relatedPosts.slice(0, 3);

  // Extract Table of Contents items and format Markdown
  const tocItems: TocItem[] = [];

  const escapeHtml = (unsafe: string) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const lines = post.content.split('\n');
  const midIndex = Math.floor(lines.length / 2);

  const parseInline = (lineText: string) => {
    let safeText = escapeHtml(lineText);
    return safeText
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-950">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-slate-800">$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-100 text-amber-800 font-mono text-xs border border-slate-200/80">$1</code>')
      .replace(/\[(.*?)\]\((.*?)\)/g, (match, text, url) => {
        if (url.trim().toLowerCase().startsWith('javascript:') || url.trim().toLowerCase().startsWith('data:')) {
          return `<span class="text-slate-500 line-through">${text} (blocked link)</span>`;
        }
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-amber-600 hover:text-amber-700 underline underline-offset-2 font-medium transition-colors">${text}</a>`;
      });
  };

  const formattedContent = lines
    .map((line, index) => {
      let formattedLine = '';
      const trimmed = line.trim();

      if (trimmed.startsWith('![') && trimmed.endsWith(')')) {
        const match = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
        if (match) {
          const alt = match[1];
          const src = match[2];
          formattedLine = `
            <figure class="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs max-w-2xl mx-auto">
              <img src="${src}" alt="${alt}" loading="lazy" decoding="async" class="w-full h-auto object-cover" />
              ${alt ? `<figcaption class="p-3 text-center text-xs text-slate-500 border-t border-slate-100 italic bg-slate-50/50">${alt}</figcaption>` : ''}
            </figure>
          `;
        }
      } else if (trimmed.startsWith('## ')) {
        const titleText = trimmed.slice(3).trim();
        const slug = slugify(titleText) || `section-${index}`;
        tocItems.push({ id: slug, text: titleText, level: 2 });
        formattedLine = `<h2 id="${slug}" class="scroll-mt-24 text-2xl md:text-3xl font-bold mt-10 mb-4 text-slate-900 tracking-tight border-b border-slate-100 pb-2">${parseInline(titleText)}</h2>`;
      } else if (trimmed.startsWith('### ')) {
        const titleText = trimmed.slice(4).trim();
        const slug = slugify(titleText) || `sub-section-${index}`;
        tocItems.push({ id: slug, text: titleText, level: 3 });
        formattedLine = `<h3 id="${slug}" class="scroll-mt-24 text-xl font-bold mt-8 mb-3 text-slate-900 tracking-tight">${parseInline(titleText)}</h3>`;
      } else if (trimmed.startsWith('> ')) {
        const quoteContent = trimmed.slice(2).trim();
        if (quoteContent.startsWith('[!CLINICAL]')) {
          formattedLine = `<div class="my-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 shadow-xs"><div class="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1"><span>🩺</span> Clinical Insight &amp; Evidence</div><p class="text-sm md:text-base leading-relaxed m-0">${parseInline(quoteContent.replace('[!CLINICAL]', '').trim())}</p></div>`;
        } else if (quoteContent.startsWith('[!FRAMEWORK]')) {
          formattedLine = `<div class="my-6 p-4 rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-950 dark:text-sky-100 shadow-xs"><div class="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1"><span>⚙️</span> Systems Thinking Framework</div><p class="text-sm md:text-base leading-relaxed m-0">${parseInline(quoteContent.replace('[!FRAMEWORK]', '').trim())}</p></div>`;
        } else if (quoteContent.startsWith('[!ACTION]')) {
          formattedLine = `<div class="my-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100 shadow-xs"><div class="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1"><span>🎯</span> Protocol Action Steps</div><p class="text-sm md:text-base leading-relaxed m-0">${parseInline(quoteContent.replace('[!ACTION]', '').trim())}</p></div>`;
        } else if (quoteContent.startsWith('[!NOTE]') || quoteContent.startsWith('[!TIP]')) {
          formattedLine = `<div class="my-6 p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/60 shadow-xs"><div class="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"><span>💡</span> Key Takeaway</div><p class="text-sm md:text-base leading-relaxed m-0">${parseInline(quoteContent.replace(/\[!(NOTE|TIP)\]/, '').trim())}</p></div>`;
        } else {
          formattedLine = `<blockquote class="border-l-4 border-amber-500 pl-4 my-6 italic text-slate-700 dark:text-slate-300 bg-amber-50/40 dark:bg-amber-500/5 py-3 pr-4 rounded-r-lg shadow-xs">${parseInline(quoteContent)}</blockquote>`;
        }
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        formattedLine = `<li class="list-disc list-inside ml-2 my-2 text-slate-700 text-base leading-relaxed">${parseInline(trimmed.slice(2))}</li>`;
      } else if (/^\d+\.\s/.test(trimmed)) {
        const itemText = trimmed.replace(/^\d+\.\s*/, '');
        formattedLine = `<li class="list-decimal list-inside ml-2 my-2 text-slate-700 text-base leading-relaxed">${parseInline(itemText)}</li>`;
      } else if (trimmed === '---') {
        formattedLine = `<hr class="border-slate-200 my-10" />`;
      } else if (trimmed === '') {
        formattedLine = `<br />`;
      } else {
        formattedLine = `<p class="text-slate-700 text-base md:text-lg leading-relaxed my-5 font-normal">${parseInline(line)}</p>`;
      }

      // In-article ad placement if configured
      if (index === midIndex && process.env.NEXT_PUBLIC_ADSENSE_APPROVED === 'true' && process.env.NEXT_PUBLIC_ADSENSE_MID_SLOT) {
        const midAdSlot = `
          <div class="my-8">
            <ins class="adsbygoogle"
                 style="display:block; text-align:center;"
                 data-ad-layout="in-article"
                 data-ad-format="fluid"
                 data-ad-client="${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-1966724508656296'}"
                 data-ad-slot="${process.env.NEXT_PUBLIC_ADSENSE_MID_SLOT}"></ins>
          </div>
        `;
        return formattedLine + midAdSlot;
      }

      return formattedLine;
    })
    .join('');

  const postUrl = `https://mcjp-blog.vercel.app/posts/${post.id}`;

  return (
    <div className="space-y-12">
      <ReadingProgress />

      {/* JSON-LD Article Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post.data.title,
            "description": post.data.description,
            "datePublished": post.data.date,
            "dateModified": post.data.lastUpdated || post.data.date,
            "image": `https://mcjp-blog.vercel.app/images/${post.id}_focus.png`,
            "wordCount": post.wordCount,
            "author": {
              "@type": "Person",
              "name": "Peter K.",
              "url": "https://mcjp-blog.vercel.app/about"
            },
            "publisher": {
              "@type": "Organization",
              "name": "MCJP.io",
              "logo": {
                "@type": "ImageObject",
                "url": "https://mcjp-blog.vercel.app/globe.svg"
              }
            },
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": postUrl
            }
          })
        }}
      />

      <article className="max-w-3xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-medium hover:text-amber-600 transition-colors"
          >
            <span>←</span> Back to All Insights
          </Link>
          <Link
            href={`/?category=${encodeURIComponent(post.data.category)}`}
            className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 font-semibold uppercase tracking-wider hover:bg-amber-500/20 transition-colors"
          >
            {post.data.category}
          </Link>
        </div>

        {/* Title Header */}
        <header className="space-y-4 border-b border-slate-200/90 pb-6">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 leading-[1.18]">
            {post.data.title}
          </h1>
          
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 pt-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-900 text-amber-300 font-bold flex items-center justify-center text-[10px]">
                PK
              </div>
              <span className="font-semibold text-slate-800">Peter K.</span>
              <span className="text-slate-300">•</span>
              <span>Published {post.data.date}</span>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              {post.data.readingTime && (
                <span className="font-medium text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded">
                  {post.data.readingTime} min read
                </span>
              )}
              <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
                {post.wordCount} words
              </span>
              <BookmarkButton
                postId={post.id}
                title={post.data.title}
                category={post.data.category}
                date={post.data.date}
              />
              <ShareButtons
                title={post.data.title}
                url={postUrl}
              />
            </div>
          </div>
        </header>

        {/* Audio Narration Player */}
        <ArticleAudioPlayer
          title={post.data.title}
          content={post.content}
        />

        {/* Executive Summary Takeaways Card */}
        <KeyTakeaways
          category={post.data.category}
          description={post.data.description}
          readingTime={post.data.readingTime}
        />

        {/* Table of Contents */}
        {tocItems.length > 1 && <TableOfContents items={tocItems} />}

        {/* FTC Affiliate Disclosure */}
        <div className="text-xs text-slate-500 bg-slate-50/90 border border-slate-200/80 rounded-xl p-4 italic leading-relaxed">
          <strong>Editorial Integrity & Disclosure:</strong> This journal is free and supported by readers. Certain curated recommendations may contain affiliate partner links. If you make a purchase, we may receive a commission at no additional cost to you.
        </div>

        {/* Body content */}
        <div 
          className="prose prose-slate max-w-none text-slate-800" 
          dangerouslySetInnerHTML={{ __html: formattedContent }} 
        />

        {/* Share Bar */}
        <ShareBar title={post.data.title} url={postUrl} />

        {/* Keyword Tags */}
        {post.data.keywords && post.data.keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {post.data.keywords.map((kw, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition-colors"
              >
                #{kw}
              </span>
            ))}
          </div>
        )}

        {/* Hostinger Partner Recommendation */}
        <div className="p-6 rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/40 to-orange-50/20 my-8 space-y-3 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
              Recommended Infrastructure
            </span>
            <span className="text-xs font-semibold text-slate-800">
              Host Your Digital Assets on Hostinger
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Building sovereign blogs or business web applications? We run and recommend Hostinger for world-class uptime, NVMe SSD speed, and unmatched affordability. Claim 20% off plus a free domain with our partner link:
          </p>
          <a
            href="https://www.hostinger.com?REFERRALCODE=OYBPHARMOWCY"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs font-bold text-amber-700 hover:text-amber-800 underline transition-colors"
          >
            Claim 20% Hostinger Discount &rarr;
          </a>
        </div>

        {/* Superloop Affiliate CTA */}
        <AffiliateCTA />

        {/* Previous & Next Post Navigation */}
        <div className="grid sm:grid-cols-2 gap-4 pt-8 border-t border-slate-200/80 my-8">
          {prevPost ? (
            <Link
              href={`/posts/${prevPost.id}`}
              className="p-4 rounded-xl border border-slate-200 hover:border-amber-500/40 bg-white hover:bg-slate-50 transition-all flex flex-col justify-between"
            >
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                ← Newer Insight
              </span>
              <span className="text-sm font-semibold text-slate-800 mt-1 line-clamp-2">
                {prevPost.title}
              </span>
            </Link>
          ) : <div />}

          {nextPost ? (
            <Link
              href={`/posts/${nextPost.id}`}
              className="p-4 rounded-xl border border-slate-200 hover:border-amber-500/40 bg-white hover:bg-slate-50 transition-all flex flex-col justify-between text-right"
            >
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Older Insight →
              </span>
              <span className="text-sm font-semibold text-slate-800 mt-1 line-clamp-2">
                {nextPost.title}
              </span>
            </Link>
          ) : <div />}
        </div>
      </article>

      <div className="max-w-3xl mx-auto space-y-8">
        <AuthorProfile />
        <NewsletterForm />
      </div>

      {/* Related Posts Section */}
      {relatedPosts.length > 0 && (
        <section className="max-w-3xl mx-auto pt-10 border-t border-slate-200 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Recommended Follow-Up Reading
            </h3>
            <Link href="/" className="text-xs font-semibold text-amber-600 hover:text-amber-700">
              View All Articles →
            </Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {relatedPosts.map(rel => (
              <Link
                key={rel.id}
                href={`/posts/${rel.id}`}
                className="p-5 rounded-xl bg-white border border-slate-200/90 hover:border-amber-500/40 hover:shadow-sm transition-all flex flex-col justify-between min-h-[160px]"
              >
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded tracking-wider">
                    {rel.category}
                  </span>
                  <h4 className="text-sm font-bold text-slate-800 hover:text-amber-600 transition-colors line-clamp-2 leading-snug">
                    {rel.title}
                  </h4>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-4 pt-2 border-t border-slate-100">
                  <span>{rel.date}</span>
                  {rel.readingTime && (
                    <span className="font-medium text-slate-500">{rel.readingTime}m read</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
