const fs = require('fs');
const path = require('path');

const ROOT_DIR = 'C:\\Antigravity\\mcjp-io';
const POSTS_DIR = path.join(ROOT_DIR, 'content', 'posts');
const OG_DIR = path.join(ROOT_DIR, 'public', 'og');

const ogImages = {
    'book_90_day_habit_system': '/og/90-day-habit-system.png',
    'money_financial_independence_blueprint': '/og/financial-independence.png',
    'money_side_hustle': '/og/ai-one-person-business.png',
    'discipline_dopamine_control': '/og/dopamine-control.png',
    'discipline_flow_state_optimization': '/og/flow-state.png',
    'money_ai_agency_scaling': '/og/ai-agency-scaling.png',
    'money_micro_acquisitions': '/og/micro-acquisitions.png',
    'discipline_stress_inoculation': '/og/stress-inoculation.png',
    'money_passive_income_streams': '/og/passive-income.png',
    'personal_growth_discipline': '/og/dopamine-shield.png'
};

function parseMarkdown(fileContent) {
    const match = fileContent.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) return { yamlLines: [], content: fileContent };
    return { yamlLines: match[1].split('\n'), content: match[2] };
}

function run() {
    // Create public/og directory if it doesn't exist
    if (!fs.existsSync(OG_DIR)) {
        fs.mkdirSync(OG_DIR, { recursive: true });
        console.log(`📁 Created directory: ${OG_DIR}`);
    }

    for (const [slug, ogPath] of Object.entries(ogImages)) {
        const filePath = path.join(POSTS_DIR, `${slug}.md`);
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️ Missing file: ${slug}.md`);
            continue;
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');
        const parsed = parseMarkdown(fileContent);

        let hasOgImage = false;
        const newYamlLines = parsed.yamlLines.map(line => {
            const parts = line.split(':');
            const key = parts[0].trim();
            if (key === 'ogImage' || key === 'og:image') {
                hasOgImage = true;
                return `ogImage: "${ogPath}"`;
            }
            return line;
        });

        if (!hasOgImage) {
            newYamlLines.push(`ogImage: "${ogPath}"`);
        }

        const newYaml = newYamlLines.join('\n');
        const newFullContent = `---\n${newYaml}\n---\n${parsed.content}`;
        fs.writeFileSync(filePath, newFullContent, 'utf8');
        console.log(`🖼️ Set ogImage for ${slug}.md ➔ ${ogPath}`);
    }
}

run();
