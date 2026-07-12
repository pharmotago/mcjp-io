const fs = require('fs');
const path = require('path');

const srcFocus = 'C:\\Users\\Sung\\.gemini\\antigravity\\brain\\fe24bd90-1214-4e0d-ae33-5fcdf23f8687\\stoic_father_focus_1783838745505.png';
const destFocus = 'c:\\Antigravity\\mcjp-io\\public\\images\\life_stoic_father_resilience_parenting_focus.png';

const srcTheme = 'C:\\Users\\Sung\\.gemini\\antigravity\\brain\\fe24bd90-1214-4e0d-ae33-5fcdf23f8687\\stoic_father_theme_1783838757613.png';
const destTheme = 'c:\\Antigravity\\mcjp-io\\public\\images\\life_stoic_father_resilience_parenting_theme.png';

try {
    fs.copyFileSync(srcFocus, destFocus);
    console.log(`✅ Focus image copied to ${destFocus}`);
} catch (e) {
    console.error(`❌ Failed to copy focus image:`, e.message);
}

try {
    fs.copyFileSync(srcTheme, destTheme);
    console.log(`✅ Theme image copied to ${destTheme}`);
} catch (e) {
    console.error(`❌ Failed to copy theme image:`, e.message);
}
