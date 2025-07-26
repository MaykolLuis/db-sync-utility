"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tag } from "lucide-react"

interface VersionInputSectionProps {
  version: string
  onChange: (version: string) => void
  disabled?: boolean
}

export function VersionInputSection({ version, onChange, disabled = false }: VersionInputSectionProps) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Tag className="h-5 w-5 text-bfi-blue" />
          Verze databáze
        </CardTitle>
        <CardDescription>
          Zadejte verzi databáze pro tuto aktualizaci
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="grid gap-2">
            <Label htmlFor="version">Verze</Label>
            <Input
              id="version"
              placeholder="např. v1.0"
              value={version}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              className="max-w-[200px]"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
