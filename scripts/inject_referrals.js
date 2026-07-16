const fs = require('fs');
const path = require('path');

const ROOT_DIR = 'C:\\Antigravity\\mcjp-io';
const POSTS_DIR = path.join(ROOT_DIR, 'content', 'posts');

// Superloop referral link template
const REFERRAL_LINK = 'https://www.superloop.com/internet/nbn/?referral_code=SLC-1764690';
const REFERRAL_MARKDOWN = `For a seamless and high-speed home office connection, we recommend signing up for [Superloop NBN Broadband](${REFERRAL_LINK}) to save on your plan fee.`;

// Keywords that trigger referral injection
const TRIGGER_KEYWORDS = [
    'home office',
    'remote work',
    'productivity',
    'digital detox',
    'technology',
    'smart home',
    'work from home',
    'solopreneur',
    'side hustle',
    'focus hacks',
    'deep work'
];

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

function shouldInjectReferral(parsed) {
    // 1. Enforce strict single-injection: Skip if Superloop link already exists
    if (parsed.content.includes('superloop.com') || parsed.content.includes('SLC-1764690')) {
        return false;
    }

    // 2. Check metadata keywords
    if (parsed.data.keywords) {
        let kwArray = [];
        try {
            if (parsed.data.keywords.startsWith('[') && parsed.data.keywords.endsWith(']')) {
                kwArray = JSON.parse(parsed.data.keywords.replace(/'/g, '"'));
            } else {
                kwArray = parsed.data.keywords.split(',').map(k => k.trim());
            }
        } catch (e) {
            kwArray = [parsed.data.keywords];
        }

        const hasMatchingMetadata = kwArray.some(kw => 
            TRIGGER_KEYWORDS.some(trigger => kw.toLowerCase().includes(trigger))
        );
        if (hasMatchingMetadata) return true;
    }

    // 3. Fallback: Scan body content for triggering keywords
    const contentLower = parsed.content.toLowerCase();
    const hasBodyMatch = TRIGGER_KEYWORDS.some(trigger => contentLower.includes(trigger));
    
    return hasBodyMatch;
}

function injectReferralIntoContent(content) {
    const paragraphs = content.split(/\r?\n\r?\n/);
    let injected = false;

    // Find the best paragraph to append the referral.
    // Ideally a middle/concluding paragraph that is plain text (no lists, headings, code blocks).
    for (let i = paragraphs.length - 1; i >= 0; i--) {
        const p = paragraphs[i].trim();
        // Skip headings, lists, quotes, code blocks, images
        if (
            p &&
            !p.startsWith('#') &&
            !p.startsWith('-') &&
            !p.startsWith('*') &&
            !p.startsWith('>') &&
            !p.startsWith('`') &&
            !p.includes('![') &&
            p.length > 100 // Prefer reasonably sized paragraphs
        ) {
            // Append naturally with spacing
            paragraphs[i] = p + ' ' + REFERRAL_MARKDOWN;
            injected = true;
            break;
        }
    }

    // Fallback: If no good paragraph found, append to the very end
    if (!injected) {
        content = content.trim() + '\n\n' + REFERRAL_MARKDOWN + '\n';
    } else {
        content = paragraphs.join('\n\n');
    }

    return content;
}

function runReferralInjection() {
    if (!fs.existsSync(POSTS_DIR)) {
        console.error(`❌ Posts directory not found at: ${POSTS_DIR}`);
        return;
    }

    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
    let matchedCount = 0;
    let injectedCount = 0;

    console.log(`🔍 Scanning ${files.length} posts for organic referral opportunities...`);

    for (const file of files) {
        const fullPath = path.join(POSTS_DIR, file);
        const fileContent = fs.readFileSync(fullPath, 'utf8');
        const parsed = parseMarkdown(fileContent);

        if (shouldInjectReferral(parsed)) {
            matchedCount++;
            const updatedBody = injectReferralIntoContent(parsed.content);
            
            // Reconstruct markdown
            const frontmatterMatch = fileContent.match(/^(---\r?\n[\s\S]+?\r?\n---\r?\n)/);
            if (frontmatterMatch) {
                const newFullContent = frontmatterMatch[1] + updatedBody;
                fs.writeFileSync(fullPath, newFullContent, 'utf8');
                injectedCount++;
                console.log(`🔗 Injected Superloop Referral into: ${file}`);
            }
        }
    }

    console.log(`\n🎉 Referral link injection complete!`);
    console.log(`   - Matched posts: ${matchedCount}`);
    console.log(`   - Injected posts: ${injectedCount}`);
}

if (require.main === module) {
    runReferralInjection();
}

module.exports = {
    shouldInjectReferral,
    injectReferralIntoContent
};
