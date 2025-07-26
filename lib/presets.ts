import { Preset } from "@/app/types"
import { readJsonFile, writeJsonFile } from './fs-utils'
import { loadSettings, saveSettings } from './settings'

const PRESETS_FILE = 'presets.json'

// Load presets from file
export async function getPresets(): Promise<Preset[]> {
  try {
    return await readJsonFile<Preset[]>(PRESETS_FILE)
  } catch (error) {
    console.error('Error reading presets:', error)
    // Return empty array if there's an error reading the file
    return []
  }
}

// Save presets to file
export async function savePresets(presets: Preset[]): Promise<void> {
  try {
    await writeJsonFile(PRESETS_FILE, presets)
  } catch (error) {
    console.error('Error saving presets:', error)
    throw error
  }
}

// Delete a preset by ID
export async function deletePreset(id: string): Promise<void> {
  try {
    const presets = await getPresets()
    const updatedPresets = presets.filter(preset => preset.id !== id)
    await savePresets(updatedPresets)
  } catch (error) {
    console.error('Error deleting preset:', error)
    throw error
  }
}

// Set a preset as default
export async function setDefaultPreset(id: string): Promise<void> {
  try {
    // If id is empty string, we're clearing the default preset
    if (id !== '') {
      const presets = await getPresets()
      const presetExists = presets.some(preset => preset.id === id)
      
      if (!presetExists) {
        throw new Error('Preset not found')
      }
    }
    
    // Save the default preset ID to settings using localStorage
    const settings = loadSettings()
    settings.defaultPresetId = id || null
    saveSettings(settings)
    
    console.log(`Default preset ${id ? `set to: ${id}` : 'cleared'}`)
  } catch (error) {
    console.error('Error setting default preset:', error)
    throw error
  }
}
