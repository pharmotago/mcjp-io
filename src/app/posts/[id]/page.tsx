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

  // Simple Markdown formatter for rendering headers, bolding, blockquotes, and lists
  const formatMarkdown = (text: string) => {
    return text
      .split('\n')
      .map((line, index) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('## ')) {
          return `<h2 key="${index}" class="text-2xl font-semibold mt-8 mb-4 text-[#f4f4f5]">${trimmed.slice(3)}</h2>`;
        }
        if (trimmed.startsWith('### ')) {
          return `<h3 key="${index}" class="text-xl font-semibold mt-6 mb-3 text-[#f4f4f5]">${trimmed.slice(4)}</h3>`;
        }
        if (trimmed.startsWith('> ')) {
          return `<blockquote key="${index}" class="border-l-2 border-amber-500 pl-4 my-6 italic text-zinc-400 bg-amber-500/5 py-2 pr-2 rounded-r-md">${trimmed.slice(2)}</blockquote>`;
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return `<li key="${index}" class="list-disc list-inside ml-4 my-1 text-zinc-300 text-sm md:text-base leading-relaxed">${trimmed.slice(2)}</li>`;
        }
        if (trimmed === '---') {
          return `<hr key="${index}" class="border-zinc-800 my-8" />`;
        }
        if (trimmed === '') {
          return `<br key="${index}" />`;
        }
        // General text paragraph with basic bolding parsing
        const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-zinc-100">$1</strong>');
        return `<p key="${index}" class="text-zinc-300 text-sm md:text-base leading-relaxed my-4">${formattedLine}</p>`;
      })
      .join('');
  };

  const formattedContent = formatMarkdown(post.content);

  return (
    <article className="max-w-3xl mx-auto space-y-8">
      {/* Title Header */}
      <header className="space-y-4 border-b border-[#27272a] pb-6">
        <div className="flex gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-semibold text-xs uppercase tracking-wider">
            {post.data.category}
          </span>
        </div>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-[#f4f4f5] leading-tight">
          {post.data.title}
        </h1>
        <div className="text-xs text-zinc-500">
          Published on {post.data.date}
        </div>
      </header>

      {/* Body content */}
      <div 
        className="prose prose-invert max-w-none text-zinc-300" 
        dangerouslySetInnerHTML={{ __html: formattedContent }} 
      />
    </article>
  );
}
