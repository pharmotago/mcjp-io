const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, '..', 'content', 'posts');

if (!fs.existsSync(postsDir)) {
  console.error("Posts directory not found!");
  process.exit(1);
}

const todayStr = new Date().toISOString().split('T')[0];
const files = fs.readdirSync(postsDir).filter(file => file.endsWith('.md'));
let count = 0;

files.forEach(file => {
  const fullPath = path.join(postsDir, file);
  const content = fs.readFileSync(fullPath, 'utf8');
  
  const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return; // Skip if no valid frontmatter

  const yaml = match[1];
  const body = match[2];
  
  // Check if published field already exists
  if (yaml.includes('\npublished:')) return;

  // Extract date to determine published status
  const dateMatch = yaml.match(/date:\s*"?([^"\n\r]+)"?/);
  let isPublished = false;
  if (dateMatch && dateMatch[1] <= todayStr) {
    isPublished = true;
  }

  const newYaml = yaml + `\npublished: ${isPublished}`;
  const newContent = `---\n${newYaml}\n---\n${body}`;
  
  fs.writeFileSync(fullPath, newContent, 'utf8');
  count++;
});

console.log(`Successfully updated ${count} files with published field.`);
