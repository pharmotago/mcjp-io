const fs = require('fs');
const path = require('path');

const ROOT_DIR = 'C:\\Antigravity\\mcjp-io';
const POSTS_DIR = path.join(ROOT_DIR, 'content', 'posts');

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

function getNextPublishDate(currentDateStr) {
    const d = new Date(currentDateStr);
    const day = d.getDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
    if (day === 1) { // Monday -> Wednesday
        d.setDate(d.getDate() + 2);
    } else if (day === 3) { // Wednesday -> Friday
        d.setDate(d.getDate() + 2);
    } else if (day === 5) { // Friday -> Monday
        d.setDate(d.getDate() + 3);
    } else if (day === 4) { // Thursday -> Friday
        d.setDate(d.getDate() + 1);
    } else {
        // Fallback: move to next day
        d.setDate(d.getDate() + 1);
    }
    return d.toISOString().split('T')[0];
}

const top10Slugs = new Set([
    'book_90_day_habit_system',
    'money_financial_independence_blueprint',
    'money_side_hustle',
    'discipline_dopamine_control',
    'discipline_flow_state_optimization',
    'money_ai_agency_scaling',
    'money_micro_acquisitions',
    'discipline_stress_inoculation',
    'money_passive_income_streams',
    'personal_growth_discipline'
]);

function run() {
    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
    const todayStr = '2026-06-28';

    const postsToReschedule = [];
    for (const file of files) {
        const id = file.replace(/\.md$/, '');
        if (top10Slugs.has(id)) {
            console.log(`ℹ️ Keeping top 10 post live: ${file}`);
            continue;
        }

        const fullPath = path.join(POSTS_DIR, file);
        const fileContent = fs.readFileSync(fullPath, 'utf8');
        const parsed = parseMarkdown(fileContent);

        postsToReschedule.push({
            file,
            fullPath,
            parsed,
            date: parsed.data.date || ''
        });
    }

    // Sort posts to reschedule by their current date
    postsToReschedule.sort((a, b) => a.date.localeCompare(b.date));

    console.log(`🔍 Found ${postsToReschedule.length} posts to reschedule.`);

    let currentPublishDate = '2026-07-02'; // Starts on Thursday July 2, 2026 as requested

    postsToReschedule.forEach((post, index) => {
        const newYamlLines = post.parsed.yamlLines.map(line => {
            const parts = line.split(':');
            const key = parts[0].trim();
            if (key === 'date') {
                return `date: "${currentPublishDate}"`;
            }
            if (key === 'draft') {
                return 'draft: false'; // Activate scheduled posts
            }
            return line;
        });

        // Add author if missing
        let hasAuthor = post.parsed.yamlLines.some(line => line.split(':')[0].trim() === 'author');
        if (!hasAuthor) {
            newYamlLines.push('author: "Peter Kim"');
        }

        // Add lastUpdated
        let hasLastUpdated = post.parsed.yamlLines.some(line => line.split(':')[0].trim() === 'lastUpdated');
        if (!hasLastUpdated) {
            newYamlLines.push(`lastUpdated: "${currentPublishDate}"`);
        }

        const newYaml = newYamlLines.join('\n');
        const newFullContent = `---\n${newYaml}\n---\n${post.parsed.content}`;
        fs.writeFileSync(post.fullPath, newFullContent, 'utf8');
        console.log(`📅 Rescheduled ${post.file} to ${currentPublishDate}`);

        // Get date for the next post
        currentPublishDate = getNextPublishDate(currentPublishDate);
    });

    console.log(`🎉 Rescheduled all future/draft posts starting from 2026-07-02.`);
}

run();
