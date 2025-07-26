const fs = require('fs');
const path = require('path');

// Fix asset paths in all HTML files for Electron compatibility
function fixAssetPaths() {
  const outDir = path.join(__dirname, 'out');
  
  console.log('Fixing asset paths for Electron compatibility...');
  
  if (!fs.existsSync(outDir)) {
    console.error('out directory not found');
    return;
  }
  
  // Function to fix paths in a single HTML file
  function fixHtmlFile(filePath) {
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      return;
    }
    
    console.log(`Fixing paths in: ${filePath}`);
    
    // Read the HTML file
    let htmlContent = fs.readFileSync(filePath, 'utf-8');
    
    // Replace absolute paths with relative paths for _next assets
    htmlContent = htmlContent.replace(/href="\/_next\//g, 'href="./_next/');
    htmlContent = htmlContent.replace(/src="\/_next\//g, 'src="./_next/');
    
    // Fix other absolute asset paths
    htmlContent = htmlContent.replace(/href="\/([^"]*\.css)"/g, 'href="./$1"');
    htmlContent = htmlContent.replace(/src="\/([^"]*\.js)"/g, 'src="./$1"');
    htmlContent = htmlContent.replace(/src="\/([^"]*\.png)"/g, 'src="./$1"');
    htmlContent = htmlContent.replace(/src="\/([^"]*\.jpg)"/g, 'src="./$1"');
    htmlContent = htmlContent.replace(/src="\/([^"]*\.svg)"/g, 'src="./$1"');
    
    // Fix any remaining absolute paths that start with /
    htmlContent = htmlContent.replace(/href="\/(?!\/)([^"]*)"/g, 'href="./$1"');
    htmlContent = htmlContent.replace(/src="\/(?!\/)([^"]*)"/g, 'src="./$1"');
    
    // Write the fixed HTML back
    fs.writeFileSync(filePath, htmlContent, 'utf-8');
  }
  
  // Fix main HTML files
  const htmlFiles = [
    path.join(outDir, 'index.html'),
    path.join(outDir, 'login', 'index.html'),
    path.join(outDir, 'settings', 'index.html'),
    path.join(outDir, '404.html')
  ];
  
  htmlFiles.forEach(fixHtmlFile);
  
  console.log('Asset paths fixed successfully!');
  console.log('- Converted /_next/ to ./_next/');
  console.log('- Fixed other absolute asset paths');
  console.log('- Processed all HTML files in out directory');
}

// Run the fix
fixAssetPaths();
