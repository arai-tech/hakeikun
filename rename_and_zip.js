import { copyFileSync, mkdirSync, readdirSync, statSync, renameSync, existsSync, rmSync } from 'fs';
import { join, dirname, extname } from 'path';
import { execSync } from 'child_process';

const tempDir = 'temp_zip_dir';
const filesToInclude = [
  'src',
  'public',
  'package.json',
  'vite.config.ts',
  'tsconfig.json',
  'index.html',
  'metadata.json',
  '.env.example',
  '.gitignore',
  'setup.bat',
  '波形君_ポイント.md'
];

function copyRecursive(src, dest) {
  const stats = statSync(src);
  if (stats.isDirectory()) {
    if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
    readdirSync(src).forEach(child => {
      copyRecursive(join(src, child), join(dest, child));
    });
  } else {
    const destDir = dirname(dest);
    if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
    copyFileSync(src, dest);
  }
}

function renameFiles(dir) {
  readdirSync(dir).forEach(child => {
    const fullPath = join(dir, child);
    if (statSync(fullPath).isDirectory()) {
      renameFiles(fullPath);
    } else {
      const ext = extname(child).toLowerCase();
      if (ext === '.js' || ext === '.json') {
        renameSync(fullPath, fullPath + '.txt');
      }
    }
  });
}

// Cleanup
if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true });
mkdirSync(tempDir);

// Copy
filesToInclude.forEach(f => {
  if (existsSync(f)) {
    copyRecursive(f, join(tempDir, f));
  }
});

// Rename
renameFiles(tempDir);

// Zip
console.log('Zipping...');
try {
  execSync(`npx -y bestzip ../public/project.zip .`, { cwd: tempDir, stdio: 'inherit' });
  console.log('Zipped successfully!');
} catch (e) {
  console.error('Zipping failed', e);
}

// Cleanup
rmSync(tempDir, { recursive: true, force: true });
