const fs = require('fs');
const path = require('path');

const ROOT_DIR = 'C:\\Antigravity\\mcjp-io';
const POSTS_DIR = path.join(ROOT_DIR, 'content', 'posts');
const TBPOYL_URL = 'https://tbpoyl.vercel.app';

function parseMarkdown(fileContent) {
    const match = fileContent.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) return { yamlLines: [], data: {}, content: fileContent };
    const yaml = match[1];
    const content = match[2];
    const data = {};
    const yamlLines = yaml.split('\n');
    yamlLines.forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            let val = parts.slice(1).join(':').trim();
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.slice(1, -1);
            }
            data[key] = val;
        }
    });
    return { yamlLines, data, content };
}

function getRecommendation(category, title) {
    const cat = (category || '').toLowerCase();
    const t = (title || '').toLowerCase();

    if (t.includes('glucose') || t.includes('cgm') || t.includes('health') || t.includes('sleep') || t.includes('hrv')) {
        return `For structured metabolic tracking and healthspan optimization protocols, explore the complete guide collection at [TBPOYL eBooks](${TBPOYL_URL}).`;
    }
    if (cat.includes('discipline') || t.includes('habit') || t.includes('focus') || t.includes('dopamine')) {
        return `For actionable worksheets and printable trackers to lock in daily execution, claim your copy of *The 90-Day Habit System* at [TBPOYL](${TBPOYL_URL}).`;
    }
    if (cat.includes('money') || t.includes('wealth') || t.includes('asset') || t.includes('ai')) {
        return `For executive blueprints on AI business automation and cognitive leverage, explore the 9-Volume Executive Vault at [TBPOYL](${TBPOYL_URL}).`;
    }
    return `To master executive discipline, physical resilience, and antifragile thinking, discover curated field manuals at [TBPOYL eBooks](${TBPOYL_URL}).`;
}

function run() {
    if (!fs.existsSync(POSTS_DIR)) {
        console.error('Posts directory not found:', POSTS_DIR);
        return;
    }

    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
    let injectedCount = 0;
    let skippedCount = 0;

    files.forEach(file => {
        const filePath = path.join(POSTS_DIR, file);
        const rawContent = fs.readFileSync(filePath, 'utf8');
        const parsed = parseMarkdown(rawContent);

        // Idempotency: Skip if already linked to TBPOYL
        if (parsed.content.includes('tbpoyl.vercel.app')) {
            skippedCount++;
            return;
        }

        const recommendation = getRecommendation(parsed.data.category, parsed.data.title || file);
        const paragraphs = parsed.content.split(/\n\s*\n/);

        // Find best paragraph towards the end of article (> 100 chars, not header or quote)
        let inserted = false;
        for (let i = paragraphs.length - 1; i >= Math.floor(paragraphs.length / 2); i--) {
            const p = paragraphs[i].trim();
            if (p.length > 100 && !p.startsWith('#') && !p.startsWith('>') && !p.startsWith('-') && !p.startsWith('```')) {
                paragraphs[i] = `${p}\n\n> 💎 **Recommended Resource**: ${recommendation}`;
                inserted = true;
                break;
            }
        }

        if (!inserted) {
            paragraphs.push(`> 💎 **Recommended Resource**: ${recommendation}`);
        }

        const newContent = `---\n${parsed.yamlLines.join('\n')}\n---\n${paragraphs.join('\n\n')}`;
        fs.writeFileSync(filePath, newContent, 'utf8');
        injectedCount++;
    });

    console.log(`\n✅ TBPOYL Cross-Promotion Injection Complete:`);
    console.log(`   - Injected into ${injectedCount} articles`);
    console.log(`   - Skipped ${skippedCount} already linked articles`);
}

run();
