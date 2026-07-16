/**
 * Antigravity - Ollama EEAT Blog Rewriter
 * Uses local qwen3.6 model to rewrite blog posts with genuine EEAT value
 * to overcome Google AdSense "Low Value Content" rejection.
 * 
 * Usage: npm run rewrite-core (from mcjp-io directory)
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ollamaClient = require('../../scripts/ollama_client');

// Load env
require('dotenv').config({ path: 'C:\\Antigravity\\.env' });
require('dotenv').config();

// ── Config ──────────────────────────────────────────────────────────
const OLLAMA_BASE = (process.env.LOCAL_LLM_URL || 'http://localhost:11434/v1').replace(/\/v1\/?$/, '');
const MODEL = process.env.LOCAL_LLM_MODEL || 'qwen3.6';
const TIMEOUT_MS = 600000; 

const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');

const TARGET_POSTS = [
    'discipline_focus_productivity.md',
    'money_side_hustle.md',
    'family_role_of_man.md',
    'discipline_digital_detox.md',
    'money_passive_income_streams.md',
];

// ── EEAT System Instruction ─────────────────────────────────────────
const SYSTEM_INSTRUCTION = `You are Peter Kim — a solo entrepreneur, software engineer, and father of two daughters living in Sydney, Australia. You run a one-man tech business (MCJP Consulting) while raising your family.

Your task is to REWRITE the provided blog post so it passes Google's "Low Value Content" filter and meets E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) standards.

MANDATORY RULES:
1. PRESERVE all existing markdown internal links exactly as they are (e.g. [text](/posts/slug)). Do NOT change, remove, or add new internal links.
2. PRESERVE any Superloop referral links exactly as they appear.
3. PRESERVE the heading structure (##, ###, ####) and overall topic flow.
4. ADD 20-30% more content by injecting YOUR authentic personal experiences, specific anecdotes from running a solo business, concrete data points, and practical lessons learned.
5. Use FIRST PERSON ("I", "my", "we") naturally throughout.
6. Include at least 2-3 specific, concrete examples from your real life (e.g., "When I was building my SaaS dashboard at 2am while my daughters slept...", "After tracking my deep work hours for 90 days, I found that...").
7. Add a personal takeaway or reflection paragraph at the end before any existing conclusion.
8. Maintain a warm, authoritative, yet conversational tone — like a mentor sharing hard-won wisdom.
9. Output ONLY the rewritten markdown body (no frontmatter). Do NOT wrap in code fences.
10. Keep the content length at least as long as the original — preferably 20-30% longer.
11. Do NOT include generic filler or padding. Every added sentence must provide genuine value.`;

// ── Helpers ──────────────────────────────────────────────────────────
function parseFrontmatter(content) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) {
        return { frontmatter: '', body: content };
    }
    return { frontmatter: match[1], body: match[2] };
}

function reconstructFile(frontmatter, body) {
    return `---\n${frontmatter}\n---\n${body}`;
}

async function callOllama(prompt, systemInstruction) {
    console.log(`  [LLM] Requesting generation via OllamaClient (Model: ${MODEL})...`);
    try {
        const response = await ollamaClient.generate(prompt, systemInstruction);
        return response;
    } catch (err) {
        console.error(`  [LLM] Generation failed: ${err.message}`);
        throw err;
    }
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  🤖 Antigravity EEAT Blog Rewriter (Ollama Local / Gemini Fallback)');
    console.log(`  Model: ${MODEL} | Posts: ${TARGET_POSTS.length}`);
    console.log('═══════════════════════════════════════════════════════\n');

    // Verify Ollama is alive (Soft warning, do not abort since we have Gemini fallback)
    try {
        await axios.get(`${OLLAMA_BASE}/api/tags`, { timeout: 3000 });
        console.log(`✅ Ollama is online at ${OLLAMA_BASE}\n`);
    } catch {
        console.log(`⚠️  Ollama is not reachable at ${OLLAMA_BASE}. Will rely directly on Gemini proxy fallback.\n`);
    }

    const results = { success: [], failed: [] };

    for (const filename of TARGET_POSTS) {
        const filepath = path.join(POSTS_DIR, filename);
        console.log(`\n─── Processing: ${filename} ───`);

        if (!fs.existsSync(filepath)) {
            console.warn(`  ⚠️  File not found: ${filepath}. Skipping.`);
            results.failed.push({ file: filename, reason: 'File not found' });
            continue;
        }

        // Read original
        const originalContent = fs.readFileSync(filepath, 'utf-8');
        const { frontmatter, body } = parseFrontmatter(originalContent);
        const originalWordCount = body.split(/\s+/).length;
        console.log(`  📄 Original: ${originalWordCount} words`);

        // Backup
        const backupPath = filepath + '.bak';
        fs.writeFileSync(backupPath, originalContent, 'utf-8');
        console.log(`  💾 Backup saved: ${path.basename(backupPath)}`);

        // Build user prompt
        const userPrompt = `Here is the blog post to rewrite with authentic EEAT value. Remember: preserve ALL existing markdown links and heading structure exactly.\n\n${body}`;

        try {
            const rewrittenBody = await callOllama(userPrompt, SYSTEM_INSTRUCTION);

            // Sanity checks
            const newWordCount = rewrittenBody.split(/\s+/).length;
            console.log(`  📝 Rewritten: ${newWordCount} words (${newWordCount > originalWordCount ? '+' : ''}${newWordCount - originalWordCount})`);

            if (newWordCount < originalWordCount * 0.5) {
                console.warn(`  ⚠️  Rewritten content is suspiciously short (${newWordCount} vs ${originalWordCount}). Keeping backup.`);
                results.failed.push({ file: filename, reason: 'Output too short' });
                continue;
            }

            // Check that internal links survived
            const originalLinks = (body.match(/\[.*?\]\(\/posts\/.*?\)/g) || []);
            const rewrittenLinks = (rewrittenBody.match(/\[.*?\]\(\/posts\/.*?\)/g) || []);
            console.log(`  🔗 Internal links: original=${originalLinks.length}, rewritten=${rewrittenLinks.length}`);

            // Update lastUpdated in frontmatter
            const today = new Date().toISOString().split('T')[0];
            let updatedFrontmatter = frontmatter;
            if (updatedFrontmatter.match(/lastUpdated:/)) {
                updatedFrontmatter = updatedFrontmatter.replace(/lastUpdated:\s*".*?"/, `lastUpdated: "${today}"`);
            } else {
                updatedFrontmatter += `\nlastUpdated: "${today}"`;
            }

            // Write back
            const finalContent = reconstructFile(updatedFrontmatter, rewrittenBody);
            fs.writeFileSync(filepath, finalContent, 'utf-8');
            console.log(`  ✅ Successfully rewritten and saved!`);
            results.success.push({ file: filename, original: originalWordCount, rewritten: newWordCount });

        } catch (err) {
            console.error(`  ❌ Failed to rewrite: ${err.message}`);
            results.failed.push({ file: filename, reason: err.message });
        }
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  📊 REWRITE SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  ✅ Success: ${results.success.length}`);
    results.success.forEach(r => {
        console.log(`     • ${r.file}: ${r.original} → ${r.rewritten} words`);
    });
    console.log(`  ❌ Failed: ${results.failed.length}`);
    results.failed.forEach(r => {
        console.log(`     • ${r.file}: ${r.reason}`);
    });
    console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
