// Pomocné funkce pro export dat

import type { HistoryEntry } from "@/app/page"
import ExcelJS from "exceljs"

/**
 * Vytvoří CSV řetězec z dat s podporou českých znaků
 */
export function createCSV(data: any[][], delimiter = ";"): string {
  // Přidání BOM (Byte Order Mark) pro správné rozpoznání UTF-8 v Excelu
  const BOM = "\uFEFF"
  return BOM + data.map((row) => row.map(formatCSVCell).join(delimiter)).join("\r\n") // Použití CRLF pro lepší kompatibilitu s Excelem
}

/**
 * Formátuje buňku pro CSV - escapuje uvozovky a obalí hodnotu uvozovkami, pokud obsahuje speciální znaky
 */
function formatCSVCell(value: any): string {
  if (value === null || value === undefined) {
    return ""
  }

  const stringValue = String(value)

  // Pokud hodnota obsahuje uvozovky, čárky, nové řádky nebo středníky, obalíme ji uvozovkami
  if (
    stringValue.includes('"') ||
    stringValue.includes(",") ||
    stringValue.includes("\n") ||
    stringValue.includes(";") ||
    stringValue.includes("\r")
  ) {
    // Zdvojnásobíme uvozovky uvnitř hodnoty a obalíme celou hodnotu uvozovkami
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

/**
 * Vytvoří CSV soubor z výsledků aktualizace
 */
export function createUpdateResultsCSV(entry: HistoryEntry, formatDate: (timestamp: number) => string): string {
  // Hlavička CSV
  const headers = ["Datum", "Popis", "Zdrojová cesta", "Cílové umístění", "Cesta", "Stav", "Chyba"]
  const rows: any[][] = [headers]

  // Data
  entry.targetLocations.forEach((location, index) => {
    const result = entry.copyResults?.find((r) => r.targetId === location.id)

    rows.push([
      formatDate(entry.timestamp),
      entry.description,
      entry.sourcePath,
      location.name,
      location.path,
      result?.success ? "Úspěch" : "Chyba",
      result?.error || "",
    ])
  })

  return createCSV(rows)
}

/**
 * Vytvoří CSV soubor z celé historie aktualizací
 */
export function createHistoryCSV(history: HistoryEntry[], formatDate: (timestamp: number) => string): string {
  // Hlavička CSV
  const headers = ["Datum", "Popis", "Zdrojová cesta", "Cílové umístění", "Cesta", "Stav", "Chyba"]
  const rows: any[][] = [headers]

  // Seřazení historie podle data (nejnovější nahoře)
  const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp)

  // Data pro všechny záznamy historie
  sortedHistory.forEach((entry) => {
    entry.targetLocations.forEach((location, index) => {
      const result = entry.copyResults?.find((r) => r.targetId === location.id)

      rows.push([
        formatDate(entry.timestamp),
        entry.description,
        entry.sourcePath,
        location.name,
        location.path,
        result?.success ? "Úspěch" : "Chyba",
        result?.error || "",
      ])
    })
  })

  return createCSV(rows)
}

/**
 * Formátuje datum pro export do CSV
 * Vrací datum ve formátu DD.MM.YYYY HH:MM
 */
export function formatDateForExport(timestamp: number): string {
  const date = new Date(timestamp)
  const day = date.getDate().toString().padStart(2, "0")
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")

  return `${day}.${month}.${year} ${hours}:${minutes}`
}

/**
 * Stáhne řetězec jako soubor
 */
export function downloadString(content: string, filename: string, mimeType = "text/csv;charset=utf-8"): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Vytvoří Excel soubor z výsledků aktualizace
 */
export async function createUpdateResultsExcel(entry: HistoryEntry): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Výsledky aktualizace")

  // Definice sloupců
  worksheet.columns = [
    { header: "Datum", key: "datum", width: 18 },
    { header: "Popis", key: "popis", width: 40 },
    { header: "Zdrojová cesta", key: "zdrojovaCesta", width: 30 },
    { header: "Cílové umístění", key: "ciloveUmisteni", width: 20 },
    { header: "Cesta", key: "cesta", width: 50 },
    { header: "Stav", key: "stav", width: 10 },
    { header: "Chyba", key: "chyba", width: 30 },
  ]

  // Formátování hlavičky
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, size: 12 }
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" }, // Světle šedá barva
  }
  headerRow.alignment = { vertical: "middle", horizontal: "center" }

  // Přidání dat
  entry.targetLocations.forEach((location) => {
    const result = entry.copyResults?.find((r) => r.targetId === location.id)

    worksheet.addRow({
      datum: formatDateForExport(entry.timestamp),
      popis: entry.description,
      zdrojovaCesta: entry.sourcePath,
      ciloveUmisteni: location.name,
      cesta: location.path,
      stav: result?.success ? "Úspěch" : "Chyba",
      chyba: result?.error || "",
    })
  })

  // Formátování buněk se stavem
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      // Přeskočit hlavičku
      const statusCell = row.getCell("stav")
      if (statusCell.value === "Úspěch") {
        statusCell.font = { color: { argb: "FF008000" } } // Zelená barva
      } else if (statusCell.value === "Chyba") {
        statusCell.font = { color: { argb: "FFFF0000" } } // Červená barva
      }
    }
  })

  // Ohraničení všech buněk
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      }
    })
  })

  return await workbook.xlsx.writeBuffer()
}

