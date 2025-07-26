'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Clock, FileText, Settings, Copy, Database } from 'lucide-react'
import { useAutoRecoveryStore, AutoSaveData } from '@/lib/stores/use-auto-recovery-store'
import { useTargetLocationsStore } from '@/lib/stores/use-target-locations-store'
import { useSettingsStore } from '@/lib/stores/use-settings-store'
import { toast } from 'sonner'

interface RecoveryDialogProps {
  isOpen: boolean
  onClose: () => void
  recoveryData: AutoSaveData
  onRecover: (dataType: string) => void
}

export function RecoveryDialog({ isOpen, onClose, recoveryData, onRecover }: RecoveryDialogProps) {
  const [selectedRecoveryItems, setSelectedRecoveryItems] = useState<string[]>([])
  const { clearAutoSaveData } = useAutoRecoveryStore()
  const { setTargetLocations } = useTargetLocationsStore()
  const { setSettings } = useSettingsStore()

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRecoveryItems = () => {
    const items = []
    const { data } = recoveryData

    if (data.targetLocations?.hasUnsavedChanges) {
      items.push({
        id: 'targetLocations',
        title: 'Neuložené změny cílových lokací',
        description: `${data.targetLocations.currentLocations?.length || 0} lokací s neuloženými změnami`,
        icon: <Database className="h-4 w-4" />,
        timestamp: data.targetLocations.lastModified,
        severity: 'high' as const
      })
    }

    if (data.sourceDirectory?.path) {
      items.push({
        id: 'sourceDirectory',
        title: 'Zdrojový adresář',
        description: `Cesta: ${data.sourceDirectory.path}`,
        icon: <FileText className="h-4 w-4" />,
        timestamp: data.sourceDirectory.lastModified,
        severity: 'medium' as const
      })
    }

    if (data.copyOperation?.inProgress) {
      items.push({
        id: 'copyOperation',
        title: 'Nedokončená kopírovací operace',
        description: `${data.copyOperation.progress}% dokončeno - ${data.copyOperation.phase}`,
        icon: <Copy className="h-4 w-4" />,
        timestamp: data.copyOperation.startTime,
        severity: 'high' as const
      })
    }

    if (data.settingsChanges?.hasUnsavedChanges) {
      items.push({
        id: 'settingsChanges',
        title: 'Neuložené změny nastavení',
        description: 'Máte neuložené změny v nastavení aplikace',
        icon: <Settings className="h-4 w-4" />,
        timestamp: data.settingsChanges.lastModified,
        severity: 'medium' as const
      })
    }

    if (data.historyEntry?.inProgress) {
      items.push({
        id: 'historyEntry',
        title: 'Nedokončený záznam historie',
        description: 'Nedokončený záznam v historii operací',
        icon: <Clock className="h-4 w-4" />,
        timestamp: data.historyEntry.lastModified,
        severity: 'medium' as const
      })
    }

    return items
  }

  const handleItemToggle = (itemId: string) => {
    setSelectedRecoveryItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const handleRecoverSelected = async () => {
    let recoveredCount = 0

    for (const itemId of selectedRecoveryItems) {
      try {
        switch (itemId) {
          case 'targetLocations':
            if (recoveryData.data.targetLocations?.currentLocations) {
              setTargetLocations(recoveryData.data.targetLocations.currentLocations)
              recoveredCount++
            }
            break
          case 'sourceDirectory':
            // This will be handled by the parent component
            onRecover('sourceDirectory')
            recoveredCount++
            break
          case 'copyOperation':
            // This will be handled by the parent component
            onRecover('copyOperation')
            recoveredCount++
            break
          case 'settingsChanges':
            if (recoveryData.data.settingsChanges?.pendingSettings) {
              setSettings(recoveryData.data.settingsChanges.pendingSettings)
              recoveredCount++
            }
            break
          case 'historyEntry':
            // This will be handled by the parent component
            onRecover('historyEntry')
            recoveredCount++
            break
        }
      } catch (error) {
        console.error(`Error recovering ${itemId}:`, error)
        toast.error(`Chyba při obnovování ${itemId}`)
      }
    }

    if (recoveredCount > 0) {
      toast.success(`Obnoveno ${recoveredCount} položek z automatické zálohy`)
    }

    // Clear recovered data from auto-save
    clearAutoSaveData()
    onClose()
  }

  const handleDiscardAll = () => {
    clearAutoSaveData()
    toast.info('Všechna data automatické zálohy byla zahozena')
    onClose()
  }

  const recoveryItems = getRecoveryItems()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto z-[9999]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Obnovení dat po neočekávaném ukončení
          </DialogTitle>
          <DialogDescription>
            Aplikace byla neočekávaně ukončena. Nalezena byla automatická záloha z{' '}
            <strong>{formatTimestamp(recoveryData.timestamp)}</strong>.
            Vyberte data, která chcete obnovit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {recoveryItems.map((item) => (
            <Card 
              key={item.id}
              className={`cursor-pointer transition-all ${
                selectedRecoveryItems.includes(item.id) 
                  ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-950/20' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              onClick={() => handleItemToggle(item.id)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedRecoveryItems.includes(item.id)}
                      onChange={() => handleItemToggle(item.id)}
                      className="rounded"
                    />
                    {item.icon}
                    {item.title}
                  </div>
                  <Badge 
                    variant={item.severity === 'high' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {item.severity === 'high' ? 'Vysoká priorita' : 'Střední priorita'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {item.description}
                </p>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  Uloženo: {formatTimestamp(item.timestamp)}
                </div>
              </CardContent>
            </Card>
          ))}

          {recoveryItems.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-gray-500">Nebyla nalezena žádná data k obnovení.</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-between gap-3 pt-4">
          <Button
            variant="outline"
            onClick={handleDiscardAll}
            className="flex-1"
          >
            Zahodit vše
          </Button>
          <Button
            onClick={() => {
              // Select all items
              setSelectedRecoveryItems(recoveryItems.map(item => item.id))
            }}
            variant="secondary"
            className="flex-1"
          >
            Vybrat vše
          </Button>
          <Button
            onClick={handleRecoverSelected}
            disabled={selectedRecoveryItems.length === 0}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            Obnovit vybrané ({selectedRecoveryItems.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
