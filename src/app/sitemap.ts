import { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';

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
    const files = fs.readdirSync(postsDir);
    files.forEach(file => {
      if (file.endsWith('.md')) {
        const id = file.replace(/\.md$/, '');
        const stats = fs.statSync(path.join(postsDir, file));
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
