const fs = require('fs');
const path = require('path');

const ROOT_DIR = 'C:\\Antigravity\\mcjp-io';
const IMAGES_DIR = path.join(ROOT_DIR, 'public', 'images');
const POSTS_DIR = path.join(ROOT_DIR, 'content', 'posts');
const TOPICS_FILE = path.join(ROOT_DIR, 'content', 'topics.json');

// Beautiful, modern dark-themed HSL gradients
const GRADIENTS = [
    { start: 'hsl(210, 80%, 20%)', end: 'hsl(210, 90%, 50%)' }, // Blue
    { start: 'hsl(140, 70%, 20%)', end: 'hsl(140, 80%, 45%)' }, // Green
    { start: 'hsl(270, 70%, 25%)', end: 'hsl(270, 80%, 55%)' }, // Purple
    { start: 'hsl(350, 75%, 30%)', end: 'hsl(350, 85%, 60%)' }, // Red/Pink
    { start: 'hsl(30, 80%, 25%)', end: 'hsl(30, 90%, 50%)' },  // Orange
];

function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

function generateSvgContent(title, subtitle, type) {
    // Pick deterministic gradient based on title length
    const gradient = GRADIENTS[title.length % GRADIENTS.length];
    
    // SVG Dimensions
    const width = 1200;
    const height = 630;
    
    // Visual text
    const displayTitle = escapeXml(title);
    const displaySubtitle = escapeXml(subtitle.toUpperCase() + (type === 'focus' ? ' | FOCUS' : ' | THEME'));

    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${gradient.start};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${gradient.end};stop-opacity:1" />
    </linearGradient>
    <filter id="glass" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="15" result="blur" />
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="glow" />
      <feBlend in="SourceGraphic" in2="glow" mode="normal" />
    </filter>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="100%" height="100%" fill="url(#grad1)" />
  
  <!-- Subtle Glow -->
  <circle cx="50%" cy="50%" r="600" fill="url(#glow)" />
  
  <!-- Glassmorphism Card -->
  <rect x="100" y="115" width="1000" height="400" rx="20" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" stroke-width="2" filter="url(#glass)"/>
  
  <!-- Subtitle / Category -->
  <text x="600" y="240" font-family="-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="28" font-weight="600" fill="#a0aec0" letter-spacing="4" text-anchor="middle">${displaySubtitle}</text>
  
  <!-- Main Title -->
  <!-- We wrap it manually or just make it big if it fits. For SVG, text wrapping needs tspan. -->
  <text x="600" y="320" font-family="-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="52" font-weight="800" fill="#ffffff" text-anchor="middle">${displayTitle.length > 35 ? displayTitle.substring(0, 35) + '...' : displayTitle}</text>
  
  <!-- Brand logo/name at bottom -->
  <text x="600" y="440" font-family="-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="24" font-weight="500" fill="rgba(255,255,255,0.6)" text-anchor="middle">MCJP.IO | HIGH-PERFORMANCE LIFESTYLE</text>
</svg>`;
}

function ensureDirectoryExistence(filePath) {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    fs.mkdirSync(dirname, { recursive: true });
}

function generateMissingImages() {
    console.log("🔍 Scanning for missing blog images...");
    
    if (!fs.existsSync(TOPICS_FILE)) {
        console.error("topics.json not found!");
        return;
    }

    const topics = JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf8'));
    const topicMap = {};
    for (const t of topics) {
        topicMap[t.id] = t;
    }

    const posts = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
    let generatedCount = 0;

    for (const post of posts) {
        const id = post.replace('.md', '');
        const topicInfo = topicMap[id] || { topic: id.replace(/_/g, ' '), category: 'Insight' };

        const types = ['focus', 'theme'];
        for (const type of types) {
            const svgPath = path.join(IMAGES_DIR, `${id}_${type}.svg`);
            const pngPath = path.join(IMAGES_DIR, `${id}_${type}.png`);
            const jpgPath = path.join(IMAGES_DIR, `${id}_${type}.jpg`);

            // If ANY extension exists, don't overwrite if not necessary, 
            // BUT wait, we want to enforce SVG for missing PNGs.
            if (!fs.existsSync(svgPath) && !fs.existsSync(pngPath) && !fs.existsSync(jpgPath)) {
                ensureDirectoryExistence(svgPath);
                const svgContent = generateSvgContent(topicInfo.topic, topicInfo.category, type);
                fs.writeFileSync(svgPath, svgContent, 'utf8');
                console.log(`✨ Generated: ${svgPath}`);
                generatedCount++;
            }
        }
    }

    console.log(`✅ Success! Generated ${generatedCount} missing SVG images.`);
}

function generateForId(id, title, category) {
    const types = ['focus', 'theme'];
    for (const type of types) {
        const svgPath = path.join(IMAGES_DIR, `${id}_${type}.svg`);
        ensureDirectoryExistence(svgPath);
        const svgContent = generateSvgContent(title, category, type);
        fs.writeFileSync(svgPath, svgContent, 'utf8');
        console.log(`✨ Generated: ${svgPath}`);
    }
}

module.exports = { generateMissingImages, generateForId };

if (require.main === module) {
    generateMissingImages();
}
