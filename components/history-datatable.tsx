"use client"

import React, { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { ChevronDown, ChevronUp, Copy, FileInput, Server, CheckCircle, AlertCircle, FileText, Check, ChevronLeft, Loader2, FileSpreadsheet, ChevronRight, MoreVertical, Trash2, Eraser, Clock, HardDrive, FileDigit, GitCompare, Pencil, X, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { createHistoryExcel, downloadExcel } from "@/lib/export-utils"
import { updateHistoryEntryDescription, deleteHistoryEntry } from "@/app/lib/history-utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { loadSettingsAsync } from "@/lib/settings"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Import HistoryEntry type from app/page.tsx
import type { HistoryEntry } from "@/app/page"

// Define copied file interface
interface CopiedFile {
  name: string;
  size: number;
}

// Define enhanced copy result interface for the extended view
interface EnhancedCopyResult {
  targetId: string
  targetPath?: string
  targetName?: string
  success: boolean
  error?: string
  fileSize?: number
  duration?: number
  fileName?: string
  hasDiff?: boolean
  copiedFiles?: CopiedFile[]
}

// Mock CSVLink component until react-csv is properly installed
const CSVLink = ({ data, filename, className, children }: { data: any[], filename: string, className?: string, children: React.ReactNode }) => {
  const handleClick = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      data.map(row => Object.values(row).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <button className={className} onClick={handleClick}>
      {children}
    </button>
  );
}

interface HistoryDataTableProps {
  history: HistoryEntry[]
  onCopy: (entry: HistoryEntry) => void
  formatDate: (timestamp: number) => string
  onHistoryChange?: (updatedHistory: HistoryEntry[]) => void
}

// Helper function to format file size
// Uses 1000-based units (KB = 1000 bytes) to match Windows Explorer display
const formatFileSize = (bytes: number): string => {
  // Handle undefined, null, or 0 bytes
  if (!bytes || bytes === 0) {
    return "0 B";
  }
  
  // Make sure bytes is a number
  const numBytes = typeof bytes === 'number' ? bytes : parseInt(String(bytes), 10);
  
  // Log the raw bytes for debugging
  console.log(`history-datatable formatFileSize called with ${numBytes} bytes`);
  
  // Use 1000-based units to match Windows Explorer display
  const k = 1000;
  const units = ["B", "KB", "MB", "GB", "TB"];
  
  // Calculate the appropriate unit index
  const i = Math.floor(Math.log(Math.max(1, numBytes)) / Math.log(k));
  
  // Calculate the value in the appropriate unit
  const value = numBytes / Math.pow(k, i);
  
  // Format with 2 decimal places
  const formattedValue = value.toFixed(2);
  
  // Return the formatted string
  return `${formattedValue} ${units[i]}`;
}

// Helper function to format duration in milliseconds
const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms} ms`;
  
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds} s`;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')} min`;
}

