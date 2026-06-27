const fs = require('fs');
const path = require('path');

const ROOT_DIR = 'C:\\Antigravity\\mcjp-io';
const POSTS_DIR = path.join(ROOT_DIR, 'content', 'posts');

const bookFiles = [
    'book_90_day_habit_system.md',
    'book_90_day_longevity_protocol_log.md',
    'book_hybrid_performance_log.md',
    'book_let_them_let_me.md',
    'book_low_friction_adhd_planner.md',
    'book_unburden_your_brain.md'
];

const TOP_DISCLAIMER = `> Disclosure: This post contains affiliate links. If you purchase through our links, we may earn a small commission at no extra cost to you.`;

function updateDisclaimers() {
    let modified = 0;

    for (const file of bookFiles) {
        const fullPath = path.join(POSTS_DIR, file);
        if (!fs.existsSync(fullPath)) {
            console.log(`⚠️ File not found: ${file}`);
            continue;
        }

        let content = fs.readFileSync(fullPath, 'utf8');

        // 1. Remove old bottom disclaimer if present
        content = content.replace(/\r?\n\r?\n---\r?\n\* \*\*Affiliate Disclosure:\*\*[\s\S]*$/, '');
        content = content.replace(/\r?\n\r?\n---\r?\n> \*\*Legal Disclaimer:\*\*[\s\S]*$/, ''); // Make sure we don't accidentally remove legal disclaimer if it's there

        // 2. Parse frontmatter
        const parts = content.split(/^---\r?\n/m);
        if (parts.length < 3) {
            console.log(`⚠️ Invalid format in: ${file}`);
            continue;
        }

        const frontmatter = parts[1];
        let body = parts.slice(2).join('---\n').trim();

        // 3. Remove existing top disclaimer if present to prevent double insertion
        body = body.replace(/^> Disclosure: This post contains affiliate links[\s\S]*?\r?\n\r?\n/, '');

        // 4. Reconstruct with top disclaimer
        const newContent = `---\n${frontmatter}---\n\n${TOP_DISCLAIMER}\n\n${body}\n`;

        fs.writeFileSync(fullPath, newContent, 'utf8');
        modified++;
        console.log(`✅ Updated FTC disclaimer at top of: ${file}`);
    }

    console.log(`\n🎉 Top disclaimers updated in ${modified} files.`);
}

if (require.main === module) {
    updateDisclaimers();
}
