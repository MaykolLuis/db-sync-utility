'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/custom-button';
import { Badge } from '@/components/ui/badge';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Search, X, FileText, Folder, Settings, History, Target, Database, Clock, MapPin, User, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useTargetLocationsStore } from '@/lib/stores/use-target-locations-store';
import { useHistoryStore } from '@/lib/stores/use-history-store';
import { useSettingsStore } from '@/lib/stores/use-settings-store';
import { HistoryEntry, TargetLocation } from '@/app/page';

// Custom tooltip component
interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

const Tooltip = ({ children, content, side = 'top' }: TooltipProps) => (
  <TooltipPrimitive.Root>
    <TooltipPrimitive.Trigger asChild>
      <div className="flex items-center w-full">{children}</div>
    </TooltipPrimitive.Trigger>
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content 
        side={side}
        sideOffset={4}
        className="max-w-[300px] rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
        style={{ zIndex: 99999999 }}
      >
        <div className="break-words whitespace-normal">
          {content}
        </div>
        <TooltipPrimitive.Arrow className="fill-popover" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  </TooltipPrimitive.Root>
);

interface SearchResult {
  id: string;
  type: 'source' | 'target' | 'history' | 'settings' | 'general';
  title: string;
  description: string;
  content: string;
  icon: React.ReactNode;
  category: string;
  action?: () => void;
  metadata?: Record<string, any>;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourcePath: string;
  onNavigateToTab: (tab: string) => void;
  onOpenHistorySidebar: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  sourcePath,
  onNavigateToTab,
  onOpenHistorySidebar,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isDrawerClosing, setIsDrawerClosing] = useState(false);

  const { targetLocations } = useTargetLocationsStore();
  const { history } = useHistoryStore();
  const { settings } = useSettingsStore();

  // Format date for display
  const formatDate = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  // Generate search results based on query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }

    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Search in source directory
    if (sourcePath && sourcePath.toLowerCase().includes(query)) {
      results.push({
        id: 'source-path',
        type: 'source',
        title: 'Zdrojová složka',
        description: sourcePath,
        content: `Aktuální zdrojová cesta: ${sourcePath}`,
        icon: <Folder className="h-4 w-4" />,
        category: 'Zdroj',
        action: () => {
          onNavigateToTab('source');
          onClose();
        },
      });
    }

    // Search in target locations
    targetLocations.forEach((location, index) => {
      const matchesName = location.name.toLowerCase().includes(query);
      const matchesPath = location.path.toLowerCase().includes(query);
      
      if (matchesName || matchesPath) {
        results.push({
          id: `target-${location.id || index}`,
          type: 'target',
          title: location.name,
          description: location.path,
          content: `Cílová lokace: ${location.name} - ${location.path}`,
          icon: <Target className="h-4 w-4" />,
          category: 'Cíle',
          metadata: { selected: location.selected },
          action: () => {
            onNavigateToTab('targets');
            onClose();
          },
        });
      }
    });

    // Search in history entries
    history.forEach((entry: HistoryEntry) => {
      const matchesDescription = entry.description.toLowerCase().includes(query);
      const matchesSource = entry.sourcePath.toLowerCase().includes(query);
      const matchesVersion = entry.version?.toLowerCase().includes(query);
      const matchesTargets = entry.targetLocations.some(
        (target: TargetLocation) =>
          target.name.toLowerCase().includes(query) ||
          target.path.toLowerCase().includes(query)
      );

      if (matchesDescription || matchesSource || matchesVersion || matchesTargets) {
        const copyResults = entry.copyResults || [];
        const successfulResults = copyResults.filter((r: any) => r.success);
        const failedResults = copyResults.filter((r: any) => !r.success);
        
        const status = copyResults.length === 0 ? 'Bez výsledků' :
                      copyResults.every((r: any) => r.success) ? 'Úspěšné' : 
                      copyResults.some((r: any) => r.success) ? 'Částečně úspěšné' : 'Neúspěšné';
        
        // Calculate enhanced metadata
        const totalDuration = copyResults.reduce((sum: number, r: any) => sum + (r.duration || 0), 0);
        const totalFileSize = copyResults.reduce((sum: number, r: any) => sum + (r.fileSize || 0), 0);
        const filesWithDiff = copyResults.filter((r: any) => r.hasDiff === true).length;
        const successRate = copyResults.length > 0 ? Math.round((successfulResults.length / copyResults.length) * 100) : 0;
        
        results.push({
          id: `history-${entry.id}`,
          type: 'history',
          title: entry.description,
          description: `${formatDate(entry.timestamp)} - ${status}`,
          content: `Historie: ${entry.description} - Zdroj: ${entry.sourcePath} - Verze: ${entry.version || 'N/A'} - Cíle: ${entry.targetLocations.map(t => t.name).join(', ')}`,
          icon: <History className="h-4 w-4" />,
          category: 'Historie',
          metadata: { 
            timestamp: entry.timestamp, 
            version: entry.version,
            status: status,
            targetCount: entry.targetLocations.length,
            successCount: successfulResults.length,
            copyResults: copyResults,
            totalDuration: totalDuration > 0 ? totalDuration : undefined,
            successRate: copyResults.length > 0 ? successRate : undefined,
            totalFileSize: totalFileSize > 0 ? totalFileSize : undefined,
            filesWithDiff: filesWithDiff,
            failedOperations: failedResults.length
          },
          action: () => {
            onNavigateToTab('history');
            onClose();
          },
        });
      }
    });

    // Search in settings
    const settingsSearchable = [
      { key: 'createBackupBeforeOverwrite', label: 'Vytvářet zálohu před přepsáním', value: settings.createBackupBeforeOverwrite },
      { key: 'showConfirmationBeforeCopy', label: 'Zobrazovat potvrzovací dialog', value: settings.showConfirmationBeforeCopy },
      { key: 'rememberSourcePath', label: 'Pamatovat si zdrojovou cestu', value: settings.rememberSourcePath },
      { key: 'historyRetentionDays', label: 'Dny uchování historie', value: `${settings.historyRetentionDays} dní` },
      { key: 'historyItemsPerPage', label: 'Počet položek historie na stránku', value: settings.historyItemsPerPage },
      { key: 'enableAutoSave', label: 'Povolit automatické ukládání', value: settings.enableAutoSave },
    ];

    settingsSearchable.forEach((setting) => {
      if (setting.label.toLowerCase().includes(query) || 
          setting.key.toLowerCase().includes(query) ||
          setting.value.toString().toLowerCase().includes(query)) {
        results.push({
          id: `setting-${setting.key}`,
          type: 'settings',
          title: setting.label,
          description: `Hodnota: ${setting.value}`,
          content: `Nastavení: ${setting.label} - ${setting.value}`,
          icon: <Settings className="h-4 w-4" />,
          category: 'Nastavení',
          action: () => {
            onNavigateToTab('settings');
            onClose();
          },
        });
      }
    });

    // Add general app features if query matches
    const generalFeatures = [
      { key: 'copy', label: 'Kopírování souborů', description: 'Kopírování databázových souborů do cílových lokací' },
      { key: 'backup', label: 'Zálohy', description: 'Vytváření záloh před přepsáním souborů' },
      { key: 'history', label: 'Historie operací', description: 'Zobrazení historie kopírovacích operací' },
      { key: 'shortcuts', label: 'Klávesové zkratky', description: 'Zobrazení dostupných klávesových zkratek' },
      { key: 'recovery', label: 'Automatické obnovení', description: 'Obnovení neuložených změn po pádu aplikace' },
    ];

    generalFeatures.forEach((feature) => {
      if (feature.label.toLowerCase().includes(query) || 
          feature.description.toLowerCase().includes(query) ||
          feature.key.toLowerCase().includes(query)) {
        results.push({
          id: `general-${feature.key}`,
          type: 'general',
          title: feature.label,
          description: feature.description,
          content: `Funkce: ${feature.label} - ${feature.description}`,
          icon: <Database className="h-4 w-4" />,
          category: 'Funkce',
          action: () => {
            if (feature.key === 'copy') onNavigateToTab('copy');
            else if (feature.key === 'history') onNavigateToTab('history');
            else if (feature.key === 'backup' || feature.key === 'recovery') onNavigateToTab('settings');
            onClose();
          },
        });
      }
    });

    return results.slice(0, 50); // Limit results
  }, [searchQuery, sourcePath, targetLocations, history, settings, formatDate, onNavigateToTab, onClose]);

  // Handle showing item details
  const handleShowDetails = useCallback((item: SearchResult) => {
    setSelectedItem(item);
    setIsDetailDrawerOpen(true);
    setIsDrawerClosing(false);
  }, []);

  // Handle closing drawer with animation
  const handleCloseDrawer = useCallback(() => {
    setIsDrawerClosing(true);
    // Wait for animation to complete before actually closing
    setTimeout(() => {
      setIsDetailDrawerOpen(false);
      setSelectedItem(null);
      setIsDrawerClosing(false);
    }, 300); // Match the transition duration
  }, []);

  // Handle navigation to item
  const handleNavigateToItem = useCallback((item: SearchResult) => {
    if (item.action) {
      item.action();
    }
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          handleShowDetails(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        if (isDetailDrawerOpen) {
          handleCloseDrawer();
        } else {
          onClose();
        }
        break;
    }
  }, [searchResults, selectedIndex, isDetailDrawerOpen, handleShowDetails, onClose]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Zdroj': return <Folder className="h-3 w-3" />;
      case 'Cíle': return <Target className="h-3 w-3" />;
      case 'Historie': return <History className="h-3 w-3" />;
      case 'Nastavení': return <Settings className="h-3 w-3" />;
      case 'Funkce': return <Database className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Zdroj': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Cíle': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Historie': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'Nastavení': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'Funkce': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <TooltipPrimitive.Provider>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl p-0  backdrop-blur-sm border border-gray-700/50 shadow-2xl z-[99999999]"
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 p-4 pr-12 border-b border-gray-700/30">
          <Search className="h-5 w-5 text-gray-400" />
          <Input
            placeholder="Hledat v aplikaci..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-gray-400 text-lg"
            autoFocus
          />
        </div>

        {/* Search Results */}
        <div className="max-h-96 min-h-[200px]">
          {!searchQuery.trim() ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Search className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Globální vyhledávání</p>
              <p className="text-sm text-center max-w-md">
                Začněte psát pro vyhledávání ve zdrojových cestách, cílových lokacích, historii operací, nastavení a funkcích aplikace.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <Badge variant="outline" className="text-xs">
                  <Folder className="h-3 w-3 mr-1" />
                  Zdroje
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Target className="h-3 w-3 mr-1" />
                  Cíle
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <History className="h-3 w-3 mr-1" />
                  Historie
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Settings className="h-3 w-3 mr-1" />
                  Nastavení
                </Badge>
              </div>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Search className="h-8 w-8 mb-3 opacity-50" />
              <p className="font-medium mb-1">Žádné výsledky</p>
              <p className="text-sm">Zkuste jiný vyhledávací výraz</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
              <div className="p-2 space-y-1">
                {searchResults.map((result, index) => (
                  <div
                    key={result.id}
                    ref={index === selectedIndex ? (el) => {
                      if (el) {
                        el.scrollIntoView({ 
                          behavior: 'smooth', 
                          block: 'nearest',
                          inline: 'nearest'
                        });
                      }
                    } : undefined}
                    className={`
                      flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200
                      ${index === selectedIndex 
                        ? 'bg-red-500/20 border border-red-500/30 shadow-lg' 
                        : 'hover:bg-gray-800/50 border border-transparent'
                      }
                    `}
                    onClick={() => handleShowDetails(result)}
                  >
                    <div className="flex-shrink-0 p-2 rounded-lg bg-gray-800/50 border border-gray-700/30">
                      {result.icon}
                    </div>
                    <div className="flex-1 min-w-0 mr-3">
                      <h3 className="font-medium text-white truncate mb-1">
                        {result.title}
                      </h3>
                      <p className="text-sm text-gray-400 truncate">
                        {result.description}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      <Badge 
                        variant="outline" 
                        className={`text-xs flex items-center gap-1 ${getCategoryColor(result.category)}`}
                      >
                        {getCategoryIcon(result.category)}
                        {result.category}
                      </Badge>
                      {result.metadata && (
                        <div className="flex flex-wrap gap-1 justify-end">
                          {result.metadata.version && (
                            <Badge variant="secondary" className="text-xs">
                              {result.metadata.version}
                            </Badge>
                          )}
                          {result.metadata.status && (
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${
                                result.metadata.status === 'Úspěšné' ? 'bg-green-500/20 text-green-400' :
                                result.metadata.status === 'Částečně úspěšné' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {result.metadata.status}
                            </Badge>
                          )}
                          {result.metadata.targetCount && (
                            <Badge variant="secondary" className="text-xs">
                              {result.metadata.successCount}/{result.metadata.targetCount} cílů
                            </Badge>
                          )}
                          {result.metadata.selected !== undefined && (
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${
                                result.metadata.selected ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                              }`}
                            >
                              {result.metadata.selected ? 'Vybrané' : 'Nevybrané'}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {searchResults.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/30 text-xs text-gray-400">
            <div className="flex items-center gap-4">
              <span>↑↓ Navigace</span>
              <span>↵ Zobrazit detail</span>
              <span>Esc Zavřít</span>
            </div>
            <span>{searchResults.length} výsledků</span>
          </div>
        )}
      </DialogContent>
      </Dialog>

      {/* Detail Drawer - Using React Portal to render outside Dialog stacking context */}
      {isDetailDrawerOpen && selectedItem && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 9999999 }}>
          <div className="absolute inset-0 bg-black/20 pointer-events-auto" onClick={handleCloseDrawer} />
          <div className={`absolute right-0 top-0 h-full w-96 bg-gray-900/98 backdrop-blur-xl border-l border-gray-700/50 shadow-2xl pointer-events-auto transform transition-transform duration-300 ease-out mt-6 ${
            isDrawerClosing ? 'translate-x-full' : 'translate-x-0'
          }`}>
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700/30">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gray-800/50 border border-gray-700/30">
                  {selectedItem.icon}
                </div>
                <h2 className="font-semibold text-white truncate">{selectedItem.title}</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseDrawer}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Category Badge */}
              <div className="flex justify-center">
                <Badge 
                  variant="outline" 
                  className={`flex items-center gap-2 ${getCategoryColor(selectedItem.category)}`}
                >
                  {getCategoryIcon(selectedItem.category)}
                  {selectedItem.category}
                </Badge>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-300">Popis</h3>
                <p className="text-sm text-gray-400 bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
                  {selectedItem.description}
                </p>
              </div>

              {/* Full Content */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-300">Úplný obsah</h3>
                <p className="text-sm text-gray-400 bg-gray-800/30 rounded-lg p-3 border border-gray-700/30 font-mono text-xs leading-relaxed">
                  {selectedItem.content}
                </p>
              </div>

              {/* Target Destinations - Only for History items */}
              {selectedItem.category === 'Historie' && selectedItem.metadata?.copyResults && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-300">Cílové destinace</h3>
                    <Badge variant="outline" className="text-xs bg-blue-500/20 border-blue-500/30 text-blue-300">
                      {selectedItem.metadata.copyResults.length} cílů
                    </Badge>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1" style={{scrollbarWidth: 'thin'}}>
                    {selectedItem.metadata.copyResults.map((result: any, index: number) => (
                      <div key={index} className="bg-gray-800/30 rounded-lg p-2.5 border border-gray-700/30">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <Target className="h-3.5 w-3.5 text-blue-400" />
                            <span className="text-xs font-medium text-white truncate">
                              {result.targetName || `Cíl ${index + 1}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                          <Tooltip content="Otevřít složku v Průzkumníku" side="top" >
                              <button
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  try {
                                    if (window.electron?.openFolderPath) {
                                      await window.electron.openFolderPath(result.targetPath || result.path);
                                      toast.success('Složka otevřena v Průzkumníku', {
                                        description: `Otevřena složka: ${result.targetName || result.targetPath || result.path}`,
                                        duration: 2000
                                      });
                                    } else {
                                      toast.error('Nelze otevřít složku', {
                                        description: 'Funkce není dostupná v tomto prostředí',
                                        duration: 2000
                                      });
                                    }
                                  } catch (error) {
                                    console.error('Error opening folder:', error);
                                    toast.error('Chyba při otevírání složky', {
                                      description: 'Nepodařilo se otevřít složku v Průzkumníku',
                                      duration: 2000
                                    });
                                  }
                                }}
                                className="flex-shrink-0 p-1 rounded hover:bg-yellow-500/20 transition-colors group"
                              >
                                <Folder className="h-3 w-3 text-yellow-400 group-hover:text-yellow-300" />
                              </button>
                            </Tooltip>
                          <Badge 
                            variant="outline" 
                            className={`text-xs px-1.5 py-0.5 ${
                              result.success 
                                ? 'bg-green-500/20 border-green-500/30 text-green-300'
                                : 'bg-red-500/20 border-red-500/30 text-red-300'
                            }`}
                          >
                            {result.success ? '✓' : '✗'}
                          </Badge>
                          </div>
                        </div>
                        
                        {/* Display path - try targetPath first, then fallback to other path fields */}
                        {(() => { console.log('Drawer result data:', result); return null; })()}
                        {(result.targetPath || result.path) && (
                          <div className="mb-1.5 justify-between gap-1.5">
                            <p className="text-xs text-gray-300 font-mono bg-gray-900/50 rounded px-1.5 py-1 truncate flex-1" title={result.targetPath || result.path}>
                              {result.targetPath || result.path}
                            </p>
                            
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            {result.duration && (
                              <span className="text-gray-400">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {result.duration}ms
                              </span>
                            )}
                            {result.fileSize && (
                              <span className="text-gray-400">
                                {(result.fileSize / 1024 / 1024).toFixed(1)}MB
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {result.hasDiff !== undefined && (
                              <Badge 
                                variant="outline" 
                                className={`text-xs px-1 py-0 ${
                                  result.hasDiff
                                    ? 'bg-orange-500/20 border-orange-500/30 text-orange-300'
                                    : 'bg-green-500/20 border-green-500/30 text-green-300'
                                }`}
                              >
                                {result.hasDiff ? 'Δ' : '='}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {result.error && (
                          <div className="mt-1.5 p-1.5 bg-red-500/10 border border-red-500/20 rounded">
                            <span className="text-xs text-red-300 truncate block" title={result.error}>
                              {result.error}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              {selectedItem.metadata && Object.keys(selectedItem.metadata).length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-300">Metadata</h3>
                  <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30 space-y-2">
                    {selectedItem.metadata.version && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Verze:</span>
                        <Badge variant="outline" className="text-xs bg-blue-500/20 border-blue-500/30 text-blue-300">
                          {selectedItem.metadata.version}
                        </Badge>
                      </div>
                    )}
                    {selectedItem.metadata.status && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Stav:</span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            selectedItem.metadata.status === 'Úspěšné' 
                              ? 'bg-green-500/20 border-green-500/30 text-green-300'
                              : selectedItem.metadata.status === 'Částečně úspěšné'
                              ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300'
                              : 'bg-red-500/20 border-red-500/30 text-red-300'
                          }`}
                        >
                          {selectedItem.metadata.status}
                        </Badge>
                      </div>
                    )}
                    {selectedItem.metadata.targetCount && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Počet cílů:</span>
                        <span className="text-xs text-white font-mono">{selectedItem.metadata.targetCount}</span>
                      </div>
                    )}
                    
                    {/* Enhanced History Metadata */}
                    {selectedItem.category === 'Historie' && selectedItem.metadata.copyResults && (
                      <>
                        {/* Total Duration */}
                        {selectedItem.metadata.totalDuration && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">Celkový čas:</span>
                            <Badge variant="outline" className="text-xs bg-purple-500/20 border-purple-500/30 text-purple-300">
                              <Clock className="h-3 w-3 mr-1" />
                              {selectedItem.metadata.totalDuration}ms
                            </Badge>
                          </div>
                        )}
                        
                        {/* Success Rate */}
                        {selectedItem.metadata.successRate !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">Úspěšnost:</span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                selectedItem.metadata.successRate === 100
                                  ? 'bg-green-500/20 border-green-500/30 text-green-300'
                                  : selectedItem.metadata.successRate >= 50
                                  ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300'
                                  : 'bg-red-500/20 border-red-500/30 text-red-300'
                              }`}
                            >
                              {selectedItem.metadata.successRate}%
                            </Badge>
                          </div>
                        )}
                        
                        {/* Total File Size */}
                        {selectedItem.metadata.totalFileSize && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">Velikost souborů:</span>
                            <span className="text-xs text-white font-mono">
                              {(selectedItem.metadata.totalFileSize / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                        )}
                        
                        {/* Files with Differences */}
                        {selectedItem.metadata.filesWithDiff !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">Soubory s rozdíly:</span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                selectedItem.metadata.filesWithDiff > 0
                                  ? 'bg-orange-500/20 border-orange-500/30 text-orange-300'
                                  : 'bg-green-500/20 border-green-500/30 text-green-300'
                              }`}
                            >
                              {selectedItem.metadata.filesWithDiff}
                            </Badge>
                          </div>
                        )}
                        
                        {/* Failed Operations */}
                        {selectedItem.metadata.failedOperations !== undefined && selectedItem.metadata.failedOperations > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">Neúspěšné operace:</span>
                            <Badge variant="outline" className="text-xs bg-red-500/20 border-red-500/30 text-red-300">
                              {selectedItem.metadata.failedOperations}
                            </Badge>
                          </div>
                        )}
                      </>
                    )}
                    
                    {selectedItem.metadata.timestamp && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Čas:</span>
                        <span className="text-xs text-gray-300 font-mono">
                          {new Date(selectedItem.metadata.timestamp).toLocaleString('cs-CZ')}
                        </span>
                      </div>
                    )}
                    {selectedItem.metadata.isSelected !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Vybrané:</span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            selectedItem.metadata.isSelected
                              ? 'bg-green-500/20 border-green-500/30 text-green-300'
                              : 'bg-gray-500/20 border-gray-500/30 text-gray-300'
                          }`}
                        >
                          {selectedItem.metadata.isSelected ? 'Ano' : 'Ne'}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )}              

              {/* Actions */}
              <div className="space-y-3 pt-4 border-t border-gray-700/30">
                <h3 className="text-sm font-medium text-gray-300">Akce</h3>
                <div className="space-y-2">
                  <Button
                    onClick={() => {
                      // Navigate to the item and close the entire modal
                      if (selectedItem.action) {
                        selectedItem.action();
                      }
                      setIsDetailDrawerOpen(false);
                      setSelectedItem(null);
                      onClose(); // Close the main modal after navigation
                    }}
                    className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 hover:text-red-200"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Přejít na {selectedItem.category.toLowerCase()}
                  </Button>
                  
                  {/* Open in Explorer button - only for source and target locations */}
                  {(selectedItem.type === 'source' || selectedItem.type === 'target') && (
                    <Tooltip content="Otevřít složku v Průzkumníku">
                      <Button
                        variant="outline"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try {
                            // Extract the folder path from description (which contains the full path)
                            const folderPath = selectedItem.description;
                            if (window.electron?.openFolderPath) {
                              await window.electron.openFolderPath(folderPath);
                              toast.success('Složka otevřena v Průzkumníku', {
                                description: `Otevřena složka: ${folderPath}`,
                                duration: 3000
                              });
                            } else {
                              toast.error('Nelze otevřít složku', {
                                description: 'Funkce není dostupná v tomto prostředí',
                                duration: 3000
                              });
                            }
                          } catch (error) {
                            console.error('Error opening folder:', error);
                            toast.error('Chyba při otevírání složky', {
                              description: 'Nepodařilo se otevřít složku v Průzkumníku',
                              duration: 3000
                            });
                          }
                        }}
                        className="w-full border-blue-600 text-blue-300 hover:text-blue-200 hover:border-blue-500 hover:bg-blue-500/10"
                      >
                        <Folder className="h-4 w-4 mr-2" />
                        Otevřít složku
                      </Button>
                    </Tooltip>
                  )}
                  
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigator.clipboard.writeText(selectedItem.content);
                      toast.success('Obsah zkopírován do schránky', {
                        description: `Zkopírován obsah: ${selectedItem.title}`,
                        duration: 3000
                      });
                      // The modal stays open after copying
                    }}
                    className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Kopírovat obsah
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </TooltipPrimitive.Provider>
  );
};

export default GlobalSearchModal;
