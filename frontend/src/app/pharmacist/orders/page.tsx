"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { prescriptionApi } from "@/lib/api";
import { Prescription, PrescriptionStatus } from "@/types";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { formatDateTime } from "@/lib/utils";
import { Eye, RefreshCw } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "sent_to_pharmacy", label: "Incoming" },
  { value: "preparing",        label: "Preparing" },
  { value: "ready",            label: "Ready" },
  { value: "dispensed",        label: "Dispensed" },
];

export default function PharmacistOrdersPage() {
  const [status, setStatus] = useState<PrescriptionStatus>("sent_to_pharmacy");

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ["pharmacist-orders", status],
    queryFn: () => prescriptionApi.list({ status }).then((r) => r.data),
    refetchInterval: 20_000,
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">{orders?.length ?? 0} prescription(s)</p>
        </div>
        <Button variant="outline" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatus(opt.value as PrescriptionStatus)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              status === opt.value
                ? "bg-primary-600 text-white shadow-sm"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <PageLoader />
      ) : (
        <Card padding="none">
          {orders?.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No orders in this status</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Medicines</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Received</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {orders?.map((rx: Prescription) => (
                    <tr key={rx.id} className="table-row-hover">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-900 dark:text-white">{rx.patient?.full_name ?? "Unknown"}</p>
                        <p className="text-xs text-gray-400">#{rx.id.slice(0, 8).toUpperCase()}</p>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 max-w-[200px]">
                        <p className="truncate">{rx.medicines.map((m) => m.medicine_name).join(", ")}</p>
                        <p className="text-xs text-gray-400">{rx.medicines.length} item(s)</p>
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge status={rx.status} /></td>
                      <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap text-xs">
                        {formatDateTime(rx.approved_at ?? rx.created_at)}
                      </td>
                      <td className="px-5 py-3.5">
                        <Link href={`/pharmacist/orders/${rx.id}`}>
                          <Button variant="ghost" size="sm" icon={<Eye className="h-4 w-4" />}>
                            Open
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
