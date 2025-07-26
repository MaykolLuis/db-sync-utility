import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { electronUtils } from '@/lib/electron-utils'

export interface AppSettings {
  showConfirmationBeforeCopy: boolean
  createBackupBeforeOverwrite: boolean
  autoCheckSourceChanges: boolean
  rememberSourcePath: boolean
  savedSourcePath: string
  historyRetentionDays: number
  historyItemsPerPage: number
  backupRetentionCount: number
  enableOldBackupDeletion: boolean
  deleteBackupsOlderThanDays: number
  enableAutoSave: boolean
  defaultStartupTab: string
  // Auto-update settings
  autoUpdateEnabled: boolean
  autoDownloadUpdates: boolean
  updateCheckInterval: number // hours
}

const DEFAULT_SETTINGS: AppSettings = {
  showConfirmationBeforeCopy: true,
  createBackupBeforeOverwrite: true,
  autoCheckSourceChanges: false,
  rememberSourcePath: true,
  savedSourcePath: '',
  historyRetentionDays: 30,
  historyItemsPerPage: 10,
  backupRetentionCount: 5,
  enableOldBackupDeletion: false,
  deleteBackupsOlderThanDays: 30,
  enableAutoSave: true,
  defaultStartupTab: 'source',
  // Auto-update settings
  autoUpdateEnabled: true,
  autoDownloadUpdates: false,
  updateCheckInterval: 4 // hours
}

interface SettingsState {
  settings: AppSettings
  isLoading: boolean
  error: string | null
  
  // Actions
  setSettings: (settings: Partial<AppSettings>) => void
  setSavedSourcePath: (path: string) => void
  resetSettings: () => void
  loadSettings: () => Promise<void>
  saveSettings: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      isLoading: false,
      error: null,
      
      setSettings: (newSettings) => {
        set((state) => ({ 
          settings: { ...state.settings, ...newSettings } 
        }))
      },
      
      setSavedSourcePath: (path) => {
        const { settings } = get()
        if (settings.rememberSourcePath) {
          set((state) => ({
            settings: { ...state.settings, savedSourcePath: path }
          }))
          // Auto-save when source path changes
          setTimeout(() => {
            get().saveSettings()
          }, 100)
        }
      },
      
      resetSettings: () => {
        set({ settings: DEFAULT_SETTINGS })
      },
      
      loadSettings: async () => {
        set({ isLoading: true, error: null })
        try {
          // Try to load settings from Electron API first
          if (window.electron?.loadSettingsFromFile) {
            const settingsJson = await window.electron.loadSettingsFromFile();
            
            if (settingsJson) {
              try {
                const loadedSettings = JSON.parse(settingsJson);
                set({ 
                  settings: { ...DEFAULT_SETTINGS, ...loadedSettings },
                  isLoading: false 
                });
                return;
              } catch (parseError) {
                console.error('Failed to parse settings from file:', parseError);
                // Continue to fallback
              }
            }
          }
          
          // Fallback to localStorage
          const savedSettings = localStorage.getItem('settings-storage');
          if (savedSettings) {
            const parsedSettings = JSON.parse(savedSettings);
            if (parsedSettings.state && parsedSettings.state.settings) {
              set({ 
                settings: { ...DEFAULT_SETTINGS, ...parsedSettings.state.settings },
                isLoading: false 
              });
            } else {
              set({ settings: DEFAULT_SETTINGS, isLoading: false });
            }
          } else {
            set({ settings: DEFAULT_SETTINGS, isLoading: false });
          }
        } catch (error) {
          console.error('Failed to load settings:', error)
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load settings', 
            isLoading: false 
          })
        }
      },
      
      saveSettings: async () => {
        set({ isLoading: true, error: null })
        try {
          const { settings } = get()
          // Save settings using the Electron API if available
          if (window.electron?.saveSettingsToFile) {
            await window.electron.saveSettingsToFile(JSON.stringify(settings))
          } else {
            // Fallback to localStorage (handled by persist middleware)
            localStorage.setItem('settings-storage', JSON.stringify({ state: { settings } }))
          }
          
          set({ isLoading: false })
        } catch (error) {
          console.error('Failed to save settings:', error)
          set({ 
            error: error instanceof Error ? error.message : 'Failed to save settings', 
            isLoading: false 
          })
        }
      }
    }),
    {
      name: 'settings-storage',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
)
