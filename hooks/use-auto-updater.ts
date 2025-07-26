import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { UpdateStatusData } from '@/app/types/electron';

interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

interface UpdateStatus {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  downloaded: boolean;
  error: string | null;
  currentVersion: string;
  availableVersion: string | null;
  downloadProgress: number;
}

export function useAutoUpdater() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    checking: false,
    available: false,
    downloading: false,
    downloaded: false,
    error: null,
    currentVersion: '',
    availableVersion: null,
    downloadProgress: 0
  });

  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  // Handle update status events from main process
  const handleUpdateStatus = useCallback((statusData: UpdateStatusData) => {
    console.log('Update status received:', statusData);

    switch (statusData.event) {
      case 'checking-for-update':
        setUpdateStatus(prev => ({
          ...prev,
          checking: true,
          error: null
        }));
        break;

      case 'update-available':
        if (statusData.data) {
          setUpdateStatus(prev => ({
            ...prev,
            checking: false,
            available: true,
            availableVersion: statusData.data?.version || null
          }));
          setUpdateInfo({
            version: statusData.data.version || '',
            releaseDate: statusData.data.releaseDate,
            releaseNotes: statusData.data.releaseNotes
          });
          toast.success('Aktualizace k dispozici', {
            description: `Nová verze ${statusData.data.version} je k dispozici!`,
            duration: 8000
          });
        }
        break;

      case 'update-not-available':
        setUpdateStatus(prev => ({
          ...prev,
          checking: false,
          available: false,
          error: null
        }));
        break;

      case 'update-error':
        setUpdateStatus(prev => ({
          ...prev,
          checking: false,
          downloading: false,
          error: statusData.data?.error || 'Neznámá chyba při aktualizaci'
        }));
        toast.error('Chyba při aktualizaci', {
          description: statusData.data?.error || 'Neznámá chyba při aktualizaci',
          duration: 8000
        });
        break;

      case 'download-progress':
        if (statusData.data) {
          setUpdateStatus(prev => ({
            ...prev,
            downloading: true,
            downloadProgress: statusData.data?.percent || 0
          }));
        }
        break;

      case 'update-downloaded':
        if (statusData.data) {
          setUpdateStatus(prev => ({
            ...prev,
            downloading: false,
            downloaded: true,
            downloadProgress: 100
          }));
          toast.success('Aktualizace stažena', {
            description: `Verze ${statusData.data.version} je připravena k instalaci`,
            duration: 10000,
            action: {
              label: 'Restartovat nyní',
              onClick: () => installUpdate()
            }
          });
        }
        break;
    }
  }, []);

  // Initialize update status listener
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electron?.updater) {
      // Set up update status listener
      window.electron.updater.onUpdateStatus(handleUpdateStatus);

      // Get initial status
      window.electron.updater.getStatus().then(result => {
        if (result.success && result.status) {
          setUpdateStatus(prev => ({
            ...prev,
            checking: result.status!.checking,
            downloaded: result.status!.downloaded,
            currentVersion: result.status!.currentVersion
          }));
        }
      }).catch(error => {
        console.error('Error getting initial update status:', error);
      });

      // Cleanup listener on unmount
      return () => {
        window.electron.updater.removeUpdateStatusListener();
      };
    }
  }, [handleUpdateStatus]);

  // Check for updates manually
  const checkForUpdates = useCallback(async () => {
    if (!window.electron?.updater) {
      toast.error('Chyba', {
        description: 'Aktualizace nejsou k dispozici v této verzi aplikace'
      });
      return;
    }

    try {
      const result = await window.electron.updater.checkForUpdates();
      if (!result.success) {
        toast.error('Chyba při kontrole aktualizací', {
          description: result.error || 'Neznámá chyba'
        });
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      toast.error('Chyba při kontrole aktualizací', {
        description: 'Nepodařilo se zkontrolovat aktualizace'
      });
    }
  }, []);

  // Download update
  const downloadUpdate = useCallback(async () => {
    if (!window.electron?.updater) return;

    try {
      setUpdateStatus(prev => ({ ...prev, downloading: true, downloadProgress: 0 }));
      const result = await window.electron.updater.downloadUpdate();
      if (!result.success) {
        setUpdateStatus(prev => ({ ...prev, downloading: false }));
        toast.error('Chyba při stahování aktualizace', {
          description: result.error || 'Neznámá chyba'
        });
      }
    } catch (error) {
      console.error('Error downloading update:', error);
      setUpdateStatus(prev => ({ ...prev, downloading: false }));
      toast.error('Chyba při stahování aktualizace', {
        description: 'Nepodařilo se stáhnout aktualizaci'
      });
    }
  }, []);

  // Install update and restart
  const installUpdate = useCallback(async () => {
    if (!window.electron?.updater) return;

    try {
      await window.electron.updater.quitAndInstall();
    } catch (error) {
      console.error('Error installing update:', error);
      toast.error('Chyba při instalaci aktualizace', {
        description: 'Nepodařilo se nainstalovat aktualizaci'
      });
    }
  }, []);

  return {
    updateStatus,
    updateInfo,
    checkForUpdates,
    downloadUpdate,
    installUpdate
  };
}
