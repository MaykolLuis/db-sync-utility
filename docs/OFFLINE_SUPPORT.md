# Offline Support & Network Disconnection Handling

## Overview

The DB Sync Utility now includes comprehensive offline support to handle network disconnections gracefully, especially when accessing network drives. This feature ensures that users receive clear feedback about connectivity issues and provides automatic retry mechanisms for network-related operations.

## Features

### 1. Network Status Detection
- **Real-time monitoring** of internet connectivity
- **Network drive accessibility** checking
- **Automatic reconnection** detection
- **Visual status indicators** in the UI

### 2. Enhanced Error Handling
- **Network-specific error messages** in Czech language
- **User-friendly recovery suggestions**
- **Automatic retry mechanisms** with exponential backoff
- **Graceful degradation** when network resources are unavailable

### 3. Visual Feedback
- **Network Status Indicator** in the main header
- **Toast notifications** for connectivity changes
- **Detailed connectivity information** in status dialogs
- **Progress indicators** during retry operations

### 4. Intelligent Retry Logic
- **Exponential backoff** for network operations
- **Configurable retry attempts** based on network type
- **Path-specific retry strategies** (local vs network drives)
- **User notification** of retry attempts

## Architecture

### Core Components

#### 1. Offline Support Utilities (`lib/utils/offline-support.ts`)
- **Network error detection** and classification
- **Path analysis** (local vs network drives)
- **Error formatting** for user display
- **Retry mechanisms** with backoff strategies
- **Offline cache management**

#### 2. React Hook (`hooks/use-offline-support.ts`)
- **Network status monitoring**
- **Connectivity checking methods**
- **Error handling utilities**
- **Cache management**
- **Toast notification helpers**

#### 3. Network Status Indicator (`components/network-status-indicator.tsx`)
- **Visual status display** (online/offline/limited)
- **Detailed connectivity information**
- **Manual refresh capabilities**
- **Compact and full display modes**

#### 4. Electron IPC Handlers (`electron/main.js`)
- **Network connectivity checking**
- **Enhanced path access validation**
- **Retry-enabled file operations**
- **Network drive detection**

## Usage

### Network Status Monitoring

The network status is automatically monitored and displayed in the main application header:

```typescript
// The NetworkStatusIndicator shows:
// - Green: Full connectivity (internet + network drives)
// - Amber: Limited connectivity (internet only)
// - Red: No connectivity (offline)
```

### Enhanced File Operations

File operations now include automatic retry logic:

```typescript
// Copy operations with network retry
const result = await copyFilesWithNetworkRetry(
  sourcePath,
  targetPath,
  filePatterns,
  {
    maxRetries: 3,
    retryDelay: 2000,
    exponentialBackoff: true
  }
);
```

### Path Validation

Path accessibility is checked with network awareness:

```typescript
// Enhanced path checking
const pathResult = await checkPathWithRetry(path);
if (!pathResult.accessible && pathResult.isNetworkDrive) {
  // Handle network drive disconnection
}
```

## Error Handling

### Network Error Types

The system recognizes and handles various network error codes:

- `ENOENT` - File/directory not found (network drive disconnected)
- `EACCES` - Access denied (network permissions)
- `EPERM` - Operation not permitted (network permissions)
- `ETIMEDOUT` - Network timeout
- `ECONNREFUSED` - Connection refused
- `ENETUNREACH` - Network unreachable
- `EHOSTUNREACH` - Host unreachable
- `EBUSY` - Resource busy (network drive issues)

### User-Friendly Messages

Error messages are displayed in Czech with clear explanations:

```typescript
// Examples of error messages:
"Síťová jednotka není dostupná. Zkontrolujte připojení k síti."
"Vypršel časový limit připojení k síti. Zkuste to znovu později."
"Nemáte oprávnění k přístupu k síťové jednotce."
```

### Recovery Actions

The system provides specific recovery suggestions:

- Check network connection
- Verify network drive is connected
- Check login credentials
- Verify permissions
- Try operation again
- Contact network administrator

## Configuration

### Retry Settings

Retry behavior can be configured per operation:

```typescript
const retryOptions = {
  maxRetries: 3,           // Maximum retry attempts
  retryDelay: 2000,        // Initial delay in milliseconds
  exponentialBackoff: true // Use exponential backoff
};
```

