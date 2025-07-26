'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/custom-button';
import { SectionHeader } from '@/components/section-header';
import { useTargetLocationsStore } from '@/lib/stores/use-target-locations-store';
import { TargetLocation } from '@/app/types';
import { 
  Plus, Computer, Search, X, FolderOpen, Edit, Check, 
  Trash2, RefreshCw, ChevronDown, ChevronRight, ExternalLink
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useFileOperations } from '@/hooks/use-file-operations';

interface VirtualizedTargetLocationsProps {
  isUpdating: boolean;
}

// Memoized directory item component
const DirectoryItem = React.memo(({ 
  index, 
  style, 
  data 
}: { 
  index: number; 
  style: React.CSSProperties; 
  data: any;
}) => {
  const location = data.locations[index];
  const isSelected = data.selectedLocations.has(index);
  const isExpanded = data.expandedLocations.has(index);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(location.name);
  const [editPath, setEditPath] = useState(location.path);

  const handleSave = useCallback(() => {
    const success = data.onUpdateLocation(index, { name: editName, path: editPath });
    if (success) setIsEditing(false);
  }, [data, index, editName, editPath]);

  return (
    <div style={style} className="px-4 py-2">
      <div className="border rounded-lg p-4 bg-card">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => data.onToggleSelection(index)}
            className="mt-1 flex-shrink-0"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Computer className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Lokace #{index + 1}</span>
              </div>

              <div className="flex items-center gap-1">
                {!isEditing ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-6 w-6 p-0">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => data.onToggleExpansion(index)} className="h-6 w-6 p-0">
                      {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" size="sm" onClick={handleSave} className="h-6 w-6 p-0 text-green-600">
                    <Check className="h-3 w-3" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => data.onRemoveLocation(index)} className="h-6 w-6 p-0 text-red-500">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                {isEditing ? (
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Název lokace" />
                ) : (
                  <div className="p-2 bg-muted/50 rounded border text-sm">{location.name}</div>
                )}
              </div>

              <div>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Input value={editPath} onChange={(e) => setEditPath(e.target.value)} className="flex-1" placeholder="Cesta" />
                      <Button variant="outline" size="sm" onClick={() => data.onBrowseFolder(index)} className="px-3">
                        <FolderOpen className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <div className="flex-1 p-2 bg-muted/50 rounded border text-sm font-mono">{location.path}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

DirectoryItem.displayName = 'DirectoryItem';

export const VirtualizedTargetLocations = React.memo(({ isUpdating }: VirtualizedTargetLocationsProps) => {
  const { targetLocations, addTargetLocation, updateTargetLocation, removeTargetLocation, saveTargetLocations } = useTargetLocationsStore();
  const { browseFolder } = useFileOperations();
  
  const [selectedLocations, setSelectedLocations] = useState<Set<number>>(new Set());
  const [expandedLocations, setExpandedLocations] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationPath, setNewLocationPath] = useState('');

  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return targetLocations;
    const query = searchQuery.toLowerCase();
    return targetLocations.filter(location => 
      location.name.toLowerCase().includes(query) || location.path.toLowerCase().includes(query)
    );
  }, [targetLocations, searchQuery]);

  const handleToggleSelection = useCallback((index: number) => {
    setSelectedLocations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) newSet.delete(index);
      else newSet.add(index);
      return newSet;
    });
  }, []);

  const handleToggleExpansion = useCallback((index: number) => {
    setExpandedLocations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) newSet.delete(index);
      else newSet.add(index);
      return newSet;
    });
  }, []);

  const handleUpdateLocation = useCallback((index: number, updates: Partial<TargetLocation>): boolean => {
    try {
      const location = filteredLocations[index];
      if (!location) return false;
      updateTargetLocation(location.id, updates);
      saveTargetLocations();
      toast.success('Lokace byla aktualizována');
      return true;
    } catch (error) {
      toast.error('Chyba při aktualizaci lokace');
      return false;
    }
  }, [filteredLocations, updateTargetLocation, saveTargetLocations]);

  const handleBrowseFolder = useCallback(async (index: number) => {
    try {
      const selectedPath = await browseFolder();
      if (selectedPath) {
        handleUpdateLocation(index, { path: selectedPath });
      }
    } catch (error) {
      toast.error('Chyba při procházení složek');
    }
  }, [browseFolder, handleUpdateLocation]);

  const handleRemoveLocation = useCallback((index: number) => {
    try {
      const location = filteredLocations[index];
      if (location) {
        removeTargetLocation(location.id);
        saveTargetLocations();
        toast.success('Lokace byla odstraněna');
      }
    } catch (error) {
      toast.error('Chyba při odstraňování lokace');
    }
  }, [filteredLocations, removeTargetLocation, saveTargetLocations]);

  const handleAddLocation = useCallback(async () => {
    if (!newLocationName.trim() || !newLocationPath.trim()) {
      toast.error('Vyplňte název i cestu lokace');
      return;
    }

    try {
      await addTargetLocation({ 
        id: Date.now().toString(), 
        name: newLocationName.trim(), 
        path: newLocationPath.trim(),
        selected: false
      });
      await saveTargetLocations();
      setNewLocationName('');
      setNewLocationPath('');
      toast.success('Lokace byla přidána');
    } catch (error) {
      toast.error('Chyba při přidávání lokace');
    }
  }, [newLocationName, newLocationPath, addTargetLocation, saveTargetLocations]);

  const rowData = useMemo(() => ({
    locations: filteredLocations,
    selectedLocations,
    expandedLocations,
    onToggleSelection: handleToggleSelection,
    onToggleExpansion: handleToggleExpansion,
    onUpdateLocation: handleUpdateLocation,
    onBrowseFolder: handleBrowseFolder,
    onRemoveLocation: handleRemoveLocation,
    isUpdating,
  }), [filteredLocations, selectedLocations, expandedLocations, handleToggleSelection, handleToggleExpansion, handleUpdateLocation, handleBrowseFolder, handleRemoveLocation, isUpdating]);

  return (
    <Card className="h-full flex flex-col">
      <SectionHeader
        title="Cílové lokace"
        description="Správa destinací pro kopírování databází"
        action={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Computer className="h-4 w-4" />
            <span>{filteredLocations.length} lokací</span>
          </div>
        }
      />
      
      <CardContent className="flex-1 flex flex-col p-0">
        <div className="p-4 border-b space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Hledat lokace..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-3 p-3 bg-muted/50 rounded border">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="font-medium text-sm">Přidat novou lokaci</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                placeholder="Název lokace"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Cesta k lokaci"
                  value={newLocationPath}
                  onChange={(e) => setNewLocationPath(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={async () => {
                  const path = await browseFolder();
                  if (path) setNewLocationPath(path);
                }} className="px-3">
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button onClick={handleAddLocation} disabled={!newLocationName.trim() || !newLocationPath.trim()} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Přidat lokaci
            </Button>
          </div>
        </div>

        <div className="flex-1">
          {filteredLocations.length > 0 ? (
            <List
              height={500}
              width="100%" // Required width prop
              itemCount={filteredLocations.length}
              itemSize={180}
              itemData={rowData}
              overscanCount={3}
            >
              {DirectoryItem}
            </List>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Computer className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Žádné lokace</h3>
              <p className="text-muted-foreground">
                {searchQuery ? 'Žádné lokace neodpovídají vašemu hledání.' : 'Přidejte první cílovou lokaci.'}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

VirtualizedTargetLocations.displayName = 'VirtualizedTargetLocations';
