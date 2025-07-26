import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/custom-button';
import { 
  Target, 
  Copy, 
  History, 
  Settings, 
  Search, 
  Keyboard,
  Database,
  Shield,
  Zap,
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
  RotateCcw,
  CloudOff,
  Wifi,
  WifiOff,
  Bug,
  Activity,
  Globe,
  HardDrive,
  Network,
  Layers
} from 'lucide-react';

export const getTargetsSection = () => (
  <div className="space-y-6">
    <div className="bg-gradient-to-r from-blue-500/10 to-indigo-600/10 border border-blue-500/20 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/80 to-indigo-600/80">
          <Target className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-xl font-bold text-white">Cílové lokace</h3>
      </div>
      <p className="text-gray-300">
        Spravujte seznam míst, kam chcete kopírovat databázové soubory. Můžete přidat více lokací a vybrat, které použít.
      </p>
    </div>

    <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
      <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
        <Eye className="h-4 w-4" />
        Příklad cílových lokací
      </h4>
      <div className="space-y-3">
        <div className="bg-gray-900/50 border border-gray-700/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <input type="checkbox" checked className="rounded border-gray-600" readOnly />
              <div>
                <div className="text-white font-medium">Produkční server</div>
                <div className="text-gray-400 text-sm font-mono">\\server\database\prod</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-400 border-green-400/30">
                <CheckCircle className="h-3 w-3 mr-1" />
                Dostupný
              </Badge>
              <Badge variant="outline" className="text-blue-400 border-blue-400/30">2.1 GB</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-xs">
              <Edit className="h-3 w-3 mr-1" />
              Upravit
            </Button>
            <Button size="sm" variant="outline" className="text-xs">
              <Eye className="h-3 w-3 mr-1" />
              Otevřít
            </Button>
          </div>
        </div>
        
        <div className="bg-gray-900/50 border border-gray-700/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <input type="checkbox" className="rounded border-gray-600" readOnly />
              <div>
                <div className="text-white font-medium">Testovací prostředí</div>
                <div className="text-gray-400 text-sm font-mono">C:\Test\Database</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-yellow-400 border-yellow-400/30">
                <AlertCircle className="h-3 w-3 mr-1" />
                Nedostupný
              </Badge>
              <Badge variant="outline" className="text-blue-400 border-blue-400/30">1.8 GB</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-xs">
              <RefreshCw className="h-3 w-3 mr-1" />
              Obnovit
            </Button>
            <Button size="sm" variant="outline" className="text-xs text-red-400">
              <Trash2 className="h-3 w-3 mr-1" />
              Odstranit
            </Button>
          </div>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Upload className="h-4 w-4 text-green-400" />
          Přidávání lokací
        </h4>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-center gap-2">
            <ArrowRight className="h-3 w-3" />
            Zadejte název a cestu
          </li>
          <li className="flex items-center gap-2">
            <ArrowRight className="h-3 w-3" />
            Procházejte složky tlačítkem
          </li>
          <li className="flex items-center gap-2">
            <ArrowRight className="h-3 w-3" />
            Automatická kontrola dostupnosti
          </li>
        </ul>
      </div>
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Settings className="h-4 w-4 text-blue-400" />
          Správa lokací
        </h4>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-center gap-2">
            <Edit className="h-3 w-3" />
            Úprava názvů a cest
          </li>
          <li className="flex items-center gap-2">
            <Eye className="h-3 w-3" />
            Zobrazení velikosti složek
          </li>
          <li className="flex items-center gap-2">
            <Trash2 className="h-3 w-3" />
            Odstranění nepotřebných lokací
          </li>
        </ul>
      </div>
    </div>

    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
      <h4 className="font-semibold text-blue-300 mb-2">💡 Tipy pro efektivní správu</h4>
      <ul className="text-gray-300 text-sm space-y-1">
        <li>• Používejte popisné názvy pro snadnou identifikaci</li>
        <li>• Pravidelně kontrolujte dostupnost síťových lokací</li>
        <li>• Vyberte pouze lokace, které skutečně potřebujete kopírovat</li>
      </ul>
    </div>
  </div>
);

