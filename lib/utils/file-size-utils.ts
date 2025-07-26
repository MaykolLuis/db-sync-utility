/**
 * Utility functions for file size formatting and calculations
 */

/**
 * Format file size in bytes to human-readable format
 * @param bytes - Size in bytes
 * @returns Formatted size string (e.g., "1.2 MB", "345 KB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return `${bytes} B`; // Handle negative values
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  
  // Handle small decimal values
  if (bytes < 1) {
    return `${bytes} B`;
  }
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  // Make sure we don't exceed the array bounds
  const sizeIndex = Math.min(i, sizes.length - 1);
  
  const value = bytes / Math.pow(k, i);
  const formattedValue = value % 1 === 0 ? value.toString() : value.toFixed(1);
  return formattedValue + ' ' + sizes[sizeIndex];
}

/**
 * Get directory size using Electron IPC
 * @param dirPath - Directory path to calculate size for
 * @returns Promise with size result
 */
export async function getDirectorySize(dirPath: string): Promise<{ success: boolean; size?: number; error?: string }> {
  try {
    if (!(window as any).electron?.getDirectorySize) {
      return { success: false, error: 'Directory size API not available' };
    }
    
    const result = await (window as any).electron.getDirectorySize(dirPath);
    return result;
  } catch (error) {
    console.error('Error getting directory size:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get formatted directory size
 * @param dirPath - Directory path to calculate size for
 * @returns Promise with formatted size string or error
 */
export async function getFormattedDirectorySize(dirPath: string): Promise<{ success: boolean; formattedSize?: string; error?: string }> {
  const result = await getDirectorySize(dirPath);
  
  if (!result.success || result.size === undefined) {
    return { success: false, error: result.error };
  }
  
  return {
    success: true,
    formattedSize: formatFileSize(result.size)
  };
}
