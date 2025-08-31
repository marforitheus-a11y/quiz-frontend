// Copies build output (dist) to the parent folder (quiz-frontend) so the new site replaces existing HTML
const fs = require('fs');
const path = require('path');
const src = path.resolve(__dirname, '..', 'dist');
const dest = path.resolve(__dirname, '..', '..'); // quiz-frontend root

function copyRecursive(srcDir, destDir){
  if(!fs.existsSync(srcDir)) { console.error('Build not found at', srcDir); process.exit(1); }
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  if(!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  for(const e of entries){
    const srcPath = path.join(srcDir, e.name);
    const destPath = path.join(destDir, e.name);
    if(e.isDirectory()) copyRecursive(srcPath, destPath);
    else {
      fs.copyFileSync(srcPath, destPath);
      console.log('copied', destPath);
    }
  }
}

copyRecursive(src, dest);
console.log('Deploy copy finished.');
