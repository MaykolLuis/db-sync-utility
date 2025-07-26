/**
 * Utility functions for history management
 */
import type { HistoryEntry } from "../types"

const HISTORY_FILE = 'history.json';

/**
 * Load history entries from JSON file
 * @returns Array of history entries
 */
export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    if (!window.electron || !window.electron.readJsonFile) {
      console.warn('Electron readJsonFile not available, returning empty history');
      return [];
    }

    const result = await window.electron.readJsonFile(HISTORY_FILE);
    
    if (result && Array.isArray(result.data)) {
      console.log(`Loaded ${result.data.length} history entries`);
      return result.data;
    }
    
    console.warn('No history data found, returning empty array');
    return [];
  } catch (error: any) {
    console.error('Error loading history:', error);
    return [];
  }
}

/**
 * Save history entries to JSON file
 * @param history Array of history entries to save
 * @returns True if successful, false otherwise
 */
export async function saveHistory(history: HistoryEntry[]): Promise<boolean> {
  try {
    if (!window.electron || !window.electron.writeJsonFile) {
      console.warn('Electron writeJsonFile not available, history not saved');
      return false;
    }

    // Debug: Check versions before saving
    if (history.length > 0) {
      console.log(`Before saving - First history entry version: ${history[0].version || 'undefined'}`);
      // Log the first 3 entries to check their versions
      history.slice(0, 3).forEach((entry, index) => {
        console.log(`Saving history entry ${index} - ID: ${entry.id}, Version: ${entry.version || 'undefined'}`);
      });
    }

    await window.electron.writeJsonFile(HISTORY_FILE, history);
    console.log(`Saved ${history.length} history entries`);
    return true;
  } catch (error: any) {
    console.error('Error saving history:', error);
    return false;
  }
}

/**
 * Add a new entry to history and save to file
 * @param entry History entry to add
 * @param currentHistory Current history array
 * @returns Updated history array
 */
export async function addHistoryEntry(
  entry: HistoryEntry, 
  currentHistory: HistoryEntry[]
): Promise<HistoryEntry[]> {
  // Create a new array with the new entry at the beginning
  const updatedHistory = [entry, ...currentHistory];
  
  // Save to file
  await saveHistory(updatedHistory);
  
  return updatedHistory;
}

/**
 * Clear all history entries
 * @returns Empty history array
 */
export async function clearHistory(): Promise<HistoryEntry[]> {
  await saveHistory([]);
  return [];
}

/**
 * Delete a specific history entry by ID
 * @param id ID of the entry to delete
 * @param currentHistory Current history array
 * @returns Updated history array
 */
export async function deleteHistoryEntry(
  id: number | string, 
  currentHistory: HistoryEntry[]
): Promise<HistoryEntry[]> {
  const updatedHistory = currentHistory.filter(entry => entry.id !== id);
  
  // Save to file if entries were removed
  if (updatedHistory.length !== currentHistory.length) {
    await saveHistory(updatedHistory);
  }
  
  return updatedHistory;
}

/**
 * Update a history entry's description
 * @param id ID of the entry to update
 * @param newDescription New description text
 * @param currentHistory Current history array
 * @returns Updated history array
 */
export async function updateHistoryEntryDescription(
  id: number | string,
  newDescription: string,
  currentHistory: HistoryEntry[]
): Promise<HistoryEntry[]> {
  // Create a new array with the updated entry
  const updatedHistory = currentHistory.map(entry => 
    entry.id === id ? { ...entry, description: newDescription } : entry
  );
  
  // Save to file
  await saveHistory(updatedHistory);
  
  return updatedHistory;
}
