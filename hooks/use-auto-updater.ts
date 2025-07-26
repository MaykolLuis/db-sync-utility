import { UpdateStatusData } from '@/app/types/electron';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

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

  // Handle update status from main process
  const handleUpdateStatus = useCallback((status: { checking: boolean; downloaded: boolean; currentVersion: string; downloading?: boolean; downloadProgress?: number }) => {
    console.log('Update status received:', status);
    
    setUpdateStatus(prev => ({
      ...prev,
      checking: status.checking,
      downloaded: status.downloaded,
      currentVersion: status.currentVersion,
      downloading: status.downloading || false,
      downloadProgress: status.downloadProgress || 0
    }));
  }, []);

  // Initialize update status listener
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electron?.updater) {
      // Set up update status listener
      window.electron.updater.onUpdateStatus(handleUpdateStatus);

      // Get initial status
      window.electron.updater.getStatus().then((result: { success: boolean; status?: { checking: boolean; downloaded: boolean; currentVersion: string }; error?: string }) => {
        if (result.success && result.status) {
          setUpdateStatus(prev => ({
            ...prev,
            checking: result.status!.checking,
            downloaded: result.status!.downloaded,
            currentVersion: result.status!.currentVersion
          }));
        }
      }).catch((error: any) => {
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