export const getCopySection = () => (
  <div className="space-y-6">
    <div className="bg-gradient-to-r from-green-500/10 to-emerald-600/10 border border-green-500/20 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-r from-green-500/80 to-emerald-600/80">
          <Copy className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-xl font-bold text-white">Kopírování souborů</h3>
      </div>
      <p className="text-gray-300">
        Hlavní funkce aplikace - bezpečné kopírování databázových souborů do vybraných cílových lokací s pokročilým sledováním průběhu.
      </p>
    </div>

    <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
      <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
        <Zap className="h-4 w-4" />
        Průběh kopírování
      </h4>
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
          <div className="flex-1">
            <div className="text-white font-medium">Příprava kopírování</div>
            <div className="text-gray-400 text-sm">Kontrola zdrojových souborů a cílových lokací</div>
          </div>
          <CheckCircle className="h-5 w-5 text-green-400" />
        </div>
        
        <div className="flex items-center gap-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
          <div className="flex-1">
            <div className="text-white font-medium">Vytváření záloh</div>
            <div className="text-gray-400 text-sm">Zálohování existujících souborů (pokud je povoleno)</div>
          </div>
          <Clock className="h-5 w-5 text-blue-400" />
        </div>
        
        <div className="flex items-center gap-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
          <div className="flex-1">
            <div className="text-white font-medium">Kopírování souborů</div>
            <div className="text-gray-400 text-sm">Postupné kopírování do všech vybraných lokací</div>
            <div className="mt-2 bg-gray-700 rounded-full h-2">
              <div className="bg-purple-500 h-2 rounded-full" style={{width: '75%'}}></div>
            </div>
            <div className="text-xs text-gray-400 mt-1">75% dokončeno (3 ze 4 lokací)</div>
          </div>
          <RefreshCw className="h-5 w-5 text-purple-400" />
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-green-400" />
          Bezpečnostní funkce
        </h4>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-400" />
            Automatické zálohování
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-400" />
            Kontrola před přepsáním
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-400" />
            Vytváření složek při potřebě
          </li>
        </ul>
      </div>
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Monitor className="h-4 w-4 text-blue-400" />
          Sledování průběhu
        </h4>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-center gap-2">
            <Eye className="h-3 w-3 text-blue-400" />
            Progress bar s procentuálním zobrazením
          </li>
          <li className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-blue-400" />
            Měření času kopírování
          </li>
          <li className="flex items-center gap-2">
            <FileText className="h-3 w-3 text-blue-400" />
            Detailní protokolování
          </li>
        </ul>
      </div>
    </div>

    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
      <h4 className="font-semibold text-yellow-300 mb-2">⚠️ Důležité upozornění</h4>
      <p className="text-gray-300 text-sm">
        Před spuštěním kopírování se ujistěte, že cílové databáze nejsou používány jinými aplikacemi. 
        Kopírování do používaných databází může způsobit poškození dat.
      </p>
    </div>
  </div>
);

