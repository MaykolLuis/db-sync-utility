'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Bug, 
  Download, 
  Trash2, 
  RefreshCw, 
  Eye, 
  Copy,
  Calendar,
  Monitor,
  Cpu,
  HardDrive,
  Clock,
  Shield,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { CrashReport, Breadcrumb } from '@/types/electron';

interface CrashReportingSectionProps {
  className?: string;
}

const CrashReportingSection: React.FC<CrashReportingSectionProps> = ({ className }) => {
  const [crashReports, setCrashReports] = useState<CrashReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<CrashReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);

  useEffect(() => {
    loadCrashReports();
    loadBreadcrumbs();
  }, []);

  const loadCrashReports = async () => {
    setLoading(true);
    try {
      if (window.electron && (window.electron as any).crashReporting) {
        const result = await (window.electron as any).crashReporting.getCrashReports(50);
        if (result.success && result.reports) {
          setCrashReports(result.reports);
        } else {
          toast.error('Nepodařilo se načíst crash reporty', {
            description: result.error || 'Neznámá chyba'
          });
        }
      }
    } catch (error) {
      console.error('Error loading crash reports:', error);
      toast.error('Chyba při načítání crash reportů');
    } finally {
      setLoading(false);
    }
  };

  const loadBreadcrumbs = async () => {
    try {
      if (window.electron && (window.electron as any).crashReporting) {
        const result = await (window.electron as any).crashReporting.getBreadcrumbs();
        if (result.success && result.breadcrumbs) {
          setBreadcrumbs(result.breadcrumbs);
        }
      }
    } catch (error) {
      console.error('Error loading breadcrumbs:', error);
    }
  };

  const deleteCrashReport = async (crashId: string) => {
    try {
      if (window.electron && (window.electron as any).crashReporting) {
        const result = await (window.electron as any).crashReporting.deleteCrashReport(crashId);
        if (result.success) {
          setCrashReports(prev => prev.filter(report => report.id !== crashId));
          if (selectedReport?.id === crashId) {
            setSelectedReport(null);
          }
          toast.success('Crash report byl smazán');
        } else {
          toast.error('Nepodařilo se smazat crash report', {
            description: result.error || 'Neznámá chyba'
          });
        }
      }
    } catch (error) {
      console.error('Error deleting crash report:', error);
      toast.error('Chyba při mazání crash reportu');
    }
  };

  const exportCrashReport = async (report: CrashReport) => {
    try {
      const exportData = {
        ...report,
        exportedAt: new Date().toISOString(),
        exportedBy: 'DB Sync Utility'
      };

      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      toast.success('Crash report zkopírován do schránky', {
        description: `Report ID: ${report.id}`
      });
    } catch (error) {
      console.error('Error exporting crash report:', error);
      toast.error('Nepodařilo se exportovat crash report');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('cs-CZ');
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getErrorTypeColor = (type: string) => {
    switch (type) {
      case 'uncaughtException': return 'bg-red-600';
      case 'unhandledRejection': return 'bg-orange-600';
      case 'rendererCrash': return 'bg-purple-600';
      case 'error': return 'bg-yellow-600';
      default: return 'bg-gray-600';
    }
  };

  const getBreadcrumbLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardContent className="pt-4 flex-1 flex flex-col">
      {/* Header with Actions */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-red-500/20">
            <Shield className="h-4 w-4 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Crash Reporting System</h3>
            <p className="text-sm text-slate-400">Správa a analýza chyb aplikace</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
        <Button
          onClick={() => {
            
          }}
          disabled={loading}
          variant="outline"
          size="sm"
          className="border-slate-600"
        >
          <Download className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Exportovat chyb reporty
        </Button>
        <Button
          onClick={loadCrashReports}
          disabled={loading}
          variant="outline"
          size="sm"
          className="border-slate-600"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Obnovit
        </Button>
        </div>
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue="reports" className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 border border-slate-700 flex-shrink-0">
          <TabsTrigger 
            value="reports" 
            className="data-[state=active]:bg-red-500 data-[state=active]:text-white text-slate-400 flex items-center gap-2"
          >
            <Bug className="h-4 w-4" />
            Crash Reports ({crashReports.length})
          </TabsTrigger>
          <TabsTrigger 
            value="breadcrumbs" 
            className="data-[state=active]:bg-red-500 data-[state=active]:text-white text-slate-400 flex items-center gap-2"
          >
            <Activity className="h-4 w-4" />
            Breadcrumbs ({breadcrumbs.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="reports" className="flex-1 mt-3 min-h-0 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 h-full">
        {/* Crash Reports List */}
        <div className="lg:col-span-1 h-full">
          <Card className="bg-slate-800/50 border-slate-700 h-full flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="text-white flex items-center gap-2">
                <Bug className="w-5 h-5" />
                Crash Reports ({crashReports.length})
              </CardTitle>
              <CardDescription>
                Seznam všech zaznamenaných chyb
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 flex-1 overflow-hidden">
              <div className="overflow-y-auto" style={{ maxHeight: "calc(100% - 10px)" }}>
                <div className="space-y-1 pr-2">
                  {crashReports.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Bug className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Žádné crash reporty</p>
                      <p className="text-sm">To je dobré znamení!</p>
                    </div>
                  ) : (
                    crashReports.map((report) => (
                      <div
                        key={report.id}
                        className={`p-2 rounded-lg border cursor-pointer transition-colors w-full ${
                          selectedReport?.id === report.id
                            ? 'bg-slate-700 border-blue-500'
                            : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700'
                        }`}
                        onClick={() => setSelectedReport(report)}
                      >
                        <div className="flex items-start justify-between mb-1 min-w-0">
                          <Badge className={`${getErrorTypeColor(report.type)} text-white text-xs px-1.5 py-0.5`}>
                            {report.type}
                          </Badge>
                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            {formatDate(report.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-white font-medium truncate mb-1 w-full">
                          {report.error.message}
                        </p>
                        <p className="text-xs text-slate-400 truncate w-full">
                          ID: {report.id.split('-').pop()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>

          </Card>
        </div>

        {/* Crash Report Details */}
        <div className="lg:col-span-2 h-full">
          {selectedReport ? (
            <Card className="bg-slate-800/50 border-slate-700 flex-1 flex flex-col h-full">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Detail Crash Reportu
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => exportCrashReport(selectedReport)}
                      size="sm"
                      variant="outline"
                      className="border-slate-600"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Kopírovat
                    </Button>
                    <Button
                      onClick={() => deleteCrashReport(selectedReport.id)}
                      size="sm"
                      variant="outline"
                      className="border-red-600 text-red-400 hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Smazat
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {formatDate(selectedReport.timestamp)}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto pr-2">
                  <div className="space-y-4">
                {/* Error Information */}
                <div>
                  <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                    <Bug className="w-4 h-4" />
                    Informace o chybě
                  </h4>
                  <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Typ:</span>
                      <Badge className={`${getErrorTypeColor(selectedReport.type)} text-white`}>
                        {selectedReport.type}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-slate-400">Zpráva:</span>
                      <p className="text-white font-mono text-sm mt-1">
                        {selectedReport.error.message}
                      </p>
                    </div>
                    {selectedReport.error.stack && (
                      <details className="mt-2">
                        <summary className="text-slate-400 cursor-pointer hover:text-white">
                          Stack Trace
                        </summary>
                        <pre className="text-xs text-slate-300 mt-2 overflow-x-auto whitespace-pre-wrap bg-slate-800 p-2 rounded">
                          {selectedReport.error.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>

                {/* System Information */}
                <div>
                  <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    Systémové informace
                  </h4>
                  <div className="bg-slate-700/50 rounded-lg p-3 grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-400">CPU:</span>
                      <span className="text-white">{selectedReport.systemInfo.cpus} jader</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-400">RAM:</span>
                      <span className="text-white">
                        {formatFileSize(selectedReport.systemInfo.freeMemory)} / {formatFileSize(selectedReport.systemInfo.totalMemory)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-400">Uptime:</span>
                      <span className="text-white">{Math.round(selectedReport.systemInfo.uptime / 3600)}h</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-400">Platform:</span>
                      <span className="text-white">{selectedReport.context.platform}</span>
                    </div>
                  </div>
                </div>

                {/* Breadcrumbs */}
                {selectedReport.breadcrumbs && selectedReport.breadcrumbs.length > 0 && (
                  <div>
                    <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Breadcrumbs ({selectedReport.breadcrumbs.length})
                    </h4>
                    <div className="bg-slate-700/50 rounded-lg">
                      <ScrollArea className="h-64 p-3">
                        <div className="space-y-2 pr-4">
                          {selectedReport.breadcrumbs.map((breadcrumb, index) => (
                            <div key={index} className="flex items-start gap-3 p-2 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                              <span className="text-slate-500 text-xs min-w-20 mt-0.5">
                                {formatDate(breadcrumb.timestamp)}
                              </span>
                              <span className={`font-medium text-xs px-2 py-1 rounded ${getBreadcrumbLevelColor(breadcrumb.level)} bg-slate-900/50`}>
                                {breadcrumb.level.toUpperCase()}
                              </span>
                              <span className="text-white flex-1 text-sm">
                                {breadcrumb.message}
                              </span>
                              {breadcrumb.category && (
                                <Badge variant="outline" className="text-xs">
                                  {breadcrumb.category}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                )}

                {/* App State */}
                {selectedReport.appState && (
                  <div>
                    <h4 className="text-white font-medium mb-2">Stav aplikace</h4>
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <pre className="text-xs text-slate-300 overflow-x-auto">
                        {JSON.stringify(selectedReport.appState, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-800/50 border-slate-700 flex-1 flex flex-col">
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center text-slate-400">
                  <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Vyberte crash report pro zobrazení detailů</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
          </div>
        </TabsContent>
        
        <TabsContent value="breadcrumbs" className="flex-1 mt-6 overflow-hidden min-h-0">
          <div className="h-full">
            {breadcrumbs.length > 0 ? (
              <Card className="bg-slate-800/50 border-slate-700 flex-1 flex flex-col h-full">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Aktuální Breadcrumbs ({breadcrumbs.length})
                  </CardTitle>
                  <CardDescription>
                    Posledních {breadcrumbs.length} akcí v aplikaci
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="space-y-2 pr-4">
                      {breadcrumbs.reverse().map((breadcrumb, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors">
                          <span className="text-slate-500 text-xs min-w-20 mt-0.5">
                            {formatDate(breadcrumb.timestamp)}
                          </span>
                          <span className={`font-medium text-xs px-2 py-1 rounded ${getBreadcrumbLevelColor(breadcrumb.level)} bg-slate-800/50`}>
                            {breadcrumb.level.toUpperCase()}
                          </span>
                          <span className="text-white flex-1 text-sm">
                            {breadcrumb.message}
                          </span>
                          {breadcrumb.category && (
                            <Badge variant="outline" className="text-xs">
                              {breadcrumb.category}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-800/50 border-slate-700 h-full">
                <CardContent className="flex items-center justify-center h-full">
                  <div className="text-center text-slate-400">
                    <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Žádné breadcrumbs k zobrazení</p>
                    <p className="text-sm">Aktivity se zobrazí zde po spuštění aplikace</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
      </CardContent>
    </Card>
  );
};

export default CrashReportingSection;
