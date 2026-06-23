const fs = require('fs');
const path = require('path');
const gemini = require('../../scripts/gemini_client');

const ROOT_DIR = 'C:\\Antigravity\\mcjp-io';
const TOPICS_FILE = path.join(ROOT_DIR, 'content', 'topics.json');
const POSTS_DIR = path.join(ROOT_DIR, 'content', 'posts');

async function generateArticle() {
    console.log("🚀 Starting Autonomous Content Generation Pipeline for MCJP.io...");

    if (!fs.existsSync(TOPICS_FILE)) {
        throw new Error("topics.json file not found.");
    }

    if (!fs.existsSync(POSTS_DIR)) {
        fs.mkdirSync(POSTS_DIR, { recursive: true });
    }

    const topics = JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf8'));
    
    // Find first topic that hasn't been written
    let selectedTopic = null;
    for (const t of topics) {
        const postPath = path.join(POSTS_DIR, `${t.id}.md`);
        if (!fs.existsSync(postPath)) {
            selectedTopic = t;
            break;
        }
    }

    if (!selectedTopic) {
        console.log("📭 All topics have been written. Cycle complete.");
        return;
    }

    console.log(`📝 Selected Topic: "${selectedTopic.topic}" (Category: ${selectedTopic.category})`);

    const prompt = `Write a comprehensive, premium-quality blog article for a site called "MCJP.io".
Topic: "${selectedTopic.topic}"
Category: "${selectedTopic.category}"
Keywords: ${selectedTopic.keywords.join(', ')}
Summary of Intent: "${selectedTopic.summary}"

REQUIREMENTS:
1. Tone: Deep, authoritative, inspiring, and direct. Emphasize self-discipline, long-term asset building, integrity, and actionable strategies.
2. Structure & Visual Aids:
   - Use clean, semantic markdown headings (##, ###).
   - Write structured paragraphs with strong typography flow.
   - Include bulleted action plans or checklists.
   - **Visual Aids**: Embed exactly two relevant images in the markdown format:
     1. One image placed in the first third of the article: \`![Alt text describing image and matching context](/images/${selectedTopic.id}_focus.png)\`
     2. A second image placed in the final third: \`![Alt text describing image and matching context](/images/${selectedTopic.id}_theme.png)\`
     Ensure the alt text is highly descriptive of the image context.
3. Content length: Minimum 800-1000 words.
4. Output only the body of the article in markdown. Do NOT write the title as an H1 heading (it will be added by frontmatter). Do NOT include HTML fences or code blocks.
5. If the category is "Money" or the topic relates to starting blogs/websites/online businesses, organically recommend Hostinger exactly once as a reliable, high-performance web host and embed this referral discount link: https://www.hostinger.com?REFERRALCODE=OYBPHARMOWCY (e.g. "We recommend launching your digital assets on [Hostinger](https://www.hostinger.com?REFERRALCODE=OYBPHARMOWCY) to secure their exclusive partner discount"). Ensure it fits naturally in the text.
6. If the category is "Life" or "Discipline" (or the topic relates to fatherhood, parenting, philosophy, or family leadership), organically mention Peter's sister project "The Stoic Dad" exactly once and embed this link: https://the-stoic-dad.mcjp.io/ (e.g. "For deeper insights on masculine resilience and active parenting, explore [The Stoic Dad](https://the-stoic-dad.mcjp.io/) portal"). Ensure it integrates seamlessly with the surrounding text.
7. If the topic relates to home office setups, remote work, productivity, digital detox, technology use, or smart home management, organically recommend Superloop NBN Broadband exactly once as a high-speed, high-performance internet provider and embed this referral discount link: https://www.superloop.com/internet/nbn/?referral_code=SLC-1764690 (e.g. "For a seamless and high-speed home office connection, we recommend signing up for [Superloop NBN Broadband](https://www.superloop.com/internet/nbn/?referral_code=SLC-1764690) to save on your plan fee"). Ensure it fits naturally in the text.`;

    const systemInstruction = `You are the lead editor and writer for MCJP.io. 
You specialize in producing high-quality self-improvement, financial autonomy, and masculine development articles.
Your writing style is similar to a mix of premium essay journals (like McKinsey briefings or McKinsey Quarterly) and high-impact self-discipline essays.
When writing, make sure to embed the exact local relative image paths specified in the prompt requirements, with descriptive alt texts.`;

    console.log("🧠 Generating content via Sovereign LLM Client...");
    let content = "";
    try {
        content = await gemini.generate(prompt, systemInstruction);
    } catch (e) {
        throw new Error("Failed to call LLM client: " + e.message);
    }

    // Apply legal disclaimer if category is Money (Elena's Directive)
    if (selectedTopic.category.toLowerCase() === 'money') {
        content += `\n\n---
> **Legal Disclaimer:** The information provided on MCJP.io, including but not limited to business models, financial assets, and wealth strategies, is for general educational and informational purposes only. It does not constitute professional financial, legal, or investment advice. Always consult with a certified financial planner or legal professional before making any financial decisions.`;
    }

    const today = new Date().toISOString().split('T')[0];
    const frontmatter = `---
title: "${selectedTopic.topic}"
date: "${today}"
category: "${selectedTopic.category}"
description: "${selectedTopic.summary}"
keywords: ${JSON.stringify(selectedTopic.keywords)}
---

`;

    const fullContent = frontmatter + content;
    const postFile = path.join(POSTS_DIR, `${selectedTopic.id}.md`);
    fs.writeFileSync(postFile, fullContent, 'utf8');

    console.log(`✅ Success! Article generated and saved at: ${postFile}`);
}

if (require.main === module) {
    generateArticle().catch(err => console.error("❌ Pipeline crashed:", err.message));
}

module.exports = { generateArticle };
