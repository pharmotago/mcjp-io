import fs from 'fs';
import path from 'path';

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

function getPosts(): Post[] {
  const postsDir = path.join(process.cwd(), 'content', 'posts');
  if (!fs.existsSync(postsDir)) return [];
  
  const files = fs.readdirSync(postsDir);
  return files
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
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const posts = getPosts();
  const activeCategory = params.category || '';
  
  const filteredPosts = activeCategory
    ? posts.filter(post => post.category.toLowerCase() === activeCategory.toLowerCase())
    : posts;

  return (
    <div className="space-y-16">
      {/* Hero Banner */}
      <section className="text-center py-12 space-y-6">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Sovereign Guidance for the <span className="text-amber-500">Modern Man</span>
        </h1>
        <p className="max-w-2xl mx-auto text-zinc-400 text-sm md:text-base leading-relaxed">
          Unlock actionable blueprints on wealth asset creation, disciplined lifestyle execution, and the protective leadership roles of family dynamics.
        </p>
      </section>

      {/* Grid List */}
      <div className="space-y-8">
        <h2 className="text-xl font-semibold border-b border-[#27272a] pb-2 text-zinc-300">
          {activeCategory ? `${activeCategory} Articles` : "Recent Insights"}
        </h2>
        
        {filteredPosts.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-sm">
            No articles published yet. The content pipeline is assembling nodes.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredPosts.map(post => (
              <a
                key={post.id}
                href={`/posts/${post.id}`}
                className="block p-6 rounded-lg glass-panel transition-all duration-300 flex flex-col justify-between min-h-[200px]"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-semibold uppercase tracking-wider">
                      {post.category}
                    </span>
                    <span className="text-zinc-500">{post.date}</span>
                  </div>
                  <h3 className="text-xl font-bold text-zinc-100 hover:text-amber-500 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed line-clamp-3">
                    {post.description}
                  </p>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  {post.keywords.map((kw, i) => (
                    <span key={i} className="text-xs text-zinc-600">
                      #{kw}
                    </span>
                  ))}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
