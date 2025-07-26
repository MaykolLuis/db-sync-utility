@echo off
echo Building DB Sync Utility Installer...
echo.

echo Step 1: Building Next.js app with export output...
set NEXT_PUBLIC_IS_ELECTRON=true
call npm run build
if %errorlevel% neq 0 (
    echo Error: Next.js build failed
    pause
    exit /b 1
)

echo Step 2: Fixing asset paths for Electron compatibility...
node fix-asset-paths.js
if %errorlevel% neq 0 (
    echo Error: Asset path fixing failed
    pause
    exit /b 1
)

echo Step 3: Creating dist directory...
if not exist "dist" mkdir dist

echo Step 4: Running electron-builder...
call npx electron-builder --win --publish=never --config.directories.output=dist
if %errorlevel% neq 0 (
    echo Error: Electron-builder failed
    pause
    exit /b 1
)

echo.
echo Build completed! Check the dist folder for installer files.
dir dist
pause
