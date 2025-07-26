'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/custom-button';
import { SectionHeader } from '@/components/section-header';
import { useHistoryStore } from '@/lib/stores/use-history-store';
import { useSettingsStore } from '@/lib/stores/use-settings-store';
import { HistoryEntry } from '@/app/types';
import { 
  Clock, 
  FileText, 
  Trash2, 
  Save,
  Copy,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Loader2,
  FileSpreadsheet,
  MoreVertical,
  Pencil,
  AlertCircle,
  Check,
  Eraser,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit2,
  Folder,
  Info,
  Computer,
  FolderOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface VirtualizedHistoryTableProps {
  onOpenHistorySidebar: () => void;
}

// Memoized row component for better performance
const HistoryRow = React.memo(({ 
  index, 
  style, 
  data 
}: { 
  index: number; 
  style: React.CSSProperties; 
  data: {
    items: HistoryEntry[];
    selectedEntries: Set<number>;
    expandedRows: Set<number>;
    onToggleSelection: (id: number) => void;
    onToggleExpansion: (id: number) => void;
    onEditEntry: (entry: HistoryEntry) => void;
    onDeleteEntry: (entry: HistoryEntry) => void;
    formatDate: (timestamp: number) => string;
    getEntryStatus: (entry: HistoryEntry) => string;
    getTotalDuration: (entry: HistoryEntry) => number | null;
    formatDuration: (ms: number) => string;
  };
}) => {
  const entry = data.items[index];
  const isSelected = data.selectedEntries.has(entry.id);
  const isExpanded = data.expandedRows.has(entry.id);
  
  const handleToggleSelection = useCallback(() => {
    data.onToggleSelection(data.items[index].id);
  }, [data, index]);

  const handleToggleExpansion = useCallback(() => {
    data.onToggleExpansion(data.items[index].id);
  }, [data, index]);

  const handleEdit = useCallback(() => {
    data.onEditEntry(data.items[index]);
  }, [data, index]);

  const handleDelete = useCallback(() => {
    data.onDeleteEntry(data.items[index]);
  }, [data, index]);

  const status = data.getEntryStatus(entry);
  const duration = data.getTotalDuration(entry);

  return (
    <div style={style} className="px-4 py-2 border-b border-border/50">
      <div className="flex items-center gap-3">
        {/* Selection Checkbox */}
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleToggleSelection}
          className="flex-shrink-0"
        />

        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleExpansion}
          className="p-1 h-6 w-6 flex-shrink-0"
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </Button>

        {/* Entry Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Version Badge */}
              {entry.version && (
                <Badge variant="outline" className="text-xs px-2 py-0.5 flex-shrink-0">
                  {entry.version}
                </Badge>
              )}

              {/* Description */}
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">
                  {entry.description}
                </div>
                <div className="text-xs text-muted-foreground">
                  {data.formatDate(entry.timestamp)}
                </div>
              </div>

              {/* Status Badge */}
              <Badge 
                variant={
                  status === 'Úspěch' ? 'default' : 
                  status === 'Chyba' ? 'destructive' : 
                  'secondary'
                }
                className="text-xs flex-shrink-0"
              >
                {status}
              </Badge>

              {/* Duration */}
              {duration && (
                <div className="text-xs text-blue-400 flex-shrink-0">
                  {data.formatDuration(duration)}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleEdit}
                      className="h-6 w-6 p-0"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Upravit popis</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDelete}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Smazat záznam</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="mt-3 p-3 bg-background/50 rounded border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Source Path */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FolderOpen className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium">Zdrojová cesta:</span>
                  </div>
                  <div className="text-sm font-mono bg-background rounded px-2 py-1 border">
                    {entry.sourcePath}
                  </div>
                </div>

                {/* Target Locations */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Computer className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium">Cílové lokace:</span>
                    <Badge variant="outline" className="text-xs">
                      {entry.targetLocations?.length || 0}
                    </Badge>
                  </div>
                  
                  {entry.targetLocations && entry.targetLocations.length > 0 ? (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {entry.targetLocations.map((location, idx) => {
                        const result = entry.copyResults?.[idx];
                        const isSuccess = result?.success;
                        
                        return (
                          <div 
                            key={idx} 
                            className="flex items-center gap-2 p-2 rounded border text-sm"
                          >
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              isSuccess === true ? 'bg-green-500' : 
                              isSuccess === false ? 'bg-red-500' : 
                              'bg-gray-400'
                            }`} />
                            
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{location.name}</div>
                              <div className="text-xs text-muted-foreground font-mono truncate">
                                {location.path}
                              </div>
                              {result?.error && (
                                <div className="text-red-600 text-xs mt-1">
                                  {result.error}
                                </div>
                              )}
                            </div>
                            
                            <Badge 
                              variant={isSuccess === true ? 'default' : isSuccess === false ? 'destructive' : 'secondary'}
                              className="text-xs flex-shrink-0"
                            >
                              {isSuccess === true ? 'OK' : isSuccess === false ? 'Chyba' : 'Čeká'}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">
                      Žádné cílové lokace
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

HistoryRow.displayName = 'HistoryRow';

export const VirtualizedHistoryTable = React.memo(({ onOpenHistorySidebar }: VirtualizedHistoryTableProps) => {
  const { history, removeHistoryEntry, saveHistoryEntries, updateHistoryEntry } = useHistoryStore();
  const { settings } = useSettingsStore();
  
  // State management
  const [selectedEntries, setSelectedEntries] = useState<Set<number>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEntry, setEditingEntry] = useState<HistoryEntry | null>(null);
  const [editedDescription, setEditedDescription] = useState('');
  const [entryToDelete, setEntryToDelete] = useState<HistoryEntry | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState(false);

  // Memoized helper functions
  const getEntryStatus = useCallback((entry: HistoryEntry): string => {
    if (!entry.copyResults || entry.copyResults.length === 0) {
      return 'Neznámý';
    }
    
    const allSuccess = entry.copyResults.every(result => result.success);
    const allFailed = entry.copyResults.every(result => !result.success);
    
    if (allSuccess) {
      return 'Úspěch';
    } else if (allFailed) {
      return 'Chyba';
    } else {
      return 'Částečný úspěch';
    }
  }, []);

  const formatDate = useCallback((timestamp: number) => {
    try {
      const date = new Date(timestamp);
      return format(date, 'dd.MM.yyyy HH:mm', { locale: cs });
    } catch (e) {
      return 'Neplatné datum';
    }
  }, []);

  const getTotalDuration = useCallback((entry: HistoryEntry): number | null => {
    if (!entry.copyResults || entry.copyResults.length === 0) {
      return null;
    }
    
    const totalDuration = entry.copyResults.reduce((sum, result) => {
      return sum + (result.duration || 0);
    }, 0);
    
    return totalDuration > 0 ? totalDuration : null;
  }, []);

  const formatDuration = useCallback((ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  }, []);

  // Memoized filtered history
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    
    const query = searchQuery.toLowerCase();
    return history.filter(entry => 
      entry.description.toLowerCase().includes(query) ||
      entry.sourcePath.toLowerCase().includes(query) ||
      entry.targetLocations.some(loc => 
        loc.name.toLowerCase().includes(query) || 
        loc.path.toLowerCase().includes(query)
      ) ||
      (entry.version && entry.version.toLowerCase().includes(query)) ||
      formatDate(entry.timestamp).toLowerCase().includes(query)
    );
  }, [history, searchQuery, formatDate]);

  // Memoized event handlers
  const handleToggleSelection = useCallback((id: number) => {
    setSelectedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleToggleExpansion = useCallback((id: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleEditEntry = useCallback((entry: HistoryEntry) => {
    setEditingEntry(entry);
    setEditedDescription(entry.description);
  }, []);

  const handleDeleteEntry = useCallback((entry: HistoryEntry) => {
    setEntryToDelete(entry);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedEntries.size === filteredHistory.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(filteredHistory.map(entry => entry.id)));
    }
  }, [selectedEntries.size, filteredHistory]);

  const handleBatchDelete = useCallback(async () => {
    try {
      for (const id of selectedEntries) {
        await removeHistoryEntry(id);
      }
      await saveHistoryEntries();
      setSelectedEntries(new Set());
      setIsBatchDeleteDialogOpen(false);
      toast.success(`Smazáno ${selectedEntries.size} záznamů`);
    } catch (error) {
      console.error('Error deleting entries:', error);
      toast.error('Chyba při mazání záznamů');
    }
  }, [selectedEntries, removeHistoryEntry, saveHistoryEntries]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingEntry) return;
    
    try {
      await updateHistoryEntry(editingEntry.id, { description: editedDescription });
      await saveHistoryEntries();
      setEditingEntry(null);
      setEditedDescription('');
      toast.success('Popis byl aktualizován');
    } catch (error) {
      console.error('Error updating entry:', error);
      toast.error('Chyba při aktualizaci popisu');
    }
  }, [editingEntry, editedDescription, updateHistoryEntry, saveHistoryEntries]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!entryToDelete) return;
    
    try {
      await removeHistoryEntry(entryToDelete.id);
      await saveHistoryEntries();
      setEntryToDelete(null);
      setIsDeleteDialogOpen(false);
      toast.success('Záznam byl smazán');
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Chyba při mazání záznamu');
    }
  }, [entryToDelete, removeHistoryEntry, saveHistoryEntries]);

  // Memoized row data
  const rowData = useMemo(() => ({
    items: filteredHistory,
    selectedEntries,
    expandedRows,
    onToggleSelection: handleToggleSelection,
    onToggleExpansion: handleToggleExpansion,
    onEditEntry: handleEditEntry,
    onDeleteEntry: handleDeleteEntry,
    formatDate,
    getEntryStatus,
    getTotalDuration,
    formatDuration,
  }), [
    filteredHistory,
    selectedEntries,
    expandedRows,
    handleToggleSelection,
    handleToggleExpansion,
    handleEditEntry,
    handleDeleteEntry,
    formatDate,
    getEntryStatus,
    getTotalDuration,
    formatDuration,
  ]);

  return (
    <Card className="h-full flex flex-col">
      <SectionHeader
        title="Historie operací"
        description="Přehled všech provedených kopírování databází"
        action={
          <Button
            onClick={onOpenHistorySidebar}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Clock className="h-4 w-4" />
            Detail
          </Button>
        }
      />
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Search and Controls */}
        <div className="p-4 border-b space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Hledat v historii..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedEntries.size > 0 && (
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <span className="text-sm text-muted-foreground">
                Vybráno {selectedEntries.size} záznamů
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsBatchDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Smazat vybrané
              </Button>
            </div>
          )}

          {/* Select All */}
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedEntries.size === filteredHistory.length && filteredHistory.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              Vybrat vše ({filteredHistory.length} záznamů)
            </span>
          </div>
        </div>

        {/* Virtualized List */}
        <div className="flex-1">
          {filteredHistory.length > 0 ? (
            <List
              height={600} // Fixed height for virtualization
              width="100%" // Required width prop
              itemCount={filteredHistory.length}
              itemSize={120} // Base height per row (will expand for expanded rows)
              itemData={rowData}
              overscanCount={5} // Render 5 extra items outside viewport for smooth scrolling
            >
              {HistoryRow}
            </List>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Žádná historie</h3>
              <p className="text-muted-foreground">
                {searchQuery ? 'Žádné záznamy neodpovídají vašemu hledání.' : 'Zatím nebyly provedeny žádné operace kopírování.'}
              </p>
            </div>
          )}
        </div>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upravit popis</DialogTitle>
            <DialogDescription>
              Změňte popis pro tento záznam historie.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              placeholder="Zadejte nový popis..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntry(null)}>
              Zrušit
            </Button>
            <Button onClick={handleSaveEdit}>
              Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smazat záznam</DialogTitle>
            <DialogDescription>
              Opravdu chcete smazat tento záznam? Tato akce je nevratná.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Zrušit
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Smazat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Delete Confirmation Dialog */}
      <Dialog open={isBatchDeleteDialogOpen} onOpenChange={setIsBatchDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smazat vybrané záznamy</DialogTitle>
            <DialogDescription>
              Opravdu chcete smazat {selectedEntries.size} vybraných záznamů? Tato akce je nevratná.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBatchDeleteDialogOpen(false)}>
              Zrušit
            </Button>
            <Button variant="destructive" onClick={handleBatchDelete}>
              Smazat vše
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
});

VirtualizedHistoryTable.displayName = 'VirtualizedHistoryTable';
