// Typy pro nastavení aplikace
export interface AppSettings {
  showConfirmationBeforeCopy: boolean
  createBackupBeforeOverwrite: boolean
  autoCheckSourceChanges: boolean
  historyRetentionDays: number
  darkMode: boolean
  defaultPresetId: string | null
  backupRetentionCount: number
  deleteBackupsOlderThanDays: number
  enableOldBackupDeletion: boolean
  historyItemsPerPage: number
  rememberSourcePath: boolean
}

// Výchozí nastavení
export const DEFAULT_SETTINGS: AppSettings = {
  showConfirmationBeforeCopy: true,
  createBackupBeforeOverwrite: true,
  autoCheckSourceChanges: false,
  historyRetentionDays: 30,
  darkMode: false,
  defaultPresetId: null,
  backupRetentionCount: 10,
  deleteBackupsOlderThanDays: 30,
  enableOldBackupDeletion: false,
  historyItemsPerPage: 10,
  rememberSourcePath: true,
}

// Uložení nastavení do localStorage a do souboru přes Electron IPC
export const saveSettings = (settings: AppSettings, skipFileSave = false, isInitialLoad = false) => {
  try {
    // Ensure we have a clean settings object with all required properties
    // Using a fresh object to avoid any duplicate fields or unexpected properties
    const cleanSettings: AppSettings = {
      showConfirmationBeforeCopy: Boolean(settings.showConfirmationBeforeCopy),
      createBackupBeforeOverwrite: Boolean(settings.createBackupBeforeOverwrite),
      autoCheckSourceChanges: Boolean(settings.autoCheckSourceChanges),
      historyRetentionDays: Number(settings.historyRetentionDays || 30),
      darkMode: Boolean(settings.darkMode),
      // Only include defaultPresetId if it's not null or undefined
      ...(settings.defaultPresetId !== null && settings.defaultPresetId !== undefined ? 
          { defaultPresetId: settings.defaultPresetId } : 
          { defaultPresetId: null }),
      backupRetentionCount: Number(settings.backupRetentionCount || 10),
      deleteBackupsOlderThanDays: Number(settings.deleteBackupsOlderThanDays || 30),
      enableOldBackupDeletion: Boolean(settings.enableOldBackupDeletion),
      historyItemsPerPage: Number(settings.historyItemsPerPage || 10),
      rememberSourcePath: Boolean(settings.rememberSourcePath)
    };
    
    // Log the clean settings object before stringifying
    console.log('Clean settings object before save:', JSON.stringify(cleanSettings));
    
    // Create a clean JSON string with proper formatting
    const settingsJson = JSON.stringify(cleanSettings, null, 2);
    
    // Save to localStorage
    localStorage.setItem("db-sync-settings", settingsJson);
    console.log('Settings saved to localStorage:', isInitialLoad ? '(silent - during initialization)' : '');
    
    // Save to file system if electron is available and skipFileSave is false
    if (window.electron && !skipFileSave) {
      console.log('Saving settings to file system...');
      // Make sure we're sending a clean JSON string
      window.electron.saveSettingsToFile(settingsJson);
    }
    
    return cleanSettings;
  } catch (error) {
    console.error("Chyba při ukládání nastavení:", error);
    return settings; // Return original settings if there was an error
  }
}

// Načtení nastavení z localStorage a z file systemu přes Electron IPC
export const loadSettings = (): AppSettings => {
  try {
    // First try to load from localStorage for immediate access
    const savedSettings = localStorage.getItem("db-sync-settings")
    if (savedSettings) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) }
    }
  } catch (error) {
    console.error("Chyba při načítání nastavení z localStorage:", error)
  }
  return DEFAULT_SETTINGS
}

// Asynchronní načtení nastavení z file systemu
export const loadSettingsAsync = async (): Promise<AppSettings> => {
  try {
    console.log('Starting loadSettingsAsync...');
    
    // Initialize with default settings
    let settings: AppSettings = { ...DEFAULT_SETTINGS };
    let fileSettingsLoaded = false;
    
    // First try to load from file system, which is the source of truth
    if (window.electron) {
      try {
        console.log('Attempting to load settings from file...');
        const fileSettings = await window.electron.loadSettingsFromFile()
        console.log('Raw file settings:', fileSettings);
        
        // Handle both string and object responses from IPC
        if (fileSettings) {
          try {
            let parsedSettings;
            
            // If fileSettings is already an object, use it directly
            if (typeof fileSettings === 'object') {
              console.log('File settings is already an object');
              parsedSettings = fileSettings;
            } 
            // If it's a string, try to parse it as JSON
            else if (typeof fileSettings === 'string' && fileSettings.trim()) {
              console.log('Parsing file settings from string');
              parsedSettings = JSON.parse(fileSettings);
            }
            
            console.log('Parsed file settings:', parsedSettings);
            
            // Validate the parsed settings
            if (parsedSettings && typeof parsedSettings === 'object') {
              // Merge with default settings
              settings = { 
                ...DEFAULT_SETTINGS, 
                ...parsedSettings 
              };
              fileSettingsLoaded = true;
              console.log('Settings loaded from file successfully');
              console.log('Default preset ID from file:', settings.defaultPresetId);
            }
          } catch (parseError) {
            console.error('Error parsing file settings:', parseError);
            // Continue with localStorage or default settings if file parsing fails
          }
        } else {
          console.log('No settings file found or file is empty, will check localStorage');
        }
      } catch (fileError) {
        console.error('Error loading settings from file:', fileError);
        // Continue with localStorage or default settings if file loading fails
      }
    }
    
    // If we couldn't load from file, try localStorage as fallback
    if (!fileSettingsLoaded) {
      const savedSettings = localStorage.getItem("db-sync-settings")
      console.log('Settings from localStorage:', savedSettings);
      
      if (savedSettings) {
        try {
          const parsedLocalSettings = JSON.parse(savedSettings);
          console.log('Parsed localStorage settings:', parsedLocalSettings);
          
          // Merge with default settings
          settings = { 
            ...DEFAULT_SETTINGS,
            ...parsedLocalSettings
          };
          console.log('Settings loaded from localStorage');
          console.log('Default preset ID from localStorage:', settings.defaultPresetId);
        } catch (parseError) {
          console.error('Error parsing localStorage settings:', parseError);
          // Continue with default settings if parsing fails
        }
      } else {
        console.log('No settings found in localStorage, using defaults');
      }
    } else {
      // If file settings were loaded successfully, update localStorage without triggering a save to file
      // Just update localStorage directly without calling saveSettings to avoid notifications
      const cleanSettingsJson = JSON.stringify(settings, null, 2);
      localStorage.setItem("db-sync-settings", cleanSettingsJson);
      console.log('Updated localStorage with file settings (silent update)');
    }
    
    console.log('Final settings:', settings);
    console.log('Final default preset ID:', settings.defaultPresetId);
    
    return settings;
  } catch (error) {
    console.error('Error in loadSettingsAsync:', error);
    return DEFAULT_SETTINGS;
  }
}
