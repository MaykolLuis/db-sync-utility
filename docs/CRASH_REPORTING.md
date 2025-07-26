# Crash Reporting System

The db-sync-utility app includes a comprehensive crash reporting system that automatically collects and manages crash reports to help identify and fix issues.

## Overview

The crash reporting system consists of several components:

1. **Electron Main Process Handler** - Captures crashes in the main process
2. **React Error Boundaries** - Catches errors in the React components
3. **Global Error Handlers** - Captures unhandled errors and promise rejections
4. **Crash Report Storage** - Local storage of crash reports with metadata
5. **Management Interface** - UI for viewing and managing crash reports

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Crash Reporting System                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │   React App     │    │  Electron Main  │    │   Storage   │  │
│  │                 │    │    Process      │    │             │  │
│  │ • ErrorBoundary │◄──►│ • CrashHandler  │◄──►│ • JSON Files│  │
│  │ • Global Hooks  │    │ • IPC Handlers  │    │ • Backups   │  │
│  │ • Breadcrumbs   │    │ • Auto-cleanup  │    │ • Metadata  │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
│           │                       │                      │      │
│           ▼                       ▼                      ▼      │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Management Interface                           │  │
│  │  • View crash reports    • Export reports                  │  │
│  │  • Delete old reports    • View breadcrumbs                │  │
│  │  • System information    • Search and filter               │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Crash Reporter Utility (`lib/utils/crash-reporter.ts`)

Core utility class that handles crash reporting functionality:

```typescript
import { crashReporter, addBreadcrumb } from '@/lib/utils/crash-reporter';

// Report a crash manually
const crashId = await crashReporter.reportCrash(error, 'error', {
  appState: { activeTab: 'copy', sourcePath: '/path/to/source' }
});

// Add breadcrumb for tracking user actions
addBreadcrumb('User started copy operation', 'info', 'user-action');
```

### 2. Electron Crash Handler (`electron/crash-handler.js`)

Handles crashes in the Electron main process:

- Uncaught exceptions
- Unhandled promise rejections
- Renderer process crashes
- Child process crashes

### 3. Enhanced Error Boundary (`app/components/ErrorBoundary.tsx`)

React error boundary with crash reporting integration:

```tsx
<ErrorBoundary
  level="section"
  name="Copy Operation"
  context="file-copying"
  onError={(error, errorInfo) => {
    console.log('Custom error handler called');
  }}
>
  <YourComponent />
</ErrorBoundary>
```

### 4. React Hook (`hooks/use-crash-reporting.ts`)

Easy-to-use React hook for crash reporting:

```tsx
import { useCrashReporting } from '@/hooks/use-crash-reporting';

function MyComponent() {
  const { reportCrash, addBreadcrumb, isAvailable } = useCrashReporting();

  const handleOperation = async () => {
    try {
      await addBreadcrumb('Starting file operation', 'info', 'file-ops');
      // ... your operation
    } catch (error) {
      await reportCrash(error, 'error', { operation: 'file-copy' });
    }
  };

  return <div>...</div>;
}
```

### 5. Management Interface (`components/crash-reporting-section.tsx`)

UI component for managing crash reports:

- View all crash reports
- Detailed crash information
- System information display
- Breadcrumb timeline
- Export and delete functionality

## Data Structure

### Crash Report

```typescript
interface CrashReport {
  id: string;                    // Unique crash ID
  timestamp: number;             // When the crash occurred
  type: 'error' | 'unhandledRejection' | 'uncaughtException' | 'rendererCrash' | 'manual';
  error: {
    name: string;                // Error name (e.g., "TypeError")
    message: string;             // Error message
    stack?: string;              // Stack trace
  };
  context: {
    version: string;             // App version
    platform: string;           // OS platform
    arch: string;                // System architecture
    nodeVersion: string;         // Node.js version
    electronVersion: string;     // Electron version
    userAgent?: string;          // Browser user agent
    url?: string;                // Current URL
  };
  systemInfo: {
    totalMemory: number;         // Total system memory
    freeMemory: number;          // Available memory
    cpus: number;                // CPU core count
    uptime: number;              // System uptime
  };
  appState?: {
    activeTab?: string;          // Current active tab
    sourcePath?: string;         // Selected source path
    targetLocationsCount?: number; // Number of target locations
    historyEntriesCount?: number;  // Number of history entries
  };
  breadcrumbs: Breadcrumb[];     // Action timeline
}
```

### Breadcrumb

```typescript
interface Breadcrumb {
  timestamp: number;             // When the action occurred
  message: string;               // Description of the action
  level: 'info' | 'warn' | 'error'; // Severity level
  category?: string;             // Action category
}
```

## File Storage

Crash reports are stored locally in the user data directory:

```
%APPDATA%/db-sync-utility/crash-reports/
├── crash-1642680000000-abc123.json
├── crash-1642680100000-def456.json
└── ...
```

### Automatic Cleanup

- Old crash reports (>30 days) are automatically deleted
- Maximum of 100 crash reports are kept
- Cleanup runs on app startup

## Usage Examples

### Basic Error Reporting

```typescript
try {
  // Risky operation
  await copyFiles(source, target);
} catch (error) {
  // Report the crash with context
  const crashId = await reportCrashWithAppState(error, 'error', {
    activeTab: 'copy',
    sourcePath: source,
    targetPath: target
  });
  
  console.log(`Crash reported: ${crashId}`);
}
```

### Adding Breadcrumbs

