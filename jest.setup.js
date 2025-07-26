import '@testing-library/jest-dom'

// Mock Electron APIs for testing
global.window = global.window || {}
global.window.electron = {
  // Mock Electron IPC methods
  openDirectoryDialog: jest.fn(),
  copyFiles: jest.fn(),
  checkPathAccess: jest.fn(),
  checkFileInUse: jest.fn(),
  createBackup: jest.fn(),
  loadTargetLocations: jest.fn(),
  saveTargetLocations: jest.fn(),
  loadSettings: jest.fn(),
  saveSettings: jest.fn(),
  loadHistoryEntries: jest.fn(),
  saveHistoryEntries: jest.fn(),
  openFolderPath: jest.fn(),
  openFile: jest.fn(),
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
