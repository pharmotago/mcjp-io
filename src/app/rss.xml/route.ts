import { promises as fs } from 'fs';
import path from 'path';

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

function escapeCdata(str: string) {
  return str.replace(/]]>/g, ']]]]><![CDATA[>');
}

function getValidDateString(dateStr: string) {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
}

async function getPosts() {
  const postsDir = path.join(process.cwd(), 'content', 'posts');
  let files = [];
  try {
    files = await fs.readdir(postsDir);
  } catch (err) {
    return [];
  }
  
  const allPosts = [];
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    try {
      const id = file.replace(/\.md$/, '');
      const fullPath = path.join(postsDir, file);
      const fileContent = await fs.readFile(fullPath, 'utf8');
      const { data } = parseMarkdown(fileContent);

      allPosts.push({
        id,
        title: data.title || id,
        date: data.date || '',
        description: data.description || '',
        published: data.published === 'true' || data.published === true,
      });
    } catch (e) {
      console.error(`Error reading post ${file}:`, e);
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const filtered = allPosts.filter(post => post.published && post.date <= todayStr);

  return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function GET() {
  const posts = await getPosts();
  const siteUrl = 'https://blog.mcjp.io';

  const itemsXml = posts.map(post => `
    <item>
      <title><![CDATA[${escapeCdata(post.title)}]]></title>
      <link>${siteUrl}/posts/${post.id}</link>
      <guid>${siteUrl}/posts/${post.id}</guid>
      <pubDate>${getValidDateString(post.date)}</pubDate>
      <description><![CDATA[${escapeCdata(post.description)}]]></description>
    </item>
  `).join('');

  const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>MCJP.io Blog</title>
    <link>${siteUrl}</link>
    <description>Master of Family, Money &amp; Life</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${itemsXml}
  </channel>
</rss>`;

  return new Response(rssFeed, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 's-maxage=86400, stale-while-revalidate',
    },
  });
}
