import { promises as fs } from 'fs';
import path from 'path';

function escapeXml(str: string) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeCdata(str: string) {
  if (!str) return '';
  return str.replace(/]]>/g, ']]]]><![CDATA[>');
}

interface PodcastEpisode {
  id: string;
  episodeNumber: number;
  title: string;
  subtitle?: string;
  description: string;
  audioUrl: string;
  fileSize: number;
  mimeType: string;
  pubDate: string;
  category?: string;
}

export async function GET() {
  const rootDir = process.cwd();
  const dbPath = path.join(rootDir, '..', 'podcasts', 'episodes.json');
  
  let episodes: PodcastEpisode[] = [];
  try {
    const data = await fs.readFile(dbPath, 'utf8');
    episodes = JSON.parse(data);
  } catch (e) {
    // Fallback if episodes.json is empty
    episodes = [];
  }

  const siteUrl = 'https://mcjp-blog.vercel.app';
  const podcastTitle = 'The Sovereign Dispatch with Peter K.';
  const podcastAuthor = 'Peter K. (Clinical Pharmacist & Systems Architect)';
  const podcastDescription = 'Actionable blueprints on leveraged wealth creation, stoic fatherhood, and cognitive mastery in an age of exponential acceleration. Hosted by Peter K.';
  const podcastCover = `${siteUrl}/og-image.png`;

  const itemsXml = episodes.map(ep => `
    <item>
      <title><![CDATA[${escapeCdata(ep.title)}]]></title>
      <itunes:title><![CDATA[${escapeCdata(ep.title)}]]></itunes:title>
      <itunes:episode>${ep.episodeNumber}</itunes:episode>
      <itunes:episodeType>full</itunes:episodeType>
      <itunes:author>${escapeXml(podcastAuthor)}</itunes:author>
      <itunes:subtitle><![CDATA[${escapeCdata(ep.subtitle || ep.title)}]]></itunes:subtitle>
      <description><![CDATA[${escapeCdata(ep.description)}]]></description>
      <itunes:summary><![CDATA[${escapeCdata(ep.description.replace(/<[^>]+>/g, ''))}]]></itunes:summary>
      <enclosure url="${escapeXml(ep.audioUrl)}" length="${ep.fileSize || 1000000}" type="${ep.mimeType || 'audio/mpeg'}" />
      <guid isPermaLink="false">${ep.id}</guid>
      <pubDate>${ep.pubDate}</pubDate>
      <itunes:duration>1800</itunes:duration>
      <itunes:explicit>false</itunes:explicit>
      <link>${siteUrl}</link>
    </item>
  `).join('');

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" 
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <atom:link href="${siteUrl}/podcast.xml" rel="self" type="application/rss+xml" />
    <title><![CDATA[${escapeCdata(podcastTitle)}]]></title>
    <link>${siteUrl}</link>
    <language>en-us</language>
    <copyright>© ${new Date().getFullYear()} ${podcastAuthor}</copyright>
    <itunes:author>${escapeXml(podcastAuthor)}</itunes:author>
    <itunes:summary><![CDATA[${escapeCdata(podcastDescription)}]]></itunes:summary>
    <description><![CDATA[${escapeCdata(podcastDescription)}]]></description>
    <itunes:owner>
      <itunes:name>${escapeXml(podcastAuthor)}</itunes:name>
      <itunes:email>contact@mcjp-blog.vercel.app</itunes:email>
    </itunes:owner>
    <itunes:image href="${podcastCover}" />
    <itunes:category text="Business">
      <itunes:category text="Entrepreneurship" />
    </itunes:category>
    <itunes:category text="Health &amp; Fitness" />
    <itunes:category text="Society &amp; Culture">
      <itunes:category text="Philosophy" />
    </itunes:category>
    <itunes:explicit>false</itunes:explicit>
    <itunes:type>episodic</itunes:type>
    ${itemsXml}
  </channel>
</rss>`;

  return new Response(rssXml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400',
    },
  });
}
