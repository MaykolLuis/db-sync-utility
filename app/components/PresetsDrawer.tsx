"use client"

import { useState, useEffect, useRef, Component } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, X, Star, Edit, Trash2, AlertCircle, Eye, MoreVertical, Users, Server, Computer } from "lucide-react"
import { Preset, TargetLocation } from "@/app/types"
import { PresetEditDialog } from "@/app/components/PresetEditDialog"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import React from "react"

// Custom tooltip component with proper typing
interface CustomTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

const CustomTooltip = ({ children, content, side = 'top' }: CustomTooltipProps) => (
  <TooltipPrimitive.Provider delayDuration={300}>
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content 
          side={side}
          sideOffset={4}
          className="z-50 max-w-[300px] rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
        >
          <div className="break-words whitespace-normal">
            {content}
          </div>
          <TooltipPrimitive.Arrow className="fill-popover" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  </TooltipPrimitive.Provider>
);

interface PresetsDrawerProps {
  isOpen: boolean
  onClose: () => void
  presets: Preset[]
  targetLocations: TargetLocation[]
  onSavePreset: (preset?: Preset) => void
  onDeletePreset: (id: string) => void
  onSetDefault: (id: string) => void
  defaultPresetId?: string
}

export function PresetsDrawer({
  isOpen,
  onClose,
  presets,
  targetLocations,
  onSavePreset,
  onDeletePreset,
  onSetDefault,
  defaultPresetId,
}: PresetsDrawerProps) {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null)
  const [presetToDelete, setPresetToDelete] = useState<{id: string, name: string} | null>(null)
  const [filteredPresets, setFilteredPresets] = useState<Preset[]>([])
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null)
  const [internalDefaultPresetId, setInternalDefaultPresetId] = useState<string | undefined>(defaultPresetId)
  const [viewingPreset, setViewingPreset] = useState<Preset | null>(null)
  
  // State to track open dropdowns
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  
  // Helper function to safely handle dropdown and dialog interactions
  const handleAction = (action: () => void, presetId: string) => {
    // Close the dropdown first
    setOpenDropdownId(null)
    
    // Small delay to ensure dropdown is closed before opening dialog
    setTimeout(() => {
      action()
    }, 10)
  }
  
  // Update internal state when defaultPresetId prop changes
  useEffect(() => {
    setInternalDefaultPresetId(defaultPresetId);
  }, [defaultPresetId]);

  // Filter presets based on search query
  useEffect(() => {
    if (presets && presets.length > 0) {
      const filtered = presets.filter(preset =>
        preset.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredPresets(filtered)
      console.log('Filtered presets:', filtered.length, 'Search query:', searchQuery)
    } else {
      setFilteredPresets([])
    }
  }, [searchQuery, presets])

  // Handle body overflow when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleSavePreset = (preset: Preset) => {
    onSavePreset(preset)
    setEditingPreset(null)
  }

  const handleDeleteClick = (preset: Preset) => {
    setPresetToDelete({ id: preset.id, name: preset.name })
  }

  const confirmDelete = async () => {
    if (!presetToDelete) return;
    
    try {
      // Call the parent's delete handler and wait for it to complete
      await onDeletePreset(presetToDelete.id);
      
      // Update the local state to reflect the deletion
      setFilteredPresets(prev => prev.filter(p => p.id !== presetToDelete.id));
      
      // If the deleted preset was the default, update the default preset
      if (defaultPresetId === presetToDelete.id) {
        onSetDefault(""); // Clear the default preset
      }
      
      // Show success message
      toast({
        title: "Hotovo",
        description: `Předvolba "${presetToDelete.name}" byla úspěšně smazána.`,
      });
      
      // Close the confirmation dialog
      setPresetToDelete(null);
    } catch (error) {
      console.error('Error deleting preset:', error);
      const errorMessage = error instanceof Error ? error.message : 'Nepodařilo se smazat předvolbu.';
      
      toast({
        title: "Chyba",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Re-throw the error to allow the caller to handle it if needed
      throw error;
    } finally {
      // Ensure the dialog is closed in all cases
      setPresetToDelete(null);
    }
  }

  // Animation variants for the overlay
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.2,
        ease: 'easeInOut' as const
      }
    }
  }

  // Animation variants for the drawer
  const drawerVariants = {
    hidden: { y: '100%' },
    visible: { 
      y: 0,
      transition: { 
        type: 'spring' as const,
        damping: 25,
        stiffness: 300,
        mass: 0.5
      }
    },
    exit: { 
      y: '100%',
      transition: { 
        duration: 0.2,
        ease: 'easeInOut' as const
      }
    }
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="fixed inset-0 z-50 overflow-hidden"
            initial="hidden"
            animate="visible"
            exit="hidden"
            key="drawer-container"
          >
        <motion.div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          variants={overlayVariants}
        />
        <motion.div 
          className="fixed bottom-0 left-0 right-0 z-50 bg-[#09090b] rounded-t-lg shadow-2xl border border-red-500/20 backdrop-blur-sm"
          style={{ width: '96%', maxWidth: '1000px', marginLeft: 'auto', marginRight: 'auto' }}
          variants={drawerVariants}
        >
          <div className="p-4 border-b border-red-500/20 bg-[#121212] rounded-t-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <div className="bg-red-500/80 p-1.5 rounded backdrop-blur-sm">
                  <Star className="h-4 w-4 text-white" />
                </div>
                Správa předvoleb
              </h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
                <span className="sr-only">Zavřít</span>
              </Button>
            </div>
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Hledat předvolby..."
                  className="pl-9 pr-10 border-red-500/20 bg-[#121212]/50 focus:border-red-500 focus:ring-red-500/20 text-foreground"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <CustomTooltip content="Vymazat vyhledávání">
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Vymazat vyhledávání</span>
                    </button>
                  </CustomTooltip>
                )}
              </div>
            </div>
          </div>
          
          <ScrollArea className="h-[60vh] p-4">
            <div className="space-y-3">
              {filteredPresets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Žádné předvolby nenalezeny
                </div>
              ) : (
                filteredPresets.map((preset) => (
                  <Card key={preset.id} className="overflow-hidden hover:bg-muted/30 transition-colors border-red-500/20 bg-[#121212]/50 backdrop-blur-sm">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <Server className="h-3.5 w-3.5 text-blue-400" />
                          <span className="font-medium">{preset.name}</span>
                        </div>
                        {preset.targetIds.length > 0 && (
                          <span className="text-sm text-muted-foreground">
                            ({preset.targetIds.length} umístění)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {internalDefaultPresetId === preset.id ? (
                          <CustomTooltip content="Výchozí předvolba">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex items-center gap-1.5 px-2"
                              disabled
                            >
                              <Star className="h-4 w-4 text-red-500 fill-red-500" />
                              <span className="sr-only">Výchozí předvolba</span>
                            </Button>
                          </CustomTooltip>
                        ) : (
                          <CustomTooltip content="Nastavit jako výchozí">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSettingDefaultId(preset.id);
                                
                                // Update internal state immediately for UI feedback
                                setInternalDefaultPresetId(preset.id);
                                
                                // Call the parent handler to save the setting
                                onSetDefault(preset.id);
                                
                                toast({
                                  title: "Výchozí předvolba nastavena",
                                  description: `Předvolba "${preset.name}" byla nastavena jako výchozí.`,
                                });
                                
                                // Clear loading state after animation completes
                                setTimeout(() => setSettingDefaultId(null), 600);
                              }}
                              className="flex items-center gap-1.5 px-2 hover:text-red-500 group"
                              disabled={settingDefaultId === preset.id}
                            >
                              {settingDefaultId === preset.id ? (
                                <div className="animate-pulse h-4 w-4 text-red-500">
                                  <Star className="h-4 w-4" />
                                </div>
                              ) : (
                                <Star className="h-4 w-4 text-gray-400 group-hover:text-red-400 group-hover:fill-red-100/20" />
                              )}
                              <span className="sr-only">Nastavit jako výchozí</span>
                            </Button>
                          </CustomTooltip>
                        )}
                        <DropdownMenu 
                          open={openDropdownId === preset.id}
                          onOpenChange={(open) => {
                            if (open) {
                              setOpenDropdownId(preset.id);
                            } else {
                              setOpenDropdownId(null);
                            }
                          }}
                        >
                          <CustomTooltip content="Akce">
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex items-center gap-1.5 px-2 hover:text-red-500 group"
                              >
                                <MoreVertical className="h-4 w-4 text-gray-400 group-hover:text-red-400" />
                                <span className="sr-only">Akce</span>
                              </Button>
                            </DropdownMenuTrigger>
                          </CustomTooltip>
                          <DropdownMenuContent align="end" className="w-48 bg-[#121212] border-red-500/20">
                            <DropdownMenuItem 
                              onClick={() => handleAction(() => setViewingPreset(preset), preset.id)}
                              className="flex items-center gap-2 cursor-pointer hover:bg-blue-950/30 hover:text-blue-400"
                            >
                              <Eye className="h-4 w-4" />
                              <span>Zobrazit detaily</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleAction(() => onSavePreset(preset), preset.id)}
                              className="flex items-center gap-2 cursor-pointer hover:bg-blue-950/30 hover:text-blue-400"
                            >
                              <Edit className="h-4 w-4" />
                              <span>Upravit předvolbu</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleAction(() => handleDeleteClick(preset), preset.id)}
                              className="flex items-center gap-2 text-red-400 cursor-pointer hover:bg-red-950/30"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Smazat předvolbu</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </motion.div>
      </motion.div>
        )}
      </AnimatePresence>

      {editingPreset && (
        <PresetEditDialog
          preset={editingPreset}
          isOpen={!!editingPreset}
          onClose={() => setEditingPreset(null)}
          onSave={handleSavePreset}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {presetToDelete && (
        <AlertDialog open={!!presetToDelete} onOpenChange={() => setPresetToDelete(null)}>
          <AlertDialogContent className="bg-[#09090b] border-red-500/20">
            <AlertDialogHeader>
              <AlertDialogTitle>Smazat předvolbu</AlertDialogTitle>
              <AlertDialogDescription>
                Opravdu chcete smazat předvolbu "{presetToDelete.name}"? Tato akce je nevratná.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-muted/30 hover:bg-muted/50 border-red-500/20">Zrušit</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onDeletePreset(presetToDelete.id);
                  setPresetToDelete(null);
                  toast({
                    title: "Předvolba smazána",
                    description: `Předvolba "${presetToDelete.name}" byla úspěšně smazána.`,
                  });
                }}
                className="bg-red-500/80 hover:bg-red-600 text-white backdrop-blur-sm"
              >
                Smazat
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* View details dialog */}
      <Dialog 
        open={!!viewingPreset} 
        onOpenChange={(open) => {
          if (!open) {
            // When closing, ensure we clean up properly
            setTimeout(() => setViewingPreset(null), 0);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl md:max-w-2xl bg-[#09090b] border-red-500/20 max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="bg-red-500/80 p-1.5 rounded backdrop-blur-sm">
                <Eye className="h-4 w-4 text-white" />
              </div>
              {viewingPreset?.name} - Detaily
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-180px)]">
            <div className="space-y-4 p-1">
              {viewingPreset?.description && (
              <div>
                <h4 className="text-sm font-medium mb-1">Popis:</h4>
                <p className="text-sm text-muted-foreground">{viewingPreset.description}</p>
              </div>
            )}
            <div>
              <h4 className="text-sm font-medium mb-1">Cílová umístění:</h4>
              {viewingPreset?.targetIds.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Žádná cílová umístění</p>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <ScrollArea className="max-h-[400px]">
                    <div className="p-2">
                      <ul className="space-y-2">
                        {viewingPreset?.targetIds.map((targetId, index) => {
                          const targetLocation = targetLocations.find(t => t.id === targetId);
                          return (
                            <li key={targetId} className="bg-[#121212]/80 rounded border border-red-500/20 overflow-hidden">
                              <div className="flex items-center gap-2 p-2">
                                <div className="bg-blue-500/20 text-blue-400 rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-medium">{index + 1}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <Computer className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                                    <span className="text-sm font-medium text-blue-400 truncate">{targetLocation?.name || 'Neznámé umístění'}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="bg-blue-950/30 border-t border-blue-500/10 px-2 py-1 mt-0.5">
                                <div className="pl-7 flex items-center">
                                  <span className="text-xs text-blue-300/70 truncate font-mono">{targetLocation?.path || 'Cesta není k dispozici'}</span>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
            </div>
          </ScrollArea>
          <DialogFooter className="mt-4">
            <Button 
              onClick={() => handleAction(() => {
                if (viewingPreset) {
                  onSavePreset(viewingPreset);
                }
              }, viewingPreset?.id || '')}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Edit className="h-4 w-4" />
              Upravit předvolbu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
