const fs = require('fs');
const path = require('path');

// Fix asset paths in the generated HTML files for Electron compatibility
function fixAssetPaths() {
  const outDir = path.join(__dirname, 'out');
  const indexPath = path.join(outDir, 'index.html');
  
  console.log('Fixing asset paths for Electron compatibility...');
  
  if (!fs.existsSync(indexPath)) {
    console.error('index.html not found in out directory');
    return;
  }
  
  // Read the HTML file
  let htmlContent = fs.readFileSync(indexPath, 'utf-8');
  
  // Replace absolute paths with relative paths
  // /_next/ -> ./_next/
  htmlContent = htmlContent.replace(/href="\/_next\//g, 'href="./_next/');
  htmlContent = htmlContent.replace(/src="\/_next\//g, 'src="./_next/');
  
  // Also fix any other absolute paths that might cause issues
  htmlContent = htmlContent.replace(/href="\/([^"]*\.css)"/g, 'href="./$1"');
  htmlContent = htmlContent.replace(/src="\/([^"]*\.js)"/g, 'src="./$1"');
  
  // Write the fixed HTML back
  fs.writeFileSync(indexPath, htmlContent, 'utf-8');
  
  console.log('Asset paths fixed successfully!');
  console.log('- Converted /_next/ to ./_next/');
  console.log('- Fixed other absolute asset paths');
}

// Run the fix
fixAssetPaths();
