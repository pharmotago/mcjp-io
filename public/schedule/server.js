const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3040;

// Serve static assets from root and subdirectories
app.use(express.static(__dirname));

// Default route for SPA index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log('\x1b[33m%s\x1b[0m', ' ==========================================');
  console.log('\x1b[36m%s\x1b[0m', '   ⚡ BRISK SCHEDULES COMMAND CENTER ⚡');
  console.log('\x1b[33m%s\x1b[0m', ' ==========================================');
  console.log(` ✅ Web Client Server Ignited on Port \x1b[32m${PORT}\x1b[0m`);
  console.log(` 👉 http://localhost:${PORT}`);
  console.log('\x1b[33m%s\x1b[0m', ' ==========================================');
});
