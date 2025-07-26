# Auto-Update System Documentation

## Overview

The DB Sync Utility includes a comprehensive auto-update system built with `electron-updater` that automatically checks for, downloads, and installs application updates. The system provides a seamless user experience with visual feedback and user control over the update process.

## Features

### Core Functionality
- **Automatic Update Checks**: Checks for updates on app startup and at regular intervals
- **Background Downloads**: Downloads updates in the background with progress tracking
- **User Notifications**: Native dialogs and in-app notifications for update status
- **Manual Control**: Users can manually check for updates, download, and install
- **Settings Integration**: Configurable auto-update preferences in app settings
- **GitHub Releases**: Configured to use GitHub Releases as the update server

### User Interface Components
- **Update Notification Card**: Floating notification with update status and actions
- **Update Settings Panel**: Comprehensive settings for auto-update preferences
- **Progress Tracking**: Visual progress bars for download status
- **Release Notes**: Display of release notes and version information

## Architecture

### Main Process Components

#### 1. Auto-Update Manager (`electron/auto-updater.js`)
```javascript
const autoUpdateManager = require('./auto-updater');
```

**Key Features:**
- Centralized update management
- Event handling for all update states
- Dialog management for user interactions
- Automatic retry mechanisms
- Error handling and logging

**Methods:**
- `checkForUpdates(silent)` - Manual update check
- `downloadUpdate()` - Download available update
- `quitAndInstall()` - Install update and restart app
- `getUpdateStatus()` - Get current update status

#### 2. IPC Handlers (`electron/main.js`)
```javascript
// Auto-updater IPC handlers
ipcMain.handle('updater-check-for-updates', async () => { ... });
ipcMain.handle('updater-download-update', async () => { ... });
ipcMain.handle('updater-quit-and-install', () => { ... });
ipcMain.handle('updater-get-status', () => { ... });
```

### Renderer Process Components

#### 1. Auto-Updater Hook (`hooks/use-auto-updater.ts`)
```typescript
const { updateStatus, updateInfo, checkForUpdates, downloadUpdate, installUpdate } = useAutoUpdater();
```

**State Management:**
- Update status tracking (checking, available, downloading, downloaded)
- Progress monitoring
- Error handling
- Toast notifications

#### 2. UI Components
- **UpdateNotification** (`components/update-notification.tsx`)
- **UpdateSettings** (`components/update-settings.tsx`)

### Configuration

#### Package.json Build Configuration
```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "your-github-username",
      "repo": "db-sync-utility"
    },
    "win": {
      "target": "nsis",
      "publisherName": "Your Company Name"
    }
  }
}
```

#### Settings Store Integration
```typescript
interface AppSettings {
  autoUpdateEnabled: boolean;
  autoDownloadUpdates: boolean;
  updateCheckInterval: number; // hours
}
```

## Update Flow

### 1. Automatic Update Check
```
App Startup → Wait 5 seconds → Check for Updates → Handle Response
```

### 2. Update Available Flow
```
Update Available → Show Notification → User Choice:
├── Download Now → Download → Install Prompt
├── Remind Later → Schedule Next Check
└── Skip Version → Mark as Skipped
```

### 3. Download Flow
```
Download Started → Progress Updates → Download Complete → Install Prompt
```

### 4. Installation Flow
```
User Confirms → Quit App → Install Update → Restart App
```

## Update States

### Checking for Update
- **Status**: `checking: true`
- **UI**: Spinner animation, "Kontrola aktualizací" message
- **Duration**: Usually 2-5 seconds

### Update Available
- **Status**: `available: true`
- **UI**: Update notification with version info and download button
- **Actions**: Download, Remind Later, Skip Version

### Downloading Update
- **Status**: `downloading: true`
- **UI**: Progress bar with percentage and download speed
- **Events**: Real-time progress updates

### Update Downloaded
- **Status**: `downloaded: true`
- **UI**: Install prompt with restart button
- **Actions**: Restart Now, Restart Later

### No Update Available
- **Status**: All flags false
- **UI**: No notification (silent)
- **Logging**: Console message only

### Update Error
- **Status**: `error: string`
- **UI**: Error notification with retry button
- **Actions**: Retry, Dismiss

## User Settings

### Auto-Update Enabled
- **Default**: `true`
- **Description**: Enable automatic update checks
- **Effect**: When disabled, no automatic checks are performed

