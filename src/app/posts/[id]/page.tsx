import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';

interface PostData {
  title: string;
  date: string;
  category: string;
  description: string;
  keywords: string[];
}

interface Post {
  id: string;
  title: string;
  date: string;
  category: string;
  description: string;
  keywords: string[];
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

function getPost(id: string) {
  const postsDir = path.join(process.cwd(), 'content', 'posts');
  const fullPath = path.join(postsDir, `${id}.md`);
  
  if (!fs.existsSync(fullPath)) return null;
  
  const fileContent = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = parseMarkdown(fileContent);
  return {
    id,
    data: {
      title: data.title || id,
      date: data.date || '',
      category: data.category || 'General',
      description: data.description || '',
      keywords: data.keywords || [],
    } as PostData,
    content,
  };
}

function getRelatedPosts(currentId: string, category: string): Post[] {
  const postsDir = path.join(process.cwd(), 'content', 'posts');
  if (!fs.existsSync(postsDir)) return [];
  const files = fs.readdirSync(postsDir);
  
  const posts = files
    .filter(file => file.endsWith('.md'))
    .map(file => {
      const id = file.replace(/\.md$/, '');
      const fullPath = path.join(postsDir, file);
      const fileContent = fs.readFileSync(fullPath, 'utf8');
      const { data } = parseMarkdown(fileContent);
      return {
        id,
        title: data.title || id,
        date: data.date || '',
        category: data.category || 'General',
        description: data.description || '',
        keywords: data.keywords || [],
      };
    });
    
  let related = posts.filter(p => p.id !== currentId && p.category.toLowerCase() === category.toLowerCase());
  
  if (related.length < 3) {
    const others = posts.filter(p => p.id !== currentId && p.category.toLowerCase() !== category.toLowerCase());
    related = [...related, ...others];
  }
  
  return related.slice(0, 3);
}

export async function generateStaticParams() {
  const postsDir = path.join(process.cwd(), 'content', 'posts');
  if (!fs.existsSync(postsDir)) return [];
  const files = fs.readdirSync(postsDir);
  return files.map(file => ({
    id: file.replace(/\.md$/, ''),
  }));
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

  const relatedPosts = getRelatedPosts(resolvedParams.id, post.data.category);

  // Markdown formatter with mid-content ad slot injection (light theme optimized)
  const formatMarkdown = (text: string) => {
    const lines = text.split('\n');
    const midIndex = Math.floor(lines.length / 2);
    
    return lines
      .map((line, index) => {
        let formattedLine = '';
        const trimmed = line.trim();
        if (trimmed.startsWith('## ')) {
          formattedLine = `<h2 class="text-2xl font-semibold mt-8 mb-4 text-slate-900">${trimmed.slice(3)}</h2>`;
        } else if (trimmed.startsWith('### ')) {
          formattedLine = `<h3 class="text-xl font-semibold mt-6 mb-3 text-slate-900">${trimmed.slice(4)}</h3>`;
        } else if (trimmed.startsWith('> ')) {
          formattedLine = `<blockquote class="border-l-2 border-amber-500 pl-4 my-6 italic text-slate-600 bg-amber-500/5 py-2 pr-2 rounded-r-md">${trimmed.slice(2)}</blockquote>`;
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          formattedLine = `<li class="list-disc list-inside ml-4 my-1 text-slate-700 text-sm md:text-base leading-relaxed">${trimmed.slice(2)}</li>`;
        } else if (trimmed === '---') {
          formattedLine = `<hr class="border-slate-200 my-8" />`;
        } else if (trimmed === '') {
          formattedLine = `<br />`;
        } else {
          const formattedText = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-950">$1</strong>');
          formattedLine = `<p class="text-slate-700 text-sm md:text-base leading-relaxed my-4">${formattedText}</p>`;
        }

        // Dynamically inject in-article ad slot right in the middle
        if (index === midIndex) {
          const midAdSlot = `
            <div class="my-8 p-4 rounded-lg border border-slate-200 bg-slate-50 text-center text-xs text-slate-500 shadow-xs">
              <div class="mb-2 uppercase tracking-widest text-[9px] text-slate-400 font-semibold select-none">Advertisement</div>
              <ins class="adsbygoogle"
                   style="display:block; text-align:center;"
                   data-ad-layout="in-article"
                   data-ad-format="fluid"
                   data-ad-client="${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-1966724508656296'}"
                   data-ad-slot="mid-article-ad-slot"></ins>
              <div class="py-6 border border-dashed border-slate-200 rounded text-slate-400 select-none">
                In-Article Banner (Active upon AdSense approval)
              </div>
            </div>
          `;
          return formattedLine + midAdSlot;
        }

        return formattedLine;
      })
      .join('');
  };

  const formattedContent = formatMarkdown(post.content);

  return (
    <div className="space-y-12">
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
            "author": {
              "@type": "Person",
              "name": "Peter Kim"
            },
            "publisher": {
              "@type": "Organization",
              "name": "MCJP.io",
              "logo": {
                "@type": "ImageObject",
                "url": "https://blog.mcjp.io/globe.svg"
              }
            },
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": `https://blog.mcjp.io/posts/${post.id}`
            }
          })
        }}
      />

      <article className="max-w-3xl mx-auto space-y-8">
        {/* Title Header */}
        <header className="space-y-4 border-b border-slate-200 pb-6">
          <div className="flex gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 font-semibold text-xs uppercase tracking-wider">
              {post.data.category}
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
            {post.data.title}
          </h1>
          <div className="text-xs text-slate-400">
            Published on {post.data.date}
          </div>
        </header>

        {/* Body content */}
        <div 
          className="prose prose-slate max-w-none text-slate-700" 
          dangerouslySetInnerHTML={{ __html: formattedContent }} 
        />

        {/* Social Share Bar */}
        <div className="flex flex-wrap items-center gap-4 py-4 border-t border-b border-slate-200 my-8">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Share Article:</span>
          <div className="flex gap-2">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.data.title)}&url=${encodeURIComponent(`https://blog.mcjp.io/posts/${post.id}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded bg-white hover:bg-amber-500/10 text-slate-600 hover:text-amber-600 transition-colors text-xs font-medium border border-slate-200 shadow-xs"
            >
              Twitter/X
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://blog.mcjp.io/posts/${post.id}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded bg-white hover:bg-amber-500/10 text-slate-600 hover:text-amber-600 transition-colors text-xs font-medium border border-slate-200 shadow-xs"
            >
              Facebook
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://blog.mcjp.io/posts/${post.id}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded bg-white hover:bg-amber-500/10 text-slate-600 hover:text-amber-600 transition-colors text-xs font-medium border border-slate-200 shadow-xs"
            >
              LinkedIn
            </a>
          </div>
        </div>

        {/* Google AdSense Post-Body Ad Unit Slot */}
        <div className="mt-8 p-4 rounded-lg border border-slate-200 bg-slate-50 text-center text-xs text-slate-500 shadow-xs">
          <div className="mb-2 uppercase tracking-widest text-[10px] text-slate-400 font-semibold select-none">Advertisement</div>
          <ins className="adsbygoogle"
               style={{ display: 'block' }}
               data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-1966724508656296'}
               data-ad-slot="default-post-ad-slot"
               data-ad-format="auto"
               data-full-width-responsive="true"></ins>
          <div className="py-6 border border-dashed border-slate-200 rounded text-slate-400 select-none">
            Post-Body Banner (Active upon AdSense approval)
          </div>
        </div>
      </article>

      {/* Related Posts Section */}
      {relatedPosts.length > 0 && (
        <section className="max-w-3xl mx-auto pt-8 border-t border-slate-200 space-y-6">
          <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider">
            Related Articles
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {relatedPosts.map(rel => (
              <a
                key={rel.id}
                href={`/posts/${rel.id}`}
                className="block p-4 rounded-lg glass-panel bg-white hover:border-amber-500/30 transition-all flex flex-col justify-between min-h-[140px]"
              >
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-semibold text-amber-600 tracking-wider">
                    {rel.category}
                  </span>
                  <h4 className="text-sm font-bold text-slate-800 hover:text-amber-600 transition-colors line-clamp-2">
                    {rel.title}
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400 mt-2 block">{rel.date}</span>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