export const getHistorySection = () => (
  <div className="space-y-6">
    <div className="bg-gradient-to-r from-purple-500/10 to-violet-600/10 border border-purple-500/20 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/80 to-violet-600/80">
          <History className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-xl font-bold text-white">Historie operací</h3>
      </div>
      <p className="text-gray-300">
        Kompletní přehled všech provedených kopírování s možností vyhledávání, filtrování a exportu dat.
      </p>
    </div>

    <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
      <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Příklad historie
      </h4>
      <div className="bg-gray-900/50 border border-gray-700/30 rounded-lg overflow-hidden">
        <div className="bg-gray-800/50 p-3 border-b border-gray-700/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <input type="checkbox" className="rounded border-gray-600" readOnly />
              <span className="text-sm text-gray-400">Vybrat vše</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs">
                <Download className="h-3 w-3 mr-1" />
                Export CSV
              </Button>
              <Button size="sm" variant="outline" className="text-xs text-red-400">
                <Trash2 className="h-3 w-3 mr-1" />
                Smazat vybrané
              </Button>
            </div>
          </div>
        </div>
        <div className="divide-y divide-gray-700/30">
          <div className="p-3 hover:bg-gray-800/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input type="checkbox" className="rounded border-gray-600" readOnly />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">Kopírování 23.07.2025 14:30</span>
                    <Badge variant="outline" className="text-green-400 border-green-400/30">v5</Badge>
                  </div>
                  <div className="text-gray-400 text-sm">C:\Database\Source → 4 lokace</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-green-400 border-green-400/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Úspěšné
                </Badge>
                <span className="text-gray-400 text-sm">2.3s</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Search className="h-4 w-4 text-blue-400" />
          Vyhledávání a filtrování
        </h4>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-center gap-2">
            <ArrowRight className="h-3 w-3" />
            Vyhledávání podle popisu
          </li>
          <li className="flex items-center gap-2">
            <ArrowRight className="h-3 w-3" />
            Filtrování podle stavu
          </li>
          <li className="flex items-center gap-2">
            <ArrowRight className="h-3 w-3" />
            Řazení podle data
          </li>
        </ul>
      </div>
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Download className="h-4 w-4 text-green-400" />
          Export a správa
        </h4>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-center gap-2">
            <Download className="h-3 w-3" />
            Export do CSV formátu
          </li>
          <li className="flex items-center gap-2">
            <Edit className="h-3 w-3" />
            Úprava popisů operací
          </li>
          <li className="flex items-center gap-2">
            <Trash2 className="h-3 w-3" />
            Hromadné mazání záznamů
          </li>
        </ul>
      </div>
    </div>

    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
      <h4 className="font-semibold text-purple-300 mb-2">📊 Užitečné informace</h4>
      <ul className="text-gray-300 text-sm space-y-1">
        <li>• Historie je automaticky ukládána při každém kopírování</li>
        <li>• Můžete sledovat úspěšnost operací a časy kopírování</li>
        <li>• Export CSV umožňuje další analýzu dat v Excelu</li>
      </ul>
    </div>
  </div>
);

export const getKeyboardShortcutsSection = () => (
  <div className="space-y-6">
    <div className="bg-gradient-to-r from-indigo-500/10 to-purple-600/10 border border-indigo-500/20 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-500/80 to-purple-600/80">
          <Keyboard className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-xl font-bold text-white">Klávesové zkratky</h3>
      </div>
      <p className="text-gray-300">
        Zrychlete svou práci pomocí klávesových zkratek pro nejčastější operace.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
        <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-blue-400" />
          Navigace
        </h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Zdrojová složka</span>
            <Badge variant="outline" className="font-mono">Ctrl+1</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Cílové lokace</span>
            <Badge variant="outline" className="font-mono">Ctrl+2</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Kopírování</span>
            <Badge variant="outline" className="font-mono">Ctrl+3</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Historie</span>
            <Badge variant="outline" className="font-mono">Ctrl+4</Badge>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
        <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4 text-green-400" />
          Operace
        </h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Globální vyhledávání</span>
            <Badge variant="outline" className="font-mono">Ctrl+F</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Spustit kopírování</span>
            <Badge variant="outline" className="font-mono">Ctrl+Enter</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Historie sidebar</span>
            <Badge variant="outline" className="font-mono">Ctrl+H</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Klávesové zkratky</span>
            <Badge variant="outline" className="font-mono">Ctrl+K</Badge>
          </div>
        </div>
      </div>
    </div>

    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
      <h4 className="font-semibold text-indigo-300 mb-2">⌨️ Tip pro efektivitu</h4>
      <p className="text-gray-300 text-sm">
        Klávesové zkratky fungují globálně v celé aplikaci. Stiskněte Ctrl+H pro rychlý přístup k seznamu všech zkratek.
      </p>
    </div>
  </div>
);