### Auto-Download Updates
- **Default**: `false`
- **Description**: Automatically download updates without user prompt
- **Effect**: When enabled, updates download immediately when available

### Update Check Interval
- **Default**: `4` hours
- **Description**: How often to check for updates
- **Range**: 1-24 hours

## GitHub Releases Setup

### 1. Repository Configuration
1. Create GitHub repository for your app
2. Update `package.json` with correct owner/repo
3. Generate GitHub Personal Access Token
4. Add token to build environment

### 2. Release Process
```bash
# Build and publish release
npm run electron:build

# Or use electron-builder directly
npx electron-builder --publish=always
```

### 3. Release Assets
The build process creates:
- Windows: `.exe` installer and `.nupkg` update package
- macOS: `.dmg` installer and `.zip` update package
- Linux: `.AppImage` and update packages

## Development and Testing

### Development Mode
- Auto-updater is disabled in development (`isDev = true`)
- Console messages indicate disabled state
- All UI components work normally for testing

### Testing Updates
1. **Create Test Release**: Create a GitHub release with higher version number
2. **Build App**: Build app with lower version number
3. **Test Flow**: Run app and verify update detection and download
4. **Mock Updates**: Use electron-updater's mock functionality for testing

### Debug Logging
```javascript
// Enable in auto-updater.js
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';
```

## Error Handling

### Network Errors
- Automatic retry with exponential backoff
- User notification with retry option
- Fallback to manual check

### Download Failures
- Resume capability for interrupted downloads
- Checksum verification
- Cleanup of corrupted files

### Installation Errors
- Rollback to previous version if possible
- Error reporting to user
- Manual installation instructions

## Security Considerations

### Code Signing
- Windows: Authenticode signing required for automatic updates
- macOS: Apple Developer certificate required
- Linux: GPG signing recommended

### Update Verification
- Automatic signature verification
- Checksum validation
- HTTPS-only downloads

### Permissions
- Automatic elevation for installation
- User consent for major updates
- Sandbox compatibility

## Troubleshooting

### Common Issues

#### Updates Not Detected
1. Check GitHub repository configuration
2. Verify internet connection
3. Check console for error messages
4. Ensure app version is lower than release version

#### Download Failures
1. Check network connectivity
2. Verify GitHub release assets
3. Check disk space
4. Review firewall/antivirus settings

#### Installation Issues
1. Ensure app has write permissions
2. Check for running instances
3. Verify code signing
4. Review system compatibility

### Debug Commands
```javascript
// In browser console (development)
window.electron.updater.checkForUpdates();
window.electron.updater.getStatus();
```

## Best Practices

### Release Management
1. **Semantic Versioning**: Use semver for version numbers
2. **Release Notes**: Always include meaningful release notes
3. **Testing**: Test updates on all target platforms
4. **Gradual Rollout**: Consider staged releases for major updates

### User Experience
1. **Non-Intrusive**: Don't interrupt user workflows
2. **Clear Communication**: Provide clear update descriptions
3. **User Control**: Allow users to control update timing
4. **Feedback**: Show progress and status clearly

### Development Workflow
1. **Automated Builds**: Use CI/CD for consistent releases
2. **Version Bumping**: Automate version number updates
3. **Asset Management**: Ensure all platforms are built
4. **Testing Pipeline**: Include update testing in CI

## Configuration Examples

### Custom Update Server
```json
{
  "build": {
    "publish": {
      "provider": "s3",
      "bucket": "your-update-bucket",
      "region": "us-east-1"
    }
  }
}
```

### Update Intervals
```typescript
// Check every 2 hours
updateCheckInterval: 2

// Check daily
updateCheckInterval: 24

// Check on startup only
updateCheckInterval: 0
```

### Advanced Settings
```javascript
// In auto-updater.js
autoUpdater.autoDownload = false; // Disable auto-download
autoUpdater.allowPrerelease = false; // Stable releases only
autoUpdater.allowDowngrade = false; // Prevent downgrades
```

## Monitoring and Analytics

### Update Metrics
- Update check frequency
- Download success rates
- Installation completion rates
- Error occurrence patterns

### User Behavior
- Update adoption rates
- Time to update after release
- User preference patterns
- Skip rates by version

This auto-update system provides a robust, user-friendly experience while maintaining security and reliability standards expected in professional applications.
