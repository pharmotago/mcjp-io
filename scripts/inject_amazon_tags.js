const fs = require('fs');
const path = require('path');

const ROOT_DIR = 'C:\\Antigravity\\mcjp-io';
const POSTS_DIR = path.join(ROOT_DIR, 'content', 'posts');
const AFFILIATE_TAG = 'tag=mcjpio-20';

function injectAmazonTags() {
    if (!fs.existsSync(POSTS_DIR)) {
        console.error("Posts directory not found.");
        return;
    }

    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
    let modifiedCount = 0;

    for (const file of files) {
        const fullPath = path.join(POSTS_DIR, file);
        let content = fs.readFileSync(fullPath, 'utf8');

        // Regex to match Amazon product links like:
        // https://www.amazon.com/dp/B0XXXXXXXX or similar
        // and ensure we don't double-append tag if it already exists
        const amazonRegex = /https:\/\/www\.amazon\.com\/dp\/[A-Z0-9]+(?!\?tag=|\&tag=)/g;
        
        let matches = content.match(amazonRegex);
        if (matches) {
            console.log(`🔍 Found Amazon links in ${file}:`, matches);
            
            // Perform replacements
            let newContent = content;
            for (const match of matches) {
                const separator = match.includes('?') ? '&' : '?';
                const replacement = `${match}${separator}${AFFILIATE_TAG}`;
                newContent = newContent.replace(match, replacement);
            }
            
            fs.writeFileSync(fullPath, newContent, 'utf8');
            modifiedCount++;
            console.log(`✅ Injected affiliate tag into: ${file}`);
        }
    }

    console.log(`\n🎉 Amazon Affiliate Injection Complete! Modified ${modifiedCount} files.`);
}

if (require.main === module) {
    injectAmazonTags();
}
