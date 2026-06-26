module.paths.push('C:\\Antigravity\\node_modules');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const gemini = require('../../scripts/gemini_client');

const ROOT_DIR = 'C:\\Antigravity\\mcjp-io';
const POSTS_DIR = path.join(ROOT_DIR, 'content', 'posts');
const IMAGES_DIR = path.join(ROOT_DIR, 'public', 'images');

// 6 verified LIVE books scraped from KDP Bookshelf
const LIVE_BOOKS = [
  {
    title: "The Hybrid Performance Log",
    author: "Josh Smith",
    format: "Paperback",
    price: "12.99",
    asin: "B0H38J3S4M",
    slug: "book_hybrid_performance_log",
    category: "Discipline",
    focus: "Hybrid athletic training, strength and endurance tracking, physical discipline",
    summary: "A comprehensive guide on hybrid athletic performance, discussing why combining strength training and cardiovascular endurance is the ultimate physical standard. It introduces the Hybrid Performance Log as the essential tool to track metrics, break plateaus, and build a resilient body."
  },
  {
    title: "The 90-Day Habit System",
    author: "Josh Smith",
    format: "Kindle eBook",
    price: "14.99",
    asin: "B0GX3B2HT9",
    slug: "book_90_day_habit_system",
    category: "Discipline",
    focus: "Habit formation, neuroplasticity, self-discipline, and deep focus",
    summary: "An in-depth article exploring the neurological mechanics of habit loop formation. It explains how to program the brain for high productivity, eliminate dopamine traps, and utilize a structured 90-day system to lock in lifelong success habits."
  },
  {
    title: "The 90-Day Longevity Protocol Log",
    author: "Josh Smith",
    format: "Paperback",
    price: "14.99",
    asin: "B0H36TC1PB",
    slug: "book_90_day_longevity_protocol_log",
    category: "Life",
    focus: "Longevity, health optimization, biomarkers, and active physical protocol tracking",
    summary: "Focuses on the science of healthspan and cellular longevity. Discusses critical biomarkers, diet/exercise protocols that delay aging, and how a rigorous 90-day tracking framework allows men to optimize their physical age and maintain peak vitality."
  },
  {
    title: "The Low-Friction ADHD Planner",
    author: "Josh Smith",
    format: "Paperback",
    price: "12.99",
    asin: "B0H36TC1FP",
    slug: "book_low_friction_adhd_planner",
    category: "Discipline",
    focus: "ADHD productivity, reducing executive dysfunction, and managing cognitive load",
    summary: "Addresses the unique productivity challenges faced by neurodivergent individuals. It details practical systems to bypass executive dysfunction, lower friction for starting tasks, and leverage the Low-Friction ADHD Planner to gain daily control without burnout."
  },
  {
    title: "Unburden Your Brain",
    author: "Jordan R Clark",
    format: "Kindle eBook",
    price: "7.99",
    asin: "B0GHMGFK1W",
    slug: "book_unburden_your_brain",
    category: "Life",
    focus: "Mastering life admin, reducing the mental load, and cognitive organization systems",
    summary: "Exposes the hidden drain of 'life admin' and mental load on modern professionals. It offers a structured methodology to offload administrative tasks, streamline domestic systems, and reclaim focus, promoting the book as the definitive master manual."
  },
  {
    title: "Let Them + Let Me: The Boundary Reset Guide",
    author: "Jordan R Clark",
    format: "Kindle eBook",
    price: "7.99",
    asin: "B0GHMTMVKC",
    slug: "book_let_them_let_me",
    category: "Life",
    focus: "Boundary setting, relationship health, emotional sovereignty, and self-assertion",
    summary: "A powerful treatise on emotional sovereignty and relational boundaries. It details the 'Let Them + Let Me' philosophy, explaining how letting others make their choices while establishing firm personal boundaries is the key to respect, peace of mind, and healthy leadership."
  }
];