/**
 * Vytvoří Excel soubor z celé historie aktualizací
 */
export async function createHistoryExcel(history: HistoryEntry[]): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Historie aktualizací")

  // Definice sloupců
  worksheet.columns = [
    { header: "Datum", key: "datum", width: 18 },
    { header: "Popis", key: "popis", width: 40 },
    { header: "Zdrojová cesta", key: "zdrojovaCesta", width: 30 },
    { header: "Cílové umístění", key: "ciloveUmisteni", width: 20 },
    { header: "Cesta", key: "cesta", width: 50 },
    { header: "Stav", key: "stav", width: 10 },
    { header: "Chyba", key: "chyba", width: 30 },
  ]

  // Formátování hlavičky
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, size: 12 }
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE03C31" }, // BFI červená
  }
  headerRow.font.color = { argb: "FFFFFFFF" } // Bílý text
  headerRow.alignment = { vertical: "middle", horizontal: "center" }
  headerRow.height = 25 // Výška řádku

  // Seřazení historie podle data (nejnovější nahoře)
  const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp)

  // Přidání dat
  sortedHistory.forEach((entry) => {
    entry.targetLocations.forEach((location) => {
      const result = entry.copyResults?.find((r) => r.targetId === location.id)

      worksheet.addRow({
        datum: formatDateForExport(entry.timestamp),
        popis: entry.description,
        zdrojovaCesta: entry.sourcePath,
        ciloveUmisteni: location.name,
        cesta: location.path,
        stav: result?.success ? "Úspěch" : "Chyba",
        chyba: result?.error || "",
      })
    })
  })

  // Formátování buněk se stavem
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      // Přeskočit hlavičku
      const statusCell = row.getCell("stav")
      if (statusCell.value === "Úspěch") {
        statusCell.font = { color: { argb: "FF008000" } } // Zelená barva
        statusCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE8F5E9" }, // Světle zelené pozadí
        }
      } else if (statusCell.value === "Chyba") {
        statusCell.font = { color: { argb: "FFFF0000" } } // Červená barva
        statusCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFDEAEA" }, // Světle červené pozadí
        }
      }
    }
  })

  // Ohraničení všech buněk
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      }

      // Zarovnání textu
      cell.alignment = { vertical: "middle", wrapText: true }
    })
  })

  // Přidání alternativního zbarvení řádků (zebra efekt)
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1 && rowNumber % 2 === 0) {
      // Sudé řádky (přeskočit hlavičku)
      row.eachCell((cell) => {
        if (cell.fullAddress.col !== 6) {
          // Přeskočit sloupec se stavem, který má vlastní barvy
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF9F9F9" }, // Velmi světle šedá
          }
        }
      })
    }
  })

  // Zmrazit první řádek (hlavičku)
  worksheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1, activeCell: "A2" }]

  return await workbook.xlsx.writeBuffer()
}

/**
 * Stáhne Excel soubor
 */
export function downloadExcel(buffer: ExcelJS.Buffer, filename: string): void {
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
