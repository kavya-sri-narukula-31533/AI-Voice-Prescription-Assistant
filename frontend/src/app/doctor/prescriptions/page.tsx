"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { prescriptionApi } from "@/lib/api";
import { Prescription, PrescriptionStatus } from "@/types";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { formatDateTime } from "@/lib/utils";
import { FileText, Search, Plus, Eye, Download, Mic } from "lucide-react";
import { prescriptionApi as pApi } from "@/lib/api";
import { downloadBlob } from "@/lib/utils";
import toast from "react-hot-toast";

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "sent_to_pharmacy", label: "Sent to Pharmacy" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "dispensed", label: "Dispensed" },
];

export default function PrescriptionsListPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data: prescriptions, isLoading } = useQuery({
    queryKey: ["prescriptions", statusFilter],
    queryFn: () =>
      prescriptionApi.list(statusFilter ? { status: statusFilter } : {}).then((r) => r.data),
  });

  const filtered = (prescriptions ?? []).filter((rx: Prescription) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      rx.patient?.full_name?.toLowerCase().includes(q) ||
      rx.id.toLowerCase().includes(q)
    );
  });

  const handleDownloadPdf = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const res = await pApi.downloadPdf(id);
      downloadBlob(res.data, `prescription_${id.slice(0, 8)}.pdf`);
    } catch {
      toast.error("Failed to download PDF");
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Prescriptions</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} prescription(s)</p>
        </div>
        <Link href="/doctor/prescriptions/new">
          <Button icon={<Mic className="h-4 w-4" />}>New Prescription</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search by patient name or ID..."
          leftIcon={<Search className="h-4 w-4" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select
          options={STATUS_FILTER_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="sm:max-w-[200px]"
        />
      </div>

      {isLoading ? (
        <PageLoader />
      ) : (
        <Card padding="none">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No prescriptions found</p>
              <p className="text-sm text-gray-400 mt-1">Create your first prescription using voice</p>
              <Link href="/doctor/prescriptions/new" className="mt-4">
                <Button icon={<Plus className="h-4 w-4" />} size="sm">New Prescription</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Patient</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Medicines</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filtered.map((rx: Prescription) => (
                    <tr key={rx.id} className="table-row-hover">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-700 shrink-0">
                            {rx.patient?.full_name?.slice(0, 2).toUpperCase() ?? "??"}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {rx.patient?.full_name ?? "Unknown"}
                            </p>
                            <p className="text-xs text-gray-400">ID: {rx.id.slice(0, 8).toUpperCase()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400">
                        {rx.medicines.length > 0
                          ? rx.medicines.map((m) => m.medicine_name).join(", ").slice(0, 40) + (rx.medicines.length > 2 ? "..." : "")
                          : "—"
                        }
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={rx.status} />
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDateTime(rx.created_at)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 justify-end">
                          <Link href={`/doctor/prescriptions/${rx.id}`}>
                            <Button variant="ghost" size="sm" icon={<Eye className="h-4 w-4" />} aria-label="View" />
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Download className="h-4 w-4" />}
                            onClick={(e) => handleDownloadPdf(rx.id, e)}
                            aria-label="Download PDF"
                          />
                        </div>
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
