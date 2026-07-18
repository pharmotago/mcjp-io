const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, '../content/posts');
const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));

const imageMap = {}; // image_path -> array of post filenames
const unsplashViolations = [];
const missingSuperloop = [];
const duplicates = [];

const superloopKeywords = [
  'home office', 'remote work', 'productivity', 'digital detox',
  'technology use', 'smart home', 'tech distraction', 'technology minimalism', 'screen time'
];
const superloopUrl = 'https://www.superloop.com/internet/nbn/?referral_code=SLC-1764690';

files.forEach(file => {
  const content = fs.readFileSync(path.join(postsDir, file), 'utf-8');
  const lowerContent = content.toLowerCase();

  // Find images: frontmatter 'image: "..."' or markdown '![...](...)'
  const images = [];
  const fmMatch = content.match(/image:\s*['"]?(.*?)['"]?\n/);
  if (fmMatch) images.push(fmMatch[1].trim());

  const mdMatches = content.matchAll(/!\[.*?\]\((.*?)\)/g);
  for (const match of mdMatches) {
    images.push(match[1].trim().split(' ')[0]);
  }

  images.forEach(img => {
    if (img.includes('unsplash.com')) {
      unsplashViolations.push({ file, img });
    }
    if (!imageMap[img]) imageMap[img] = [];
    if (!imageMap[img].includes(file)) {
      imageMap[img].push(file);
    }
  });

  // Check Superloop rule
  const isTargetTopic = superloopKeywords.some(kw => lowerContent.includes(kw));
  if (isTargetTopic) {
    if (!content.includes(superloopUrl)) {
      missingSuperloop.push(file);
    }
  }
});

for (const [img, fileList] of Object.entries(imageMap)) {
  if (fileList.length > 1) {
    duplicates.push({ img, files: fileList });
  }
}

console.log("=== UNSPLASH VIOLATIONS ===");
if (unsplashViolations.length > 0) {
  unsplashViolations.forEach(v => console.log(`- ${v.file}: ${v.img}`));
} else {
  console.log("None");
}

console.log("\n=== REUSED IMAGES (DUPLICATES) ===");
if (duplicates.length > 0) {
  duplicates.forEach(d => console.log(`- ${d.img} used in: ${d.files.join(', ')}`));
} else {
  console.log("None");
}

console.log("\n=== MISSING SUPERLOOP REFERRAL (Requires Link) ===");
if (missingSuperloop.length > 0) {
  missingSuperloop.forEach(f => console.log(`- ${f}`));
} else {
  console.log("None");
}
