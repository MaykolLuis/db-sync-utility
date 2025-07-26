'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Download, AlertCircle, CheckCircle2, Clock, Info } from 'lucide-react';
import { useAutoUpdater } from '@/hooks/use-auto-updater';
import { useSettingsStore } from '@/lib/stores/use-settings-store';

export function UpdateSettings() {
  const { updateStatus, updateInfo, checkForUpdates, downloadUpdate, installUpdate } = useAutoUpdater();
  const { settings, setSettings } = useSettingsStore();

  const handleAutoUpdateToggle = (enabled: boolean) => {
    setSettings({ autoUpdateEnabled: enabled });
  };

  const handleAutoDownloadToggle = (enabled: boolean) => {
    setSettings({ autoDownloadUpdates: enabled });
  };

  const getStatusBadge = () => {
    if (updateStatus.error) {
      return <Badge variant="destructive" className="text-xs"><AlertCircle className="h-3 w-3 mr-1" />Chyba</Badge>;
    }
    if (updateStatus.downloaded) {
      return <Badge className="bg-green-600 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Připraveno</Badge>;
    }
    if (updateStatus.downloading) {
      return <Badge className="bg-blue-600 text-xs"><Download className="h-3 w-3 mr-1" />Stahování</Badge>;
    }
    if (updateStatus.checking) {
      return <Badge className="bg-blue-600 text-xs"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Kontrola</Badge>;
    }
    if (updateStatus.available) {
      return <Badge className="bg-orange-600 text-xs"><Info className="h-3 w-3 mr-1" />K dispozici</Badge>;
    }
    return <Badge variant="outline" className="text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Aktuální</Badge>;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-500/20">
            <RefreshCw className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Automatické aktualizace</h3>
            <p className="text-sm text-slate-400">Nastavení pro automatické kontroly a stahování aktualizací</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={checkForUpdates}
            disabled={updateStatus.checking}
            variant="outline"
            size="sm"
            className="border-slate-600"
          >
            {updateStatus.checking ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Zkontrolovat aktualizace
          </Button>
          {updateStatus.available && !updateStatus.downloading && !updateStatus.downloaded && (
            <Button
              onClick={downloadUpdate}
              size="sm"
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Stáhnout
            </Button>
          )}
          {updateStatus.downloaded && (
            <Button
              onClick={installUpdate}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Instalovat
            </Button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="space-y-6">
        {/* Auto-Update Settings */}
        <Card className="bg-gradient-to-br from-gray-900 to-black border-red-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Nastavení aktualizací
            </CardTitle>
            <CardDescription className="text-gray-300">
              Konfigurace automatických kontrol a stahování
            </CardDescription>
          </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable Auto Updates */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label className="text-sm font-medium text-white">
                Povolit automatické aktualizace
              </label>
              <p className="text-xs text-gray-400">
                Automaticky kontrolovat dostupnost nových verzí
              </p>
            </div>
            <Switch
              checked={settings.autoUpdateEnabled ?? true}
              onCheckedChange={handleAutoUpdateToggle}
            />
          </div>

          <Separator className="bg-gray-700" />

          {/* Auto Download Updates */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label className="text-sm font-medium text-white">
                Automaticky stahovat aktualizace
              </label>
              <p className="text-xs text-gray-400">
                Stáhnout aktualizace na pozadí bez dotazu
              </p>
            </div>
            <Switch
              checked={settings.autoDownloadUpdates ?? false}
              onCheckedChange={handleAutoDownloadToggle}
              disabled={!settings.autoUpdateEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Current Status */}
      <Card className="bg-gradient-to-br from-gray-900 to-black border-red-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Info className="h-5 w-5" />
            Stav aktualizací
          </CardTitle>
          <CardDescription className="text-gray-300">
            Aktuální informace o verzích a dostupných aktualizacích
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Version */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Aktuální verze:</span>
            <Badge variant="outline" className="text-gray-300 border-gray-600">
              {updateStatus.currentVersion || '1.0.0'}
            </Badge>
          </div>

          {/* Available Version */}
          {updateStatus.availableVersion && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Dostupná verze:</span>
              <Badge className="bg-red-500 hover:bg-red-600 text-white">
                {updateStatus.availableVersion}
              </Badge>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Stav:</span>
            {getStatusBadge()}
          </div>

          {/* Download Progress */}
          {updateStatus.downloading && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Průběh:</span>
              <span className="text-sm text-blue-400">{updateStatus.downloadProgress}%</span>
            </div>
          )}

          {/* Last Check */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Poslední kontrola:</span>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Při spuštění aplikace
            </span>
          </div>

          {/* Release Date */}
          {updateInfo?.releaseDate && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Datum vydání:</span>
              <span className="text-xs text-gray-400">
                {new Date(updateInfo.releaseDate).toLocaleDateString('cs-CZ')}
              </span>
            </div>
          )}

          {/* Release Notes */}
          {updateInfo?.releaseNotes && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-white mb-2">Poznámky k vydání:</h4>
              <div className="text-xs text-gray-300 bg-gray-800/50 rounded-md p-3 max-h-32 overflow-y-auto">
                <pre className="whitespace-pre-wrap font-mono">
                  {updateInfo.releaseNotes}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
