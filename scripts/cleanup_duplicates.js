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
            data[key] = val;
        }
    });
    return { data, content };
}

function mergePosts(pillarSlug, redundantSlug, sectionHeader) {
    const pillarPath = path.join(POSTS_DIR, `${pillarSlug}.md`);
    const redundantPath = path.join(POSTS_DIR, `${redundantSlug}.md`);

    if (!fs.existsSync(pillarPath) || !fs.existsSync(redundantPath)) {
        console.log(`⚠️ Missing files for merge: ${pillarSlug} or ${redundantSlug}`);
        return;
    }

    console.log(`🔄 Merging ${redundantSlug} into ${pillarSlug}...`);

    const pillarRaw = fs.readFileSync(pillarPath, 'utf8');
    const redundantRaw = fs.readFileSync(redundantPath, 'utf8');

    const pillarParsed = parseMarkdown(pillarRaw);
    const redundantParsed = parseMarkdown(redundantRaw);

    // Clean redundant body content (remove its title h2 if any)
    let redundantBody = redundantParsed.content.trim();
    // Remove initial H2 that duplicates the title
    redundantBody = redundantBody.replace(/^##\s+.*$/m, '').trim();

    // Append to pillar content
    const mergedContent = `${pillarParsed.content.trim()}

---

## ${sectionHeader}

${redundantBody}`;

    // Reconstruct pillar file
    const frontmatterMatch = pillarRaw.match(/^(---\r?\n[\s\S]+?\r?\n---\r?\n)/);
    if (frontmatterMatch) {
        const newFullContent = frontmatterMatch[1] + mergedContent;
        fs.writeFileSync(pillarPath, newFullContent, 'utf8');
        console.log(`✅ Merged body text successfully saved to ${pillarSlug}.md.`);
    }

    // Delete redundant file
    fs.unlinkSync(redundantPath);
    console.log(`🗑️ Deleted redundant post file: ${redundantSlug}.md.`);
}

function runCleanup() {
    // 1. Cryptocurrency Merge
    mergePosts(
        'money_crypto_investments',
        'money_cryptocurrency_risks',
        'Managing Cryptocurrency Investment Risks'
    );

    // 2. Work-Life Balance Merge
    // First merge life_work_life_balance into life_fatherhood_work_life_balance
    mergePosts(
        'life_fatherhood_work_life_balance',
        'life_work_life_balance',
        'Core Principles of Work-Life Integration'
    );
    // Then merge life_balancing_career_family into life_fatherhood_work_life_balance
    mergePosts(
        'life_fatherhood_work_life_balance',
        'life_balancing_career_family',
        'Strategies for Balancing Career and Family'
    );

    // 3. Habit Mastery Merge
    mergePosts(
        'discipline_habit_creation',
        'discipline_habit_breaking',
        'Breaking Negative Habits: The Counter-Strategy'
    );

    // Update title of discipline_habit_creation to reflect Habit Mastery
    const habitCreationPath = path.join(POSTS_DIR, 'discipline_habit_creation.md');
    if (fs.existsSync(habitCreationPath)) {
        let content = fs.readFileSync(habitCreationPath, 'utf8');
        content = content.replace(
            /title:\s*".*?"/,
            'title: "Habit Mastery: The Complete Guide to Habit Creation and Breaking"'
        );
        fs.writeFileSync(habitCreationPath, content, 'utf8');
        console.log(`📝 Updated title in discipline_habit_creation.md to "Habit Mastery...".`);
    }

    // 4. Focus & Productivity Merge
    mergePosts(
        'discipline_focus_productivity',
        'discipline_focus_techniques',
        'Advanced Focus and Attention Control Techniques'
    );

    // 5. Neuroplasticity Merge
    mergePosts(
        'discipline_neuroplasticity_enhancement',
        'discipline_neuroplasticity_growth',
        'Accelerating Neuroplasticity: Actionable Growth Protocols'
    );

    // 6. Remaining Work-Life Balance Duplicates Merge
    mergePosts(
        'life_fatherhood_work_life_balance',
        'life_balancing_success',
        'Success and Resilience in Fatherhood'
    );

    // 7. Mentorship Duplicates Merge
    mergePosts(
        'life_masculine_mentorship',
        'life_modern_mentorship',
        'Modern Mentorship Protocols'
    );
    mergePosts(
        'life_masculine_mentorship',
        'life_power_of_mentorship',
        'The Value of Mentorship'
    );

    // 8. Physical Training Duplicates Merge
    mergePosts(
        'discipline_physical_cognitive_training',
        'discipline_physical_training',
        'Physical and Cognitive Grit Protocols'
    );

    console.log(`\n🎉 Duplicate Content Cleanup complete!`);
    console.log(`👉 Please update next.config.ts with the following redirects:`);
    console.log(JSON.stringify([
        { source: '/posts/money_cryptocurrency_risks', destination: '/posts/money_crypto_investments', permanent: true },
        { source: '/posts/life_work_life_balance', destination: '/posts/life_fatherhood_work_life_balance', permanent: true },
        { source: '/posts/life_balancing_career_family', destination: '/posts/life_fatherhood_work_life_balance', permanent: true },
        { source: '/posts/life_balancing_success', destination: '/posts/life_fatherhood_work_life_balance', permanent: true },
        { source: '/posts/discipline_habit_breaking', destination: '/posts/discipline_habit_creation', permanent: true },
        { source: '/posts/discipline_focus_techniques', destination: '/posts/discipline_focus_productivity', permanent: true },
        { source: '/posts/discipline_neuroplasticity_growth', destination: '/posts/discipline_neuroplasticity_enhancement', permanent: true },
        { source: '/posts/life_modern_mentorship', destination: '/posts/life_masculine_mentorship', permanent: true },
        { source: '/posts/life_power_of_mentorship', destination: '/posts/life_masculine_mentorship', permanent: true },
        { source: '/posts/discipline_physical_training', destination: '/posts/discipline_physical_cognitive_training', permanent: true }
    ], null, 2));
}

if (require.main === module) {
    runCleanup();
}
