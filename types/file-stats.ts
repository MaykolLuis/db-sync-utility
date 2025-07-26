// Define FileStats interface for use across the application
export interface FileStats {
  size: number;
  mtime: number;  // Timestamp in milliseconds
  isFile: boolean;
  isDirectory: boolean;
  mode: number;
  birthtime: number;  // Timestamp in milliseconds
  atime: number;     // Timestamp in milliseconds
  ctime: number;     // Timestamp in milliseconds
}
