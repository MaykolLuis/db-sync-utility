"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CheckCircle,
  Clock,
  FileInput,
  Search,
  Server,
  X,
  Filter,
  Expand,
  CalendarIcon,
  Copy,
  AlertCircle,
  FileDown,
  FileSpreadsheet,
  Loader2,
  DatabaseBackup,
  FileText,
  Trash2,
  Check,
} from "lucide-react"
import { format } from "date-fns"
import { cs } from "date-fns/locale"
import type { HistoryEntry } from "@/app/page"
import { HistoryDataTable } from "./history-datatable"
import { useToast } from "@/hooks/use-toast"
import {
  createHistoryCSV,
  downloadString,
  formatDateForExport,
  createHistoryExcel,
  downloadExcel,
} from "@/lib/export-utils"
import { clearHistory, updateHistoryEntryDescription, deleteHistoryEntry } from "@/app/lib/history-utils"
import { Alert } from "./ui/alert"

interface HistorySidebarProps {
  isOpen: boolean
  onClose: () => void
  history: HistoryEntry[]
  onHistoryChange?: (history: HistoryEntry[]) => void
}

interface DateRange {
  from: Date | undefined
  to: Date | undefined
  showFromCalendar: boolean
  showToCalendar: boolean
}

export function HistorySidebar({ isOpen, onClose, history, onHistoryChange }: HistorySidebarProps) {
  // Debug: Log history entries to check if version exists
  useEffect(() => {
    if (history && history.length > 0) {
      console.log('History entries in sidebar:', history.length)
      history.forEach((entry, index) => {
        console.log(`Sidebar history entry ${index} - ID: ${entry.id}, Version: ${entry.version || 'undefined'}`)
      })
    }
  }, [history])
  
  // State for lazy loading
  const [visibleCount, setVisibleCount] = useState(10) // Initially show 10 items
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const { toast } = useToast()
  const [historySearch, setHistorySearch] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>({ 
    from: undefined, 
    to: undefined, 
    showFromCalendar: false, 
    showToCalendar: false 
  })
  const [targetFilter, setTargetFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<"csv" | "excel">("excel")
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [editingEntry, setEditingEntry] = useState<HistoryEntry | null>(null)
  const [editedDescription, setEditedDescription] = useState("")
  
  // State for delete confirmation
  const [entryToDelete, setEntryToDelete] = useState<HistoryEntry | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close the sidebar
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  // Get unique target locations for filter
  const uniqueTargets = Array.from(new Set(history.flatMap((entry) => entry.targetLocations.map((loc) => loc.name))))

  // Get status for an entry
  const getEntryStatus = (entry: HistoryEntry) => {
    if (!entry.copyResults) return "success"

    const failedTargets = entry.copyResults.filter((result) => !result.success)
    if (failedTargets.length === 0) return "success"
    if (failedTargets.length === entry.copyResults.length) return "error"
    return "partial"
  }

  // Filter history entries based on search, date range, target, and status filters
  const filteredHistory = history.filter((entry) => {
    // Search filter
    const searchMatch = !historySearch || (
      entry.description.toLowerCase().includes(historySearch.toLowerCase()) ||
      entry.sourcePath.toLowerCase().includes(historySearch.toLowerCase()) ||
      entry.targetLocations.some(loc => 
        loc.name?.toLowerCase().includes(historySearch.toLowerCase()) ||
        loc.path.toLowerCase().includes(historySearch.toLowerCase())
      )
    )

    // Date range filter
    const dateMatch = (
      (!dateRange.from || new Date(entry.timestamp) >= dateRange.from) &&
      (!dateRange.to || new Date(entry.timestamp) <= dateRange.to)
    )

    // Target filter
    const targetMatch = targetFilter === "all" || entry.targetLocations.some(loc => 
      loc.path === targetFilter || loc.name === targetFilter
    )

    // Status filter
    const status = getEntryStatus(entry)
    const statusMatch = statusFilter === "all" || status === statusFilter

    return searchMatch && dateMatch && targetMatch && statusMatch
  })
  
  // Get visible entries based on the current count limit
  const visibleHistory = filteredHistory.slice(0, visibleCount)
  
  // Function to load more items
  const loadMoreItems = () => {
    setIsLoadingMore(true)
    // Simulate loading delay for better UX
    setTimeout(() => {
      setVisibleCount(prevCount => prevCount + 10) // Load 10 more items
      setIsLoadingMore(false)
    }, 300)
  }
  
  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(10)
  }, [historySearch, dateRange.from, dateRange.to, targetFilter, statusFilter])

  // Format timestamp to readable date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString("cs-CZ")
  }

  // Clear all filters
  const clearFilters = () => {
    setHistorySearch("")
    setDateRange({ 
      from: undefined, 
      to: undefined, 
      showFromCalendar: false, 
      showToCalendar: false 
    })
    setTargetFilter("all")
    setStatusFilter("all")
  }

  // State for tracking which entry is being copied
  const [copyingId, setCopyingId] = useState<number | null>(null)

  // Copy update details to clipboard
  const copyUpdateDetails = (entry: HistoryEntry) => {
    setCopyingId(entry.id)
    const formattedDate = formatDate(entry.timestamp)
    const targets = entry.targetLocations.map((loc) => `${loc.name}: ${loc.path}`).join("\n")

    const textToCopy = `
Aktualizace: ${entry.description}
Datum: ${formattedDate}
Zdroj: ${entry.sourcePath}
Cíle:
${targets}
    `.trim()

    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        toast({
          title: "Zkopírováno do schránky",
          description: "Podrobnosti aktualizace byly zkopírovány do schránky",
        })
      })
      .catch((error) => {
        toast({
          title: "Chyba při kopírování",
          description: "Nepodařilo se zkopírovat do schránky",
          variant: "destructive",
        })
        console.error("Copy failed:", error)
      })
      .finally(() => {
        // Reset copying state after a short delay
        setTimeout(() => setCopyingId(null), 500)
      })
  }

  // Open edit dialog for entry description
  const openEditDialog = (entry: HistoryEntry, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setEditingEntry(entry)
    setEditedDescription(entry.description)
  }

  // Save edited description
  const saveEditedDescription = async () => {
    if (!editingEntry || !editedDescription.trim()) return;

    try {
      // Use the utility function to update the description and save to file
      const updatedHistory = await updateHistoryEntryDescription(
        editingEntry.id,
        editedDescription,
        history
      );

      // Update the history state in the parent component
      if (onHistoryChange) {
        onHistoryChange(updatedHistory);
      }

      // Close the dialog and show success toast
      setEditingEntry(null);
      toast({
        title: "Popis aktualizován",
        description: "Popis aktualizace byl úspěšně změněn",
      });
    } catch (error) {
      console.error('Chyba při aktualizaci popisu:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktualizovat popis",
        variant: "destructive"
      });
    }
  };
  
  // Open delete confirmation dialog
  const confirmDelete = (entry: HistoryEntry, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEntryToDelete(entry);
    setIsDeleteDialogOpen(true);
  };
  
  // Delete history entry
  const handleDeleteEntry = async () => {
    if (!entryToDelete) return;
    
    try {
      // Use the utility function to delete the entry and save to file
      const updatedHistory = await deleteHistoryEntry(
        entryToDelete.id,
        history
      );
      
      // Update the history state in the parent component
      if (onHistoryChange) {
        onHistoryChange(updatedHistory);
      }
      
      // Show success toast
      toast({
        title: "Záznam odstraněn",
        description: "Záznam historie byl úspěšně odstraněn",
      });
    } catch (error) {
      console.error('Chyba při odstraňování záznamu:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se odstranit záznam historie",
        variant: "destructive"
      });
    } finally {
      // Close the dialog
      setIsDeleteDialogOpen(false);
      setEntryToDelete(null);
    }
  };

  // Clear all history entries
  const handleClearHistory = async () => {
    setIsClearing(true)
    try {
      const emptyHistory = await clearHistory()
      
      // Call the onHistoryChange callback if provided
      if (onHistoryChange) {
        onHistoryChange(emptyHistory)
      }
      
      toast({
        title: "Historie vymazána",
        description: "Všechny záznamy historie byly odstraněny",
      })
      
      // Close the dialog
      setIsClearDialogOpen(false)
    } catch (error) {
      console.error("Chyba při mazání historie:", error)
      toast({
        title: "Chyba při mazání historie",
        description: "Nepodařilo se vymazat historii aktualizací",
        variant: "destructive",
      })
    } finally {
      setIsClearing(false)
    }
  }
  
  // Export history
  const exportHistory = async () => {
    setIsExporting(true)

    try {
      // Formátování data pro název souboru
      const formatDateForFilename = (timestamp: number) => {
        const date = new Date(timestamp)
        return date.toISOString().split("T")[0] // YYYY-MM-DD
      }

      // Vytvoření názvu souboru
      const filename = `historie_aktualizaci_${formatDateForFilename(Date.now())}`

      if (exportFormat === "csv") {
        // Export do CSV
        const csvContent = createHistoryCSV(filteredHistory, formatDateForExport)
        downloadString(csvContent, `${filename}.csv`)
      } else {
        // Export do Excel
        const buffer = await createHistoryExcel(filteredHistory)
        downloadExcel(buffer, `${filename}.xlsx`)
      }

      toast({
        title: "Export dokončen",
        description: `Historie aktualizací byla exportována do souboru ${filename}.${exportFormat === "csv" ? "csv" : "xlsx"}`,
      })
    } catch (error) {
      console.error("Chyba při exportu:", error)
      toast({
        title: "Chyba při exportu",
        description: "Nepodařilo se exportovat historii aktualizací",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div 
      className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{ backdropFilter: "blur(2px)" }}
      onClick={(e) => {
        // Close when clicking the backdrop
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="fixed top-0 bottom-0 right-0 h-full flex flex-col shadow-xl bfi-card z-50 p-4"
        style={{
          width: isExpanded ? '100%' : '32rem',
          maxWidth: isExpanded ? '100%' : '32rem',
          transition: 'transform 300ms ease-in-out, width 300ms ease-in-out',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          willChange: 'transform',
          position: 'absolute',
          right: 0,
          backgroundColor: '#09090b',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.8)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <div className="p-4 text-white flex justify-between items-center relative overflow-hidden" style={{ background: "#09090b",  }}>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5"> <DatabaseBackup /></div>
            <h2 className="text-xl font-bold">Historie aktualizací</h2>
            {filteredHistory.length !== history.length && (
              <Badge variant="secondary" className="bg-bfi-red text-white">
                {filteredHistory.length} z {history.length}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-white hover:bg-bfi-gray transition-all duration-300"
              title={isExpanded ? "Zmenšit" : "Rozšířit na celou obrazovku"}
            >
              <Expand 
                className={`h-5 w-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`} 
              />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-bfi-gray">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-4 border-b border-[rgba(255,255,255,0.1)] space-y-3">
          {/* Search and Filter Row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Hledat v historii..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="pl-8 bfi-input"
                variant="bfi"
              />
              {historySearch && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-7 w-7 p-0"
                  onClick={() => setHistorySearch("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              className={`gap-2 ${(dateRange.from || dateRange.to || targetFilter !== "all" || statusFilter !== "all") ? 'bg-blue-100 border-blue-300' : ''}`} 
              onClick={() => setIsFilterDialogOpen(true)}
            >
              <Filter className={`h-4 w-4 ${(dateRange.from || dateRange.to || targetFilter !== "all" || statusFilter !== "all") ? 'text-blue-600' : ''}`} />
              Filtry
              {(dateRange.from || dateRange.to || targetFilter !== "all" || statusFilter !== "all") && (
                <Badge variant="secondary" className="ml-1 bg-blue-500 text-white px-1.5 py-0 text-xs rounded-full">
                  {[dateRange.from || dateRange.to, targetFilter !== "all", statusFilter !== "all"]
                    .filter(Boolean).length}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {isExpanded ? (
          <HistoryDataTable 
            history={filteredHistory} 
            onCopy={copyUpdateDetails} 
            formatDate={formatDate} 
            onHistoryChange={onHistoryChange}
          />
        ) : (
          <div className="flex-1 p-4 overflow-y-auto overflow-x-hidden" style={{ scrollbarGutter: 'stable' }}>
            <div className="space-y-4">
              {filteredHistory.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {historySearch || dateRange.from || dateRange.to || targetFilter !== "all" || statusFilter !== "all"
                    ? "Nebyly nalezeny žádné odpovídající záznamy"
                    : "Zatím nejsou žádné záznamy historie"}
                </div>
              ) : (
                <div>
                  {visibleHistory.map((entry) => {
                    const status = getEntryStatus(entry)

                    return (
                      <Card
                        key={entry.id}
                        className={`border-l-4 hover:shadow-md transition-shadow mb-1.5 bfi-card-glass ${
                          status === "success"
                            ? "border-l-green-500"
                            : status === "error"
                              ? "border-l-red-500"
                              : "border-l-yellow-500"
                        }`}
                      >
                      <div className="p-2">
                        {/* Header with status icon, timestamp and copy button */}
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-1">
                            <span title={status === "success" ? "Úspěšná aktualizace" : status === "error" ? "Neúspěšná aktualizace" : "Částečně úspěšná aktualizace"}>
                              {status === "success" && <Check className="h-3 w-3 text-green-500" />}
                              {status === "error" && <Alert className="h-3 w-3 text-red-500" />}
                              {status === "partial" && (
                                <div className="h-3 w-3 rounded-full border-2 border-yellow-500 flex items-center justify-center">
                                  <div className="h-1 w-1 rounded-full bg-yellow-500"></div>
                                </div>
                              )}
                            </span>
                            <span className="font-medium text-xs" title="Záznam aktualizace databáze">
                              Aktualizace
                            </span>
                            <Badge 
                              variant="bfi" 
                              className="flex items-center gap-0.5 text-[9px] py-0 h-4 ml-1"
                              title={`Datum a čas aktualizace: ${new Date(entry.timestamp).toLocaleString('cs-CZ')}`}
                            >
                              <Clock className="h-2 w-2 mr-0.5" />
                              {formatDate(entry.timestamp)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog(entry, e);
                              }}
                              title="Upravit popis"
                            >
                              <FileText className="h-2.5 w-2.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyUpdateDetails(entry);
                              }}
                              title="Kopírovat podrobnosti"
                            >
                              <Copy className="h-2.5 w-2.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-red-50 hover:text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDelete(entry, e);
                              }}
                              title="Odstranit záznam"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Description */}
                        <div className="text-xs text-muted-foreground mb-1" title={`Popis aktualizace: ${entry.description}`}>{entry.description}</div>
                        
                        {/* Source and targets in a compact layout */}
                        <div className="text-[10px]">
                          {/* Source row with icon and path side by side */}
                          <div className="flex items-center mb-2">
                            <div className="flex items-center min-w-[60px]">
                              <FileInput className="h-2.5 w-2.5 text-bfi-blue mr-1" />
                              <span className="text-muted-foreground" title="Zdrojová složka souborů">Zdroj:</span>
                            </div>
                            <div className="truncate font-medium" title={entry.sourcePath}>{entry.sourcePath}</div>
                          </div>
                          
                          {/* Targets with better horizontal layout */}
                          <div className="flex items-start">
                            <div className="flex items-center min-w-[60px]">
                              <Server className="h-2.5 w-2.5 text-bfi-blue mr-1" />
                              <span className="text-muted-foreground" title="Cílové složky pro kopírování souborů">Cíle:</span>
                            </div>
                            <div className="flex-1 space-y-0.5">
                              {entry.targetLocations.map((location, i) => {
                                // Find result for this target
                                const result = entry.copyResults?.find(
                                  (r) => r.targetId === entry.targetLocations[i].id,
                                )

                                return (
                                  <div key={i} className="flex flex-wrap items-center gap-x-1">
                                    <div className="flex items-center min-w-[60px] max-w-[100px]">
                                      <span className="font-medium truncate" title={location.name}>{location.name}</span>
                                      {result && (
                                        <Badge
                                          variant="outline"
                                          className={`ml-0.5 text-[8px] py-0 h-3 px-0.5 ${
                                            result.success
                                              ? "bg-green-50 text-green-700 border-green-200"
                                              : "bg-red-50 text-red-700 border-red-200"
                                          }`}
                                          title={result.success ? "Kopírování proběhlo úspěšně" : "Při kopírování došlo k chybě"}
                                        >
                                          {result.success ? "OK" : "Chyba"}
                                        </Badge>
                                      )}
                                    </div>
                                    <span className="truncate text-muted-foreground flex-1" title={location.path}>
                                      {location.path}
                                    </span>
                                    {result?.error && (
                                      <span className="text-red-500 shrink-0" title={result.error}>(!)</span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                        {/* Version badge in bottom right */}
                        {entry.version && (
                          <div className="flex justify-end">
                            <Badge 
                              variant="outline" 
                              className="flex items-center bg-black text-red-500 border-black text-[10px] py-0 h-4 px-1.5"
                              title="Verze databáze"
                            >
                              {entry.version}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
                
                {/* Load more button */}
                {visibleHistory.length < filteredHistory.length && (
                  <div className="flex justify-center mt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={loadMoreItems}
                      disabled={isLoadingMore}
                      className="w-full text-sm"
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                          Načítám...
                        </>
                      ) : (
                        <>Načíst další ({filteredHistory.length - visibleHistory.length})</>  
                      )}
                    </Button>
                  </div>
                )}
              </div>
              )}
            </div>
          </div>
        )}

        <div className="p-4 border-t border-[rgba(255,255,255,0.1)] flex justify-between">
          <div className="flex gap-2">
            

           
          </div>
          <Button 
            size="sm" 
            variant="bfi"
            onClick={() => setIsClearDialogOpen(true)}
            disabled={filteredHistory.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Vymazat vše
          </Button>
        </div>
      </div>

      {/* Clear History Dialog */}
      <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
        <DialogContent className="sm:max-w-md bfi-card-glass">
          <DialogHeader>
            <DialogTitle>Vymazat historii</DialogTitle>
            <DialogDescription>
              Opravdu chcete vymazat celou historii aktualizací? Tato akce je nevratná.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsClearDialogOpen(false)}
              disabled={isClearing}
              className="hover:bg-transparent"
            >
              Zrušit
            </Button>
            <Button
              type="button"
              variant="bfi"
              onClick={handleClearHistory}
              disabled={isClearing}
            >
              {isClearing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mazání...
                </>
              ) : (
                "Vymazat historii"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Description Dialog */}
      <Dialog open={editingEntry !== null} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upravit popis aktualizace</DialogTitle>
            <DialogDescription>
              Změňte popis aktualizace z {editingEntry?.timestamp ? formatDate(editingEntry.timestamp) : ""}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Input
                id="description"
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="Zadejte nový popis aktualizace"
                className="w-full"
                autoFocus
              />
            </div>
          </div>
          
          <DialogFooter className="flex flex-row justify-end gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingEntry(null)}
            >
              Zrušit
            </Button>
            <Button
              type="button"
              onClick={saveEditedDescription}
              disabled={!editedDescription.trim()}
            >
              Uložit změny
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Filter Dialog */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filtry historie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-medium">Časové období</h4>
              <div className="grid gap-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="text-sm font-medium">Od:</span>
                  <div className="col-span-3">
                    <div className="relative">
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        onClick={() => setDateRange(prev => ({ ...prev, showFromCalendar: !prev.showFromCalendar, showToCalendar: false }))}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? format(dateRange.from, "PPP", { locale: cs }) : "Vyberte datum"}
                      </Button>
                      {dateRange.showFromCalendar && (
                        <div className="absolute z-50 mt-1 bg-white border rounded-md shadow-md">
                          <Calendar
                            mode="single"
                            selected={dateRange.from}
                            onSelect={(date) => {
                              setDateRange((prev) => ({ 
                                ...prev, 
                                from: date,
                                showFromCalendar: false 
                              }));
                            }}
                            initialFocus
                            locale={cs}
                          />
                          <div className="p-2 border-t flex justify-between">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setDateRange(prev => ({ ...prev, from: undefined, showFromCalendar: false }))}
                            >
                              Vymazat
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setDateRange(prev => ({ ...prev, showFromCalendar: false }))}
                            >
                              Zavřít
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="text-sm font-medium">Do:</span>
                  <div className="col-span-3">
                    <div className="relative">
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        onClick={() => setDateRange(prev => ({ ...prev, showToCalendar: !prev.showToCalendar, showFromCalendar: false }))}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.to ? format(dateRange.to, "PPP", { locale: cs }) : "Vyberte datum"}
                      </Button>
                      {dateRange.showToCalendar && (
                        <div className="absolute z-50 mt-1 bg-white border rounded-md shadow-md">
                          <Calendar
                            mode="single"
                            selected={dateRange.to}
                            onSelect={(date) => {
                              setDateRange((prev) => ({ 
                                ...prev, 
                                to: date,
                                showToCalendar: false 
                              }));
                            }}
                            initialFocus
                            locale={cs}
                          />
                          <div className="p-2 border-t flex justify-between">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setDateRange(prev => ({ ...prev, to: undefined, showToCalendar: false }))}
                            >
                              Vymazat
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setDateRange(prev => ({ ...prev, showToCalendar: false }))}
                            >
                              Zavřít
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Stav</h4>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Všechny stavy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny stavy</SelectItem>
                  <SelectItem value="success">Úspěch</SelectItem>
                  <SelectItem value="partial">Částečně</SelectItem>
                  <SelectItem value="error">Chyba</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Cílové umístění</h4>
              <Select value={targetFilter} onValueChange={setTargetFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Všechny cíle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny cíle</SelectItem>
                  {uniqueTargets.map((target) => (
                    <SelectItem key={target} value={target}>
                      {target}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={clearFilters}>
              Vymazat filtry
            </Button>
            <Button onClick={() => setIsFilterDialogOpen(false)} className="bfi-button">
              Použít filtry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Odstranit záznam historie</DialogTitle>
            <DialogDescription>
              Opravdu chcete odstranit tento záznam historie z {entryToDelete?.timestamp ? formatDate(entryToDelete.timestamp) : ""}?
              Tato akce je nevratná.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {entryToDelete && (
              <div className="text-sm">
                <p><strong>Popis:</strong> {entryToDelete.description}</p>
                <p><strong>Datum:</strong> {formatDate(entryToDelete.timestamp)}</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex flex-row justify-end gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setEntryToDelete(null);
              }}
            >
              Zrušit
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteEntry}
            >
              Odstranit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
