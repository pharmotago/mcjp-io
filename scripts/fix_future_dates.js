const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, '../content/posts');
const files = fs.readdirSync(postsDir).filter(file => file.endsWith('.md'));

const today = new Date().toISOString().split('T')[0];

console.log('Checking for posts with dates in the future (after ' + today + ')...');

let fixedCount = 0;

files.forEach(file => {
  const filePath = path.join(postsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  const dateMatch = content.match(/^date:\s*["']([^"']+)["']/m);
  const lastUpdatedMatch = content.match(/^lastUpdated:\s*["']([^"']+)["']/m);
  
  const date = dateMatch ? dateMatch[1] : null;
  const lastUpdated = lastUpdatedMatch ? lastUpdatedMatch[1] : null;
  
  let modified = false;
  
  if (date && date > today) {
    content = content.replace(/^date:\s*["']([^"']+)["']/m, 'date: "' + today + '"');
    modified = true;
  }
  
  if (lastUpdated && lastUpdated > today) {
    content = content.replace(/^lastUpdated:\s*["']([^"']+)["']/m, 'lastUpdated: "' + today + '"');
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed:', file);
    fixedCount++;
  }
});

console.log('Fixed ' + fixedCount + ' files.');
