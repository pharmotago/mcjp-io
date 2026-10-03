const fs = require('fs');
const path = require('path');

const ROOT_DIR = 'C:\\Antigravity\\mcjp-io';
const POSTS_DIR = path.join(ROOT_DIR, 'content', 'posts');

const PAYROLLER_LINK = 'https://app.payroller.com.au/signup?referredByFriend=pharmotago';
const PAYROLLER_MARKDOWN = `For Australian founders, solo directors, and contractors needing seamless, 100% ATO STP Phase 2 compliant payroll with zero monthly software subscription fees, we run and recommend signing up for [Payroller](${PAYROLLER_LINK}).`;

const TRIGGER_KEYWORDS = [
    'money',
    'wealth',
    'business',
    'side hustle',
    'solopreneur',
    'freelance',
    'tax',
    'payroll',
    'salary',
    'cashflow',
    'leverage',
    'financial independence',
    'contractor',
    'director',
    'wages',
    'accounting'
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

function shouldInjectPayroller(parsed) {
    // 1. Skip if Payroller referral link already exists
    if (parsed.content.includes('payroller.com.au') || parsed.content.includes('pharmotago')) {
        return false;
    }

    // 2. Check metadata category
    if (parsed.data.category && parsed.data.category.toLowerCase() === 'money') {
        return true;
    }

    // 3. Check metadata keywords
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

    // 4. Scan body content for triggering keywords
    const contentLower = parsed.content.toLowerCase();
    const hasBodyMatch = TRIGGER_KEYWORDS.some(trigger => contentLower.includes(trigger));
    
    return hasBodyMatch;
}

function injectPayrollerIntoContent(content) {
    const paragraphs = content.split(/\r?\n\r?\n/);
    let injected = false;

    // Find the best paragraph near the conclusion to append the referral.
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
            p.length > 100
        ) {
            paragraphs[i] = p + ' ' + PAYROLLER_MARKDOWN;
            injected = true;
            break;
        }
    }

    // Fallback: If no good paragraph found, append to the very end
    if (!injected) {
        content = content.trim() + '\n\n' + PAYROLLER_MARKDOWN + '\n';
    } else {
        content = paragraphs.join('\n\n');
    }

    return content;
}

function runPayrollerInjection() {
    if (!fs.existsSync(POSTS_DIR)) {
        console.error(`❌ Posts directory not found at: ${POSTS_DIR}`);
        return;
    }

    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
    let matchedCount = 0;
    let injectedCount = 0;

    console.log(`🔍 Scanning ${files.length} posts for Payroller referral opportunities...`);

    for (const file of files) {
        const fullPath = path.join(POSTS_DIR, file);
        const fileContent = fs.readFileSync(fullPath, 'utf8');
        const parsed = parseMarkdown(fileContent);

        if (shouldInjectPayroller(parsed)) {
            matchedCount++;
            const updatedBody = injectPayrollerIntoContent(parsed.content);
            
            // Reconstruct markdown
            const frontmatterMatch = fileContent.match(/^(---\r?\n[\s\S]+?\r?\n---\r?\n)/);
            if (frontmatterMatch) {
                const newFullContent = frontmatterMatch[1] + updatedBody;
                fs.writeFileSync(fullPath, newFullContent, 'utf8');
                injectedCount++;
                console.log(`🔗 Injected Payroller Referral into: ${file}`);
            }
        }
    }

    console.log(`\n🎉 Payroller link injection complete!`);
    console.log(`   - Matched posts: ${matchedCount}`);
    console.log(`   - Injected posts: ${injectedCount}`);
}

if (require.main === module) {
    runPayrollerInjection();
}

module.exports = {
    shouldInjectPayroller,
    injectPayrollerIntoContent
};
