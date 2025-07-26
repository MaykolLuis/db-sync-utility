const fs = require('fs').promises;
const path = require('path');

const TARGET_FILE = path.join(process.env.APPDATA, 'db-sync-utility', 'data', 'targetLocations.json');

async function fixJsonFile() {
  try {
    // Read the file
    const content = await fs.readFile(TARGET_FILE, 'utf-8');
    
    // Create a backup
    const backupPath = `${TARGET_FILE}.${Date.now()}.bak`;
    await fs.writeFile(backupPath, content, 'utf-8');
    console.log(`Created backup at: ${backupPath}`);
    
    // Try to fix the JSON by finding the last valid JSON structure
    let fixedContent = '';
    let lastValidPos = 0;
    let braceCount = 0;
    let inString = false;
    let escape = false;
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      
      // Handle string literals
      if (char === '"' && !escape) {
        inString = !inString;
      }
      
      // Handle escape sequences
      if (char === '\\' && inString) {
        escape = !escape;
      } else {
        escape = false;
      }
      
      // Count braces/brackets when not in a string
      if (!inString) {
        if (char === '{' || char === '[') {
          braceCount++;
        } else if (char === '}' || char === ']') {
          braceCount--;
        }
      }
      
      // If we've reached the end of a valid JSON structure
      if (braceCount === 0 && i > 0) {
        lastValidPos = i + 1;
      }
    }
    
    // Extract the valid JSON part
    fixedContent = content.substring(0, lastValidPos).trim();
    
    // Try to parse it to validate
    try {
      JSON.parse(fixedContent);
      await fs.writeFile(TARGET_FILE, fixedContent, 'utf-8');
      console.log('Successfully fixed JSON file!');
      console.log('Original content length:', content.length);
      console.log('Fixed content length:', fixedContent.length);
    } catch (e) {
      console.error('Failed to fix JSON file. The file might be too corrupted.');
      console.error('Error:', e.message);
      
      // If we can't fix it, create an empty array
      await fs.writeFile(TARGET_FILE, '[]', 'utf-8');
      console.log('Replaced with an empty array.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.code === 'ENOENT') {
      console.log('File not found, creating a new empty file...');
      await fs.writeFile(TARGET_FILE, '[]', 'utf-8');
      console.log('Created new empty file.');
    }
  }
}

fixJsonFile();
