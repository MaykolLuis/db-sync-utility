/**
 * Utility functions for file operations
 */

/**
 * Interface for progress information during file operations
 */
export interface ProgressInfo {
  progress: number
  fileName: string
  fileSize: number
  speed: number
  timeRemaining: number
  completedSize: number
}

/**
 * Copy files from source to target with progress tracking
 * @param sourcePath Source directory path
 * @param targetPath Target directory path
 * @param onProgress Progress callback (0-100)
 * @param onFileChange Callback when current file changes
 */
// Define interface for copied file information
export interface CopiedFile {
  name: string;
  size: number;
}

// Define interface for copy result
export interface CopyResult {
  success: boolean;
  error?: string;
  copiedFiles?: CopiedFile[];
}

export async function copyFilesWithProgress(
  sourcePath: string, 
  targetPath: string,
  onProgress: (progress: number) => void,
  onFileChange?: (fileName: string, fileSize: number) => void
): Promise<CopyResult> {
  try {
    // Check if we're running in Electron
    if (typeof window !== 'undefined' && (window as any).electron && 'copyFiles' in (window as any).electron) {
      // Start with 0% progress
      onProgress(0);
      
      // Use the actual Electron IPC method for file copying
      console.log(`Copying files from ${sourcePath} to ${targetPath} using Electron IPC`);
      
      // First, get the list of files that will be copied
      // This is a workaround since our IPC doesn't support progress callbacks directly
      // We'll simulate progress based on the number of files
      const filePatterns = ['*.mv.db', '*.trace.db']; // Default patterns for database files
      
      try {
        // Call the actual copyFiles method
        const result = await (window as any).electron.copyFiles(sourcePath, targetPath, filePatterns);
        
        // Debug: Log the entire result object to see what's coming back from IPC
        console.log('Raw result from Electron IPC copyFiles:', result);
        console.log('copiedFiles from IPC result:', result.copiedFiles);
        
        if (result.success) {
          // If copy was successful, update progress to 100%
          onProgress(100);
          
          // If we have file information, call the onFileChange callback
          if (result.copiedFiles && result.copiedFiles.length > 0 && onFileChange) {
            for (const file of result.copiedFiles) {
              // Log file size information for debugging
              console.log(`File copied via Electron: ${file.name} with size: ${file.size} bytes`);
              
              // Ensure we're passing a number for file size
              // Make sure we're handling the file size correctly - it should be a number
              let fileSize: number;
              if (typeof file.size === 'number') {
                fileSize = file.size;
              } else if (typeof file.size === 'string') {
                fileSize = parseInt(file.size, 10);
                if (isNaN(fileSize)) {
                  console.warn(`Invalid file size for ${file.name}: ${file.size}, using 0`);
                  fileSize = 0;
                }
              } else {
                console.warn(`Missing file size for ${file.name}, using 0`);
                fileSize = 0;
              }
              
              console.log(`Processed file size for ${file.name}: ${fileSize} bytes`);
              
              // Call the callback with file info
              onFileChange(file.name, fileSize);
            }
          }
          
          // Return success with the copied files array
          return { 
            success: true,
            copiedFiles: result.copiedFiles || []
          };
        } else {
          // If copy failed, return the error
          return { 
            success: false, 
            error: result.error || "Neznámá chyba při kopírování souborů"
          };
        }
      } catch (error) {
        console.error("Error calling Electron copyFiles:", error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : "Chyba při komunikaci s Electron procesem" 
        };
      }
    } else {
      // Fallback to simulation for development or when Electron is not available
      console.log("Electron copyFiles not available, using simulation");
      
      // Start with 0% progress
      onProgress(0);
      
      // Simulate file list retrieval with realistic file sizes based on logs
      const files = [
        { name: "configurations.mv.db", size: 198499312 },  // 198,499,312 bytes (189.3 MB) based on logs
        { name: "configurations.trace.db", size: 14940830 }  // 14,940,830 bytes (14.25 MB) based on logs
      ];
      
      let totalProgress = 0;
      const totalFiles = files.length;
      
      // Process each file
      for (const file of files) {
        // Notify about current file
        if (onFileChange) {
          onFileChange(file.name, file.size);
        }
        
        // Simulate copying with progress updates
        const fileProgress = await simulateFileCopy(file.size, (filePercent) => {
          // Calculate overall progress
          const fileContribution = filePercent / totalFiles;
          const newProgress = Math.round(totalProgress + fileContribution);
          onProgress(newProgress);
        });
        
        // Add this file's contribution to total progress
        totalProgress += 100 / totalFiles;
      }
      
      // Ensure we reach 100% at the end
      onProgress(100);
      
      return { success: true };
    }
  } catch (error) {
    console.error("Error copying files:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Neznámá chyba při kopírování souborů" 
    };
  }
}

