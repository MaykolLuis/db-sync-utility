import { HistoryEntry } from '../types';
import { loadHistory } from './history-utils';

// Reset cache on each app load to ensure fresh version numbers
let cachedHighestVersion = 0;
let lastUpdateTime = 0;

/**
 * Determines the next version number based on existing history entries
 * @returns The next version number in the format "v{number}" (e.g., "v1", "v2")
 */
export async function getNextVersionNumber(): Promise<string> {
  console.log('=== GETTING NEXT VERSION NUMBER ===');
  
  // Always get fresh history to ensure we have the latest versions
  let highestVersionNumber = 0;
  
  try {
    // Load history from file
    const historyEntries = await loadHistory();
    console.log(`Loaded ${historyEntries.length} history entries`);
    
    if (!historyEntries || historyEntries.length === 0) {
      console.log('No history entries found, returning v1');
      return 'v1';
    }
    
    // Log raw data for debugging
    console.log('DEBUG: First few history entries (raw):', JSON.stringify(historyEntries.slice(0, 2)));
    
    // Log first few entries for debugging
    console.log('First few history entries:');
    historyEntries.slice(0, 5).forEach((entry, i) => {
      console.log(`Entry ${i}: ID=${entry.id}, Version=${entry.version || 'undefined'}, Type=${typeof entry.version}`);
    });
    
    // Find the highest version number across all entries
    for (const entry of historyEntries) {
      if (entry.version) {
        // Extract number from version string (e.g., "v1" -> 1)
        const versionMatch = entry.version.match(/^v(\d+)$/);
        if (versionMatch && versionMatch[1]) {
          const versionNum = parseInt(versionMatch[1], 10);
          console.log(`Found version: ${entry.version} -> number: ${versionNum}`);
          
          if (!isNaN(versionNum) && versionNum > highestVersionNumber) {
            highestVersionNumber = versionNum;
            console.log(`New highest version: ${highestVersionNumber}`);
          }
        } else {
          console.warn(`Version format issue: "${entry.version}" doesn't match expected pattern v{number}`);
        }
      }
    }
    
    console.log(`Highest version found: ${highestVersionNumber || 0}`);
    
    // Increment for next version
    const nextVersion = `v${highestVersionNumber + 1}`;
    console.log(`Next version will be: ${nextVersion}`);
    
    // Update cache
    cachedHighestVersion = highestVersionNumber + 1;
    lastUpdateTime = Date.now();
    
    return nextVersion;
  } catch (error) {
    console.error('Error determining next version number:', error);
    return 'v1'; // Fallback to v1 if there's an error
  }
}
