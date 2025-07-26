"use client"

import { Keyboard } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface KeyboardShortcutsHelpProps {
  isDeveloperMode?: boolean;
}

export function KeyboardShortcutsHelp({ isDeveloperMode = false }: KeyboardShortcutsHelpProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button
        variant="outline"
        size="sm"
        className="gap-1 bg-white text-bfi-dark-gray hover:bg-gray-100 hover:text-bfi-dark-gray"
        onClick={() => setIsOpen(true)}
      >
        <Keyboard className="h-4 w-4" />
        <span className="hidden sm:inline">Klávesové zkratky</span>
      </Button>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Klávesové zkratky</DialogTitle>
          <DialogDescription>Používejte tyto klávesové zkratky pro rychlejší práci s aplikací</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Zkratka</TableHead>
                <TableHead>Funkce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono">Ctrl+F / ⌘+F</TableCell>
                <TableCell>Globální vyhledávání</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono">Ctrl+1</TableCell>
                <TableCell>Přepnout na kartu Zdrojová složka</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono">Ctrl+2</TableCell>
                <TableCell>Přepnout na kartu Cílové lokace</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono">Ctrl+3</TableCell>
                <TableCell>Přepnout na kartu Kopírování</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono">Ctrl+4</TableCell>
                <TableCell>Přepnout na kartu Historie</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono">Ctrl+5</TableCell>
                <TableCell>Přepnout na kartu Nastavení</TableCell>
              </TableRow>
              {isDeveloperMode && (
                <>
                  <TableRow>
                    <TableCell className="font-mono">Ctrl+6</TableCell>
                    <TableCell>Přepnout na kartu Aktualizace aplikace</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono">Ctrl+7</TableCell>
                    <TableCell>Přepnout na kartu Hlášení chyb</TableCell>
                  </TableRow>
                </>
              )}
              <TableRow>
                <TableCell className="font-mono">Ctrl+0</TableCell>
                <TableCell>Procházet zdrojovou složku</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono">Ctrl+N</TableCell>
                <TableCell>Přidat novou cílovou lokaci</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono">Ctrl+H</TableCell>
                <TableCell>Zobrazit klávesové zkratky</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
