const fs = require('fs');
const path = require('path');

const ROOT_DIR = 'C:\\Antigravity\\mcjp-io';
const POSTS_DIR = path.join(ROOT_DIR, 'content', 'posts');

const improvements = {
    // PART 1: 10 Meta Description & Keyword updates
    'book_90_day_habit_system': {
        title: "The 90-Day Habit System Review: Does Josh Smith's Framework Actually Rewire Your Brain?",
        description: "Discover how The 90-Day Habit System uses neuroscience-backed habit loops to rewire your brain for lasting productivity. A complete review of Josh Smith's 90-day framework.",
        keywords: ["90-day habit system review", "josh smith", "discipline", "self improvement"]
    },
    'money_financial_independence_blueprint': {
        description: "Learn the exact steps to achieve financial independence — from budgeting and debt elimination to smart investing and passive income. Your complete wealth-building blueprint.",
        keywords: ["financial independence blueprint for men", "wealth building", "personal finance"]
    },
    'money_side_hustle': {
        description: "Step-by-step guide to launching a profitable one-person AI business in 2026 with minimal capital. Includes tools, workflows, and automation strategies for solopreneurs.",
        keywords: ["AI one person business 2026", "solopreneur", "side hustle"]
    },
    'discipline_flow_state_optimization': {
        description: "Unpack the neuroscience of flow states and learn proven daily protocols to trigger deep focus for peak cognitive performance. Practical deep work tactics for high achievers.",
        keywords: ["flow state deep work tactics", "focus", "cognitive performance"]
    },
    'money_ai_agency_scaling': {
        description: "How to build and scale a 7-figure AI service agency as a solo operator — no large team required. Covers positioning, pricing, AI tool stack, and client acquisition strategies.",
        keywords: ["AI agency scaling solopreneur", "agency growth", "AI business"]
    },
    'money_micro_acquisitions': {
        description: "A practical guide to buying small profitable online businesses — websites, newsletters, and SaaS tools — and scaling them for wealth creation without starting from scratch.",
        keywords: ["micro acquisitions online business buying", "website buying", "digital assets"]
    },
    'discipline_dopamine_control': {
        description: "Learn how to regulate dopamine to build unshakeable self-discipline and focus. Science-backed strategies to eliminate distractions and create high-performance daily habits.",
        keywords: ["dopamine control discipline focus", "dopamine detox", "discipline"]
    },
    'discipline_stress_inoculation': {
        description: "How deliberate physical stress — cold exposure, heavy lifting, endurance training — builds psychological resilience that transfers directly to business performance and life success.",
        keywords: ["stress inoculation mental fortitude", "resilience", "discipline"]
    },
    'money_passive_income_streams': {
        description: "Explore proven passive income strategies — dividend investing, digital products, real estate, and content monetization — to build financial freedom and escape the hourly rate trap.",
        keywords: ["passive income strategies financial freedom", "wealth creation", "financial freedom"]
    },
    'personal_growth_discipline': {
        description: "Build a daily routine that protects your cognitive energy from passive consumption and social media dopamine loops. Practical systems for deep work and high-value execution.",
        keywords: ["dopamine detox focus deep work routine", "discipline", "focus"]
    },

    // PART 2: Remaining Book review title updates
    'book_90_day_longevity_protocol_log': {
        title: "90-Day Longevity Protocol Review: The Biomarker-Based Healthspan System Explained",
        keywords: ["90 day longevity protocol review", "josh smith", "longevity"]
    },
    'book_hybrid_performance_log': {
        title: "Hybrid Performance Log Review: The Strength + Endurance Training System for Modern Men",
        keywords: ["hybrid performance log review hybrid athlete", "josh smith", "discipline"]
    },
    'book_let_them_let_me': {
        title: "Let Them Let Me Review: Jordan Clark's Boundary Reset Philosophy for Emotional Sovereignty",
        keywords: ["let them let me book review jordan clark", "jordan r clark", "life"]
    },
    'book_low_friction_adhd_planner': {
        title: "Low-Friction ADHD Planner Review: Productivity Systems That Actually Work for ADHD Brains",
        keywords: ["ADHD planner productivity system review", "josh smith", "discipline"]
    },
    'book_unburden_your_brain': {
        title: "Unburden Your Brain Review: Jordan Clark's System to Eliminate Mental Load and Life Admin",
        keywords: ["unburden your brain review mental load", "jordan r clark", "life"]
    }
};

function applyImprovements() {
    let updatedCount = 0;

    for (const [slug, data] of Object.entries(improvements)) {
        const filePath = path.join(POSTS_DIR, `${slug}.md`);
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️ Post file not found: ${slug}.md`);
            continue;
        }

        let content = fs.readFileSync(filePath, 'utf8');
        const frontmatterMatch = content.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n/);
        if (!frontmatterMatch) {
            console.log(`⚠️ Could not parse frontmatter for ${slug}.md`);
            continue;
        }

        let frontmatter = frontmatterMatch[1];
        let originalFrontmatter = frontmatter;

        // Apply title improvement
        if (data.title) {
            if (frontmatter.match(/title:\s*".*?"/)) {
                frontmatter = frontmatter.replace(/title:\s*".*?"/, `title: "${data.title}"`);
            } else {
                frontmatter += `title: "${data.title}"\n`;
            }
        }

        // Apply description improvement
        if (data.description) {
            if (frontmatter.match(/description:\s*".*?"/)) {
                frontmatter = frontmatter.replace(/description:\s*".*?"/, `description: "${data.description}"`);
            } else {
                frontmatter += `description: "${data.description}"\n`;
            }
        }

        // Apply keywords improvement
        if (data.keywords) {
            const keywordsStr = JSON.stringify(data.keywords);
            if (frontmatter.match(/keywords:\s*\[.*?\]/)) {
                frontmatter = frontmatter.replace(/keywords:\s*\[.*?\]/, `keywords: ${keywordsStr}`);
            } else {
                frontmatter += `keywords: ${keywordsStr}\n`;
            }
        }

        if (frontmatter !== originalFrontmatter) {
            content = content.replace(originalFrontmatter, frontmatter);
            fs.writeFileSync(filePath, content, 'utf8');
            updatedCount++;
            console.log(`✅ Applied SEO improvements to: ${slug}.md`);
        }
    }

    console.log(`\n🎉 Applied DOCX improvements to ${updatedCount} posts.`);
}

if (require.main === module) {
    applyImprovements();
}
