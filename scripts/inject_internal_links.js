const fs = require('fs');
const path = require('path');

const ROOT_DIR = 'C:\\Antigravity\\mcjp-io';
const POSTS_DIR = path.join(ROOT_DIR, 'content', 'posts');

// Helper to parse YAML frontmatter
function parseMarkdown(fileContent) {
    const match = fileContent.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) return { data: {}, content: fileContent };
    const yaml = match[1];
    const content = match[2];
    const data = {};
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

// Build index of all posts
function buildPostIndex() {
    if (!fs.existsSync(POSTS_DIR)) return [];
    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
    const index = [];

    for (const file of files) {
        const id = file.replace(/\.md$/, '');
        const fullPath = path.join(POSTS_DIR, file);
        const fileContent = fs.readFileSync(fullPath, 'utf8');
        const { data } = parseMarkdown(fileContent);
        
        // Collect search phrases: title, and keywords (enforcing 2+ words to avoid spammy single-word links)
        const phrases = new Set();
        const addPhraseIfValid = (p) => {
            if (p && p.trim().split(/\s+/).length >= 2) {
                phrases.add(p.toLowerCase().trim());
            }
        };

        if (data.title) {
            addPhraseIfValid(data.title);
            const cleanedTitle = data.title.replace(/[:&|?]/g, '');
            addPhraseIfValid(cleanedTitle);
        }
        if (data.keywords && Array.isArray(data.keywords)) {
            data.keywords.forEach(kw => {
                addPhraseIfValid(kw);
            });
        }

        index.push({
            id,
            title: data.title,
            phrases: Array.from(phrases).sort((a, b) => b.length - a.length), // Match longer phrases first
        });
    }

    return index;
}

// Main function to inject links into a single article content
function injectLinksIntoContent(slug, content, postIndex) {
    const lines = content.split('\n');
    let linkCount = 0;
    const maxLinks = 3;
    const linkedSlugs = new Set([slug]); // Don't link to self

    const updatedLines = lines.map(line => {
        const trimmed = line.trim();
        // Skip formatting lines: headings, lists, blockquotes, code, images, or if it already has links
        if (
            trimmed.startsWith('#') ||
            trimmed.startsWith('-') ||
            trimmed.startsWith('*') ||
            trimmed.startsWith('>') ||
            trimmed.startsWith('`') ||
            trimmed.includes('![') ||
            trimmed.includes('[') ||
            linkCount >= maxLinks
        ) {
            return line;
        }

        let tempLine = line;
        // Try to match phrases from other posts
        for (const target of postIndex) {
            if (linkedSlugs.has(target.id) || linkCount >= maxLinks) continue;

            for (const phrase of target.phrases) {
                // Semantic / Plural word boundary matching, case-insensitive
                const pattern = buildPluralRegexPattern(phrase);
                const regex = new RegExp(`\\b(${pattern})\\b`, 'i');
                const match = tempLine.match(regex);
                if (match) {
                    const originalText = match[1];
                    // Replace first occurrence with a temporary token
                    tempLine = tempLine.replace(regex, `___LINK_TOKEN:${target.id}:${originalText}___`);
                    linkedSlugs.add(target.id);
                    linkCount++;
                    break; // Move to next target post once we linked to this target
                }
            }
        }

        // Restore all tokens to real markdown links
        const tokenRegex = /___LINK_TOKEN:(.*?):(.*?)___/g;
        tempLine = tempLine.replace(tokenRegex, '[$2](/posts/$1)');

        return tempLine;
    });

    return {
        content: updatedLines.join('\n'),
        linksAdded: linkCount,
    };
}

function buildPluralRegexPattern(phrase) {
    const escaped = escapeRegExp(phrase);
    // If it ends in ss, sh, ch, x, z, allow optional 'es' (e.g., business -> businesses)
    if (/(ss|x|z|ch|sh)$/i.test(phrase)) {
        return `${escaped}(es)?`;
    }
    // If it ends in y, allow 'y' or 'ies' (e.g., masculinity -> masculinities, duty -> duties)
    if (phrase.endsWith('y')) {
        const base = escaped.slice(0, -1);
        return `${base}(y|ies)`;
    }
    // If it already ends in s (but not ss), it's probably already plural (e.g., focus hacks)
    if (phrase.endsWith('s')) {
        return escaped;
    }
    // Default: optionally match 's' at the end (e.g., solopreneur -> solopreneurs)
    return `${escaped}s?`;
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function runInternalLinking() {
    console.log("🔍 Building posts index...");
    const postIndex = buildPostIndex();
    console.log(`📊 Indexed ${postIndex.length} posts for internal linking.`);

    let totalLinksAdded = 0;
    let modifiedFiles = 0;

    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
    for (const file of files) {
        const id = file.replace(/\.md$/, '');
        const fullPath = path.join(POSTS_DIR, file);
        const fileContent = fs.readFileSync(fullPath, 'utf8');
        const parsed = parseMarkdown(fileContent);

        // Strip existing single-word links (e.g. [discipline](/posts/...)) before injecting new ones
        let cleanBody = parsed.content.replace(/\[([^\]\s]+)\]\(([^)]+)\)/g, '$1');
        
        const result = injectLinksIntoContent(id, cleanBody, postIndex);
        
        // Reconstruct frontmatter and body if content changed
        if (result.content !== parsed.content) {
            const frontmatterMatch = fileContent.match(/^(---\r?\n[\s\S]+?\r?\n---\r?\n)/);
            if (frontmatterMatch) {
                const newFullContent = frontmatterMatch[1] + result.content;
                fs.writeFileSync(fullPath, newFullContent, 'utf8');
                totalLinksAdded += result.linksAdded;
                modifiedFiles++;
                console.log(`✅ Cleaned & Updated links in: ${file} (New links: ${result.linksAdded})`);
            }
        }
    }

    console.log(`\n🎉 Internal linking run complete!`);
    console.log(`   - Modified files: ${modifiedFiles}`);
    console.log(`   - Total links added: ${totalLinksAdded}`);
}

if (require.main === module) {
    runInternalLinking();
}

module.exports = {
    injectLinksIntoContent,
    buildPostIndex,
};
