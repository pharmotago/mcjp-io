const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, '../content/posts');
const files = fs.readdirSync(postsDir).filter(file => file.endsWith('.md'));

const today = new Date('2026-07-18').toISOString().split('T')[0];

console.log(`Checking for posts with dates in the future (after ${today})...\n`);

let foundIssues = false;

files.forEach(file => {
  const content = fs.readFileSync(path.join(postsDir, file), 'utf-8');
  
  const dateMatch = content.match(/^date:\s*["']([^"']+)["']/m);
  const lastUpdatedMatch = content.match(/^lastUpdated:\s*["']([^"']+)["']/m);
  
  const date = dateMatch ? dateMatch[1] : null;
  const lastUpdated = lastUpdatedMatch ? lastUpdatedMatch[1] : null;
  
  const issues = [];
  
  if (date && date > today) {
    issues.push(`date: ${date}`);
  }
  
  if (lastUpdated && lastUpdated > today) {
    issues.push(`lastUpdated: ${lastUpdated}`);
  }
  
  if (issues.length > 0) {
    foundIssues = true;
    console.log(`File: ${file}`);
    issues.forEach(issue => console.log(`  - ${issue}`));
    console.log('');
  }
});

if (!foundIssues) {
  console.log('No future dates found in any other posts.');
}
