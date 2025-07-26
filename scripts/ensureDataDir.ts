import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');

if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Created data directory:', dataDir);
  } catch (error) {
    console.error('Failed to create data directory:', error);
    process.exit(1);
  }
}

// Create an empty targetLocations.json if it doesn't exist
const targetLocationsFile = path.join(dataDir, 'targetLocations.json');
if (!fs.existsSync(targetLocationsFile)) {
  try {
    fs.writeFileSync(targetLocationsFile, JSON.stringify([], null, 2));
    console.log('Initialized empty targetLocations.json');
  } catch (error) {
    console.error('Failed to initialize targetLocations.json:', error);
    process.exit(1);
  }
}

console.log('Data directory is ready');
