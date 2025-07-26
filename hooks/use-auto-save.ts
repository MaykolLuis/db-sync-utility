import { useEffect, useRef, useCallback } from 'react'
import { useAutoRecoveryStore } from '@/lib/stores/use-auto-recovery-store'
import { useSettingsStore } from '@/lib/stores/use-settings-store'

// Safe auto-save implementation that prevents infinite loops
export function useSafeAutoSave(
  enabled: boolean,
  saveFunction: () => void,
  interval: number = 15000
) {
  const { settings } = useSettingsStore()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastSaveRef = useRef<number>(0)
  const enabledRef = useRef(enabled)
  const saveFunctionRef = useRef(saveFunction)
  
  // Update refs without causing re-renders
  useEffect(() => {
    enabledRef.current = enabled
    saveFunctionRef.current = saveFunction
  }, [enabled, saveFunction])

  // Auto-save function that's stable
  const performAutoSave = useCallback(() => {
    const now = Date.now()
    
    // Prevent too frequent auto-saves (minimum 10 seconds between saves)
    if (now - lastSaveRef.current < 10000) {
      return
    }

    lastSaveRef.current = now
    
    if (enabledRef.current && saveFunctionRef.current) {
      try {
        saveFunctionRef.current()
        console.log('Auto-save performed at:', new Date(now).toLocaleTimeString('cs-CZ'))
      } catch (error) {
        console.error('Auto-save error:', error)
      }
    }
  }, []) // Empty dependency array to prevent infinite loops

  // Set up auto-save interval
  useEffect(() => {
    if (!enabled || !settings.enableAutoSave) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Set up new interval
    intervalRef.current = setInterval(() => {
      performAutoSave()
    }, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [interval, performAutoSave, settings.enableAutoSave])

  // Manual save function
  const manualSave = useCallback(() => {
    performAutoSave()
  }, [performAutoSave])

  return {
    manualSave,
    isAutoSaveEnabled: enabled
  }
}

// Safe hook for saving target locations state
export function useTargetLocationsAutoSave(
  hasUnsavedChanges: boolean,
  originalLocations: any[],
  currentLocations: any[]
) {
  const { saveTargetLocationsState } = useAutoRecoveryStore()
  
  const saveState = useCallback(() => {
    if (hasUnsavedChanges) {
      saveTargetLocationsState(hasUnsavedChanges, originalLocations, currentLocations)
    }
  }, [hasUnsavedChanges, originalLocations, currentLocations, saveTargetLocationsState])

  useSafeAutoSave(hasUnsavedChanges, saveState, 15000)

  return { saveState }
}

// Safe hook for saving source directory state
export function useSourceDirectoryAutoSave(path: string, isValid: boolean) {
  const { saveSourceDirectoryState } = useAutoRecoveryStore()
  
  const saveState = useCallback(() => {
    if (path && path.trim()) {
      saveSourceDirectoryState(path, isValid)
    }
  }, [path, isValid, saveSourceDirectoryState])

  useSafeAutoSave(!!(path && path.trim()), saveState, 20000)

  return { saveState }
}

// Safe hook for saving copy operation state
export function useCopyOperationAutoSave(
  inProgress: boolean,
  sourcePath: string,
  targetLocations: any[],
  progress: number,
  phase: string,
  startTime?: number
) {
  const { saveCopyOperationState, clearCopyOperationRecovery } = useAutoRecoveryStore()
  
  const saveState = useCallback(() => {
    if (inProgress) {
      saveCopyOperationState(inProgress, sourcePath, targetLocations, progress, phase, startTime)
    } else {
      clearCopyOperationRecovery()
    }
  }, [inProgress, sourcePath, targetLocations, progress, phase, startTime, saveCopyOperationState, clearCopyOperationRecovery])

  useSafeAutoSave(inProgress, saveState, 5000)

  // Cleanup recovery data when component unmounts
  useEffect(() => {
    return () => {
      // Clear recovery data on unmount to prevent stale recovery dialogs
      clearCopyOperationRecovery()
    }
  }, [clearCopyOperationRecovery])

  // Save state immediately when operation starts or ends
  const prevInProgressRef = useRef(inProgress)
  useEffect(() => {
    // If operation just completed (was in progress, now not), immediately clear recovery data
    if (prevInProgressRef.current && !inProgress) {
      console.log('Copy operation completed - clearing recovery data immediately')
      clearCopyOperationRecovery()
    }
    prevInProgressRef.current = inProgress
    if (prevInProgressRef.current !== inProgress) {
      prevInProgressRef.current = inProgress
      saveState()
    }
  }, [inProgress, saveState])

  return { saveState }
}

// Hook for saving settings changes
export function useSettingsAutoSave(hasUnsavedChanges: boolean, pendingSettings: any) {
  const { saveSettingsChanges } = useAutoRecoveryStore()

  const saveState = useCallback(() => {
    if (hasUnsavedChanges) {
      saveSettingsChanges(hasUnsavedChanges, pendingSettings)
    }
  }, [hasUnsavedChanges, pendingSettings, saveSettingsChanges])

  useSafeAutoSave(hasUnsavedChanges, saveState, 20000)

  return { saveState }
}

// Hook for saving history entry state
export function useHistoryEntryAutoSave(inProgress: boolean, entry: any) {
  const { saveHistoryEntryState, clearHistoryEntryRecovery } = useAutoRecoveryStore()

  const saveState = useCallback(() => {
    if (inProgress) {
      saveHistoryEntryState(inProgress, entry)
    } else {
      // Clear recovery data when entry is complete
      clearHistoryEntryRecovery()
    }
  }, [inProgress, entry, saveHistoryEntryState, clearHistoryEntryRecovery])

  useSafeAutoSave(inProgress, saveState, 10000)

  return { saveState }
}