/**
 * Simulate copying a file with progress updates
 * @param fileSize Size of the file in bytes
 * @param onProgress Progress callback (0-100)
 */
async function simulateFileCopy(
  fileSize: number, 
  onProgress: (progress: number) => void
): Promise<void> {
  return new Promise((resolve) => {
    let progress = 0;
    const totalChunks = 20; // Simulate copying in chunks
    let chunksDone = 0;
    
    const interval = setInterval(() => {
      chunksDone++;
      progress = Math.round((chunksDone / totalChunks) * 100);
      onProgress(progress);
      
      if (chunksDone >= totalChunks) {
        clearInterval(interval);
        resolve();
      }
    }, 100 + Math.random() * 200); // Random delay between 100-300ms per chunk
  });
}

/**
 * Copy files to a specific target with progress tracking
 * @param sourcePath Source directory path
 * @param targetPath Target directory path
 * @param targetId Target ID for status tracking
 * @param onProgress Progress callback (0-100)
 */
export async function copyFilesToTarget(
  sourcePath: string,
  targetPath: string,
  targetId: string,
  onProgress: (progress: ProgressInfo) => void
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Starting copy operation from ${sourcePath} to ${targetPath} (targetId: ${targetId})`);
    
    // Initialize file information
    let currentFile = "";
    let currentFileSize = 0;
    let currentSpeed = 0;
    let timeRemaining = 0;
    let copyStartTime = Date.now();
    let lastProgressUpdate = Date.now();
    let bytesProcessed = 0;
    
    // Define file patterns to copy (database files)
    const filePatterns = ['*.mv.db', '*.trace.db'];
    
    // Check if we're running in Electron and can use the actual file system
    const isElectronAvailable = typeof window !== 'undefined' && 
                               window.electron && 
                               'copyFiles' in window.electron;
                               
    console.log(`Using Electron for file operations: ${isElectronAvailable}`);
    
    // Start copy operation with progress tracking
    const result = await copyFilesWithProgress(
      sourcePath,
      targetPath,
      (progress) => {
        // Calculate speed and time remaining based on progress
        const now = Date.now();
        const elapsedMs = now - copyStartTime;
        const progressDelta = now - lastProgressUpdate;
        
        // Only update calculations if enough time has passed (avoid division by zero)
        if (progressDelta > 100) {
          // Estimate bytes processed based on progress percentage
          const estimatedTotalBytes = currentFileSize * (filePatterns.length || 1);
          bytesProcessed = Math.floor(estimatedTotalBytes * (progress / 100));
          
          // Calculate speed in bytes per second
          if (elapsedMs > 0) {
            currentSpeed = Math.floor(bytesProcessed / (elapsedMs / 1000));
          }
          
          // Calculate time remaining in seconds
          if (progress > 0 && currentSpeed > 0) {
            const remainingBytes = estimatedTotalBytes - bytesProcessed;
            timeRemaining = Math.ceil(remainingBytes / currentSpeed);
          }
          
          lastProgressUpdate = now;
        }
        
        // Debug log for file size tracking
        console.log(`Progress update - File: ${currentFile}, Size: ${formatFileSize(currentFileSize)}, Progress: ${progress}%`);
        
        // Update progress with additional information
        onProgress({
          progress,
          fileName: currentFile,
          fileSize: currentFileSize,
          speed: currentSpeed,
          timeRemaining,
          completedSize: bytesProcessed
        });
      },
      (fileName, fileSize) => {
        // Update current file information
        currentFile = fileName;
        currentFileSize = fileSize;
        console.log(`Copying file: ${fileName}, size: ${formatFileSize(fileSize)} (${fileSize} bytes)`);
        
        // Reset timing information for the new file
        copyStartTime = Date.now();
        lastProgressUpdate = Date.now();
        bytesProcessed = 0;
      }
    );
    
    if (result.success) {
      console.log(`Successfully copied files to ${targetPath}`);
    } else {
      console.error(`Failed to copy files to ${targetPath}:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error("Error in copyFilesToTarget:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Neznámá chyba při kopírování souborů"
    };
  }
}


/**
 * Format file size in bytes to a human-readable string
 * @param bytes File size in bytes
 * @returns Formatted file size string
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  // Round to 2 decimal places
  const size = parseFloat((bytes / Math.pow(1024, i)).toFixed(2));
  
  return `${size} ${units[i]}`;
}