// Helper to generate a high-aesthetic, premium SVG graphic for the blog post
function generateSVG(book, type) {
  const themeGlow = book.category === 'Discipline' ? '#00F0FF' : '#F59E0B'; // Cyan for discipline, Amber for life
  const glowRGB = book.category === 'Discipline' ? '0, 240, 255' : '245, 158, 11';
  const subtitle = type === 'focus' ? 'MASTERCLASS SERIES' : 'OFFICIAL BOOK RELEASE';
  
  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B0F19" />
      <stop offset="50%" stop-color="#111827" />
      <stop offset="100%" stop-color="#070A10" />
    </linearGradient>
    <linearGradient id="glowBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${themeGlow}" stop-opacity="0.8" />
      <stop offset="50%" stop-color="#312E81" stop-opacity="0.2" />
      <stop offset="100%" stop-color="${themeGlow}" stop-opacity="0.8" />
    </linearGradient>
    <linearGradient id="panelBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1F2937" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#111827" stop-opacity="0.9" />
    </linearGradient>
    <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="60" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="100%" height="100%" fill="url(#bg)" />

  <!-- Neon Glowing Orbs -->
  <circle cx="150" cy="150" r="130" fill="${themeGlow}" opacity="0.15" filter="url(#blur)" />
  <circle cx="1050" cy="480" r="150" fill="${themeGlow}" opacity="0.12" filter="url(#blur)" />

  <!-- Subtly Elegant Grid Overlay -->
  <path d="M 0,105 L 1200,105 M 0,210 L 1200,210 M 0,315 L 1200,315 M 0,420 L 1200,420 M 0,525 L 1200,525 M 200,0 L 200,630 M 400,0 L 400,630 M 600,0 L 600,630 M 800,0 L 800,630 M 1000,0 L 1000,630" stroke="#FFFFFF" stroke-opacity="0.02" stroke-width="1" />

  <!-- Glassmorphic Outer Card Container -->
  <rect x="100" y="80" width="1000" height="470" rx="24" fill="url(#panelBg)" stroke="url(#glowBorder)" stroke-width="1.5" style="backdrop-filter: blur(20px);" />

  <!-- Header Badge -->
  <g transform="translate(150, 140)">
    <rect width="220" height="36" rx="18" fill="${themeGlow}" fill-opacity="0.1" stroke="${themeGlow}" stroke-opacity="0.4" stroke-width="1" />
    <text x="110" y="22" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="800" fill="${themeGlow}" letter-spacing="3" text-anchor="middle">MCJP ASSET HUB</text>
  </g>

  <!-- Book Title -->
  <text x="150" y="250" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="900" fill="#FFFFFF" width="650">
    ${book.title}
  </text>

  <!-- Author and Format metadata -->
  <text x="150" y="320" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="400" fill="#9CA3AF">
    By <tspan fill="#FFFFFF" font-weight="700">${book.author}</tspan> | Format: <tspan fill="${themeGlow}" font-weight="700">${book.format}</tspan>
  </text>

  <!-- Divider Line -->
  <line x1="150" y1="360" x2="750" y2="360" stroke="#374151" stroke-width="1" />

  <!-- Action Subtitle description -->
  <text x="150" y="410" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="800" fill="${themeGlow}" letter-spacing="5">${subtitle}</text>
  <text x="150" y="445" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="300" fill="#D1D5DB" width="600">
    Reclaiming sovereignty, building physical and mental wealth.
  </text>

  <!-- Glowing Book Placeholder / Cover Panel on the Right -->
  <g transform="translate(820, 130)">
    <!-- Book Shadow -->
    <rect x="10" y="10" width="220" height="330" rx="16" fill="#000000" opacity="0.5" filter="url(#blur)" />
    <!-- Book Body -->
    <rect width="220" height="330" rx="16" fill="#1F2937" stroke="url(#glowBorder)" stroke-width="2" />
    <!-- Cover inner gradient highlight -->
    <rect x="8" y="8" width="204" height="314" rx="10" fill="none" stroke="#FFFFFF" stroke-opacity="0.05" stroke-width="1" />
    
    <!-- Cover text -->
    <text x="110" y="90" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="800" fill="${themeGlow}" letter-spacing="4" text-anchor="middle">AMAZON LIVE</text>
    <text x="110" y="150" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="800" fill="#FFFFFF" text-anchor="middle">MCJP</text>
    <text x="110" y="180" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="800" fill="#FFFFFF" text-anchor="middle">MASTERCLASS</text>
    
    <!-- Gold/Cyan Glow line on spine -->
    <line x1="15" y1="20" x2="15" y2="310" stroke="${themeGlow}" stroke-opacity="0.6" stroke-width="2" />
    
    <!-- Price Badge inside Cover -->
    <rect x="65" y="235" width="90" height="30" rx="15" fill="#111827" stroke="${themeGlow}" stroke-opacity="0.3" stroke-width="1" />
    <text x="110" y="255" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" fill="#4ADE80" text-anchor="middle">$${book.price}</text>
  </g>
</svg>`;
}

async function promoteLiveBooks() {
  console.log("🚀 Starting KDP Bookshelf Promotion Pipeline on MCJP.io...");

  if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  let promotedCount = 0;

  for (const book of LIVE_BOOKS) {
    const postFile = path.join(POSTS_DIR, `${book.slug}.md`);
    
    // Generate static SVG assets to prevent broken image references
    const focusSvgPath = path.join(IMAGES_DIR, `${book.slug}_focus.svg`);
    const themeSvgPath = path.join(IMAGES_DIR, `${book.slug}_theme.svg`);
    
    console.log(`\n🎨 Generating SVG Assets for "${book.title}"...`);
    fs.writeFileSync(focusSvgPath, generateSVG(book, 'focus'), 'utf8');
    fs.writeFileSync(themeSvgPath, generateSVG(book, 'theme'), 'utf8');

    // Check if the promotional article already exists
    if (fs.existsSync(postFile)) {
      console.log(`ℹ️ Article for "${book.title}" already exists at: ${postFile}. Skipping generation.`);
      continue;
    }

    console.log(`📝 Generating promotional article for: "${book.title}"...`);

    const prompt = `Write a premium, high-impact blog article for the website "MCJP.io" that promotes our newly released book.
Book Title: "${book.title}"
Author: "${book.author}"
Format: "${book.format}"
Price: "$${book.price} USD"
ASIN/Purchase ID: "${book.asin}"
Focus Theme: "${book.focus}"
Summary of Book Intent: "${book.summary}"

RESOURCES & LINKS:
- Amazon Book Purchase Link: Use exactly: [Buy on Amazon](https://www.amazon.com/dp/${book.asin})
- Peter's sister project: Mention "The Stoic Dad" (https://the-stoic-dad.mcjp.io/) exactly once if relevant to life, masculinity, or parenting.
- Hostinger web host: Mention Hostinger (https://www.hostinger.com?REFERRALCODE=OYBPHARMOWCY) exactly once if relevant to wealth creation, digital assets, or starting online.

REQUIREMENTS:
1. Editorial Tone: Deep, authoritative, inspiring, and direct. Blend premium essay style (McKinsey-level depth) with actionable masculinity, wealth mindset, and self-discipline.
2. Structure:
   - Use clean, semantic markdown headings (##, ###).
   - Write structured paragraphs with premium typography flow.
   - Include a bulleted "Key Takeaways" or "Why You Need This Book" checklist.
   - Re-introduce the book organically in the text and end with a powerful call-to-action (CTA) urging readers to get their copy using the Amazon link.
3. Visual Aids:
   - Embed exactly these two glowing vector images in the markdown:
     1. In the first third of the article: \`![Mastery Focus and Framework](/images/${book.slug}_focus.svg)\`
     2. In the final third: \`![Official Release Asset](/images/${book.slug}_theme.svg)\`
4. Content length: Minimum 800-1000 words.
5. Frontmatter & Output:
   - Output ONLY the body of the article in markdown. Do NOT write the title as an H1 heading (it will be added by frontmatter). Do NOT include HTML fences or code blocks.
   - The category for this post is: "${book.category}".`;

    const systemInstruction = `You are the chief editor and writer for MCJP.io. 
You specialize in writing deep, high-impact essays that seamlessly integrate book promotions as must-read solutions for success-focused men.
Ensure you embed the exact SVG image markup paths and the Amazon purchase link exactly as provided.`;

    try {
      let content = await gemini.generate(prompt, systemInstruction);

      // Clean markdown blocks if any
      content = content.replace(/```json|```markdown|```/g, '').trim();

      // Apply legal disclaimer if category is Money
      if (book.category.toLowerCase() === 'money') {
        content += `\n\n---
> **Legal Disclaimer:** The information provided on MCJP.io, including but not limited to business models, financial assets, and wealth strategies, is for general educational and informational purposes only. It does not constitute professional financial, legal, or investment advice. Always consult with a certified financial planner or legal professional before making any financial decisions.`;
      }

      const today = new Date().toISOString().split('T')[0];
      const frontmatter = `---
title: "Mastering sovereignty: ${book.title}"
date: "${today}"
category: "${book.category}"
description: "${book.summary.substring(0, 160)}"
keywords: ["${book.title.toLowerCase()}", "${book.author.toLowerCase()}", "${book.category.toLowerCase()}", "self improvement", "wealth", "discipline"]
---

`;

      const fullContent = frontmatter + content;
      fs.writeFileSync(postFile, fullContent, 'utf8');
      console.log(`✅ Success! Article generated and saved at: ${postFile}`);
      promotedCount++;

    } catch (e) {
      console.error(`❌ Failed to generate article for "${book.title}":`, e.message);
    }
  }

  // Commit and push the new content to GitHub to trigger Vercel deployment
  if (promotedCount > 0) {
    console.log(`\n💾 Successfully promoted ${promotedCount} new books. Committing and pushing to GitHub...`);
    try {
      execSync('git add .', { cwd: ROOT_DIR });
      execSync(`git commit -m "chore(blog): promote ${promotedCount} live KDP books with premium SVG graphics"`, { cwd: ROOT_DIR });
      execSync('git push origin main', { cwd: ROOT_DIR });
      console.log("✅ New promotional articles and assets successfully pushed to GitHub! Vercel is building the live site.");
    } catch (e) {
      console.error("❌ Git push failed:", e.message);
    }
  } else {
    console.log("\nℹ️ All live KDP books are already promoted on mcjp.io. No new articles generated.");
  }
}

promoteLiveBooks().catch(err => console.error("❌ Promotion pipeline crashed:", err.message));
