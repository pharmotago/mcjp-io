const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, '../content/posts');
const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));

files.forEach(file => {
  const filePath = path.join(postsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  const parts = content.split('---');
  if (parts.length >= 3) {
    let body = parts.slice(2).join('---');
    const newBody = body.replace(/^# .+\r?\n/gm, ''); // Handle Windows line endings
    if (body !== newBody) {
      content = parts[0] + '---' + parts[1] + '---' + newBody;
      changed = true;
      console.log(`Removed H1 from ${file}`);
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
});
console.log('H1 stripping completed.');
