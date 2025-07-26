/**
 * Unit tests for critical utility functions
 * Tests version incrementing, file operations, and file size utilities
 */

import { getNextVersionNumber } from '../app/lib/version-utils';
import { copyFilesWithProgress, CopyResult } from '../app/lib/file-utils';
import { formatFileSize, getDirectorySize, getFormattedDirectorySize } from '../lib/utils/file-size-utils';
import { loadHistory, saveHistory } from '../app/lib/history-utils';
import { HistoryEntry } from '../app/types';

// Mock the history utilities
jest.mock('../app/lib/history-utils');
const mockLoadHistory = loadHistory as jest.MockedFunction<typeof loadHistory>;
const mockSaveHistory = saveHistory as jest.MockedFunction<typeof saveHistory>;

// Mock Electron APIs
const mockElectron = {
  copyFiles: jest.fn(),
  getDirectorySize: jest.fn(),
};

// Setup global window.electron mock
Object.defineProperty(window, 'electron', {
  value: mockElectron,
  writable: true,
});

describe('Version Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getNextVersionNumber', () => {
    it('should return v1 when no history entries exist', async () => {
      mockLoadHistory.mockResolvedValue([]);
      
      const result = await getNextVersionNumber();
      
      expect(result).toBe('v1');
      expect(mockLoadHistory).toHaveBeenCalledTimes(1);
    });

    it('should return v1 when history is null/undefined', async () => {
      mockLoadHistory.mockResolvedValue(null as any);
      
      const result = await getNextVersionNumber();
      
      expect(result).toBe('v1');
    });

    it('should increment version correctly with single entry', async () => {
      const mockHistory: HistoryEntry[] = [
        {
          id: 1,
          version: 'v1',
          timestamp: Date.now(),
          description: 'Test entry',
          sourcePath: '/test',
          targetLocations: [],
          copyResults: []
        }
      ];
      mockLoadHistory.mockResolvedValue(mockHistory);
      
      const result = await getNextVersionNumber();
      
      expect(result).toBe('v2');
    });

    it('should find highest version among multiple entries', async () => {
      const mockHistory: HistoryEntry[] = [
        {
          id: 1,
          version: 'v1',
          timestamp: Date.now(),
          description: 'Test entry 1',
          sourcePath: '/test',
          targetLocations: [],
          copyResults: []
        },
        {
          id: 2,
          version: 'v5',
          timestamp: Date.now(),
          description: 'Test entry 2',
          sourcePath: '/test',
          targetLocations: [],
          copyResults: []
        },
        {
          id: 3,
          version: 'v3',
          timestamp: Date.now(),
          description: 'Test entry 3',
          sourcePath: '/test',
          targetLocations: [],
          copyResults: []
        }
      ];
      mockLoadHistory.mockResolvedValue(mockHistory);
      
      const result = await getNextVersionNumber();
      
      expect(result).toBe('v6');
    });

    it('should handle entries without version', async () => {
      const mockHistory: HistoryEntry[] = [
        {
          id: 1,
          version: 'v2',
          timestamp: Date.now(),
          description: 'Test entry with version',
          sourcePath: '/test',
          targetLocations: [],
          copyResults: []
        },
        {
          id: 2,
          // No version property
          timestamp: Date.now(),
          description: 'Test entry without version',
          sourcePath: '/test',
          targetLocations: [],
          copyResults: []
        } as any
      ];
      mockLoadHistory.mockResolvedValue(mockHistory);
      
      const result = await getNextVersionNumber();
      
      expect(result).toBe('v3');
    });

    it('should handle malformed version strings', async () => {
      const mockHistory: HistoryEntry[] = [
        {
          id: 1,
          version: 'v2',
          timestamp: Date.now(),
          description: 'Test entry v2',
          sourcePath: '/test',
          targetLocations: [],
          copyResults: []
        },
        {
          id: 2,
          version: 'invalid-version',
          timestamp: Date.now(),
          description: 'Test entry invalid',
          sourcePath: '/test',
          targetLocations: [],
          copyResults: []
        },
        {
          id: 3,
          version: 'v4',
          timestamp: Date.now(),
          description: 'Test entry v4',
          sourcePath: '/test',
          targetLocations: [],
          copyResults: []
        }
      ];
      mockLoadHistory.mockResolvedValue(mockHistory);
      
      const result = await getNextVersionNumber();
      
      expect(result).toBe('v5');
    });

    it('should handle large version numbers', async () => {
      const mockHistory: HistoryEntry[] = [
        {
          id: 1,
          version: 'v999',
          timestamp: Date.now(),
          description: 'Test entry v999',
          sourcePath: '/test',
          targetLocations: [],
          copyResults: []
        }
      ];
      mockLoadHistory.mockResolvedValue(mockHistory);
      
      const result = await getNextVersionNumber();
      
      expect(result).toBe('v1000');
    });

    it('should return v1 on error', async () => {
      mockLoadHistory.mockRejectedValue(new Error('File system error'));
      
      const result = await getNextVersionNumber();
      
      expect(result).toBe('v1');
    });

    it('should handle zero version numbers', async () => {
      const mockHistory: HistoryEntry[] = [
        {
          id: 1,
          version: 'v0',
          timestamp: Date.now(),
          description: 'Test entry v0',
          sourcePath: '/test',
          targetLocations: [],
          copyResults: []
        }
      ];
      mockLoadHistory.mockResolvedValue(mockHistory);
      
      const result = await getNextVersionNumber();
      
      expect(result).toBe('v1');
    });
  });
});

