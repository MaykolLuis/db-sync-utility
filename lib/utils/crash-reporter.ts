import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface CrashReport {
  id: string;
  timestamp: number;
  type: 'error' | 'unhandledRejection' | 'uncaughtException' | 'rendererCrash' | 'manual';
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context: {
    version: string;
    platform: string;
    arch: string;
    nodeVersion: string;
    electronVersion: string;
    userAgent?: string;
    url?: string;
    userId?: string;
  };
  systemInfo: {
    totalMemory: number;
    freeMemory: number;
    cpus: number;
    uptime: number;
  };
  appState?: {
    activeTab?: string;
    sourcePath?: string;
    targetLocationsCount?: number;
    historyEntriesCount?: number;
  };
  breadcrumbs: Array<{
    timestamp: number;
    message: string;
    level: 'info' | 'warn' | 'error';
    category?: string;
  }>;
}

class CrashReporter {
  private breadcrumbs: CrashReport['breadcrumbs'] = [];
  private maxBreadcrumbs = 50;
  private crashReportsDir: string;
  private isInitialized = false;

  constructor() {
    // Initialize crash reports directory path
    if (typeof app !== 'undefined' && app.getPath) {
      this.crashReportsDir = path.join(app.getPath('userData'), 'crash-reports');
    } else {
      // Fallback for renderer process
      this.crashReportsDir = path.join(process.cwd(), 'crash-reports');
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Ensure crash reports directory exists
      await fs.mkdir(this.crashReportsDir, { recursive: true });
      
      // Clean old crash reports (keep only last 30 days)
      await this.cleanOldReports();
      
      this.isInitialized = true;
      this.addBreadcrumb('Crash reporter initialized', 'info', 'system');
    } catch (error) {
      console.error('Failed to initialize crash reporter:', error);
    }
  }

  addBreadcrumb(message: string, level: 'info' | 'warn' | 'error' = 'info', category?: string): void {
    const breadcrumb = {
      timestamp: Date.now(),
      message,
      level,
      category
    };

    this.breadcrumbs.push(breadcrumb);

    // Keep only the most recent breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
  }

  private generateCrashId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `crash-${timestamp}-${random}`;
  }

  private async getSystemInfo(): Promise<CrashReport['systemInfo']> {
    const os = require('os');
    return {
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpus: os.cpus().length,
      uptime: os.uptime()
    };
  }

  private getContext(additionalContext?: Partial<CrashReport['context']>): CrashReport['context'] {
    const os = require('os');
    
    return {
      version: process.env.npm_package_version || '1.0.0',
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      electronVersion: process.versions.electron || 'unknown',
      ...additionalContext
    };
  }

  async reportCrash(
    error: Error,
    type: CrashReport['type'] = 'error',
    additionalContext?: {
      url?: string;
      userAgent?: string;
      userId?: string;
      appState?: CrashReport['appState'];
    }
  ): Promise<string> {
    try {
      await this.initialize();

      const crashId = this.generateCrashId();
      const systemInfo = await this.getSystemInfo();
      const context = this.getContext(additionalContext);

      const crashReport: CrashReport = {
        id: crashId,
        timestamp: Date.now(),
        type,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        context,
        systemInfo,
        appState: additionalContext?.appState,
        breadcrumbs: [...this.breadcrumbs]
      };

      // Save crash report to file
      const reportPath = path.join(this.crashReportsDir, `${crashId}.json`);
      await fs.writeFile(reportPath, JSON.stringify(crashReport, null, 2), 'utf8');

      // Add breadcrumb about the crash
      this.addBreadcrumb(`Crash reported: ${crashId}`, 'error', 'crash-reporter');

      console.error(`Crash reported with ID: ${crashId}`);
      console.error('Error details:', error);

      return crashId;
    } catch (reportingError) {
      console.error('Failed to report crash:', reportingError);
      return 'failed-to-report';
    }
  }

  async getCrashReports(limit = 50): Promise<CrashReport[]> {
    try {
      await this.initialize();
      
      const files = await fs.readdir(this.crashReportsDir);
      const crashFiles = files
        .filter(file => file.endsWith('.json') && file.startsWith('crash-'))
        .sort()
        .reverse()
        .slice(0, limit);

      const reports: CrashReport[] = [];
      
      for (const file of crashFiles) {
        try {
          const filePath = path.join(this.crashReportsDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const report = JSON.parse(content) as CrashReport;
          reports.push(report);
        } catch (error) {
          console.error(`Failed to read crash report ${file}:`, error);
        }
      }

      return reports;
    } catch (error) {
      console.error('Failed to get crash reports:', error);
      return [];
    }
  }

  async deleteCrashReport(crashId: string): Promise<boolean> {
    try {
      const reportPath = path.join(this.crashReportsDir, `${crashId}.json`);
      await fs.unlink(reportPath);
      this.addBreadcrumb(`Deleted crash report: ${crashId}`, 'info', 'crash-reporter');
      return true;
    } catch (error) {
      console.error(`Failed to delete crash report ${crashId}:`, error);
      return false;
    }
  }

  async exportCrashReports(): Promise<string> {
    try {
      const reports = await this.getCrashReports();
      const exportData = {
        exportedAt: new Date().toISOString(),
        totalReports: reports.length,
        reports
      };

      const exportPath = path.join(this.crashReportsDir, `crash-reports-export-${Date.now()}.json`);
      await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2), 'utf8');
      
      return exportPath;
    } catch (error) {
      console.error('Failed to export crash reports:', error);
      throw error;
    }
  }

  private async cleanOldReports(): Promise<void> {
    try {
      const files = await fs.readdir(this.crashReportsDir);
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

      for (const file of files) {
        if (file.endsWith('.json') && file.startsWith('crash-')) {
          const filePath = path.join(this.crashReportsDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime.getTime() < thirtyDaysAgo) {
            await fs.unlink(filePath);
            console.log(`Cleaned old crash report: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to clean old crash reports:', error);
    }
  }

  getCrashReportsDirectory(): string {
    return this.crashReportsDir;
  }

  getBreadcrumbs(): CrashReport['breadcrumbs'] {
    return [...this.breadcrumbs];
  }

  clearBreadcrumbs(): void {
    this.breadcrumbs = [];
    this.addBreadcrumb('Breadcrumbs cleared', 'info', 'crash-reporter');
  }
}

// Singleton instance
export const crashReporter = new CrashReporter();

// Helper function to report crashes with app state
export async function reportCrashWithAppState(
  error: Error,
  type: CrashReport['type'] = 'error',
  appState?: CrashReport['appState']
): Promise<string> {
  return crashReporter.reportCrash(error, type, { appState });
}

// Helper function to add breadcrumbs
export function addBreadcrumb(message: string, level: 'info' | 'warn' | 'error' = 'info', category?: string): void {
  crashReporter.addBreadcrumb(message, level, category);
}
