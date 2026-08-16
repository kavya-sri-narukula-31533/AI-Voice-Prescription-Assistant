"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import { AuditLog } from "@/types";
import { Card } from "@/components/ui/Card";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { Shield, User, FileText, CheckCircle2, Edit, AlertTriangle } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

const ACTION_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  create:             { icon: FileText,     color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" },
  update:             { icon: Edit,         color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20" },
  approve:            { icon: CheckCircle2, color: "text-green-600 bg-green-50 dark:bg-green-900/20" },
  pharmacy_dispensed: { icon: CheckCircle2, color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20" },
  default:            { icon: Shield,       color: "text-gray-600 bg-gray-50 dark:bg-gray-800" },
};

export default function AuditLogsPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => analyticsApi.auditLogs({ limit: 100 }).then((r) => r.data),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-0.5">Complete trail of all prescription activities</p>
      </div>

      <Card padding="none">
        {logs?.length === 0 && (
          <p className="text-center text-gray-400 py-12">No audit entries yet</p>
        )}
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {logs?.map((log: AuditLog) => {
            const config = ACTION_CONFIG[log.action] ?? ACTION_CONFIG.default;
            const Icon = config.icon;
            return (
              <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className={cn("p-2 rounded-lg shrink-0 mt-0.5", config.color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                      {log.action.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-gray-400">
                      on {log.resource_type}
                      {log.resource_id && ` #${log.resource_id.slice(0, 8).toUpperCase()}`}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(log.timestamp)}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
                  <User className="h-3.5 w-3.5" />
                  {log.user_id?.slice(0, 8).toUpperCase() ?? "System"}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