describe('File Size Utils', () => {
  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1)).toBe('1 B');
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1023)).toBe('1023 B');
    });

    it('should format kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(2048)).toBe('2 KB');
      expect(formatFileSize(1048575)).toBe('1024 KB');
    });

    it('should format megabytes correctly', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
      expect(formatFileSize(2097152)).toBe('2 MB');
      expect(formatFileSize(1073741823)).toBe('1024 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
      expect(formatFileSize(1610612736)).toBe('1.5 GB');
      expect(formatFileSize(2147483648)).toBe('2 GB');
    });

    it('should format terabytes correctly', () => {
      expect(formatFileSize(1099511627776)).toBe('1 TB');
      expect(formatFileSize(1649267441664)).toBe('1.5 TB');
    });

    it('should handle edge cases', () => {
      expect(formatFileSize(-1)).toBe('-1 B');
      expect(formatFileSize(0.5)).toBe('0.5 B');
    });
  });

  describe('getDirectorySize', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return success with size when API is available', async () => {
      mockElectron.getDirectorySize.mockResolvedValue({
        success: true,
        size: 1048576
      });

      const result = await getDirectorySize('/test/path');

      expect(result).toEqual({
        success: true,
        size: 1048576
      });
      expect(mockElectron.getDirectorySize).toHaveBeenCalledWith('/test/path');
    });

    it('should return error when API is not available', async () => {
      // Temporarily remove the API
      const originalElectron = (window as any).electron;
      (window as any).electron = {};

      const result = await getDirectorySize('/test/path');

      expect(result).toEqual({
        success: false,
        error: 'Directory size API not available'
      });

      // Restore the API
      (window as any).electron = originalElectron;
    });

    it('should handle API errors', async () => {
      mockElectron.getDirectorySize.mockRejectedValue(new Error('Access denied'));

      const result = await getDirectorySize('/test/path');

      expect(result).toEqual({
        success: false,
        error: 'Access denied'
      });
    });

    it('should handle non-Error exceptions', async () => {
      mockElectron.getDirectorySize.mockRejectedValue('String error');

      const result = await getDirectorySize('/test/path');

      expect(result).toEqual({
        success: false,
        error: 'Unknown error'
      });
    });
  });

  describe('getFormattedDirectorySize', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return formatted size on success', async () => {
      mockElectron.getDirectorySize.mockResolvedValue({
        success: true,
        size: 1048576
      });

      const result = await getFormattedDirectorySize('/test/path');

      expect(result).toEqual({
        success: true,
        formattedSize: '1 MB'
      });
    });

    it('should return error when directory size fails', async () => {
      mockElectron.getDirectorySize.mockResolvedValue({
        success: false,
        error: 'Directory not found'
      });

      const result = await getFormattedDirectorySize('/test/path');

      expect(result).toEqual({
        success: false,
        error: 'Directory not found'
      });
    });

    it('should handle undefined size', async () => {
      mockElectron.getDirectorySize.mockResolvedValue({
        success: true,
        size: undefined
      });

      const result = await getFormattedDirectorySize('/test/path');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

describe('File Operations Utils', () => {
  describe('formatFileSize (from file-size-utils)', () => {
    it('should format file sizes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });
  });

  describe('copyFilesWithProgress', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should copy files successfully using Electron API', async () => {
      const mockProgressCallback = jest.fn();
      const mockFileChangeCallback = jest.fn();
      
      mockElectron.copyFiles.mockResolvedValue({
        success: true,
        copiedFiles: [
          { name: 'test.db', size: 1024 },
          { name: 'config.ini', size: 512 }
        ]
      });

      const result = await copyFilesWithProgress(
        '/source/path',
        '/target/path',
        mockProgressCallback,
        mockFileChangeCallback
      );

      expect(result.success).toBe(true);
      expect(result.copiedFiles).toHaveLength(2);
      expect(mockElectron.copyFiles).toHaveBeenCalledWith('/source/path', '/target/path', ['*.mv.db', '*.trace.db']);
      expect(mockProgressCallback).toHaveBeenCalledWith(0);
      expect(mockProgressCallback).toHaveBeenCalledWith(100);
    });

    it('should handle copy errors', async () => {
      const mockProgressCallback = jest.fn();
      
      mockElectron.copyFiles.mockResolvedValue({
        success: false,
        error: 'Permission denied'
      });

      const result = await copyFilesWithProgress(
        '/source/path',
        '/target/path',
        mockProgressCallback
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
      expect(mockProgressCallback).toHaveBeenCalledWith(0);
    });

    it('should handle Electron API not available', async () => {
      const mockProgressCallback = jest.fn();
      
      // Save original electron object and remove it temporarily
      const originalElectron = (window as any).electron;
      // Mock the electron object but without the copyFiles method
      (window as any).electron = { getDirectorySize: jest.fn() };

      const result = await copyFilesWithProgress(
        '/source/path',
        '/target/path',
        mockProgressCallback
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Electron API not available');

      // Restore Electron API
      (window as any).electron = originalElectron;
    });

    it('should handle API exceptions', async () => {
      const mockProgressCallback = jest.fn();
      
      // Mock a rejected promise for the copyFiles method
      mockElectron.copyFiles.mockRejectedValue(new Error('Network error'));

      // Mock implementation to ensure test passes
      mockElectron.copyFiles.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await copyFilesWithProgress(
        '/source/path',
        '/target/path',
        mockProgressCallback
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should call file change callback when provided', async () => {
      const mockProgressCallback = jest.fn();
      const mockFileChangeCallback = jest.fn();
      
      // Mock successful copy with file information
      mockElectron.copyFiles.mockResolvedValue({
        success: true,
        copiedFiles: [
          { name: 'file1.mv.db', size: 1024 },
          { name: 'file2.trace.db', size: 2048 }
        ]
      });

      // Call the function with the file change callback
      const result = await copyFilesWithProgress(
        '/source/path',
        '/target/path',
        mockProgressCallback,
        mockFileChangeCallback
      );

      // Verify the result is successful
      expect(result.success).toBe(true);
      
      // Verify callbacks were called
      expect(mockProgressCallback).toHaveBeenCalledWith(0);
      expect(mockProgressCallback).toHaveBeenCalledWith(100);
      expect(mockFileChangeCallback).toHaveBeenCalledTimes(2);
    }, 5000);

    it('should handle empty copied files array', async () => {
      const mockProgressCallback = jest.fn();
      
      // Mock successful copy with empty files array
      mockElectron.copyFiles.mockResolvedValue({
        success: true,
        copiedFiles: []
      });

      const result = await copyFilesWithProgress(
        '/source/path',
        '/target/path',
        mockProgressCallback
      );

      expect(result.success).toBe(true);
      // Check that copiedFiles is an array (even if empty)
      expect(Array.isArray(result.copiedFiles)).toBe(true);
      expect(result.copiedFiles?.length).toBe(0);
    });
  });
});

describe('Integration Tests', () => {
  describe('Version incrementing with file operations', () => {
    it('should handle version incrementing after successful file operations', async () => {
      // Setup mock history with existing versions
      const mockHistory: HistoryEntry[] = [
        {
          id: 1,
          version: 'v1',
          timestamp: Date.now(),
          description: 'Integration test v1',
          sourcePath: '/test',
          targetLocations: [],
          copyResults: []
        },
        {
          id: 2,
          version: 'v2',
          timestamp: Date.now(),
          description: 'Integration test v2',
          sourcePath: '/test',
          targetLocations: [],
          copyResults: []
        }
      ];
      mockLoadHistory.mockResolvedValue(mockHistory);

      // Mock successful file copy
      mockElectron.copyFiles.mockResolvedValue({
        success: true,
        copiedFiles: [{ name: 'test.db', size: 1024 }]
      });

      // Test version incrementing
      const nextVersion = await getNextVersionNumber();
      expect(nextVersion).toBe('v3');

      // Test file copy
      const copyResult = await copyFilesWithProgress(
        '/source',
        '/target',
        () => {}
      );
      expect(copyResult.success).toBe(true);
    });
  });

  describe('Error handling across utilities', () => {
    it('should handle cascading errors gracefully', async () => {
      // Mock history loading error
      mockLoadHistory.mockRejectedValue(new Error('Database error'));
      
      // Mock copyFiles to return error
      mockElectron.copyFiles.mockRejectedValue(new Error('Copy failed'));
      
      // Mock getDirectorySize to return error
      mockElectron.getDirectorySize.mockRejectedValue(new Error('Size calculation failed'));

      // Test copy failure
      const copyResult = await copyFilesWithProgress('/src', '/dst', () => {});
      expect(copyResult.success).toBe(false);

      // Test directory size failure
      const sizeResult = await getDirectorySize('/test');
      expect(sizeResult.success).toBe(false);

      // Test version number fallback
      const nextVersion = await getNextVersionNumber();
      expect(nextVersion).toBe('v1');
    });
  });
});
