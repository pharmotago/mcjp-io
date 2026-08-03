const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '..', '..', 'logs', 'auto_content_pipeline.log');

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}\n`;
  console.log(msg);
  try {
    fs.appendFileSync(logFile, line, 'utf8');
  } catch (e) {}
}

log('=== Starting Automated Content & SEO Pipeline ===');

try {
  const mcjpDir = path.join(__dirname, '..');
  
  // Step 1: Auto publish post
  log('📰 Step 1: Running auto_publish.js...');
  execSync('node scripts/auto_publish.js', { cwd: mcjpDir, stdio: 'inherit' });

  // Step 2: Apply SEO canonicals and meta descriptions
  log('🔍 Step 2: Applying SEO optimization scripts...');
  execSync('node scripts/apply_meta_descriptions.js', { cwd: mcjpDir, stdio: 'inherit' });
  execSync('node scripts/apply_canonicals.js', { cwd: mcjpDir, stdio: 'inherit' });
  execSync('node scripts/inject_internal_links.js', { cwd: mcjpDir, stdio: 'inherit' });

  // Step 3: Git sync deploy
  log('🚀 Step 3: Git auto-commit & push to trigger Vercel deployment...');
  execSync('git add -A', { cwd: mcjpDir, stdio: 'inherit' });
  try {
    execSync('git commit -m "auto(content): publish daily post and update SEO metadata [cron]"', { cwd: mcjpDir, stdio: 'inherit' });
    execSync('git push origin main', { cwd: mcjpDir, stdio: 'inherit' });
    log('✅ Successfully pushed to origin main! Vercel build triggered.');
  } catch (commitErr) {
    log('ℹ️ No new changes to commit or push.');
  }

  log('=== Automated Content & SEO Pipeline Completed Successfully ===\n');
} catch (err) {
  log(`❌ Content pipeline error: ${err.message}`);
}