```typescript
// Track user actions
await addBreadcrumb('User selected source directory', 'info', 'user-action');
await addBreadcrumb('Validating source files', 'info', 'validation');
await addBreadcrumb('Starting file copy operation', 'info', 'file-operation');

// Track warnings
await addBreadcrumb('Large file detected, may take longer', 'warn', 'file-operation');

// Track errors (non-fatal)
await addBreadcrumb('Failed to copy one file, continuing', 'error', 'file-operation');
```

### Function Wrapping

```typescript
import { withCrashReporting } from '@/hooks/use-crash-reporting';

// Wrap async functions to automatically report crashes
const safeCopyFiles = withCrashReporting(copyFiles, 'file-copy-operation');

// Use the wrapped function normally
await safeCopyFiles(source, target);
```

### Manual Crash Reporting

```typescript
import { reportManualCrash } from '@/hooks/use-crash-reporting';

// Report a manual crash with custom context
await reportManualCrash('User reported issue with file copying', {
  userReport: true,
  issueDescription: 'Files appear corrupted after copy',
  affectedFiles: ['file1.db', 'file2.db']
}, 'error');
```

## Integration with Existing Components

### Copy Operation Section

```typescript
// Add breadcrumbs during copy operations
await addBreadcrumb(`Starting copy to ${targetLocations.length} locations`, 'info', 'copy-operation');

try {
  const results = await copyFiles(sourcePath, targetPath);
  await addBreadcrumb(`Copy completed successfully`, 'info', 'copy-operation');
} catch (error) {
  await addBreadcrumb(`Copy failed: ${error.message}`, 'error', 'copy-operation');
  await reportCrash(error, 'error', {
    sourcePath,
    targetPath,
    operationType: 'file-copy'
  });
}
```

### History Management

```typescript
// Track history operations
await addBreadcrumb('Loading history entries', 'info', 'history');
await addBreadcrumb('Exporting history to CSV', 'info', 'history');
await addBreadcrumb('Deleting history entry', 'info', 'history');
```

### Settings Changes

```typescript
// Track settings changes
await addBreadcrumb(`Settings changed: ${settingName} = ${newValue}`, 'info', 'settings');
```

## Viewing Crash Reports

### In the Application

1. Navigate to the Settings tab
2. Click on "Crash Reporting" section
3. View list of crash reports
4. Click on a report to see details
5. Export or delete reports as needed

### Manual File Access

Crash reports are stored as JSON files and can be viewed directly:

```bash
# Windows
explorer %APPDATA%\db-sync-utility\crash-reports

# View a specific crash report
notepad %APPDATA%\db-sync-utility\crash-reports\crash-1642680000000-abc123.json
```

## Privacy and Security

- All crash reports are stored locally on the user's machine
- No data is automatically sent to external servers
- Users have full control over crash report data
- Reports can be manually exported and shared if needed
- Sensitive information (file paths, user data) is included but can be redacted before sharing

## Troubleshooting

### Crash Reporting Not Working

1. Check if Electron API is available:
   ```typescript
   console.log('Crash reporting available:', !!window.electron?.crashReporting);
   ```

2. Check console for error messages
3. Verify file permissions in user data directory
4. Restart the application

### High Memory Usage

- Crash reports are automatically cleaned up after 30 days
- Breadcrumbs are limited to 50 entries per session
- Large stack traces are truncated if necessary

### Missing Crash Reports

- Check if the crash occurred before the reporting system was initialized
- Verify that the main process didn't crash before the report could be saved
- Check the console for any error messages during crash reporting

## Development

### Testing Crash Reporting

```typescript
// Simulate different types of crashes for testing

// 1. Throw an error in a component
const TestCrashComponent = () => {
  const [shouldCrash, setShouldCrash] = useState(false);
  
  if (shouldCrash) {
    throw new Error('Test crash for development');
  }
  
  return <button onClick={() => setShouldCrash(true)}>Trigger Crash</button>;
};

// 2. Simulate unhandled promise rejection
const testUnhandledRejection = () => {
  Promise.reject(new Error('Test unhandled rejection'));
};

// 3. Manual crash report
const testManualCrash = async () => {
  await reportManualCrash('Test manual crash report', {
    testData: 'This is a test crash report'
  });
};
```

### Adding New Breadcrumb Categories

When adding new features, consider adding appropriate breadcrumb categories:

- `user-action` - Direct user interactions
- `file-operation` - File system operations
- `network` - Network-related operations
- `validation` - Data validation steps
- `ui-state` - UI state changes
- `background-task` - Background processing
- `error-recovery` - Error recovery attempts

## Best Practices

1. **Add Breadcrumbs Liberally** - They help understand the sequence of events leading to a crash
2. **Include Relevant Context** - Add app state information that might be relevant to the crash
3. **Use Appropriate Error Types** - Distinguish between different types of errors
4. **Clean Up Regularly** - Don't let crash reports accumulate indefinitely
5. **Test Error Scenarios** - Regularly test error handling and crash reporting
6. **Review Crash Reports** - Periodically review crash reports to identify patterns
7. **Document Known Issues** - Keep track of known issues and their crash signatures

## Future Enhancements

Potential improvements to the crash reporting system:

1. **Crash Report Analytics** - Aggregate crash data to identify common issues
2. **Automatic Issue Creation** - Integration with issue tracking systems
3. **Remote Reporting** - Optional remote crash reporting with user consent
4. **Crash Reproduction** - Tools to help reproduce crashes based on breadcrumbs
5. **Performance Monitoring** - Track performance issues alongside crashes
6. **User Feedback Integration** - Allow users to add context to crash reports
