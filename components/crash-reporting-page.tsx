'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Bug, Shield, AlertTriangle } from 'lucide-react';
import CrashReportingSection from '@/components/crash-reporting-section';

/**
 * Professional crash reporting page component
 * Streamlined interface for crash report management
 */
export function CrashReportingPage() {
  return (
    <Card className="flex flex-col flex-1 min-h-0">
      {/* Consistent Header Design */}
      <div className="flex items-center justify-between bg-gradient-to-r from-[#1e293b] to-[#0f172a] text-white p-4 rounded-t-lg flex-shrink-0">
        <div>
          <h3 className="text-base font-semibold m-0">Hlášení chyb</h3>
          <p className="text-xs opacity-90 mt-0.5">Správa crash reportů a diagnostika aplikace</p>
        </div>
        <Bug className="h-5 w-5" />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 min-h-0">
        <CardContent className="p-6 flex-1 flex flex-col min-h-0 overflow-y-auto">
          <CrashReportingSection />
        </CardContent>
      </div>

    </Card>
  );
}

export default CrashReportingPage;