export function HistoryDataTable({ history, onCopy, formatDate, onHistoryChange }: HistoryDataTableProps) {
  const { toast } = useToast()
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<"csv" | "excel">("excel")
  const [copyingId, setCopyingId] = useState<number | null>(null)
  const [editingEntry, setEditingEntry] = useState<HistoryEntry | null>(null)
  const [editedDescription, setEditedDescription] = useState("")
  
  // Get status for an entry
  const getEntryStatus = (entry: HistoryEntry) => {
    if (!entry.copyResults) return "success"

    const failedTargets = entry.copyResults.filter((result) => !result.success)
    if (failedTargets.length === 0) return "success"
    if (failedTargets.length === entry.copyResults.length) return "error"
    return "partial"
  }
  
  // Prepare data for CSV export
  const exportData = React.useMemo(() => {
    return history.map(entry => ({
      datum: formatDate(entry.timestamp),
      verze: entry.version || '-',
      popis: entry.description,
      zdroj: entry.sourcePath,
      cile: entry.targetLocations.map(loc => loc.name).join(', '),
      status: getEntryStatus(entry)
    }))
  }, [history, formatDate])

  // State for delete confirmation
  const [entryToDelete, setEntryToDelete] = useState<HistoryEntry | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState(false)
  
  // State for dropdown menu
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  
  // State for batch operations - using string to match the actual ID type in history entries
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set())
  
  // Pagination settings
  const [itemsPerPage, setItemsPerPage] = useState(10) // Default value until settings are loaded
  
  // Load items per page from settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await loadSettingsAsync()
        if (settings && settings.historyItemsPerPage) {
          setItemsPerPage(settings.historyItemsPerPage)
        }
      } catch (error) {
        console.error('Error loading settings for pagination:', error)
      }
    }
    
    loadSettings()
  }, [])
  
  // Copy update details to clipboard in the same format as sidebar
  const copyUpdateDetails = (entry: HistoryEntry) => {
    setCopyingId(entry.id)
    const formattedDate = formatDate(entry.timestamp)
    const targets = entry.targetLocations.map((loc) => `${loc.name}: ${loc.path}`).join("\n")
    
    // Include version information if available
    const versionInfo = entry.version ? `\nVerze: ${entry.version}` : ''

    const textToCopy = `
Aktualizace: ${entry.description}
Datum: ${formattedDate}${versionInfo}
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
    if (!editingEntry || !editedDescription.trim()) return
    
    try {
      // Use the utility function to update the description and save to file
      const updatedHistory = await updateHistoryEntryDescription(
        editingEntry.id,
        editedDescription,
        history
      )
      
      // Update the history state in the parent component
      if (onHistoryChange) {
        onHistoryChange(updatedHistory)
      }
      
      // Close the dialog and show success toast
      setEditingEntry(null)
      toast({
        title: "Popis aktualizován",
        description: "Popis aktualizace byl úspěšně změněn",
      })
    } catch (error) {
      console.error('Chyba při aktualizaci popisu:', error)
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktualizovat popis",
        variant: "destructive"
      })
    }
  }
  
  // Open delete confirmation dialog
  const confirmDelete = (entry: HistoryEntry, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setEntryToDelete(entry)
    setIsDeleteDialogOpen(true)
  }
  
  // Delete history entry
  const handleDeleteEntry = async () => {
    if (!entryToDelete) return
    
    try {
      // Use the utility function to delete the entry and save to file
      const updatedHistory = await deleteHistoryEntry(
        entryToDelete.id,
        history
      )
      
      // Update the history state in the parent component
      if (onHistoryChange) {
        onHistoryChange(updatedHistory)
      }
      
      // Show success toast
      toast({
        title: "Záznam odstraněn",
        description: "Záznam historie byl úspěšně odstraněn",
      })
    } catch (error) {
      console.error('Chyba při odstraňování záznamu:', error)
      toast({
        title: "Chyba",
        description: "Nepodařilo se odstranit záznam historie",
        variant: "destructive"
      })
    } finally {
      // Close the dialog
      setIsDeleteDialogOpen(false)
      setEntryToDelete(null)
    }
  }
  
  // Toggle selection of a single entry
  const toggleEntrySelection = (entryId: string | number, e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent) => {
    e.stopPropagation() // Prevent row expansion
    
    const newSelectedEntries = new Set(selectedEntries)
    // Convert to string to ensure consistent type
    const stringId = String(entryId)
    if (newSelectedEntries.has(stringId)) {
      newSelectedEntries.delete(stringId)
    } else {
      newSelectedEntries.add(stringId)
    }
    setSelectedEntries(newSelectedEntries)
  }
  
  // Calculate pagination variables
  const totalItems = history.length
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
  
  // Get current page items
  const currentItems = history.slice(startIndex, endIndex)
  
  // Toggle selection of all entries on current page
  const toggleSelectAll = () => {
    if (selectedEntries.size === currentItems.length) {
      // If all are selected, deselect all
      setSelectedEntries(new Set())
    } else {
      // Otherwise select all
      const newSelectedEntries = new Set<string>()
      currentItems.forEach(entry => newSelectedEntries.add(String(entry.id)))
      setSelectedEntries(newSelectedEntries)
    }
  }
  
  // Handle batch delete
  const handleBatchDelete = async () => {
    if (selectedEntries.size === 0) return
    
    try {
      let updatedHistory = [...history]
      
      // Delete each selected entry
      for (const entryId of selectedEntries) {
        updatedHistory = await deleteHistoryEntry(entryId, updatedHistory)
      }
      
      // Update the history state in the parent component
      if (onHistoryChange) {
        onHistoryChange(updatedHistory)
      }
      
      // Show success toast
      toast({
        title: `${selectedEntries.size} záznamů odstraněno`,
        description: `Vybrané záznamy historie byly úspěšně odstraněny`,
      })
    } catch (error) {
      console.error('Chyba při hromadném odstraňování záznamů:', error)
      toast({
        title: "Chyba",
        description: "Nepodařilo se odstranit vybrané záznamy historie",
        variant: "destructive"
      })
    } finally {
      // Close the dialog and clear selection
      setIsBatchDeleteDialogOpen(false)
      setSelectedEntries(new Set())
    }
  }
  
  // Batch export selected entries
  const exportSelectedEntries = async () => {
    if (selectedEntries.size === 0) return
    
    setIsExporting(true)
    
    try {
      // Convert Set to Array for easier debugging
      const selectedIds = Array.from(selectedEntries)
      console.log('Selected IDs for export:', selectedIds)
      
      // Filter history to only include selected entries
      const selectedHistoryEntries = history.filter(entry => selectedEntries.has(String(entry.id)))
      console.log(`Filtered ${selectedHistoryEntries.length} entries out of ${history.length} total entries`)
      
      // Format date for filename
      const formatDateForFilename = (timestamp: number) => {
        const date = new Date(timestamp)
        return date.toISOString().split("T")[0] // YYYY-MM-DD
      }
      
      // Create filename
      const filename = `vybrane_aktualizace_${formatDateForFilename(Date.now())}`
      
      // Export to Excel
      const buffer = await createHistoryExcel(selectedHistoryEntries)
      downloadExcel(buffer, `${filename}.xlsx`)
      
      toast({
        title: "Export dokončen",
        description: `${selectedHistoryEntries.length} vybraných záznamů bylo exportováno do souboru ${filename}.xlsx`,
      })
    } catch (error) {
      console.error("Chyba při exportu vybraných záznamů:", error)
      toast({
        title: "Chyba při exportu",
        description: "Nepodařilo se exportovat vybrané záznamy historie",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const toggleRowExpansion = (id: number) => {
    const stringId = String(id)
    const newExpandedRows = new Set(expandedRows)
    if (newExpandedRows.has(stringId)) {
      newExpandedRows.delete(stringId)
    } else {
      newExpandedRows.add(stringId)
    }
    setExpandedRows(newExpandedRows)
  }

  // Reset to first page when history changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [history.length])
  
  // Get status badge with BFI-themed styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900 text-green-100"><CheckCircle className="h-3 w-3 mr-1" />Úspěch</span>
      case 'error':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-900 text-red-100"><AlertCircle className="h-3 w-3 mr-1" />Chyba</span>
      case 'partial':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-900 text-yellow-100"><AlertCircle className="h-3 w-3 mr-1" />Částečně</span>
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-800 text-gray-200"><AlertCircle className="h-3 w-3 mr-1" />Neznámý</span>
    }
  }
  
  // Get version badge with BFI-themed styling
  const getVersionBadge = (version: string) => {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-900 text-blue-100">{version}</span>
  }

  // Export history to Excel
  const exportHistory = async () => {
    if (history.length === 0) return

    setIsExporting(true)

    try {
      // Formátování data pro název souboru
      const formatDateForFilename = (timestamp: number) => {
        const date = new Date(timestamp)
        return date.toISOString().split("T")[0] // YYYY-MM-DD
      }

      // Vytvoření názvu souboru
      const filename = `historie_aktualizaci_${formatDateForFilename(Date.now())}`

      // Export do Excel
      const buffer = await createHistoryExcel(history)
      downloadExcel(buffer, `${filename}.xlsx`)

      toast({
        title: "Export dokončen",
        description: `Historie aktualizací byla exportována do souboru ${filename}.xlsx`,
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
    <div className="flex flex-col">
      {/* Main container with fixed height to ensure pagination is always visible */}
      <div className="rounded-md border flex flex-col bg-[#09090b]" style={{ height: 'calc(100vh - 220px)', boxShadow: '0 4px 30px rgba(0, 0, 0, 0.8)' }}>
        <div className="flex items-center gap-2 mb-2 p-2 rounded border border-[rgba(255,255,255,0.1)] bg-[#121212]">
          <span className="text-sm font-medium text-gray-200">
            Vybráno: {selectedEntries.size} záznamů
          </span>
          <div className="flex-1"></div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs flex items-center gap-1 bg-[#121212] text-white border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)]"
            onClick={() => setSelectedEntries(new Set())}
            disabled={selectedEntries.size === 0}
          >
            <X className="h-3.5 w-3.5" />
            Zrušit výběr
          </Button>
          <CSVLink
            data={exportData}
            filename={`db-sync-historie-${new Date().toISOString().split('T')[0]}.csv`}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-[rgba(255,255,255,0.1)] bg-[#121212] hover:bg-[rgba(255,255,255,0.1)] text-white h-8 text-xs px-3 py-0 gap-1 ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5" />
            )}
            Exportovat vše
          </CSVLink>
          <Button
            variant="destructive"
            size="sm"
            className="h-8 text-xs flex items-center gap-1 bg-[#e11d48] hover:bg-[#be123c] text-white border-[#e11d48]"
            onClick={() => setIsBatchDeleteDialogOpen(true)}
            disabled={selectedEntries.size === 0}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Odstranit vybrané
          </Button>
        </div>
      
        {/* Scrollable table container */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden m-2 rounded-lg" style={{ height: 'calc(100% - 120px)', scrollbarGutter: 'stable' }}>
          <Table className="table-fixed w-full border-collapse">
            <TableHeader className="sticky top-0 z-10 bg-[#09090b]">
              <TableRow className="bg-gradient-to-r from-[#09090b] to-[#1e1e1e] text-white hover:bg-gradient-to-r from-[#09090b] to-[#1e1e1e] border-b border-[#e11d48]">
                <TableHead className="text-white w-8 p-1 ">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.05)] checked:bg-[#e11d48] checked:border-[#e11d48] focus:ring-[#e11d48] focus:ring-offset-[#09090b]"
                      checked={currentItems.length > 0 && selectedEntries.size === currentItems.length}
                      onChange={toggleSelectAll}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-white w-8 p-1"></TableHead>
                <TableHead className="text-white w-[80px] p-1">Stav</TableHead>
                <TableHead className="text-white w-[100px] p-1">Datum</TableHead>
                <TableHead className="text-white w-[60px] p-1">Verze</TableHead>
                <TableHead className="text-white w-[20%] p-1">Popis</TableHead>
                <TableHead className="text-white w-[30%] p-1">Zdrojová cesta</TableHead>
                <TableHead className="text-white w-[15%] p-1">Cíle</TableHead>
                <TableHead className="text-white w-[60px] p-1 text-rights">Akce</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {currentItems.map((entry) => {
              const isExpanded = expandedRows.has(String(entry.id))
              const status = getEntryStatus(entry)

              return (
                <React.Fragment key={`entry-${entry.id}`}>
                  {/* Main Row */}
                  <TableRow
                    key={entry.id}
                    className={`${isExpanded ? 'bg-[rgba(255,255,255,0.05)]' : 'hover:bg-[#121212]'} ${selectedEntries.has(String(entry.id)) ? 'bg-[rgba(225,29,72,0.1)]' : ''} cursor-pointer transition-colors duration-150`}
                    onClick={() => toggleRowExpansion(entry.id)}
                  >
                    <TableCell className="w-8 p-1 align-middle" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.05)] checked:bg-[#e11d48] checked:border-[#e11d48] focus:ring-[#e11d48] focus:ring-offset-[#09090b]"
                          checked={selectedEntries.has(String(entry.id))}
                          onChange={(e) => toggleEntrySelection(String(entry.id), e)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="w-8 p-1 align-middle">
                      <div className="flex items-center justify-center">
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3 text-gray-300" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-gray-300" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="p-1 align-middle">
                      <div className="flex items-center gap-1">
                        <span title={status === "success" ? "Úspěšná aktualizace" : status === "error" ? "Neúspěšná aktualizace" : "Částečně úspěšná aktualizace"}>
                          {getStatusBadge(status)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs p-1 align-middle" title={`Datum a čas aktualizace: ${new Date(entry.timestamp).toLocaleString('cs-CZ')}`}>
                      {formatDate(entry.timestamp)}
                    </TableCell>
                    <TableCell className="p-1 align-middle">
                      <div className="flex items-center">
                        {entry.version ? (
                          getVersionBadge(entry.version)
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="p-1 align-middle">
                      <div className="truncate text-xs" title={entry.description}>
                        {entry.description}
                      </div>
                    </TableCell>
                    <TableCell className="p-1 align-middle">
                      <div className="flex items-center gap-1">
                        <FileInput className="h-3 w-3 text-[#e11d48] flex-shrink-0" />
                        <span className="truncate text-xs text-gray-300" title={entry.sourcePath}>
                          {entry.sourcePath.replace(/^.*[\\\/]/, '')}
                          <span className="text-[9px] text-gray-400 ml-1">({entry.sourcePath.split('\\').slice(-2, -1)})</span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="p-1 align-middle">
                      <div className="flex items-center">
                        <Server className="h-3 w-3 text-[#e11d48] flex-shrink-0 mr-1" />
                        <div className="text-xs text-gray-300">
                          <div className="flex items-center gap-1">
                            {entry.targetLocations.map((loc: { id?: string; name: string; path: string }, i: number) => (
                              <span 
                                key={i} 
                                className="inline-flex items-center bg-[rgba(255,255,255,0.1)] text-[9px] text-gray-200 rounded px-1 mr-0.5" 
                                title={loc.path}
                              >
                                {loc.name}
                                {entry.copyResults?.find((r: { targetId: string }) => r.targetId === loc.id) && (
                                  <span className={`ml-0.5 ${entry.copyResults.find((r: { targetId: string; success: boolean }) => r.targetId === loc.id)?.success ? 'text-green-500' : 'text-red-500'}`}>
                                    {entry.copyResults.find((r: { targetId: string; success: boolean }) => r.targetId === loc.id)?.success ? '✓' : '✗'}
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="p-1 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <DropdownMenu open={openMenuId === entry.id} onOpenChange={(open) => setOpenMenuId(open ? entry.id : null)}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-[rgba(255,255,255,0.05)]">
                              <MoreVertical className="h-3.5 w-3.5 text-gray-300" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-[#09090b] border-[rgba(255,255,255,0.1)]">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation()
                              openEditDialog(entry, e)
                            }} className="text-gray-200 hover:bg-[rgba(255,255,255,0.05)] focus:bg-[rgba(255,255,255,0.05)]">
                              <Pencil className="h-3.5 w-3.5 mr-2" />
                              Upravit popis
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation()
                              copyUpdateDetails(entry)
                            }} className="text-gray-200 hover:bg-[rgba(255,255,255,0.05)] focus:bg-[rgba(255,255,255,0.05)]">
                              <Copy className="h-3.5 w-3.5 mr-2" />
                              Kopírovat detaily
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation()
                              confirmDelete(entry, e)
                            }} className="text-[#e11d48] hover:bg-[rgba(255,255,255,0.05)] focus:bg-[rgba(255,255,255,0.05)]">
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Smazat
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>      
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Details Row */}
                  {isExpanded && (
                    <TableRow key={`${entry.id}-details`}>
                      <TableCell colSpan={9} className="p-0">
                        <div className="bg-[#09090b] border-[rgba(255,255,255,0.1)] p-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
                          <div className="flex flex-col md:flex-row gap-2">
                            {/* Source Path - Compact sidebar */}
                            <div className="bg-[#121212] rounded-md shadow-sm p-1 flex flex-col md:w-96 flex-shrink-0">
                              <div className="flex flex-wrap items-center gap-1 border-b border-gray-800 pb-0.5 mb-1">
                                <div className="flex items-center gap-1">
                                  <FileInput className="h-3 w-3 text-blue-400" />
                                  <span className="text-[10px] font-medium text-gray-300">Zdrojový soubor</span>
                                </div>
                                {entry.version && (
                                  <div className="ml-auto">{getVersionBadge(entry.version)}</div>
                                )}
                              </div>
                              
                              <div className="bg-[#292929] p-1 rounded text-[10px] font-mono break-all mb-1 flex-grow max-h-16 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                                {entry.sourcePath}
                              </div>
                              
                              <div className="flex justify-between items-center text-[9px] text-gray-400 mb-1">
                                <span>Aktualizace: <span className="text-blue-300">{new Date(entry.timestamp).toLocaleString('cs-CZ')}</span></span>
                              </div>
                              
                              {/* Description section - More compact */}
                              <div className="border-t border-gray-800 pt-0.5">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <FileText className="h-3 w-3 text-blue-400" />
                                  <span className="text-[10px] font-medium text-gray-300">Popis</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`ml-auto h-4 text-[9px] px-1 py-0 transition-all duration-200 ${copyingId === entry.id ? 'bg-green-900 text-green-100' : 'text-gray-500 hover:bg-[rgba(255,255,255,0.05)] hover:text-green-100'}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyUpdateDetails(entry);
                                    }}
                                  >
                                    {copyingId === entry.id ? (
                                      <><Check className="h-2 w-2 mr-0.5" /> Zkopírováno</>
                                    ) : (
                                      <><Copy className="h-2 w-2 mr-0.5" /> Kopírovat</>
                                    )}
                                  </Button>
                                </div>
                                <div className="bg-[#292929] p-1 rounded text-[10px] break-all max-h-12 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                                  {entry.description || <span className="text-gray-400 italic">Žádný popis</span>}
                                </div>
                              </div>
                            </div>

                            <div className="bg-[#121212] rounded-md shadow-sm p-1 flex-grow">
                              <div className="flex items-center gap-1 mb-1 border-b border-gray-800 pb-0.5 m-2">
                                <Server className="h-3 w-3 text-blue-400" />
                                <span className="text-[10px] font-medium text-gray-300">Cílové lokace</span>
                                <span className="text-[9px] bg-[#292929] rounded-full px-1.5 py-0.5 ml-1">
                                  {entry.targetLocations.length} {entry.targetLocations.length === 1 ? "cíl" : "cíle"}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1 overflow-y-auto max-h-60 pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                                {entry.targetLocations.map((target: { id?: string; name: string; path: string }, i: number) => {
                                  const result = entry.copyResults?.find(
                                    (r: { targetId: string }) => r.targetId === target.id
                                  );
                                  return (
                                    <div
                                      key={target.id || i}
                                      className="bg-[#0f0f0f] rounded-md p-1.5 border border-[rgba(255,255,255,0.1)] mt-2 flex-1 basis-[calc(20%-0.25rem)] min-w-[180px]"
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <div className="flex items-center gap-0.5 overflow-hidden">
                                          <HardDrive className="h-3 w-3 text-blue-400 flex-shrink-0" />
                                          <div className="text-[11px] font-medium text-gray-300 truncate">{target.name}</div>
                                        </div>
                                        {result && (
                                          <Badge
                                            className={`text-[9px] py-0 h-4 px-1.5 flex-shrink-0 ${result.success ? 'bg-green-900 text-green-100 border-green-800' : 'bg-red-900 text-red-100 border-red-800'}`}
                                          >
                                            {result.success ? (
                                              <span className="flex items-center">
                                                <Check className="h-2.5 w-2.5 mr-0.5" /> OK
                                              </span>
                                            ) : (
                                              <span className="flex items-center">
                                                <XCircle className="h-2.5 w-2.5 mr-0.5" /> Chyba
                                              </span>
                                            )}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="mt-1 text-[9px] text-gray-400 break-all max-h-10 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                                        {target.path}
                                      </div>
                                       {/* File details section */}
                                       {result && (
                                         <div className="mt-1 flex items-center justify-between gap-1 border-t border-gray-800 pt-0.5 text-[9px]">
                                           {/* File size */}
                                           <div className="flex items-center gap-0.5">
                                             <FileDigit className="h-3 w-3 text-purple-400" />
                                             <span className="text-gray-300 font-bold">
                                               {result.fileSize ? formatFileSize(result.fileSize) : 'N/A'}
                                             </span>
                                           </div>
                                           {/* Duration */}
                                            <div className="flex items-center gap-0.5">
                                              <Clock className="h-3 w-3 text-amber-400" />
                                              <span className="text-gray-300 font-medium">
                                               {result.duration ? formatDuration(result.duration) : 'N/A'}
                                              </span>
                                            </div>
                                         </div>
                                       )}
                                      {/* Error message with more details */}
                                      {result && !result.success && result.error && (
                                        <div className="mt-2">
                                          {/* Error message if any */}
                                          {result.error && (
                                            <div className="col-span-2 text-red-300 bg-red-900/30 p-1 rounded border border-red-800">
                                              {result.error}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              )}
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination section - always visible at bottom */}
      <div className="p-2 border-t border-[rgba(255,255,255,0.1)] bg-[#121212] flex flex-wrap items-center justify-between gap-2 mt-auto">
        <div className="text-xs text-gray-300">
          {history.length > 0 ? `${startIndex + 1}-${Math.min(endIndex, history.length)} z ${history.length}` : "0 záznamů"}
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Pagination controls */}
          <Pagination className="flex-1 flex justify-center">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    if (currentPage > 1) setCurrentPage(currentPage - 1)
                  }}
                  className={`${currentPage === 1 ? "pointer-events-none opacity-50" : ""} text-white bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border-[rgba(255,255,255,0.1)]`}
                />
              </PaginationItem>
              
              {/* First page */}
              {currentPage > 2 && (
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      setCurrentPage(1)
                    }}
                    className="text-white bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border-[rgba(255,255,255,0.1)]"
                  >
                    1
                  </PaginationLink>
                </PaginationItem>
              )}
              
              {/* Ellipsis if needed */}
              {currentPage > 3 && (
                <PaginationItem>
                  <span className="px-2 text-gray-400">...</span>
                </PaginationItem>
              )}
              
              {/* Previous page if not first */}
              {currentPage > 1 && (
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      setCurrentPage(currentPage - 1)
                    }}
                    className="text-white bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border-[rgba(255,255,255,0.1)]"
                  >
                    {currentPage - 1}
                  </PaginationLink>
                </PaginationItem>
              )}
              
              {/* Current page */}
              <PaginationItem>
                <PaginationLink 
                  href="#" 
                  isActive 
                  className="bg-[#e11d48] hover:bg-[#be123c] text-white border-[#e11d48]"
                >
                  {currentPage}
                </PaginationLink>
              </PaginationItem>
              
              {/* Next page if not last */}
              {currentPage < totalPages && (
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      setCurrentPage(currentPage + 1)
                    }}
                    className="text-white bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border-[rgba(255,255,255,0.1)]"
                  >
                    {currentPage + 1}
                  </PaginationLink>
                </PaginationItem>
              )}
              
              {/* Ellipsis if needed */}
              {currentPage < totalPages - 2 && (
                <PaginationItem>
                  <span className="px-2 text-gray-400">...</span>
                </PaginationItem>
              )}
              
              {/* Last page if not current or next */}
              {currentPage < totalPages - 1 && (
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      setCurrentPage(totalPages)
                    }}
                    className="text-white bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border-[rgba(255,255,255,0.1)]"
                  >
                    {totalPages}
                  </PaginationLink>
                </PaginationItem>
              )}
              
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    if (currentPage < totalPages) setCurrentPage(currentPage + 1)
                  }}
                  className={`${currentPage === totalPages ? "pointer-events-none opacity-50" : ""} text-white bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border-[rgba(255,255,255,0.1)]`}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          
          {/* Items per page selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-300 px-2">Položek na stránku:</span>
            <Select 
              value={itemsPerPage.toString()} 
              onValueChange={(value) => {
                const newValue = parseInt(value, 10)
                setItemsPerPage(newValue)
                setCurrentPage(1) // Reset to first page when changing items per page
                
                // Save the setting
                loadSettingsAsync().then(settings => {
                  const updatedSettings = { ...settings, historyItemsPerPage: newValue }
                  window.electron?.saveSettingsToFile(JSON.stringify(updatedSettings, null, 2))
                })
              }}
            >
              <SelectTrigger className="h-9 w-[120px] text-sm bg-gray-900 border-gray-700 text-gray-200">
                <SelectValue placeholder="10 na stránku" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 na stránku</SelectItem>
                <SelectItem value="10">10 na stránku</SelectItem>
                <SelectItem value="25">25 na stránku</SelectItem>
                <SelectItem value="50">50 na stránku</SelectItem>
                <SelectItem value="100">100 na stránku</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-1.5">
              <Select value={exportFormat} onValueChange={(value: "csv" | "excel") => setExportFormat(value)}>
                <SelectTrigger className="w-28 h-7 text-xs">
                  <SelectValue placeholder="Formát exportu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 px-2 text-xs gap-1.5" 
                onClick={exportHistory} 
                disabled={isExporting}
                title="Exportovat historii"
              >
                {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                Export
              </Button>
            </div>
          </div>
        </div>
      
      
      {/* Edit Description Dialog */}
      <Dialog open={editingEntry !== null} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="sm:max-w-[425px] bg-[#09090b] border-[rgba(255,255,255,0.1)] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Upravit popis</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Input
                id="description"
                className="col-span-4 bfi-input"
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="Zadejte popis aktualizace"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingEntry(null)}
              className="bg-[#121212] text-white border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)]"
            >
              Zrušit
            </Button>
            <Button
              onClick={saveEditedDescription}
              disabled={!editedDescription.trim()}
              className="bg-[#e11d48] hover:bg-[#be123c] text-white"
            >
              Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#09090b] border-[rgba(255,255,255,0.1)] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Potvrdit smazání</DialogTitle>
            <DialogDescription className="text-gray-300">
              Opravdu chcete smazat tento záznam z historie?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setEntryToDelete(null)
              }}
              className="bg-[#121212] text-white border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)]"
            >
              Zrušit
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteEntry}
              className="bg-[#e11d48] hover:bg-[#be123c] text-white"
            >
              Smazat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Batch Delete Confirmation Dialog */}
      <Dialog open={isBatchDeleteDialogOpen} onOpenChange={setIsBatchDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#09090b] border-[rgba(255,255,255,0.1)] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Potvrdit hromadné smazání</DialogTitle>
            <DialogDescription className="text-gray-300">
              Opravdu chcete smazat {selectedEntries.size} vybraných záznamů z historie?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBatchDeleteDialogOpen(false)}
              className="bg-[#121212] text-white border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)]"
            >
              Zrušit
            </Button>
            <Button
              variant="destructive"
              onClick={handleBatchDelete}
              className="bg-[#e11d48] hover:bg-[#be123c] text-white"
            >
              Smazat vybrané
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Toaster />
    </div>
    </div>
  );
}
