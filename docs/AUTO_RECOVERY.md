# Auto-Recovery System Documentation

## Overview

The db-sync-utility app now includes a comprehensive auto-recovery system that automatically saves unsaved changes and provides recovery options in case of application crashes or unexpected shutdowns.

## Features

### 🔄 Auto-Save Functionality
- **Automatic Periodic Saving**: Saves unsaved changes at configurable intervals
- **Smart Triggering**: Only saves when there are actual changes to preserve
- **Multiple Data Types**: Supports different types of unsaved data
- **Background Operation**: Non-intrusive auto-saving that doesn't block the UI

### 🛡️ Crash Recovery
- **Recovery Detection**: Automatically detects when recovery data is available
- **Recovery Dialog**: User-friendly dialog to choose what to recover
- **Selective Recovery**: Users can choose which data to recover
- **Data Validation**: Ensures recovery data is recent and valid

### 📊 Supported Data Types

#### 1. Target Locations Changes
- **Auto-Save Interval**: 15 seconds when unsaved changes exist
- **Data Saved**: Original locations, current locations, change status
- **Recovery**: Restores unsaved target location modifications

#### 2. Source Directory Selection
- **Auto-Save Interval**: 20 seconds when path is set
- **Data Saved**: Directory path and validation status
- **Recovery**: Restores selected source directory

#### 3. Copy Operations in Progress
- **Auto-Save Interval**: 5 seconds during operations
- **Data Saved**: Progress, phase, source, targets, start time
- **Recovery**: Provides information about interrupted operations

#### 4. Settings Changes
- **Auto-Save Interval**: 20 seconds when changes exist
- **Data Saved**: Pending settings modifications
- **Recovery**: Restores unsaved settings changes

#### 5. History Entries Being Created
- **Auto-Save Interval**: 10 seconds during creation
- **Data Saved**: Entry data and creation status
- **Recovery**: Helps recover interrupted history entries

## Implementation Details

### Core Components

#### 1. Auto-Recovery Store (`use-auto-recovery-store.ts`)
```typescript
// Main store for managing auto-save data
const { 
  setAutoSaveData,
  clearAutoSaveData,
  checkForRecovery,
  getRecoveryData 
} = useAutoRecoveryStore()
```

#### 2. Auto-Save Hooks (`hooks/use-auto-save.ts`)
```typescript
// Specialized hooks for different data types
useTargetLocationsAutoSave(hasUnsavedChanges, originalLocations, currentLocations)
useSourceDirectoryAutoSave(path, isValid)
useCopyOperationAutoSave(inProgress, sourcePath, targetLocations, progress, phase)
useSettingsAutoSave(hasUnsavedChanges, pendingSettings)
useHistoryEntryAutoSave(inProgress, entry)
```

#### 3. Recovery Dialog (`components/recovery-dialog.tsx`)
- User-friendly interface for recovery options
- Shows recovery data with timestamps
- Allows selective recovery of different data types
- Provides clear descriptions of what will be recovered

### Integration Points

#### Main Application (`app/page.tsx`)
- Initializes new session on app start
- Checks for recovery data on startup
- Shows recovery dialog when data is available
- Handles recovery actions for different data types

#### Target Locations Section
- Integrates `useTargetLocationsAutoSave` hook
- Auto-saves when unsaved changes are detected
- Preserves original vs current state comparison

#### Copy Operation Section
- Integrates `useCopyOperationAutoSave` hook
- Tracks operation progress and state
- Clears recovery data when operations complete

## Usage

### For Developers

#### Adding Auto-Save to New Components
```typescript
import { useAutoSave } from '@/hooks/use-auto-save'

// Basic auto-save
const { manualSave } = useAutoSave({
  interval: 30000, // 30 seconds
  enabled: hasUnsavedChanges,
  onAutoSave: () => {
    // Save logic here
  }
})

// Manual save trigger
manualSave()
```

