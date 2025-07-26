import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { TargetLocation } from '@/app/types'
import { electronUtils } from '@/lib/electron-utils'
import './electron-api.d.ts'

interface TargetLocationsState {
  targetLocations: TargetLocation[]
  isLoading: boolean
  error: string | null
  
  // Actions
  setTargetLocations: (locations: TargetLocation[]) => void
  addTargetLocation: (location: TargetLocation) => { success: boolean; error?: string }
  updateTargetLocation: (id: string, updates: Partial<TargetLocation>) => { success: boolean; error?: string }
  removeTargetLocation: (id: string) => void
  toggleTargetLocationSelection: (id: string) => void
  selectAllTargetLocations: (selected: boolean) => void
  loadTargetLocations: () => Promise<void>
  saveTargetLocations: () => Promise<void>
  updateTargetLocationSize: (id: string, size: number, sizeFormatted: string) => void
  // Validation methods
  isDuplicateName: (name: string, excludeId?: string) => boolean
  isDuplicatePath: (path: string, excludeId?: string) => boolean
}

// Helper function to generate a unique ID
const generateId = () => `loc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

export const useTargetLocationsStore = create<TargetLocationsState>()(
  persist(
    (set, get) => ({
      targetLocations: [],
      isLoading: false,
      error: null,
      
      setTargetLocations: (locations) => set({ targetLocations: locations }),
      
      addTargetLocation: (location) => {
        const state = get()
        
        // Check for duplicate name (case-insensitive)
        if (location.name && location.name.trim()) {
          const duplicateName = state.targetLocations.some(loc => 
            loc.name.toLowerCase().trim() === location.name.toLowerCase().trim()
          )
          if (duplicateName) {
            return { success: false, error: `Lokace s názvem "${location.name}" již existuje` }
          }
        }
        
        // Check for duplicate path (case-insensitive, normalize path separators)
        if (location.path && location.path.trim()) {
          const normalizedPath = location.path.toLowerCase().trim().replace(/[\\/]+/g, '/')
          const duplicatePath = state.targetLocations.some(loc => {
            if (!loc.path) return false
            const existingPath = loc.path.toLowerCase().trim().replace(/[\\/]+/g, '/')
            return existingPath === normalizedPath
          })
          if (duplicatePath) {
            return { success: false, error: `Lokace s cestou "${location.path}" již existuje` }
          }
        }
        
        const newLocation = { ...location, id: location.id || generateId() }
        set((state) => ({ 
          targetLocations: [...state.targetLocations, newLocation] 
        }))
        return { success: true }
      },
      
      updateTargetLocation: (id, updates) => {
        const state = get()
        
        // Check for duplicate name (excluding current location)
        if (updates.name !== undefined && updates.name.trim()) {
          const duplicateName = state.targetLocations.some(loc => 
            loc.id !== id && loc.name.toLowerCase().trim() === updates.name!.toLowerCase().trim()
          )
          if (duplicateName) {
            return { success: false, error: `Lokace s názvem "${updates.name}" již existuje` }
          }
        }
        
        // Check for duplicate path (excluding current location)
        if (updates.path !== undefined && updates.path.trim()) {
          const normalizedPath = updates.path.toLowerCase().trim().replace(/[\\/]+/g, '/')
          const duplicatePath = state.targetLocations.some(loc => {
            if (loc.id === id || !loc.path) return false
            const existingPath = loc.path.toLowerCase().trim().replace(/[\\/]+/g, '/')
            return existingPath === normalizedPath
          })
          if (duplicatePath) {
            return { success: false, error: `Lokace s cestou "${updates.path}" již existuje` }
          }
        }
        
        set((state) => ({
          targetLocations: state.targetLocations.map((location) => 
            location.id === id ? { ...location, ...updates } : location
          )
        }))
        return { success: true }
      },
      
      removeTargetLocation: (id) => {
        set((state) => ({
          targetLocations: state.targetLocations.filter((location) => location.id !== id)
        }))
      },
      
      toggleTargetLocationSelection: (id) => {
        set((state) => ({
          targetLocations: state.targetLocations.map((location) => 
            location.id === id 
              ? { ...location, selected: !location.selected } 
              : location
          )
        }))
      },
      
      selectAllTargetLocations: (selected) => {
        set((state) => ({
          targetLocations: state.targetLocations.map((location) => 
            ({ ...location, selected })
          )
        }))
      },
      
      loadTargetLocations: async () => {
        set({ isLoading: true, error: null })
        try {
          // Load from Electron file system
          if (window.electron && window.electron.loadTargetLocations) {
            const locations = await window.electron.loadTargetLocations()
            set({ targetLocations: locations || [], isLoading: false })
          } else {
            // Fallback to localStorage for web development
            const savedLocations = localStorage.getItem('db-sync-target-locations')
            if (savedLocations) {
              const locations = JSON.parse(savedLocations) as TargetLocation[]
              set({ targetLocations: locations, isLoading: false })
            } else {
              set({ targetLocations: [], isLoading: false })
            }
          }
        } catch (error) {
          console.error('Failed to load target locations:', error)
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load target locations', 
            isLoading: false 
          })
        }
      },
      
      saveTargetLocations: async () => {
        set({ isLoading: true, error: null })
        try {
          const { targetLocations } = get()
          
          // Save to Electron file system
          if (window.electron && window.electron.saveTargetLocations) {
            await window.electron.saveTargetLocations(targetLocations)
          } else {
            // Fallback to localStorage for web development
            localStorage.setItem('db-sync-target-locations', JSON.stringify(targetLocations))
          }
          
          set({ isLoading: false })
        } catch (error) {
          console.error('Failed to save target locations:', error)
          set({ 
            error: error instanceof Error ? error.message : 'Failed to save target locations', 
            isLoading: false 
          })
        }
      },
      
      updateTargetLocationSize: (id, size, sizeFormatted) => {
        set(state => ({
          targetLocations: state.targetLocations.map(location =>
            location.id === id
              ? { ...location, size, sizeFormatted }
              : location
          )
        }))
        // Auto-save after updating size
        setTimeout(() => {
          get().saveTargetLocations()
        }, 100)
      },
      
      // Validation helper methods
      isDuplicateName: (name, excludeId) => {
        const { targetLocations } = get()
        if (!name || !name.trim()) return false
        
        return targetLocations.some(loc => 
          loc.id !== excludeId && 
          loc.name.toLowerCase().trim() === name.toLowerCase().trim()
        )
      },
      
      isDuplicatePath: (path, excludeId) => {
        const { targetLocations } = get()
        if (!path || !path.trim()) return false
        
        const normalizedPath = path.toLowerCase().trim().replace(/[\\/]+/g, '/')
        return targetLocations.some(loc => {
          if (loc.id === excludeId || !loc.path) return false
          const existingPath = loc.path.toLowerCase().trim().replace(/[\\/]+/g, '/')
          return existingPath === normalizedPath
        })
      }
    }),
    {
      name: 'target-locations-storage',
      // Only persist the targetLocations array
      partialize: (state) => ({ targetLocations: state.targetLocations }),
    }
  )
)
