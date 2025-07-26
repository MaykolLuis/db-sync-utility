"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Preset } from "@/app/types"

interface PresetEditDialogProps {
  preset: Preset
  isOpen: boolean
  onClose: () => void
  onSave: (preset: Preset) => void
}

export function PresetEditDialog({ preset, isOpen, onClose, onSave }: PresetEditDialogProps) {
  const [name, setName] = useState(preset.name)

  // Update the name when the preset prop changes
  useEffect(() => {
    setName(preset.name)
  }, [preset])

  const handleSave = () => {
    if (name.trim()) {
      onSave({ ...preset, name })
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upravit předvolbu</DialogTitle>
          <DialogDescription>
            Zadejte nový název pro tuto předvolbu
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Název
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Zrušit
          </Button>
          <Button type="submit" onClick={handleSave}>
            Uložit změny
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
