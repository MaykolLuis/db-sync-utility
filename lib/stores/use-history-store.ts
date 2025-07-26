import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { HistoryEntry } from '@/app/types'
import { loadHistory, saveHistory } from '@/app/lib/history-utils'
import { getNextVersionNumber } from '@/app/lib/version-utils'

interface HistoryState {
  history: HistoryEntry[]
  isLoading: boolean
  error: string | null
  currentUpdateEntry: HistoryEntry | null
  
  // Actions
  setHistory: (history: HistoryEntry[]) => void
  addHistoryEntry: (entry: Partial<HistoryEntry>) => void
  updateHistoryEntry: (id: number | string, updates: Partial<HistoryEntry>) => void
  removeHistoryEntry: (id: number | string) => void
  setCurrentUpdateEntry: (entry: HistoryEntry | null) => void
  loadHistoryEntries: () => Promise<void>
  saveHistoryEntries: () => Promise<void>
  createHistoryEntryWithVersion: (entry: Partial<HistoryEntry>) => Promise<HistoryEntry>
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      history: [],
      isLoading: false,
      error: null,
      currentUpdateEntry: null,
      
      setHistory: (history) => set({ history }),
      
      addHistoryEntry: (entry) => {
        const newEntry = { 
          ...entry,
          id: entry.id || Date.now(),
          timestamp: entry.timestamp || Date.now()
        }
        
        set((state) => ({ 
          history: [newEntry as HistoryEntry, ...state.history] 
        }))
      },
      
      updateHistoryEntry: (id, updates) => {
        console.log('updateHistoryEntry called with:', { id, updates });
        if (updates.copyResults) {
          console.log('copyResults being stored:', updates.copyResults);
          updates.copyResults.forEach((result, index) => {
            console.log(`copyResult[${index}]:`, {
              targetId: result.targetId,
              success: result.success,
              duration: result.duration,
              durationType: typeof result.duration
            });
          });
        }
        
        set((state) => ({
          history: state.history.map((entry) => 
            (entry.id === id) ? { ...entry, ...updates } : entry
          )
        }))
      },
      
      removeHistoryEntry: (id) => {
        set((state) => ({
          history: state.history.filter((entry) => entry.id !== id)
        }))
      },
      
      setCurrentUpdateEntry: (entry) => set({ currentUpdateEntry: entry }),
      
      loadHistoryEntries: async () => {
        set({ isLoading: true, error: null })
        try {
          const history = await loadHistory()
          if (history && history.length > 0) {
            console.log(`Loaded ${history.length} history entries from file`)
            // Debug: Check if version exists in history entries and copyResults data
            history.forEach((entry, index) => {
              console.log(`History entry ${index} - ID: ${entry.id}, Version: ${entry.version || 'undefined'}`);
              if (entry.copyResults && entry.copyResults.length > 0) {
                console.log(`  copyResults (${entry.copyResults.length} items):`);
                entry.copyResults.forEach((result, resultIndex) => {
                  console.log(`    [${resultIndex}]:`, {
                    targetId: result.targetId,
                    success: result.success,
                    duration: result.duration,
                    durationType: typeof result.duration
                  });
                });
              } else {
                console.log('  No copyResults found');
              }
            })
            set({ history, isLoading: false })
          } else {
            set({ history: [], isLoading: false })
          }
        } catch (error) {
          console.error('Failed to load history:', error)
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load history', 
            isLoading: false 
          })
        }
      },
      
      saveHistoryEntries: async () => {
        set({ isLoading: true, error: null })
        try {
          const { history } = get()
          await saveHistory(history)
          set({ isLoading: false })
        } catch (error) {
          console.error('Failed to save history:', error)
          set({ 
            error: error instanceof Error ? error.message : 'Failed to save history', 
            isLoading: false 
          })
        }
      },
      
      createHistoryEntryWithVersion: async (entryData) => {
        const { history } = get()
        // Get next version number based on existing history
        const nextVersion = await getNextVersionNumber()
        console.log(`Creating new history entry with version: ${nextVersion}`)
        
        const newEntry: HistoryEntry = {
          id: Date.now(),
          timestamp: Date.now(),
          version: nextVersion,
          ...entryData
        } as HistoryEntry
        
        set((state) => ({ 
          history: [newEntry, ...state.history] 
        }))
        
        return newEntry
      }
    }),
    {
      name: 'history-storage',
      partialize: (state) => ({ history: state.history }),
    }
  )
)
