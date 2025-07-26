"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import ClientOnly from "./ClientOnly"
import { Button } from "@/components/custom-button"
import { FileLockChecker } from "@/components/FileLockChecker"
import { Lock, Unlock, AlertCircle, FileWarning, MoreHorizontal, Computer, Check, FolderOpen } from "lucide-react"
import path from "path"
import { AppSettings } from "@/lib/settings"
import { electronUtils } from "@/lib/electron-utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import * as TooltipPrimitive from "@radix-ui/react-tooltip"

// Custom tooltip component with proper typing
interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

const Tooltip = ({ children, content, side = 'top' }: TooltipProps) => (
  <TooltipPrimitive.Provider>
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>
        <span className="inline-flex items-center">{children}</span>
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { CheckCircle2, FilterX, FolderPlus, FolderSync, Plus, RefreshCw, Search, Settings, Star, X } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useDirectoryAccessibility } from "@/hooks/useDirectoryAccessibility"
import type { Preset, Settings as SettingsType } from "@/app/types"
import { PresetsDrawer } from "./PresetsDrawer"
import { TooltipProvider, TooltipTrigger } from "@radix-ui/react-tooltip"

interface TargetLocation {
  id: string
  name: string
  path: string
  selected: boolean
}

interface TargetDirectorySectionProps {
  isUpdating: boolean
  settings: SettingsType
  presets: Preset[]
  targetLocations: TargetLocation[]
  onAddLocation: (name: string, path: string) => Promise<void>
  onToggleLocation: (id: string) => Promise<void>
  onSaveSettings: (settings: SettingsType) => void
  onSavePreset: () => Promise<void>
  onDeletePreset: (id: string) => void
  onApplyPreset: (presetId: string, showToast?: boolean) => void
  onClearPreset?: () => void
  onOpenNewPresetDialog: () => void
  onOpenEditPresetDialog: (preset?: Preset) => void
  onCreatePresetFromSelection: () => void
}

