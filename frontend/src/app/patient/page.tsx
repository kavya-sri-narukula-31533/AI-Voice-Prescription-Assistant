"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { prescriptionApi } from "@/lib/api";
import { Prescription, Medicine } from "@/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { formatDateTime, downloadBlob } from "@/lib/utils";
import {
  FileText, Download, Eye, Pill, Calendar, Sparkles, Clock,
  AlertTriangle, ChevronDown, ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function PatientPrescriptionsPage() {
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: prescriptions, isLoading } = useQuery({
    queryKey: ["patient-prescriptions"],
    queryFn: () => prescriptionApi.list({}).then((r) => r.data),
  });

  const handleDownload = async (id: string) => {
    try {
      const res = await prescriptionApi.downloadPdf(id);
      downloadBlob(res.data, `prescription_${id.slice(0, 8)}.pdf`);
      toast.success("Prescription downloaded!");
    } catch {
      toast.error("Download failed");
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Prescriptions</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {prescriptions?.length ?? 0} prescription(s) in your history
        </p>
      </div>

      {prescriptions?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <FileText className="h-14 w-14 text-gray-200 mb-4" />
          <p className="text-gray-400 font-medium">No prescriptions yet</p>
          <p className="text-sm text-gray-300 mt-1">Your doctor will add prescriptions here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions?.map((rx: Prescription) => {
            const expanded = expandedId === rx.id;
            return (
              <Card key={rx.id} className="overflow-hidden transition-all">
                {/* Summary row */}
                <div
                  className="flex items-center gap-4 cursor-pointer"
                  onClick={() => setExpandedId(expanded ? null : rx.id)}
                >
                  <div className="h-11 w-11 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        Prescription #{rx.id.slice(0, 8).toUpperCase()}
                      </p>
                      <StatusBadge status={rx.status} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {formatDateTime(rx.created_at)}
                      {rx.medicines.length > 0 && ` · ${rx.medicines.length} medicine(s)`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Download className="h-4 w-4" />}
                      onClick={(e) => { e.stopPropagation(); handleDownload(rx.id); }}
                    >
                      PDF
                    </Button>
                    {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>

                {/* Expanded details */}
                {expanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-4 animate-fade-in">
                    {/* Drug warnings */}
                    {rx.drug_interaction_warnings && rx.drug_interaction_warnings.length > 0 && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-1">
                          <AlertTriangle className="h-4 w-4" />
                          <p className="text-xs font-semibold">Important Drug Information</p>
                        </div>
                        {rx.drug_interaction_warnings.map((w, i) => (
                          <p key={i} className="text-xs text-amber-600 pl-6">{w}</p>
                        ))}
                      </div>
                    )}

                    {/* Medicines */}
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Pill className="h-4 w-4 text-green-500" /> Your Medicines
                      </p>
                      {rx.medicines.map((med: Medicine, i: number) => (
                        <div key={med.id ?? i} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">{med.medicine_name}</span>
                            {med.strength && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">{med.strength}</span>
                            )}
                          </div>
                          {/* Patient-friendly instructions */}
                          {med.patient_instructions ? (
                            <p className="text-xs text-primary-600 dark:text-primary-400 mt-1.5 flex items-start gap-1">
                              <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                              {med.patient_instructions}
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                              {med.dosage    && <span>Take {med.dosage}</span>}
                              {med.frequency && <span>· {med.frequency}</span>}
                              {med.duration  && <span>· for {med.duration}</span>}
                              {med.instructions && <span>· {med.instructions}</span>}
                            </div>
                          )}
                          {med.is_available === false && (
                            <p className="text-xs text-red-500 mt-1">⚠️ Marked out of stock by pharmacist</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Doctor notes / AI summary */}
                    {rx.notes && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                        <p className="text-xs font-medium text-gray-500 mb-1">Doctor&apos;s Notes</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{rx.notes}</p>
                      </div>
                    )}
                    {rx.ai_summary && (
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
                        <p className="text-xs font-medium text-purple-600 mb-1">
                          <Sparkles className="h-3 w-3 inline mr-1" />AI Summary
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 italic">{rx.ai_summary}</p>
                      </div>
                    )}

                    {/* Status timeline */}
                    {rx.approved_at && (
                      <p className="text-xs text-gray-400 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Approved by doctor: {formatDateTime(rx.approved_at)}
                      </p>
                    )}
                    {rx.dispensed_at && (
                      <p className="text-xs text-green-600 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Dispensed: {formatDateTime(rx.dispensed_at)}
                      </p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
