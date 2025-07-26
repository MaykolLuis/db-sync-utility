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
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
