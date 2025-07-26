import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AutoSaveData {
  timestamp: number
  sessionId: string
  data: {
    // Target locations unsaved changes
    targetLocations?: {
      hasUnsavedChanges: boolean
      originalLocations: any[]
      currentLocations: any[]
      lastModified: number
    }
    // Source directory unsaved changes
    sourceDirectory?: {
      path: string
      isValid: boolean
      lastModified: number
    }
    // Copy operation in progress
    copyOperation?: {
      inProgress: boolean
      sourcePath: string
      targetLocations: any[]
      progress: number
      phase: string
      startTime: number
    }
    // Settings changes
    settingsChanges?: {
      hasUnsavedChanges: boolean
      pendingSettings: any
      lastModified: number
    }
    // History entry being created
    historyEntry?: {
      inProgress: boolean
      entry: any
      lastModified: number
    }
  }
}

interface AutoRecoveryState {
  autoSaveData: AutoSaveData | null
  isRecoveryAvailable: boolean
  lastAutoSave: number
  sessionId: string
  autoSaveInterval: number // in milliseconds
  
  // Actions
  setAutoSaveData: (data: Partial<AutoSaveData['data']>) => void
  clearAutoSaveData: () => void
  initializeSession: () => void
  checkForRecovery: () => boolean
  getRecoveryData: () => AutoSaveData | null
  updateAutoSaveInterval: (interval: number) => void
  
  // Auto-save specific data types
  saveTargetLocationsState: (hasUnsavedChanges: boolean, originalLocations: any[], currentLocations: any[]) => void
  saveSourceDirectoryState: (path: string, isValid: boolean) => void
  saveCopyOperationState: (inProgress: boolean, sourcePath: string, targetLocations: any[], progress: number, phase: string, startTime?: number) => void
  saveSettingsChanges: (hasUnsavedChanges: boolean, pendingSettings: any) => void
  saveHistoryEntryState: (inProgress: boolean, entry: any) => void
  
  // Recovery actions
  clearTargetLocationsRecovery: () => void
  clearSourceDirectoryRecovery: () => void
  clearCopyOperationRecovery: () => void
  clearSettingsRecovery: () => void
  clearHistoryEntryRecovery: () => void
}

// Generate unique session ID
const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

export const useAutoRecoveryStore = create<AutoRecoveryState>()(
  persist(
    (set, get) => ({
      autoSaveData: null,
      isRecoveryAvailable: false,
      lastAutoSave: 0,
      sessionId: generateSessionId(),
      autoSaveInterval: 30000, // 30 seconds default
      
      setAutoSaveData: (data) => {
        const currentData = get().autoSaveData
        const newData: AutoSaveData = {
          timestamp: Date.now(),
          sessionId: get().sessionId,
          data: {
            ...currentData?.data,
            ...data
          }
        }
        
        set({ 
          autoSaveData: newData, 
          lastAutoSave: Date.now(),
          isRecoveryAvailable: true
        })
        
        console.log('Auto-save data updated:', newData)
      },
      
      clearAutoSaveData: () => {
        set({ 
          autoSaveData: null, 
          isRecoveryAvailable: false,
          lastAutoSave: 0
        })
        console.log('Auto-save data cleared')
      },
      
      initializeSession: () => {
        const newSessionId = generateSessionId()
        set({ sessionId: newSessionId })
        console.log('New session initialized:', newSessionId)
      },
      
      checkForRecovery: () => {
        const { autoSaveData } = get()
        if (!autoSaveData) return false
        
        // Check if recovery data is recent (within last 24 hours)
        const isRecent = Date.now() - autoSaveData.timestamp < 24 * 60 * 60 * 1000
        const hasData = Object.keys(autoSaveData.data).length > 0
        
        return isRecent && hasData
      },
      
      getRecoveryData: () => {
        return get().autoSaveData
      },
      
      updateAutoSaveInterval: (interval) => {
        set({ autoSaveInterval: interval })
      },
      
      // Specific auto-save methods
      saveTargetLocationsState: (hasUnsavedChanges, originalLocations, currentLocations) => {
        if (hasUnsavedChanges) {
          get().setAutoSaveData({
            targetLocations: {
              hasUnsavedChanges,
              originalLocations,
              currentLocations,
              lastModified: Date.now()
            }
          })
        }
      },
      
      saveSourceDirectoryState: (path, isValid) => {
        if (path && path.trim()) {
          get().setAutoSaveData({
            sourceDirectory: {
              path,
              isValid,
              lastModified: Date.now()
            }
          })
        }
      },
      
      saveCopyOperationState: (inProgress, sourcePath, targetLocations, progress, phase, startTime) => {
        get().setAutoSaveData({
          copyOperation: {
            inProgress,
            sourcePath,
            targetLocations,
            progress,
            phase,
            startTime: startTime || Date.now()
          }
        })
      },
      
      saveSettingsChanges: (hasUnsavedChanges, pendingSettings) => {
        if (hasUnsavedChanges) {
          get().setAutoSaveData({
            settingsChanges: {
              hasUnsavedChanges,
              pendingSettings,
              lastModified: Date.now()
            }
          })
        }
      },
      
      saveHistoryEntryState: (inProgress, entry) => {
        if (inProgress) {
          get().setAutoSaveData({
            historyEntry: {
              inProgress,
              entry,
              lastModified: Date.now()
            }
          })
        }
      },
      
      // Clear specific recovery data
      clearTargetLocationsRecovery: () => {
        const currentData = get().autoSaveData
        if (currentData) {
          const newData = { ...currentData.data }
          delete newData.targetLocations
          get().setAutoSaveData(newData)
        }
      },
      
      clearSourceDirectoryRecovery: () => {
        const currentData = get().autoSaveData
        if (currentData) {
          const newData = { ...currentData.data }
          delete newData.sourceDirectory
          get().setAutoSaveData(newData)
        }
      },
      
      clearCopyOperationRecovery: () => {
        const currentData = get().autoSaveData
        if (currentData) {
          const newData = { ...currentData.data }
          delete newData.copyOperation
          get().setAutoSaveData(newData)
        }
      },
      
      clearSettingsRecovery: () => {
        const currentData = get().autoSaveData
        if (currentData) {
          const newData = { ...currentData.data }
          delete newData.settingsChanges
          get().setAutoSaveData(newData)
        }
      },
      
      clearHistoryEntryRecovery: () => {
        const currentData = get().autoSaveData
        if (currentData) {
          const newData = { ...currentData.data }
          delete newData.historyEntry
          get().setAutoSaveData(newData)
        }
      }
    }),
    {
      name: 'auto-recovery-storage',
      partialize: (state) => ({
        autoSaveData: state.autoSaveData,
        isRecoveryAvailable: state.isRecoveryAvailable,
        lastAutoSave: state.lastAutoSave,
        autoSaveInterval: state.autoSaveInterval
      })
    }
  )
)
