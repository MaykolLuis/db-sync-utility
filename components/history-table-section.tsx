'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/custom-button';
import { SectionHeader } from '@/components/section-header';
import { useHistoryStore } from '@/lib/stores/use-history-store';
import { HistoryEntry } from '@/app/types';
import type { ElectronAPI } from '@/types/electron';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { useSettingsStore } from '@/lib/stores/use-settings-store';
import { Checkbox } from '@/components/ui/checkbox';

interface HistoryTableSectionProps {
  onOpenHistorySidebar: () => void;
}

// CSVLink component with Electron save dialog support
const CSVLink = ({ data, filename, className, children }: { data: any[], filename: string, className?: string, children: React.ReactNode }) => {
  const [isExporting, setIsExporting] = useState(false);
  const exportingRef = useRef(false);
  const lastClickTimeRef = useRef(0);
  
  const handleClick = async (e: React.MouseEvent) => {
    console.log('[CSV Export] ========== CLICK EVENT START ==========');
    console.log('[CSV Export] Event type:', e.type);
    console.log('[CSV Export] Event target:', e.target);
    console.log('[CSV Export] Event currentTarget:', e.currentTarget);
    console.log('[CSV Export] isExporting:', isExporting);
    console.log('[CSV Export] exportingRef.current:', exportingRef.current);
    
    e.preventDefault();
    e.stopPropagation();
    
    // Debounce: Prevent clicks within 1 second
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    console.log('[CSV Export] Time since last click:', timeSinceLastClick, 'ms');
    
    if (timeSinceLastClick < 1000) {
      console.log('[CSV Export] Click too soon, ignoring (debounce)');
      return;
    }
    
    lastClickTimeRef.current = now;
    
    // Prevent multiple simultaneous exports with both state and ref
    if (isExporting || exportingRef.current) {
      console.log('[CSV Export] Already exporting, ignoring click');
      return;
    }
    
    console.log('[CSV Export] Starting export process');
    console.log('[CSV Export] Data received:', data);
    console.log('[CSV Export] Data length:', data?.length);
    console.log('[CSV Export] Data sample:', data?.[0]);
    setIsExporting(true);
    exportingRef.current = true;
    
    try {
      // Enhanced headers with more information
      const headers = [
        'Datum',
        'Verze',
        'Popis',
        'Zdrojová složka',
        'Cílové lokace',
        'Stav',
        'Počet cílů',
        'Úspěšné cíle',
        'Neúspěšné cíle',
        'Celkový čas',
        'Chybové lokace'
      ];
      
      const escapeCsvValue = (value: string) => {
        // Convert to string and handle null/undefined
        const stringValue = String(value || '');
        // Always quote values to ensure proper column separation
        return `"${stringValue.replace(/"/g, '""')}"`;
      };
      
      const csvContent = [
        headers.map(escapeCsvValue).join(','),
        headers.map(() => '\"---\"').join(','),
        ...data.map(row => [
          row.datum || '',
          row.verze || '-',
          row.popis || '-',
          row.zdroj || '-',
          row.cile || '-',
          row.status || '-',
          row.pocetCilu?.toString() || '0',
          row.uspesneCile?.toString() || '0',
          row.neuspesneCile?.toString() || '0',
          row.celkovyCas || '-',
          row.chyboveLokace || '-'
        ].map(escapeCsvValue).join(','))
      ].join('\r\n');
      
      // Create blob with UTF-8 BOM for Excel compatibility
      const BOM = '\uFEFF';
      const csvData = BOM + csvContent;
      
      // Show save dialog if Electron API is available
      if (window.electron && 'showSaveDialog' in window.electron && typeof window.electron.showSaveDialog === 'function') {
        console.log('[CSV Export] Calling save dialog...');
        const result = await (window.electron as unknown as ElectronAPI).showSaveDialog({
          title: 'Vyberte umístění pro uložení CSV',
          defaultPath: filename,
          filters: [
            { name: 'CSV soubory', extensions: ['csv'] },
            { name: 'Všechny soubory', extensions: ['*'] }
          ]
        });
        console.log('[CSV Export] Save dialog result:', result);
        
        if (!result.canceled && result.filePath) {
          // Write file directly to the selected path using Electron
          try {
            const writeResult = await (window.electron as unknown as ElectronAPI).writeFile(result.filePath, csvData);
            
            if (writeResult.success) {
              // Extract just the filename from the selected path
              const selectedFileName = result.filePath.split(/[\\\/]/).pop() || filename;
              
              // Show success toast with open file button
              toast.success('CSV export dokončen', {
                description: `Soubor "${selectedFileName}" byl úspěšně uložen do: ${result.filePath} (${data.length} záznamů)`,
                duration: 8000,
                action: {
                  label: 'Otevřít soubor',
                  onClick: async () => {
                    try {
                      if (window.electron && (window.electron as any).openFile) {
                        const openResult = await (window.electron as any).openFile(result.filePath);
                        if (!openResult.success) {
                          toast.error('Chyba při otevírání souboru', {
                            description: openResult.error || 'Nepodařilo se otevřít soubor'
                          });
                        }
                      }
                    } catch (error) {
                      toast.error('Chyba při otevírání souboru', {
                        description: 'Nepodařilo se otevřít soubor'
                      });
                    }
                  }
                }
              });
            } else {
              throw new Error(writeResult.error || 'Neznámá chyba při zápisu souboru');
            }
          } catch (writeError) {
            console.error('[CSV Export] Error writing file:', writeError);
            const errorMessage = writeError instanceof Error ? writeError.message : String(writeError);
            toast.error('Chyba při ukládání souboru', {
              description: `Nepodařilo se uložit soubor: ${errorMessage}`,
              duration: 5000
            });
          }
          return; // Exit early to prevent fallback execution
        } else {
          // User canceled the dialog, don't proceed with fallback
          return;
        }
      } else {
        // Fallback to browser download if Electron API is not available
        const blob = new Blob([csvData], { 
          type: 'text/csv;charset=utf-8;' 
        });
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // Show fallback toast notification
        toast.success('CSV export dokončen', {
          description: `Soubor ${filename} byl úspěšně stažen (${data.length} záznamů)`
        });
      }
    } catch (error) {
      console.error('[CSV Export] Error exporting CSV:', error);
      toast.error('Chyba při exportu', {
        description: 'Nepodařilo se exportovat CSV soubor'
      });
    } finally {
      console.log('[CSV Export] Cleaning up export state');
      setIsExporting(false);
      exportingRef.current = false;
      // Reset click timestamp after a delay to allow future clicks
      setTimeout(() => {
        lastClickTimeRef.current = 0;
        console.log('[CSV Export] Click timestamp reset, ready for next export');
      }, 500);
    }
  };

  return (
    <button onClick={handleClick} className={className} disabled={isExporting}>
      {isExporting ? 'Exportuji...' : children}
    </button>
  );
};

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1000;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Helper function to calculate total duration from copyResults
function getTotalDuration(entry: HistoryEntry): number | null {
  if (!entry.copyResults || entry.copyResults.length === 0) {
    return null;
  }
  
  // Debug: Log the copyResults to see what data we have
  console.log('getTotalDuration - Entry ID:', entry.id, 'copyResults:', entry.copyResults);
  
  // Sum all individual durations
  const totalMs = entry.copyResults.reduce((sum, result) => {
    const duration = result.duration || 0;
    console.log('Duration for result:', result.targetName || result.targetPath, 'duration:', duration, 'type:', typeof duration);
    return sum + duration;
  }, 0);
  
  console.log('Total duration calculated:', totalMs);
  return totalMs > 0 ? totalMs : null;
}

