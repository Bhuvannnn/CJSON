#!/usr/bin/env node

/**
 * Post-build script to add .js extensions to ESM imports
 * This fixes the issue where TypeScript doesn't add .js extensions to imports
 */

const fs = require('fs');
const path = require('path');

function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix relative imports: from './something' or '../something' -> add .js
  // But not: from './something.js' (already has extension)
  // And not: from 'something' (node_modules or absolute)
  const importRegex = /from\s+['"]((?:\.\.?\/)+[^'"]+)(?<!\.js)['"]/g;
  
  content = content.replace(importRegex, (match, importPath) => {
    // Skip if it already has an extension or is a directory import
    if (importPath.endsWith('.js') || importPath.endsWith('.json')) {
      return match;
    }
    
    // Check if the target is a directory (has index.js)
    const fullPath = path.resolve(path.dirname(filePath), importPath);
    const indexPath = path.join(fullPath, 'index.js');
    
    if (fs.existsSync(indexPath)) {
      // It's a directory import, add /index.js
      modified = true;
      return match.replace(importPath, importPath + '/index.js');
    } else {
      // It's a file import, add .js
      modified = true;
      return match.replace(importPath, importPath + '.js');
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed imports in: ${filePath}`);
  }
}

function fixImportsInDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fixImportsInDirectory(filePath);
    } else if (file.endsWith('.js') && !file.endsWith('.d.ts')) {
      fixImportsInFile(filePath);
    }
  }
}

const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  console.log('Fixing ESM imports in dist/...');
  fixImportsInDirectory(distDir);
  console.log('Done!');
} else {
  console.error('dist/ directory not found. Run npm run build first.');
  process.exit(1);
}