export const getAutoRecoverySection = () => (
  <div className="space-y-6">
    <div className="bg-gradient-to-r from-green-500/10 to-emerald-600/10 border border-green-500/20 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-r from-green-500/80 to-emerald-600/80">
          <RotateCcw className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-xl font-bold text-white">Automatické obnovení</h3>
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Pokročilé</Badge>
      </div>
      <p className="text-gray-300">
        Systém automatického obnovení chrání vaše data pomocí inteligentního ukládání a možností obnovení po neočekávaném ukončení aplikace.
      </p>
    </div>

    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
        <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Save className="h-4 w-4 text-green-400" />
          Automatické ukládání
        </h4>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Cílové lokace:</span>
            <span className="text-white">15 sekund</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Zdrojová složka:</span>
            <span className="text-white">20 sekund</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Kopírovací operace:</span>
            <span className="text-white">5 sekund</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Nastavení:</span>
            <span className="text-white">20 sekund</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
        <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-400" />
          Obnovení po pádu
        </h4>
        <div className="space-y-2 text-sm text-gray-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-400" />
            <span>Automatická detekce dat k obnovení</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-400" />
            <span>Selektivní obnovení dat</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-400" />
            <span>Validace stáří dat</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-400" />
            <span>Uživatelsky přívětivý dialog</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const getAutoUpdateSection = () => (
  <div className="space-y-6">
    <div className="bg-gradient-to-r from-purple-500/10 to-violet-600/10 border border-purple-500/20 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/80 to-violet-600/80">
          <Download className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-xl font-bold text-white">Automatické aktualizace</h3>
        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">GitHub</Badge>
      </div>
      <p className="text-gray-300">
        Systém automatických aktualizací zajišťuje, že máte vždy nejnovější verzi aplikace s nejnovějšími funkcemi a opravami bezpečnosti.
      </p>
    </div>

    <div className="grid md:grid-cols-3 gap-6">
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
        <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-purple-400" />
          Kontrola aktualizací
        </h4>
        <div className="space-y-2 text-sm text-gray-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-400" />
            <span>Při spuštění aplikace</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-400" />
            <span>Každé 4 hodiny</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-400" />
            <span>Manuální kontrola</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
        <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Download className="h-4 w-4 text-blue-400" />
          Stahování
        </h4>
        <div className="space-y-2 text-sm text-gray-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-400" />
            <span>Na pozadí</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-400" />
            <span>Indikátor průběhu</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-400" />
            <span>Automatické nebo manuální</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
        <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Upload className="h-4 w-4 text-green-400" />
          Instalace
        </h4>
        <div className="space-y-2 text-sm text-gray-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-400" />
            <span>Restart aplikace</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-400" />
            <span>Poznámky k vydání</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-400" />
            <span>Uživatelské potvrzení</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const getCrashReportingSection = () => (
  <div className="space-y-6">
    <div className="bg-gradient-to-r from-red-500/10 to-rose-600/10 border border-red-500/20 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-r from-red-500/80 to-rose-600/80">
          <Bug className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-xl font-bold text-white">Hlášení chyb</h3>
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Diagnostika</Badge>
      </div>
      <p className="text-gray-300">
        Komplexní systém pro zachycování, ukládání a správu hlášení o pádech aplikace pro rychlou identifikaci a opravu problémů.
      </p>
    </div>

    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
        <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-red-400" />
          Zachycování chyb
        </h4>
        <div className="space-y-2 text-sm text-gray-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-400" />
            <span>Electron hlavní proces</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-400" />
            <span>React Error Boundaries</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-400" />
            <span>Globální error handlery</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-400" />
            <span>Promise rejection handling</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
        <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-400" />
          Správa reportů
        </h4>
        <div className="space-y-2 text-sm text-gray-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-400" />
            <span>Lokální JSON úložiště</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-400" />
            <span>Automatické zálohování</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-400" />
            <span>Breadcrumb timeline</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-400" />
            <span>Export a mazání</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const getOfflineSupportSection = () => (
  <div className="space-y-6">
    <div className="bg-gradient-to-r from-orange-500/10 to-amber-600/10 border border-orange-500/20 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-r from-orange-500/80 to-amber-600/80">
          <CloudOff className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-xl font-bold text-white">Offline podpora</h3>
        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Síť</Badge>
      </div>
      <p className="text-gray-300">
        Pokročilá podpora pro práci offline s inteligentním zpracováním odpojení od sítě a automatickými mechanismy opakování.
      </p>
    </div>

    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
        <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Network className="h-4 w-4 text-orange-400" />
          Detekce stavu sítě
        </h4>
        <div className="space-y-2 text-sm text-gray-300">
          <div className="flex items-center gap-2">
            <Wifi className="h-3 w-3 text-green-400" />
            <span>Monitorování internetového připojení</span>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="h-3 w-3 text-blue-400" />
            <span>Kontrola dostupnosti síťových disků</span>
          </div>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-3 w-3 text-purple-400" />
            <span>Automatická detekce reconnection</span>
          </div>
          <div className="flex items-center gap-2">
            <Monitor className="h-3 w-3 text-cyan-400" />
            <span>Vizuální indikátory stavu</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
        <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-green-400" />
          Inteligentní retry logika
        </h4>
        <div className="space-y-2 text-sm text-gray-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-400" />
            <span>Exponenciální backoff</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-400" />
            <span>Konfigurovatelné pokusy</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-400" />
            <span>Strategie podle typu cesty</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-400" />
            <span>Graceful degradation</span>
          </div>
        </div>
      </div>
    </div>

    <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
      <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
        <Globe className="h-4 w-4 text-blue-400" />
        Síťový status indikátor
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <Wifi className="h-4 w-4 text-green-400" />
          <span className="text-sm text-green-400">Online</span>
        </div>
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <WifiOff className="h-4 w-4 text-red-400" />
          <span className="text-sm text-red-400">Offline</span>
        </div>
        <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <RefreshCw className="h-4 w-4 text-yellow-400" />
          <span className="text-sm text-yellow-400">Reconnecting</span>
        </div>
        <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <Network className="h-4 w-4 text-blue-400" />
          <span className="text-sm text-blue-400">Limited</span>
        </div>
      </div>
    </div>
  </div>
);

export const getGlobalSearchSection = () => (
  <div className="space-y-6">
    <div className="bg-gradient-to-r from-cyan-500/10 to-teal-600/10 border border-cyan-500/20 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500/80 to-teal-600/80">
          <Search className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-xl font-bold text-white">Globální vyhledávání</h3>
        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">Ctrl+F</Badge>
      </div>
      <p className="text-gray-300">
        Pokročilé vyhledávání napříč celou aplikací umožňuje rychle najít cílové lokace, historické záznamy a nastavení.
      </p>
    </div>

    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
        <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Layers className="h-4 w-4 text-cyan-400" />
          Oblasti vyhledávání
        </h4>
        <div className="space-y-2 text-sm text-gray-300">
          <div className="flex items-center gap-2">
            <Target className="h-3 w-3 text-blue-400" />
            <span>Cílové lokace (názvy a cesty)</span>
          </div>
          <div className="flex items-center gap-2">
            <History className="h-3 w-3 text-green-400" />
            <span>Historie operací</span>
          </div>
          <div className="flex items-center gap-2">
            <Settings className="h-3 w-3 text-purple-400" />
            <span>Nastavení aplikace</span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="h-3 w-3 text-orange-400" />
            <span>Zdrojové cesty</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
        <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Keyboard className="h-4 w-4 text-green-400" />
          Klávesové zkratky
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center p-2 bg-gray-900/50 rounded">
            <span className="text-gray-300">Otevřít vyhledávání</span>
            <kbd className="px-2 py-1 bg-gray-700 rounded text-xs text-white">Ctrl+F</kbd>
          </div>
          <div className="flex justify-between items-center p-2 bg-gray-900/50 rounded">
            <span className="text-gray-300">Zavřít vyhledávání</span>
            <kbd className="px-2 py-1 bg-gray-700 rounded text-xs text-white">Esc</kbd>
          </div>
          <div className="flex justify-between items-center p-2 bg-gray-900/50 rounded">
            <span className="text-gray-300">Další výsledek</span>
            <kbd className="px-2 py-1 bg-gray-700 rounded text-xs text-white">Enter</kbd>
          </div>
        </div>
      </div>
    </div>

    <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
      <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
        <Eye className="h-4 w-4 text-blue-400" />
        Příklad vyhledávání
      </h4>
      <div className="bg-gray-900/50 border border-gray-700/30 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <Search className="h-4 w-4 text-cyan-400" />
          <input 
            type="text" 
            placeholder="Zadejte hledaný výraz..."
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-400"
            defaultValue="server"
          />
        </div>
        <div className="text-xs text-gray-400 mb-3">Nalezeno 3 výsledky</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2 bg-cyan-500/10 border border-cyan-500/20 rounded">
            <Target className="h-3 w-3 text-cyan-400" />
            <span className="text-sm text-white">Produkční <mark className="bg-cyan-500/30 text-cyan-200">server</mark></span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-cyan-500/10 border border-cyan-500/20 rounded">
            <History className="h-3 w-3 text-cyan-400" />
            <span className="text-sm text-white">Kopírování na <mark className="bg-cyan-500/30 text-cyan-200">server</mark> - 15:30</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);
