import { TargetLocation } from "../app/types";
import { readJsonFile, writeJsonFile, pathExists, getLastReadMetadata, clearFileMetadata } from './fs-utils';
import path from 'path';

const TARGET_LOCATIONS_FILE = 'targetLocations.json';

// Helper function to show toast notifications
async function showToastNotification(type: 'info' | 'warning', title: string, description: string) {
  // Only show notifications in browser environment
  if (typeof window !== 'undefined') {
    try {
      // Import toast dynamically to avoid SSR issues
      const { toast } = await import('sonner');
      toast[type](title, {
        description,
        duration: 6000,
        position: "top-right",
        closeButton: true,
      });
    } catch (error) {
      console.error('Error showing toast notification:', error);
    }
  }
}

// Read target locations from file
export async function getTargetLocations(): Promise<TargetLocation[]> {
  try {
    // Read the target locations file
    const locations = await readJsonFile<TargetLocation[]>(TARGET_LOCATIONS_FILE);
    
    // Check if the file was restored from backup
    const metadata = getLastReadMetadata(TARGET_LOCATIONS_FILE);
    
    if (metadata?.restored) {
      // Show toast notification that the file was restored from backup
      await showToastNotification(
        'info',
        'Obnova ze zálohy',
        `Cílové lokace byly automaticky obnoveny ze zálohy (${new Date(metadata.backupDate || '').toLocaleString()}).`
      );
      
      // Clear the metadata to prevent showing the notification again
      clearFileMetadata(TARGET_LOCATIONS_FILE);
      
      console.log('Target locations restored from backup:', metadata);
    } else if (metadata?.initialized) {
      // The file was initialized with default content
      await showToastNotification(
        'warning',
        'Inicializace cílových lokací',
        'Soubor s cílovými lokacemi byl prázdný nebo poškozený a byl inicializován s výchozím obsahem.'
      );
      
      // Clear the metadata to prevent showing the notification again
      clearFileMetadata(TARGET_LOCATIONS_FILE);
      
      console.log('Target locations initialized with default content');
    }
    
    return locations;
  } catch (error) {
    console.error('Error reading target locations:', error);
    // Return empty array if there's an error reading the file
    return [];
  }
}

// Save target locations to file
async function saveTargetLocations(locations: TargetLocation[]): Promise<void> {
  try {
    await writeJsonFile(TARGET_LOCATIONS_FILE, locations);
  } catch (error) {
    console.error('Error saving target locations:', error);
    throw error;
  }
}

// Add a new target location
export async function addTargetLocation(location: Omit<TargetLocation, 'id'>): Promise<TargetLocation> {
  const locations = await getTargetLocations();
  const newLocation: TargetLocation = {
    ...location,
    id: crypto.randomUUID(),
    selected: false
  };
  
  // Check if location with same path already exists
  const exists = locations.some(loc => 
    loc.path.toLowerCase() === location.path.toLowerCase()
  );
  
  if (exists) {
    throw new Error('Location with this path already exists');
  }
  
  locations.push(newLocation);
  await saveTargetLocations(locations);
  return newLocation;
}

// Update a target location
export async function updateTargetLocation(updatedLocation: TargetLocation): Promise<void> {
  const locations = await getTargetLocations();
  const index = locations.findIndex(loc => loc.id === updatedLocation.id);
  
  if (index === -1) {
    throw new Error('Location not found');
  }
  
  // Preserve the selected state if not provided
  const selectedState = updatedLocation.selected !== undefined 
    ? updatedLocation.selected 
    : locations[index].selected;
  
  locations[index] = {
    ...updatedLocation,
    selected: selectedState
  };
  
  await saveTargetLocations(locations);
}

// Update multiple target locations in a single operation
export async function updateMultipleTargetLocations(updatedLocations: TargetLocation[]): Promise<void> {
  const currentLocations = await getTargetLocations();
  
  // Create a map for faster lookups
  const locationsMap = new Map(currentLocations.map(loc => [loc.id, loc]));
  
  // Update locations in the map
  for (const updatedLocation of updatedLocations) {
    const existingLocation = locationsMap.get(updatedLocation.id);
    
    if (existingLocation) {
      // Preserve the selected state if not provided
      const selectedState = updatedLocation.selected !== undefined 
        ? updatedLocation.selected 
        : existingLocation.selected;
      
      locationsMap.set(updatedLocation.id, {
        ...updatedLocation,
        selected: selectedState
      });
    }
  }
  
  // Convert map back to array
  const updatedLocationsArray = Array.from(locationsMap.values());
  
  // Save all locations at once
  await saveTargetLocations(updatedLocationsArray);
}

// Delete a target location
export async function deleteTargetLocation(id: string): Promise<void> {
  const locations = await getTargetLocations();
  const filtered = locations.filter(loc => loc.id !== id);
  
  if (filtered.length === locations.length) {
    throw new Error('Location not found');
  }
  
  await saveTargetLocations(filtered);
}

// Initialize the target locations file if it doesn't exist
export async function initializeTargetLocations(): Promise<void> {
  try {
    const fileExists = await pathExists(TARGET_LOCATIONS_FILE);
    if (!fileExists) {
      await writeJsonFile(TARGET_LOCATIONS_FILE, []);
    }
  } catch (error) {
    console.error('Error initializing target locations file:', error);
    throw error;
  }
}
