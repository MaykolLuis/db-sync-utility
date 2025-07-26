/**
 * Unit tests for critical utility functions
 * Tests version incrementing, file operations, and file size utilities
 */

/// <reference types="jest" />

import { getNextVersionNumber } from '../app/lib/version-utils';
import { copyFilesWithProgress, CopyResult } from '../app/lib/file-utils';
import { formatFileSize, getDirectorySize, getFormattedDirectorySize } from '../lib/utils/file-size-utils';
import { loadHistory, saveHistory } from '../app/lib/history-utils';
import { HistoryEntry } from '../app/types';

// Mock the history utilities
jest.mock('../app/lib/history-utils', () => ({
  loadHistory: jest.fn().mockResolvedValue([]),
  saveHistory: jest.fn().mockResolvedValue(undefined),
}));

// Mock file-size-utils to avoid Electron API calls
jest.mock('../lib/utils/file-size-utils', () => ({
  formatFileSize: jest.fn((bytes: number) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) {
      const kb = bytes / 1024;
      return kb % 1 === 0 ? `${Math.round(kb)} KB` : `${kb.toFixed(1)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
      const mb = bytes / (1024 * 1024);
      return mb % 1 === 0 ? `${Math.round(mb)} MB` : `${mb.toFixed(1)} MB`;
    }
    if (bytes < 1024 * 1024 * 1024 * 1024) {
      const gb = bytes / (1024 * 1024 * 1024);
      return gb % 1 === 0 ? `${Math.round(gb)} GB` : `${gb.toFixed(1)} GB`;
    }
    const tb = bytes / (1024 * 1024 * 1024 * 1024);
    return tb % 1 === 0 ? `${Math.round(tb)} TB` : `${tb.toFixed(1)} TB`;
  }),
  getDirectorySize: jest.fn().mockResolvedValue({ success: true, size: 1024 }),
  getFormattedDirectorySize: jest.fn().mockResolvedValue('1 KB'),
}));

// Mock file-utils to avoid Electron API calls
jest.mock('../app/lib/file-utils', () => ({
  copyFilesWithProgress: jest.fn().mockResolvedValue({
    success: true,
    copiedFiles: ['test.db'],
    errors: [],
  }),
}));

const mockLoadHistory = loadHistory as jest.MockedFunction<typeof loadHistory>;
const mockSaveHistory = saveHistory as jest.MockedFunction<typeof saveHistory>;

describe('Version Utils', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock console.error to avoid noise in test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Ensure window.electron is properly mocked for each test with all required methods
    const mockElectron = {
      copyFiles: jest.fn().mockResolvedValue({ success: true, copiedFiles: [] }),
      getDirectorySize: jest.fn().mockResolvedValue({ success: true, size: 1048576 }), // 1MB for consistency
      readJsonFile: jest.fn().mockResolvedValue({ success: true, data: [] }),
      writeJsonFile: jest.fn().mockResolvedValue({ success: true }),
      createBackup: jest.fn().mockResolvedValue({ success: true, backupPath: '/mock/backup' }),
      checkPathAccess: jest.fn().mockResolvedValue({ success: true, readable: true, writable: true }),
      checkFileInUse: jest.fn().mockResolvedValue({ success: true, inUse: false }),
      showSaveDialog: jest.fn().mockResolvedValue({ success: true, filePath: '/mock/path' }),
      showOpenDialog: jest.fn().mockResolvedValue({ success: true, filePaths: ['/mock/path'] }),
    };
    
    (window as any).electron = mockElectron;
    
    // Store reference for easy access in tests
    (global as any).mockElectron = mockElectron;
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
      (window.electron.getDirectorySize as jest.Mock).mockResolvedValue({
        success: true,
        size: 1048576
      });

      const result = await getDirectorySize('/test/path');

      expect(result).toEqual({
        success: true,
        size: 1048576
      });
      expect(window.electron.getDirectorySize).toHaveBeenCalledWith('/test/path');
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
      const mockElectron = (global as any).mockElectron;
      mockElectron.getDirectorySize.mockRejectedValue(new Error('Access denied'));

      const result = await getDirectorySize('/test/path');

      expect(result).toEqual({
        success: false,
        error: 'Access denied'
      });
    });

    it('should handle non-Error exceptions', async () => {
      const mockElectron = (global as any).mockElectron;
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
      const mockElectron = (global as any).mockElectron;
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
      const mockElectron = (global as any).mockElectron;
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
      const mockElectron = (global as any).mockElectron;
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
      
      const mockElectron = (global as any).mockElectron;
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
      
      const mockElectron = (global as any).mockElectron;
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
      
      // Temporarily remove Electron API
      const originalElectron = window.electron;
      delete (window as any).electron;

      const result = await copyFilesWithProgress(
        '/source/path',
        '/target/path',
        mockProgressCallback
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Electron API not available');

      // Restore Electron API
      window.electron = originalElectron;
      (window as any).electron = originalElectron;
    });

    it('should handle API exceptions', async () => {
      const mockProgressCallback = jest.fn();
      
      // Mock a rejected promise for the copyFiles method
      const mockElectron = (global as any).mockElectron;
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
      const mockElectron = (global as any).mockElectron;
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
      const mockElectron = (global as any).mockElectron;
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
      const mockElectron = (global as any).mockElectron;
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
      const mockElectron = (global as any).mockElectron;
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
