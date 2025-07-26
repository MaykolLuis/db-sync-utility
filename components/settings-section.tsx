'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/custom-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSettingsStore } from '@/lib/stores/use-settings-store';
import { usePasswordManagement } from '@/hooks/use-password-management';
import { toast } from 'sonner';
import { 
  Settings, 
  Save,
  RotateCcw,
  Shield,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { ScrollArea } from '@/components/ui/scroll-area';

export function SettingsSection() {
  const { 
    settings, 
    isLoading: settingsLoading, 
    setSettings, 
    resetSettings, 
    loadSettings, 
    saveSettings 
  } = useSettingsStore();
  
  const { 
    verifyPassword, 
    changePassword, 
    isVerifying,
    isChanging,
    error: passwordError
  } = usePasswordManagement();
  
  // Local state for password management
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);
  
  // Handle settings change
  const handleSettingChange = (key: keyof typeof settings, value: any) => {
    setSettings({ [key]: value });
  };
  
  // Handle save settings
  const handleSaveSettings = async () => {
    try {
      await saveSettings();
      toast.success('Nastavení uloženo', {
        description: 'Všechna nastavení byla úspěšně uložena'
      });
    } catch (error) {
      toast.error('Chyba při ukládání', {
        description: 'Nepodařilo se uložit nastavení'
      });
    }
  };
  
  // Handle reset settings
  const handleResetSettings = () => {
    resetSettings();
    toast.success('Nastavení obnoveno', {
      description: 'Všechna nastavení byla obnovena na výchozí hodnoty'
    });
  };
  
  // Handle password change
  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Hesla se neshodují', {
        description: 'Nové heslo a potvrzení hesla se musí shodovat'
      });
      return;
    }
    
    if (newPassword.length < 3) {
      toast.error('Heslo je příliš krátké', {
        description: 'Heslo musí mít alespoň 3 znaky'
      });
      return;
    }
    
    try {
      // Verify current password
      const isCurrentValid = await verifyPassword(currentPassword);
      if (!isCurrentValid) {
        toast.error('Nesprávné současné heslo', {
          description: 'Zadané současné heslo není správné'
        });
        return;
      }
      
      // Change password
      const success = await changePassword(newPassword);
      if (success) {
        toast.success('Heslo změněno', {
          description: 'Heslo bylo úspěšně změněno'
        });
        setShowPasswordDialog(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error('Chyba při změně hesla', {
          description: 'Nepodařilo se změnit heslo'
        });
      }
    } catch (error) {
      toast.error('Chyba při změně hesla', {
        description: error instanceof Error ? error.message : 'Nastala neočekávaná chyba'
      });
    }
  };
  
  return (
    <Card className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between bg-gradient-to-r from-[#1e293b] to-[#0f172a] text-white p-4 rounded-t-lg flex-shrink-0">
        <div>
          <h3 className="text-base font-semibold m-0">Nastavení aplikace</h3>
          <p className="text-xs opacity-90 mt-0.5">Konfigurace chování aplikace a bezpečnosti</p>
        </div>
        <Settings className="h-5 w-5" />
      </div>
      <ScrollArea className="flex-1">
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Copy Settings */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Nastavení kopírování</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0">
                    <Label htmlFor="confirm-copy" className="text-sm">Potvrzení před kopírováním</Label>
                    <p className="text-xs text-gray-500">
                      Zobrazit potvrzovací dialog před každým kopírováním
                    </p>
                  </div>
                  <Switch
                    id="confirm-copy"
                    checked={settings.showConfirmationBeforeCopy}
                    onCheckedChange={(checked) => handleSettingChange('showConfirmationBeforeCopy', checked)}
                  />
                </div>
              
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0">
                  <Label htmlFor="create-backup" className="text-sm">Vytvořit zálohu před přepsáním</Label>
                  <p className="text-xs text-gray-500">
                    Automaticky vytvořit zálohu před přepsáním souborů
                  </p>
                </div>
                <Switch
                  id="create-backup"
                  checked={settings.createBackupBeforeOverwrite}
                  onCheckedChange={(checked) => handleSettingChange('createBackupBeforeOverwrite', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0">
                  <Label htmlFor="auto-check" className="text-sm">Automatická kontrola změn</Label>
                  <p className="text-xs text-gray-500">
                    Automaticky kontrolovat změny ve zdrojové složce
                  </p>
                </div>
                <Switch
                  id="auto-check"
                  checked={settings.autoCheckSourceChanges}
                  onCheckedChange={(checked) => handleSettingChange('autoCheckSourceChanges', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0">
                  <Label htmlFor="remember-path" className="text-sm">Pamatovat zdrojovou cestu</Label>
                  <p className="text-xs text-gray-500">
                    Zapamatovat si poslední použitou zdrojovou složku
                  </p>
                </div>
                <Switch
                  id="remember-path"
                  checked={settings.rememberSourcePath}
                  onCheckedChange={(checked) => handleSettingChange('rememberSourcePath', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0">
                  <Label htmlFor="auto-save" className="text-sm">Automatické ukládání</Label>
                  <p className="text-xs text-gray-500">
                    Automaticky ukládat neuložené změny pro obnovu po pádu aplikace
                  </p>
                </div>
                <Switch
                  id="auto-save"
                  checked={settings.enableAutoSave}
                  onCheckedChange={(checked) => handleSettingChange('enableAutoSave', checked)}
                />
              </div>
              </div>
            </div>
            </div>
            
            {/* Interface Settings */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Nastavení rozhraní</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="startup-tab" className="text-sm">Výchozí záložka při spuštění</Label>
                  <Select
                    value={settings.defaultStartupTab}
                    onValueChange={(value) => handleSettingChange('defaultStartupTab', value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Vyberte záložku" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="source">Zdrojová složka</SelectItem>
                      <SelectItem value="targets">Cílové lokace</SelectItem>
                      <SelectItem value="copy">Kopírování</SelectItem>
                      <SelectItem value="history">Historie</SelectItem>
                      <SelectItem value="settings">Nastavení</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Záložka, která bude aktivní při spuštění aplikace
                  </p>
                </div>
              </div>
            </div>
            
            {/* History Settings */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Nastavení historie</h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="retention-days" className="text-sm">Doba uchování historie (dny)</Label>
                <Input
                  id="retention-days"
                  type="number"
                  min="1"
                  max="365"
                  value={settings.historyRetentionDays}
                  onChange={(e) => handleSettingChange('historyRetentionDays', parseInt(e.target.value) || 30)}
                  className="h-8"
                />
                <p className="text-xs text-gray-500">
                  Počet dní, po které se uchovávají záznamy historie
                </p>
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="items-per-page" className="text-sm">Položek na stránku</Label>
                <Input
                  id="items-per-page"
                  type="number"
                  min="5"
                  max="100"
                  value={settings.historyItemsPerPage}
                  onChange={(e) => handleSettingChange('historyItemsPerPage', parseInt(e.target.value) || 20)}
                  className="h-8"
                />
                <p className="text-xs text-gray-500">
                  Počet položek zobrazených na jedné stránce historie
                </p>
              </div>
            </div>
          </div>
          
          {/* Backup Settings */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Nastavení záloh</h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="backup-count" className="text-sm">Počet uchovávaných záloh</Label>
                <Input
                  id="backup-count"
                  type="number"
                  min="1"
                  max="50"
                  value={settings.backupRetentionCount}
                  onChange={(e) => handleSettingChange('backupRetentionCount', parseInt(e.target.value) || 5)}
                  className="h-8"
                />
                <p className="text-xs text-gray-500">
                  Maximální počet záloh uchovávaných pro každý soubor
                </p>
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0">
                  <Label htmlFor="delete-old-backups" className="text-sm">Mazat staré zálohy</Label>
                  <p className="text-xs text-gray-500">
                    Automaticky mazat zálohy starší než zadaný počet dní
                  </p>
                </div>
                <Switch
                  id="delete-old-backups"
                  checked={settings.enableOldBackupDeletion}
                  onCheckedChange={(checked) => handleSettingChange('enableOldBackupDeletion', checked)}
                />
              </div>
              
              {settings.enableOldBackupDeletion && (
                <div className="space-y-1">
                  <Label htmlFor="backup-days" className="text-sm">Mazat zálohy starší než (dny)</Label>
                  <Input
                    id="backup-days"
                    type="number"
                    min="1"
                    max="365"
                    value={settings.deleteBackupsOlderThanDays}
                    onChange={(e) => handleSettingChange('deleteBackupsOlderThanDays', parseInt(e.target.value) || 30)}
                    className="h-8"
                  />
                  <p className="text-xs text-gray-500">
                    Zálohy starší než tento počet dní budou automaticky smazány
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Security Settings */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Bezpečnost</h4>
            <div className="flex items-center justify-between">
              <div className="space-y-0">
                <Label className="text-sm">Heslo aplikace</Label>
                <p className="text-xs text-gray-500">
                  Změnit heslo pro přístup do aplikace
                </p>
              </div>
              <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Shield className="h-4 w-4" />
                    Změnit heslo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Změna hesla</DialogTitle>
                    <DialogDescription>
                      Zadejte současné heslo a nové heslo pro změnu přístupových údajů.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Současné heslo</Label>
                      <div className="relative">
                        <Input
                          id="current-password"
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Zadejte současné heslo"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="new-password">Nové heslo</Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Zadejte nové heslo"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Potvrzení nového hesla</Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Potvrďte nové heslo"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowPasswordDialog(false)}
                    >
                      Zrušit
                    </Button>
                    <Button
                      onClick={handlePasswordChange}
                      disabled={(isVerifying || isChanging) || !currentPassword || !newPassword || !confirmPassword}
                      className="bfi-button gap-2"
                    >
                      {(isVerifying || isChanging) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Shield className="h-4 w-4" />
                      )}
                      Změnit heslo
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </ScrollArea>
      <CardFooter className="flex justify-between pt-3 pb-4 flex-shrink-0 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetSettings}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Obnovit výchozí
        </Button>
        <Button
          size="sm"
          onClick={handleSaveSettings}
          disabled={settingsLoading}
          className="bfi-button gap-2"
        >
          {settingsLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Uložit nastavení
        </Button>
      </CardFooter>
    </Card>
  );
}
