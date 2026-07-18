const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, '../content/posts');
const targetFiles = [
  "discipline_creative_routines.md",
  "discipline_extended_fasting_cognition.md",
  "discipline_masculine_emotional_maturity.md",
  "discipline_masculine_mental_resilience.md",
  "discipline_physical_training.md",
  "family_role_of_man.md",
  "life_balancing_tradition_modernity.md",
  "life_fatherhood_work_ethic.md",
  "life_navigating_modern_fatherhood_challenges.md"
];

const superloopText = `\n\n---\n\n### Optimization for the Modern Workspace\nFor a seamless and high-speed home office connection, we recommend signing up for [Superloop NBN Broadband](https://www.superloop.com/internet/nbn/?referral_code=SLC-1764690) to save on your plan fee. Reliable, lightning-fast internet is the fundamental infrastructure for deep work, digital entrepreneurship, and effective smart home management.\n`;

targetFiles.forEach(file => {
  const filePath = path.join(postsDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    if (!content.includes('https://www.superloop.com/internet/nbn/?referral_code=SLC-1764690')) {
      content += superloopText;
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`Updated ${file}`);
    } else {
      console.log(`Skipped ${file} (Already contains link)`);
    }
  } else {
    console.log(`File not found: ${file}`);
  }
});