#### Creating Custom Auto-Save Hooks
```typescript
export function useCustomAutoSave(data: any, hasChanges: boolean) {
  const { saveCustomData } = useAutoRecoveryStore()

  const saveState = useCallback(() => {
    if (hasChanges) {
      saveCustomData(data)
    }
  }, [data, hasChanges, saveCustomData])

  useAutoSave({
    interval: 15000,
    enabled: hasChanges,
    onAutoSave: saveState
  })

  return { saveState }
}
```

### For Users

#### Recovery Process
1. **App Startup**: If recovery data is detected, a dialog appears
2. **Review Data**: See what data is available for recovery with timestamps
3. **Select Items**: Choose which items to recover (or select all)
4. **Recover**: Click "Obnovit vybrané" to restore selected data
5. **Continue**: Resume work with recovered data

#### Recovery Dialog Options
- **Obnovit vybrané**: Recover selected items
- **Vybrat vše**: Select all available recovery items
- **Zahodit vše**: Discard all recovery data

## Configuration

### Auto-Save Intervals
Default intervals can be customized:
- **Target Locations**: 15 seconds
- **Source Directory**: 20 seconds
- **Copy Operations**: 5 seconds
- **Settings**: 20 seconds
- **History Entries**: 10 seconds

### Storage Location
Recovery data is stored using Zustand persistence:
- **Browser**: localStorage with key `auto-recovery-storage`
- **Electron**: Persistent storage in app data directory

## Testing

### Manual Testing
1. **Create Unsaved Changes**: Modify target locations without saving
2. **Force Close App**: Close app without saving changes
3. **Restart App**: Recovery dialog should appear
4. **Test Recovery**: Verify data is restored correctly

### Automated Testing
Run the test suite:
```typescript
// In browser console
window.testAutoRecovery.runAll()
```

### Test Scenarios
- ✅ Auto-save functionality for all data types
- ✅ Recovery data detection and retrieval
- ✅ Selective recovery operations
- ✅ Session management and cleanup
- ✅ Interval configuration and updates

## Troubleshooting

### Common Issues

#### Recovery Dialog Not Appearing
- Check browser console for errors
- Verify recovery data exists in localStorage
- Ensure app was closed with unsaved changes

#### Auto-Save Not Working
- Check if changes are actually detected
- Verify auto-save intervals are reasonable
- Look for JavaScript errors in console

#### Recovery Data Corruption
- Clear localStorage: `localStorage.removeItem('auto-recovery-storage')`
- Restart application to initialize fresh session

### Debug Information
Enable debug logging:
```typescript
// In browser console
localStorage.setItem('debug-auto-recovery', 'true')
```

## Security Considerations

### Data Privacy
- Recovery data is stored locally only
- No sensitive data is transmitted externally
- Data is automatically cleaned up after recovery

### Data Validation
- Recovery data includes timestamps for freshness validation
- Session IDs prevent cross-session data conflicts
- Data integrity checks before recovery operations

## Performance Impact

### Minimal Overhead
- Auto-save only triggers when changes exist
- Efficient data serialization using JSON
- Background operations don't block UI
- Configurable intervals to balance safety vs performance

### Memory Usage
- Recovery data is stored efficiently
- Old recovery data is automatically cleaned up
- Session-based data management prevents accumulation

## Future Enhancements

### Planned Features
- [ ] Configurable auto-save intervals in settings UI
- [ ] Recovery data export/import functionality
- [ ] Advanced recovery options (partial data recovery)
- [ ] Recovery statistics and reporting
- [ ] Cloud-based recovery data backup

### Extensibility
The system is designed to be easily extensible:
- Add new data types by creating specialized hooks
- Customize recovery UI for specific data types
- Integrate with external backup systems
- Add recovery analytics and monitoring

## Conclusion

The auto-recovery system provides robust protection against data loss while maintaining excellent user experience. It operates transparently in the background and only presents recovery options when needed, ensuring users never lose their work due to unexpected application crashes or shutdowns.
