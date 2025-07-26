// Extended Electron API types for stores
declare global {
  interface Window {
    electron: {
      // Target locations persistence
      loadTargetLocations?: () => Promise<any[]>;
      saveTargetLocations?: (locations: any[]) => Promise<{ success: boolean; error?: string }>;
      
      // Directory operations
      getDirectorySize?: (dirPath: string) => Promise<{ success: boolean; size?: number; error?: string }>;
      
      // Other methods (extend as needed)
      [key: string]: any;
    };
  }
}

export {};
