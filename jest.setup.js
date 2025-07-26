require('@testing-library/jest-dom')

// Mock Electron APIs for testing
global.window = global.window || {}
global.window.electron = {
  // Mock Electron IPC methods
  openDirectoryDialog: jest.fn().mockResolvedValue({ success: true, path: '/mock/path' }),
  copyFiles: jest.fn().mockResolvedValue({ success: true, copiedFiles: [] }),
  checkPathAccess: jest.fn().mockResolvedValue({ success: true, readable: true, writable: true }),
  checkFileInUse: jest.fn().mockResolvedValue({ success: true, inUse: false }),
  createBackup: jest.fn().mockResolvedValue({ success: true, backupPath: '/mock/backup' }),
  loadTargetLocations: jest.fn().mockResolvedValue([]),
  saveTargetLocations: jest.fn().mockResolvedValue({ success: true }),
  loadSettings: jest.fn().mockResolvedValue({}),
  saveSettings: jest.fn().mockResolvedValue({ success: true }),
  loadHistoryEntries: jest.fn().mockResolvedValue([]),
  saveHistoryEntries: jest.fn().mockResolvedValue({ success: true }),
  openFolderPath: jest.fn().mockResolvedValue({ success: true }),
  openFile: jest.fn().mockResolvedValue({ success: true }),
  // Additional missing methods
  readJsonFile: jest.fn().mockResolvedValue({ success: true, data: [] }),
  writeJsonFile: jest.fn().mockResolvedValue({ success: true }),
  getDirectorySize: jest.fn().mockResolvedValue({ success: true, size: 1024 }),
  createSingleBackup: jest.fn().mockResolvedValue({ success: true, backupPath: '/mock/backup' }),
  showSaveDialog: jest.fn().mockResolvedValue({ success: true, filePath: '/mock/save/path' }),
  showOpenDialog: jest.fn().mockResolvedValue({ success: true, filePaths: ['/mock/open/path'] }),
}

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Mock window.confirm and window.alert
global.confirm = jest.fn(() => true)
global.alert = jest.fn()

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))
