"use client";

import React, { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { prescriptionApi } from "@/lib/api";
import { Prescription, Medicine } from "@/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { formatDateTime, downloadBlob } from "@/lib/utils";
import {
  CheckCircle2, Download, ArrowLeft, AlertTriangle, User, Stethoscope,
  Pill, FileText, Clock, Sparkles, Shield,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function PrescriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldApprove = searchParams.get("approve") === "true";
  const queryClient = useQueryClient();
  const [approving, setApproving] = useState(false);

  const { data: rx, isLoading } = useQuery<Prescription>({
    queryKey: ["prescription", id],
    queryFn: () => prescriptionApi.get(id).then((r) => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: () => prescriptionApi.approve(id).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescription", id] });
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      toast.success("Prescription approved and sent to pharmacy!");
    },
    onError: () => toast.error("Failed to approve prescription"),
  });

  const handleDownloadPdf = async () => {
    try {
      const res = await prescriptionApi.downloadPdf(id);
      downloadBlob(res.data, `prescription_${id.slice(0, 8)}.pdf`);
    } catch {
      toast.error("Failed to download PDF");
    }
  };

  if (isLoading) return <PageLoader />;
  if (!rx) return <div className="text-center py-16 text-gray-400">Prescription not found</div>;

  const isDraft = rx.status === "draft";
  const canApprove = isDraft && rx.medicines.length > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/doctor/prescriptions">
            <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Prescription
              </h1>
              <code className="text-sm text-gray-400">#{id.slice(0, 8).toUpperCase()}</code>
              <StatusBadge status={rx.status} />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{formatDateTime(rx.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="h-4 w-4" />}
            onClick={handleDownloadPdf}
          >
            PDF
          </Button>
          {canApprove && (
            <Button
              icon={<CheckCircle2 className="h-4 w-4" />}
              loading={approveMutation.isPending}
              onClick={() => approveMutation.mutate()}
              className="bg-green-600 hover:bg-green-700"
            >
              Approve & Send to Pharmacy
            </Button>
          )}
        </div>
      </div>

      {/* Approve prompt */}
      {shouldApprove && isDraft && (
        <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-200 dark:border-primary-800 flex items-start gap-3">
          <Shield className="h-5 w-5 text-primary-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">Ready to approve?</p>
            <p className="text-xs text-primary-600 dark:text-primary-400 mt-0.5">
              Review all medicines below. Once approved, the prescription will be sent directly to the pharmacy.
            </p>
          </div>
        </div>
      )}

      {/* Drug warnings */}
      {rx.drug_interaction_warnings && rx.drug_interaction_warnings.length > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-300 dark:border-amber-700 space-y-1">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm font-semibold">Drug Interaction Warnings</p>
          </div>
          {rx.drug_interaction_warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-600 pl-6">{w}</p>
          ))}
        </div>
      )}

      {/* Patient info */}
      <Card>
        <CardHeader>
          <CardTitle><User className="h-4 w-4 inline mr-1.5 text-primary-500" />Patient</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          {[
            ["Name",       rx.patient?.full_name ?? "—"],
            ["Age",        rx.patient?.age ? `${rx.patient.age} years` : "—"],
            ["Gender",     rx.patient?.gender ?? "—"],
            ["Phone",      rx.patient?.phone ?? "—"],
            ["Blood Group",rx.patient?.blood_group ?? "—"],
            ["Allergies",  rx.patient?.allergies ?? "None"],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-gray-400 font-medium">{label}</p>
              <p className="text-gray-900 dark:text-white capitalize">{value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Medicines */}
      <Card>
        <CardHeader>
          <CardTitle><Pill className="h-4 w-4 inline mr-1.5 text-green-500" />Medicines ({rx.medicines.length})</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          {rx.medicines.map((med: Medicine, i: number) => (
            <div key={med.id ?? i} className="p-3.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {med.medicine_name}
                    </span>
                    {med.strength && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                        {med.strength}
                      </span>
                    )}
                    {med.generic_name && (
                      <span className="text-xs text-gray-400 italic">({med.generic_name})</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {med.dosage     && <span>💊 {med.dosage}</span>}
                    {med.frequency  && <span>🕐 {med.frequency}</span>}
                    {med.duration   && <span>📅 {med.duration}</span>}
                    {med.quantity   && <span>🔢 Qty: {med.quantity}</span>}
                    {med.instructions && <span>📌 {med.instructions}</span>}
                  </div>
                  {med.patient_instructions && (
                    <p className="text-xs text-primary-600 dark:text-primary-400 mt-1.5 italic">
                      <Sparkles className="h-3 w-3 inline mr-1" />
                      {med.patient_instructions}
                    </p>
                  )}
                </div>
                {med.is_available !== undefined && (
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full shrink-0",
                    med.is_available
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  )}>
                    {med.is_available ? "✓ In stock" : "✗ Out of stock"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* AI Summary */}
      {rx.ai_summary && (
        <Card>
          <CardHeader>
            <CardTitle><Sparkles className="h-4 w-4 inline mr-1.5 text-purple-500" />AI Summary</CardTitle>
          </CardHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400 italic leading-relaxed">{rx.ai_summary}</p>
        </Card>
      )}

      {/* Voice transcript */}
      {rx.voice_transcript && (
        <Card>
          <CardHeader>
            <CardTitle><FileText className="h-4 w-4 inline mr-1.5 text-gray-400" />Voice Transcript</CardTitle>
          </CardHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{rx.voice_transcript}</p>
        </Card>
      )}

      {/* Pharmacy status */}
      {rx.status !== "draft" && (
        <Card>
          <CardHeader>
            <CardTitle><Clock className="h-4 w-4 inline mr-1.5 text-amber-500" />Pharmacy Status</CardTitle>
          </CardHeader>
          <div className="flex items-center gap-3">
            <StatusBadge status={rx.status} />
            {rx.approved_at && (
              <p className="text-xs text-gray-400">Approved: {formatDateTime(rx.approved_at)}</p>
            )}
            {rx.dispensed_at && (
              <p className="text-xs text-gray-400">Dispensed: {formatDateTime(rx.dispensed_at)}</p>
            )}
          </div>
          {rx.pharmacist_notes && (
            <p className="text-sm text-gray-500 mt-2 italic">Pharmacist note: {rx.pharmacist_notes}</p>
          )}
        </Card>
      )}

      {/* QR Code */}
      {rx.qr_code_url && (
        <Card className="text-center">
          <CardTitle className="mb-3">QR Code</CardTitle>
          <img src={rx.qr_code_url} alt="Prescription QR Code" className="h-32 w-32 mx-auto" />
          <p className="text-xs text-gray-400 mt-2">Scan to verify prescription</p>
        </Card>
      )}
    </div>
  );
}
