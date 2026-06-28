const fs = require('fs');
const path = require('path');

const ROOT_DIR = 'C:\\Antigravity\\mcjp-io';
const POSTS_DIR = path.join(ROOT_DIR, 'content', 'posts');

const duplicates = {
    'money_cryptocurrency_risks': 'https://blog.mcjp.io/posts/money_crypto_investments',
    'life_work_life_balance': 'https://blog.mcjp.io/posts/life_fatherhood_work_life_balance',
    'life_balancing_success': 'https://blog.mcjp.io/posts/life_fatherhood_work_life_balance',
    'discipline_neuroplasticity_growth': 'https://blog.mcjp.io/posts/discipline_neuroplasticity_enhancement',
    'life_modern_mentorship': 'https://blog.mcjp.io/posts/life_masculine_mentorship',
    'life_power_of_mentorship': 'https://blog.mcjp.io/posts/life_masculine_mentorship',
    'discipline_physical_training': 'https://blog.mcjp.io/posts/discipline_physical_cognitive_training',
    'life_balancing_career_family': 'https://blog.mcjp.io/posts/life_fatherhood_work_life_balance'
};

function parseMarkdown(fileContent) {
    const match = fileContent.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) return { yamlLines: [], content: fileContent };
    return { yamlLines: match[1].split('\n'), content: match[2] };
}

function run() {
    for (const [slug, canonicalUrl] of Object.entries(duplicates)) {
        const filePath = path.join(POSTS_DIR, `${slug}.md`);
        let fileContent = '';

        if (!fs.existsSync(filePath)) {
            console.log(`🆕 Creating missing duplicate file: ${slug}.md`);
            fileContent = `---
title: "Balancing Career and Family"
date: "2026-06-28"
category: "Life"
description: "A guide to achieving harmony and balance between your career commitments and family duties."
keywords: ["career", "family", "work life balance"]
---
This article has been merged into our master guide.
Please read our complete guide here: [Sovereign Work-Life Balance](/posts/life_fatherhood_work_life_balance).
`;
            fs.writeFileSync(filePath, fileContent, 'utf8');
        } else {
            fileContent = fs.readFileSync(filePath, 'utf8');
        }

        const parsed = parseMarkdown(fileContent);
        let hasCanonical = false;
        const newYamlLines = parsed.yamlLines.map(line => {
            const parts = line.split(':');
            if (parts[0].trim() === 'canonical') {
                hasCanonical = true;
                return `canonical: "${canonicalUrl}"`;
            }
            return line;
        });

        if (!hasCanonical) {
            newYamlLines.push(`canonical: "${canonicalUrl}"`);
        }

        const newYaml = newYamlLines.join('\n');
        const newFullContent = `---\n${newYaml}\n---\n${parsed.content}`;
        fs.writeFileSync(filePath, newFullContent, 'utf8');
        console.log(`🔗 Set canonical URL for ${slug}.md ➔ ${canonicalUrl}`);
    }
}

run();
