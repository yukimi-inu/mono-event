// Bundle size measurement for event libraries
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Utility function to format file size
function formatSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Function to get minified bundle size
function getBundleSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return 0;
  }
}

// Function to get gzipped size
function getGzippedSize(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    const gzipped = zlib.gzipSync(content);
    return gzipped.length;
  } catch (error) {
    console.error(`Error calculating gzipped size for ${filePath}:`, error.message);
    return 0;
  }
}

// Function to find package size from package.json
function getPackageSize(packageName) {
  try {
    const packageJsonPath = path.join(rootDir, 'node_modules', packageName, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Try to find the main minified file
    let mainFile;
    if (packageJson.unpkg) {
      mainFile = path.join(rootDir, 'node_modules', packageName, packageJson.unpkg);
    } else if (packageJson.jsdelivr) {
      mainFile = path.join(rootDir, 'node_modules', packageName, packageJson.jsdelivr);
    } else if (packageJson.browser) {
      mainFile = path.join(rootDir, 'node_modules', packageName, packageJson.browser);
    } else if (packageJson.main) {
      mainFile = path.join(rootDir, 'node_modules', packageName, packageJson.main);
    } else {
      mainFile = path.join(rootDir, 'node_modules', packageName, 'index.js');
    }
    
    if (fs.existsSync(mainFile)) {
      return {
        path: mainFile,
        size: getBundleSize(mainFile),
        gzippedSize: getGzippedSize(mainFile)
      };
    }
    
    // If main file not found, try common patterns
    const possiblePaths = [
      path.join(rootDir, 'node_modules', packageName, 'dist', `${packageName}.min.js`),
      path.join(rootDir, 'node_modules', packageName, 'dist', 'index.min.js'),
      path.join(rootDir, 'node_modules', packageName, 'umd', `${packageName}.min.js`),
      path.join(rootDir, 'node_modules', packageName, 'lib', 'index.js'),
      path.join(rootDir, 'node_modules', packageName, 'index.js')
    ];
    
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        return {
          path: possiblePath,
          size: getBundleSize(possiblePath),
          gzippedSize: getGzippedSize(possiblePath)
        };
      }
    }
    
    return { path: null, size: 0, gzippedSize: 0 };
  } catch (error) {
    console.error(`Error getting package size for ${packageName}:`, error.message);
    return { path: null, size: 0, gzippedSize: 0 };
  }
}

console.log('\n===== Bundle Size Comparison =====\n');

// Define libraries to measure
const libraries = {
  'mono-event': { path: path.join(rootDir, 'dist', 'index.min.js') },
  'eventemitter3': { package: 'eventemitter3' },
  'mitt': { package: 'mitt' },
  'nanoevents': { package: 'nanoevents' },
  'rxjs': { package: 'rxjs' }
};

// Measure and display bundle sizes
console.log('| Library      | Minified Size | Gzipped Size | File Path |');
console.log('|--------------|---------------|--------------|-----------|');

for (const [library, info] of Object.entries(libraries)) {
  let size = 0;
  let gzippedSize = 0;
  let filePath = '';
  
  if (info.path) {
    // Direct path provided
    filePath = info.path;
    size = getBundleSize(filePath);
    gzippedSize = getGzippedSize(filePath);
  } else if (info.package) {
    // Find package in node_modules
    const packageInfo = getPackageSize(info.package);
    size = packageInfo.size;
    gzippedSize = packageInfo.gzippedSize;
    filePath = packageInfo.path || 'Not found';
  }
  
  const shortPath = filePath.replace(rootDir, '...');
  console.log(`| ${library.padEnd(12)} | ${formatSize(size).padEnd(13)} | ${formatSize(gzippedSize).padEnd(12)} | ${shortPath} |`);
}

console.log('\nNote: Smaller bundle size means less JavaScript to download, parse, and execute in the browser.');