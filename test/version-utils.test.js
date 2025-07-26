/**
 * Focused version utils tests for CI reliability
 * Tests core functionality without complex mocking
 */

// Mock the required modules before importing
jest.mock('../app/lib/history-utils', () => ({
  loadHistory: jest.fn()
}));

// Mock console methods to avoid noise
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

const { loadHistory } = require('../app/lib/history-utils');

describe('Version Utils - CI Focused Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getNextVersionNumber', () => {
    it('should return v1 when no history entries exist', async () => {
      loadHistory.mockResolvedValue([]);
      
      try {
        // Import here to ensure mocks are set up
        const { getNextVersionNumber } = require('../app/lib/version-utils');
        
        const result = await getNextVersionNumber();
        expect(result).toBe('v1');
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    });

    it('should return v1 when history is null/undefined', async () => {
      loadHistory.mockResolvedValue(null);
      
      const { getNextVersionNumber } = require('../app/lib/version-utils');
      
      const result = await getNextVersionNumber();
      expect(result).toBe('v1');
    });

    it('should increment version correctly with single entry', async () => {
      loadHistory.mockResolvedValue([
        { version: 'v1', timestamp: '2024-01-01' }
      ]);
      
      const { getNextVersionNumber } = require('../app/lib/version-utils');
      
      const result = await getNextVersionNumber();
      expect(result).toBe('v2');
    });

    it('should find highest version among multiple entries', async () => {
      loadHistory.mockResolvedValue([
        { version: 'v1', timestamp: '2024-01-01' },
        { version: 'v3', timestamp: '2024-01-03' },
        { version: 'v2', timestamp: '2024-01-02' }
      ]);
      
      const { getNextVersionNumber } = require('../app/lib/version-utils');
      
      const result = await getNextVersionNumber();
      expect(result).toBe('v4');
    });

    it('should handle entries without version', async () => {
      loadHistory.mockResolvedValue([
        { timestamp: '2024-01-01' },
        { version: 'v2', timestamp: '2024-01-02' }
      ]);
      
      const { getNextVersionNumber } = require('../app/lib/version-utils');
      
      const result = await getNextVersionNumber();
      expect(result).toBe('v3');
    });

    it('should handle malformed version strings', async () => {
      loadHistory.mockResolvedValue([
        { version: 'invalid', timestamp: '2024-01-01' },
        { version: 'v2', timestamp: '2024-01-02' },
        { version: 'version3', timestamp: '2024-01-03' }
      ]);
      
      const { getNextVersionNumber } = require('../app/lib/version-utils');
      
      const result = await getNextVersionNumber();
      expect(result).toBe('v3');
    });

    it('should return v1 on error', async () => {
      loadHistory.mockRejectedValue(new Error('Database error'));
      
      const { getNextVersionNumber } = require('../app/lib/version-utils');
      
      const result = await getNextVersionNumber();
      expect(result).toBe('v1');
    });
  });
});