// Helper function to format duration from milliseconds
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Helper function to format date
function formatDate(timestamp: number): string {
  return format(new Date(timestamp), 'dd.MM.yyyy HH:mm', { locale: cs });
}

// Helper function to get entry status
function getEntryStatus(entry: HistoryEntry): string {
  if (!entry.copyResults || entry.copyResults.length === 0) {
    return 'Neznámý';
  }
  
  const successfulCopies = entry.copyResults.filter(r => r.success).length;
  const totalTargets = entry.targetLocations?.length || 0;
  const totalCopies = entry.copyResults.length;
  
  // If we have copy results for all targets
  if (totalCopies >= totalTargets) {
    if (successfulCopies === totalTargets) {
      return 'Úspěch';
    } else if (successfulCopies === 0) {
      return 'Neúspěch';
    } else {
      return 'Částečný úspěch';
    }
  } else {
    // Incomplete copy results
    if (successfulCopies > 0) {
      return 'Částečný úspěch';
    } else {
      return 'Neúspěch';
    }
  }
}

export function HistoryTableSection({ onOpenHistorySidebar }: HistoryTableSectionProps) {
  const { history, removeHistoryEntry, saveHistoryEntries, updateHistoryEntry } = useHistoryStore();
  const { settings } = useSettingsStore();
  
  // State management
  const [selectedEntries, setSelectedEntries] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEntry, setEditingEntry] = useState<HistoryEntry | null>(null);
  const [editedDescription, setEditedDescription] = useState('');
  const [entryToDelete, setEntryToDelete] = useState<HistoryEntry | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Set<number>>(new Set());
  const [copyingId, setCopyingId] = useState<number | null>(null);

  // Load items per page from settings
  useEffect(() => {
    if (settings?.historyItemsPerPage) {
      setItemsPerPage(settings.historyItemsPerPage);
    }
  }, [settings]);

  // Get entry status for display
  const getEntryStatus = (entry: HistoryEntry): string => {
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
  };

  // Format date for display
  const formatDate = (timestamp: number) => {
    try {
      const date = new Date(timestamp);
      return format(date, 'dd.MM.yyyy HH:mm', { locale: cs });
    } catch (e) {
      return 'Neplatné datum';
    }
  };

  // Filter history based on search query
  const filteredHistory = history.filter(entry => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      entry.description.toLowerCase().includes(query) ||
      entry.sourcePath.toLowerCase().includes(query) ||
      entry.targetLocations?.some(loc => 
        loc.name.toLowerCase().includes(query) || 
        loc.path.toLowerCase().includes(query)
      ) ||
      (entry.version && entry.version.toLowerCase().includes(query)) ||
      formatDate(entry.timestamp).toLowerCase().includes(query)
    );
  });

  // Pagination calculations
  const totalItems = filteredHistory.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentItems = filteredHistory.slice(startIndex, endIndex);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Prepare export data for CSVLink (all history entries)
  const exportfullData = history.map(entry => {
    const duration = getTotalDuration(entry);
    const totalTargets = entry.targetLocations?.length || 0;
    const successfulCopies = entry.copyResults ? entry.copyResults.filter(r => r.success).length : 0;
    const failedCopies = totalTargets - successfulCopies;
    
    // Get detailed status information
    const status = getEntryStatus(entry);
    let statusDetail = status;
    if (status === 'Částečný úspěch' && failedCopies > 0) {
      statusDetail = `${status} (${successfulCopies}/${totalTargets} úspěšných)`;
    }
    
    // Get failed locations for partial success
    const failedLocations = entry.copyResults 
      ? entry.copyResults
          .filter(r => !r.success)
          .map(r => {
            const location = entry.targetLocations?.find(loc => loc.path === r.targetPath);
            return location ? location.name : r.targetPath;
          })
          .join(', ')
      : '';
    
    const formattedDuration = duration ? formatDuration(duration) : '-';
    
    return {
      datum: formatDate(entry.timestamp),
      verze: entry.version || '-',
      popis: entry.description || '-',
      zdroj: entry.sourcePath || '-',
      cile: entry.targetLocations?.map(loc => `${loc.name} (${loc.path})`).join('; ') || '',
      status: statusDetail,
      pocetCilu: totalTargets,
      uspesneCile: successfulCopies,
      neuspesneCile: failedCopies,
      celkovyCas: formattedDuration,
      chyboveLokace: failedLocations || '-'
    };
  });





  // Handle entry selection
  const toggleEntrySelection = (id: number, e?: React.ChangeEvent<HTMLInputElement> | React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedEntries(newSelected);
  };

  // Select all entries
  const selectAllEntries = () => {
    if (selectedEntries.size === history.length) {
      // If all are selected, clear selection
      setSelectedEntries(new Set());
    } else {
      // Otherwise select all
      const allIds = history.map(entry => entry.id);
      setSelectedEntries(new Set(allIds));
    }
  };

  // Toggle selection of all entries on current page
  const toggleSelectAll = () => {
    if (selectedEntries.size === currentItems.length) {
      setSelectedEntries(new Set());
    } else {
      const newSelectedEntries = new Set<number>();
      currentItems.forEach(entry => newSelectedEntries.add(entry.id));
      setSelectedEntries(newSelectedEntries);
    }
  };

  // Delete selected entries
  const deleteSelectedEntries = async () => {
    if (selectedEntries.size === 0) return;
    
    const entriesToDelete = Array.from(selectedEntries);
    
    // Delete each selected entry
    for (const id of entriesToDelete) {
      await removeHistoryEntry(id);
    }
    
    // Clear selection
    setSelectedEntries(new Set());
    
    toast.success(`${entriesToDelete.length} záznamů smazáno`, {
      description: 'Vybrané záznamy byly úspěšně odstraněny z historie'
    });
  };

  // Toggle row expansion
  const toggleRowExpansion = (entryId: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(entryId)) {
      newExpandedRows.delete(entryId);
    } else {
      newExpandedRows.add(entryId);
    }
    setExpandedRows(newExpandedRows);
  };

  // Copy update details to clipboard
  const copyUpdateDetails = (entry: HistoryEntry) => {
    // Close the dropdown menu for this entry
    setOpenDropdowns(prev => {
      const newSet = new Set(prev);
      newSet.delete(entry.id);
      return newSet;
    });
    setCopyingId(entry.id);
    const formattedDate = formatDate(entry.timestamp);
    const targets = entry.targetLocations?.map((loc) => `${loc.name}: ${loc.path}`)?.join("\n") || '';
    const versionInfo = entry.version ? `\nVerze: ${entry.version}` : '';

    const textToCopy = `
Aktualizace: ${entry.description}
Datum: ${formattedDate}${versionInfo}
Zdroj: ${entry.sourcePath}
Cíle:
${targets}
`.trim();

    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        toast.success('Zkopírováno do schránky');
      })
      .catch((error) => {
        toast.error('Chyba při kopírování');
        console.error('Copy failed:', error);
      })
      .finally(() => {
        setTimeout(() => setCopyingId(null), 500);
      });
  };

  // Open edit dialog for entry description
  const openEditDialog = (entry: HistoryEntry, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Close the dropdown menu for this entry
    setOpenDropdowns(prev => {
      const newSet = new Set(prev);
      newSet.delete(entry.id);
      return newSet;
    });
    setEditingEntry(entry);
    setEditedDescription(entry.description);
  };

  // Save edited description
  const saveEditedDescription = async () => {
    if (!editingEntry || !editedDescription.trim()) return;
    
    try {
      const updatedEntry = { ...editingEntry, description: editedDescription };
      await updateHistoryEntry(editingEntry.id, updatedEntry);
      await saveHistoryEntries();
      
      setEditingEntry(null);
      toast.success('Popis aktualizován');
    } catch (error) {
      console.error('Error updating description:', error);
      toast.error('Chyba při aktualizaci popisu');
    }
  };

  // Open delete confirmation dialog
  const confirmDelete = (entry: HistoryEntry, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Close the dropdown menu for this entry
    setOpenDropdowns(prev => {
      const newSet = new Set(prev);
      newSet.delete(entry.id);
      return newSet;
    });
    setEntryToDelete(entry);
    setIsDeleteDialogOpen(true);
  };

  // Delete history entry
  const handleDeleteEntry = async () => {
    if (!entryToDelete) return;
    
    try {
      await removeHistoryEntry(entryToDelete.id);
      await saveHistoryEntries();
      
      toast.success('Záznam odstraněn');
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Chyba při odstraňování záznamu');
    } finally {
      setIsDeleteDialogOpen(false);
      setEntryToDelete(null);
    }
  };

  // Handle batch delete
  const handleBatchDelete = async () => {
    if (selectedEntries.size === 0) return;
    
    try {
      for (const entryId of selectedEntries) {
        await removeHistoryEntry(entryId);
      }
      await saveHistoryEntries();
      
      toast.success(`${selectedEntries.size} záznamů odstraněno`);
    } catch (error) {
      console.error('Error batch deleting entries:', error);
      toast.error('Chyba při hromadném odstraňování záznamů');
    } finally {
      setIsBatchDeleteDialogOpen(false);
      setSelectedEntries(new Set());
    }
  };

  // Prepare data for CSV export
  const exportData = React.useMemo(() => {
    return filteredHistory.map(entry => {
      const duration = getTotalDuration(entry);
      const totalTargets = entry.targetLocations?.length || 0;
      const successfulCopies = entry.copyResults ? entry.copyResults.filter(r => r.success).length : 0;
      const failedCopies = totalTargets - successfulCopies;
      
      // Get failed locations for partial success
      const failedLocations = entry.copyResults 
        ? entry.copyResults
            .filter(r => !r.success)
            .map(r => {
              const location = entry.targetLocations?.find(loc => loc.path === r.targetPath);
              return location ? location.name : r.targetPath;
            })
            .join(', ')
        : '';
      
      return {
        datum: formatDate(entry.timestamp),
        verze: entry.version || '-',
        popis: entry.description,
        zdroj: entry.sourcePath,
        cile: entry.targetLocations?.map(loc => loc.name)?.join(', ') || '',
        status: getEntryStatus(entry),
        pocetCilu: totalTargets,
        uspesneCile: successfulCopies,
        neuspesneCile: failedCopies,
        celkovyCas: duration ? formatDuration(duration) : '-',
        chyboveLokace: failedLocations || '-'
      };
    });
  }, [filteredHistory]);

  // Export selected entries
  const exportSelectedEntries = async () => {
    if (selectedEntries.size === 0) return;
    setIsExporting(true);
    
    try {
      console.log('=== CSV Export Debug ===');
      console.log('selectedEntries size:', selectedEntries.size);
      console.log('selectedEntries:', Array.from(selectedEntries));
      
      const selectedHistoryEntries = filteredHistory.filter(entry => selectedEntries.has(entry.id));
      console.log('selectedHistoryEntries length:', selectedHistoryEntries.length);
      
      // Debug: Show sample of filteredHistory data
      if (filteredHistory.length > 0) {
        console.log('Sample filteredHistory entry:', {
          id: filteredHistory[0].id,
          timestamp: filteredHistory[0].timestamp,
          copyResults: filteredHistory[0].copyResults
        });
      }
      
      // Debug: Test getTotalDuration with sample data
      const testEntry = {
        id: 'test',
        copyResults: [
          { duration: 100, success: true },
          { duration: 200, success: true },
          { duration: 300, success: false }
        ]
      };
      const testDuration = getTotalDuration(testEntry as any);
      console.log('Test getTotalDuration result:', testDuration);
      
      const selectedData = selectedHistoryEntries.map(entry => {
        console.log('=== Processing entry for export ===');
        console.log('Entry ID:', entry.id);
        console.log('Entry timestamp:', entry.timestamp);
        console.log('Entry has targetLocations:', !!entry.targetLocations, 'length:', entry.targetLocations?.length);
        console.log('Entry has copyResults:', !!entry.copyResults, 'length:', entry.copyResults?.length);
        console.log('Entry copyResults:', JSON.stringify(entry.copyResults, null, 2));
        console.log('Entry targetLocations:', JSON.stringify(entry.targetLocations, null, 2));
        
        const duration = getTotalDuration(entry);
        console.log('Duration from getTotalDuration:', duration);
        console.log('Duration type:', typeof duration);
        const totalTargets = entry.targetLocations?.length || 0;
        const successfulCopies = entry.copyResults ? entry.copyResults.filter(r => r.success).length : 0;
        const failedCopies = totalTargets - successfulCopies;
        
        // Get detailed status information
        const status = getEntryStatus(entry);
        let statusDetail = status;
        if (status === 'Částečný úspěch' && failedCopies > 0) {
          statusDetail = `${status} (${successfulCopies}/${totalTargets} úspěšných)`;
        }
        
        // Get failed locations for partial success
        const failedLocations = entry.copyResults 
          ? entry.copyResults
              .filter(r => !r.success)
              .map(r => {
                const location = entry.targetLocations?.find(loc => loc.path === r.targetPath);
                return location ? location.name : r.targetPath;
              })
              .join(', ')
          : '';
        
        const formattedDuration = duration ? formatDuration(duration) : '-';
        console.log('Final formatted duration for export:', formattedDuration);
        
        // Debug calculated values
        const pocetCilu = entry.targetLocations?.length || 0;
        const uspesneCile = entry.copyResults?.filter(r => r.success).length || 0;
        const neuspesneCile = entry.copyResults?.filter(r => !r.success).length || 0;
        console.log('Calculated values:', { pocetCilu, uspesneCile, neuspesneCile });
        
        return {
          datum: formatDate(entry.timestamp),
          verze: entry.version || '-',
          popis: entry.description || '-',
          zdroj: entry.sourcePath || '-',
          cile: entry.targetLocations?.map(loc => `${loc.name} (${loc.path})`).join('; ') || '',
          status: statusDetail,
          pocetCilu: totalTargets,
          uspesneCile: successfulCopies,
          neuspesneCile: failedCopies,
          celkovyCas: formattedDuration,
          chyboveLokace: failedLocations || '-'
        };
      });
      
      const filename = `historie_aktualizaci_${new Date().toISOString().split('T')[0]}.csv`;
      
      // Create CSV with proper formatting for Excel compatibility
      const headers = [
        'Datum',
        'Verze', 
        'Popis',
        'Zdrojová složka',
        'Cílové lokace',
        'Stav',
        'Počet cílů',
        'Úspěšné cíle',
        'Neúspěšné cíle',
        'Celkový čas',
        'Chybové lokace'
      ];
      
      const csvRows = selectedData.map(row => [
        row.datum || '',
        row.verze || '',
        row.popis || '',
        row.zdroj || '',
        row.cile || '',
        row.status || '',
        row.pocetCilu?.toString() || '0',
        row.uspesneCile?.toString() || '0',
        row.neuspesneCile?.toString() || '0',
        row.celkovyCas || '',
        row.chyboveLokace || ''
      ]);
      
      // Proper CSV escaping function
      const escapeCsvValue = (value: string) => {
        // Convert to string and handle null/undefined
        const stringValue = String(value || '');
        // Always quote values to ensure proper column separation
        return `"${stringValue.replace(/"/g, '""')}"`;
      };
      
      // Create enhanced CSV content with better structure
      const csvContent = [
        // Headers with clear formatting
        headers.map(escapeCsvValue).join(','),
        // Add a separator line for visual clarity
        headers.map(() => '"---"').join(','),
        ...csvRows.map(row => row.map(escapeCsvValue).join(','))
      ].join('\r\n'); // Use Windows line endings for Excel
      
      // Add UTF-8 BOM for proper Excel recognition of Czech characters
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      // Create download link
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Exportováno ${selectedEntries.size} záznamů`, {
        description: 'CSV soubor byl úspěšně vytvořen a stažen'
      });
    } catch (error) {
      console.error('Error exporting selected entries:', error);
      toast.error('Chyba při exportu vybraných záznamů');
    } finally {
      setIsExporting(false);
    }
  };

  // Export all entries using the same method as exportSelectedEntries
  const exportAllEntries = async () => {
    setIsExporting(true);
    
    try {
      console.log('=== CSV Export All Entries Debug ===');
      console.log('Total history entries:', history.length);
      
      const selectedData = history.map(entry => {
        const duration = getTotalDuration(entry);
        const totalTargets = entry.targetLocations?.length || 0;
        const successfulCopies = entry.copyResults ? entry.copyResults.filter(r => r.success).length : 0;
        const failedCopies = totalTargets - successfulCopies;
        
        // Get detailed status information
        const status = getEntryStatus(entry);
        let statusDetail = status;
        if (status === 'Částečný úspěch' && failedCopies > 0) {
          statusDetail = `${status} (${successfulCopies}/${totalTargets} úspěšných)`;
        }
        
        // Get failed locations for partial success
        const failedLocations = entry.copyResults 
          ? entry.copyResults
              .filter(r => !r.success)
              .map(r => {
                const location = entry.targetLocations?.find(loc => loc.path === r.targetPath);
                return location ? location.name : r.targetPath;
              })
              .join(', ')
          : '';
        
        const formattedDuration = duration ? formatDuration(duration) : '-';
        
        return {
          datum: formatDate(entry.timestamp),
          verze: entry.version || '-',
          popis: entry.description || '-',
          zdroj: entry.sourcePath || '-',
          cile: entry.targetLocations?.map(loc => `${loc.name} (${loc.path})`).join('; ') || '',
          status: statusDetail,
          pocetCilu: totalTargets,
          uspesneCile: successfulCopies,
          neuspesneCile: failedCopies,
          celkovyCas: formattedDuration,
          chyboveLokace: failedLocations || '-'
        };
      });
      
      const filename = `historie_aktualizaci_${new Date().toISOString().split('T')[0]}.csv`;
      
      // Create CSV with proper formatting for Excel compatibility
      const headers = [
        'Datum',
        'Verze', 
        'Popis',
        'Zdrojová složka',
        'Cílové lokace',
        'Stav',
        'Počet cílů',
        'Úspěšné cíle',
        'Neúspěšné cíle',
        'Celkový čas',
        'Chybové lokace'
      ];
      
      const csvRows = selectedData.map(row => [
        row.datum || '',
        row.verze || '',
        row.popis || '',
        row.zdroj || '',
        row.cile || '',
        row.status || '',
        row.pocetCilu?.toString() || '0',
        row.uspesneCile?.toString() || '0',
        row.neuspesneCile?.toString() || '0',
        row.celkovyCas || '',
        row.chyboveLokace || ''
      ]);
      
      // Proper CSV escaping function
      const escapeCsvValue = (value: string) => {
        // Convert to string and handle null/undefined
        const stringValue = String(value || '');
        // Always quote values to ensure proper column separation
        return `"${stringValue.replace(/"/g, '""')}"`;
      };
      
      // Create enhanced CSV content with better structure
      const csvContent = [
        // Headers with clear formatting
        headers.map(escapeCsvValue).join(','),
        // Add a separator line for visual clarity
        headers.map(() => '"---"').join(','),
        ...csvRows.map(row => row.map(escapeCsvValue).join(','))
      ].join('\r\n'); // Use Windows line endings for Excel
      
      // Add UTF-8 BOM for proper Excel recognition of Czech characters
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      // Create download link
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Exportováno ${history.length} záznamů`, {
        description: 'CSV soubor byl úspěšně vytvořen a stažen'
      });
    } catch (error) {
      console.error('Error exporting all entries:', error);
      toast.error('Chyba při exportu všech záznamů');
    } finally {
      setIsExporting(false);
    }
  };

  // Copy history data to clipboard
  const copyToClipboard = async () => {
    try {
      setIsExporting(true);
      
      // Get entries to export (either selected or all)
      const entriesToExport = selectedEntries.size > 0
        ? history.filter(entry => selectedEntries.has(entry.id))
        : history;
      
      // Format data with enhanced information
      const headers = [
        'Datum',
        'Verze', 
        'Popis',
        'Zdrojová složka',
        'Cílové lokace',
        'Stav',
        'Počet cílů',
        'Úspěšné cíle',
        'Neúspěšné cíle',
        'Celkový čas',
        'Chybové lokace'
      ];
      
      const rows = entriesToExport.map(entry => {
        const duration = getTotalDuration(entry);
        const totalTargets = entry.targetLocations?.length || 0;
        const successfulCopies = entry.copyResults ? entry.copyResults.filter(r => r.success).length : 0;
        const failedCopies = totalTargets - successfulCopies;
        
        // Get detailed status information
        const status = getEntryStatus(entry);
        let statusDetail = status;
        if (status === 'Částečný úspěch' && failedCopies > 0) {
          statusDetail = `${status} (${successfulCopies}/${totalTargets} úspěšných)`;
        }
        
        // Get failed locations for partial success
        const failedLocations = entry.copyResults 
          ? entry.copyResults
              .filter(r => !r.success)
              .map(r => {
                const location = entry.targetLocations?.find(loc => loc.path === r.targetPath);
                return location ? location.name : r.targetPath;
              })
              .join(', ')
          : '';
        
        return [
          formatDate(entry.timestamp),
          entry.version || '-',
          entry.description || '-',
          entry.sourcePath || '-',
          entry.targetLocations?.map(loc => `${loc.name} (${loc.path})`)?.join('; ') || '',
          statusDetail,
          totalTargets.toString(),
          successfulCopies.toString(),
          failedCopies.toString(),
          duration ? formatDuration(duration) : '-',
          failedLocations || '-'
        ];
      });
      
      // Create CSV content with proper formatting for Excel
      const escapeCsvValue = (value: string) => {
        // Convert to string and handle null/undefined
        const stringValue = String(value || '');
        // Always quote values to ensure proper column separation
        return `"${stringValue.replace(/"/g, '""')}"`;
      };
      
      const csvContent = [
        headers.map(escapeCsvValue).join(','),
        // Add a separator line for visual clarity
        headers.map(() => '"---"').join(','),
        ...rows.map(row => row.map(escapeCsvValue).join(','))
      ].join('\r\n'); // Use Windows line endings for Excel
      
      // Copy to clipboard
      await navigator.clipboard.writeText(csvContent);
      
      toast.success('Zkopírováno do schránky', {
        description: `${entriesToExport.length} záznamů bylo zkopírováno do schránky ve formátu CSV`
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Chyba při kopírování', {
        description: 'Nepodařilo se zkopírovat data do schránky'
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between bg-gradient-to-r from-[#1e293b] to-[#0f172a] text-white p-4 rounded-t-lg">
        <div>
          <h3 className="text-base font-semibold m-0">Historie aktualizací</h3>
          <p className="text-xs opacity-90 mt-0.5">Přehled provedených aktualizací databáze</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/80">
          <Clock className="h-4 w-4" />
          <span>{history.length} záznamů</span>
        </div>
      </div>
      
      <CardContent className="pt-4 flex-1 flex flex-col min-h-0">
        {/* Search and Controls Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Hledat v historii..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">

            
            {selectedEntries.size > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportSelectedEntries}
                  disabled={isExporting}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export ({selectedEntries.size})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBatchDeleteDialogOpen(true)}
                  className="gap-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Smazat ({selectedEntries.size})
                </Button>
              </>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={exportAllEntries}
              disabled={isExporting}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {filteredHistory.length > 0 ? (
          <>
            {/* Responsive Table Container with Scrollable Body */}
            <div className="flex flex-col flex-1 min-h-0 rounded-md border">
              <div className="flex-1 min-h-0 overflow-y-auto">
                <Table>
                {/* Fixed Header */}
                <TableHeader className="sticky top-0 bg-muted/50 border-b z-10">
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedEntries.size === currentItems.length && currentItems.length > 0}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Vybrat všechny na stránce"
                      />
                    </TableHead>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="w-36">Datum</TableHead>
                    <TableHead className="w-20">Verze</TableHead>
                    <TableHead className="min-w-[200px]">Popis</TableHead>
                    <TableHead className="min-w-[150px]">Zdroj</TableHead>
                    <TableHead className="w-12">Cíle</TableHead>
                    <TableHead className="w-40">Stav</TableHead>
                    <TableHead className="w-12">Akce</TableHead>
                  </TableRow>
                </TableHeader>
                
                {/* Scrollable Body */}
                <TableBody>
                  {currentItems.map((entry) => {
                    const entryId = entry.id;
                    const isExpanded = expandedRows.has(entryId);
                    const isSelected = selectedEntries.has(entryId);
                    
                    return (
                      <React.Fragment key={entry.id}>
                        <TableRow 
                          className={`cursor-pointer hover:bg-muted/50 ${isSelected ? 'bg-muted/30' : ''}`}
                          onClick={() => toggleRowExpansion(entryId)}
                        >
                          <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                const newSelectedEntries = new Set(selectedEntries);
                                if (checked) {
                                  newSelectedEntries.add(entryId);
                                } else {
                                  newSelectedEntries.delete(entryId);
                                }
                                setSelectedEntries(newSelectedEntries);
                              }}
                              aria-label={`Vybrat záznam ${entry.description}`}
                            />
                          </TableCell>
                          <TableCell className="w-12">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="w-36 font-medium">
                            {formatDate(entry.timestamp)}
                          </TableCell>
                          <TableCell className="w-20">
                             <Badge variant="outline" className="text-green-400 border-green-400/30"> {entry.version || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell className="min-w-[200px]">
                            <div className="truncate" title={entry.description}>
                              {entry.description}
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[150px]">
                            <div className="flex items-center gap-1">
                              <FolderOpen className="h-3 w-3 text-yellow-500" />
                              <div className="truncate text-sm text-muted-foreground" title={entry.sourcePath}>
                                {entry.sourcePath}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="w-12">
                            <div className="flex items-center gap-1">
                              <Computer className="h-3 w-3 text-blue-500" />
                              <span className="text-sm">{entry.targetLocations?.length || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell className="w-40">
                            <Badge 
                              variant={getEntryStatus(entry) === 'Úspěch' || getEntryStatus(entry) === 'Částečný úspěch' ? 'outline' : 'destructive'}
                              className={`text-xs ${
                                getEntryStatus(entry) === 'Úspěch' ? 'text-green-800' :
                                getEntryStatus(entry) === 'Částečný úspěch' ? 'text-orange-800' : ''
                              }`}
                            >
                              {getEntryStatus(entry)}
                            </Badge>
                          </TableCell>
                          <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu 
                              open={openDropdowns.has(entry.id)}
                              onOpenChange={(open) => {
                                setOpenDropdowns(prev => {
                                  const newSet = new Set(prev);
                                  if (open) {
                                    newSet.add(entry.id);
                                  } else {
                                    newSet.delete(entry.id);
                                  }
                                  return newSet;
                                });
                              }}
                            >
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyUpdateDetails(entry);
                                  }}
                                  disabled={copyingId === entry.id}
                                  className="flex items-center gap-2"
                                >
                                  {copyingId === entry.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                  Kopírovat detaily
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditDialog(entry, e);
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Edit2 className="h-4 w-4" />
                                  Upravit popis
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    confirmDelete(entry, e);
                                  }}
                                  className="flex items-center gap-2 text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Smazat záznam
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={9} className="p-0">
                              <div className="bg-muted/40 border-t">
                                <div className="px-4 py-3">
                                  {/* Compact Header */}
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <Info className="h-4 w-4 text-blue-400" />
                                      <span className="font-medium text-sm">Detail synchronizace #{entry.id}</span>
                                      <Badge variant="outline" className="text-xs h-5 bg-gray-700 text-white">
                                        {entry.version || 'N/A'}
                                      </Badge>
                                    </div>
                                    <div className="text-xs flex items-center gap-2 text-blue-400">
                                      <Clock className="h-3 w-3 text-blue-400" />
                                      <span>{(() => {
                                        const totalDuration = getTotalDuration(entry);
                                        return totalDuration ? formatDuration(totalDuration) : 'N/A';
                                      })()}</span>
                                    </div>
                                  </div>

                                  {/* Source Path - Compact */}
                                  <div className="mb-3">
                                    <div className="flex items-center gap-2 mb-1">
                                      <FolderOpen className="h-3 w-3 text-yellow-500" />
                                      <span className="text-xs font-medium text-muted-foreground">Zdroj:</span>
                                    </div>
                                    <div className="text-xs font-mono bg-background/50 rounded px-2 py-1 border">
                                      {entry.sourcePath}
                                    </div>
                                  </div>

                                  {/* Target Destinations - Ultra Compact */}
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Computer className="h-3 w-3 text-blue-400" />
                                      <span className="text-xs font-medium text-muted-foreground">Cílové destinace:</span>
                                      <Badge variant="outline" className="text-xs h-4 px-1">
                                        {entry.targetLocations?.length || 0}
                                      </Badge>
                                    </div>
                                    
                                    {entry.targetLocations && entry.targetLocations.length > 0 ? (
                                      <div className="space-y-1 max-h-48 overflow-y-auto">
                                        {entry.targetLocations.map((location, index) => {
                                          const result = entry.copyResults?.[index];
                                          const isSuccess = result?.success;
                                          
                                          return (
                                            <div 
                                              key={index} 
                                              className={`flex items-center gap-2 p-2 rounded border text-xs ${
                                                isSuccess === true ? '' : 
                                                isSuccess === false ? '' : 
                                                ''
                                              }`}
                                            >
                                              {/* Status Dot */}
                                              <div className={`w-2 h-2 rounded-full flex-shrink-0 gap-2 ${
                                                isSuccess === true ? 'bg-green-500' : 
                                                isSuccess === false ? 'bg-red-500' : 
                                                'bg-gray-400'
                                              }`} />
                                              
                                              {/* Location Info */}
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 w-full">
                                                  <Computer className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                                  <span className="font-medium text-xs truncate w-[120px]">{location.name}</span>
                                                  <FolderOpen className="h-3 w-3 text-yellow-500 flex-shrink-0 ml-2" />
                                                  <span className="font-mono text-xs text-muted-foreground truncate flex-1">{location.path}</span>
                                                  <Badge 
                                                    variant={isSuccess === true ? 'outline' : isSuccess === false ? 'destructive' : 'outline'}
                                                    className={`text-xs h-4 px-2 flex-shrink-0 flex items-center gap-1 ${
                                                      isSuccess === true ? 'bg-green-200 text-green-800 border-green-300' :
                                                      isSuccess === false ? '' :
                                                      'bg-orange-200 text-orange-800 border-orange-300'
                                                    }`}
                                                  >
                                                    {isSuccess === true ? (
                                                      <>
                                                        <Check className="h-3 w-3" />
                                                        OK
                                                      </>
                                                    ) : isSuccess === false ? (
                                                      <>
                                                        <XCircle className="h-3 w-3" />
                                                        Chyba
                                                      </>
                                                    ) : (
                                                      <>
                                                        <Clock className="h-3 w-3" />
                                                        Čeká
                                                      </>
                                                    )}
                                                  </Badge>
                                                </div>
                                                {result?.error && (
                                                  <div className="text-red-600 mt-0.5 text-xs">
                                                    {result.error}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-muted-foreground italic py-2">
                                        Žádné cílové destinace
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
                </Table>
              </div>
            </div>
            
            {/* Fixed Footer with Pagination */}
            <div className="flex items-center justify-between py-4 px-4 border-t bg-background">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Zobrazeno {startIndex + 1}-{Math.min(endIndex, filteredHistory.length)} z {filteredHistory.length} záznamů
                </div>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                  <SelectTrigger className="w-[120px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 na stránku</SelectItem>
                    <SelectItem value="10">10 na stránku</SelectItem>
                    <SelectItem value="25">25 na stránku</SelectItem>
                    <SelectItem value="50">50 na stránku</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-md border border-dashed">
            <div className="flex flex-col items-center text-center">
              <FileText className="h-10 w-10 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium">
                {searchQuery ? 'Žádné výsledky' : 'Žádné záznamy'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery 
                  ? `Nebyl nalezen žádný záznam odpovídající "${searchQuery}"`
                  : 'Historie aktualizací je prázdná'
                }
              </p>
            </div>
          </div>
        )}
      </CardContent>
      
      {/* Edit Description Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upravit popis aktualizace</DialogTitle>
            <DialogDescription>
              Změňte popis pro aktualizaci z {editingEntry && formatDate(editingEntry.timestamp)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="description" className="text-sm font-medium">
                Popis
              </label>
              <Input
                id="description"
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="Zadejte popis aktualizace..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntry(null)}>
              Zrušit
            </Button>
            <Button onClick={saveEditedDescription} disabled={!editedDescription.trim()}>
              Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Potvrdit smazání</DialogTitle>
            <DialogDescription>
              Opravdu chcete smazat tento záznam? Tato akce je nevratná.
            </DialogDescription>
          </DialogHeader>
          {entryToDelete && (
            <div className="py-4">
              <div className="p-3 bg-muted rounded-md">
                <div className="font-medium">{entryToDelete.description}</div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(entryToDelete.timestamp)}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Zrušit
            </Button>
            <Button variant="destructive" onClick={handleDeleteEntry}>
              Smazat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Batch Delete Confirmation Dialog */}
      <Dialog open={isBatchDeleteDialogOpen} onOpenChange={setIsBatchDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Potvrdit hromadné smazání</DialogTitle>
            <DialogDescription>
              Opravdu chcete smazat {selectedEntries.size} vybraných záznamů? Tato akce je nevratná.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBatchDeleteDialogOpen(false)}>
              Zrušit
            </Button>
            <Button variant="destructive" onClick={handleBatchDelete}>
              Smazat ({selectedEntries.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
