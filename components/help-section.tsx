'use client';

import React, { useState } from 'react';
import { Button } from '@/components/custom-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle, FileText, Key, Database, History, AlertCircle } from 'lucide-react';

export function HelpSection() {
  return (
    <Card className="border-border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between bg-gradient-to-r from-[#1e293b] to-[#0f172a] text-white p-4 rounded-t-lg">
        <div>
          <h3 className="text-base font-semibold m-0 flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Nápověda
          </h3>
          <p className="text-xs opacity-90 mt-0.5">Informace o aplikaci a návod k použití</p>
        </div>
      </div>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="login">
            <AccordionTrigger className="text-sm font-medium">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                Přihlašovací údaje
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 text-sm">
                <p><strong>Výchozí heslo:</strong> admin</p>
                <p><strong>Změna hesla:</strong> V záložce Nastavení najdete sekci pro změnu hesla.</p>
                <p><strong>Zapomenuté heslo:</strong> Pokud zapomenete heslo, můžete jej resetovat odstraněním souboru password.json z datového adresáře aplikace:</p>
                <pre className="bg-muted p-2 rounded text-xs">%APPDATA%\db-sync-utility\data\password.json</pre>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="features">
            <AccordionTrigger className="text-sm font-medium">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                Hlavní funkce
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 text-sm">
                <p><strong>Synchronizace databázových souborů:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Výběr zdrojového adresáře s databázovými soubory</li>
                  <li>Správa cílových umístění pro synchronizaci</li>
                  <li>Kontrola zamčení souborů před kopírováním</li>
                  <li>Automatické vytváření záloh před přepsáním souborů</li>
                </ul>
                
                <p><strong>Historie operací:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Automatické verzování kopírovaných souborů (v1, v2, atd.)</li>
                  <li>Detailní historie všech operací kopírování</li>
                  <li>Možnost exportu historie do CSV souboru</li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="troubleshooting">
            <AccordionTrigger className="text-sm font-medium">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                Řešení problémů
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 text-sm">
                <p><strong>Problémy s kopírováním souborů:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Ujistěte se, že máte dostatečná oprávnění pro čtení zdrojových souborů a zápis do cílových adresářů</li>
                  <li>Zkontrolujte, zda nejsou soubory zamčeny jiným procesem</li>
                  <li>Zkontrolujte, zda existují všechny potřebné databázové soubory (configurations.mv.db a configurations.trace.db)</li>
                </ul>
                
                <p className="mt-3"><strong>Kontakt:</strong></p>
                <p>Pro technickou podporu kontaktujte TO oddělení.</p>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="about">
            <AccordionTrigger className="text-sm font-medium">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                O aplikaci
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 text-sm">
                <p><strong>DB Sync Utility</strong></p>
                <p>Aplikace pro synchronizaci databázových souborů mezi různými umístěními.</p>
                <p><strong>Verze:</strong> 1.0.0</p>
                <p><strong>Systémové požadavky:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Windows 10/11</li>
                  <li>4 GB RAM</li>
                  <li>100 MB volného místa na disku</li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
