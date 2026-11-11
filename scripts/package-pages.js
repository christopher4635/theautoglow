const fs = require('fs');
const path = require('path');

const distDir = path.join(process.cwd(), 'public-dist');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Copy all .html files from .next/server/app to public-dist
const appDir = path.join(process.cwd(), '.next/server/app');
if (!fs.existsSync(appDir)) {
  console.error("Error: .next/server/app does not exist. Run 'npm run build' first.");
  process.exit(1);
}

const files = fs.readdirSync(appDir);
for (const file of files) {
  if (file.endsWith('.html')) {
    fs.copyFileSync(path.join(appDir, file), path.join(distDir, file));
  }
}

// Copy .next/static to public-dist/_next/static
const nextStatic = path.join(process.cwd(), '.next/static');
const distNextStatic = path.join(distDir, '_next', 'static');
fs.mkdirSync(distNextStatic, { recursive: true });

function copyFolderSync(from, to) {
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach((element) => {
    if (fs.lstatSync(path.join(from, element)).isFile()) {
      fs.copyFileSync(path.join(from, element), path.join(to, element));
    } else {
      copyFolderSync(path.join(from, element), path.join(to, element));
    }
  });
}

copyFolderSync(nextStatic, distNextStatic);

// Copy public/* (e.g., /images/*) to public-dist
const publicDir = path.join(process.cwd(), 'public');
if (fs.existsSync(publicDir)) {
  copyFolderSync(publicDir, distDir);
}

console.log('Successfully packaged public-dist for Cloudflare Pages deployment!');