### Network Drive Detection

The system automatically detects network drives:

- **UNC paths** (`\\server\share`)
- **Mapped network drives** (basic detection)
- **Response time monitoring** for performance assessment

## User Experience

### Status Indicators

1. **Header Status Badge**
   - Shows current connectivity status
   - Click for detailed information
   - Refresh button for manual checks

2. **Toast Notifications**
   - Connection restored/lost alerts
   - Retry attempt notifications
   - Error explanations with recovery actions

3. **Detailed Status Dialog**
   - Internet connectivity status
   - Network drive accessibility
   - Available capabilities
   - Error information
   - Manual refresh options

### Copy Operations

Enhanced copy operations provide:

- **Pre-copy connectivity checks**
- **Automatic retry on network failures**
- **Progress feedback during retries**
- **Clear error messages for failures**
- **Directory creation confirmations**

## Testing Scenarios

### 1. Network Drive Disconnection
- Disconnect network drive during copy operation
- Verify retry attempts and user notification
- Check graceful failure handling

### 2. Internet Connectivity Loss
- Disable internet connection
- Verify offline mode activation
- Check local operations continue working

### 3. Intermittent Network Issues
- Simulate network timeouts
- Verify retry mechanisms
- Check exponential backoff behavior

### 4. Permission Issues
- Test with restricted network drives
- Verify error messages and recovery suggestions
- Check credential-related error handling

## Implementation Details

### File Structure

```
lib/utils/offline-support.ts     # Core offline utilities
hooks/use-offline-support.ts     # React hook for offline support
components/network-status-indicator.tsx  # UI component
electron/main.js                 # Enhanced IPC handlers
electron/preload.js             # Exposed methods
app/types/electron.d.ts         # TypeScript definitions
```

### Key Functions

1. **Network Status Checking**
   - `checkNetworkConnectivity()` - Overall connectivity check
   - `checkPathAccessEnhanced()` - Path-specific validation
   - `checkNetworkDrives()` - Multiple drive validation

2. **Enhanced Operations**
   - `copyFilesWithRetry()` - Retry-enabled file copying
   - `retryWithBackoff()` - Generic retry mechanism
   - `isNetworkError()` - Error classification

3. **User Interface**
   - `NetworkStatusIndicator` - Status display component
   - `useOfflineSupport()` - React hook for integration
   - `handleNetworkError()` - Error display helper

## Best Practices

### For Developers

1. **Always use enhanced operations** for network-related tasks
2. **Check connectivity** before critical operations
3. **Provide user feedback** for network issues
4. **Use appropriate retry strategies** based on operation type
5. **Handle errors gracefully** with user-friendly messages

### For Users

1. **Monitor network status** in the header indicator
2. **Wait for retry attempts** during network issues
3. **Check connectivity** when operations fail
4. **Verify network drive access** before large operations
5. **Use manual refresh** if status seems incorrect

## Troubleshooting

### Common Issues

1. **Network Status Not Updating**
   - Click refresh button in status indicator
   - Check if Electron APIs are available
   - Verify network interface configuration

2. **Retry Operations Not Working**
   - Check error codes in console
   - Verify network error classification
   - Ensure proper retry configuration

3. **Network Drive Detection Issues**
   - Verify UNC path format
   - Check mapped drive configuration
   - Test with different path formats

### Debug Information

Enable debug logging by checking browser console for:
- Network connectivity check results
- Retry attempt information
- Error classification details
- Path accessibility results

## Future Enhancements

### Planned Features

1. **Advanced Network Drive Detection**
   - Better mapped drive identification
   - Drive type classification
   - Performance monitoring

2. **Offline Operation Queue**
   - Queue operations when offline
   - Automatic execution when online
   - Operation prioritization

3. **Network Performance Monitoring**
   - Connection speed detection
   - Latency monitoring
   - Adaptive retry strategies

4. **Enhanced User Preferences**
   - Configurable retry settings
   - Custom timeout values
   - Notification preferences

## Conclusion

The offline support feature significantly improves the reliability and user experience of the DB Sync Utility when working with network drives and unstable connections. The comprehensive error handling, automatic retry mechanisms, and clear user feedback ensure that users can work efficiently even in challenging network environments.

For technical support or feature requests related to offline support, please refer to the application logs and provide detailed information about network configuration and error scenarios.
