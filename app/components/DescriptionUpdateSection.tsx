"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

interface DescriptionUpdateSectionProps {
  description: string
  isUpdating: boolean
  onDescriptionChange: (description: string) => void
}

export function DescriptionUpdateSection({
  description,
  isUpdating,
  onDescriptionChange,
}: DescriptionUpdateSectionProps) {
  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-[#1e293b] to-[#0f172a] text-white rounded-t-lg p-4 pb-3">
        <CardTitle className="text-base font-medium mb-1">Popis aktualizace</CardTitle>
        <CardDescription className="text-gray-200 text-xs">
          <div className="mt-1">
            Zadejte stručný popis této aktualizace (volitelné)
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <Textarea
          placeholder="Např. Týdenní aktualizace konfigurace s novými parametry produktu"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={3}
          disabled={isUpdating}
        />
      </CardContent>
    </Card>
  )
}
