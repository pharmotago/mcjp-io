import { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';

function parseMarkdown(fileContent: string) {
  const match = fileContent.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {} as any, content: fileContent };
  const yaml = match[1];
  const data: any = {};
  yaml.split('\n').forEach(line => {
    const parts = line.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let val = parts.slice(1).join(':').trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      data[key] = val;
    }
  });
  return { data };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://blog.mcjp.io';
  
  // Base routes explicitly typed
  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
  ];

  // Dynamic post routes
  const postsDir = path.join(process.cwd(), 'content', 'posts');
  if (fs.existsSync(postsDir)) {
    const todayStr = new Date().toISOString().split('T')[0];
    const isDev = process.env.NODE_ENV === 'development';
    
    const files = fs.readdirSync(postsDir);
    files.forEach(file => {
      if (file.endsWith('.md')) {
        const id = file.replace(/\.md$/, '');
        const fullPath = path.join(postsDir, file);
        const stats = fs.statSync(fullPath);
        
        const fileContent = fs.readFileSync(fullPath, 'utf8');
        const { data } = parseMarkdown(fileContent);
        
        const isPublished = data.published === 'true' || data.published === true;
        
        if (!isDev && (!isPublished || (data.date && data.date > todayStr))) {
          return; // Skip unpublished or future posts
        }
        
        routes.push({
          url: `${baseUrl}/posts/${id}`,
          lastModified: stats.mtime.toISOString(),
          changeFrequency: 'monthly' as const,
          priority: 0.6,
        });
      }
    });
  }

  return routes;
}
