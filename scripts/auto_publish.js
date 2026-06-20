const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const gemini = require('../../scripts/gemini_client');
const { generateArticle } = require('./generate_blog');

const ROOT_DIR = 'C:\\Antigravity\\mcjp-io';
const TOPICS_FILE = path.join(ROOT_DIR, 'content', 'topics.json');
const POSTS_DIR = path.join(ROOT_DIR, 'content', 'posts');

async function checkAndRefillTopics() {
    console.log("🧬 Scanning topics database...");
    let topics = [];
    if (fs.existsSync(TOPICS_FILE)) {
        topics = JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf8'));
    }

    // Count unwritten topics
    const unwritten = topics.filter(t => !fs.existsSync(path.join(POSTS_DIR, `${t.id}.md`)));
    console.log(`📊 Current Status: ${topics.length} total topics, ${unwritten.length} unwritten.`);

    if (unwritten.length < 3) {
        console.log("⚠️ Too few unwritten topics. Initiating AI Topic Generation Engine...");
        
        const existingIdsList = topics.map(t => t.id).join(', ');
        const prompt = `Generate a list of 6 new, unique blog article topics for a masculine success and wealth creation site called "MCJP.io".
Do NOT generate any of the following already existing topic IDs: [${existingIdsList}].

Focus areas:
- Money: wealth mindset, asset building, side hustles, AI entrepreneurship.
- Life: fatherhood, duties, family leadership, emotional strength.
- Discipline: dopamine control, deep focus, physical/cognitive training.
 
The output must be a valid JSON array of objects. Do not include markdown fences or explanation.
Each object must have:
- "id": string (unique slug like "money_stock_market")
- "category": "Money" | "Life" | "Discipline"
- "topic": string (compelling article title)
- "keywords": array of strings
- "summary": string (brief description of what the article covers)
 
JSON Output:`;

        const systemInstruction = "You are the Chief Editor of MCJP.io. You generate highly engaging, search-optimized article concepts focused on life success, money, and modern masculinity.";
        
        try {
            let resText = await gemini.generate(prompt, systemInstruction);
            
            // Clean markdown blocks if any
            resText = resText.replace(/```json|```/g, '').trim();
            
            const newTopics = JSON.parse(resText);
            
            // Filter duplicates
            const existingIds = new Set(topics.map(t => t.id));
            const uniqueNewTopics = newTopics.filter(t => !existingIds.has(t.id));
            
            topics = [...topics, ...uniqueNewTopics];
            fs.writeFileSync(TOPICS_FILE, JSON.stringify(topics, null, 2), 'utf8');
            console.log(`✅ Refilled topics database. Added ${uniqueNewTopics.length} new unique topics.`);
        } catch (e) {
            console.error("❌ Failed to refill topics:", e.message);
        }
    }
}

async function runAutoPublish() {
    await checkAndRefillTopics();

    // Check if we already have 5 posts published today to enforce the daily limit
    const todayStr = new Date().toISOString().split('T')[0];
    let todayCount = 0;
    if (fs.existsSync(POSTS_DIR)) {
        const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
        for (const file of files) {
            try {
                const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
                const dateMatch = content.match(/^date:\s*['"]?(\d{4}-\d{2}-\d{2})['"]?/m);
                if (dateMatch && dateMatch[1] === todayStr) {
                    todayCount++;
                }
            } catch (e) {
                console.error(`⚠️ Failed to parse date from ${file}:`, e.message);
            }
        }
    }
    
    console.log(`📅 Articles published today (${todayStr}): ${todayCount}`);
    const maxDaily = 5;
    if (todayCount >= maxDaily) {
        console.log(`⚠️ Daily limit of ${maxDaily} articles reached. Skipping auto-publish today.`);
        return;
    }

    const requestedCount = process.argv[2] ? parseInt(process.argv[2], 10) : 3;
    const targetCount = Math.min(requestedCount, maxDaily - todayCount);
    console.log(`\n🚀 Initiating Organic Upload (Target: ${targetCount} Articles, Requested: ${requestedCount})...`);
    
    let generatedCount = 0;
    for (let i = 0; i < targetCount; i++) {
        console.log(`\n--- Generation Cycle #${i + 1} ---`);
        try {
            // Re-run generateArticle which picks the next unwritten topic
            await generateArticle();
            generatedCount++;
        } catch (err) {
            console.error(`❌ Failed on cycle #${i + 1}:`, err.message);
        }
    }

    if (generatedCount > 0) {
        console.log(`\n💾 Successfully generated ${generatedCount} articles. Committing and pushing to remote origin...`);
        try {
            execSync('git add .', { cwd: ROOT_DIR });
            execSync(`git commit -m "chore(blog): daily auto-publish ${generatedCount} articles"`, { cwd: ROOT_DIR });
            execSync('git push origin main', { cwd: ROOT_DIR });
            console.log("✅ Codebase and articles successfully pushed to GitHub! Vercel will rebuild now.");
        } catch (e) {
            console.error("❌ Git push failed:", e.message);
        }
    } else {
        console.log("ℹ️ No new articles were generated. Skipping commit.");
    }
}

if (require.main === module) {
    runAutoPublish().catch(err => console.error("❌ Auto-publish cycle crashed:", err.message));
}
