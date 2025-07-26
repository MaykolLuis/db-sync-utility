'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/custom-button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  FolderOpen, 
  Target, 
  Copy, 
  History, 
  Settings, 
  Search, 
  Keyboard,
  ChevronRight,
  ChevronLeft,
  Database,
  Shield,
  Zap,
  Users,
  FileText,
  Monitor,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  Upload,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Save,
  X,
  HelpCircle
} from 'lucide-react';
import { 
  getTargetsSection, 
  getCopySection, 
  getHistorySection, 
  getKeyboardShortcutsSection,
  getAutoRecoverySection,
  getAutoUpdateSection,
  getCrashReportingSection,
  getOfflineSupportSection,
  getGlobalSearchSection
} from './documentation-sections';

interface DocumentationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DocumentationSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  content: React.ReactNode;
}

const DocumentationModal: React.FC<DocumentationModalProps> = ({ isOpen, onOpenChange }) => {
  const [activeSection, setActiveSection] = useState('overview');

  const sections: DocumentationSection[] = [
    {
      id: 'overview',
      title: 'Přehled aplikace',
      icon: <BookOpen className="h-5 w-5" />,
      description: 'Úvod do DB Sync Utility',
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gradient-to-r from-red-500/80 to-red-600/80">
                <Database className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">DB Sync Utility</h3>
                <p className="text-gray-400">Profesionální nástroj pro synchronizaci databází</p>
              </div>
            </div>
            <p className="text-gray-300 leading-relaxed">
              DB Sync Utility je pokročilá desktopová aplikace navržená pro efektivní kopírování a synchronizaci databázových souborů 
              mezi různými lokacemi. Aplikace poskytuje intuitivní rozhraní s pokročilými funkcemi pro správu dat.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-green-400" />
                <h4 className="font-semibold text-white">Bezpečnost</h4>
              </div>
              <p className="text-gray-400 text-sm">Automatické zálohování před přepsáním souborů</p>
            </div>
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-yellow-400" />
                <h4 className="font-semibold text-white">Rychlost</h4>
              </div>
              <p className="text-gray-400 text-sm">Optimalizované kopírování s progress indikátorem</p>
            </div>
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-blue-400" />
                <h4 className="font-semibold text-white">Uživatelské rozhraní</h4>
              </div>
              <p className="text-gray-400 text-sm">Moderní a intuitivní design s českým jazykem</p>
            </div>
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Monitor className="h-5 w-5 text-purple-400" />
                <h4 className="font-semibold text-white">Cross-platform</h4>
              </div>
              <p className="text-gray-400 text-sm">Funguje na Windows, macOS i Linux</p>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <h4 className="font-semibold text-blue-300 mb-2">💡 Tip pro začátečníky</h4>
            <p className="text-gray-300 text-sm">
              Začněte výběrem zdrojové složky, poté přidejte cílové lokace a spusťte kopírování. 
              Všechny operace jsou zaznamenány v historii pro pozdější referenci.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'source',
      title: 'Zdrojová složka',
      icon: <FolderOpen className="h-5 w-5" />,
      description: 'Výběr a správa zdrojové složky',
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-600/10 border border-amber-500/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gradient-to-r from-amber-500/80 to-orange-600/80">
                <FolderOpen className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Zdrojová složka</h3>
            </div>
            <p className="text-gray-300">
              Zde vybíráte složku obsahující databázové soubory, které chcete kopírovat do cílových lokací.
            </p>
          </div>

          <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
            <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Vizuální příklad
            </h4>
            <div className="bg-gray-900/50 border border-gray-700/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/30">
                <FolderOpen className="h-5 w-5 text-amber-400" />
                <div className="flex-1">
                  <div className="text-gray-300 font-mono text-sm">C:\Database\Source</div>
                  <div className="text-gray-500 text-xs">Vybraná zdrojová složka</div>
                </div>
                <Badge variant="outline" className="text-green-400 border-green-400/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Aktivní
                </Badge>
              </div>
              <div className="ml-8 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Database className="h-4 w-4 text-blue-400" />
                  <span>configurations.mv.db</span>
                  <Badge variant="outline" className="text-xs">1.2 MB</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Database className="h-4 w-4 text-blue-400" />
                  <span>configurations.trace.db</span>
                  <Badge variant="outline" className="text-xs">45 KB</Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Search className="h-4 w-4 text-blue-400" />
                Procházení složek
              </h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-3 w-3" />
                  Klikněte na "Procházet" pro výběr složky
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-3 w-3" />
                  Nebo zadejte cestu manuálně
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-3 w-3" />
                  Automatická validace souborů
                </li>
              </ul>
            </div>
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-400" />
                Kontrola souborů
              </h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-400" />
                  Ověření existence databázových souborů
                </li>
                <li className="flex items-center gap-2">
                  <AlertCircle className="h-3 w-3 text-yellow-400" />
                  Kontrola zamčených souborů
                </li>
                <li className="flex items-center gap-2">
                  <Eye className="h-3 w-3 text-blue-400" />
                  Zobrazení detailů souborů
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <h4 className="font-semibold text-green-300 mb-2">✅ Nejlepší praktiky</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Vždy zkontrolujte, že složka obsahuje požadované databázové soubory</li>
              <li>• Ujistěte se, že soubory nejsou používány jinou aplikací</li>
              <li>• Použijte absolutní cesty pro lepší spolehlivost</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'targets',
      title: 'Cílové lokace',
      icon: <Target className="h-5 w-5" />,
      description: 'Správa cílových lokací pro kopírování',
      content: getTargetsSection()
    },
    {
      id: 'copy',
      title: 'Kopírování',
      icon: <Copy className="h-5 w-5" />,
      description: 'Proces kopírování databázových souborů',
      content: getCopySection()
    },
    {
      id: 'history',
      title: 'Historie',
      icon: <History className="h-5 w-5" />,
      description: 'Správa historie operací',
      content: getHistorySection()
    },
    {
      id: 'settings',
      title: 'Nastavení',
      icon: <Settings className="h-5 w-5" />,
      description: 'Konfigurace aplikace',
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-gray-500/10 to-slate-600/10 border border-gray-500/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gradient-to-r from-gray-500/80 to-slate-600/80">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Nastavení aplikace</h3>
            </div>
            <p className="text-gray-300">
              Přizpůsobte si chování aplikace podle svých potřeb pomocí různých konfiguračních možností.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-400" />
                Bezpečnostní nastavení
              </h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3" />
                  Automatické zálohování před přepsáním
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3" />
                  Potvrzení před kopírováním
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3" />
                  Vytváření složek při potřebě
                </li>
              </ul>
            </div>
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Monitor className="h-4 w-4 text-blue-400" />
                Rozhraní
              </h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <Eye className="h-3 w-3" />
                  Výchozí záložka při spuštění
                </li>
                <li className="flex items-center gap-2">
                  <Save className="h-3 w-3" />
                  Zapamatování zdrojové cesty
                </li>
                <li className="flex items-center gap-2">
                  <RefreshCw className="h-3 w-3" />
                  Automatické obnovování
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-500/10 border border-gray-500/20 rounded-xl p-4">
            <h4 className="font-semibold text-gray-300 mb-2">⚙️ Tip pro optimalizaci</h4>
            <p className="text-gray-300 text-sm">
              Projděte si všechna nastavení a přizpůsobte si aplikaci podle svého pracovního postupu. 
              Správné nastavení může výrazně zrychlit vaši práci.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'shortcuts',
      title: 'Klávesové zkratky',
      icon: <Keyboard className="h-5 w-5" />,
      description: 'Přehled všech klávesových zkratek',
      content: getKeyboardShortcutsSection()
    },
    {
      id: 'auto-recovery',
      title: 'Automatické obnovení',
      icon: <RefreshCw className="h-5 w-5" />,
      description: 'Systém automatického ukládání a obnovení dat',
      content: getAutoRecoverySection()
    },
    {
      id: 'auto-update',
      title: 'Automatické aktualizace',
      icon: <Download className="h-5 w-5" />,
      description: 'Systém automatických aktualizací z GitHub',
      content: getAutoUpdateSection()
    },
    {
      id: 'crash-reporting',
      title: 'Hlášení chyb',
      icon: <AlertCircle className="h-5 w-5" />,
      description: 'Systém pro zachycování a správu chybových hlášení',
      content: getCrashReportingSection()
    },
    {
      id: 'offline-support',
      title: 'Offline podpora',
      icon: <Monitor className="h-5 w-5" />,
      description: 'Pokročilá podpora pro práci offline a síťové disconnection',
      content: getOfflineSupportSection()
    },
    {
      id: 'global-search',
      title: 'Globální vyhledávání',
      icon: <Search className="h-5 w-5" />,
      description: 'Pokročilé vyhledávání napříč celou aplikací',
      content: getGlobalSearchSection()
    }
  ];

  const currentSection = sections.find(s => s.id === activeSection) || sections[0];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[80vh] bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 shadow-2xl z-[9999] p-0 overflow-hidden">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-80 bg-gray-800/50 border-r border-gray-700/50 p-6">
            <DialogHeader className="mb-6">
              <DialogTitle className="flex items-center gap-2 text-white">
                <div className="p-2 rounded-lg bg-gradient-to-r from-red-500/80 to-red-600/80 backdrop-blur-sm border border-red-400/30">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                Dokumentace
              </DialogTitle>
            </DialogHeader>
            
            <ScrollArea className="h-[calc(100%-100px)] overflow-y-auto">
              <div className="space-y-2 pr-2 ">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left p-1.5 rounded-lg transition-all duration-200 ${
                      activeSection === section.id
                        ? 'bg-red-500/20 border border-red-500/30 text-white'
                        : 'hover:bg-gray-700/50 text-gray-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {section.icon}
                      <div>
                        <div className="font-medium">{section.title}</div>
                        <div className="text-xs text-gray-400">{section.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col">
            <div className="p-6 border-b border-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {currentSection.icon}
                  <h2 className="text-xl font-bold text-white">{currentSection.title}</h2>
                </div>
               
              </div>
            </div>
            
            <ScrollArea className="flex-1 p-6 max-h-[calc(80vh-120px)] overflow-y-auto">
              <div className="pr-4">
                {currentSection.content}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentationModal;
