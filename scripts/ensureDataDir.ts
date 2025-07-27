import * as fs from 'fs';
import * as path from 'path';

const dataDir: string = path.join(process.cwd(), 'data');

if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Created data directory:', dataDir);
  } catch (error: unknown) {
    console.error('Failed to create data directory:', error);
    process.exit(1);
  }
}

// Create an empty targetLocations.json if it doesn't exist
const targetLocationsFile: string = path.join(dataDir, 'targetLocations.json');
if (!fs.existsSync(targetLocationsFile)) {
  try {
    fs.writeFileSync(targetLocationsFile, JSON.stringify([], null, 2));
    console.log('Initialized empty targetLocations.json');
  } catch (error: unknown) {
    console.error('Failed to initialize targetLocations.json:', error);
    process.exit(1);
  }
}

console.log('Data directory is ready');
