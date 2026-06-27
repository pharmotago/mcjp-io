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

const DISCLAIMER = `\n\n---
* **Affiliate Disclosure:** This post contains affiliate links. If you purchase a book through our links, we may earn a small commission at no extra cost to you. We only recommend books we have genuinely reviewed and believe provide real value.`;

function addDisclaimer() {
    let modified = 0;
    for (const file of bookFiles) {
        const fullPath = path.join(POSTS_DIR, file);
        if (!fs.existsSync(fullPath)) {
            console.log(`⚠️ File not found: ${file}`);
            continue;
        }

        let content = fs.readFileSync(fullPath, 'utf8');
        // Check if disclaimer already exists
        if (content.includes('Affiliate Disclosure:')) {
            console.log(`ℹ️ Disclaimer already exists in: ${file}`);
            continue;
        }

        content += DISCLAIMER;
        fs.writeFileSync(fullPath, content, 'utf8');
        modified++;
        console.log(`✅ Appended FTC disclosure to: ${file}`);
    }
    console.log(`\n🎉 Disclaimer injection complete! Modified ${modified} files.`);
}

if (require.main === module) {
    addDisclaimer();
}
