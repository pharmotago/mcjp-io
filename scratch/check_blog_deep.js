const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, '../content/posts');
const imagesDir = path.join(__dirname, '../public/images');

const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));
const images = fs.readdirSync(imagesDir).filter(f => f.endsWith('.png') || f.endsWith('.svg') || f.endsWith('.jpg') || f.endsWith('.jpeg'));

const usedImages = new Set();
const missingImages = [];
const frontmatterIssues = [];
const h1Issues = [];

files.forEach(file => {
  const content = fs.readFileSync(path.join(postsDir, file), 'utf-8');
  
  // 1. Check Frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) {
    frontmatterIssues.push(`${file}: Missing frontmatter block`);
  } else {
    const fm = fmMatch[1];
    if (!fm.includes('title:')) frontmatterIssues.push(`${file}: Missing 'title'`);
    if (!fm.includes('date:')) frontmatterIssues.push(`${file}: Missing 'date'`);
    if (!fm.includes('image:')) frontmatterIssues.push(`${file}: Missing 'image'`);
  }

  // 2. Check H1 (# Title)
  const h1Matches = content.match(/^# .+/gm);
  if (!h1Matches) {
    h1Issues.push(`${file}: No H1 (# Title) found`);
  } else if (h1Matches.length > 1) {
    h1Issues.push(`${file}: Multiple H1s found (SEO violation)`);
  }

  // 3. Collect Images
  const fmImgMatch = content.match(/image:\s*['"]?(.*?)['"]?\n/);
  if (fmImgMatch) {
    usedImages.add(fmImgMatch[1].trim());
  }

  const mdMatches = content.matchAll(/!\[.*?\]\((.*?)\)/g);
  for (const match of mdMatches) {
    usedImages.add(match[1].trim().split(' ')[0]);
  }
});

// 4. Validate Images (Missing vs Unused)
usedImages.forEach(img => {
  if (img.startsWith('/images/')) {
    const imgName = img.replace('/images/', '');
    if (!images.includes(imgName)) {
      missingImages.push(img);
    }
  }
});

const unusedImages = images.filter(img => {
  return !usedImages.has(`/images/${img}`) && !usedImages.has(img);
});

console.log("=== FRONTMATTER ISSUES ===");
console.log(frontmatterIssues.length ? frontmatterIssues.join('\n') : "None");

console.log("\n=== H1 (SEO) ISSUES ===");
console.log(h1Issues.length ? h1Issues.join('\n') : "None");

console.log("\n=== BROKEN IMAGE LINKS (404) ===");
console.log(missingImages.length ? missingImages.join('\n') : "None");

console.log("\n=== UNUSED IMAGES (Bloat) ===");
console.log(unusedImages.length ? `Found ${unusedImages.length} unused images. Example: ${unusedImages.slice(0,5).join(', ')}` : "None");
