'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Download, RefreshCw, CheckCircle2, X } from 'lucide-react';
import { useAutoUpdater } from '@/hooks/use-auto-updater';

interface UpdateNotificationProps {
  onClose?: () => void;
  className?: string;
}

export function UpdateNotification({ onClose, className }: UpdateNotificationProps) {
  const { updateStatus, updateInfo, checkForUpdates, downloadUpdate, installUpdate } = useAutoUpdater();

  // Don't render if no update is available and not checking
  if (!updateStatus.checking && !updateStatus.available && !updateStatus.downloading && !updateStatus.downloaded) {
    return null;
  }

  const getStatusIcon = () => {
    if (updateStatus.error) return <AlertCircle className="h-5 w-5 text-red-500" />;
    if (updateStatus.downloaded) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (updateStatus.downloading) return <Download className="h-5 w-5 text-blue-500" />;
    if (updateStatus.checking) return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
    return <Download className="h-5 w-5 text-blue-500" />;
  };

  const getStatusText = () => {
    if (updateStatus.error) return 'Chyba při aktualizaci';
    if (updateStatus.downloaded) return 'Aktualizace připravena';
    if (updateStatus.downloading) return 'Stahování aktualizace';
    if (updateStatus.checking) return 'Kontrola aktualizací';
    if (updateStatus.available) return 'Aktualizace k dispozici';
    return 'Kontrola aktualizací';
  };

  const getStatusDescription = () => {
    if (updateStatus.error) return updateStatus.error;
    if (updateStatus.downloaded) return `Verze ${updateStatus.availableVersion} je připravena k instalaci`;
    if (updateStatus.downloading) return `Stahování ${updateStatus.downloadProgress}%`;
    if (updateStatus.checking) return 'Hledání nových verzí...';
    if (updateStatus.available) return `Nová verze ${updateStatus.availableVersion} je k dispozici`;
    return 'Kontrola dostupných aktualizací';
  };

  return (
    <Card className={`w-full max-w-md mx-auto bg-gradient-to-br from-gray-900 to-black border-red-500/20 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <CardTitle className="text-lg text-white">{getStatusText()}</CardTitle>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription className="text-gray-300">
          {getStatusDescription()}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Version Information */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Aktuální verze:</span>
          <Badge variant="outline" className="text-gray-300 border-gray-600">
            {updateStatus.currentVersion}
          </Badge>
        </div>

        {updateStatus.availableVersion && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Nová verze:</span>
            <Badge className="bg-red-500 hover:bg-red-600 text-white">
              {updateStatus.availableVersion}
            </Badge>
          </div>
        )}

        {/* Download Progress */}
        {updateStatus.downloading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Průběh stahování</span>
              <span>{updateStatus.downloadProgress}%</span>
            </div>
            <Progress 
              value={updateStatus.downloadProgress} 
              className="h-2"
            />
          </div>
        )}

        {/* Release Notes Preview */}
        {updateInfo?.releaseNotes && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-white">Poznámky k vydání:</h4>
            <div className="text-xs text-gray-300 bg-gray-800/50 rounded-md p-2 max-h-20 overflow-y-auto">
              {updateInfo.releaseNotes.substring(0, 200)}
              {updateInfo.releaseNotes.length > 200 && '...'}
            </div>
          </div>
        )}

        {/* Release Date */}
        {updateInfo?.releaseDate && (
          <div className="text-xs text-gray-400">
            Vydáno: {new Date(updateInfo.releaseDate).toLocaleDateString('cs-CZ')}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2 pt-4">
        {updateStatus.error && (
          <Button
            onClick={checkForUpdates}
            variant="outline"
            size="sm"
            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Zkusit znovu
          </Button>
        )}

        {updateStatus.available && !updateStatus.downloading && !updateStatus.downloaded && (
          <Button
            onClick={downloadUpdate}
            size="sm"
            className="flex-1 bg-red-500 hover:bg-red-600 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Stáhnout
          </Button>
        )}

        {updateStatus.downloaded && (
          <Button
            onClick={installUpdate}
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Restartovat a instalovat
          </Button>
        )}

        {(updateStatus.available || updateStatus.downloaded) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            Později
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
