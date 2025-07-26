/**
 * Standalone Jest test to verify Jest is working
 * This bypasses Next.js configuration issues
 */

// Mock window and electron for testing
global.window = {
  electron: {
    copyFiles: jest.fn().mockResolvedValue({
      success: true,
      copiedFiles: ['/test/file.mv.db']
    }),
    getDirectorySize: jest.fn().mockResolvedValue({
      success: true,
      size: 1048576
    }),
  }
};

describe('Standalone Jest Tests', () => {
  describe('Basic functionality', () => {
    test('should perform basic arithmetic', () => {
      expect(1 + 1).toBe(2);
      expect(2 * 3).toBe(6);
    });

    test('should handle string operations', () => {
      expect('hello'.toUpperCase()).toBe('HELLO');
      expect('world'.length).toBe(5);
    });
  });

  describe('Version incrementing logic', () => {
    function getNextVersionFromHistory(history) {
      if (!history || history.length === 0) return 'v1';
      
      let highestVersion = 0;
      for (const entry of history) {
        if (entry.version) {
          const match = entry.version.match(/^v(\d+)$/);
          if (match) {
            const versionNum = parseInt(match[1], 10);
            if (versionNum > highestVersion) {
              highestVersion = versionNum;
            }
          }
        }
      }
      
      return `v${highestVersion + 1}`;
    }

    test('should return v1 for empty history', () => {
      expect(getNextVersionFromHistory([])).toBe('v1');
      expect(getNextVersionFromHistory(null)).toBe('v1');
      expect(getNextVersionFromHistory(undefined)).toBe('v1');
    });

    test('should increment version correctly', () => {
      const history1 = [{ version: 'v1' }];
      expect(getNextVersionFromHistory(history1)).toBe('v2');

      const history2 = [{ version: 'v1' }, { version: 'v3' }];
      expect(getNextVersionFromHistory(history2)).toBe('v4');

      const history3 = [{ version: 'v999' }];
      expect(getNextVersionFromHistory(history3)).toBe('v1000');
    });

    test('should handle malformed versions', () => {
      const history = [
        { version: 'v2' },
        { version: 'invalid-version' },
        { version: 'v4' }
      ];
      expect(getNextVersionFromHistory(history)).toBe('v5');
    });
  });

  describe('File size formatting', () => {
    function formatFileSize(bytes) {
      if (bytes === 0) return '0 B';
      
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    test('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1)).toBe('1 B');
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1023)).toBe('1023 B');
    });

    test('should format kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(2048)).toBe('2 KB');
    });

    test('should format megabytes correctly', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
    });

    test('should format gigabytes correctly', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });
  });

  describe('Mock Electron API tests', () => {
    test('should handle successful file copy', async () => {
      const mockCopyFiles = global.window.electron.copyFiles;
      mockCopyFiles.mockResolvedValue({
        success: true,
        copiedFiles: [{ name: 'test.db', size: 1024 }]
      });

      const result = await mockCopyFiles('/source', '/target');
      expect(result.success).toBe(true);
      expect(result.copiedFiles).toHaveLength(1);
      expect(mockCopyFiles).toHaveBeenCalledWith('/source', '/target');
    });

    test('should handle directory size calculation', async () => {
      const mockGetDirectorySize = global.window.electron.getDirectorySize;
      mockGetDirectorySize.mockResolvedValue({
        success: true,
        size: 1048576
      });

      const result = await mockGetDirectorySize('/test/path');
      expect(result.success).toBe(true);
      expect(result.size).toBe(1048576);
    });
  });
});
