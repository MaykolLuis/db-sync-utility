'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DeveloperModeState {
  isDeveloperMode: boolean;
  toggleDeveloperMode: () => void;
  setDeveloperMode: (enabled: boolean) => void;
}

export const useDeveloperModeStore = create<DeveloperModeState>()((set, get) => ({
  isDeveloperMode: false,
  toggleDeveloperMode: () => {
    console.log('Toggle clicked! Current state:', get().isDeveloperMode);
    set((state) => {
      const newState = !state.isDeveloperMode;
      console.log('Setting new state:', newState);
      return { isDeveloperMode: newState };
    });
  },
  setDeveloperMode: (enabled: boolean) => {
    console.log('Setting developer mode to:', enabled);
    set({ isDeveloperMode: enabled });
  },
}));