export function TargetDirectorySection({
  isUpdating,
  settings,
  presets,
  targetLocations,
  onAddLocation,
  onToggleLocation,
  onSaveSettings,
  onSavePreset,
  onDeletePreset,
  onApplyPreset,
  onClearPreset,
  onOpenNewPresetDialog,
  onOpenEditPresetDialog,
  onCreatePresetFromSelection,
}: TargetDirectorySectionProps): React.ReactNode {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  // Initialize selectedPresetId with settings.defaultPresetId if it exists
  const [selectedPresetId, setSelectedPresetId] = useState<string | undefined>(
    settings.defaultPresetId || undefined
  );
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);
  
  // Internal state to track the selected preset ID for the UI
  // Initialize with settings.defaultPresetId if it exists
  const [internalSelectedPresetId, setInternalSelectedPresetId] = useState<string>(
    settings.defaultPresetId ? settings.defaultPresetId : ''
  );
  const [isPresetChanging, setIsPresetChanging] = useState(false);
  const presetChangeTimeout = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedDefaultPreset = useRef<boolean>(false);
  
  // Update internal state when the selectedPresetId changes
  useEffect(() => {
    console.log('selectedPresetId changed to:', selectedPresetId);
    if (selectedPresetId) {
      console.log('Setting internalSelectedPresetId to match selectedPresetId:', selectedPresetId);
      setInternalSelectedPresetId(selectedPresetId);
    } else if (settings.defaultPresetId) {
      // If no selectedPresetId but we have a defaultPresetId in settings, use that
      console.log('No selectedPresetId, but found defaultPresetId in settings:', settings.defaultPresetId);
      setInternalSelectedPresetId(settings.defaultPresetId);
    } else {
      console.log('No selectedPresetId or defaultPresetId, setting internalSelectedPresetId to empty string');
      setInternalSelectedPresetId('');
    }
  }, [selectedPresetId, settings.defaultPresetId]);
  
  // Load default preset on component mount
  useEffect(() => {
    // Only load the default preset once on initial mount
    if (hasLoadedDefaultPreset.current) {
      return;
    }
    
    // Use the async function to load settings from file system
    const loadDefaultPresetFromSettings = async () => {
      console.log('Starting loadDefaultPresetFromSettings...');
      console.log('Current presets available:', presets);
      
      // If presets aren't loaded yet, don't try to apply anything
      if (!presets || presets.length === 0) {
        console.log('Presets not yet loaded, deferring default preset application');
        return; // Exit early and wait for presets to load
      }
      
      try {
        // Import the necessary functions from settings
        console.log('Importing settings functions...');
        const { loadSettingsAsync } = await import('@/lib/settings');
        
        // Load settings from both localStorage and file system
        console.log('Calling loadSettingsAsync...');
        const loadedSettings = await loadSettingsAsync();
        console.log('Settings loaded:', loadedSettings);
        
        // We need to update the settings state without triggering a file save
        console.log('Updating app settings state without triggering file save...');
        
        // Create a copy of the loaded settings to work with
        const updatedSettings = { ...loadedSettings };
        
        // Mark as loaded to prevent recursion
        hasLoadedDefaultPreset.current = true;
        console.log('hasLoadedDefaultPreset set to true');
        
        // IMPORTANT: Only update the parent component's state with the settings
        // This ensures we don't lose the defaultPresetId that was loaded from file
        onSaveSettings(updatedSettings);
        
        // Check if there's a default preset set in the loaded settings
        const defaultPresetId = updatedSettings.defaultPresetId;
        console.log('Loaded settings with default preset ID:', defaultPresetId);
        console.log('Current selected preset ID:', selectedPresetId);
        
        if (defaultPresetId) {
          // Find the default preset in the available presets
          const defaultPreset = presets.find(p => p.id === defaultPresetId);
          
          if (defaultPreset) {
            console.log('Found preset:', defaultPreset);
            
            // Use the handleApplyPreset function with showToast=false to avoid toast notifications
            // during initialization or tab switching
            console.log('Applying preset silently during initialization');
            // IMPORTANT: Always pass false for showToast during initialization
            await handleApplyPreset(defaultPresetId, false);
            
            // Also update the UI state directly to ensure immediate UI update
            console.log('Setting selectedPresetId to:', defaultPresetId);
            setSelectedPresetId(defaultPresetId);
            console.log('Setting internalSelectedPresetId to:', defaultPresetId);
            setInternalSelectedPresetId(defaultPresetId); // Update the UI filter dropdown
            
            console.log('Default preset applied successfully without toast notification');
            return; // Exit early after applying preset
          } else {
            console.log('Default preset not found in available presets');
            
            // Only clear the default preset ID if we actually have presets loaded
            if (presets && presets.length > 0) {
              console.log('Presets are loaded but default preset not found, clearing defaultPresetId');
              // Clear the default preset ID without showing a toast notification
              // This is important during initialization to avoid unwanted notifications
              const updatedSettings = { ...settings, defaultPresetId: null };
              console.log('Clearing default preset ID silently');
              // We can only pass the settings object since the component interface doesn't support the showToast parameter
              // The parent component will need to detect this is a defaultPresetId clearing operation
              onSaveSettings(updatedSettings);
            } else {
              console.log('Presets array is empty, not clearing defaultPresetId as presets might not be loaded yet');
            }
          }
        } else {
          console.log('No default preset ID found in settings');
        }
      } catch (error) {
        console.error('Error loading default preset:', error);
        hasLoadedDefaultPreset.current = true; // Mark as loaded even on error
      }
    };
    
    // Execute the async function
    loadDefaultPresetFromSettings();
  }, [settings, presets, onApplyPreset, setSelectedPresetId, setInternalSelectedPresetId, onSaveSettings, selectedPresetId]); // Include dependencies but still only run once effectively due to the hasLoadedDefaultPreset check
  
  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (presetChangeTimeout.current) {
        clearTimeout(presetChangeTimeout.current);
      }
    };
  }, []);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [newLocationName, setNewLocationName] = useState("")
  const [newLocationPath, setNewLocationPath] = useState("")
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false)
  const [isPresetsDrawerOpen, setIsPresetsDrawerOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  
  // Filter target locations based on search query and selected preset
  const filteredTargetLocations = targetLocations.filter(location => {
    // Filter by search query
    const matchesSearch = 
      location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.path.toLowerCase().includes(searchQuery.toLowerCase());
      
    // If a preset is selected, filter by preset
    if (internalSelectedPresetId) {
      const preset = presets.find(p => p.id === internalSelectedPresetId);
      return matchesSearch && preset ? preset.targetIds.includes(location.id) : false;
    }
    
    return matchesSearch;
  });
  
  // Use our custom hook to track directory accessibility with enhanced refresh capabilities
  // Only check accessibility for filtered locations to improve performance
  const { accessStatus, refreshAccessibility, isChecking, forceCheck } = useDirectoryAccessibility(targetLocations, filteredTargetLocations);
    
  // Count selected locations
  const selectedCount = filteredTargetLocations.filter(loc => loc.selected).length;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (e.key === "Escape" && searchQuery) {
        setSearchQuery("")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [searchQuery])

  // Directory accessibility is now handled by useDirectoryAccessibility hook

  // Toggle target location selection
  const handleToggleLocation = async (id: string) => {
    try {
      await onToggleLocation(id);
    } catch (error) {
      console.error('Error toggling location:', error);
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : 'Nepodařilo se aktualizovat umístění.',
        variant: "destructive",
      });
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLocationName.trim() || !newLocationPath.trim()) {
      toast({
        title: "Error",
        description: "Please provide both a name and a path for the location.",
        variant: "destructive",
      })
      return
    }

    try {
      await onAddLocation(newLocationName.trim(), newLocationPath.trim())
      setNewLocationName("")
      setNewLocationPath("")
      // Refresh accessibility status after adding a new location
      await refreshAccessibility()
      toast({
        title: "Success",
        description: "Location added successfully.",
      })
    } catch (error) {
      console.error("Error adding location:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add location.",
        variant: "destructive",
      });
    }
  }

  const handleClearPreset = async () => {
    try {
      console.log('Clearing preset filter');
      if (typeof onClearPreset === 'function') {
        await onClearPreset();
      }
      console.log('Successfully cleared preset filter');
    } catch (error) {
      console.error('Error in handleClearPreset:', error);
      throw error;
    }
  };

  const handleApplyPreset = async (presetId: string, showToast: boolean = true) => {
    if (!presetId) return;
    
    try {
      console.log(`Applying preset: ${presetId}, showToast: ${showToast}`);
      // Pass the showToast parameter to the onApplyPreset function
      await onApplyPreset(presetId, showToast);
      console.log(`Successfully applied preset: ${presetId}`);
    } catch (error) {
      console.error('Error in handleApplyPreset:', error);
      // Don't revert here, let the error propagate to be handled by the caller
      throw error;
    }
  };

  // Use the onOpenNewPresetDialog prop from the parent component
  // to handle opening the new preset dialog

  const openEditPresetDialog = (preset: Preset) => {
    setEditingPreset(preset)
    setIsEditDialogOpen(true)
  }

  const handleSavePreset = () => {
    if (!editingPreset) return
    
    // Since we're using the parent component's savePreset function directly,
    // we'll just close the dialog and let the parent handle the save
    setIsEditDialogOpen(false)
    setEditingPreset(null)
    // The actual save is handled by the parent component
  }

  const handleDeletePreset = () => {
    if (!editingPreset) return
    onDeletePreset(editingPreset.id)
    setIsEditDialogOpen(false)
    setEditingPreset(null)
  }

  const renderAccessStatus = (locationId: string) => {
    const location = targetLocations.find(loc => loc.id === locationId);
    const isAccessible = accessStatus[locationId];
    
    if (isAccessible === undefined || isChecking) {
      return (
        <Tooltip content="Checking access...">
          <div className="flex items-center">
            <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />
          </div>
        </Tooltip>
      );
    }
    
    const tooltipContent = isAccessible 
      ? `Directory is accessible: ${location?.path}`
      : `Directory is not accessible: ${location?.path}`;
    
    return (
      <Tooltip content={tooltipContent}>
        <div className="flex items-center">
          {isAccessible ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
        </div>
      </Tooltip>
    );
  };

  const handleRefreshAccess = useCallback(async () => {
    try {
      // Force a complete refresh of all directory statuses
      await forceCheck();
      toast({
        title: "Status aktualizován",
        description: "Stav přístupů k adresářům byl aktualizován.",
      });
    } catch (error) {
      console.error("Error refreshing access status:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktualizovat stav přístupů k adresářům.",
        variant: "destructive",
      });
    }
  }, [forceCheck, toast]);

  return (
    <div className="w-full">
      <ClientOnly>
        <Card>
          <CardHeader className="bg-gradient-to-r from-[#1e293b] to-[#0f172a] text-white rounded-t-lg p-4 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-medium mb-1">Cílová umístění</CardTitle>
              <CardDescription className="text-gray-200 text-xs">
                Vyberte cílové cesty, kam budou soubory zkopírovány
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/80">Filtrovat podle předvolby:</span>
                <Select 
                  value={internalSelectedPresetId}
                  onValueChange={async (value) => {
                    if (isPresetChanging) return;
                    
                    setInternalSelectedPresetId(value);
                    setIsPresetChanging(true);
                    
                    try {
                      // Clear any pending preset changes
                      if (presetChangeTimeout.current) {
                        clearTimeout(presetChangeTimeout.current);
                      }
                      
                      // Debounce the preset change to avoid rapid consecutive calls
                      await new Promise<void>((resolve) => {
                        presetChangeTimeout.current = setTimeout(async () => {
                          try {
                            if (value === '') {
                              await handleClearPreset();
                            } else {
                              await handleApplyPreset(value);
                            }
                            resolve();
                          } catch (error) {
                            console.error('Error applying preset:', error);
                            // Revert UI state on error
                            setInternalSelectedPresetId(selectedPresetId || '');
                            throw error;
                          } finally {
                            setIsPresetChanging(false);
                          }
                        }, 300); // 300ms debounce
                      });
                    } catch (error) {
                      console.error('Error in preset change handler:', error);
                      toast({
                        title: "Chyba",
                        description: "Nepodařilo se aplikovat předvolbu. Zkuste to prosím znovu.",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={isPresetChanging}
                >
                  <SelectTrigger className="w-[180px] text-left bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">
                      <span className="font-medium">Všechny umístění</span>
                    </SelectItem>
                    {presets.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        <div className="flex items-center gap-2">
                          {preset.name} ({preset.targetIds.length})
                          {settings.defaultPresetId === preset.id && (
                            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Tooltip content="Vytvořit novou předvolbu">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onOpenNewPresetDialog}
                  disabled={isUpdating}
                  className="text-white hover:bg-white/20 hover:text-white"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </Tooltip>
              <Tooltip content="Vymazat filtr">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    console.log('Clear filter button clicked');
                    setInternalSelectedPresetId('');
                    if (typeof onClearPreset === 'function') {
                      console.log('Calling onClearPreset');
                      handleClearPreset();
                    }
                  }}
                  disabled={isUpdating || !internalSelectedPresetId}
                  className="text-white/80 hover:bg-white/10 hover:text-white border-white/20"
                >
                  <FilterX className="h-4 w-4" />
                </Button>
              </Tooltip>
              <Tooltip content="Správa předvoleb">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsPresetsDrawerOpen(true)}
                  className="text-white/80 hover:bg-white/10 hover:text-white"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">Seznam cílových umístění</h3>
              <span className="text-sm text-muted-foreground">
                {selectedCount} z {targetLocations.length} umístění vybráno
              </span>
            </div>
          </div>
          {/* Add new location form */}
          <div className="bg-muted/30 p-3 rounded-md border border-border m-2">
                    <div className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-4">
                        <label className="text-xs font-medium text-muted-foreground block mb-1">Název umístění</label>
                        <Input
                          value={newLocationName}
                          onChange={(e) => setNewLocationName(e.target.value)}
                          placeholder="Název umístění (např. E-Lab)"
                          disabled={isUpdating}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="col-span-6">
                        <label className="text-xs font-medium text-muted-foreground block mb-1">Cesta k umístění</label>
                        <div className="flex gap-2">
                          <Input
                            value={newLocationPath}
                            onChange={(e) => setNewLocationPath(e.target.value)}
                            placeholder="\\server\sdílená_složka\cesta"
                            className="h-8 text-sm font-mono flex-1"
                            disabled={isUpdating}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                const result = await window.electron.openDirectoryDialog();
                                if (result) {
                                  setNewLocationPath(result);
                                }
                              } catch (error) {
                                console.error('Error selecting directory:', error);
                                toast({
                                  variant: "destructive",
                                  title: "Chyba",
                                  description: "Nepodařilo se vybrat složku. Zkontrolujte prosím oprávnění.",
                                });
                              }
                            }}
                            disabled={isUpdating}
                            className="h-8 px-3 text-xs whitespace-nowrap"
                          >
                            Procházet...
                          </Button>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <Button
                          type="button"
                          onClick={handleAddLocation}
                          disabled={!newLocationName.trim() || !newLocationPath.trim() || isUpdating}
                          className="w-full h-8 text-xs"
                        >
                          Přidat
                        </Button>
                      </div>
                    </div>
                  </div>
          <div className="p-4 mt-4">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="target-locations" className="border-none">
                <div className="relative border-b border-gray-100 mb-2">
                  <AccordionTrigger className="hover:no-underline py-3 px-4 w-full text-center rounded-md transition-colors hover:bg-muted/30 group flex items-center justify-center [&>svg]:hidden">
                    <div className="relative">
                      <span className="text-xs text-gray-500 font-medium group-data-[state=open]:hidden">Zobrazit seznam adresářů</span>
                      <span className="text-xs text-gray-500 font-medium hidden group-data-[state=open]:block">Skrýt seznam adresářů</span>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                        <div className="bg-muted/30 dark:bg-gray-800 rounded-full p-1 shadow-sm border border-gray-100 dark:border-gray-700 pointer-events-none">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-data-[state=open]:rotate-180 transition-transform duration-300">
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                </div>
              <AccordionContent className="pt-4">
                <div className="space-y-4">
              
                  
                  <div className="flex items-center gap-2 mr-2 ml-2">
                    {/* Search bar for target locations - takes most of the space */}
                    <div className="relative flex-grow">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          ref={searchInputRef}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Hledat umístění..."
                          className="pl-9 w-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
                          disabled={isUpdating}
                        />
                        {searchQuery && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                            onClick={() => setSearchQuery("")}
                            disabled={isUpdating}
                            title="Vymazat vyhledávání (Esc)"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Action buttons on the right */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                    <Tooltip content="Vytvořit předvolbu z výběru">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onCreatePresetFromSelection}
                        disabled={isUpdating || selectedCount === 0}
                        className="gap-1 whitespace-nowrap"
                      >
                        <FolderPlus className="h-3 w-3" />
                     
                      </Button>
                      </Tooltip>
                      <Tooltip content="Zkontrolovat přístup cílových adresářů">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRefreshAccess}
                          className="gap-2"
                          disabled={isChecking}
                        >
                          <FolderSync className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                  

                  {/* Directory list */}
                  <div className="border rounded-md overflow-hidden">
                    {filteredTargetLocations.length > 0 ? (
                      <div className="divide-y">
                        {filteredTargetLocations.map((location) => (
                          <DirectoryItem
                            key={location.id}
                            location={location}
                            isAccessible={accessStatus[location.id] === true}
                            isChecking={isChecking}
                            onToggle={handleToggleLocation}
                            selected={location.selected}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center">
                        <div className="text-muted-foreground text-sm">
                          <p>Žádná cílová umístění nebyla nalezena.</p>
                          <p className="mt-1">Přidejte nové umístění pomocí formuláře výše.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </CardContent>
    </Card>
    
    <PresetsDrawer
      isOpen={isPresetsDrawerOpen}
      onClose={() => setIsPresetsDrawerOpen(false)}
      presets={presets}
      targetLocations={targetLocations}
      onSavePreset={onOpenEditPresetDialog}
      onDeletePreset={onDeletePreset}
      onSetDefault={async (id) => {
        console.log(`Setting default preset ID to: ${id}`);
        
        // Import the saveSettings function and DEFAULT_SETTINGS dynamically
        const { saveSettings, DEFAULT_SETTINGS } = await import('@/lib/settings');
        
        // First, create a full AppSettings object using DEFAULT_SETTINGS
        // This ensures we have all the required properties for saveSettings
        const fullSettings = { ...DEFAULT_SETTINGS };
        
        // Then, set the defaultPresetId to the new value
        fullSettings.defaultPresetId = id;
        
        // Log the settings object for debugging
        console.log('Full settings object with new default preset ID:', JSON.stringify(fullSettings, null, 2));
        
        // Save the full settings to both localStorage and file system (skipFileSave = false)
        saveSettings(fullSettings, false);
        
        // For the local state update, we only need to update the defaultPresetId
        // since that's all the Settings interface in app/types.ts contains
        const localSettings = { defaultPresetId: id };
        onSaveSettings(localSettings);
        
        // Log for debugging
        console.log(`Default preset ID set to: ${id} and saved to both localStorage and file system`);
      }}
      defaultPresetId={settings.defaultPresetId || undefined}
    />
  </ClientOnly>
</div>
  )
}

// Directory Item Component
function DirectoryItem({ 
  location, 
  isAccessible, 
  isChecking,
  onToggle,
  selected
}: {
  location: TargetLocation;
  isAccessible: boolean;
  isChecking: boolean;
  onToggle: (id: string) => void;
  selected: boolean;
}) {
  // Track if any important files are in use by another process
  const [isInUse, setIsInUse] = useState<boolean | null>(null);
  const [fileExists, setFileExists] = useState<boolean | null>(null);
  const [checkedFilePath, setCheckedFilePath] = useState<string | null>(null);
  const [dbFilesStatus, setDbFilesStatus] = useState<{[key: string]: boolean}>({});
  const [isCheckingFiles, setIsCheckingFiles] = useState<boolean>(false);
  const [fileSizes, setFileSizes] = useState<{[key: string]: number}>({});
  const [showPathDialog, setShowPathDialog] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const pathInputRef = useRef<HTMLInputElement>(null);
  
  // List of important files that might be locked
  const importantFiles = [
    // H2 Database files (used in the app)
    path.join(location.path, 'configurations.mv.db'),
    path.join(location.path, 'configurations.trace.db'),
    path.join(location.path, 'data.mv.db'),
    path.join(location.path, 'data.trace.db'),
    
    // JSON configuration files
    path.join(location.path, 'targetLocations.json'),
    path.join(location.path, 'settings.json'),
    
    // Log files
    path.join(location.path, 'sync.log'),
    path.join(location.path, 'error.log')
  ];
  
  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    // Use 1000-based units to match Windows Explorer display
    const k = 1000;
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    
    // Calculate the appropriate unit index
    const i = Math.floor(Math.log(Math.max(1, bytes)) / Math.log(k));
    
    // Calculate the value in the appropriate unit
    const value = bytes / Math.pow(k, i);
    
    // Format with 2 decimal places
    return `${value.toFixed(2)} ${units[i]}`;
  };
  
  // Function to get file stats including size
  const getFileStats = async (filePath: string) => {
    try {
      // Use the electronUtils.getFileStats method to get file information
      const stats = await electronUtils.getFileStats(filePath);
      return stats;
    } catch (error) {
      console.error(`Error getting file stats for ${filePath}:`, error);
      return { size: 0, isFile: false, isDirectory: false, modified: new Date() };
    }
  };
  
  // Function to check for important files in the directory
  const checkFilesExist = async () => {
    if (!location.path) return;
    
    try {
      // Check specifically for the main database files
      const dbFiles = [
        'configurations.mv.db',
        'configurations.trace.db'
      ];
      
      const statusResults: {[key: string]: boolean} = {};
      const sizeResults: {[key: string]: number} = {};
      let foundAnyFile = false;
      
      // Check each database file
      for (const filename of dbFiles) {
        const filePath = path.join(location.path, filename);
        const result = await electronUtils.getPathAccessDetails(filePath);
        statusResults[filename] = result.accessible;
        
        if (result.accessible) {
          foundAnyFile = true;
          setCheckedFilePath(filePath);
          
          // Get file size if file exists
          const stats = await getFileStats(filePath);
          sizeResults[filename] = stats.size || 0;
        }
      }
      
      // Update states
      setDbFilesStatus(statusResults);
      setFileSizes(sizeResults);
      setFileExists(foundAnyFile);
      
      if (!foundAnyFile) {
        // If no DB files found, check other important files
        for (const filePath of importantFiles) {
          const result = await electronUtils.getPathAccessDetails(filePath);
          if (result.accessible) {
            setFileExists(true);
            setCheckedFilePath(filePath);
            
            // Get file size for this file too
            const fileName = path.basename(filePath);
            const stats = await getFileStats(filePath);
            setFileSizes(prev => ({
              ...prev,
              [fileName]: stats.size || 0
            }));
            
            return;
          }
        }
        
        // No important files found at all
        setCheckedFilePath(null);
      }
    } catch (error) {
      console.error('Error checking if files exist:', error);
      setFileExists(null);
      setCheckedFilePath(null);
    }
  };
  
  // Check files when the component mounts or location changes
  useEffect(() => {
    checkFilesExist();
  }, [location.path]);
  
  // Get the path to check for locks
  const getFilePathToCheck = () => {
    // If we found an important file that exists, check that specific file
    if (fileExists && checkedFilePath) {
      return checkedFilePath;
    }
    
    // Otherwise, just check the directory itself
    return location.path;
  };
  
  // Check if the important files are in use
  const checkFilesInUse = async () => {
    if (!checkedFilePath) return;
    
    try {
      setIsCheckingFiles(true);
      
      // Check if the file is in use
      const result = await electronUtils.getFileInUseDetails(checkedFilePath);
      
      // Update the lock status
      setIsInUse(result.inUse);
      
      // Wait a bit to show the animation
      setTimeout(() => {
        setIsCheckingFiles(false);
      }, 500);
      
    } catch (error) {
      console.error('Error checking if file is in use:', error);
      setIsInUse(null);
      setIsCheckingFiles(false);
    }
  };
  
  // Handle file lock status updates
  const handleLockStatusChange = (status: 'locked' | 'available' | 'error' | 'unknown') => {
    setIsInUse(status === 'locked');
  };
  
  // Handle opening folder in file explorer
  const handleOpenFolder = async (path: string) => {
    try {
      // Try to use the Electron API first
      try {
        const result = await electronUtils.openFolderPath(path);
        if (!result.success) {
          throw new Error(result.error || 'Unknown error');
        }
      } catch (electronError) {
        console.error(`Electron API failed to open folder: ${path}`, electronError);
        
        // Show path in dialog as fallback
        setCurrentPath(path);
        setShowPathDialog(true);
        
        // Focus and select the input text after dialog is shown
        setTimeout(() => {
          if (pathInputRef.current) {
            pathInputRef.current.focus();
            pathInputRef.current.select();
          }
        }, 100);
      }
    } catch (error) {
      console.error(`Error handling folder open: ${path}`, error);
    }
  };
  return (
    <>
      {/* Path Dialog Modal */}
      {showPathDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowPathDialog(false)}>
          <div className="bg-[#09090b] border border-blue-500/30 rounded-lg p-4 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Otevřít složku</h3>
              <button 
                onClick={() => setShowPathDialog(false)}
                className="p-1 rounded-full hover:bg-blue-500/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Nelze přímo otevřít složku. Zkopírujte cestu a otevřete ji ručně:
            </p>
            <div className="flex gap-2">
              <input
                ref={pathInputRef}
                type="text"
                value={currentPath}
                readOnly
                className="flex-1 bg-background border border-blue-500/30 rounded px-3 py-1 text-sm"
                onClick={(e) => e.currentTarget.select()}
              />
              <button
                onClick={() => {
                  if (pathInputRef.current) {
                    pathInputRef.current.select();
                    document.execCommand('copy');
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
              >
                Kopírovat
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div
        className={`group flex items-center p-3 hover:bg-muted/30 transition-colors justify-between ${
          selected ? 'bg-primary/5' : ''
        }`}
      >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Checkbox
          id={`location-${location.id}`}
          checked={selected}
          onCheckedChange={() => onToggle(location.id)}
          className="flex-shrink-0 h-3.5 w-3.5"
        />
        <Computer className="h-3 w-3 text-blue-400 flex-shrink-0" />
        <div className="flex-1 min-w-0 flex items-center gap-2 mr-2">
          <span className="font-medium truncate text-sm">{location.name}</span>
          <span className="text-xs text-muted-foreground truncate mx-1">cesta: {location.path}</span>
          <Tooltip content="Otevřít složku">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenFolder(location.path);
              }}
              className="p-0.5 rounded hover:bg-blue-500/20 transition-colors ml-auto flex-shrink-0"
            >
              <FolderOpen className="h-3 w-3 text-amber-400" />
            </button>
          </Tooltip>
        </div>
      </div>
      
      {/* Status indicators */}
      <div className="flex items-center gap-4">
       
        
        {/* Path access status */}
        <div className="flex items-center gap-2">
          
          <Tooltip 
            content={
              isChecking
                ? 'Kontroluji přístup...' 
                : isAccessible 
                  ? 'Cesta je přístupná' 
                  : 'Cesta není přístupná'
            }
          >
            <span className="flex items-center justify-center h-5 w-5 rounded-full">
              {isChecking ? (
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
              ) : isAccessible ? (
                <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></div>
              ) : (
                <div className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse"></div>
              )}
            </span>
          </Tooltip>
      </div>
       {/* File lock status */}
       <div className="flex items-center gap-1">
         <Popover>
           <PopoverTrigger asChild>
             <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
               <MoreHorizontal className="h-4 w-4" />
               <span className="sr-only">Menu</span>
             </Button>
           </PopoverTrigger>
           <PopoverContent className="w-[350px] p-3" side="left">
             <div className="space-y-4">
               {/* Combined file status */}
               <div className="space-y-2">
                 <h4 className="font-medium text-sm">Stav souborů</h4>
                 <div className="space-y-1">
                   <p className="font-medium text-xs">Očekávané soubory:</p>
                   <ul className="text-xs space-y-0.5">
                     <li className="flex items-center gap-1">
                       {dbFilesStatus['configurations.mv.db'] ? 
                         <Check className="h-3 w-3 text-green-500" /> : 
                         <X className="h-3 w-3 text-red-500" />}
                       <span className="flex-1">configurations.mv.db</span>
                       {dbFilesStatus['configurations.mv.db'] && fileSizes['configurations.mv.db'] > 0 && (
                         <span className="text-xs text-blue-500 ml-2">
                           {formatFileSize(fileSizes['configurations.mv.db'])}
                         </span>
                       )}
                     </li>
                     <li className="flex items-center gap-1">
                       {dbFilesStatus['configurations.trace.db'] ? 
                         <Check className="h-3 w-3 text-green-500" /> : 
                         <X className="h-3 w-3 text-red-500" />}
                       <span className="flex-1">configurations.trace.db</span>
                       {dbFilesStatus['configurations.trace.db'] && fileSizes['configurations.trace.db'] > 0 && (
                         <span className="text-xs text-blue-500 ml-2">
                           {formatFileSize(fileSizes['configurations.trace.db'])}
                         </span>
                       )}
                     </li>
                   </ul>
                 </div>
               </div>
               
               {/* File lock status */}
               <div className="space-y-2 border-t pt-3">
                 <h4 className="font-medium text-sm">Stav zámku souborů</h4>
                 <div className="space-y-2">
                   {isCheckingFiles ? (
                     <div className="flex items-center gap-2">
                       <Search className="h-4 w-4 text-blue-500 animate-pulse" />
                       <span className="text-xs">Kontroluji stav souborů...</span>
                     </div>
                   ) : isInUse === true ? (
                     <div className="flex items-start gap-2">
                       <Lock className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                       <div>
                         <p className="font-medium text-xs">Soubory jsou uzamčeny</p>
                         <p className="text-xs text-muted-foreground">
                           Soubory jsou používány jiným procesem. <span className="text-red-500 font-medium">Aktualizace nebude možná</span>, dokud nebudou soubory uvolněny.
                         </p>
                       </div>
                     </div>
                   ) : isInUse === false ? (
                     <div className="flex items-start gap-2">
                       <Unlock className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                       <div>
                         <p className="font-medium text-xs">Soubory jsou dostupné</p>
                         <p className="text-xs text-muted-foreground">
                           Soubory nejsou používány jiným procesem. <span className="text-green-500 font-medium">Aktualizace je možná</span>, soubory mohou být bezpečně přepsány.
                         </p>
                       </div>
                     </div>
                   ) : !fileExists || !dbFilesStatus['configurations.mv.db'] || !dbFilesStatus['configurations.trace.db'] ? (
                     <div className="flex items-start gap-2">
                       <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                       <div>
                         <p className="font-medium text-xs">Soubory nebyly nalezeny</p>
                         <p className="text-xs">
                           {!dbFilesStatus['configurations.mv.db'] && !dbFilesStatus['configurations.trace.db'] ? (
                             <>Soubory <span className="font-bold text-red-500">configurations.mv.db</span> a <span className="font-bold text-red-500">configurations.trace.db</span> nebyly nalezeny.</>
                           ) : !dbFilesStatus['configurations.mv.db'] ? (
                             <>Soubor <span className="font-bold text-red-500">configurations.mv.db</span> nebyl nalezen.</>
                           ) : (
                             <>Soubor <span className="font-bold text-red-500">configurations.trace.db</span> nebyl nalezen.</>
                           )}
                         </p>
                       </div>
                     </div>
                   ) : (
                     <div className="flex items-center gap-2">
                       <RefreshCw className="h-4 w-4 text-blue-500 flex-shrink-0" />
                       <span className="text-xs">Klikněte pro kontrolu stavu souborů</span>
                     </div>
                   )}
                   
                   <button
                     onClick={() => {
                       checkFilesExist();
                       if (fileExists) {
                         checkFilesInUse();
                       }
                     }}
                     disabled={isCheckingFiles}
                     className="mt-2 w-full text-xs px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center justify-center gap-1 transition-colors disabled:bg-amber-500 disabled:text-white"
                   >
                     <RefreshCw className="h-3 w-3" />
                     Zkontrolovat stav souborů
                   </button>
                 </div>
               </div>
             </div>
           </PopoverContent>
         </Popover>
         
       </div>
      </div>
     </div>
    </>
   );
}
